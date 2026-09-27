/**
 * V2 PRODUCTION SNAPSHOT (Batch 5 · 5A)
 *
 * Versioned, lossless serialization of a V2 game. Plain JSON is NOT lossless for V2TeamState: diagnostics carry
 * `Infinity` bounds and `-0` contributions, which JSON turns into `null` and `0`. This codec tags non-finite numbers
 * and negative zero so a snapshot restored from the database is bit-identical to the one that was saved.
 *
 * The frozen engine is never modified; the codec wraps its state.
 */
import type { V2TeamState } from '../../simulation/engineV2';
import type { V2PlayerQuarterInput } from './types';

export const V2_SNAPSHOT_SCHEMA = 'v2-game-snapshot' as const;
export const V2_SNAPSHOT_SCHEMA_VERSION = 1 as const;
/** Identifies the frozen economic engine a snapshot was produced by (Batch 4 calibration, frozen in Batch 5). */
export const V2_ENGINE_VERSION = 'v2-econ-batch4-frozen' as const;

export interface V2GameSnapshot {
  schema: typeof V2_SNAPSHOT_SCHEMA;
  schemaVersion: typeof V2_SNAPSHOT_SCHEMA_VERSION;
  engineVersion: typeof V2_ENGINE_VERSION;
  /** Last resolved quarter (0 = not started). Always equals state.quarter. */
  completedQuarter: number;
  state: V2TeamState;
  /** Every resolved quarter's player input, in order (replayable source of truth). */
  inputs: V2PlayerQuarterInput[];
}

const TAG = '$v2n';

function encodeValue(_key: string, value: unknown): unknown {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { [TAG]: 'NaN' };
    if (value === Infinity) return { [TAG]: 'Infinity' };
    if (value === -Infinity) return { [TAG]: '-Infinity' };
    if (Object.is(value, -0)) return { [TAG]: '-0' };
  }
  return value;
}

function decodeValue(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === TAG) {
      switch (o[TAG]) {
        case 'NaN': return NaN;
        case 'Infinity': return Infinity;
        case '-Infinity': return -Infinity;
        case '-0': return -0;
      }
    }
  }
  return value;
}

/** Lossless JSON text for any engine value. */
export function encodeLossless(value: unknown): string {
  return JSON.stringify(value, encodeValue);
}

export function decodeLossless<T>(text: string): T {
  return JSON.parse(text, decodeValue) as T;
}

/** JSON-compatible (jsonb-safe) form of a snapshot: the lossless text parsed back as plain JSON. */
export function toStorable(snapshot: V2GameSnapshot): unknown {
  return JSON.parse(encodeLossless(snapshot));
}

/** Restore a snapshot from its stored (jsonb) form; validates the schema/version contract. */
export function fromStorable(stored: unknown): V2GameSnapshot {
  const snap = decodeLossless<V2GameSnapshot>(JSON.stringify(stored));
  assertSnapshotContract(snap);
  return snap;
}

export class V2SnapshotContractError extends Error {}

export function assertSnapshotContract(snap: V2GameSnapshot): void {
  if (!snap || typeof snap !== 'object') throw new V2SnapshotContractError('Snapshot missing');
  if (snap.schema !== V2_SNAPSHOT_SCHEMA) throw new V2SnapshotContractError(`Unknown snapshot schema ${String(snap.schema)}`);
  if (snap.schemaVersion !== V2_SNAPSHOT_SCHEMA_VERSION) throw new V2SnapshotContractError(`Unsupported snapshot schema version ${String(snap.schemaVersion)}`);
  if (snap.engineVersion !== V2_ENGINE_VERSION) throw new V2SnapshotContractError(`Snapshot was produced by engine ${String(snap.engineVersion)}, expected ${V2_ENGINE_VERSION}`);
  if (!snap.state || snap.state.quarter !== snap.completedQuarter) throw new V2SnapshotContractError('Snapshot quarter does not match its state');
  if (!Array.isArray(snap.inputs) || snap.inputs.length !== snap.completedQuarter) throw new V2SnapshotContractError('Snapshot input log does not match its completed quarter');
  snap.inputs.forEach((inp, i) => { if (inp.quarter !== i + 1) throw new V2SnapshotContractError(`Input log out of order at Q${i + 1}`); });
}

/** Exact structural equality (Object.is on numbers, so -0/NaN are compared exactly). */
export function deepEqualExact(a: unknown, b: unknown): boolean {
  return firstDifference(a, b) === null;
}

/**
 * Relative tolerance for comparing a replay with a stored game. JavaScript engines may differ by 1 ULP (~1e-16) in
 * transcendental functions (Math.tanh/pow/exp), so a game stored by one browser replays on another with tiny
 * floating-point differences. 1e-9 absorbs those while any material difference (tampering, divergence) still fails.
 */
export const V2_REPLAY_TOLERANCE = 1e-9;

function numbersMatch(a: unknown, b: unknown, relTol: number): boolean {
  if (Object.is(a, b)) return true;
  if (relTol > 0 && typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
    return Math.abs(a - b) <= relTol * Math.max(1, Math.abs(a), Math.abs(b));
  }
  return false;
}

/** First structural difference (null = equal). Numbers compare exactly unless a relative tolerance is given. */
export function firstDifference(a: unknown, b: unknown, path = '', relTol = 0): string | null {
  if (typeof a === 'number' || typeof b === 'number') return numbersMatch(a, b, relTol) ? null : `${path}: ${String(a)} ≠ ${String(b)}`;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b ? null : `${path}: ${String(a)} ≠ ${String(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array mismatch`;
  const ka = Object.keys(a as object).filter(k => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b as object).filter(k => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return `${path}: key count ${ka.length} ≠ ${kb.length}`;
  for (const k of ka) {
    if (!kb.includes(k)) return `${path}.${k}: missing`;
    const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, relTol);
    if (d) return d;
  }
  return null;
}
