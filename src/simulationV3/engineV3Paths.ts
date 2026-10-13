/**
 * NEXLEARN V3 — authored market paths (Batch 10D).
 *
 * One path per classroom session, chosen by the facilitator before the session starts and identical for every team.
 * Path A (AI Acceleration) keeps the original V2 arc. Paths B (Enterprise Transformation) and C (Economic Pressure) are
 * authored in `engineV3PathB.ts` / `engineV3PathC.ts`.
 */
import { V2_SCENARIO_ARC, type V2ScenarioQuarter } from './engineV3Scenario';
import { PATH_B_ARC } from './engineV3PathB';
import { PATH_C_ARC } from './engineV3PathC';

export type V3MarketPathId = 'A' | 'B' | 'C';
export const V3_MARKET_PATH_IDS: V3MarketPathId[] = ['A', 'B', 'C'];

const PATHS: Record<V3MarketPathId, V2ScenarioQuarter[]> = {
  A: V2_SCENARIO_ARC,
  B: PATH_B_ARC,
  C: PATH_C_ARC,
};

export function pathArc(id: V3MarketPathId): V2ScenarioQuarter[] {
  const arc = PATHS[id];
  if (!arc) throw new Error(`Unknown market path ${String(id)}`);
  return arc;
}

/** Laboratory/test hook: replace a path's arc (used while authoring); production never calls it. */
export function registerPath(id: V3MarketPathId, arc: V2ScenarioQuarter[]): void {
  PATHS[id] = arc;
}
