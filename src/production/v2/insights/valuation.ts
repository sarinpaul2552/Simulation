/**
 * NEXLEARN SIMULATED SHARE PRICE (Batch 8 · Stage 3)
 *
 * A separate, versioned, deterministic presentation model. It READS recorded V2 engine state and never writes to it:
 * the frozen engine's own `stockPrice` field (constant 100) is ignored, the economics are unchanged and the terminal
 * score (engineV2Scoring) does not use this price.
 *
 * Model (version NXLN-VAL-1.0) — every quantity below is documented in docs/BATCH8_VALUATION_METHODOLOGY.md:
 *
 *   factor scores f_i(t) ∈ [0, 1] from recorded state
 *     growth         25%  0.75 × revenue vs Q4 2022 (−15% → +35%)  + 0.25 × quarter-on-quarter momentum (−6% → +6%)
 *     profitability  25%  operating margin (−5% → 30%)
 *     readiness      20%  0.5 × strategic fit (capabilities the chosen strategy relies on; before Q4 2023 the best
 *                         such average across strategies) + 0.5 × commercial traction (enterprise pipeline, AI adoption,
 *                         university pipeline, win rate). Readiness that is not being commercialised earns at most
 *                         half of this factor; AI capability counts only where the chosen strategy depends on it.
 *     retention      15%  consumer retention (75 → 95%), university renewals (80 → 97%), trust (40 → 90)
 *     financial      15%  0.6 × liquidity (cash $15M → $40M, no credit above the $40M comfort level, so hoarding
 *                         cash is not rewarded) + 0.4 × leverage (debt $0 → $120M)
 *
 *   fundamentals   F(t) = 1 + M × Σ w_i (f_i(t) − f_i(Q4 2022)),   M = 2.4   (so F = 1 at the starting position)
 *   distress       d(t) = 0.25 insolvent · 0.12 distressed · 0.05 liquidity warning · +0.04 covenant breach
 *   dilution       D(t) = ownership(t) ^ 0.6   (new shares reduce value per existing share; the cash raised is
 *                         partly credited through the financial-health factor)
 *   fair value     V(t) = $100 × F(t) × (1 − d(t)) × D(t)
 *   share price    P(0) = $100;  P(t) = P(t−1) + clamp(V(t) − P(t−1), ±20% of P(t−1)), floored at $5
 *
 * The valuation bridge decomposes P(t) − P(t−1) exactly into factor contributions, distress, dilution, catch-up of
 * earlier smoothing and the volatility limit. Contributions are calculated, never estimated, and always sum to the
 * total change.
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { V2_FINANCING_CALIBRATION } from '../../../simulation/engineV2Financing';
import { V2_DESTINATION_IDS, V2_DESTINATIONS, type V2DestinationId } from '../../../simulation/engineV2Destination';
import { startingCompany, type QuarterRecord } from './history';

export const VALUATION_VERSION = 'NXLN-VAL-1.0' as const;
export const STARTING_PRICE = 100;

export type ValuationFactorId = 'growth' | 'profitability' | 'readiness' | 'retention' | 'financial';

export interface ValuationConfig {
  version: string;
  weights: Record<ValuationFactorId, number>;
  multiplier: number;
  dilutionExponent: number;
  quarterlyCap: number;
  floor: number;
  distress: { insolvent: number; distressed: number; warning: number; covenant: number };
}

export const VALUATION_CONFIG: ValuationConfig = {
  version: VALUATION_VERSION,
  weights: { growth: 0.25, profitability: 0.25, readiness: 0.20, retention: 0.15, financial: 0.15 },
  multiplier: 2.4,
  dilutionExponent: 0.6,
  quarterlyCap: 0.20,
  floor: 5,
  distress: { insolvent: 0.25, distressed: 0.12, warning: 0.05, covenant: 0.04 },
};

export const FACTOR_INFO: Record<ValuationFactorId, { label: string; horizon: 'present' | 'expectations'; explain: string }> = {
  growth: { label: 'Revenue growth', horizon: 'present', explain: 'Revenue versus Q4 2022, plus the direction of the latest quarter.' },
  profitability: { label: 'Profitability', horizon: 'present', explain: 'Operating margin: how much of each revenue dollar is kept as operating profit.' },
  readiness: { label: 'Strategic readiness', horizon: 'expectations', explain: 'Investors’ view of future value: how established the strategy is and whether it is turning into pipeline, adoption and wins.' },
  retention: { label: 'Retention and trust', horizon: 'present', explain: 'Whether customers and universities stay, and whether they trust the product.' },
  financial: { label: 'Financial health', horizon: 'present', explain: 'Liquidity up to a comfortable cash level, and the burden of debt. Cash above the comfort level earns nothing extra.' },
};
export const FACTOR_IDS: ValuationFactorId[] = ['growth', 'profitability', 'readiness', 'retention', 'financial'];

const ramp = (x: number, lo: number, hi: number) => (x <= lo ? 0 : x >= hi ? 1 : (x - lo) / (hi - lo));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const BUCKET_CAP = { consumer: 'consumer', enterprise: 'enterprise', aiProduct: 'ai', people: 'talent', universityCredentials: 'credential' } as const;
type Bucket = keyof typeof BUCKET_CAP;

/** Average (0–1) of the capabilities a destination relies on (all five for a balanced strategy). */
export function alignedCapability(s: V2TeamState, dest: V2DestinationId): number {
  const aligned = (V2_DESTINATIONS[dest].alignedBuckets.length ? V2_DESTINATIONS[dest].alignedBuckets : Object.keys(BUCKET_CAP)) as Bucket[];
  return mean(aligned.map(b => Math.max(0, Math.min(1, s.capabilities[BUCKET_CAP[b]] / 100))));
}

/**
 * Strategic fit (0–1): the average of the capabilities the committed strategy relies on; before the Q4 2023
 * commitment, the best such average across the available strategies. One scale throughout, so committing does not by
 * itself move the score; time alone never raises it, and AI capability counts only where the strategy depends on it.
 */
export function strategicFit(s: V2TeamState): number {
  if (s.destination) return alignedCapability(s, s.destination.id);
  return Math.max(...V2_DESTINATION_IDS.map(id => alignedCapability(s, id)));
}

/** Factor scores (0–1) for a recorded state. `prev` is the state one quarter earlier (momentum); omit at Q4 2022. */
export function factorScores(s: V2TeamState, prev?: V2TeamState): Record<ValuationFactorId, number> {
  const s0 = startingCompany();
  const L = V2_FINANCING_CALIBRATION.liquidity;
  const growthLevel = ramp(s.revenue / s0.revenue - 1, -0.15, 0.35);
  const qoq = prev && prev.revenue > 0 ? s.revenue / prev.revenue - 1 : 0;
  const momentum = ramp(qoq, -0.06, 0.06);
  const margin = s.revenue > 0 ? s.operatingProfit / s.revenue : -1;
  const fit = strategicFit(s);
  const c = s.commercial;
  const traction = mean([ramp(c.enterprisePipeline, 0, 200), ramp(c.aiAdoptionIndex, 0, 60), ramp(c.universityPipeline, 0, 60), ramp(c.enterpriseWinRate, 10, 45)]);
  return {
    growth: 0.75 * growthLevel + 0.25 * momentum,
    profitability: ramp(margin, -0.05, 0.30),
    readiness: 0.5 * fit + 0.5 * traction,
    retention: mean([ramp(c.consumerRetention, 75, 95), ramp(c.universityRenewalRate, 80, 97), ramp(s.trust, 40, 90)]),
    financial: 0.6 * ramp(s.cash, L.minimumOperatingCash, L.comfortableCash) + 0.4 * (1 - ramp(s.financing.debt, 0, 120)),
  };
}

export function distressDiscount(s: V2TeamState, cfg = VALUATION_CONFIG): { value: number; reason: string | null } {
  const st = s.solvency.status;
  let v = 0; const why: string[] = [];
  if (st === 'insolvent') { v += cfg.distress.insolvent; why.push('insolvent'); }
  else if (s.solvency.distressed) { v += cfg.distress.distressed; why.push('financially distressed'); }
  else if (st === 'warning') { v += cfg.distress.warning; why.push('liquidity warning'); }
  const last = s.solvency.history[s.solvency.history.length - 1];
  if (last?.covenantBreach) { v += cfg.distress.covenant; why.push('debt covenant breached'); }
  return { value: v, reason: why.length ? why.join(', ') : null };
}

export interface BridgeLine { id: ValuationFactorId | 'distress' | 'dilution' | 'catchup' | 'limit'; label: string; amount: number; explain: string }

export interface PricePoint {
  quarter: number;
  price: number;
  fairValue: number;
  factors: Record<ValuationFactorId, number>;
  fundamentals: number;
  distress: number;
  distressReason: string | null;
  dilution: number;
  ownership: number;
  /** P(t) − P(t−1); 0 at Q4 2022. */
  change: number;
  changePct: number;
  sinceStart: number;
  sinceStartPct: number;
  /** Exact decomposition of `change` (empty at Q4 2022). */
  bridge: BridgeLine[];
  /** Share of the fair value attributable to expectations (readiness) vs present performance, relative to start. */
  presentContribution: number;
  expectationsContribution: number;
}

export interface ValuationSeries { version: string; config: ValuationConfig; points: PricePoint[] }

/** Deterministic price path from the starting position through each recorded quarter. Pure: same states → same prices. */
export function valuationFromStates(states: V2TeamState[], cfg = VALUATION_CONFIG): ValuationSeries {
  const s0 = startingCompany();
  const all = [s0, ...states];
  const f0 = factorScores(s0);
  const W = cfg.weights;
  const points: PricePoint[] = [];
  let prevP = STARTING_PRICE, prevV = STARTING_PRICE, prevF = 1, prevD = 1, prevDis = 0;
  let prevFactors = f0;
  for (let t = 0; t < all.length; t++) {
    const s = all[t];
    const f = t === 0 ? f0 : factorScores(s, all[t - 1]);
    const F = 1 + cfg.multiplier * FACTOR_IDS.reduce((a, k) => a + W[k] * (f[k] - f0[k]), 0);
    const dis = distressDiscount(s, cfg);
    const D = Math.pow(Math.max(0, Math.min(1, s.financing.ownership)), cfg.dilutionExponent);
    const V = STARTING_PRICE * F * (1 - dis.value) * D;
    let P: number;
    const bridge: BridgeLine[] = [];
    if (t === 0) {
      P = STARTING_PRICE;
    } else {
      const G0 = (1 - prevDis) * prevD;
      for (const k of FACTOR_IDS) {
        bridge.push({ id: k, label: FACTOR_INFO[k].label, amount: STARTING_PRICE * cfg.multiplier * W[k] * (f[k] - prevFactors[k]) * G0, explain: FACTOR_INFO[k].explain });
      }
      bridge.push({ id: 'distress', label: 'Distress discount', amount: STARTING_PRICE * F * prevD * (prevDis - dis.value), explain: dis.reason ? `Investors discount the shares while the company is ${dis.reason}.` : 'Change in the discount investors apply for financial distress.' });
      bridge.push({ id: 'dilution', label: 'Dilution from new shares', amount: STARTING_PRICE * F * (1 - dis.value) * (D - prevD), explain: 'Issuing equity spreads the company’s value over more shares.' });
      const gap = prevV - prevP;
      bridge.push({ id: 'catchup', label: 'Catch-up from earlier quarters', amount: gap, explain: 'Part of an earlier move that the quarterly limit held back.' });
      const lim = cfg.quarterlyCap * prevP;
      const target = V - prevP;
      const step = Math.max(-lim, Math.min(lim, target));
      P = Math.max(cfg.floor, prevP + step);
      bridge.push({ id: 'limit', label: 'Quarterly volatility limit', amount: P - prevP - target, explain: 'The price moves at most 20% in a quarter; the rest carries into later quarters.' });
    }
    // contributions relative to the starting position, for the present-vs-expectations split
    const rel = (k: ValuationFactorId) => STARTING_PRICE * cfg.multiplier * W[k] * (f[k] - f0[k]);
    points.push({
      quarter: t, price: P, fairValue: V, factors: f, fundamentals: F, distress: dis.value, distressReason: dis.reason, dilution: D,
      ownership: s.financing.ownership, change: t === 0 ? 0 : P - prevP, changePct: t === 0 ? 0 : (P - prevP) / prevP,
      sinceStart: P - STARTING_PRICE, sinceStartPct: (P - STARTING_PRICE) / STARTING_PRICE,
      bridge,
      presentContribution: (['growth', 'profitability', 'retention', 'financial'] as ValuationFactorId[]).reduce((a, k) => a + rel(k), 0),
      expectationsContribution: rel('readiness'),
    });
    prevP = P; prevV = V; prevF = F; prevD = D; prevDis = dis.value; prevFactors = f;
  }
  void prevF;
  return { version: cfg.version, config: cfg, points };
}

export function valuationSeries(history: QuarterRecord[], cfg = VALUATION_CONFIG): ValuationSeries {
  return valuationFromStates(history.map(h => h.after), cfg);
}

/** Round bridge lines to cents so the displayed lines add up exactly to the displayed total (largest remainder). */
export function roundedBridge(point: PricePoint): { lines: (BridgeLine & { shown: number })[]; total: number } {
  const total = Math.round(point.change * 100);
  const raw = point.bridge.map(b => b.amount * 100);
  const floors = raw.map(x => Math.floor(x));
  let rem = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  const shown = [...floors];
  for (let k = 0; rem > 0 && k < order.length; k++, rem--) shown[order[k].i] += 1;
  for (let k = order.length - 1; rem < 0 && k >= 0; k--, rem++) shown[order[k].i] -= 1;
  return { lines: point.bridge.map((b, i) => ({ ...b, shown: shown[i] / 100 })), total: total / 100 };
}

export const fmtPrice = (x: number) => `$${x.toFixed(2)}`;
export const fmtPriceDelta = (x: number) => (Math.abs(x) < 0.005 ? '$0.00' : `${x > 0 ? '+' : '−'}$${Math.abs(x).toFixed(2)}`);
export const fmtPctDelta = (x: number) => (Math.abs(x) < 0.0005 ? '0.0%' : `${x > 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`);

/** The largest calculated drivers of a quarter's move, for one-line explanations. */
export function priceDrivers(point: PricePoint, n = 2): BridgeLine[] {
  return [...point.bridge].filter(b => Math.abs(b.amount) >= 0.05).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, n);
}
