/**
 * V2 Simulation Engine — Phase 3A: Operating Cost Architecture
 *
 * Operating Cost = Fixed/Semi-fixed + Activity-driven Variable + Strategic Commitments
 *                  + Financing Cost (placeholder 0)
 *
 * - Fixed/semi-fixed cost does NOT fall with revenue. It ratchets up slowly with
 *   sustained scale (lagged, partial) and unwinds only slowly back to its floor.
 * - Variable cost follows the activity that drives it, per segment (servicing,
 *   consumer acquisition spend, enterprise delivery/onboarding, inference).
 * - Strategic Investment is cash outside operating cost (Phase 2A). It is never
 *   expensed again here. Some investments create *future recurring commitments*
 *   (People payroll, Enterprise delivery/CS teams, AI infrastructure): explicit
 *   cohorts with a start lag and a finite duration.
 * - Event costs stay a separate ledger line (not part of operating cost).
 *
 * All coefficients are Draft 1 calibration in V2_COST_CALIBRATION. The baseline
 * reproduces exactly $170M operating cost on $200M revenue.
 *
 * Imports only V2 types; never the frozen V1 engine.
 */

import type { V2SegmentRevenue, V2RevenueConsequence } from './engineV2Revenue';
import type { V2MarketConditions } from './engineV2Commercial';
import type { V2CostAdjustments } from './engineV2Effects';

// ============ CALIBRATION ============

export const V2_COST_CALIBRATION = {
  variable: {
    /** Consumer servicing (content, payments, support) per $ of Consumer revenue. */
    consumerServicingRate: 0.255,
    /** Consumer acquisition/marketing spend per quarter ($M) at neutral demand; CAC determines its yield, not its size. */
    consumerAcquisitionSpend: 6.3,
    /** Enterprise account servicing per $ of Enterprise revenue. */
    enterpriseServicingRate: 0.2,
    /** One-off implementation/onboarding cost per $ of Enterprise run-rate going live this quarter. */
    enterpriseOnboardingPerLiveRunRate: 0.5,
    /** University servicing per $ of University revenue. */
    universityServicingRate: 0.2,
    /** AI-native inference/serving per $ of AI-native revenue. */
    aiNativeServingRate: 0.15,
  },
  fixed: {
    /** Semi-fixed ratchet: target rises by this share of prior-quarter revenue above the $200M baseline. */
    // Calibration (3C): 0.10 → 0.20. At 0.10 long-run margins reached 40–52% at 2–3× scale;
    // scale needs proportionally more management, systems and facilities.
    scaleStepPerRevenueAboveBaseline: 0.2,
    baselineRevenue: 200,
    /** Partial adjustment speeds toward target (up faster than down: costs are sticky). */
    adjustUpSpeed: 0.25,
    adjustDownSpeed: 0.1,
  },
  commitments: {
    /** Recurring quarterly cost per $1M invested, start lag (quarters) and duration (quarters). */
    // Calibration (3A): 0.10 → 0.06. At 0.10, People100 stacked $21M/qtr payroll by Q8 ($24M carrying cost per $30M invested),
    // which is not "modest"; 0.06 ≈ $7M/yr net salaries per $30M programme.
    people: { perDollar: 0.06, lag: 1, duration: 8, label: 'People payroll/retention commitments' },
    enterprise: { perDollar: 0.04, lag: 1, duration: 6, label: 'Enterprise delivery / Customer Success teams' },
    aiProduct: { perDollar: 0.06, lag: 1, duration: 6, label: 'AI/Product infrastructure and platform run-cost' },
  },
  baselineOperatingCost: 170,
} as const;

export type V2CommitmentSource = keyof typeof V2_COST_CALIBRATION.commitments | 'decision';

// ============ TYPES ============

export interface V2CostCommitment {
  id: string;
  source: V2CommitmentSource;
  /** Batch 3: decision commitments carry a description of their origin (e.g. contract delivery team). */
  label?: string;
  quarterCreated: number;
  amountInvested: number;
  quarterlyCost: number;
  /** First quarter the cost is incurred (inclusive). */
  startQuarter: number;
  /** Last quarter the cost is incurred (inclusive). */
  endQuarter: number;
}

export interface V2CostState {
  /** Fixed/semi-fixed operating cost run-rate ($M/qtr). */
  fixedSemiFixed: number;
  /** Floor for the fixed/semi-fixed pool (it never unwinds below the starting structure). */
  fixedFloor: number;
  commitments: V2CostCommitment[];
}

export interface V2CostConsequence {
  quarter: number;
  openingFixedSemiFixed: number;
  /** Batch 3: structural fixed-pool change applied at the start of the quarter (pool AND floor). */
  structuralFixedChange: number;
  /** Batch 3: hiring freeze held the semi-fixed pool from ratcheting upward. */
  ratchetFrozen: boolean;
  fixedTarget: number;
  fixedAdjustment: number;
  fixedSemiFixed: number;
  variable: {
    consumerServicing: number;
    consumerAcquisitionSpend: number;
    enterpriseServicing: number;
    enterpriseOnboarding: number;
    universityServicing: number;
    aiNativeServing: number;
    /** Batch 3: partner economic sharing (rate × partner-scope segment revenue). */
    partnerRevenueShare: number;
    total: number;
  };
  commitments: {
    active: V2CostCommitment[];
    bySource: Record<V2CommitmentSource, number>;
    total: number;
    createdThisQuarter: V2CostCommitment[];
  };
  financingCost: number;
  /** Placeholder: event costs are a separate ledger line, never part of operating cost. */
  eventCostPlaceholder: number;
  totalOperatingCost: number;
  closing: V2CostState;
}

// ============ BASELINE ============

/** Baseline variable cost for the starting company (acquisition at neutral demand; steady-state onboarding). */
export function baselineVariableCost(): number {
  const v = V2_COST_CALIBRATION.variable;
  const startRevenue = { consumer: 140, enterprise: 40, university: 16, aiNative: 4 };
  const baselineLiveRunRate = 1.5; // Enterprise steady-state run-rate going live per quarter
  return (
    v.consumerServicingRate * startRevenue.consumer +
    v.consumerAcquisitionSpend +
    v.enterpriseServicingRate * startRevenue.enterprise +
    v.enterpriseOnboardingPerLiveRunRate * baselineLiveRunRate +
    v.universityServicingRate * startRevenue.university +
    v.aiNativeServingRate * startRevenue.aiNative
  );
}

export function getV2CostBaseline(): V2CostState {
  const fixed = V2_COST_CALIBRATION.baselineOperatingCost - baselineVariableCost();
  return { fixedSemiFixed: fixed, fixedFloor: fixed, commitments: [] };
}

// ============ QUARTER CONSEQUENCE ============

export interface V2CostInvestment {
  people: number;
  enterprise: number;
  aiProduct: number;
}

/**
 * Operating cost for one quarter. Pure.
 * @param opening          cost state at the start of the quarter
 * @param openingRevenue   segment revenue at the start of the quarter (prior-quarter activity; drives semi-fixed ratchet)
 * @param revenue          this quarter's segment revenue consequence (drives variable cost)
 * @param investment       this quarter's strategic investment (creates FUTURE commitments only; never expensed here)
 */
export function calculateV2CostConsequence(
  opening: V2CostState,
  openingRevenue: V2SegmentRevenue,
  revenue: V2RevenueConsequence,
  investment: V2CostInvestment,
  market: V2MarketConditions,
  quarter: number,
  adjustments?: V2CostAdjustments
): V2CostConsequence {
  const K = V2_COST_CALIBRATION;
  const adj = adjustments;

  // Batch 3: structural change (restructuring / workforce reduction / closed offerings / acquisition) moves
  // both the pool and its floor, before this quarter's ratchet.
  const structuralFixedChange = (adj?.fixedPoolDelta ?? []).reduce((t, d) => t + d.amount, 0);
  const openPool = opening.fixedSemiFixed + structuralFixedChange;
  const floor = Math.max(0, opening.fixedFloor + structuralFixedChange);
  const ratchetFrozen = adj?.ratchetFrozen ?? false;

  // Fixed/semi-fixed: lagged, partial, sticky ratchet
  const priorRevenue = openingRevenue.consumer + openingRevenue.enterprise + openingRevenue.university + openingRevenue.aiNative;
  const fixedTarget = floor + K.fixed.scaleStepPerRevenueAboveBaseline * Math.max(0, priorRevenue - K.fixed.baselineRevenue);
  const gap = fixedTarget - openPool;
  const rawAdjustment = gap * (gap >= 0 ? K.fixed.adjustUpSpeed : K.fixed.adjustDownSpeed);
  const fixedAdjustment = ratchetFrozen ? Math.min(0, rawAdjustment) : rawAdjustment;
  const fixedSemiFixed = Math.max(floor, openPool + fixedAdjustment);

  // Variable: activity-driven, per segment
  const seg = revenue.closing.segments;
  const v = K.variable;
  const consumerServicing = v.consumerServicingRate * seg.consumer;
  const consumerAcquisitionSpend =
    v.consumerAcquisitionSpend * Math.max(0, market.consumerDemand) * Math.max(0, adj?.consumerAcquisitionSpendMultiplier ?? 1);
  const enterpriseServicing = v.enterpriseServicingRate * seg.enterprise;
  const enterpriseOnboarding =
    v.enterpriseOnboardingPerLiveRunRate * (revenue.enterprise.liveFromCurrentBookings + revenue.enterprise.liveFromEarlierBookings);
  const universityServicing = v.universityServicingRate * seg.university;
  const aiNativeServing = v.aiNativeServingRate * seg.aiNative;
  const partnerRevenueShare = (adj?.revenueShare ?? []).reduce((t, r) => t + r.rate * r.segments.reduce((u, k) => u + seg[k], 0), 0);
  const variableTotal =
    consumerServicing + consumerAcquisitionSpend + enterpriseServicing + enterpriseOnboarding + universityServicing + aiNativeServing +
    partnerRevenueShare;

  // Commitments: active this quarter (created in earlier quarters), plus new ones created now (start later)
  const active = opening.commitments.filter(c => c.startQuarter <= quarter && quarter <= c.endQuarter);
  const bySource: Record<V2CommitmentSource, number> = { people: 0, enterprise: 0, aiProduct: 0, decision: 0 };
  for (const c of active) bySource[c.source] += c.quarterlyCost;
  const commitmentsTotal = bySource.people + bySource.enterprise + bySource.aiProduct + bySource.decision;

  const investmentSources = Object.keys(K.commitments) as (keyof typeof K.commitments)[];
  const createdThisQuarter: V2CostCommitment[] = investmentSources
    .filter(src => investment[src] > 0)
    .map(src => {
      const k = K.commitments[src];
      return {
        id: `C-${src}-Q${quarter}`,
        source: src,
        quarterCreated: quarter,
        amountInvested: investment[src],
        quarterlyCost: k.perDollar * investment[src],
        startQuarter: quarter + k.lag,
        endQuarter: quarter + k.lag + k.duration - 1,
      };
    });
  // Batch 3: decision commitments (e.g. dedicated contract delivery team, retention packages). Always start later.
  for (const d of adj?.extraCommitments ?? []) {
    const lag = Math.max(1, d.lag);
    createdThisQuarter.push({
      id: d.id, source: 'decision', label: d.source, quarterCreated: quarter, amountInvested: 0, quarterlyCost: d.quarterlyCost,
      startQuarter: quarter + lag, endQuarter: quarter + lag + d.duration - 1,
    });
  }

  // Batch 3: interest on opening debt. This is the ONLY place interest enters the economics.
  const financingCost = Math.max(0, adj?.financingCost ?? 0);
  const totalOperatingCost = fixedSemiFixed + variableTotal + commitmentsTotal + financingCost;

  const stillRelevant = opening.commitments.filter(c => c.endQuarter > quarter);

  return {
    quarter,
    openingFixedSemiFixed: opening.fixedSemiFixed,
    structuralFixedChange,
    ratchetFrozen,
    fixedTarget,
    fixedAdjustment: fixedSemiFixed - openPool,
    fixedSemiFixed,
    variable: {
      consumerServicing,
      consumerAcquisitionSpend,
      enterpriseServicing,
      enterpriseOnboarding,
      universityServicing,
      aiNativeServing,
      partnerRevenueShare,
      total: variableTotal,
    },
    commitments: { active, bySource, total: commitmentsTotal, createdThisQuarter },
    financingCost,
    eventCostPlaceholder: 0,
    totalOperatingCost,
    closing: {
      fixedSemiFixed,
      fixedFloor: floor,
      commitments: [...stillRelevant, ...createdThisQuarter],
    },
  };
}
