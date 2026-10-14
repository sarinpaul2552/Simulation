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
}

export const V3_ECONOMICS = {
  version: 'v3-econ-1.0',
  mechanisms: {
    aiRevenueLevel: true,
    enterpriseConversion: true,
    universityConversion: true,
    organizationalHealth: true,
    contractEnvelopeClaim: true,
    recessionStance: true,
    financingExpansion: true,
  } as V3Mechanisms,
  /** E1 — AI-native revenue level. target = base + perPoint × (adoption − 10) × demand × quality × macro; moves `speed` of the gap per quarter. */
  ai: { revenuePerAdoptionPoint: 0.3, convergenceSpeed: 0.35 },
  /** E2 — Enterprise conversion. */
  enterprise: {
    winPerRelCapability: 0.2,
    inflowCapabilityAmplitude: 2.4,
    recognition: [[1, 0.5], [2, 0.5]] as readonly (readonly [number, number])[],
    /** Multiplier on the Enterprise investment's recurring delivery commitment (V2: 4% of the investment per quarter for 6 quarters). */
    deliveryCommitmentScale: 0.5,
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

export const ALL_MECHANISMS_OFF: V3Mechanisms = {
  aiRevenueLevel: false, enterpriseConversion: false, universityConversion: false, organizationalHealth: false, contractEnvelopeClaim: false, recessionStance: false, financingExpansion: false,
};
