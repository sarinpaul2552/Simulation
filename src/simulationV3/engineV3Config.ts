/**
 * NEXLEARN V3 ECONOMICS — mechanism switches and calibration (Batch 10B/10C).
 *
 * The V3 engine (`src/simulationV3/`) is a fork of the frozen V2 engine (`src/simulation/`, untouched). Every V3
 * mechanism reads its switch and constants from this object at call time, so:
 *   - with every switch OFF and the V2 market arc, V3 reproduces V2 exactly (parity test `v3parity.test.ts`);
 *   - the laboratory (`scripts/lab/v3/`) can switch one mechanism at a time to attribute its effect.
 * Production code never changes these values; `withV3Economics` is for the laboratory and tests only and always
 * restores the previous values.
 *
 * V3.1 Stage 2 — engine versioning. Each V3 engine version has its own registered, frozen configuration
 * (`V3_CONFIGS`). `V3_ECONOMICS` is the *active* configuration the engine modules read; it holds the v3-econ-1.0
 * values at rest. `withV3Version(version, fn)` makes a version's configuration active for the duration of `fn` and
 * restores the previous values afterwards (even on error). The production facade (`production/v2/engine.ts`) wraps every
 * V3 call in the game's own version, so a game always computes with the configuration of the version it was created
 * with, and a later version can receive economic changes without altering earlier ones.
 *
 * Each mechanism is documented with its economic rationale in docs/BATCH10B_V3_ECONOMIC_REPORT.md.
 */
export interface V3Mechanisms {
  /** E1 · AI-native revenue converges to a level set by adoption (instead of adoption adding new revenue every quarter). */
  aiRevenueLevel: boolean;
  /** E2 · Enterprise capability converts: stronger pipeline and win-rate response, faster go-live, lighter delivery commitment. */
  enterpriseConversion: boolean;
  /** E3 · University: Credential capability drives institutional wins and pipeline; wins go live sooner. */
  universityConversion: boolean;
  /** E4 · Organizational health: overload erodes culture, low culture erodes execution and customer success, culture recovers. */
  organizationalHealth: boolean;
  /** E5 · Q5 contract implementation cost is a claim on the quarter's strategic budget (counted once). */
  contractEnvelopeClaim: boolean;
  /** E6 · The Q6 recession requires an explicit stance (protect, slow or cut). */
  recessionStance: boolean;
  /** E7 · Financing raised in a quarter can expand that quarter's investment budget, within limits. */
  financingExpansion: boolean;
  /**
   * Stage 3A (v3-econ-1.1) · Existing customers respond to the market: consumer customers lapse with weak demand and
   * recession (shielded by strong retention) and return as demand recovers; enterprise customers cut seats at renewal
   * in a recession (shielded by Customer Success) and restore them as it eases; enterprise expansion follows demand.
   */
  installedBaseDemand: boolean;
  /**
   * Stage 3A (v3-econ-1.1) · Credit cycle: floating-rate debt repriced every quarter with a market-wide credit spread,
   * a leverage spread that widens in a recession, a liquidity credit for strong cash buffers, and debt capacity that
   * tightens with recession pressure.
   */
  creditCycle: boolean;
  /**
   * Stage 3B (v3-econ-1.1) · Enterprise deal conversion follows enterprise demand: the win-rate contribution of the
   * company's Enterprise capability (what Enterprise investment buys) is scaled by
   * clamp(1 + winCapDemandSensitivity × (enterpriseDemand − 1), winCapDemandBounds). Win rate → bookings → recognition.
   */
  enterpriseDemandConversion: boolean;
}

/** Every V3 engine version, oldest first. A version, once released, is never edited — later economics get a new version. */
export const V3_ENGINE_VERSIONS = ['v3-econ-1.0', 'v3-econ-1.1'] as const;
export type V3EngineVersion = (typeof V3_ENGINE_VERSIONS)[number];
/** The version new V3 sessions use unless one is selected explicitly. */
export const V3_DEFAULT_ENGINE_VERSION: V3EngineVersion = 'v3-econ-1.0';
export const isV3EngineVersion = (v: unknown): v is V3EngineVersion => typeof v === 'string' && (V3_ENGINE_VERSIONS as readonly string[]).includes(v);

export const V3_ECONOMICS = {
  version: 'v3-econ-1.0' as V3EngineVersion,
  mechanisms: {
    aiRevenueLevel: true,
    enterpriseConversion: true,
    universityConversion: true,
    organizationalHealth: true,
    contractEnvelopeClaim: true,
    recessionStance: true,
    financingExpansion: true,
    // Stage 3A mechanisms: explicitly off in 1.0 (explicit keys so a version switch always restores them)
    installedBaseDemand: false,
    creditCycle: false,
    enterpriseDemandConversion: false,
  } as V3Mechanisms,
  /** E1 — AI-native revenue level. target = base + perPoint × (adoption − 10) × demand × quality × macro; moves `speed` of the gap per quarter. */
  ai: {
    revenuePerAdoptionPoint: 0.3, convergenceSpeed: 0.35,
    /**
     * Stage 3A (moved from engineV3Revenue `aiNative.macroMonetization`, value unchanged for 1.0): AI-native new
     * monetization × (1 − macroMonetization × macroPressure) — buyer funding/procurement pressure.
     */
    macroMonetization: 0.15,
  },
  /** E2 — Enterprise conversion. */
  enterprise: {
    winPerRelCapability: 0.2,
    inflowCapabilityAmplitude: 2.4,
    recognition: [[1, 0.5], [2, 0.5]] as readonly (readonly [number, number])[],
    /** Multiplier on the Enterprise investment's recurring delivery commitment (V2: 4% of the investment per quarter for 6 quarters). */
    deliveryCommitmentScale: 0.5,
    /** Stage 3B (enterpriseDemandConversion only; inactive in 1.0): demand sensitivity of the capability win-rate term. */
    winCapDemandSensitivity: 0,
    winCapDemandBounds: [1, 1] as readonly number[],
  },
  /** E3 — University conversion. win rate = base × (1 + perTrust × (trust − 70)) + perRelCredential × relative Credential (bounded). */
  university: {
    winPerRelCredential: 0.004,
    winRateBounds: [0.15, 0.55] as const,
    inflowCapabilityAmplitude: 4,
    /** Share of the University pipeline decided each quarter (V2: 0.2). */
    resolutionRate: 0.3,
    recognition: [[1, 0.3], [2, 0.4], [3, 0.3]] as readonly (readonly [number, number])[],
  },
  /** E4 — Organizational health. */
  organization: {
    /** Load ÷ capacity above which overload erodes culture. */
    overloadThreshold: 0.6,
    /** Culture points lost per 0.1 of load ratio above the threshold. */
    overloadCulturePerTenth: 2,
    /** Most culture overload can remove in one quarter. */
    overloadMaxPerQuarter: 4,
    /** Load ratio below which culture recovers toward its starting level. */
    recoveryBelow: 0.5,
    /** Share of the gap to the starting culture (72) recovered per quarter, scaled 0.5–1 by People investment ($0–10M). */
    recoveryShare: 0.12,
    /** Capability points lost per quarter per culture point below 72. */
    strainExecution: 0.06,
    strainCustomerSuccess: 0.04,
    strainTalent: 0.03,
    /** Floor below which strain no longer reduces a capability. */
    strainFloor: 20,
    /** Extra aftershocks of a workforce reduction on customer-facing capabilities (per aftershock quarter). */
    reductionAftershock: { targeted: { execution: -1.5, customerSuccess: -1 }, deep: { execution: -3, customerSuccess: -2.5 } },
  },
  /** E6 — recession stance: 'slow' must hold at least this much of the budget in reserve ($M). */
  recession: { slowMinimumReserve: 5 },
  /** E7 — financing-expanded investment budget. */
  financing: {
    /** The base quarterly strategic budget ($M) that expansion adds to. */
    baseEnvelope: 30,
    /** Largest addition to the quarterly budget that new capital can fund ($M). */
    maxExpansion: 10,
    /** Quarters in which expansion is allowed (Q8 options set their own budget). */
    quarters: [2, 3, 4, 5, 6, 7] as readonly number[],
    /** Forecast closing cash after the expanded plan must stay at or above this ($M). */
    cashFloor: 25,
  },
  /**
   * Stage 3A — credit terms (moved from engineV3Financing `V2_FINANCING_CALIBRATION.debt`, values unchanged for 1.0).
   * Rate per quarter = base + leverage spread × max(0, min(leverage, 10) − 1) + distress spread; capacity =
   * min(opMultiple × annual OP, revenueShare × annual revenue) − debt.
   */
  credit: {
    baseRatePerQuarter: 0.02,
    leverageSpreadPerTurn: 0.0025,
    distressSpread: 0.015,
    capacityOpMultiple: 2.5,
    capacityRevenueShare: 0.4,
    /** Leverage turns counted by the leverage spread are capped here (moved from engineV3Financing; 1.0 value 10). */
    maxLeverageTurns: 10,
    /**
     * Credit cycle only (inactive in 1.0). Leverage is measured as lenders measure it: NET debt (debt − cash, ≥ 0) ÷
     * annualized operating profit BEFORE interest — for the rate, the debt capacity and the covenant. Gross debt ÷
     * post-interest profit (1.0) lets interest feed back into its own spread.
     */
    /** Credit cycle only: ceiling on the quarterly rate (distressed-credit ceiling). */
    rateCeiling: 0,
    /** Credit cycle only (inactive in 1.0): rate added per unit of macro pressure (market-wide credit spread). */
    marketSpread: 0,
    /** Credit cycle only: the leverage spread is multiplied by (1 + leverageMacroAmplifier × macro). */
    leverageMacroAmplifier: 0,
    /** Credit cycle only: debt capacity × (1 − capacityMacroTightening × macro). */
    capacityMacroTightening: 0,
    /** Credit cycle only: rate reduction for an opening cash balance at or above cashBufferThreshold ($M). */
    cashBufferCredit: 0,
    cashBufferThreshold: 40,
  },
  /**
   * Stage 3A — existing-customer demand response (installedBaseDemand; inactive in 1.0). Per quarter:
   *   consumer lapse = retained base × (consumerDemandLoss × max(0, 1 − consumerDemand) + consumerMacroLoss × macro)
   *                    × (1 − consumerShieldMax × ramp(consumer retention, consumerShieldRamp));
   *   consumer win-back = consumerWinBack × lapsed pool × ramp(consumerDemand, consumerWinBackRamp);
   *   enterprise contraction = renewing base × renewal rate × enterpriseMacroContraction × macro × (1 − 0.5 × ramp(CS, 30, 80));
   *   enterprise restored = enterpriseRestore × contracted pool × (1 − macro);
   *   enterprise expansion × clamp(enterpriseDemand, expansionDemandBounds).
   */
  demand: {
    consumerDemandLoss: 0,
    consumerMacroLoss: 0,
    consumerShieldMax: 0,
    consumerShieldRamp: [78, 90] as readonly number[],
    consumerWinBack: 0,
    consumerWinBackRamp: [0.8, 1.0] as readonly number[],
    enterpriseMacroContraction: 0,
    enterpriseRestore: 0,
    expansionDemandBounds: [1, 1] as readonly number[],
  },
};

export type V3EconomicsConfig = typeof V3_ECONOMICS;

/** Deep-ish copy for safe restore (arrays and nested objects copied). */
function snapshotConfig(): V3EconomicsConfig {
  return JSON.parse(JSON.stringify(V3_ECONOMICS));
}

function assignDeep(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) assignDeep(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    else target[k] = v;
  }
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Laboratory/test only: run `fn` with temporary overrides, then restore every value (even on error). */
export function withV3Economics<T>(overrides: DeepPartial<V3EconomicsConfig>, fn: () => T): T {
  const saved = snapshotConfig();
  try {
    assignDeep(V3_ECONOMICS as unknown as Record<string, unknown>, overrides as unknown as Record<string, unknown>);
    return fn();
  } finally {
    assignDeep(V3_ECONOMICS as unknown as Record<string, unknown>, saved as unknown as Record<string, unknown>);
  }
}

// ============ VERSION REGISTRY (V3.1 Stage 2) ============

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o as object)) deepFreeze(v); }
  return o;
}
const cloneConfig = (c: V3EconomicsConfig): V3EconomicsConfig => JSON.parse(JSON.stringify(c));

/** v3-econ-1.0: the released V3 economics, captured from the values above at module load and frozen. */
const V3_ECON_1_0: V3EconomicsConfig = deepFreeze(cloneConfig(V3_ECONOMICS));
/**
 * v3-econ-1.1: introduced in Stage 2 with economics identical to 1.0. Stage 3 economic changes are made here — and only
 * here — so 1.0 games are never affected. Every 1.1 difference is listed in V3_1_1_CHANGES.
 */
export const V3_1_1_CHANGES: DeepPartial<V3EconomicsConfig> = {
  // Stage 3A — recession sensitivity of existing customers (Moderate calibration, Stage 3 design C1)
  mechanisms: { installedBaseDemand: true, creditCycle: true, enterpriseDemandConversion: true },
  demand: {
    consumerDemandLoss: 0.10,
    consumerMacroLoss: 0.02,
    consumerShieldMax: 0.4,
    consumerShieldRamp: [78, 90],
    consumerWinBack: 0.30,
    consumerWinBackRamp: [0.8, 1.0],
    // Checkpoint A final calibration: 0.15 → 0.10 so enterprise (annual contracts) is no more cyclical than consumer
    enterpriseMacroContraction: 0.10,
    enterpriseRestore: 0.20,
    expansionDemandBounds: [0.6, 1.3],
  },
  ai: { macroMonetization: 0.25 },
  // Stage 3B — Enterprise deal conversion follows enterprise demand: unit elasticity (s = 1.0), matching the existing
  // demand scaling of enterprise pipeline inflow; the [0.5, 1.5] bounds never bind on the authored paths (0.80–1.42).
  enterprise: { winCapDemandSensitivity: 1.0, winCapDemandBounds: [0.5, 1.5] },
  // Stage 3A — credit cycle (middle spread setting S2, Stage 3 design C2)
  credit: {
    leverageSpreadPerTurn: 0.005,
    marketSpread: 0.01,
    leverageMacroAmplifier: 1,
    capacityMacroTightening: 0.4,
    cashBufferCredit: 0.0025,
    maxLeverageTurns: 6,
    rateCeiling: 0.06,
  },
};
const V3_ECON_1_1: V3EconomicsConfig = (() => {
  const c = cloneConfig(V3_ECONOMICS);
  assignDeep(c as unknown as Record<string, unknown>, JSON.parse(JSON.stringify(V3_1_1_CHANGES)) as Record<string, unknown>);
  c.version = 'v3-econ-1.1';
  return deepFreeze(c);
})();

const REGISTRY: Record<V3EngineVersion, V3EconomicsConfig> = { 'v3-econ-1.0': V3_ECON_1_0, 'v3-econ-1.1': V3_ECON_1_1 };

/** The registered (frozen) configuration of a V3 engine version. Throws for an unknown version. */
export function v3ConfigFor(version: string): V3EconomicsConfig {
  if (!isV3EngineVersion(version)) throw new Error(`Unknown V3 engine version ${String(version)}`);
  return REGISTRY[version];
}

/**
 * Run `fn` with `version`'s configuration active, then restore the previous active values (even on error).
 * If that version is already active, `fn` runs unchanged — so nested calls are cheap, and a laboratory override applied
 * inside `withV3Version(v, …)` (or on 1.0, the at-rest version) stays in effect for engine calls made within it.
 */
export function withV3Version<T>(version: string, fn: () => T): T {
  const cfg = v3ConfigFor(version);
  if (V3_ECONOMICS.version === cfg.version) return fn();
  const saved = snapshotConfig();
  try {
    assignDeep(V3_ECONOMICS as unknown as Record<string, unknown>, cloneConfig(cfg) as unknown as Record<string, unknown>);
    return fn();
  } finally {
    assignDeep(V3_ECONOMICS as unknown as Record<string, unknown>, saved as unknown as Record<string, unknown>);
  }
}

/**
 * Tests only: temporarily replace a version's *registered* configuration (e.g. give 1.1 different economics) to prove
 * that other versions are unaffected. Restores the registry entry afterwards (even on error).
 */
export function withRegisteredV3Config<T>(version: V3EngineVersion, overrides: DeepPartial<V3EconomicsConfig>, fn: () => T): T {
  const original = REGISTRY[version];
  const next = cloneConfig(original);
  assignDeep(next as unknown as Record<string, unknown>, overrides as unknown as Record<string, unknown>);
  next.version = version;
  REGISTRY[version] = deepFreeze(next);
  try { return fn(); } finally { REGISTRY[version] = original; }
}

export const ALL_MECHANISMS_OFF: V3Mechanisms = {
  aiRevenueLevel: false, enterpriseConversion: false, universityConversion: false, organizationalHealth: false, contractEnvelopeClaim: false, recessionStance: false, financingExpansion: false,
  installedBaseDemand: false, creditCycle: false, enterpriseDemandConversion: false,
};
