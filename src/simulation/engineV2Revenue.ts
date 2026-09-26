/**
 * V2 Simulation Engine — Phase 2D: Segment Revenue Engine
 *
 * Market → Capability → Leading Indicators → Segment Economics → Revenue
 *
 * Converts the Phase 2C commercial state into four revenue stocks with memory:
 * Consumer, Enterprise, University & Credentials, AI-native.
 * Investment never appears in any revenue formula. AI Capability never multiplies revenue.
 * Pipeline is never revenue: pipeline → bookings (ACV) → backlog → live recurring revenue.
 *
 * All coefficients are Draft 1 calibration values in V2_REVENUE_CALIBRATION and are chosen
 * so that the starting company under a static neutral market (zero competitor progress)
 * is an exact revenue fixed point.
 *
 * Imports only V2 modules; never the frozen V1 engine.
 */

import type { V2CommercialConsequence, V2CommercialState, V2MarketConditions } from './engineV2Commercial';
import type { V2Capabilities } from './engineV2Capabilities';

// ============ CALIBRATION (Draft 1, tunable) ============

export const V2_REVENUE_CALIBRATION = {
  start: { consumer: 140, enterprise: 40, university: 16, aiNative: 4 },
  consumer: {
    /** Share of the consumer base that comes up for renewal/re-decision each quarter. */
    renewalExposure: 0.3,
    /** Baseline acquisition/replacement revenue per quarter ($M) at CAC 100 and neutral demand. */
    baseAcquisition: 6.3,
    /** Elasticity of acquisition volume to CAC: acquisition ∝ (100 / CAC)^elasticity. */
    cacElasticity: 1,
    /** Price/mix effect per point of Pricing Power change, applied to the retained base. */
    pricePerPricingPoint: 0.002,
  },
  enterprise: {
    /** Pipeline is annual contract value; quarterly run-rate = ACV / 4. */
    acvToQuarterlyRunRate: 0.25,
    /** Onboarding: share of a booking's run-rate going live at quarter offsets after booking. */
    recognition: [
      [1, 0.25],
      [2, 0.5],
      [3, 0.25],
    ] as readonly (readonly [number, number])[],
    renewalExposure: 0.25,
    renewalBase: 0.85,
    renewalPerCS: 0.002,
    renewalPerTrust: 0.0015,
    renewalPerExecution: 0.001,
    renewalMacro: 0.04,
    renewalBounds: [0.7, 0.97] as const,
    /** Expansion on the exposed base, scaled by Customer Success strength. */
    expansionRate: 0.1,
    expansionCsRamp: [30, 80] as const,
  },
  university: {
    renewalExposure: 0.25,
    acvToQuarterlyRunRate: 0.25,
    winRateBase: 1 / 3,
    winRatePerTrust: 0.01,
    winRateBounds: [0.15, 0.45] as const,
    recognition: [
      [2, 0.1],
      [3, 0.3],
      [4, 0.3],
      [5, 0.3],
    ] as readonly (readonly [number, number])[],
  },
  aiNative: {
    renewalExposure: 0.5,
    retentionBase: 0.8,
    retentionReadinessUplift: 0.12,
    retentionReadinessRamp: [10, 70] as const,
    /** $M/quarter of new monetization per adoption point up to the starting adoption level. */
    monetizationPerPointToBaseline: 0.04,
    /** $M/quarter of new monetization per adoption point above the starting level. */
    monetizationPerPointAbove: 0.08,
    adoptionBaseline: 10,
    qualityPerPQ: 0.01,
    qualityPerExecution: 0.01,
    qualityBounds: [0.5, 1.5] as const,
  },
} as const;

// ============ TYPES ============

export interface V2SegmentRevenue {
  consumer: number;
  enterprise: number;
  university: number;
  aiNative: number;
}

export function totalRevenue(r: V2SegmentRevenue): number {
  return r.consumer + r.enterprise + r.university + r.aiNative;
}

/** One booking cohort of contracted-but-not-yet-live recurring revenue. */
export interface V2BookingCohort {
  id: string;
  quarterBooked: number;
  /** Annual contract value booked. */
  bookingsACV: number;
  /** Quarterly recurring run-rate this cohort adds once fully live. */
  runRate: number;
  liveThisQuarter: number;
  liveToDate: number;
  /** Run-rate still in backlog (not yet live). */
  remaining: number;
}

export interface V2RevenueState {
  segments: V2SegmentRevenue;
  enterpriseBacklog: V2BookingCohort[];
  universityBacklog: V2BookingCohort[];
}

export interface V2ConsumerRevenueDiagnostic {
  opening: number;
  exposedBase: number;
  retention: number;
  retained: number;
  churn: number;
  demand: number;
  cacIndex: number;
  acquisition: number;
  pricingPowerChange: number;
  priceMix: number;
  closing: number;
}

export interface V2EnterpriseRevenueDiagnostic {
  opening: number;
  openingPipeline: number;
  resolvedPipeline: number;
  winRate: number;
  bookingsACV: number;
  newRunRateBooked: number;
  renewalRate: number;
  exposedBase: number;
  churn: number;
  expansion: number;
  liveFromCurrentBookings: number;
  liveFromEarlierBookings: number;
  closing: number;
  backlogRunRate: number;
  /** Backlog expressed as annual contract value (run-rate × 4). */
  backlogACV: number;
}

export interface V2UniversityRevenueDiagnostic {
  opening: number;
  renewalRate: number;
  exposedBase: number;
  churn: number;
  openingPipeline: number;
  resolvedPipeline: number;
  institutionalWinRate: number;
  winsACV: number;
  newRunRateWon: number;
  liveFromEarlierWins: number;
  closing: number;
  backlogRunRate: number;
  backlogACV: number;
}

export interface V2AINativeRevenueDiagnostic {
  opening: number;
  readiness: number;
  adoption: number;
  aiNativeDemand: number;
  qualityExecutionFactor: number;
  retentionRate: number;
  exposedBase: number;
  churn: number;
  retainedBase: number;
  newMonetization: number;
  closing: number;
}

export interface V2RevenueConsequence {
  quarter: number;
  consumer: V2ConsumerRevenueDiagnostic;
  enterprise: V2EnterpriseRevenueDiagnostic;
  university: V2UniversityRevenueDiagnostic;
  aiNative: V2AINativeRevenueDiagnostic;
  closing: V2RevenueState;
  totalRevenue: number;
}

/** Inputs from the post-maturation capability state used by revenue economics. */
export interface V2RevenueCompanyInput {
  capabilities: V2Capabilities;
  productQuality: number;
  trust: number;
}

// ============ HELPERS ============

function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/**
 * Pre-game backlog so that Q1 opens in steady state: cohorts booked in quarters
 * ≤ 0 with the portion of their run-rate not yet live at the start of Q1.
 */
function steadyStateBacklog(
  prefix: string,
  runRatePerQuarter: number,
  recognition: readonly (readonly [number, number])[]
): V2BookingCohort[] {
  const maxOffset = Math.max(...recognition.map(r => r[0]));
  const cohorts: V2BookingCohort[] = [];
  for (let qb = 0; qb > -maxOffset; qb--) {
    const offsetAtQ1 = 1 - qb;
    const liveBefore = recognition.filter(([o]) => o < offsetAtQ1).reduce((s, [, sh]) => s + sh, 0);
    const remaining = runRatePerQuarter * (1 - liveBefore);
    if (remaining <= 1e-12) continue;
    cohorts.push({
      id: `${prefix}Q${qb}`,
      quarterBooked: qb,
      bookingsACV: runRatePerQuarter * 4,
      runRate: runRatePerQuarter,
      liveThisQuarter: 0,
      liveToDate: runRatePerQuarter * liveBefore,
      remaining,
    });
  }
  return cohorts;
}

export function getV2RevenueBaseline(): V2RevenueState {
  const K = V2_REVENUE_CALIBRATION;
  const s = K.start;
  // Steady-state new run-rate equals baseline churn for each contracted segment.
  const entChurn = s.enterprise * K.enterprise.renewalExposure * (1 - K.enterprise.renewalBase);
  const uniChurn = s.university * K.university.renewalExposure * (1 - 0.9);
  return {
    segments: { ...s },
    enterpriseBacklog: steadyStateBacklog('E', entChurn, K.enterprise.recognition),
    universityBacklog: steadyStateBacklog('U', uniChurn, K.university.recognition),
  };
}

/** Advance backlog cohorts: release this quarter's scheduled tranche. Returns new cohorts + released amounts. */
function releaseBacklog(
  cohorts: V2BookingCohort[],
  recognition: readonly (readonly [number, number])[],
  quarter: number
): { cohorts: V2BookingCohort[]; liveCurrent: number; liveEarlier: number } {
  const maxOffset = Math.max(...recognition.map(r => r[0]));
  let liveCurrent = 0;
  let liveEarlier = 0;
  const next: V2BookingCohort[] = [];
  for (const c0 of cohorts) {
    const c = { ...c0, liveThisQuarter: 0 };
    const offset = quarter - c.quarterBooked;
    const entry = recognition.find(([o]) => o === offset);
    if (entry && c.remaining > 1e-12) {
      const isFinal = offset === maxOffset;
      const tranche = isFinal ? c.remaining : c.runRate * entry[1];
      c.liveThisQuarter = tranche;
      c.liveToDate += tranche;
      c.remaining = isFinal ? 0 : c.remaining - tranche;
      if (c.quarterBooked === quarter) liveCurrent += tranche;
      else liveEarlier += tranche;
    }
    if (c.remaining > 1e-12 || c.liveThisQuarter > 0) next.push(c);
  }
  return { cohorts: next, liveCurrent, liveEarlier };
}

// ============ ENTERPRISE RENEWAL (exported for tests/diagnostics) ============

export function enterpriseRenewalRate(company: V2RevenueCompanyInput, market: V2MarketConditions): number {
  const k = V2_REVENUE_CALIBRATION.enterprise;
  const raw =
    k.renewalBase +
    k.renewalPerCS * (company.capabilities.customerSuccess - 30) +
    k.renewalPerTrust * (company.trust - 70) +
    k.renewalPerExecution * (company.capabilities.execution - 60) -
    k.renewalMacro * market.macroPressure;
  return clamp(raw, k.renewalBounds[0], k.renewalBounds[1]);
}

export function universityWinRate(trust: number): number {
  const k = V2_REVENUE_CALIBRATION.university;
  return clamp(k.winRateBase * (1 + k.winRatePerTrust * (trust - 70)), k.winRateBounds[0], k.winRateBounds[1]);
}

export function aiQualityExecutionFactor(productQuality: number, execution: number): number {
  const k = V2_REVENUE_CALIBRATION.aiNative;
  return clamp(1 + k.qualityPerPQ * (productQuality - 70) + k.qualityPerExecution * (execution - 60), k.qualityBounds[0], k.qualityBounds[1]);
}

export function aiNewMonetization(adoption: number, aiNativeDemand: number, qualityExecution: number): number {
  const k = V2_REVENUE_CALIBRATION.aiNative;
  const perAdoption =
    k.monetizationPerPointToBaseline * Math.min(adoption, k.adoptionBaseline) +
    k.monetizationPerPointAbove * Math.max(0, adoption - k.adoptionBaseline);
  return Math.max(0, aiNativeDemand) * qualityExecution * perAdoption;
}

// ============ QUARTER CONSEQUENCE ============

/**
 * Segment revenue for one quarter. Pure.
 * @param opening           revenue state at the start of the quarter
 * @param commercialOpening commercial state at the start of the quarter
 * @param commercial        this quarter's Phase 2C commercial consequence
 * @param company           post-maturation capability state
 * @param market            market conditions for the quarter
 */
export function calculateV2RevenueConsequence(
  opening: V2RevenueState,
  commercialOpening: V2CommercialState,
  commercial: V2CommercialConsequence,
  company: V2RevenueCompanyInput,
  market: V2MarketConditions,
  quarter: number
): V2RevenueConsequence {
  const K = V2_REVENUE_CALIBRATION;
  const cc = commercial.closing;

  // ---- Consumer: retained base + acquisition + price/mix ----
  const kc = K.consumer;
  const C0 = opening.segments.consumer;
  const cExposed = C0 * kc.renewalExposure;
  const retention = cc.consumerRetention / 100;
  const cChurn = cExposed * (1 - retention);
  const cRetained = C0 - cChurn;
  const cAcq = kc.baseAcquisition * Math.max(0, market.consumerDemand) * Math.pow(100 / cc.consumerCacIndex, kc.cacElasticity);
  const ppChange = cc.pricingPower - commercialOpening.pricingPower;
  const cPrice = cRetained * kc.pricePerPricingPoint * ppChange;
  const C1 = Math.max(0, cRetained + cAcq + cPrice);

  // ---- Enterprise: renewals + expansion + bookings recognized from backlog ----
  const ke = K.enterprise;
  const E0 = opening.segments.enterprise;
  const entPipe = commercial.indicators.find(i => i.indicator === 'enterprisePipeline')!;
  const resolvedPipeline = -entPipe.decayOrAttrition;
  const winRate = cc.enterpriseWinRate / 100;
  const bookingsACV = resolvedPipeline * winRate;
  const newRunRate = bookingsACV * ke.acvToQuarterlyRunRate;
  const eRenewal = enterpriseRenewalRate(company, market);
  const eExposed = E0 * ke.renewalExposure;
  const eChurn = eExposed * (1 - eRenewal);
  const eExpansion = eExposed * ke.expansionRate * ramp(company.capabilities.customerSuccess, ke.expansionCsRamp[0], ke.expansionCsRamp[1]);
  const entNewCohort: V2BookingCohort = {
    id: `E-Q${quarter}`, quarterBooked: quarter, bookingsACV, runRate: newRunRate,
    liveThisQuarter: 0, liveToDate: 0, remaining: newRunRate,
  };
  const entRelease = releaseBacklog([...opening.enterpriseBacklog, ...(newRunRate > 0 ? [entNewCohort] : [])], ke.recognition, quarter);
  const E1 = Math.max(0, E0 - eChurn + eExpansion + entRelease.liveCurrent + entRelease.liveEarlier);
  const entBacklogRunRate = entRelease.cohorts.reduce((s, c) => s + c.remaining, 0);

  // ---- University: renewals + institutional wins recognized slowly ----
  const ku = K.university;
  const U0 = opening.segments.university;
  const uRenewal = cc.universityRenewalRate / 100;
  const uExposed = U0 * ku.renewalExposure;
  const uChurn = uExposed * (1 - uRenewal);
  const uniPipe = commercial.indicators.find(i => i.indicator === 'universityPipeline')!;
  const uResolved = -uniPipe.decayOrAttrition;
  const uWinRate = universityWinRate(company.trust);
  const winsACV = uResolved * uWinRate;
  const uNewRunRate = winsACV * ku.acvToQuarterlyRunRate;
  const uniNewCohort: V2BookingCohort = {
    id: `U-Q${quarter}`, quarterBooked: quarter, bookingsACV: winsACV, runRate: uNewRunRate,
    liveThisQuarter: 0, liveToDate: 0, remaining: uNewRunRate,
  };
  const uniRelease = releaseBacklog([...opening.universityBacklog, ...(uNewRunRate > 0 ? [uniNewCohort] : [])], ku.recognition, quarter);
  const U1 = Math.max(0, U0 - uChurn + uniRelease.liveCurrent + uniRelease.liveEarlier);
  const uniBacklogRunRate = uniRelease.cohorts.reduce((s, c) => s + c.remaining, 0);

  // ---- AI-native: retained base + adoption-driven monetization ----
  const ka = K.aiNative;
  const A0 = opening.segments.aiNative;
  const readiness = cc.aiCommercialReadiness;
  const adoption = cc.aiAdoptionIndex;
  const aiRetention = ka.retentionBase + ka.retentionReadinessUplift * ramp(readiness, ka.retentionReadinessRamp[0], ka.retentionReadinessRamp[1]);
  const aExposed = A0 * ka.renewalExposure;
  const aChurn = aExposed * (1 - aiRetention);
  const qe = aiQualityExecutionFactor(company.productQuality, company.capabilities.execution);
  const aNew = aiNewMonetization(adoption, market.aiNativeDemand, qe);
  const A1 = Math.max(0, A0 - aChurn + aNew);

  const segments = { consumer: C1, enterprise: E1, university: U1, aiNative: A1 };
  return {
    quarter,
    consumer: {
      opening: C0, exposedBase: cExposed, retention, retained: cRetained, churn: cChurn,
      demand: market.consumerDemand, cacIndex: cc.consumerCacIndex, acquisition: cAcq,
      pricingPowerChange: ppChange, priceMix: cPrice, closing: C1,
    },
    enterprise: {
      opening: E0, openingPipeline: entPipe.opening, resolvedPipeline, winRate, bookingsACV,
      newRunRateBooked: newRunRate, renewalRate: eRenewal, exposedBase: eExposed, churn: eChurn,
      expansion: eExpansion, liveFromCurrentBookings: entRelease.liveCurrent, liveFromEarlierBookings: entRelease.liveEarlier,
      closing: E1, backlogRunRate: entBacklogRunRate, backlogACV: entBacklogRunRate / ke.acvToQuarterlyRunRate,
    },
    university: {
      opening: U0, renewalRate: uRenewal, exposedBase: uExposed, churn: uChurn, openingPipeline: uniPipe.opening,
      resolvedPipeline: uResolved, institutionalWinRate: uWinRate, winsACV, newRunRateWon: uNewRunRate,
      liveFromEarlierWins: uniRelease.liveEarlier + uniRelease.liveCurrent, closing: U1,
      backlogRunRate: uniBacklogRunRate, backlogACV: uniBacklogRunRate / ku.acvToQuarterlyRunRate,
    },
    aiNative: {
      opening: A0, readiness, adoption, aiNativeDemand: market.aiNativeDemand, qualityExecutionFactor: qe,
      retentionRate: aiRetention, exposedBase: aExposed, churn: aChurn, retainedBase: A0 - aChurn,
      newMonetization: aNew, closing: A1,
    },
    closing: {
      segments,
      enterpriseBacklog: entRelease.cohorts.filter(c => c.remaining > 1e-12),
      universityBacklog: uniRelease.cohorts.filter(c => c.remaining > 1e-12),
    },
    totalRevenue: totalRevenue(segments),
  };
}
