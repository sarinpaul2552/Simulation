/**
 * Quarter-by-quarter history for dashboards and reports (Batch 7). Rebuilt by replaying the committed input log with
 * the frozen engine (same path as resultForQuarter) — nothing is invented, nothing is read from untrusted storage.
 */
import type { V2Consequence, V2TeamState } from '../../../simulation/engineV2';
import { getV2Baseline } from '../../../simulation/engineV2';
import { initializeGame, resolveQuarter, configOf, engineOf } from '../engine';
import type { V2GameSnapshot } from '../snapshot';
import type { V2PlayerQuarterInput, V2QuarterResult } from '../types';

export interface QuarterRecord {
  /** Which economic engine produced the record (selects the valuation version: V2 → NXLN-VAL-1.0, V3 → 1.1). */
  engine: 'v2' | 'v3';
  quarter: number;
  input: V2PlayerQuarterInput;
  before: V2TeamState;
  after: V2TeamState;
  consequence: V2Consequence;
  result: V2QuarterResult;
}

const cache = new WeakMap<V2GameSnapshot, QuarterRecord[]>();

export function gameHistory(snap: V2GameSnapshot): QuarterRecord[] {
  const hit = cache.get(snap);
  if (hit) return hit;
  const out: QuarterRecord[] = [];
  let cur = initializeGame(configOf(snap));
  const engine = engineOf(snap);
  for (const input of snap.inputs) {
    const r = resolveQuarter(cur, input);
    out.push({ engine, quarter: input.quarter, input, before: cur.state, after: r.snapshot.state, consequence: r.consequence, result: r.result });
    cur = r.snapshot;
  }
  cache.set(snap, out);
  return out;
}

/** The real starting company (Q0) — a recorded state, not a benchmark. */
export const startingCompany = (): V2TeamState => getV2Baseline();
