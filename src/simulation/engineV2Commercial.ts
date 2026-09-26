/**
 * V2 Simulation Engine — Phase 2C: Commercial & Leading-Indicator Engine
 *
 * Market conditions + matured capabilities + Product / Trust / Execution
 *   → leading commercial indicators (with memory).
 *
 * Phase 2C does NOT calculate revenue, costs, cash, stock price or scores.
 * Pipelines are qualified opportunity value, not revenue.
 *
 * Conceptually separate from the financial ledger (engineV2.ts) and the
 * capability pipeline (engineV2Capabilities.ts): it reads the post-maturation
 * capability state and an injectable market input, and writes only commercial state.
 *
 * All coefficients are Draft 1 calibration values (V2_COMMERCIAL_CALIBRATION) and tunable.
 * Imports only V2 types; never the frozen V1 engine.
 */

import type { V2Capabilities } from './engineV2Capabilities';

// ============ MARKET INPUT (independent of company state) ============

export interface V2MarketConditions {
  /** Consumer demand index (1.0 = neutral). */
  consumerDemand: number;
  /** Consumer commoditization pressure (0 = none, 1 = severe). */
  consumerCommoditization: number;
  /** Consumer acquisition-cost pressure index (1.0 = neutral; higher = more expensive). */
  consumerCacPressure: number;
  /** Enterprise demand index (1.0 = neutral). */
  enterpriseDemand: number;
  /** Enterprise demand for AI-enabled offerings (1.0 = neutral). */
  enterpriseAIDemand: number;
  /** University / institutional demand index (1.0 = neutral). */
  universityDemand: number;
  /** AI-native product demand index (1.0 = neutral). */
  aiNativeDemand: number;
  /** Macroeconomic pressure (0 = none, 1 = severe recession). */
  macroPressure: number;
  /**
   * Competitor benchmark progress per quarter (capability-equivalent points).
   *
   * Absolute capability does NOT decay merely because competitors improve.
   * Relative competitive position (company capability − benchmark) deteriorates
   * as the market benchmark advances. Commercial indicators respond to relative
   * position. Market scenarios may accelerate, slow or stop this progression
   * (e.g. 0 = benchmarks frozen, 2× neutral = fast-moving competitors).
   */
  competitorProgress: V2CompetitorProgress;
  /**
   * Addressable quarterly revenue pool per segment ($M/qtr). Growth flows (acquisition, bookings,
   * expansion, wins, AI monetization) scale with remaining headroom so no segment compounds without
   * bound. Added in Phase 3C calibration (market saturation); injectable like every market input.
   */
  segmentCapacity: V2SegmentCapacity;
}

export interface V2SegmentCapacity {
  consumer: number;
  enterprise: number;
  university: number;
  aiNative: number;
}

/** Draft 1 calibration (Phase 3C): neutral-market addressable revenue pools, $M per quarter. */
export const V2_NEUTRAL_SEGMENT_CAPACITY: Readonly<V2SegmentCapacity> = Object.freeze({
  consumer: 300,
  enterprise: 120,
  university: 40,
  aiNative: 80,
});

export interface V2CompetitorProgress {
  consumer: number;
  enterprise: number;
  credential: number;
}

/**
 * Draft 1 calibration: neutral-market competitor benchmark progression per quarter.
 * Tunable; injected through V2MarketConditions.competitorProgress, never read directly by formulas.
 */
export const V2_NEUTRAL_COMPETITOR_PROGRESS: Readonly<V2CompetitorProgress> = Object.freeze({
  consumer: 0.75,
  enterprise: 0.75,
  credential: 0.5,
});

export function getNeutralMarket(): V2MarketConditions {
  return {
    consumerDemand: 1,
    consumerCommoditization: 0,
    consumerCacPressure: 1,
    enterpriseDemand: 1,
    enterpriseAIDemand: 1,
    universityDemand: 1,
    aiNativeDemand: 1,
    macroPressure: 0,
    competitorProgress: { ...V2_NEUTRAL_COMPETITOR_PROGRESS },
    segmentCapacity: { ...V2_NEUTRAL_SEGMENT_CAPACITY },
  };
}

// ============ COMMERCIAL STATE ============

/** Explicit commercial state. Starting values are Draft 1 calibration (tunable). */
export interface V2CommercialState {
  /** % of consumer base retained per quarter. */
  consumerRetention: number;
  /** 100 = starting acquisition economics; higher is worse. */
  consumerCacIndex: number;
  /** Qualified enterprise opportunity value, $M (not revenue). */
  enterprisePipeline: number;
  /** % of resolved enterprise pipeline won. */
  enterpriseWinRate: number;
  /** 0–100, lagging adoption of AI products. */
  aiAdoptionIndex: number;
  /** 0–100, calculated each quarter from AI Capability + support. */
  aiCommercialReadiness: number;
  /** Qualified institutional opportunity value, $M (not revenue). */
  universityPipeline: number;
  /** % of university contracts renewed. */
  universityRenewalRate: number;
  /** 0–100 slow-moving composite. */
  pricingPower: number;
  /** Competitor capability benchmarks (start = company's starting capability). */
  competitorBenchmarks: { consumer: number; enterprise: number; credential: number };
}

export const V2_COMMERCIAL_START = {
  consumerRetention: 85,
  consumerCacIndex: 100,
  enterprisePipeline: 80,
  enterpriseWinRate: 25,
  aiAdoptionIndex: 10,
  universityPipeline: 24,
  universityRenewalRate: 90,
  pricingPower: 50,
  competitorBenchmarks: { consumer: 55, enterprise: 30, credential: 40 },
} as const;

/** Inputs the commercial engine reads from the (post-maturation) capability state. */
export interface V2CommercialCapabilityInput {
  capabilities: V2Capabilities;
  productQuality: number;
  trust: number;
}

// ============ DRAFT 1 CALIBRATION (tunable) ============

export const V2_COMMERCIAL_CALIBRATION = {
  consumer: {
    retentionSpeed: 0.35,
    retentionBounds: [60, 95] as const,
    retentionPerRelCapability: 0.2,
    retentionAiSynergy: 4,
    retentionPerTrust: 0.15,
    retentionPerProductQuality: 0.15,
    supportFloor: 0.4,
    supportRamp: [45, 80] as const,
    consumerStrengthRamp: [50, 80] as const,
    mktDemand: 10,
    mktCommoditization: 8,
    // Calibration (Batch 3 · Q6): 4 → 8. Draft-1 value was never exercised (macro 0 in Q1–Q4); at 4 a severe
    // recession cut consumer revenue only −3.6% over three quarters — too mild for discretionary subscriptions.
    mktMacro: 8,
    cacSpeed: 0.35,
    cacBounds: [50, 200] as const,
    cacPerRelCapability: 0.6,
    cacPerProductQuality: 0.6,
    cacMktPressure: 100,
    cacMktDemand: 25,
    cacMktCommoditization: 15,
  },
  enterprise: {
    resolutionRate: 0.3,
    baseInflow: 24,
    inflowCapabilityAmplitude: 1.2,
    inflowCapabilityScale: 40,
    inflowCsScaleFloor: 0.5,
    csRamp: [10, 60] as const,
    inflowMacro: 0.5,
    winRateSpeed: 0.3,
    winRateBounds: [10, 45] as const,
    winPerRelCapability: 0.08,
    winAiSynergy: 6,
    enterpriseStrengthRamp: [30, 70] as const,
    csLimitRamp: [0, 60] as const,
    winPerProductQuality: 0.1,
    winPerTrust: 0.1,
    winPerCustomerSuccess: 0.15,
    winPerExecution: 0.08,
    winMktDemand: 8,
    winMktAIDemand: 4,
    winMktMacro: 5,
  },
  ai: {
    readinessCurve: [
      [0, 0],
      [20, 20],
      [35, 45],
      [50, 70],
      [100, 100],
    ] as readonly (readonly [number, number])[],
    supportFloor: 0.4,
    supportWeights: { productQuality: 0.4, talent: 0.35, execution: 0.25 },
    productQualityRamp: [40, 85] as const,
    talentRamp: [30, 80] as const,
    executionRamp: [30, 80] as const,
    /** Readiness band over which AI starts to matter commercially (AI effect 0→1). */
    effectRamp: [15, 70] as const,
    adoptionSpeed: 0.25,
    adoptionBounds: [0, 100] as const,
    adoptionAmplitude: 70,
    adoptionReadinessRamp: [10, 80] as const,
  },
  university: {
    resolutionRate: 0.2,
    baseInflow: 4.8,
    inflowCapabilityAmplitude: 0.8,
    inflowCapabilityScale: 40,
    trustRamp: [40, 80] as const,
    inflowMacro: 0.15,
    renewalSpeed: 0.2,
    renewalBounds: [75, 97] as const,
    renewalPerRelCapability: 0.08,
    renewalPerTrust: 0.25,
    renewalMktDemand: 5,
    renewalMktMacro: 2,
  },
  pricing: {
    speed: 0.1,
    bounds: [0, 100] as const,
    perProductQuality: 0.4,
    perTrust: 0.4,
    aiDifferentiation: 15,
    perRelCapability: 0.1,
    mktCommoditization: 15,
    mktMacro: 5,
  },
} as const;

export function getV2CommercialBaseline(): V2CommercialState {
  const s = V2_COMMERCIAL_START;
  const base: V2CommercialState = {
    consumerRetention: s.consumerRetention,
    consumerCacIndex: s.consumerCacIndex,
    enterprisePipeline: s.enterprisePipeline,
    enterpriseWinRate: s.enterpriseWinRate,
    aiAdoptionIndex: s.aiAdoptionIndex,
    aiCommercialReadiness: 0,
    universityPipeline: s.universityPipeline,
    universityRenewalRate: s.universityRenewalRate,
    pricingPower: s.pricingPower,
    competitorBenchmarks: { ...s.competitorBenchmarks },
  };
  return base;
}

// ============ HELPERS ============

/** Continuous 0→1 ramp between lo and hi. */
export function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}

function piecewise(points: readonly (readonly [number, number])[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

/** Positive part scaled by a support factor; negative part passes through unsoftened. */
function scalePositive(value: number, support: number): number {
  return value > 0 ? value * support : value;
}

export interface V2Driver {
  label: string;
  value: number;
}

/** Auditable diagnostic for one commercial indicator in one quarter. */
export interface V2IndicatorDiagnostic {
  indicator: keyof Omit<V2CommercialState, 'competitorBenchmarks'>;
  kind: 'level' | 'stock' | 'calculated';
  opening: number;
  /** Stock indicators only: base new qualified pipeline at neutral market/capability. */
  baseInflow: number;
  marketContribution: number;
  capabilityContribution: number;
  dependencyContribution: number;
  /** Level: speed × (start − opening), reversion toward the starting anchor. Stock: −resolution × opening. */
  decayOrAttrition: number;
  /** opening + baseInflow + market + capability + dependency + decayOrAttrition */
  unclipped: number;
  closing: number;
  bounds: readonly [number, number];
  clipped: boolean;
  clipAmount: number;
  /** Level indicators: equilibrium target this quarter; stock: implied steady state. */
  target: number;
  drivers: V2Driver[];
}

function finish(
  d: Omit<V2IndicatorDiagnostic, 'unclipped' | 'closing' | 'clipped' | 'clipAmount'>
): V2IndicatorDiagnostic {
  const unclipped = d.opening + d.baseInflow + d.marketContribution + d.capabilityContribution + d.dependencyContribution + d.decayOrAttrition;
  const closing = Math.min(d.bounds[1], Math.max(d.bounds[0], unclipped));
  return { ...d, unclipped, closing, clipped: closing !== unclipped, clipAmount: closing - unclipped };
}

/** Level indicator: X′ = X + speed × (anchor + market + capability + dependency − X). */
function levelIndicator(
  indicator: V2IndicatorDiagnostic['indicator'],
  opening: number,
  anchor: number,
  speed: number,
  bounds: readonly [number, number],
  market: number,
  capability: number,
  dependency: number,
  drivers: V2Driver[]
): V2IndicatorDiagnostic {
  return finish({
    indicator,
    kind: 'level',
    opening,
    baseInflow: 0,
    marketContribution: speed * market,
    capabilityContribution: speed * capability,
    dependencyContribution: speed * dependency,
    decayOrAttrition: speed * (anchor - opening),
    bounds,
    target: anchor + market + capability + dependency,
    drivers,
  });
}

// ============ AI COMMERCIAL READINESS ============

export interface V2AIReadinessBreakdown {
  aiCapability: number;
  band: 'experimentation' | 'usable features' | 'commercially credible' | 'scalable platform';
  /** Readiness if organizational support were perfect. */
  capabilityOnlyScore: number;
  productQualitySupport: number;
  talentSupport: number;
  executionSupport: number;
  /** supportFloor + (1 − supportFloor) × weighted support, in [0.4, 1]. */
  supportMultiplier: number;
  readiness: number;
}

export function aiReadinessBand(ai: number): V2AIReadinessBreakdown['band'] {
  if (ai < 20) return 'experimentation';
  if (ai < 35) return 'usable features';
  if (ai < 50) return 'commercially credible';
  return 'scalable platform';
}

export function calculateAIReadiness(input: V2CommercialCapabilityInput): V2AIReadinessBreakdown {
  const k = V2_COMMERCIAL_CALIBRATION.ai;
  const ai = input.capabilities.ai;
  const capabilityOnlyScore = piecewise(k.readinessCurve, ai);
  const productQualitySupport = ramp(input.productQuality, k.productQualityRamp[0], k.productQualityRamp[1]);
  const talentSupport = ramp(input.capabilities.talent, k.talentRamp[0], k.talentRamp[1]);
  const executionSupport = ramp(input.capabilities.execution, k.executionRamp[0], k.executionRamp[1]);
  const weighted =
    k.supportWeights.productQuality * productQualitySupport +
    k.supportWeights.talent * talentSupport +
    k.supportWeights.execution * executionSupport;
  const supportMultiplier = k.supportFloor + (1 - k.supportFloor) * weighted;
  return {
    aiCapability: ai,
    band: aiReadinessBand(ai),
    capabilityOnlyScore,
    productQualitySupport,
    talentSupport,
    executionSupport,
    supportMultiplier,
    readiness: capabilityOnlyScore * supportMultiplier,
  };
}

/** 0→1 commercial effect of AI readiness used by Consumer/Enterprise/Pricing formulas. */
export function aiCommercialEffect(readiness: number): number {
  const r = V2_COMMERCIAL_CALIBRATION.ai.effectRamp;
  return ramp(readiness, r[0], r[1]);
}

// ============ QUARTER CONSEQUENCE ============

export interface V2CommercialConsequence {
  quarter: number;
  market: V2MarketConditions;
  /** Benchmarks after this quarter's competitor progress. */
  competitorBenchmarks: { consumer: number; enterprise: number; credential: number };
  relativeCapability: { consumer: number; enterprise: number; credential: number };
  aiReadiness: V2AIReadinessBreakdown;
  indicators: V2IndicatorDiagnostic[];
  closing: V2CommercialState;
}

/**
 * Commercial consequence for one quarter. Pure.
 * @param opening    commercial state at the start of the quarter
 * @param company    capability state AFTER this quarter's maturation (Phase 2B closing)
 * @param market     injectable market conditions
 */
/**
 * Destination commercialization focus (Batch 2 · Q4). Multipliers (≥ 1) on the POSITIVE,
 * capability-driven contributions of the destination's focus segment(s): a focused company
 * converts its aligned capabilities into commercial evidence more effectively. Weaknesses are
 * never amplified and nothing here touches revenue. Absent = identical to Phase 2C.
 */
export interface V2CommercializationFocus {
  consumer: number;
  enterprise: number;
  university: number;
  /** Premium: Product Quality/Trust support terms and pricing power. */
  premium: number;
}

const posScale = (x: number, m: number) => (x > 0 ? x * m : x);

export function calculateV2CommercialConsequence(
  opening: V2CommercialState,
  company: V2CommercialCapabilityInput,
  market: V2MarketConditions,
  quarter: number,
  focus?: V2CommercializationFocus
): V2CommercialConsequence {
  const K = V2_COMMERCIAL_CALIBRATION;
  const fc = focus ?? { consumer: 1, enterprise: 1, university: 1, premium: 1 };
  const caps = company.capabilities;
  const pq = company.productQuality;
  const trust = company.trust;

  // Competitor benchmarks advance; relative capability is what the market sees.
  const competitorBenchmarks = {
    consumer: opening.competitorBenchmarks.consumer + market.competitorProgress.consumer,
    enterprise: opening.competitorBenchmarks.enterprise + market.competitorProgress.enterprise,
    credential: opening.competitorBenchmarks.credential + market.competitorProgress.credential,
  };
  const relativeCapability = {
    consumer: caps.consumer - competitorBenchmarks.consumer,
    enterprise: caps.enterprise - competitorBenchmarks.enterprise,
    credential: caps.credential - competitorBenchmarks.credential,
  };

  // AI readiness (calculated) and its commercial effect
  const aiReadiness = calculateAIReadiness(company);
  const aiEffect = aiCommercialEffect(aiReadiness.readiness);

  // ---- Consumer Retention ----
  const kc = K.consumer;
  const consumerSupport = kc.supportFloor + (1 - kc.supportFloor) * ramp(Math.min(pq, trust), kc.supportRamp[0], kc.supportRamp[1]);
  const consumerStrength = ramp(caps.consumer, kc.consumerStrengthRamp[0], kc.consumerStrengthRamp[1]);
  const retCapRaw = kc.retentionPerRelCapability * relativeCapability.consumer;
  const retCap = posScale(scalePositive(retCapRaw, consumerSupport), fc.consumer);
  const retAi = kc.retentionAiSynergy * aiEffect * consumerStrength * fc.consumer;
  const retDep = posScale(kc.retentionPerTrust * (trust - 70) + kc.retentionPerProductQuality * (pq - 70), fc.premium);
  const retMkt =
    kc.mktDemand * (market.consumerDemand - 1) -
    kc.mktCommoditization * market.consumerCommoditization * (1 - 0.5 * aiEffect) -
    kc.mktMacro * market.macroPressure;
  const consumerRetention = levelIndicator(
    'consumerRetention', opening.consumerRetention, V2_COMMERCIAL_START.consumerRetention, kc.retentionSpeed,
    kc.retentionBounds, retMkt, retCap + retAi, retDep,
    [
      { label: 'relative Consumer capability', value: relativeCapability.consumer },
      { label: 'capability term (support-scaled)', value: retCap },
      { label: 'Consumer support multiplier (min PQ, Trust)', value: consumerSupport },
      { label: 'AI × Consumer synergy', value: retAi },
      { label: 'Trust term', value: kc.retentionPerTrust * (trust - 70) },
      { label: 'Product Quality term', value: kc.retentionPerProductQuality * (pq - 70) },
    ]
  );

  // ---- Consumer CAC Index (higher is worse) ----
  const cacCap = -posScale(scalePositive(kc.cacPerRelCapability * relativeCapability.consumer, consumerSupport), fc.consumer);
  const cacDep = -kc.cacPerProductQuality * (pq - 70);
  const cacMkt =
    kc.cacMktPressure * (market.consumerCacPressure - 1) -
    kc.cacMktDemand * (market.consumerDemand - 1) +
    kc.cacMktCommoditization * market.consumerCommoditization;
  const consumerCacIndex = levelIndicator(
    'consumerCacIndex', opening.consumerCacIndex, V2_COMMERCIAL_START.consumerCacIndex, kc.cacSpeed,
    kc.cacBounds, cacMkt, cacCap, cacDep,
    [
      { label: 'relative Consumer capability', value: relativeCapability.consumer },
      { label: 'capability term (support-scaled)', value: cacCap },
      { label: 'Product Quality term', value: cacDep },
      { label: 'market CAC pressure', value: market.consumerCacPressure },
    ]
  );

  // ---- Enterprise Pipeline (stock) ----
  const ke = K.enterprise;
  const csScale = ke.inflowCsScaleFloor + (1 - ke.inflowCsScaleFloor) * ramp(caps.customerSuccess, ke.csRamp[0], ke.csRamp[1]);
  const effEntDemand = market.enterpriseDemand * (1 - ke.inflowMacro * market.macroPressure);
  const entCapTerm = posScale(ke.inflowCapabilityAmplitude * Math.tanh(relativeCapability.enterprise / ke.inflowCapabilityScale), fc.enterprise);
  const entInflowMkt = ke.baseInflow * (effEntDemand - 1);
  const entInflowCap = ke.baseInflow * effEntDemand * entCapTerm;
  const entInflowDep = ke.baseInflow * effEntDemand * (scalePositive(entCapTerm, csScale) - entCapTerm);
  const entResolution = -ke.resolutionRate * opening.enterprisePipeline;
  const entInflowTotal = ke.baseInflow + entInflowMkt + entInflowCap + entInflowDep;
  const enterprisePipeline = finish({
    indicator: 'enterprisePipeline',
    kind: 'stock',
    opening: opening.enterprisePipeline,
    baseInflow: ke.baseInflow,
    marketContribution: entInflowMkt,
    capabilityContribution: entInflowCap,
    dependencyContribution: entInflowDep,
    decayOrAttrition: entResolution,
    bounds: [0, Number.POSITIVE_INFINITY],
    target: entInflowTotal / ke.resolutionRate,
    drivers: [
      { label: 'relative Enterprise capability', value: relativeCapability.enterprise },
      { label: 'capability inflow term (tanh)', value: entCapTerm },
      { label: 'Customer Success scalability scale', value: csScale },
      { label: 'new qualified pipeline', value: entInflowTotal },
      { label: 'pipeline resolved (won/lost/expired)', value: -entResolution },
    ],
  });

  // ---- Enterprise Win Rate ----
  const csLimit = ramp(caps.customerSuccess, ke.csLimitRamp[0], ke.csLimitRamp[1]);
  const entStrength = ramp(caps.enterprise, ke.enterpriseStrengthRamp[0], ke.enterpriseStrengthRamp[1]);
  const winCapRaw = ke.winPerRelCapability * relativeCapability.enterprise;
  const winAiRaw = ke.winAiSynergy * aiEffect * entStrength;
  const winCap = posScale(scalePositive(winCapRaw, csLimit) + winAiRaw * csLimit, fc.enterprise);
  const winDep =
    ke.winPerProductQuality * (pq - 70) +
    ke.winPerTrust * (trust - 70) +
    ke.winPerCustomerSuccess * (caps.customerSuccess - 30) +
    ke.winPerExecution * (caps.execution - 60);
  const winMkt =
    ke.winMktDemand * (market.enterpriseDemand - 1) +
    ke.winMktAIDemand * (market.enterpriseAIDemand - 1) * aiEffect -
    ke.winMktMacro * market.macroPressure;
  const enterpriseWinRate = levelIndicator(
    'enterpriseWinRate', opening.enterpriseWinRate, V2_COMMERCIAL_START.enterpriseWinRate, ke.winRateSpeed,
    ke.winRateBounds, winMkt, winCap, winDep,
    [
      { label: 'relative Enterprise capability', value: relativeCapability.enterprise },
      { label: 'Customer Success limit on upside', value: csLimit },
      { label: 'AI × Enterprise synergy (CS-limited)', value: winAiRaw * csLimit },
      { label: 'Customer Success term', value: ke.winPerCustomerSuccess * (caps.customerSuccess - 30) },
      { label: 'Trust term', value: ke.winPerTrust * (trust - 70) },
      { label: 'Product Quality term', value: ke.winPerProductQuality * (pq - 70) },
      { label: 'Execution term', value: ke.winPerExecution * (caps.execution - 60) },
    ]
  );

  // ---- AI Commercial Readiness (calculated) ----
  const aiCommercialReadiness = finish({
    indicator: 'aiCommercialReadiness',
    kind: 'calculated',
    opening: opening.aiCommercialReadiness,
    baseInflow: 0,
    marketContribution: 0,
    capabilityContribution: aiReadiness.capabilityOnlyScore - opening.aiCommercialReadiness,
    dependencyContribution: aiReadiness.readiness - aiReadiness.capabilityOnlyScore,
    decayOrAttrition: 0,
    bounds: [0, 100],
    target: aiReadiness.readiness,
    drivers: [
      { label: `AI Capability (${aiReadiness.band})`, value: aiReadiness.aiCapability },
      { label: 'capability-only readiness', value: aiReadiness.capabilityOnlyScore },
      { label: 'support multiplier (PQ/Talent/Execution)', value: aiReadiness.supportMultiplier },
    ],
  });

  // ---- AI Adoption Index (lagged) ----
  const ka = K.ai;
  const adoptRamp = (r: number) => ramp(r, ka.adoptionReadinessRamp[0], ka.adoptionReadinessRamp[1]);
  const adoptCap = ka.adoptionAmplitude * adoptRamp(aiReadiness.capabilityOnlyScore);
  const adoptDep = ka.adoptionAmplitude * (adoptRamp(aiReadiness.readiness) - adoptRamp(aiReadiness.capabilityOnlyScore));
  const adoptMkt = ka.adoptionAmplitude * adoptRamp(aiReadiness.readiness) * (market.aiNativeDemand - 1);
  const aiAdoptionIndex = levelIndicator(
    'aiAdoptionIndex', opening.aiAdoptionIndex, V2_COMMERCIAL_START.aiAdoptionIndex, ka.adoptionSpeed,
    ka.adoptionBounds, adoptMkt, adoptCap, adoptDep,
    [
      { label: 'AI readiness', value: aiReadiness.readiness },
      { label: 'AI-native demand', value: market.aiNativeDemand },
    ]
  );

  // ---- University Pipeline (stock) ----
  const ku = K.university;
  const trustSupport = ramp(trust, ku.trustRamp[0], ku.trustRamp[1]);
  const effUniDemand = market.universityDemand * (1 - ku.inflowMacro * market.macroPressure);
  const uniCapTerm = posScale(ku.inflowCapabilityAmplitude * Math.tanh(relativeCapability.credential / ku.inflowCapabilityScale), fc.university);
  const uniInflowMkt = ku.baseInflow * (effUniDemand - 1);
  const uniInflowCap = ku.baseInflow * effUniDemand * uniCapTerm;
  const uniInflowDep = ku.baseInflow * effUniDemand * (scalePositive(uniCapTerm, trustSupport) - uniCapTerm);
  const uniResolution = -ku.resolutionRate * opening.universityPipeline;
  const uniInflowTotal = ku.baseInflow + uniInflowMkt + uniInflowCap + uniInflowDep;
  const universityPipeline = finish({
    indicator: 'universityPipeline',
    kind: 'stock',
    opening: opening.universityPipeline,
    baseInflow: ku.baseInflow,
    marketContribution: uniInflowMkt,
    capabilityContribution: uniInflowCap,
    dependencyContribution: uniInflowDep,
    decayOrAttrition: uniResolution,
    bounds: [0, Number.POSITIVE_INFINITY],
    target: uniInflowTotal / ku.resolutionRate,
    drivers: [
      { label: 'relative Credential capability', value: relativeCapability.credential },
      { label: 'Trust support on capability upside', value: trustSupport },
      { label: 'new qualified pipeline', value: uniInflowTotal },
      { label: 'pipeline resolved (won/lost/expired)', value: -uniResolution },
    ],
  });

  // ---- University Renewal Rate ----
  const renCap = posScale(scalePositive(ku.renewalPerRelCapability * relativeCapability.credential, trustSupport), fc.university);
  const renDep = ku.renewalPerTrust * (trust - 70);
  const renMkt = ku.renewalMktDemand * (market.universityDemand - 1) - ku.renewalMktMacro * market.macroPressure;
  const universityRenewalRate = levelIndicator(
    'universityRenewalRate', opening.universityRenewalRate, V2_COMMERCIAL_START.universityRenewalRate, ku.renewalSpeed,
    ku.renewalBounds, renMkt, renCap, renDep,
    [
      { label: 'relative Credential capability', value: relativeCapability.credential },
      { label: 'Trust support on capability upside', value: trustSupport },
      { label: 'Trust term', value: renDep },
    ]
  );

  // ---- Pricing Power (slow composite) ----
  const kp = K.pricing;
  const ppCap = posScale(kp.aiDifferentiation * aiEffect + kp.perRelCapability * ((relativeCapability.consumer + relativeCapability.enterprise) / 2), fc.premium);
  const ppDep = posScale(kp.perProductQuality * (pq - 70) + kp.perTrust * (trust - 70), fc.premium);
  const ppMkt = -kp.mktCommoditization * market.consumerCommoditization - kp.mktMacro * market.macroPressure;
  const pricingPower = levelIndicator(
    'pricingPower', opening.pricingPower, V2_COMMERCIAL_START.pricingPower, kp.speed,
    kp.bounds, ppMkt, ppCap, ppDep,
    [
      { label: 'AI differentiation', value: kp.aiDifferentiation * aiEffect },
      { label: 'relative capability (avg Consumer/Enterprise)', value: (relativeCapability.consumer + relativeCapability.enterprise) / 2 },
      { label: 'Product Quality term', value: kp.perProductQuality * (pq - 70) },
      { label: 'Trust term', value: kp.perTrust * (trust - 70) },
    ]
  );

  const indicators = [
    consumerRetention,
    consumerCacIndex,
    enterprisePipeline,
    enterpriseWinRate,
    aiCommercialReadiness,
    aiAdoptionIndex,
    universityPipeline,
    universityRenewalRate,
    pricingPower,
  ];

  return {
    quarter,
    market: { ...market, competitorProgress: { ...market.competitorProgress }, segmentCapacity: { ...market.segmentCapacity } },
    competitorBenchmarks,
    relativeCapability,
    aiReadiness,
    indicators,
    closing: {
      consumerRetention: consumerRetention.closing,
      consumerCacIndex: consumerCacIndex.closing,
      enterprisePipeline: enterprisePipeline.closing,
      enterpriseWinRate: enterpriseWinRate.closing,
      aiAdoptionIndex: aiAdoptionIndex.closing,
      aiCommercialReadiness: aiCommercialReadiness.closing,
      universityPipeline: universityPipeline.closing,
      universityRenewalRate: universityRenewalRate.closing,
      pricingPower: pricingPower.closing,
      competitorBenchmarks,
    },
  };
}
