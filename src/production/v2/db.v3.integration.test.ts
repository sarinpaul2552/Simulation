/**
 * NexLearn V3 (Batch 10D) — V3 sessions and market paths against the local disposable PostgreSQL + PostgREST stack
 * (scripts/v2-local/up.sh applies database/MIGRATION_V3_MARKET_PATHS.sql). Skipped unless V2_DB_URL and V2_DB_KEY are set.
 * Never run against a shared or production project.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createV2Api, V2Api } from './api';
import { loadTeamGame, commitQuarter, saveDecisionDraft, sessionConfig } from './gameService';
import { toStorable, firstDifference } from './snapshot';
import * as V3 from '../v3/adapter';
import { initializeGame, v3Config } from './engine';
import type { V2PlayerQuarterInput } from './types';
import { play } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';

declare const process: { env: Record<string, string | undefined> };
const URL = process.env.V2_DB_URL;
const KEY = process.env.V2_DB_KEY;
const newApi = () => createV2Api(createClient(URL!, KEY!, { auth: { persistSession: false } }));
const strategy = (id: string) => V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy;

/** One quarter through the Team Commitment loop, as a classroom team does it. */
async function commitThroughLoop(api: V2Api, tc: string, input: V2PlayerQuarterInput) {
  const q = input.quarter;
  await api.setPhase(tc, q, 'briefing', 'decide');
  await saveDecisionDraft(api, await loadTeamGame(api, tc), { input, deliberation: { beliefId: `q${q}-x`, riskIds: ['cash'], confidence: 3 } });
  await api.setPhase(tc, q, 'decide', 'belief');
  await api.setPhase(tc, q, 'belief', 'risk');
  await api.confirmCommitment(tc, q, 'agreed', 'CEO');
  return commitQuarter(api, await loadTeamGame(api, tc), input);
}

describe.skipIf(!URL || !KEY)('NexLearn V3 · sessions and market paths (local DB)', () => {
  it('creates a V3 session with a fixed market path; V2 sessions are unchanged', async () => {
    const api = newApi();
    const v3 = await api.createSession('f@school.edu', ['T1', 'T2'], 'team_device', 'self', 'B');
    expect(v3.econ_engine).toBe('v3');
    expect(v3.market_path).toBe('B');
    expect(v3.engine_version).toBe('v2');
    const g = await api.getGame(v3.teams[0].team_code);
    expect(g.session.econ_engine).toBe('v3');
    expect(g.session.market_path).toBe('B');
    expect(sessionConfig(g.session)).toEqual(v3Config('B'));
    const o = await api.facilitatorOverview(v3.session_code, v3.admin_pin);
    expect(o.econ_engine).toBe('v3');
    expect(o.market_path).toBe('B');
    const v2 = await api.createSession('f@school.edu', ['Old'], 'team_device', 'self');
    expect(v2.econ_engine).toBeUndefined();
    expect((await api.getGame(v2.teams[0].team_code)).session.econ_engine).toBe('v2');
    expect((await api.getGame(v2.teams[0].team_code)).session.market_path).toBeNull();
    await expect(api.createSession('f@school.edu', ['X'], 'team_device', 'self', 'D' as never)).rejects.toThrow(/Invalid market path/);
  });

  it('a session’s engine and path cannot be changed with the public key, and the snapshot must match the session', async () => {
    const api = newApi();
    const s = await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'C');
    const c = createClient(URL!, KEY!, { auth: { persistSession: false } });
    const upd = await c.from('sessions').update({ market_path: 'A' }).neq('id', '00000000-0000-0000-0000-000000000000').select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
    const tc = s.teams[0].team_code;
    // a V2 snapshot (or a different path) is refused for this V3 session
    const wrongEngine = toStorable(initializeGame());
    await expect(api.initGame(tc, wrongEngine as never, {} as never)).rejects.toThrow(/does not match this session/);
    const wrongPath = toStorable(V3.initializeGame('A'));
    await expect(api.initGame(tc, wrongPath as never, {} as never)).rejects.toThrow(/does not match this session/);
    const game = await loadTeamGame(api, tc);
    expect(game.snapshot.marketPath).toBe('C');
    expect(game.snapshot.engineVersion).toBe('v3-econ-1.0');
  });

  it.each(['A', 'B', 'C'] as const)('path %s: a team plays Q1–Q8 through the RPCs; the stored game equals the engine exactly', async path => {
    const api = newApi();
    const s = await api.createSession('f@school.edu', ['Team'], 'team_device', 'self', path);
    const tc = s.teams[0].team_code;
    // inputs from the laboratory player (stance in Q6, contract claim in Q5, and — for path B — a financed expansion)
    const expected = play(strategy('adaptive'), { engine: 'v3', path }, path === 'B' ? { expansion: 5 } : {});
    await loadTeamGame(api, tc); // initializes the game
    for (const { input } of expected.quarters) {
      const q = input.quarter;
      if (q > 1) { await api.setPhase(tc, q - 1, 'results', 'reflect'); await api.setPhase(tc, q - 1, 'reflect', 'briefing'); }
      const out = await commitThroughLoop(api, tc, input);
      expect(out.status, `Q${q}`).toBe('resolved');
    }
    const game = await loadTeamGame(api, tc);
    expect(game.record.completed_quarter).toBe(8);
    expect(firstDifference(toStorable(game.snapshot), toStorable(expected.snapshot))).toBeNull();
    expect(game.resolutions[5].input.recessionStance).toBeDefined();
    if (path === 'B') expect(game.resolutions.some(r => (r.input.expansion ?? 0) > 0)).toBe(true);
  });

  it('session creation survives access-code collisions (4-digit admin PINs): 300 sessions in a row', async () => {
    const api = newApi();
    for (let i = 0; i < 300; i++) await api.createSession('f@school.edu', ['T'], 'team_device', 'self', i % 2 ? 'A' : undefined);
  }, 120_000);

  it('the server rejects V3-only fields in V2 sessions and malformed V3 inputs', async () => {
    const api = newApi();
    const v2 = await api.createSession('f@school.edu', ['Old'], 'team_device', 'self');
    const tc2 = v2.teams[0].team_code;
    await loadTeamGame(api, tc2);
    const bad: V2PlayerQuarterInput = { quarter: 1, allocation: { consumer: 10, enterprise: 10, aiProduct: 10, people: 0, universityCredentials: 0, cashReserve: 0 }, expansion: 0 as never };
    // the client facade refuses first; force the RPC directly to check the server
    await api.setPhase(tc2, 1, 'briefing', 'decide');
    await api.saveDraft(tc2, 1, { quarter: 1, input: { ...bad, recessionStance: 'protect' } });
    await api.setPhase(tc2, 1, 'decide', 'belief'); await api.setPhase(tc2, 1, 'belief', 'risk');
    await api.confirmCommitment(tc2, 1, 'agreed', 'CEO');
    const g = await loadTeamGame(api, tc2);
    await expect(api.resolveQuarter(tc2, 1, g.record.state_version, { ...bad, recessionStance: 'protect' } as never, toStorable(g.snapshot) as never, {} as never))
      .rejects.toThrow(/not available in this session/);

    const v3 = await api.createSession('f@school.edu', ['New'], 'team_device', 'self', 'A');
    const tc3 = v3.teams[0].team_code;
    await loadTeamGame(api, tc3);
    const over: V2PlayerQuarterInput = { quarter: 1, allocation: { consumer: 10, enterprise: 10, aiProduct: 15, people: 0, universityCredentials: 0, cashReserve: 0 }, expansion: 5 };
    await api.setPhase(tc3, 1, 'briefing', 'decide');
    await api.saveDraft(tc3, 1, { quarter: 1, input: over });
    await api.setPhase(tc3, 1, 'decide', 'belief'); await api.setPhase(tc3, 1, 'belief', 'risk');
    await api.confirmCommitment(tc3, 1, 'agreed', 'CEO');
    const g3 = await loadTeamGame(api, tc3);
    await expect(api.resolveQuarter(tc3, 1, g3.record.state_version, over as never, toStorable(g3.snapshot) as never, {} as never)).rejects.toThrow(/expansion is not allowed/i);
  });
});
