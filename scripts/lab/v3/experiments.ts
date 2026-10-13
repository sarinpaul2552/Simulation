/**
 * NEXLEARN V3 LABORATORY — experiments (Batch 10B). Every experiment plays complete eight-quarter games through the
 * production adapters (see player.ts) and reports production metrics (see metrics.ts). Deterministic: the same code
 * and calibration always produce the same numbers.
 */
import { play, type LabConfig, type PlayOptions } from './player';
import { metricsOf, type GameMetrics } from './metrics';
import { V3_LAB_STRATEGIES, type V3LabStrategy } from './strategies';
import {
  V3_ECONOMICS, withV3Economics, ALL_MECHANISMS_OFF, type DeepPartial, type V3EconomicsConfig, type V3Mechanisms,
} from '../../../src/simulationV3/engineV3Config';
import { pathArc, registerPath, type V3MarketPathId } from '../../../src/simulationV3/engineV3Paths';
import type { V2ScenarioQuarter } from '../../../src/simulationV3/engineV3Scenario';
import { a, slowInvestment } from '../../../src/testlab/utils/v2ScenarioArc';
import type { V2ManagementActions } from '../../../src/simulation/engineV2';

export const V2C: LabConfig = { engine: 'v2' };
export const v3c = (path: V3MarketPathId = 'A'): LabConfig => ({ engine: 'v3', path });

export function runSet(cfg: LabConfig, strategies: V3LabStrategy[] = V3_LAB_STRATEGIES, opts: PlayOptions = {}): GameMetrics[] {
  return strategies.map(s => metricsOf(play(s.strategy, cfg, opts)));
}

const MECH_IDS = Object.keys(ALL_MECHANISMS_OFF) as (keyof V3Mechanisms)[];

// ─────────────── 1. V2 vs V3 on the same market (path A = the V2 arc) ───────────────
export function comparison() {
  return { v2: runSet(V2C), v3off: withV3Economics({ mechanisms: ALL_MECHANISMS_OFF }, () => runSet(v3c())), v3: runSet(v3c()) };
}

// ─────────────── 2. Mechanism attribution ───────────────
export function attribution() {
  const only = Object.fromEntries(MECH_IDS.map(m => [m, withV3Economics({ mechanisms: { ...ALL_MECHANISMS_OFF, [m]: true } }, () => runSet(v3c()))]));
  const without = Object.fromEntries(MECH_IDS.map(m => [m, withV3Economics({ mechanisms: { [m]: false } as Partial<V3Mechanisms> }, () => runSet(v3c()))]));
  return { only, without };
}

// ─────────────── 3. Parameter sensitivity (±25%) ───────────────
export const SENSITIVITY: { id: string; label: string; set: (f: number) => DeepPartial<V3EconomicsConfig> }[] = [
  { id: 'ai.m', label: 'AI revenue per adoption point', set: f => ({ ai: { revenuePerAdoptionPoint: V3_ECONOMICS.ai.revenuePerAdoptionPoint * f } }) },
  { id: 'ai.s', label: 'AI convergence speed', set: f => ({ ai: { convergenceSpeed: V3_ECONOMICS.ai.convergenceSpeed * f } }) },
  { id: 'ent.win', label: 'Enterprise win per relative capability', set: f => ({ enterprise: { winPerRelCapability: V3_ECONOMICS.enterprise.winPerRelCapability * f } }) },
  { id: 'ent.inflow', label: 'Enterprise inflow amplitude', set: f => ({ enterprise: { inflowCapabilityAmplitude: V3_ECONOMICS.enterprise.inflowCapabilityAmplitude * f } }) },
  { id: 'ent.delivery', label: 'Enterprise delivery commitment scale', set: f => ({ enterprise: { deliveryCommitmentScale: V3_ECONOMICS.enterprise.deliveryCommitmentScale * f } }) },
  { id: 'uni.win', label: 'University win per relative Credential', set: f => ({ university: { winPerRelCredential: V3_ECONOMICS.university.winPerRelCredential * f } }) },
  { id: 'uni.inflow', label: 'University inflow amplitude', set: f => ({ university: { inflowCapabilityAmplitude: V3_ECONOMICS.university.inflowCapabilityAmplitude * f } }) },
  { id: 'uni.res', label: 'University pipeline resolution rate', set: f => ({ university: { resolutionRate: V3_ECONOMICS.university.resolutionRate * f } }) },
  { id: 'org.overload', label: 'Culture lost per 0.1 overload', set: f => ({ organization: { overloadCulturePerTenth: V3_ECONOMICS.organization.overloadCulturePerTenth * f } }) },
  { id: 'org.strain', label: 'Strain per culture point (execution, CS, talent)', set: f => ({ organization: { strainExecution: V3_ECONOMICS.organization.strainExecution * f, strainCustomerSuccess: V3_ECONOMICS.organization.strainCustomerSuccess * f, strainTalent: V3_ECONOMICS.organization.strainTalent * f } }) },
  { id: 'org.recovery', label: 'Culture recovery share', set: f => ({ organization: { recoveryShare: V3_ECONOMICS.organization.recoveryShare * f } }) },
];

export function sensitivity() {
  const base = runSet(v3c());
  const rows = SENSITIVITY.flatMap(p => [0.75, 1.25].map(f => ({ id: p.id, label: p.label, factor: f, metrics: withV3Economics(p.set(f), () => runSet(v3c())) })));
  return { base, rows };
}

// ─────────────── 4. Market sensitivity (variants of the path-A arc; the authored paths B/C come in 10D) ───────────────
export type ArcVariant = { id: string; label: string; edit: (q: V2ScenarioQuarter) => V2ScenarioQuarter };
export const MARKET_VARIANTS: ArcVariant[] = [
  { id: 'no-ai-disruption', label: 'AI-native demand stays neutral (1.0) and consumer AI substitution never comes', edit: q => ({ ...q, demand: { ...q.demand, aiNativeDemand: 1, consumerDemand: Math.max(1, q.demand.consumerDemand) } }) },
  { id: 'strong-enterprise', label: 'Enterprise and enterprise-AI demand +20% from Q2', edit: q => (q.quarter >= 2 ? { ...q, demand: { ...q.demand, enterpriseDemand: q.demand.enterpriseDemand * 1.2, enterpriseAIDemand: q.demand.enterpriseAIDemand * 1.2 } } : q) },
  { id: 'deep-recession', label: 'Macro pressure doubled from Q6', edit: q => (q.quarter >= 6 ? { ...q, demand: { ...q.demand, macroPressure: Math.min(1, q.demand.macroPressure * 2) } } : q) },
  { id: 'fast-competitors', label: 'Competitor progress doubled', edit: q => ({ ...q, competitorProgress: { consumer: q.competitorProgress.consumer * 2, enterprise: q.competitorProgress.enterprise * 2, credential: q.competitorProgress.credential * 2 } }) },
];

/** Run fn with path C temporarily replaced by a variant of path A (restored afterwards). Laboratory only. */
export function withArcVariant<T>(v: ArcVariant, fn: () => T): T {
  const saved = pathArc('C');
  try { registerPath('C', pathArc('A').map(q => v.edit(structuredClone(q)))); return fn(); } finally { registerPath('C', saved); }
}

export function marketSensitivity() {
  return MARKET_VARIANTS.map(v => ({ id: v.id, label: v.label, v3: withArcVariant(v, () => runSet(v3c('C'))) }));
}

// ─────────────── 5. Recession stance and workforce reduction (E4, E6, E9) ───────────────
export const STANCE_VARIANTS: { id: string; stance: 'protect' | 'slow' | 'cut'; actions: V2ManagementActions; slow?: number }[] = [
  { id: 'protect', stance: 'protect', actions: {} },
  { id: 'slow-10', stance: 'slow', actions: {}, slow: 10 },
  { id: 'cut-freeze', stance: 'cut', actions: { hiringFreeze: true } },
  { id: 'cut-targeted', stance: 'cut', actions: { workforceReduction: { depth: 'targeted' } } },
  { id: 'cut-deep', stance: 'cut', actions: { workforceReduction: { depth: 'deep' } } },
];
/** Recession hook for a stance variant. A hiring freeze moves People to reserve in both engines (V2 would otherwise reject it). */
function stancePolicy(v: (typeof STANCE_VARIANTS)[number]): PlayOptions['policy'] {
  return {
    recession: (_ctx, planned) => {
      let alloc = v.slow ? slowInvestment(planned, v.slow) : { ...planned };
      if (v.actions.hiringFreeze && alloc.people > 0) alloc = { ...alloc, cashReserve: alloc.cashReserve + alloc.people, people: 0 };
      return { actions: v.actions, allocation: alloc };
    },
  };
}
const STANCE_STRATEGIES = ['ai-led', 'consumer-led', 'enterprise-led', 'university-led', 'diversified', 'premium-builder', 'cash-preservation', 'adaptive'];

export function recessionStances() {
  const set = V3_LAB_STRATEGIES.filter(s => STANCE_STRATEGIES.includes(s.strategy.id));
  const out: { strategy: string; variant: string; v2: GameMetrics; v3: GameMetrics }[] = [];
  for (const s of set) for (const v of STANCE_VARIANTS) {
    const opts: PlayOptions = { stance: v.stance, policy: stancePolicy(v) };
    out.push({ strategy: s.strategy.id, variant: v.id, v2: metricsOf(play(s.strategy, V2C, opts)), v3: metricsOf(play(s.strategy, v3c(), opts)) });
  }
  return out;
}

/**
 * A spending-heavy company ($30M invested every quarter, no reserve, debt-first liquidity) as the cash-strained case for
 * the recession stances. The opening cash cannot be changed through the production adapter, so strain comes from play.
 */
export function cashStrainedStances() {
  const heavy = { id: 'heavy-spender', name: 'Heavy spender', description: '$10M each Consumer, Enterprise, AI; equity refused', allocate: () => a({ consumer: 10, enterprise: 10, aiProduct: 10 }), destination: () => 'balanced-marketplace' };
  return STANCE_VARIANTS.map(v => ({
    variant: v.id,
    v3: metricsOf(play(heavy, v3c(), { stance: v.stance, policy: stancePolicy(v) })),
    v2: metricsOf(play(heavy, V2C, { policy: stancePolicy(v) })),
  }));
}

// ─────────────── 6. Financing expansion X (E7) ───────────────
export function financingExpansion() {
  const ids = ['enterprise-led', 'enterprise-ai-pair', 'university-led', 'ai-led', 'consumer-led', 'diversified', 'adaptive'];
  const set = V3_LAB_STRATEGIES.filter(s => ids.includes(s.strategy.id));
  return [0, 5, 10, 15].map(X => ({ X, metrics: withV3Economics({ financing: { maxExpansion: Math.max(X, 0.0001) } }, () => runSet(v3c(), set, { expansion: X })) }));
}

// ─────────────── 7. Q5 contract under the budget claim (E5) ───────────────
export function contractClaim() {
  const ids = ['enterprise-led', 'enterprise-only', 'enterprise-ai-pair', 'diversified', 'consumer-led', 'ai-led', 'adaptive'];
  const set = V3_LAB_STRATEGIES.filter(s => ids.includes(s.strategy.id));
  const forced = (accept: boolean): PlayOptions => ({ policy: { opportunity: () => accept } });
  return {
    v2Accept: runSet(V2C, set, forced(true)), v2Decline: runSet(V2C, set, forced(false)),
    v3Accept: runSet(v3c(), set, forced(true)), v3Decline: runSet(v3c(), set, forced(false)),
    v3AcceptNoClaim: withV3Economics({ mechanisms: { contractEnvelopeClaim: false } }, () => runSet(v3c(), set, forced(true))),
  };
}

// ─────────────── 8. Dominance: marginal $5M from a balanced base ───────────────
export function marginal() {
  const base = a({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 });
  const buckets = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const;
  const strat = (id: string, alloc: ReturnType<typeof a>) => ({ id, name: id, description: id, allocate: () => alloc, destination: () => 'balanced-marketplace' });
  const run = (cfg: LabConfig) => {
    const b = metricsOf(play(strat('base', base), cfg));
    return { base: b, shift: buckets.map(k => {
      const alloc = { ...base };
      for (const o of buckets) alloc[o] = o === k ? base[o] + 5 : base[o] - 5 / 4;
      return { bucket: k, m: metricsOf(play(strat(`+5 ${k}`, alloc), cfg)) };
    }) };
  };
  return { v2: run(V2C), v3: run(v3c()) };
}
