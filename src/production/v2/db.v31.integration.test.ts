/**
 * NexLearn V3.1 Stage 2 — session engine versions against the local disposable PostgreSQL + PostgREST stack
 * (scripts/v2-local/up.sh applies database/MIGRATION_V3_1_ENGINE_VERSION.sql after the V3 migration).
 * Skipped unless V2_DB_URL and V2_DB_KEY are set. Never run against a shared or production project.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createV2Api, V2Api } from './api';
import { loadTeamGame, commitQuarter, saveDecisionDraft, sessionConfig } from './gameService';
import { toStorable, firstDifference } from './snapshot';
import * as V3 from '../v3/adapter';
import { v3Config } from './engine';
import type { V2PlayerQuarterInput } from './types';
import { play } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';

declare const process: { env: Record<string, string | undefined> };
const URL = process.env.V2_DB_URL;
const KEY = process.env.V2_DB_KEY;
const newApi = () => createV2Api(createClient(URL!, KEY!, { auth: { persistSession: false } }));
const strategy = (id: string) => V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy;

async function commitThroughLoop(api: V2Api, tc: string, input: V2PlayerQuarterInput) {
  const q = input.quarter;
  await api.setPhase(tc, q, 'briefing', 'decide');
  await saveDecisionDraft(api, await loadTeamGame(api, tc), { input, deliberation: { beliefId: `q${q}-x`, riskIds: ['cash'], confidence: 3 } });
  await api.setPhase(tc, q, 'decide', 'belief');
  await api.setPhase(tc, q, 'belief', 'risk');
  await api.confirmCommitment(tc, q, 'agreed', 'CEO');
  return commitQuarter(api, await loadTeamGame(api, tc), input);
}

describe.skipIf(!URL || !KEY)('NexLearn V3.1 · session engine versions (local DB)', () => {
  it('records an explicitly selected engine version; sessions created without one keep v3-econ-1.0', async () => {
    const api = newApi();
    const s11 = await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'B', '1.1');
    expect(s11.econ_engine).toBe('v3');
    expect(s11.econ_version).toBe('1.1');
    const g11 = await api.getGame(s11.teams[0].team_code);
    expect(g11.session.econ_version).toBe('1.1');
    expect(sessionConfig(g11.session)).toEqual(v3Config('B', 'v3-econ-1.1'));
    expect((await api.facilitatorOverview(s11.session_code, s11.admin_pin)).econ_version).toBe('1.1');

    const s10 = await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'B', '1.0');
    expect((await api.getGame(s10.teams[0].team_code)).session.econ_version).toBe('1.0');

    // the unchanged v3_create_session: no version recorded (NULL = 1.0); V2 sessions never carry one
    const legacy = await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'B');
    const gl = await api.getGame(legacy.teams[0].team_code);
    expect(gl.session.econ_version).toBeNull();
    expect(sessionConfig(gl.session)).toEqual(v3Config('B', 'v3-econ-1.0'));
    const v2 = await api.createSession('f@school.edu', ['Old'], 'team_device', 'self');
    expect((await api.getGame(v2.teams[0].team_code)).session.econ_version).toBeNull();

    await expect(api.createSession('f@school.edu', ['X'], 'team_device', 'self', 'A', '9.9' as never)).rejects.toThrow(/Invalid engine version/);
    await expect(api.createSession('f@school.edu', ['X'], 'team_device', 'self', undefined, '1.1')).rejects.toThrow(/only be chosen for a V3 session/);
  });

  it('the snapshot’s engine version must match the session’s, in both directions', async () => {
    const api = newApi();
    const s11 = await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'C', '1.1');
    const tc11 = s11.teams[0].team_code;
    await expect(api.initGame(tc11, toStorable(V3.initializeGame('C', 'v3-econ-1.0')) as never, {} as never)).rejects.toThrow(/does not match this session/);
    const g11 = await loadTeamGame(api, tc11);
    expect(g11.snapshot.engineVersion).toBe('v3-econ-1.1');

    const legacy = await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'C');
    const tcl = legacy.teams[0].team_code;
    await expect(api.initGame(tcl, toStorable(V3.initializeGame('C', 'v3-econ-1.1')) as never, {} as never)).rejects.toThrow(/does not match this session/);
    expect((await loadTeamGame(api, tcl)).snapshot.engineVersion).toBe('v3-econ-1.0');

    const s10 = await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'C', '1.0');
    await expect(api.initGame(s10.teams[0].team_code, toStorable(V3.initializeGame('C', 'v3-econ-1.1')) as never, {} as never)).rejects.toThrow(/does not match this session/);
  });

  it('the engine version cannot be changed with the public key', async () => {
    const api = newApi();
    await api.createSession('f@school.edu', ['T'], 'team_device', 'self', 'A', '1.1');
    const c = createClient(URL!, KEY!, { auth: { persistSession: false } });
    const upd = await c.from('sessions').update({ econ_version: '1.0' }).neq('id', '00000000-0000-0000-0000-000000000000').select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
  });

  it('a v3-econ-1.1 team plays Q1–Q8 through the RPCs; the stored game equals the 1.1 engine exactly and differs from 1.0 (Stage 3A)', async () => {
    const api = newApi();
    const s = await api.createSession('f@school.edu', ['Team'], 'team_device', 'self', 'B', '1.1');
    const tc = s.teams[0].team_code;
    const expected = play(strategy('adaptive'), { engine: 'v3', path: 'B', version: 'v3-econ-1.1' }, { expansion: 5 });
    const baseline = play(strategy('adaptive'), { engine: 'v3', path: 'B' }, { expansion: 5 });
    await loadTeamGame(api, tc);
    for (const { input } of expected.quarters) {
      const q = input.quarter;
      if (q > 1) { await api.setPhase(tc, q - 1, 'results', 'reflect'); await api.setPhase(tc, q - 1, 'reflect', 'briefing'); }
      expect((await commitThroughLoop(api, tc, input)).status, `Q${q}`).toBe('resolved');
    }
    const game = await loadTeamGame(api, tc); // restores and verifies by replay on v3-econ-1.1
    expect(game.snapshot.engineVersion).toBe('v3-econ-1.1');
    expect(game.record.completed_quarter).toBe(8);
    expect(firstDifference(toStorable(game.snapshot), toStorable(expected.snapshot))).toBeNull();
    // Stage 3A: the session plays its own version — 1.1 economics differ from 1.0, and the lapsed-revenue pool survives jsonb
    expect(firstDifference(game.snapshot.state, baseline.snapshot.state)).not.toBeNull();
    expect((game.snapshot.state as { lapsedRevenue?: unknown }).lapsedRevenue).toBeDefined();
    expect((baseline.snapshot.state as { lapsedRevenue?: unknown }).lapsedRevenue).toBeUndefined();
  });
});
