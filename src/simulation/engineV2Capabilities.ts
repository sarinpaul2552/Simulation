/**
 * V2 Simulation Engine — Phase 2B: Capability & Investment Pipeline
 *
 * Strategic Investment → Diminishing Returns (calibrated curves)
 *   → Transformation Load / Organizational Absorption
 *   → Capability Creation (investment cohorts)
 *   → Lagged Maturation
 *
 * Conceptually separate from the Phase 2A financial ledger (engineV2.ts):
 * this module never touches cash, revenue or operating cost. It produces a
 * `V2CapabilityConsequence` that is audited independently of the ledger.
 *
 * Self-contained: imports nothing from the frozen V1 engine.
 *
 * NOT in Phase 2B: revenue effects of any kind, pipeline/win rate, CAC/retention,
 * market events, Q4 destinations, financing, insolvency, scoring, switching
 * penalties, Q7 crises, People recurring opex commitments.
 */

// ============ TYPES ============

/** Investment buckets that create capability (Cash Reserve creates nothing). */
export type V2CapabilityBucket = 'consumer' | 'enterprise' | 'aiProduct' | 'people' | 'universityCredentials';

/**
 * State variables that investment curves can move.
 * Customer Success is a separate capability (not an allocation bucket) developed as a
 * secondary effect of Enterprise investment (Phase 2C calibration patch).
 * Execution, Culture, Innovation Velocity and Technical Debt exist in state but have
 * no approved Draft 1 curve yet, so nothing targets them.
 */
export type V2CapabilityTarget =
  | 'consumer'
  | 'enterprise'
  | 'customerSuccess'
  | 'ai'
  | 'talent'
  | 'credential'
  | 'organizationalCapacity'
  | 'productQuality'
  | 'trust';

export const V2_CAPABILITY_TARGETS: V2CapabilityTarget[] = [
  'consumer',
  'enterprise',
  'customerSuccess',
  'ai',
  'talent',
  'credential',
  'organizationalCapacity',
  'productQuality',
  'trust',
];

/** All Phase 2B targets are 0–100 indices. */
export const V2_CAPABILITY_MAX = 100;

export interface V2TargetCurve {
  target: V2CapabilityTarget;
  /** Gain at each calibration point in V2_CALIBRATION_POINTS. */
  points: readonly number[];
}

export interface V2BucketCurve {
  bucket: V2CapabilityBucket;
  gains: readonly V2TargetCurve[];
  /** Bucket Transformation Load at each calibration point (coordination load is added separately). */
  load: readonly number[];
  /** Capability maturation schedule: share maturing in Q, Q+1, Q+2 … (sums to 1). */
  maturationSchedule: readonly number[];
}

/** One gain line inside an investment cohort. */
export interface V2CohortGain {
  target: V2CapabilityTarget;
  /** Uncapped gain from the calibration curve. */
  nominalGain: number;
  /** nominalGain × absorptionFactor (still uncapped). */
  effectiveGain: number;
  /** Portion of effectiveGain scheduled to mature in the most recent quarter processed. */
  maturedThisQuarter: number;
  maturedToDate: number;
  remaining: number;
}

/** One quarter's investment in one bucket, tracked until fully matured. */
export interface V2InvestmentCohort {
  id: string;
  quarterInvested: number;
  bucket: V2CapabilityBucket;
  amount: number;
  /** This bucket's own calibrated load (excludes quarter-level coordination load). */
  transformationLoad: number;
  absorptionFactor: number;
  maturationSchedule: number[];
  gains: V2CohortGain[];
}

/**
 * V2-native capability set (Architecture §7; Notion "Core company capabilities").
 * Product Quality and Trust are also core V2 capabilities but live on the state
 * alongside Culture, as in the starting-company model. V1's `growth` is not carried.
 * Values 0–100.
 */
export interface V2Capabilities {
  consumer: number;
  enterprise: number;
  ai: number;
  talent: number;
  credential: number;
  customerSuccess: number;
  execution: number;
}

/** The capability-relevant slice of V2 state. Explicit fields only. */
export interface V2CapabilityState {
  capabilities: V2Capabilities;
  productQuality: number;
  culture: number;
  trust: number;
  organizationalCapacity: number;
  transformationLoad: number;
  innovationVelocity: number;
  technicalDebt: number;
  pendingCohorts: V2InvestmentCohort[];
}

export interface V2BucketInvestmentDetail {
  bucket: V2CapabilityBucket;
  amount: number;
  transformationLoad: number;
  nominalGains: { target: V2CapabilityTarget; nominalGain: number }[];
}

export interface V2MaturationEntry {
  cohortId: string;
  quarterInvested: number;
  bucket: V2CapabilityBucket;
  target: V2CapabilityTarget;
  /** Quarters since investment (0 = same quarter). */
  offset: number;
  scheduleShare: number;
  matured: number;
  remainingAfter: number;
}

export interface V2TargetSummary {
  target: V2CapabilityTarget;
  opening: number;
  /** Nominal gain created by this quarter's new cohorts (uncapped). */
  nominalNew: number;
  /** Effective (absorption-adjusted) gain created this quarter (uncapped). */
  effectiveNew: number;
  /** nominalNew − effectiveNew: creation lost to absorption this quarter. */
  absorptionLoss: number;
  /** Gross gain maturing this quarter from all cohorts (uncapped). */
  maturedThisQuarter: number;
  /** Portion of maturedThisQuarter actually added to the stock. */
  realized: number;
  /** Portion of maturedThisQuarter lost because the stock hit 100. */
  wastedSaturation: number;
  /** Effective gain still pending in cohorts after this quarter. */
  pendingAfter: number;
  closing: number;
}

export interface V2CapabilityConsequence {
  quarter: number;
  openingOrganizationalCapacity: number;
  buckets: V2BucketInvestmentDetail[];
  /** Σ per-bucket calibrated loads. */
  bucketLoad: number;
  /** Buckets (never Cash Reserve) with ≥ V2_ACTIVE_INITIATIVE_THRESHOLD this quarter. */
  activeInitiatives: V2CapabilityBucket[];
  /** Initiative breadth / coordination load from the active-initiative count (focus may merge aligned initiatives). */
  coordinationLoad: number;
  /** Destination focus: load removed from aligned buckets (0 without a destination). */
  alignedLoadReduction: number;
  /** Destination transition load added this quarter (0 without a destination). */
  transitionLoad: number;
  /** Capability ceiling applied per target this quarter (100 unless a destination raises it). */
  ceilings: Record<V2CapabilityTarget, number>;
  /** Total Transformation Load = bucketLoad − alignedLoadReduction + coordinationLoad + transitionLoad. */
  transformationLoad: number;
  loadToCapacityRatio: number;
  absorptionFactor: number;
  newCohorts: V2InvestmentCohort[];
  maturation: V2MaturationEntry[];
  targets: V2TargetSummary[];
  /** Cohorts still maturing after this quarter (snapshots). */
  pendingCohortsAfter: V2InvestmentCohort[];
  /** Cohorts that finished maturing this quarter (snapshots). */
  completedCohorts: V2InvestmentCohort[];
  closing: Omit<V2CapabilityState, 'pendingCohorts'>;
}

// ============ DRAFT 1 CALIBRATION ============

/** Calibration investment points ($M per bucket per quarter). */
export const V2_CALIBRATION_POINTS = [0, 5, 10, 20, 30] as const;
export const V2_MAX_CALIBRATED_BUCKET = 30;

export const V2_BUCKET_CURVES: Record<V2CapabilityBucket, V2BucketCurve> = {
  consumer: {
    bucket: 'consumer',
    gains: [{ target: 'consumer', points: [0, 5, 9, 14, 17] }],
    load: [0, 6, 11, 20, 28],
    maturationSchedule: [0.5, 0.35, 0.15],
  },
  enterprise: {
    bucket: 'enterprise',
    gains: [
      { target: 'enterprise', points: [0, 6, 11, 17, 21] },
      // Secondary Customer Success development: same cohort, absorption and 25/45/30 schedule.
      { target: 'customerSuccess', points: [0, 1, 2, 3.5, 5] },
    ],
    load: [0, 5, 10, 18, 26],
    maturationSchedule: [0.25, 0.45, 0.3],
  },
  aiProduct: {
    bucket: 'aiProduct',
    gains: [{ target: 'ai', points: [0, 7, 13, 21, 27] }],
    load: [0, 7, 13, 23, 32],
    maturationSchedule: [0.2, 0.4, 0.4],
  },
  people: {
    bucket: 'people',
    gains: [
      { target: 'talent', points: [0, 4, 7, 11, 13] },
      { target: 'organizationalCapacity', points: [0, 3, 6, 10, 12] },
      { target: 'productQuality', points: [0, 0.5, 1.0, 1.8, 2.2] },
    ],
    load: [0, 3, 6, 11, 16],
    maturationSchedule: [0.5, 0.35, 0.15],
  },
  universityCredentials: {
    bucket: 'universityCredentials',
    gains: [
      { target: 'credential', points: [0, 5, 9, 14, 17] },
      { target: 'trust', points: [0, 0.5, 1, 2, 2.5] },
    ],
    load: [0, 4, 8, 15, 22],
    maturationSchedule: [0.2, 0.4, 0.4],
  },
};

export const V2_CAPABILITY_BUCKETS: V2CapabilityBucket[] = [
  'consumer',
  'enterprise',
  'aiProduct',
  'people',
  'universityCredentials',
];

/**
 * Organizational absorption curve: (Transformation Load ÷ opening Org Capacity) → effectiveness.
 * Draft 1 recalibration (Phase 2B cleanup), continuous piecewise-linear:
 *   ≤0.30 → 1.00; 0.50 → 0.95; 0.70 → 0.85; 0.90 → 0.70; 1.10 → 0.50; ≥1.30 → 0.40.
 */
export const V2_ABSORPTION_POINTS: readonly (readonly [number, number])[] = [
  [0, 1.0],
  [0.3, 1.0],
  [0.5, 0.95],
  [0.7, 0.85],
  [0.9, 0.7],
  [1.1, 0.5],
  [1.3, 0.4],
];
export const V2_ABSORPTION_FLOOR = 0.4;

/** A non-Cash-Reserve bucket receiving at least this much ($M) in a quarter is an active initiative. */
export const V2_ACTIVE_INITIATIVE_THRESHOLD = 2;

/**
 * Initiative breadth / coordination load, indexed by number of active initiatives (0–5).
 * 0–1 → 0; 2 → 1; 3 → 3; 4 → 6; 5 → 10.
 */
export const V2_COORDINATION_LOAD: readonly number[] = [0, 0, 1, 3, 6, 10];

export function countActiveInitiatives(investment: Record<V2CapabilityBucket, number>): V2CapabilityBucket[] {
  return V2_CAPABILITY_BUCKETS.filter(b => investment[b] >= V2_ACTIVE_INITIATIVE_THRESHOLD);
}

export function coordinationLoad(activeInitiatives: number): number {
  if (!Number.isInteger(activeInitiatives) || activeInitiatives < 0 || activeInitiatives >= V2_COORDINATION_LOAD.length) {
    throw new Error(`Active initiative count must be an integer 0–${V2_COORDINATION_LOAD.length - 1}, got ${activeInitiatives}`);
  }
  return V2_COORDINATION_LOAD[activeInitiatives];
}

// ============ CURVES ============

/**
 * Deterministic piecewise-linear interpolation over V2_CALIBRATION_POINTS.
 * Rejects negative amounts and amounts above the calibrated $30M (no extrapolation).
 */
export function interpolateCurve(points: readonly number[], amount: number): number {
  if (points.length !== V2_CALIBRATION_POINTS.length) {
    throw new Error(`Curve must have ${V2_CALIBRATION_POINTS.length} calibration points`);
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Investment amount must be a non-negative finite number, got ${amount}`);
  }
  if (amount > V2_MAX_CALIBRATED_BUCKET + 1e-9) {
    throw new Error(
      `Investment of $${amount}M exceeds the calibrated range ($${V2_MAX_CALIBRATED_BUCKET}M per bucket); ` +
        `no extrapolation beyond the Draft 1 calibration`
    );
  }
  for (let i = 1; i < V2_CALIBRATION_POINTS.length; i++) {
    const x0 = V2_CALIBRATION_POINTS[i - 1];
    const x1 = V2_CALIBRATION_POINTS[i];
    if (amount <= x1) {
      const t = (amount - x0) / (x1 - x0);
      return points[i - 1] + t * (points[i] - points[i - 1]);
    }
  }
  return points[points.length - 1];
}

export function calculateAbsorptionFactor(loadToCapacityRatio: number): number {
  if (!Number.isFinite(loadToCapacityRatio) || loadToCapacityRatio < 0) {
    throw new Error(`Load/capacity ratio must be a non-negative finite number, got ${loadToCapacityRatio}`);
  }
  const pts = V2_ABSORPTION_POINTS;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (loadToCapacityRatio <= x1) {
      return y0 + ((loadToCapacityRatio - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return V2_ABSORPTION_FLOOR;
}

export function bucketTransformationLoad(bucket: V2CapabilityBucket, amount: number): number {
  return interpolateCurve(V2_BUCKET_CURVES[bucket].load, amount);
}

export function bucketNominalGains(
  bucket: V2CapabilityBucket,
  amount: number
): { target: V2CapabilityTarget; nominalGain: number }[] {
  return V2_BUCKET_CURVES[bucket].gains.map(g => ({ target: g.target, nominalGain: interpolateCurve(g.points, amount) }));
}

// ============ STATE ACCESS (explicit, no generic bags) ============

export function readTarget(s: Omit<V2CapabilityState, 'pendingCohorts'>, target: V2CapabilityTarget): number {
  switch (target) {
    case 'consumer': return s.capabilities.consumer;
    case 'enterprise': return s.capabilities.enterprise;
    case 'customerSuccess': return s.capabilities.customerSuccess;
    case 'ai': return s.capabilities.ai;
    case 'talent': return s.capabilities.talent;
    case 'credential': return s.capabilities.credential;
    case 'organizationalCapacity': return s.organizationalCapacity;
    case 'productQuality': return s.productQuality;
    case 'trust': return s.trust;
  }
}

function writeTarget(s: Omit<V2CapabilityState, 'pendingCohorts'>, target: V2CapabilityTarget, value: number): void {
  switch (target) {
    case 'consumer': s.capabilities.consumer = value; return;
    case 'enterprise': s.capabilities.enterprise = value; return;
    case 'customerSuccess': s.capabilities.customerSuccess = value; return;
    case 'ai': s.capabilities.ai = value; return;
    case 'talent': s.capabilities.talent = value; return;
    case 'credential': s.capabilities.credential = value; return;
    case 'organizationalCapacity': s.organizationalCapacity = value; return;
    case 'productQuality': s.productQuality = value; return;
    case 'trust': s.trust = value; return;
  }
}

function cloneCohort(c: V2InvestmentCohort): V2InvestmentCohort {
  return { ...c, maturationSchedule: [...c.maturationSchedule], gains: c.gains.map(g => ({ ...g })) };
}

const REMAINING_EPS = 1e-12;

// ============ QUARTER CONSEQUENCE ============

export interface V2CapabilityInvestment {
  consumer: number;
  enterprise: number;
  aiProduct: number;
  people: number;
  universityCredentials: number;
}

/**
 * Capability consequence for one quarter. Pure: does not mutate `opening`.
 *
 * 1. Nominal gain and load per bucket from calibrated curves (interpolated).
 * 2. Transformation Load = Σ bucket loads + coordination load (active-initiative breadth).
 * 3. Absorption factor from Load ÷ opening Organizational Capacity.
 * 4. New cohorts: effectiveGain = nominalGain × factor (existing stock untouched).
 * 5. All cohorts (pending + new) mature their scheduled tranche this quarter.
 * 6. Tranches summed per target, added to stock, capped at 100; excess reported as wasted.
 */
/**
 * Optional strategic focus (Batch 2 · Q4 destinations). Absent = no destination: behaviour is
 * identical to Phase 2B/2C. Supplied by engineV2Destination (structurally compatible).
 */
export interface V2CapabilityFocus {
  alignedBuckets: V2CapabilityBucket[];
  /** Multiplier on aligned buckets' calibrated load (≤ 1). */
  alignedLoadMultiplier: number;
  /** 0 = full coordination count; 1 = aligned active initiatives count as one. */
  coordinationMergeWeight: number;
  /** Organizational transition load added this quarter. */
  transitionLoad: number;
  /** Per-target capability ceiling (default V2_CAPABILITY_MAX). */
  ceilings: Partial<Record<V2CapabilityTarget, number>>;
}

export function calculateV2CapabilityConsequence(
  opening: V2CapabilityState,
  investment: V2CapabilityInvestment,
  quarter: number,
  focus?: V2CapabilityFocus
): V2CapabilityConsequence {
  // 1. Per-bucket nominal gains and load
  const buckets: V2BucketInvestmentDetail[] = V2_CAPABILITY_BUCKETS.map(bucket => {
    const amount = investment[bucket];
    return {
      bucket,
      amount,
      transformationLoad: bucketTransformationLoad(bucket, amount),
      nominalGains: bucketNominalGains(bucket, amount),
    };
  });

  // 2–3. Aggregate load (bucket + coordination) and absorption
  const bucketLoad = buckets.reduce((s, b) => s + b.transformationLoad, 0);
  const activeInitiatives = countActiveInitiatives(investment);
  const aligned = new Set(focus?.alignedBuckets ?? []);
  const alignedLoadReduction = buckets
    .filter(b => aligned.has(b.bucket))
    .reduce((s, b) => s + b.transformationLoad * (1 - (focus?.alignedLoadMultiplier ?? 1)), 0);
  const fullCoordination = coordinationLoad(activeInitiatives.length);
  const alignedActive = activeInitiatives.filter(b => aligned.has(b)).length;
  const mergedCount = activeInitiatives.length - alignedActive + (alignedActive > 0 ? 1 : 0);
  const w = focus?.coordinationMergeWeight ?? 0;
  const coordination = (1 - w) * fullCoordination + w * coordinationLoad(mergedCount);
  const transitionLoad = focus?.transitionLoad ?? 0;
  const transformationLoad = bucketLoad - alignedLoadReduction + coordination + transitionLoad;
  const openingOrganizationalCapacity = opening.organizationalCapacity;
  if (!(openingOrganizationalCapacity > 0)) {
    throw new Error(`Organizational Capacity must be positive, got ${openingOrganizationalCapacity}`);
  }
  const loadToCapacityRatio = transformationLoad / openingOrganizationalCapacity;
  const absorptionFactor = calculateAbsorptionFactor(loadToCapacityRatio);

  // 4. New cohorts
  const newCohorts: V2InvestmentCohort[] = buckets
    .filter(b => b.amount > 0)
    .map(b => ({
      id: `Q${quarter}-${b.bucket}`,
      quarterInvested: quarter,
      bucket: b.bucket,
      amount: b.amount,
      transformationLoad: b.transformationLoad,
      absorptionFactor,
      maturationSchedule: [...V2_BUCKET_CURVES[b.bucket].maturationSchedule],
      gains: b.nominalGains.map(g => {
        const effectiveGain = g.nominalGain * absorptionFactor;
        return {
          target: g.target,
          nominalGain: g.nominalGain,
          effectiveGain,
          maturedThisQuarter: 0,
          maturedToDate: 0,
          remaining: effectiveGain,
        };
      }),
    }));

  // 5. Maturation across all cohorts
  const allCohorts = [...opening.pendingCohorts.map(cloneCohort), ...newCohorts.map(cloneCohort)];
  const maturation: V2MaturationEntry[] = [];
  const maturedByTarget = new Map<V2CapabilityTarget, number>();

  for (const cohort of allCohorts) {
    const offset = quarter - cohort.quarterInvested;
    for (const g of cohort.gains) {
      g.maturedThisQuarter = 0;
      if (offset < 0 || offset >= cohort.maturationSchedule.length || g.remaining <= REMAINING_EPS) continue;
      const share = cohort.maturationSchedule[offset];
      const isFinalTranche = offset === cohort.maturationSchedule.length - 1;
      // Final tranche releases the exact remainder so cohorts close without float drift.
      const tranche = isFinalTranche ? g.remaining : g.effectiveGain * share;
      g.maturedThisQuarter = tranche;
      g.maturedToDate += tranche;
      g.remaining = isFinalTranche ? 0 : g.remaining - tranche;
      maturedByTarget.set(g.target, (maturedByTarget.get(g.target) ?? 0) + tranche);
      maturation.push({
        cohortId: cohort.id,
        quarterInvested: cohort.quarterInvested,
        bucket: cohort.bucket,
        target: g.target,
        offset,
        scheduleShare: share,
        matured: tranche,
        remainingAfter: g.remaining,
      });
    }
  }

  const isComplete = (c: V2InvestmentCohort) =>
    quarter - c.quarterInvested >= c.maturationSchedule.length - 1 || c.gains.every(g => g.remaining <= REMAINING_EPS);
  const pendingCohortsAfter = allCohorts.filter(c => !isComplete(c));
  const completedCohorts = allCohorts.filter(isComplete);

  // 6. Apply to stock with cap
  const closing: Omit<V2CapabilityState, 'pendingCohorts'> = {
    capabilities: { ...opening.capabilities },
    productQuality: opening.productQuality,
    culture: opening.culture,
    trust: opening.trust,
    organizationalCapacity: opening.organizationalCapacity,
    transformationLoad,
    innovationVelocity: opening.innovationVelocity,
    technicalDebt: opening.technicalDebt,
  };

  const ceilings = Object.fromEntries(
    V2_CAPABILITY_TARGETS.map(t => [t, focus?.ceilings[t] ?? V2_CAPABILITY_MAX])
  ) as Record<V2CapabilityTarget, number>;

  const targets: V2TargetSummary[] = V2_CAPABILITY_TARGETS.map(target => {
    const openingValue = readTarget(opening, target);
    const matured = maturedByTarget.get(target) ?? 0;
    const uncapped = openingValue + matured;
    const closingValue = Math.min(ceilings[target], uncapped);
    // Stock already above the cap (not reachable from baseline) is left as-is, never reduced.
    const finalValue = Math.max(openingValue, closingValue);
    writeTarget(closing, target, finalValue);

    const nominalNew = newCohorts.reduce(
      (s, c) => s + c.gains.filter(g => g.target === target).reduce((t, g) => t + g.nominalGain, 0),
      0
    );
    const effectiveNew = newCohorts.reduce(
      (s, c) => s + c.gains.filter(g => g.target === target).reduce((t, g) => t + g.effectiveGain, 0),
      0
    );
    const pendingAfter = pendingCohortsAfter.reduce(
      (s, c) => s + c.gains.filter(g => g.target === target).reduce((t, g) => t + g.remaining, 0),
      0
    );
    const realized = finalValue - openingValue;
    return {
      target,
      opening: openingValue,
      nominalNew,
      effectiveNew,
      absorptionLoss: nominalNew - effectiveNew,
      maturedThisQuarter: matured,
      realized,
      wastedSaturation: matured - realized,
      pendingAfter,
      closing: finalValue,
    };
  });

  return {
    quarter,
    openingOrganizationalCapacity,
    buckets,
    bucketLoad,
    activeInitiatives,
    coordinationLoad: coordination,
    alignedLoadReduction,
    transitionLoad,
    ceilings,
    transformationLoad,
    loadToCapacityRatio,
    absorptionFactor,
    // New cohorts as they stand after this quarter's first tranche
    newCohorts: allCohorts.filter(c => c.quarterInvested === quarter).map(cloneCohort),
    maturation,
    targets,
    pendingCohortsAfter: pendingCohortsAfter.map(cloneCohort),
    completedCohorts: completedCohorts.map(cloneCohort),
    closing,
  };
}
