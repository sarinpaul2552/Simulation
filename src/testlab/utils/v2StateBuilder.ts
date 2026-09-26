import {
  V2Allocation,
  V2TeamState,
  V2Consequence,
  getV2Baseline,
  applyV2Consequence,
} from '../../simulation/engineV2';
import type { Allocation } from '../../simulation/engine';

/**
 * V2 STATE BUILDER (Phase 2A)
 *
 * Builds and advances V2TeamState for Test Lab. Delegates all accounting to
 * engineV2 — no ledger math is duplicated here. Financial values are NEVER
 * clamped (negative cash must stay observable).
 */

export function getV2StartingState(): V2TeamState {
  return getV2Baseline();
}

export function applyV2(state: V2TeamState, consequence: V2Consequence): V2TeamState {
  return applyV2Consequence(state, consequence);
}

/**
 * Map a V1-shaped Test Lab allocation onto the six V2 buckets so existing
 * presets can drive V2 runs. V1-only categories (customerSuccess, marketing)
 * are folded into Enterprise (CS) and Consumer (marketing) respectively; the
 * existing presets set both to 0.
 */
export function v1AllocationToV2(a: Allocation): V2Allocation {
  return {
    consumer: a.consumerGrowth + (a.marketing || 0),
    enterprise: a.enterpriseSales + (a.customerSuccess || 0),
    aiProduct: a.aiProduct,
    people: a.instructorPeople,
    universityCredentials: a.universityCredential,
    cashReserve: a.cash,
  };
}

export function zeroV2Allocation(envelope: number): V2Allocation {
  return { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: envelope };
}
