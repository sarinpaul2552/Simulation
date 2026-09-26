import { V2Allocation, V2TeamState, V2MarketConditions, getV2Baseline, getNeutralMarket } from '../../simulation/engineV2';
import { V2QuarterRecord, runV2Quarter } from './v2Diagnostics';

/**
 * PHASE 3C — ECONOMIC STRESS AUDIT (Test Lab only)
 *
 * Runs the integrated V2 economy (segment revenue + modelled cost) under stress and
 * applies automated anomaly detectors. No new mechanics; no events; no floors.
 */

export interface V2StressCase {
  id: string;
  name: string;
  quarters: number;
  market: 'competitive' | 'static-neutral';
  opening: () => V2TeamState;
  /** Allocation per quarter (envelope $30M). */
  allocation: (q: number) => V2Allocation;
}

export interface V2Anomaly {
  detector: string;
  quarter: number;
  detail: string;
}

export interface V2StressResult {
  stress: V2StressCase;
  quarters: V2QuarterRecord[];
  anomalies: V2Anomaly[];
  firstNegativeCashQuarter: number | null;
  summary: {
    q8?: StressSnapshot;
    final: StressSnapshot;
    maxQuarterlyRevenueGrowth: number;
    minMargin: number;
    maxMargin: number;
  };
}

export interface StressSnapshot {
  quarter: number;
  revenue: number;
  segments: { consumer: number; enterprise: number; university: number; aiNative: number };
  operatingCost: number;
  operatingProfit: number;
  margin: number;
  cash: number;
  commitments: number;
  fixed: number;
}

const a = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});
const constant = (x: V2Allocation) => () => x;
const withCaps = (p: Partial<V2TeamState['capabilities']>, extra: Partial<V2TeamState> = {}) => () => {
  const b = getV2Baseline();
  return { ...b, ...extra, capabilities: { ...b.capabilities, ...p } };
};

const ROTATION: (keyof V2Allocation)[] = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'];

export const STRATEGIES: Record<string, V2Allocation> = {
  cash100: a({ cashReserve: 30 }),
  consumer100: a({ consumer: 30 }),
  enterprise100: a({ enterprise: 30 }),
  ai100: a({ aiProduct: 30 }),
  people100: a({ people: 30 }),
  university100: a({ universityCredentials: 30 }),
  balanced: a({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 }),
  broad6x5: a({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 }),
  consumerAi: a({ consumer: 15, aiProduct: 15 }),
  enterpriseAi: a({ enterprise: 15, aiProduct: 15 }),
};

export const V2_STRESS_CASES: V2StressCase[] = [
  { id: 'zero-investment', name: 'Zero investment (Cash100), 16q', quarters: 16, market: 'competitive', opening: getV2Baseline, allocation: constant(STRATEGIES.cash100) },
  { id: 'max-investment-broad', name: '$30M/qtr maximum, broad 6×5, 16q', quarters: 16, market: 'competitive', opening: getV2Baseline, allocation: constant(STRATEGIES.broad6x5) },
  ...(['consumer100', 'enterprise100', 'ai100', 'people100', 'university100'] as const).map(id => ({
    id: `concentrated-${id}`, name: `Concentrated ${id}, 16q`, quarters: 16, market: 'competitive' as const, opening: getV2Baseline, allocation: constant(STRATEGIES[id]),
  })),
  { id: 'balanced-16', name: 'Balanced (with $5M reserve), 16q', quarters: 16, market: 'competitive', opening: getV2Baseline, allocation: constant(STRATEGIES.balanced) },
  { id: 'consumer-ai-16', name: 'Consumer + AI, 16q', quarters: 16, market: 'competitive', opening: getV2Baseline, allocation: constant(STRATEGIES.consumerAi) },
  { id: 'enterprise-ai-16', name: 'Enterprise + AI, 16q', quarters: 16, market: 'competitive', opening: getV2Baseline, allocation: constant(STRATEGIES.enterpriseAi) },
  {
    id: 'switching', name: 'Switching: 100% into a different bucket each quarter, 16q', quarters: 16, market: 'competitive', opening: getV2Baseline,
    allocation: q => a({ [ROTATION[(q - 1) % ROTATION.length]]: 30 }),
  },
  { id: 'low-execution', name: 'Low Execution (30), Balanced, 16q', quarters: 16, market: 'competitive', opening: withCaps({ execution: 30 }), allocation: constant(STRATEGIES.balanced) },
  { id: 'low-trust', name: 'Low Trust (40), Balanced, 16q', quarters: 16, market: 'competitive', opening: withCaps({}, { trust: 40 }), allocation: constant(STRATEGIES.balanced) },
  { id: 'low-talent', name: 'Low Talent (30), AI100, 16q', quarters: 16, market: 'competitive', opening: withCaps({ talent: 30 }), allocation: constant(STRATEGIES.ai100) },
  { id: 'low-cs', name: 'Low Customer Success (10), Enterprise100, 16q', quarters: 16, market: 'competitive', opening: withCaps({ customerSuccess: 10 }), allocation: constant(STRATEGIES.enterprise100) },
  {
    id: 'saturation', name: 'Capability saturation: every capability 100, PQ/Trust 95, Balanced, 16q', quarters: 16, market: 'competitive',
    opening: withCaps({ consumer: 100, enterprise: 100, ai: 100, talent: 100, credential: 100, customerSuccess: 100, execution: 100 }, { productQuality: 95, trust: 95 }),
    allocation: constant(STRATEGIES.balanced),
  },
  { id: 'high-capacity', name: 'High Org Capacity (100), broad 6×5, 16q', quarters: 16, market: 'competitive', opening: withCaps({}, { organizationalCapacity: 100 }), allocation: constant(STRATEGIES.broad6x5) },
  { id: 'low-capacity', name: 'Low Org Capacity (30), broad 6×5, 16q', quarters: 16, market: 'competitive', opening: withCaps({}, { organizationalCapacity: 30 }), allocation: constant(STRATEGIES.broad6x5) },
  ...Object.keys(STRATEGIES).map(id => ({
    id: `extreme40-${id}`, name: `40-quarter extreme stability: ${id} (competitive)`, quarters: 40, market: 'competitive' as const,
    opening: getV2Baseline, allocation: constant(STRATEGIES[id]),
  })),
  ...(['consumer100', 'ai100', 'consumerAi', 'cash100'] as const).map(id => ({
    id: `extreme40-static-${id}`, name: `40-quarter extreme stability: ${id} (static neutral)`, quarters: 40, market: 'static-neutral' as const,
    opening: getV2Baseline, allocation: constant(STRATEGIES[id]),
  })),
];

// ============ DETECTORS ============

export const V2_AUDIT_THRESHOLDS = {
  /** Revenue growth faster than this in a single quarter is treated as runaway. */
  maxQuarterlyRevenueGrowth: 0.08,
  /** Total revenue beyond this multiple of the $200M baseline is flagged for inspection. */
  maxRevenueMultiple: 2.0,
  /** Operating margin plausibility band. */
  marginBand: [-0.25, 0.4] as const,
  /**
   * From a revenue peak, cost may fall by at most this share of the revenue decline (excluding expired
   * commitments). Fully proportional would be ≈0.85 (cost/revenue); variable (≤0.255) + slow semi-fixed
   * unwind (≤0.20) stays below 0.6. Calibration (3C): 0.35 → 0.6 after the semi-fixed ratchet change.
   */
  maxCostDeclinePerRevenueDecline: 0.6,
};

function marketFor(c: V2StressCase['market']): V2MarketConditions {
  const m = getNeutralMarket();
  return c === 'static-neutral' ? { ...m, competitorProgress: { consumer: 0, enterprise: 0, credential: 0 } } : m;
}

function snapshot(rec: V2QuarterRecord): StressSnapshot {
  const L = rec.consequence.ledger;
  return {
    quarter: rec.quarter,
    revenue: L.revenue,
    segments: { ...rec.consequence.revenue.closing.segments },
    operatingCost: L.operatingCost,
    operatingProfit: L.operatingProfit,
    margin: L.operatingProfit / L.revenue,
    cash: L.closingCash,
    commitments: rec.consequence.cost.commitments.total,
    fixed: rec.consequence.cost.fixedSemiFixed,
  };
}

export function runV2StressCase(stress: V2StressCase): V2StressResult {
  const T = V2_AUDIT_THRESHOLDS;
  const market = marketFor(stress.market);
  let state = stress.opening();
  const quarters: V2QuarterRecord[] = [];
  const anomalies: V2Anomaly[] = [];
  let firstNegativeCashQuarter: number | null = null;
  let maxGrowth = -Infinity;
  let minMargin = Infinity;
  let maxMargin = -Infinity;
  let peak = { revenue: -Infinity, cost: 0, commitments: 0 };

  for (let q = 1; q <= stress.quarters; q++) {
    const rec = runV2Quarter(state, q, stress.allocation(q), 30, undefined, undefined, market, { revenueSource: 'segment', costSource: 'modelled' });
    const C = rec.consequence;
    const L = C.ledger;
    const R = C.revenue;

    // 1. Every engine invariant (identity, reconstruction, double counting, bounds, state links)
    for (const chk of rec.checks.filter(c => !c.passed)) anomalies.push({ detector: `invariant:${chk.id}`, quarter: q, detail: chk.details });

    // 2. NaN / Infinity / negative nonsense
    const nums = [L.revenue, L.operatingCost, L.operatingProfit, L.closingCash, ...Object.values(R.closing.segments), C.cost.totalOperatingCost];
    if (!nums.every(Number.isFinite)) anomalies.push({ detector: 'non-finite', quarter: q, detail: nums.join(',') });
    if (L.revenue < 0 || L.operatingCost < 0 || Object.values(R.closing.segments).some(v => v < 0)) {
      anomalies.push({ detector: 'negative-revenue-or-cost', quarter: q, detail: '' });
    }

    // 3. Double-counted investment: this quarter's investment must not change this quarter's opex
    const created = C.cost.commitments.createdThisQuarter;
    if (created.some(c => c.startQuarter <= q)) anomalies.push({ detector: 'investment-expensed-in-quarter', quarter: q, detail: '' });

    // 4. Runaway compounding / scale
    const growth = L.revenue / state.revenue - 1;
    if (q > 1) maxGrowth = Math.max(maxGrowth, growth);
    if (q > 1 && growth > T.maxQuarterlyRevenueGrowth) anomalies.push({ detector: 'runaway-growth', quarter: q, detail: `${(growth * 100).toFixed(1)}%` });
    if (L.revenue > T.maxRevenueMultiple * 200) anomalies.push({ detector: 'revenue-scale', quarter: q, detail: `$${L.revenue.toFixed(1)}M` });

    // 5. Impossible margins
    const margin = L.operatingProfit / L.revenue;
    minMargin = Math.min(minMargin, margin);
    maxMargin = Math.max(maxMargin, margin);
    // Batch 3: an insolvent company in an explicit distress spiral is a solvency outcome (reported by the solvency
    // state and the terminal viability gate), not an economic-model defect.
    const insolventEntering = C.solvency.history.length > 1 && C.solvency.history[C.solvency.history.length - 2].status === 'insolvent';
    if ((margin < T.marginBand[0] || margin > T.marginBand[1]) && !insolventEntering) anomalies.push({ detector: 'margin-out-of-band', quarter: q, detail: `${(margin * 100).toFixed(1)}%` });
    if (insolventEntering && margin < T.marginBand[0]) anomalies.push({ detector: 'insolvent-distress-spiral', quarter: q, detail: `${(margin * 100).toFixed(1)}%` });

    // 6. Cost disappearing when revenue falls: measured from the revenue peak so segment mix shifts
    //    (e.g. Consumer down, AI-native up) are not mistaken for costs vanishing.
    if (L.revenue > peak.revenue) peak = { revenue: L.revenue, cost: L.operatingCost, commitments: C.cost.commitments.total };
    if (L.revenue <= 0.95 * peak.revenue) {
      const revDrop = peak.revenue - L.revenue;
      const costDrop = peak.cost - L.operatingCost - Math.max(0, peak.commitments - C.cost.commitments.total);
      if (costDrop > T.maxCostDeclinePerRevenueDecline * revDrop + 1e-9) {
        anomalies.push({ detector: 'cost-disappears-with-revenue', quarter: q, detail: `from peak: rev −${revDrop.toFixed(2)}, cost −${costDrop.toFixed(2)}` });
      }
    }

    // 7. Revenue without commercial cause
    const cc = C.commercial.closing;
    const oc = rec.opening.commercial;
    if (R.consumer.closing > R.consumer.opening + 1e-9 && cc.consumerRetention <= 85 + 1e-9 && cc.consumerCacIndex >= 100 - 1e-9 && cc.pricingPower <= oc.pricingPower + 1e-9) {
      anomalies.push({ detector: 'consumer-growth-without-cause', quarter: q, detail: '' });
    }
    if (R.aiNative.closing > R.aiNative.opening + 1e-9 && cc.aiAdoptionIndex <= 10 + 1e-9 && cc.aiCommercialReadiness <= 10 + 1e-9 &&
      R.aiNative.qualityExecutionFactor <= 1 + 1e-9 && R.aiNative.aiNativeDemand <= 1 + 1e-9) {
      anomalies.push({ detector: 'ai-growth-without-cause', quarter: q, detail: '' });
    }
    if (R.enterprise.closing > R.enterprise.opening + 1e-9 && R.enterprise.liveFromEarlierBookings + R.enterprise.expansion <= R.enterprise.churn + 1e-9) {
      anomalies.push({ detector: 'enterprise-growth-without-cause', quarter: q, detail: '' });
    }

    if (firstNegativeCashQuarter === null && L.closingCash < 0) firstNegativeCashQuarter = q;
    quarters.push(rec);
    state = rec.ending;
  }

  return {
    stress,
    quarters,
    anomalies,
    firstNegativeCashQuarter,
    summary: {
      q8: quarters.length >= 8 ? snapshot(quarters[7]) : undefined,
      final: snapshot(quarters[quarters.length - 1]),
      maxQuarterlyRevenueGrowth: maxGrowth,
      minMargin,
      maxMargin,
    },
  };
}

export function runV2StressAudit(): V2StressResult[] {
  return V2_STRESS_CASES.map(runV2StressCase);
}
