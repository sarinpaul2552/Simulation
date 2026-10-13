/**
 * Optional allocation prefill (Batch 10A). Copies only the five investment buckets from the previous quarter's
 * committed input, scaled down proportionally if they exceed this quarter's budget. It never copies event
 * decisions, financing or management actions, never runs automatically, and never overwrites an allocation the
 * team has started: the UI offers it only while nothing is invested.
 */
import type { V2PlayerQuarterInput } from '../types';
import { BUCKETS } from './consequences';

type Allocation = V2PlayerQuarterInput['allocation'];

export const investedTotal = (a: Allocation) => BUCKETS.reduce((t, b) => t + (a[b] || 0), 0);

/** True when the prefill offer may be shown: a previous allocation exists and the current draft invests nothing. */
export function canPrefill(current: Allocation, previous: Allocation | undefined): boolean {
  return !!previous && investedTotal(previous) > 0 && investedTotal(current) === 0;
}

/**
 * The most a prefilled plan may invest: this quarter's envelope, further limited by any investment cap attached to
 * the chosen decision (Q8 "stabilize and restructure" caps investment below the envelope).
 */
export function prefillLimit(envelope: number, investmentCap?: number): number {
  return investmentCap !== undefined && Number.isFinite(investmentCap) ? Math.max(0, Math.min(envelope, investmentCap)) : envelope;
}

/**
 * The previous buckets, fitted to the envelope and any investment cap (rounded down to $0.5M steps), with the rest of
 * the envelope kept as cash. This only builds an offer: it is applied when the team presses the button, and never
 * changes a plan the team has already entered.
 */
export function prefillAllocation(previous: Allocation, envelope: number, investmentCap?: number): Allocation {
  const limit = prefillLimit(envelope, investmentCap);
  const total = investedTotal(previous);
  const scale = total > limit ? limit / total : 1;
  const out = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0 } as Allocation;
  for (const b of BUCKETS) out[b] = Math.floor(((previous[b] || 0) * scale) * 2 + 1e-9) / 2;
  out.cashReserve = Math.round(Math.max(0, envelope - investedTotal(out)) * 100) / 100;
  return out;
}
