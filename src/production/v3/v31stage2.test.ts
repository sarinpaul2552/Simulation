/**
 * NexLearn V3.1 Stage 2 — engine versioning.
 *
 *  - v3-econ-1.1 parity: every laboratory strategy on every market path (with and without financed expansion) produces
 *    exactly the v3-econ-1.0 game — state, input log, valuation, terminal score — apart from the version label.
 *  - Isolation: giving 1.1 different economics changes 1.1 games only; 1.0 and V2 games are untouched, and every game
 *    replays (verify, history, report) on its own version.
 *  - Configuration safety: the registry is frozen; the active configuration is always restored (also on error).
 *  - Session-version persistence (client side): session ↔ config mapping, mismatch rejection, explicit selection.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  V3_ECONOMICS, V3_ENGINE_VERSIONS, v3ConfigFor, withV3Version, withRegisteredV3Config, withV3Economics, ALL_MECHANISMS_OFF,
  V3_1_1_CHANGES, type V3EconomicsConfig, type DeepPartial,
} from '../../simulationV3/engineV3Config';

/**
 * Stage 3A: 1.1 now differs from 1.0 by exactly V3_1_1_CHANGES. Reverting those values (to the registered 1.0 values)
 * must reproduce 1.0 exactly — proving that every 1.1 difference is a listed configuration change.
 */
function revertedTo10(): DeepPartial<V3EconomicsConfig> {
  const c10 = JSON.parse(JSON.stringify(v3ConfigFor('v3-econ-1.0'))) as Record<string, Record<string, unknown>>;
  const out: Record<string, Record<string, unknown>> = {};
  for (const [block, vals] of Object.entries(V3_1_1_CHANGES as Record<string, Record<string, unknown>>)) {
    out[block] = {};
    for (const k of Object.keys(vals)) out[block][k] = c10[block][k];
  }
  return out as DeepPartial<V3EconomicsConfig>;
}
import * as V3 from './adapter';
import * as F from '../v2/engine';
import { assertAnySnapshotContract, firstDifference, toStorable, type V2GameSnapshot } from '../v2/snapshot';
import { sessionConfig, fromResponse, V2IntegrityError } from '../v2/gameService';
import { createV2Api, econVersionFlag, type V2TeamGameResponse } from '../v2/api';
import { gameHistory } from '../v2/insights/history';
import { valuationSeries } from '../v2/insights/valuation';
import { play, type LabConfig } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';
import type { SupabaseClient } from '@supabase/supabase-js';

const PATHS = ['A', 'B', 'C'] as const;
const strategy = (id: string) => V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy;
const fingerprint = (snap: V2GameSnapshot) => ({
  state: snap.state,
  inputs: snap.inputs,
  prices: valuationSeries(gameHistory(snap)).points.map(p => p.price),
  score: F.getFinalOutcome(snap).score,
});
const sameExceptVersion = (a: V2GameSnapshot, b: V2GameSnapshot) => firstDifference({ ...a, engineVersion: 'x' }, { ...b, engineVersion: 'x' });

describe('V3.1 Stage 2 · version registry', () => {
  it('registers v3-econ-1.0 and v3-econ-1.1; 1.1 differs from 1.0 only by V3_1_1_CHANGES; the active configuration is 1.0 at rest', () => {
    expect([...V3_ENGINE_VERSIONS]).toEqual(['v3-econ-1.0', 'v3-econ-1.1']);
    const c10 = v3ConfigFor('v3-econ-1.0'), c11 = v3ConfigFor('v3-econ-1.1');
    expect(c10.version).toBe('v3-econ-1.0');
    expect(c11.version).toBe('v3-econ-1.1');
    expect(firstDifference({ ...c11, version: '' }, { ...c10, version: '' })).not.toBeNull();
    withRegisteredV3Config('v3-econ-1.1', revertedTo10(), () => {
      const r11 = v3ConfigFor('v3-econ-1.1');
      expect(firstDifference({ ...r11, version: '' }, { ...c10, version: '' })).toBeNull();
    });
    expect(c10.mechanisms.installedBaseDemand).toBe(false);
    expect(c10.mechanisms.creditCycle).toBe(false);
    expect(c11.mechanisms.installedBaseDemand).toBe(true);
    expect(c11.mechanisms.creditCycle).toBe(true);
    expect(firstDifference(JSON.parse(JSON.stringify(V3_ECONOMICS)), JSON.parse(JSON.stringify(c10)))).toBeNull();
    expect(() => v3ConfigFor('v3-econ-9.9')).toThrow(/Unknown V3 engine version/);
  });

  it('registered configurations are frozen (a released version cannot be edited at run time)', () => {
    const c10 = v3ConfigFor('v3-econ-1.0') as unknown as { ai: { convergenceSpeed: number }; financing: { quarters: number[] } };
    expect(() => { c10.ai.convergenceSpeed = 1; }).toThrow();
    expect(() => { c10.financing.quarters.push(8); }).toThrow();
  });

  it('withV3Version restores the active configuration afterwards, after nesting, and after an error', () => {
    const at = () => JSON.stringify(V3_ECONOMICS);
    const rest = at();
    expect(withV3Version('v3-econ-1.1', () => V3_ECONOMICS.version)).toBe('v3-econ-1.1');
    expect(at()).toBe(rest);
    withV3Version('v3-econ-1.1', () => {
      expect(withV3Version('v3-econ-1.0', () => V3_ECONOMICS.version)).toBe('v3-econ-1.0');
      expect(V3_ECONOMICS.version).toBe('v3-econ-1.1');
    });
    expect(() => withV3Version('v3-econ-1.1', () => { throw new Error('boom'); })).toThrow('boom');
    expect(at()).toBe(rest);
    expect(() => withRegisteredV3Config('v3-econ-1.1', { ai: { convergenceSpeed: 0.9 } }, () => { throw new Error('boom'); })).toThrow('boom');
    expect(v3ConfigFor('v3-econ-1.1').ai.convergenceSpeed).toBe(v3ConfigFor('v3-econ-1.0').ai.convergenceSpeed);
    expect(() => withV3Version('v3-econ-9.9', () => 1)).toThrow(/Unknown V3 engine version/);
  });

  it('laboratory overrides still apply to 1.0 games (nested calls in the active version change nothing)', () => {
    const off = withV3Economics({ mechanisms: ALL_MECHANISMS_OFF }, () => play(strategy('adaptive'), { engine: 'v3', path: 'A' }).snapshot);
    const on = play(strategy('adaptive'), { engine: 'v3', path: 'A' }).snapshot;
    expect(firstDifference(off.state, on.state)).not.toBeNull();
  });
});

describe('V3.1 Stage 2 · v3-econ-1.1 with the Stage 3A changes reverted equals v3-econ-1.0 (all paths × all laboratory strategies)', () => {
  it.each(PATHS)('path %s', path => withRegisteredV3Config('v3-econ-1.1', revertedTo10(), () => {
    let games = 0;
    for (const s of V3_LAB_STRATEGIES) {
      for (const opts of [{}, { expansion: 5 }]) {
        const g10 = play(s.strategy, { engine: 'v3', path, version: 'v3-econ-1.0' }, opts).snapshot;
        const g11 = play(s.strategy, { engine: 'v3', path, version: 'v3-econ-1.1' }, opts).snapshot;
        const gDefault = play(s.strategy, { engine: 'v3', path }, opts).snapshot;
        expect(g10.engineVersion).toBe('v3-econ-1.0');
        expect(gDefault.engineVersion).toBe('v3-econ-1.0');
        expect(g11.engineVersion).toBe('v3-econ-1.1');
        expect(g11.completedQuarter).toBe(8);
        expect(firstDifference(g10, gDefault), `${s.strategy.id} default`).toBeNull();
        expect(sameExceptVersion(g11, g10), `${s.strategy.id} ${JSON.stringify(opts)}`).toBeNull();
        expect(firstDifference(fingerprint(g11), fingerprint(g10)), `${s.strategy.id} insights`).toBeNull();
        expect(F.verifySnapshot(g11).ok).toBe(true);
        expect(() => assertAnySnapshotContract(g11)).not.toThrow();
        games++;
      }
    }
    expect(games).toBe(V3_LAB_STRATEGIES.length * 2);
  }));

  it('the facade creates and replays a game on the version it is given', () => {
    const cfg = F.v3Config('B', 'v3-econ-1.1');
    expect(F.initializeGame(cfg).engineVersion).toBe('v3-econ-1.1');
    expect(F.initializeGame(F.v3Config('B')).engineVersion).toBe('v3-econ-1.0');
    const g = play(strategy('balanced'), { engine: 'v3', path: 'B', version: 'v3-econ-1.1' }).snapshot;
    expect(F.configOf(g)).toEqual(cfg);
    expect(firstDifference(F.replayInputs(g.inputs, cfg), g)).toBeNull();
  });
});

describe('V3.1 Stage 2 · isolation: 1.1 can change without altering existing versions', () => {
  const CHANGE = { ai: { revenuePerAdoptionPoint: 0.6 }, enterprise: { deliveryCommitmentScale: 1 } };

  it('a different 1.1 configuration changes 1.1 games only; 1.0 and V2 games are unchanged', () => {
    const base10 = play(strategy('ai-led'), { engine: 'v3', path: 'A' }).snapshot;
    const baseV2 = play(strategy('ai-led'), { engine: 'v2' }).snapshot;
    const rest = JSON.stringify(V3_ECONOMICS);
    withRegisteredV3Config('v3-econ-1.1', CHANGE, () => {
      const g11 = play(strategy('ai-led'), { engine: 'v3', path: 'A', version: 'v3-econ-1.1' }).snapshot;
      const g10 = play(strategy('ai-led'), { engine: 'v3', path: 'A', version: 'v3-econ-1.0' }).snapshot;
      const gV2 = play(strategy('ai-led'), { engine: 'v2' }).snapshot;
      expect(sameExceptVersion(g11, base10)).not.toBeNull();           // 1.1 economics changed
      expect(firstDifference(g10, base10)).toBeNull();                  // 1.0 untouched
      expect(firstDifference(gV2, baseV2)).toBeNull();                  // V2 untouched
      expect(JSON.stringify(V3_ECONOMICS)).toBe(rest);                  // active configuration restored between calls
      // every game replays on its own version — verification, history and the board report included
      expect(F.verifySnapshot(g11).ok).toBe(true);
      expect(F.verifySnapshot(g10).ok).toBe(true);
      const relabelled = { ...g11, engineVersion: 'v3-econ-1.0' as const };
      expect(F.verifySnapshot(relabelled).ok).toBe(false);              // a 1.1 game does not verify as 1.0
      const h = gameHistory(g11);
      expect(firstDifference(h[h.length - 1].after, g11.state)).toBeNull();
    });
    expect(JSON.stringify(V3_ECONOMICS)).toBe(rest);
  });

  const LABS: LabConfig[] = [{ engine: 'v3', path: 'C', version: 'v3-econ-1.1' }];
  it('the laboratory can play a version explicitly', () => {
    expect(play(strategy('balanced'), LABS[0]).snapshot.engineVersion).toBe('v3-econ-1.1');
  });
});

describe('V3.1 Stage 2 · snapshot contract', () => {
  it('accepts both V3 versions and rejects unknown ones', () => {
    expect(() => assertAnySnapshotContract(V3.initializeGame('A', 'v3-econ-1.1'))).not.toThrow();
    expect(() => assertAnySnapshotContract(V3.initializeGame('A', 'v3-econ-1.0'))).not.toThrow();
    expect(() => assertAnySnapshotContract({ ...V3.initializeGame('A'), engineVersion: 'v3-econ-9.9' as never })).toThrow();
    expect(() => V3.initializeGame('A', 'v3-econ-9.9')).toThrow(/Unknown V3 engine version/);
  });
});

describe('V3.1 Stage 2 · session-version persistence (client)', () => {
  it('maps the session’s stored version to the engine version; NULL is 1.0', () => {
    expect(sessionConfig({ econ_engine: 'v3', market_path: 'A' })).toEqual(F.v3Config('A', 'v3-econ-1.0'));
    expect(sessionConfig({ econ_engine: 'v3', market_path: 'A', econ_version: null })).toEqual(F.v3Config('A', 'v3-econ-1.0'));
    expect(sessionConfig({ econ_engine: 'v3', market_path: 'A', econ_version: '1.0' })).toEqual(F.v3Config('A', 'v3-econ-1.0'));
    expect(sessionConfig({ econ_engine: 'v3', market_path: 'C', econ_version: '1.1' })).toEqual(F.v3Config('C', 'v3-econ-1.1'));
    expect(() => sessionConfig({ econ_engine: 'v3', market_path: 'A', econ_version: '2.0' })).toThrow(V2IntegrityError);
    expect(() => sessionConfig({ econ_engine: 'v2', econ_version: '1.1' })).toThrow(V2IntegrityError);
    expect(sessionConfig({ econ_engine: 'v2', econ_version: null })).toEqual(F.V2_CONFIG);
    expect(sessionConfig({})).toEqual(F.V2_CONFIG);
  });

  const respFor = (snap: V2GameSnapshot, econ_version: string | null): V2TeamGameResponse => ({
    team_id: 't', team_name: 'T',
    session: { session_code: 'S', engine_version: 'v2', participation_mode: 'team_device', pacing: 'self', open_quarter: 1, econ_engine: 'v3', market_path: snap.marketPath, econ_version } as never,
    game: { state_version: snap.completedQuarter, completed_quarter: snap.completedQuarter, phase: 'results', snapshot: toStorable(snap), draft: null, updated_at: '' } as never,
    resolutions: snap.inputs.map(input => ({ quarter: input.quarter, input })) as never,
  });

  it('a stored game loads only into a session of the same engine version', () => {
    const g11 = play(strategy('adaptive'), { engine: 'v3', path: 'B', version: 'v3-econ-1.1' }).snapshot;
    const g10 = play(strategy('adaptive'), { engine: 'v3', path: 'B' }).snapshot;
    expect(fromResponse('T', respFor(g11, '1.1')).snapshot.engineVersion).toBe('v3-econ-1.1');
    expect(fromResponse('T', respFor(g10, null)).snapshot.engineVersion).toBe('v3-econ-1.0');
    expect(fromResponse('T', respFor(g10, '1.0')).snapshot.engineVersion).toBe('v3-econ-1.0');
    expect(() => fromResponse('T', respFor(g11, null))).toThrow(/uses V3 path B \(v3-econ-1\.1\) but the session uses V3 path B \(v3-econ-1\.0\)/);
    expect(() => fromResponse('T', respFor(g10, '1.1'))).toThrow(V2IntegrityError);
  });

  it('explicit selection: only ?econ=1.1 / 1.0 select a version; the API routes it to v3_create_session_v', async () => {
    expect(econVersionFlag('?econ=1.1')).toBe('1.1');
    expect(econVersionFlag('?econ=1.0')).toBe('1.0');
    expect(econVersionFlag('')).toBeUndefined();
    expect(econVersionFlag('?econ=2')).toBeUndefined();
    const rpc = vi.fn(async (fn: string, args: unknown) => ({ data: { fn, args }, error: null }));
    const api = createV2Api({ rpc } as unknown as SupabaseClient);
    await api.createSession('f@x.edu', ['T'], 'team_device', 'self', 'A', '1.1');
    await api.createSession('f@x.edu', ['T'], 'team_device', 'self', 'A');
    await api.createSession('f@x.edu', ['T'], 'team_device', 'self');
    expect(rpc.mock.calls.map(c => c[0])).toEqual(['v3_create_session_v', 'v3_create_session', 'v2_create_session']);
    expect((rpc.mock.calls[0][1] as { p_econ_version: string }).p_econ_version).toBe('1.1');
    expect(rpc.mock.calls[1][1]).not.toHaveProperty('p_econ_version');
    await expect(api.createSession('f@x.edu', ['T'], 'team_device', 'self', undefined, '1.1')).rejects.toThrow(/V3 session/);
    expect(rpc).toHaveBeenCalledTimes(3);
  });
});
