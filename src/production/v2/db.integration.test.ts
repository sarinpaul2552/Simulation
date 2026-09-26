/**
 * Batch 5 · 5B — persistence / RPC / RLS integration tests against a real PostgreSQL + PostgREST stack
 * (scripts/v2-local/up.sh). Skipped unless V2_DB_URL and V2_DB_KEY (anon key) are set.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createV2Api, V2Api, V2CreatedSession } from './api';
import { loadTeamGame, commitQuarter, saveDecisionDraft, storableInput, V2LoadedGame, auditTeam } from './gameService';
import { ARC_STRATEGIES, runArc, V2ArcRun, a } from '../../testlab/utils/v2ScenarioArc';
import { firstDifference } from './snapshot';
import { resolveQuarter, headlineOf } from './adapter';
import { toStorable } from './snapshot';
import type { V2PlayerQuarterInput, V2Role } from './types';

declare const process: { env: Record<string, string | undefined> };
const URL = process.env.V2_DB_URL;
const KEY = process.env.V2_DB_KEY;
const ROLES: V2Role[] = ['CEO', 'CFO', 'Product', 'People', 'Growth'];

function inputsOf(run: V2ArcRun): V2PlayerQuarterInput[] {
  return run.quarters.map(h => {
    const d = h.decisions ?? {};
    const inp: V2PlayerQuarterInput = { quarter: h.quarter, allocation: { ...h.allocation } };
    if (h.quarter === 4 && h.record.ending.destination) inp.destination = h.record.ending.destination.id;
    if (d.opportunity) inp.opportunity = { ...d.opportunity };
    if (d.management) inp.management = d.management;
    if (d.crisisResponse) inp.crisisResponse = d.crisisResponse;
    if (d.finalOption) inp.finalOption = d.finalOption;
    if (d.financing) inp.financing = d.financing;
    return inp;
  });
}

async function expectRpcError(p: Promise<unknown>, re: RegExp) {
  await expect(p).rejects.toThrow(re);
}

/** Drive one quarter through the full classroom loop (briefing → … → vote → commit), returning the committed game. */
async function playQuarter(api: V2Api, game: V2LoadedGame, input: V2PlayerQuarterInput, votes: Record<V2Role, 'support' | 'concern' | 'oppose'>) {
  const q = input.quarter;
  const tc = game.teamCode;
  await api.setPhase(tc, q, 'briefing', 'decide');
  await saveDecisionDraft(api, game, { input, deliberation: { belief: `Q${q} thesis`, confidence: 3, risks: ['execution'] } });
  await api.setPhase(tc, q, 'decide', 'belief');
  await api.setPhase(tc, q, 'belief', 'risk');
  await api.setPhase(tc, q, 'risk', 'vote');
  for (const r of ROLES) await api.submitVote(tc, q, r, votes[r]);
  await api.setPhase(tc, q, 'vote', 'commit');
  const reloaded = await loadTeamGame(api, tc);
  return commitQuarter(api, reloaded, input);
}

describe.skipIf(!URL || !KEY)('Batch 5 · 5B persistence, RPC and RLS (live PostgreSQL + PostgREST)', () => {
  let client: SupabaseClient;
  let api: V2Api;
  let s: V2CreatedSession;
  const run = runArc(ARC_STRATEGIES.find(x => x.id === 'balanced')!, 8);
  const inputs = inputsOf(run);
  const allSupport = Object.fromEntries(ROLES.map(r => [r, 'support'])) as Record<V2Role, 'support'>;

  beforeAll(async () => {
    client = createClient(URL!, KEY!, { auth: { persistSession: false } });
    api = createV2Api(client);
    s = await api.createSession('facilitator@school.edu', ['Alpha', 'Beta', 'Gamma'], 'team_device', 'facilitator');
  });

  it('anon key cannot read or write any table directly (strict RLS preserved)', async () => {
    for (const t of ['sessions', 'teams', 'decisions', 'access_codes', 'access_log', 'v2_team_games', 'v2_quarter_resolutions', 'v2_votes']) {
      const { data, error } = await client.from(t).select('*');
      expect(error !== null || (Array.isArray(data) && data.length === 0)).toBe(true);
    }
    const ins = await client.from('v2_team_games').insert({ team_id: s.teams[0].team_id, session_id: s.session_id, schema_version: 1, engine_version: 'x', snapshot: {}, headline: {} });
    expect(ins.error).not.toBeNull();
    const upd = await client.from('sessions').update({ v2_open_quarter: 8 }).eq('id', s.session_id).select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
    const votes = await client.from('v2_votes').insert({ team_id: s.teams[0].team_id, quarter: 1, role: 'CEO', vote: 'support' });
    expect(votes.error).not.toBeNull();
    // Internal helpers are not callable
    const helper = await client.rpc('v2__team_id', { p_team_code: s.teams[0].team_code });
    expect(helper.error).not.toBeNull();
  });

  it('invalid codes cannot read or write', async () => {
    await expectRpcError(api.getGame('TEAM-XXXXXX'), /Invalid or expired team code/);
    await expectRpcError(api.saveDraft('TEAM-XXXXXX', 1, { quarter: 1 }), /Invalid or expired team code/);
    await expectRpcError(api.submitVote('TEAM-XXXXXX', 1, 'CEO', 'support'), /Invalid or expired team code/);
    await expectRpcError(api.getVotes('TEAM-XXXXXX', 1), /Invalid or expired team code/);
    await expectRpcError(api.resolveQuarter('TEAM-XXXXXX', 1, 0, {}, {}, headlineOf(resolveQuarter(await initSnap(), inputs[0]).snapshot)), /Invalid or expired team code/);
    await expectRpcError(api.facilitatorOverview(s.session_code, '0000' === s.admin_pin ? '1111' : '0000'), /Invalid admin PIN/);
    await expectRpcError(api.facilitatorOverview('ISB-NOPE00', s.admin_pin), /Invalid or expired session code/);
    await expectRpcError(api.setOpenQuarter(s.session_code, 'wrong', 8), /Invalid admin PIN/);
    await expectRpcError(api.join('ISB-NOPE00', s.teams[0].team_code), /Invalid or expired session code/);
    const other = await api.createSession('other@school.edu', ['Other'], 'team_device', 'self');
    await expectRpcError(api.join(s.session_code, other.teams[0].team_code), /not in session/);
  });

  it('game initialization is idempotent and restorable', async () => {
    const tc = s.teams[0].team_code;
    const g1 = await loadTeamGame(api, tc);
    const g2 = await loadTeamGame(api, tc);
    expect(g1.record.state_version).toBe(0);
    expect(firstDifference(g1.snapshot, g2.snapshot)).toBeNull();
    expect(g1.record.phase).toBe('briefing');
    expect(g1.session.engine_version).toBe('v2');
  });

  it('votes are hidden until all five are in; no double vote; commit needs all votes; draft locked while voting', async () => {
    const tc = s.teams[1].team_code;
    let game = await loadTeamGame(api, tc);
    await api.setPhase(tc, 1, 'briefing', 'decide');
    await expectRpcError(api.setPhase(tc, 1, 'decide', 'vote'), /not allowed/);
    await api.setPhase(tc, 1, 'decide', 'belief');
    await api.setPhase(tc, 1, 'belief', 'risk');
    await expectRpcError(api.setPhase(tc, 1, 'risk', 'vote'), /Save the decision/);
    await api.setPhase(tc, 1, 'risk', 'decide');
    await saveDecisionDraft(api, game, { input: inputs[0] });
    await api.setPhase(tc, 1, 'decide', 'belief');
    await api.setPhase(tc, 1, 'belief', 'risk');
    await api.setPhase(tc, 1, 'risk', 'vote');
    await expectRpcError(api.saveDraft(tc, 1, { quarter: 1, input: { quarter: 1, allocation: a({ consumer: 30 }) } }), /locked/);
    for (const [i, r] of ROLES.slice(0, 4).entries()) {
      await api.submitVote(tc, 1, r, i % 2 ? 'oppose' : 'support');
      const v = await api.getVotes(tc, 1);
      expect(v.revealed).toBe(false);
      expect(v.votes).toBeNull();
      expect(v.submitted_roles).toHaveLength(i + 1);
    }
    await expectRpcError(api.submitVote(tc, 1, 'CEO', 'oppose'), /already voted/);
    await expectRpcError(api.setPhase(tc, 1, 'vote', 'commit'), /All five roles/);
    game = await loadTeamGame(api, tc);
    await expectRpcError(commitQuarter(api, game, inputs[0]), /not ready to commit/);
    await api.submitVote(tc, 1, 'Growth', 'concern');
    const v = await api.getVotes(tc, 1);
    expect(v.revealed).toBe(true);
    expect(v.votes).toEqual({ CEO: 'support', CFO: 'oppose', Product: 'support', People: 'oppose', Growth: 'concern' });
    // Going back to edit clears the votes (re-vote on the changed decision)
    await api.setPhase(tc, 1, 'vote', 'decide');
    expect((await api.getVotes(tc, 1)).submitted_roles).toHaveLength(0);
  });

  it('commit must equal the voted decision; stale versions and unopened quarters are rejected; double commit is idempotent', async () => {
    const tc = s.teams[1].team_code;
    let game = await loadTeamGame(api, tc);
    await saveDecisionDraft(api, game, { input: inputs[0] });
    await api.setPhase(tc, 1, 'decide', 'belief');
    await api.setPhase(tc, 1, 'belief', 'risk');
    await api.setPhase(tc, 1, 'risk', 'vote');
    for (const r of ROLES) await api.submitVote(tc, 1, r, 'support');
    await api.setPhase(tc, 1, 'vote', 'commit');
    game = await loadTeamGame(api, tc);
    // A different decision than the one voted on
    const other: V2PlayerQuarterInput = { quarter: 1, allocation: a({ consumer: 30 }) };
    await expectRpcError(commitQuarter(api, game, other), /differs from the decision the team voted on/);
    // Stale version
    const res = resolveQuarter(game.snapshot, inputs[0]);
    await expectRpcError(api.resolveQuarter(tc, 1, 7, storableInput(inputs[0]), toStorable(res.snapshot), headlineOf(res.snapshot)), /Version conflict/);
    // Forged snapshot (does not extend the stored game with the committed input)
    const forged = resolveQuarter(game.snapshot, other).snapshot;
    await expectRpcError(api.resolveQuarter(tc, 1, 0, storableInput(inputs[0]), toStorable(forged), headlineOf(forged)), /Snapshot does not extend/);
    // Two concurrent commits: exactly one resolves
    const [c1, c2] = await Promise.all([commitQuarter(api, game, inputs[0]), commitQuarter(api, game, inputs[0])]);
    expect([c1.status, c2.status].sort()).toEqual(['already_resolved', 'resolved']);
    expect(c1.game.record.state_version).toBe(1);
    expect(c2.game.record.state_version).toBe(1);
    // Retry after the fact also returns the stored resolution, unchanged
    const c3 = await commitQuarter(api, game, inputs[0]);
    expect(c3.status).toBe('already_resolved');
    expect(c3.game.resolutions).toHaveLength(1);
    expect(c3.game.record.phase).toBe('results');
    // Facilitator pacing: Q2 is not open yet
    await api.setPhase(tc, 1, 'results', 'reflect');
    await api.saveReflection(tc, 1, 'We learned that AI takes time.');
    await expectRpcError(api.setPhase(tc, 1, 'reflect', 'briefing'), /has not been opened/);
  });

  it('happy path: a team plays Q1–Q8 through the RPCs with refresh at every step; economics equal the Test Lab exactly', async () => {
    const tc = s.teams[0].team_code;
    let game = await loadTeamGame(api, tc);
    for (const input of inputs) {
      const q = input.quarter;
      if (q > 1) {
        await expectRpcError(api.setPhase(tc, q - 1, 'reflect', 'briefing'), /has not been opened/);
        await api.setOpenQuarter(s.session_code, s.admin_pin, q);
        await api.setPhase(tc, q - 1, 'reflect', 'briefing');
      }
      game = await loadTeamGame(api, tc);
      const out = await playQuarter(api, game, input, allSupport);
      expect(out.status).toBe('resolved');
      game = await loadTeamGame(api, tc); // refresh after commit
      expect(game.record.phase).toBe('results');
      expect(game.record.completed_quarter).toBe(q);
      expect(firstDifference(game.snapshot.state.ledgerHistory[q - 1], run.quarters[q - 1].record.consequence.ledger)).toBeNull();
      await api.setPhase(tc, q, 'results', 'reflect');
      await api.saveReflection(tc, q, `Reflection Q${q}`);
      if (q === 4) expect(game.snapshot.state.destination?.id).toBe(run.finalState.destination?.id);
    }
    await api.setPhase(tc, 8, 'reflect', 'final');
    game = await loadTeamGame(api, tc);
    expect(game.record.phase).toBe('final');
    expect(game.record.state_version).toBe(8);
    expect(game.resolutions.map(r => r.reflection)).toEqual(inputs.map(i => `Reflection Q${i.quarter}`));
    expect(game.resolutions[0].deliberation).toEqual({ belief: 'Q1 thesis', confidence: 3, risks: ['execution'] });
    const { state } = game.snapshot;
    expect(firstDifference(state.ledgerHistory, run.finalState.ledgerHistory)).toBeNull();
    expect(firstDifference(state.capabilities, run.finalState.capabilities)).toBeNull();
    expect(firstDifference(state.financing, run.finalState.financing)).toBeNull();
    expect(state.final.record?.option).toBe(run.finalState.final.record?.option);
    await expectRpcError(api.setPhase(tc, 8, 'final', 'briefing'), /Wrong quarter|not allowed|Phase conflict/);
  });

  it('facilitator overview: headline only, no private data; teams are isolated', async () => {
    const o = await api.facilitatorOverview(s.session_code, s.admin_pin);
    expect(o.engine_version).toBe('v2');
    expect(o.teams).toHaveLength(3);
    const text = JSON.stringify(o);
    for (const leak of ['snapshot', 'draft', 'deliberation', 'belief', 'ledgerHistory', 'capabilities', '"vote"', 'support']) expect(text).not.toContain(leak);
    const alpha = o.teams.find(t => t.team_name === 'Alpha')!;
    expect(alpha.completed_quarter).toBe(8);
    expect(alpha.headline!.final!.overall).toBeGreaterThan(0);
    const gamma = o.teams.find(t => t.team_name === 'Gamma')!;
    expect(gamma.started).toBe(false);
    // Team B's code only ever returns Team B's game
    const beta = await api.getGame(s.teams[1].team_code);
    expect(beta.team_name).toBe('Beta');
    expect(beta.game!.completed_quarter).toBe(1);
  });
});

describe.skipIf(!URL || !KEY)('Batch 5 · 5B voting-disabled mode and facilitator integrity audit (live DB)', () => {
  it('voting-disabled: risk → commit without votes; vote phase unavailable', async () => {
    const api = createV2Api(createClient(URL!, KEY!, { auth: { persistSession: false } }));
    const s = await api.createSession('f@school.edu', ['NoVote'], 'voting_disabled', 'self');
    const tc = s.teams[0].team_code;
    const game = await loadTeamGame(api, tc);
    const input: V2PlayerQuarterInput = { quarter: 1, allocation: a({ enterprise: 15, aiProduct: 15 }) };
    await api.setPhase(tc, 1, 'briefing', 'decide');
    await saveDecisionDraft(api, game, { input });
    await api.setPhase(tc, 1, 'decide', 'belief');
    await api.setPhase(tc, 1, 'belief', 'risk');
    await expectRpcError(api.setPhase(tc, 1, 'risk', 'vote'), /not allowed/);
    await api.setPhase(tc, 1, 'risk', 'commit');
    const out = await commitQuarter(api, await loadTeamGame(api, tc), input);
    expect(out.status).toBe('resolved');
    await api.setPhase(tc, 1, 'results', 'reflect');
    await api.setPhase(tc, 1, 'reflect', 'briefing'); // self-paced: no facilitator gate
  });

  it('facilitator audit verifies honest teams and flags a team whose client stored a forged headline', async () => {
    const api = createV2Api(createClient(URL!, KEY!, { auth: { persistSession: false } }));
    const s = await api.createSession('f@school.edu', ['Honest', 'Forger'], 'voting_disabled', 'self');
    const input: V2PlayerQuarterInput = { quarter: 1, allocation: a({ consumer: 10, aiProduct: 20 }) };
    for (const [i, t] of s.teams.entries()) {
      const g = await loadTeamGame(api, t.team_code);
      await api.setPhase(t.team_code, 1, 'briefing', 'decide');
      await saveDecisionDraft(api, g, { input });
      await api.setPhase(t.team_code, 1, 'decide', 'belief');
      await api.setPhase(t.team_code, 1, 'belief', 'risk');
      await api.setPhase(t.team_code, 1, 'risk', 'commit');
      const res = resolveQuarter(g.snapshot, input);
      const headline = headlineOf(res.snapshot);
      await api.resolveQuarter(t.team_code, 1, 0, storableInput(input), toStorable(res.snapshot), i === 0 ? headline : { ...headline, cash: headline.cash + 50 });
    }
    const audit = await api.facilitatorAudit(s.session_code, s.admin_pin);
    const byTeam = Object.fromEntries(audit.map(e => [e.team_id, auditTeam(e)]));
    expect(byTeam[s.teams[0].team_id].status).toBe('verified');
    expect(byTeam[s.teams[1].team_id].status).toBe('mismatch');
    expect(JSON.stringify(audit)).not.toMatch(/deliberation|belief|draft|vote/);
    await expectRpcError(api.facilitatorAudit(s.session_code, 'nope'), /Invalid admin PIN/);
  });
});

async function initSnap() {
  const { initializeGame } = await import('./adapter');
  return initializeGame();
}
