/**
 * BUSINESS DASHBOARD (Batch 7 · 7B)
 *
 * Every figure comes from recorded V2 state. Health indicators are DASHBOARD INTERPRETATIONS — simple, documented
 * blends of existing state used only to orient students. They are not engine scores, never feed economics and are
 * not the terminal score (engineV2Scoring is the only evaluation).
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { summarizeV2Financials } from '../../../simulation/engineV2';
import { V2_FINANCING_CALIBRATION } from '../../../simulation/engineV2Financing';
import { V2_FINAL_CALIBRATION } from '../../../simulation/engineV2Final';
import { V2_DESTINATION_IDS, destinationReadiness, destinationStrength, V2_DESTINATIONS } from '../../../simulation/engineV2Destination';
import type { QuarterRecord } from './history';
import { startingCompany } from './history';

export type Tone = 'good' | 'bad' | 'caution' | 'neutral';
export type Direction = 'up' | 'down' | 'flat';

export interface KpiCard {
  id: 'revenue' | 'operatingProfit' | 'margin' | 'cash' | 'debt' | 'liquidity';
  label: string;
  explain: string;
  value: number | null;
  display: string;
  previous: number | null;
  previousDisplay: string;
  delta: number | null;
  deltaDisplay: string;
  pct: number | null;
  direction: Direction;
  tone: Tone;
  vsStart: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const fmtM = (x: number, d = 1) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(d)}M`;
const fmtPct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const signedM = (x: number) => (Math.abs(x) < 0.05 ? '±$0.0M' : `${x > 0 ? '+' : '−'}$${Math.abs(x).toFixed(1)}M`);
const signedPts = (x: number) => (Math.abs(x) < 0.0005 ? '±0.0 pts' : `${x > 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)} pts`);
const dir = (d: number, eps: number): Direction => (d > eps ? 'up' : d < -eps ? 'down' : 'flat');
const marginOf = (s: Pick<V2TeamState, 'revenue' | 'operatingProfit'>) => (s.revenue > 0 ? s.operatingProfit / s.revenue : 0);

const LIQ_RANK: Record<string, number> = { healthy: 3, watch: 2, warning: 1, insolvent: 0 };
const LIQ_LABEL: Record<string, string> = { healthy: 'Healthy', watch: 'Watch', warning: 'Warning', insolvent: 'Insolvent' };

/**
 * Financial cards for a completed quarter: current vs previous quarter (Q0 = the real starting company) and vs start.
 * Colour follows business meaning, not arithmetic sign: more debt is "caution", not "good".
 */
export function financialCards(history: QuarterRecord[], quarter: number): KpiCard[] {
  const rec = history[quarter - 1];
  const s = rec.after;
  const p = quarter > 1 ? history[quarter - 2].after : startingCompany();
  const q0 = startingCompany();
  const card = (id: KpiCard['id'], label: string, explain: string, cur: number, prev: number, start: number, fmt: (x: number) => string, dfmt: (x: number) => string, good: 'higher' | 'lower' | 'context', eps = 0.05, pctOk = true): KpiCard => {
    const delta = cur - prev;
    const d = dir(delta, eps);
    const tone: Tone = d === 'flat' ? 'neutral' : good === 'context' ? 'caution' : (good === 'higher') === (d === 'up') ? 'good' : 'bad';
    return {
      id, label, explain, value: cur, display: fmt(cur), previous: prev, previousDisplay: fmt(prev), delta, deltaDisplay: dfmt(delta),
      pct: pctOk && Math.abs(prev) > 1e-9 ? delta / Math.abs(prev) : null, direction: d, tone,
      vsStart: `${dfmt(cur - start)} vs start`,
    };
  };
  const liq = s.solvency.status, liqPrev = quarter > 1 ? p.solvency.status : 'healthy';
  const runway = summarizeV2Financials(rec.consequence.ledger).runway;
  const liqDelta = LIQ_RANK[liq] - LIQ_RANK[liqPrev];
  return [
    card('revenue', 'Revenue', 'Money earned from customers this quarter.', s.revenue, p.revenue, q0.revenue, fmtM, signedM, 'higher'),
    card('operatingProfit', 'Operating profit', 'Revenue minus the cost of running the business (before strategic investment).', s.operatingProfit, p.operatingProfit, q0.operatingProfit, fmtM, signedM, 'higher'),
    card('margin', 'Operating margin', 'How many cents of every dollar of revenue are kept as operating profit.', marginOf(s), marginOf(p), marginOf(q0), x => fmtPct(x), signedPts, 'higher', 0.0005, false),
    card('cash', 'Cash', 'Money in the bank at the end of the quarter.', s.cash, p.cash, q0.cash, fmtM, signedM, 'higher'),
    card('debt', 'Debt', 'Money borrowed that must be repaid with interest. More debt adds risk, even when it funds growth.', s.financing.debt, p.financing.debt, q0.financing.debt, fmtM, signedM, 'context'),
    {
      id: 'liquidity', label: 'Liquidity', explain: `Can the company pay its bills? Below ${fmtM(V2_FINANCING_CALIBRATION.liquidity.minimumOperatingCash, 0)} cash the company is insolvent.`,
      value: null, display: `${LIQ_LABEL[liq]}${s.solvency.distressed ? ' · distressed' : ''}`, previous: null, previousDisplay: LIQ_LABEL[liqPrev],
      delta: null, deltaDisplay: runway.quarters === null ? 'Self-funding' : (runway.quarters > 8 ? 'More than 8 quarters of runway' : `${runway.quarters.toFixed(1)} quarters of runway`),
      pct: null, direction: liqDelta > 0 ? 'up' : liqDelta < 0 ? 'down' : 'flat', tone: liq === 'healthy' && !s.solvency.distressed ? 'good' : liq === 'insolvent' || s.solvency.distressed ? 'bad' : 'caution',
      vsStart: `Started: Healthy`,
    },
  ];
}

export interface HealthIndicator {
  id: 'financial' | 'customer' | 'product' | 'organization' | 'strategy';
  label: string;
  score: number;
  level: 'Strong' | 'Fair' | 'Weak';
  summary: string;
  drivers: { label: string; value: string }[];
  /** Documented formula (shown in MBA mode and in Notion). */
  formula: string;
}

const level = (x: number): HealthIndicator['level'] => (x >= 67 ? 'Strong' : x >= 40 ? 'Fair' : 'Weak');
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Dashboard interpretation of the company's health (0–100 each). Not an engine score. */
export function healthIndicators(s: V2TeamState): HealthIndicator[] {
  const K = V2_FINANCING_CALIBRATION.liquidity;
  const c = s.commercial;
  const margin = marginOf(s);
  const fin = 100 * (0.4 * clamp01(s.cash / K.comfortableCash) + 0.4 * clamp01(margin / 0.2) + 0.2 * clamp01(1 - s.financing.debt / 100));
  const cust = 100 * mean([clamp01((c.consumerRetention - 75) / 20), clamp01((140 - c.consumerCacIndex) / 80), clamp01(c.enterprisePipeline / 160), clamp01((c.universityRenewalRate - 80) / 15)]);
  const prod = 100 * mean([clamp01(s.productQuality / 100), clamp01(c.aiCommercialReadiness / 100)]);
  const loadRatio = s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 1;
  const org = 100 * mean([clamp01(s.culture / 100), clamp01(s.capabilities.talent / 100), clamp01(s.organizationalCapacity / 100), clamp01(1.5 - loadRatio)]);
  let strat: number; let stratSummary: string; let stratDrivers: HealthIndicator['drivers'];
  if (s.destination) {
    const str = destinationStrength(s.destination, s.quarter + 1);
    // Batch 7.5: strategy strength ramps to 100% with time alone, so readiness also weighs the capabilities the
    // strategy actually depends on (its aligned buckets; all five for a balanced strategy).
    const BUCKET_CAP = { consumer: 'consumer', enterprise: 'enterprise', aiProduct: 'ai', people: 'talent', universityCredentials: 'credential' } as const;
    const aligned = V2_DESTINATIONS[s.destination.id].alignedBuckets.length ? V2_DESTINATIONS[s.destination.id].alignedBuckets : (Object.keys(BUCKET_CAP) as (keyof typeof BUCKET_CAP)[]);
    const capFit = mean(aligned.map(b => clamp01(s.capabilities[BUCKET_CAP[b as keyof typeof BUCKET_CAP]] / 100)));
    strat = 100 * (0.5 * str + 0.5 * capFit);
    stratSummary = `${V2_DESTINATIONS[s.destination.id].name}: strategy ${(str * 100).toFixed(0)}% established; the capabilities it relies on average ${(capFit * 100).toFixed(0)}/100.`;
    stratDrivers = [{ label: 'Readiness when committed', value: `${(s.destination.readinessAtCommit * 100).toFixed(0)}%` }, { label: 'Strategy established', value: `${(str * 100).toFixed(0)}%` }, { label: 'Key capabilities', value: `${(capFit * 100).toFixed(0)}/100` }];
  } else {
    const best = V2_DESTINATION_IDS.map(id => ({ id, r: destinationReadiness(id, s).readiness })).sort((a, b) => b.r - a.r)[0];
    strat = 100 * best.r;
    stratSummary = 'No strategy committed yet. Score shows readiness for the best-fitting option.';
    stratDrivers = [{ label: 'Best readiness', value: `${(best.r * 100).toFixed(0)}%` }];
  }
  return [
    { id: 'financial', label: 'Financial health', score: fin, level: level(fin), summary: `Cash ${fmtM(s.cash)}, margin ${fmtPct(margin)}, debt ${fmtM(s.financing.debt)}.`,
      drivers: [{ label: 'Cash', value: fmtM(s.cash) }, { label: 'Operating margin', value: fmtPct(margin) }, { label: 'Debt', value: fmtM(s.financing.debt) }],
      formula: '40% cash ÷ $40M comfort level + 40% margin ÷ 20% + 20% (1 − debt ÷ $100M), each capped 0–1' },
    { id: 'customer', label: 'Customer health', score: cust, level: level(cust), summary: `Retention ${c.consumerRetention.toFixed(1)}%, pipeline ${fmtM(c.enterprisePipeline)}.`,
      drivers: [{ label: 'Consumer retention', value: `${c.consumerRetention.toFixed(1)}%` }, { label: 'Cost to win a customer (index)', value: c.consumerCacIndex.toFixed(0) }, { label: 'Enterprise pipeline', value: fmtM(c.enterprisePipeline) }, { label: 'University renewals', value: `${c.universityRenewalRate.toFixed(1)}%` }],
      formula: 'Average of retention (75→95%), CAC index (140→60), enterprise pipeline (0→$160M), university renewal (80→95%)' },
    { id: 'product', label: 'Product strength', score: prod, level: level(prod), summary: `Quality ${s.productQuality.toFixed(0)}, AI readiness ${c.aiCommercialReadiness.toFixed(0)}.`,
      drivers: [{ label: 'Product quality', value: s.productQuality.toFixed(0) }, { label: 'AI readiness', value: c.aiCommercialReadiness.toFixed(0) }],
      formula: 'Average of Product Quality and AI commercial readiness (0–100)' },
    { id: 'organization', label: 'Organizational health', score: org, level: level(org), summary: `Culture ${s.culture.toFixed(0)}, talent ${s.capabilities.talent.toFixed(0)}, load ${(loadRatio * 100).toFixed(0)}% of capacity.`,
      drivers: [{ label: 'Culture', value: s.culture.toFixed(0) }, { label: 'Talent', value: s.capabilities.talent.toFixed(0) }, { label: 'Capacity', value: s.organizationalCapacity.toFixed(0) }, { label: 'Change load vs capacity', value: `${(loadRatio * 100).toFixed(0)}%` }],
      formula: 'Average of culture, talent and capacity (÷100) and load headroom (1.5 − load ÷ capacity), each capped 0–1' },
    { id: 'strategy', label: 'Strategic readiness', score: strat, level: level(strat), summary: stratSummary, drivers: stratDrivers,
      formula: 'Before the Q4 2023 commitment: best destination readiness. After: 50% strategy established (readiness ramping 25 pts/quarter, minus focus dilution) + 50% average of the capabilities the strategy relies on (÷100)' },
  ];
}

export interface TrendPoint { quarter: number; revenue: number; operatingProfit: number; cash: number; segments: { consumer: number; enterprise: number; university: number; aiNative: number } }

/** Q0 (starting company) through the last completed quarter — recorded values only. */
export function trendSeries(history: QuarterRecord[]): TrendPoint[] {
  const s0 = startingCompany();
  return [
    { quarter: 0, revenue: s0.revenue, operatingProfit: s0.operatingProfit, cash: s0.cash, segments: { ...s0.segmentRevenue } },
    ...history.map(h => ({ quarter: h.quarter, revenue: h.after.revenue, operatingProfit: h.after.operatingProfit, cash: h.after.cash, segments: { ...h.after.segmentRevenue } })),
  ];
}

export interface Benchmark { label: string; source: 'start' | 'previous' | 'target'; metric: string; current: string; reference: string; met?: boolean }

/** Benchmarks: the starting company, the previous quarter and documented engine thresholds. Never industry data. */
export function benchmarks(history: QuarterRecord[], quarter: number): Benchmark[] {
  const s = history[quarter - 1].after;
  const L = V2_FINANCING_CALIBRATION.liquidity, S = V2_FINAL_CALIBRATION.scale;
  const margin = marginOf(s);
  return [
    { label: 'Minimum operating cash (insolvency line)', source: 'target', metric: 'Cash', current: fmtM(s.cash), reference: fmtM(L.minimumOperatingCash, 0), met: s.cash >= L.minimumOperatingCash },
    { label: 'Comfortable cash level', source: 'target', metric: 'Cash', current: fmtM(s.cash), reference: fmtM(L.comfortableCash, 0), met: s.cash >= L.comfortableCash },
    { label: 'Final-quarter "scale independently" option: operating margin', source: 'target', metric: 'Margin', current: fmtPct(margin), reference: fmtPct(S.minMargin, 0), met: margin >= S.minMargin },
    { label: 'Final-quarter "scale independently" option: execution', source: 'target', metric: 'Execution', current: s.capabilities.execution.toFixed(0), reference: String(S.minExecution), met: s.capabilities.execution >= S.minExecution },
    { label: 'Final-quarter "scale independently" option: organizational capacity', source: 'target', metric: 'Capacity', current: s.organizationalCapacity.toFixed(0), reference: String(S.minCapacity), met: s.organizationalCapacity >= S.minCapacity },
  ];
}
