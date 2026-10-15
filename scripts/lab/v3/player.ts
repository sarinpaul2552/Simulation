/**
 * NEXLEARN V3 LABORATORY — adapter-level player (analysis only; never imported by the app).
 *
 * Plays a strategy through the PRODUCTION adapters exactly as a classroom team would: every decision is a
 * V2PlayerQuarterInput validated and resolved by the adapter, so the laboratory exercises the same code path as the
 * classroom (allocation total, availability rules, replay verification).
 *
 * The same player and the same policy hooks (Test Lab DEFAULT_POLICY and the Batch 9 strategies) drive both engines:
 *   - V2: the frozen adapter (`src/production/v2/adapter.ts`) on the frozen engine;
 *   - V3: the V3 adapter (`src/production/v3/adapter.ts`) on `src/simulationV3`, for a market path.
 * Differences in outcome therefore come from the economics, not from the player.
 *
 * V3-only decisions the player makes, because the V3 rules require them:
 *   - E5: an accepted Q5 contract's implementation cost must be held in reserve → planned investment is slowed by the
 *     shortfall (destination-aligned buckets protected);
 *   - E6: a recession stance is derived from the policy's actions (cost action → cut; ≥ $5M reserve → slow; else
 *     protect); a hiring freeze with People funded moves the People allocation to reserve (as the classroom UI does);
 *   - E7: optional `expansion` policy (X = $0/5/10/15M) raises debt and spends it on the strategy's own buckets,
 *     only if the adapter accepts the plan (cash floor, debt capacity).
 */
import * as V2A from '../../../src/production/v2/adapter';
import * as V3A from '../../../src/production/v3/adapter';
import type { V2GameSnapshot } from '../../../src/production/v2/snapshot';
import type { V2PlayerQuarterInput } from '../../../src/production/v2/types';
import {
  DEFAULT_POLICY, allocationForFinalOption, slowInvestment, companyView,
  type V2ArcStrategy, type V2ArcPolicy, type V2ArcContext, type V2LiquidityForecast,
} from '../../../src/testlab/utils/v2ScenarioArc';
import type { V2Allocation, V2Consequence, V2TeamState, V2ManagementActions } from '../../../src/simulation/engineV2';
import { V2_DESTINATIONS, type V2DestinationId } from '../../../src/simulation/engineV2Destination';
import { opportunityTerms as v2Terms } from '../../../src/simulation/engineV2Opportunity';
import { opportunityTerms as v3Terms } from '../../../src/simulationV3/engineV3Opportunity';
import { assessCrisis as v2Crisis } from '../../../src/simulation/engineV2Crisis';
import { assessCrisis as v3Crisis } from '../../../src/simulationV3/engineV3Crisis';
import { finalOptions as v2Final } from '../../../src/simulation/engineV2Final';
import { finalOptions as v3Final } from '../../../src/simulationV3/engineV3Final';
import { crisisView as v2CrisisView, finalView as v2FinalView } from '../../../src/simulation/engineV2';
import { crisisView as v3CrisisView, finalView as v3FinalView } from '../../../src/simulationV3/engineV3';
import { buildPlayerSignals as v2Signals, getScenarioQuarter as v2Sq } from '../../../src/simulation/engineV2Scenario';
import { buildPlayerSignals as v3Signals, getScenarioQuarter as v3Sq } from '../../../src/simulationV3/engineV3Scenario';
import { pathArc, type V3MarketPathId } from '../../../src/simulationV3/engineV3Paths';
import { V3_ECONOMICS, withV3Version, type V3EngineVersion } from '../../../src/simulationV3/engineV3Config';

export type LabEngineId = 'v2' | 'v3';
/** `version` (V3 only, V3.1 Stage 2): the V3 engine version to play; absent = the active version (v3-econ-1.0 at rest). */
export interface LabConfig { engine: LabEngineId; path?: V3MarketPathId; version?: V3EngineVersion }

export interface PlayOptions {
  /** E7 (V3 only): largest financing-funded expansion the player requests each quarter Q2–Q7 ($M; 0 = never). */
  expansion?: number;
  /** Override policy hooks. */
  policy?: Partial<V2ArcPolicy>;
  /** Force a recession stance (V3); otherwise derived from the policy's actions. */
  stance?: 'protect' | 'slow' | 'cut';
  quarters?: number;
}

export interface PlayedQuarter {
  quarter: number;
  input: V2PlayerQuarterInput;
  consequence: V2Consequence;
  before: V2TeamState;
  after: V2TeamState;
  notes: string[];
}

export interface PlayedGame { config: LabConfig; strategy: V2ArcStrategy; snapshot: V2GameSnapshot; quarters: PlayedQuarter[] }

interface Engine {
  init(): V2GameSnapshot;
  resolve(s: V2GameSnapshot, i: V2PlayerQuarterInput): { snapshot: V2GameSnapshot; consequence: V2Consequence };
  validate(s: V2GameSnapshot, i: V2PlayerQuarterInput): string[];
  forecast(s: V2GameSnapshot, i: V2PlayerQuarterInput): { projectedClosingCash: number; minimumOperatingCash: number; gap: number; options: V2LiquidityForecast['options'] };
  sq(q: number): ReturnType<typeof v2Sq>;
  signals(q: number, state: V2TeamState, last?: V2Consequence): V2ArcContext['signals'];
  terms(offerId: string, s: V2TeamState): ReturnType<typeof v2Terms>;
  crisis(s: V2TeamState): ReturnType<typeof v2Crisis>;
  finals(s: V2TeamState, q: number): ReturnType<typeof v2Final>;
}

function engineFor(cfg: LabConfig): Engine {
  if (cfg.engine === 'v2') {
    return {
      init: () => V2A.initializeGame(),
      resolve: (s, i) => V2A.resolveQuarter(s, i),
      validate: (s, i) => V2A.validateQuarterInput(s, i),
      forecast: (s, i) => V2A.forecastQuarter(s, i),
      sq: q => v2Sq(q),
      signals: (q, st, last) => v2Signals(q, companyView(st, last)),
      terms: (id, s) => v2Terms(id, { capabilities: s.capabilities, productQuality: s.productQuality, trust: s.trust, aiCommercialReadiness: s.commercial.aiCommercialReadiness }, s.destination?.id ?? null),
      crisis: s => v2Crisis(s.destination?.id ?? 'balanced-marketplace', v2CrisisView(s)),
      finals: (s, q) => v2Final(v2FinalView(s, q)),
    };
  }
  const path = cfg.path ?? 'A';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const S = (x: any) => x as V2TeamState & any;
  return {
    init: () => V3A.initializeGame(path, cfg.version),
    resolve: (s, i) => V3A.resolveQuarter(s, i) as unknown as { snapshot: V2GameSnapshot; consequence: V2Consequence },
    validate: (s, i) => V3A.validateQuarterInput(s, i),
    forecast: (s, i) => V3A.forecastQuarter(s, i) as never,
    sq: q => v3Sq(q, pathArc(path)) as never,
    signals: (q, st, last) => v3Signals(q, companyView(st, last) as never, pathArc(path)) as never,
    terms: (id, s) => v3Terms(id, { capabilities: s.capabilities, productQuality: s.productQuality, trust: s.trust, aiCommercialReadiness: s.commercial.aiCommercialReadiness }, (s.destination?.id ?? null) as never) as never,
    crisis: s => v3Crisis((s.destination?.id ?? 'balanced-marketplace') as never, v3CrisisView(S(s))) as never,
    finals: (s, q) => v3Final(v3FinalView(S(s), q)) as never,
  };
}

const BUCKETS = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const;
const invested = (x: V2Allocation) => BUCKETS.reduce((t, b) => t + x[b], 0);
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
/** Round to 4 dp and put any rounding residue into reserve, so the allocation totals the budget exactly. */
function exact(x: V2Allocation, budget: number): V2Allocation {
  const out = { ...x };
  for (const b of BUCKETS) out[b] = Math.max(0, r4(out[b]));
  out.cashReserve = Math.max(0, r4(budget - invested(out)));
  return out;
}
const alignedOf = (s: V2TeamState) => (s.destination ? [...V2_DESTINATIONS[s.destination.id as V2DestinationId].alignedBuckets] : []) as (keyof V2Allocation)[];
/** Move `amount` into reserve, protecting the destination's buckets first, then (if still short) from any bucket. */
function toReserve(x: V2Allocation, amount: number, protect: (keyof V2Allocation)[]): V2Allocation {
  const target = x.cashReserve + amount;
  let out = slowInvestment(x, amount, protect);
  if (out.cashReserve + 1e-9 < target) out = slowInvestment(out, target - out.cashReserve, []);
  return out;
}
const isCut = (m: V2ManagementActions | undefined) => !!m && (!!m.workforceReduction || m.hiringFreeze === true || (m.marketingLevel !== undefined && m.marketingLevel < 1) || m.closeWeakOfferings === true);

export function play(strategy: V2ArcStrategy, cfg: LabConfig, opts: PlayOptions = {}): PlayedGame {
  // V3.1 Stage 2: a game is played entirely under its engine version's configuration (laboratory overrides applied
  // inside withV3Version(version, …) stay in effect, because a nested call in the active version changes nothing).
  if (cfg.engine === 'v3' && cfg.version) return withV3Version(cfg.version, () => playGame(strategy, cfg, opts));
  return playGame(strategy, cfg, opts);
}

function playGame(strategy: V2ArcStrategy, cfg: LabConfig, opts: PlayOptions): PlayedGame {
  const E = engineFor(cfg);
  const v3 = cfg.engine === 'v3';
  const policy: V2ArcPolicy = { ...DEFAULT_POLICY, ...(strategy.policy ?? {}), ...(opts.policy ?? {}) };
  let snap = E.init();
  const quarters: PlayedQuarter[] = [];
  const history: V2ArcContext['history'] = [];
  let last: V2Consequence | undefined;
  const n = opts.quarters ?? 8;
  for (let q = 1; q <= n; q++) {
    const state = snap.state as V2TeamState;
    const notes: string[] = [];
    const ctx: V2ArcContext = { quarter: q, signals: E.signals(q, state, last), state, history };
    const sq = E.sq(q);
    let alloc = strategy.allocate(ctx);
    const input: V2PlayerQuarterInput = { quarter: q, allocation: alloc };
    if (q === 4) input.destination = (strategy.destination?.(ctx) ?? 'balanced-marketplace') as V2DestinationId;
    const protect = q >= 4 ? (input.destination ? [...V2_DESTINATIONS[input.destination].alignedBuckets] as (keyof V2Allocation)[] : alignedOf(state)) : [];

    const offerId = sq?.events?.opportunities?.[0];
    let upfront = 0;
    if (offerId) {
      const t = E.terms(offerId, state);
      const accept = policy.opportunity(ctx, t);
      input.opportunity = { offerId, accept };
      if (accept) upfront = t.upfrontCash;
    }
    if (sq?.events?.recessionResponse) {
      const r = policy.recession(ctx, alloc);
      if (r.allocation) alloc = r.allocation;
      const actions = { ...r.actions };
      if (v3 && actions.hiringFreeze && alloc.people > 0) {
        alloc = { ...alloc, cashReserve: alloc.cashReserve + alloc.people, people: 0 };
        notes.push('hiring freeze: People allocation moved to reserve');
      }
      if (Object.keys(actions).length > 0) input.management = actions;
      if (v3 && V3_ECONOMICS.mechanisms.recessionStance) {
        input.recessionStance = opts.stance ?? (isCut(actions) ? 'cut' : alloc.cashReserve >= V3_ECONOMICS.recession.slowMinimumReserve ? 'slow' : 'protect');
        if (input.recessionStance === 'slow' && alloc.cashReserve < V3_ECONOMICS.recession.slowMinimumReserve) {
          alloc = toReserve(alloc, V3_ECONOMICS.recession.slowMinimumReserve - alloc.cashReserve, protect);
        }
        if (input.recessionStance !== 'cut') delete input.management;
        if (input.recessionStance === 'cut' && !isCut(input.management)) input.management = { ...(input.management ?? {}), hiringFreeze: true };
        if (input.management?.hiringFreeze && alloc.people > 0) alloc = { ...alloc, cashReserve: alloc.cashReserve + alloc.people, people: 0 };
      }
    }
    if (sq?.events?.crisis) input.crisisResponse = policy.crisis(ctx, E.crisis(state));
    let budget = 30;
    if (sq?.events?.finalDecision) {
      const option = policy.final(ctx, E.finals(state, q));
      input.finalOption = option;
      const fa = allocationForFinalOption(alloc, option, alignedOf(state));
      alloc = fa.allocation;
      budget = fa.envelope;
    }
    // E5: the contract's implementation cost is claimed from the budget (held as reserve).
    if (v3 && V3_ECONOMICS.mechanisms.contractEnvelopeClaim && upfront > alloc.cashReserve) {
      alloc = toReserve(alloc, upfront - alloc.cashReserve + 1e-3, protect);
      notes.push(`contract claims $${upfront.toFixed(1)}M of the budget`);
    }
    input.allocation = exact(alloc, budget);

    // CFO forecast and liquidity policy (as in the Test Lab), through the adapter.
    const fc = E.forecast(snap, input);
    const forecast: V2LiquidityForecast = {
      ...fc, consequence: undefined as never,
      reforecast: a2 => E.forecast(snap, { ...input, allocation: exact(a2, budget) }).projectedClosingCash,
    } as V2LiquidityForecast;
    const liq = policy.liquidity(ctx, forecast, input.allocation);
    if (liq.allocation) input.allocation = exact(liq.allocation, budget);
    if (liq.actions.length > 0) input.financing = liq.actions;

    // E7: financing-funded expansion (V3 only), spent on the strategy's own buckets.
    const X = opts.expansion ?? 0;
    if (v3 && X > 0 && V3_ECONOMICS.mechanisms.financingExpansion && V3_ECONOMICS.financing.quarters.includes(q) && !sq?.events?.finalDecision) {
      const base = input.allocation;
      const inv = invested(base);
      const debtCap = fc.options.debtCapacity - (input.financing ?? []).filter(f => f.kind === 'debt').reduce((t, f) => t + ('amount' in f ? f.amount : 0), 0);
      for (const x of [X, X / 2]) {
        const amt = Math.min(x, Math.max(0, Math.floor(debtCap)));
        if (amt < 1 || inv <= 0) break;
        const grown = { ...base };
        for (const b of BUCKETS) grown[b] = base[b] + (amt * base[b]) / inv;
        const trial: V2PlayerQuarterInput = { ...input, allocation: exact(grown, budget + amt), expansion: amt, financing: [...(input.financing ?? []), { kind: 'debt', amount: amt }] };
        if (E.validate(snap, trial).length === 0) { Object.assign(input, trial); notes.push(`expansion $${amt}M (debt)`); break; }
      }
    }

    const errors = E.validate(snap, input);
    if (errors.length) throw new Error(`[${cfg.engine}${cfg.path ?? ''}] ${strategy.id} Q${q}: ${errors.join('; ')} — ${JSON.stringify(input)}`);
    const before = snap.state as V2TeamState;
    const r = E.resolve(snap, input);
    snap = r.snapshot;
    last = r.consequence;
    quarters.push({ quarter: q, input, consequence: r.consequence, before, after: snap.state as V2TeamState, notes });
    history.push({ quarter: q, signals: ctx.signals, allocation: input.allocation, record: undefined as never, decisions: undefined });
  }
  return { config: cfg, strategy, snapshot: snap, quarters };
}
