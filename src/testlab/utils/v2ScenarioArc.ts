import {
  V2Allocation,
  V2TeamState,
  V2Consequence,
  getV2Baseline,
  V2_INTEGRATED_MODE,
} from '../../simulation/engineV2';
import {
  getScenarioMarket,
  lastAuthoredQuarter,
  buildPlayerSignals,
  V2PlayerSignal,
  V2SignalCompanyView,
} from '../../simulation/engineV2Scenario';
import { V2QuarterRecord, runV2Quarter } from './v2Diagnostics';
import { V2DestinationId, V2_DESTINATIONS, V2_DESTINATION_IDS } from '../../simulation/engineV2Destination';

/**
 * SCENARIO ARC RUNNER (Test Lab only)
 *
 * Plays a player policy through the authored scenario arc in the integrated V2 economy.
 * Players see only `V2PlayerSignal`s (briefing + measured KPIs); the engine consumes the
 * scenario's market truth. Policies may read signals to adapt (evidence-responsive play).
 */

export interface V2ArcContext {
  quarter: number;
  signals: V2PlayerSignal[];
  state: V2TeamState;
  history: V2ArcQuarter[];
}

export interface V2ArcStrategy {
  id: string;
  name: string;
  description: string;
  opening?: () => V2TeamState;
  /** Allocation for a quarter ($30M envelope). */
  allocate: (ctx: V2ArcContext) => V2Allocation;
  /** Q4 destination choice (used once destinations exist). */
  destination?: (ctx: V2ArcContext) => string;
}

export interface V2ArcQuarter {
  quarter: number;
  signals: V2PlayerSignal[];
  allocation: V2Allocation;
  record: V2QuarterRecord;
}

export interface V2ArcRun {
  strategy: V2ArcStrategy;
  quarters: V2ArcQuarter[];
  finalState: V2TeamState;
  passed: boolean;
}

export const ENVELOPE = 30;

export function a(p: Partial<V2Allocation>): V2Allocation {
  return { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p };
}

export function companyView(state: V2TeamState, last?: V2Consequence): V2SignalCompanyView {
  return {
    quarter: state.quarter,
    cash: state.cash,
    revenue: last ? last.ledger.revenue : state.revenue,
    operatingProfit: last ? last.ledger.operatingProfit : state.operatingProfit,
    segmentRevenue: { ...state.segmentRevenue },
    commercial: {
      consumerRetention: state.commercial.consumerRetention,
      consumerCacIndex: state.commercial.consumerCacIndex,
      enterprisePipeline: state.commercial.enterprisePipeline,
      enterpriseWinRate: state.commercial.enterpriseWinRate,
      aiAdoptionIndex: state.commercial.aiAdoptionIndex,
      universityRenewalRate: state.commercial.universityRenewalRate,
      pricingPower: state.commercial.pricingPower,
    },
    organizationalCapacity: state.organizationalCapacity,
    transformationLoad: state.transformationLoad,
    culture: state.culture,
  };
}

export interface V2ArcOptions {
  /** Override the strategy's Q4 destination choice. */
  destination?: V2DestinationId;
  /** Allocation policy after Q4: 'same' continues the strategy; 'aligned' splits $30M across destination-aligned buckets. */
  postQ4Allocation?: 'same' | 'aligned';
}

export const DESTINATION_COMMIT_QUARTER = 4;

export function alignedAllocation(id: V2DestinationId): V2Allocation {
  const buckets = V2_DESTINATIONS[id].alignedBuckets;
  if (buckets.length === 0) return a({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 });
  const each = ENVELOPE / buckets.length;
  return a(Object.fromEntries(buckets.map(b => [b, each])) as Partial<V2Allocation>);
}

export function runArc(strategy: V2ArcStrategy, quarters = lastAuthoredQuarter(), options: V2ArcOptions = {}): V2ArcRun {
  let state = strategy.opening ? strategy.opening() : getV2Baseline();
  const history: V2ArcQuarter[] = [];
  let last: V2Consequence | undefined;
  for (let q = 1; q <= quarters; q++) {
    const signals = buildPlayerSignals(q, companyView(state, last));
    const ctx: V2ArcContext = { quarter: q, signals, state, history };
    const committed = state.destination?.id ?? null;
    const allocation =
      q > DESTINATION_COMMIT_QUARTER && options.postQ4Allocation === 'aligned' && committed
        ? alignedAllocation(committed)
        : strategy.allocate(ctx);
    const destination =
      q === DESTINATION_COMMIT_QUARTER ? (options.destination ?? (strategy.destination?.(ctx) as V2DestinationId | undefined)) : undefined;
    const record = runV2Quarter(state, q, allocation, ENVELOPE, undefined, undefined, getScenarioMarket(q), {
      revenueSource: V2_INTEGRATED_MODE.revenueSource,
      costSource: V2_INTEGRATED_MODE.costSource,
      destination,
    });
    history.push({ quarter: q, signals, allocation, record });
    state = record.ending;
    last = record.consequence;
  }
  return { strategy, quarters: history, finalState: state, passed: history.every(h => h.record.passed) };
}

const has = (ctx: V2ArcContext, id: string) => ctx.signals.some(s => s.id === id);
const kpi = (ctx: V2ArcContext, id: string) => ctx.signals.find(s => s.id === `kpi-${id}`)?.shownValue ?? NaN;
const withCaps = (p: Partial<V2TeamState['capabilities']>, extra: Partial<V2TeamState> = {}) => () => {
  const b = getV2Baseline();
  return { ...b, ...extra, capabilities: { ...b.capabilities, ...p } };
};
const constant = (x: V2Allocation) => () => x;
const BALANCED = a({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 });

export const ARC_STRATEGIES: V2ArcStrategy[] = [
  { id: 'consumer100', name: 'Consumer100', description: '$30M Consumer every quarter', allocate: constant(a({ consumer: 30 })), destination: () => 'consumer-ai' },
  { id: 'enterprise100', name: 'Enterprise100', description: '$30M Enterprise every quarter', allocate: constant(a({ enterprise: 30 })), destination: () => 'enterprise-ai' },
  { id: 'ai100', name: 'AI100', description: '$30M AI & Product every quarter', allocate: constant(a({ aiProduct: 30 })), destination: () => 'consumer-ai' },
  { id: 'people100', name: 'People100', description: '$30M People every quarter', allocate: constant(a({ people: 30 })), destination: () => 'premium-human-ai' },
  { id: 'university100', name: 'University100', description: '$30M University & Credentials every quarter', allocate: constant(a({ universityCredentials: 30 })), destination: () => 'university-infrastructure' },
  { id: 'cash100', name: 'Cash100', description: 'Hold all $30M as Cash Reserve', allocate: constant(a({ cashReserve: 30 })), destination: () => 'balanced-marketplace' },
  { id: 'balanced', name: 'Balanced', description: '$5M in each bucket incl. $5M reserve', allocate: constant(BALANCED), destination: () => 'balanced-marketplace' },
  { id: 'consumer-ai', name: 'Consumer + AI', description: '$15M Consumer + $15M AI', allocate: constant(a({ consumer: 15, aiProduct: 15 })), destination: () => 'consumer-ai' },
  { id: 'enterprise-ai', name: 'Enterprise + AI', description: '$15M Enterprise + $15M AI', allocate: constant(a({ enterprise: 15, aiProduct: 15 })), destination: () => 'enterprise-ai' },
  {
    id: 'evidence-responsive', name: 'Evidence-responsive',
    description: 'Explores broadly in Q1, then follows the evidence: shifts toward Enterprise + AI when AI disruption and enterprise AI demand appear, keeps Consumer defended, commits to AI-powered Enterprise at Q4.',
    allocate: ctx => {
      if (ctx.quarter === 1) return BALANCED;
      const disruption = has(ctx, 'q2-ai-disruption') || has(ctx, 'q3-ai-engagement');
      const pipeline = kpi(ctx, 'enterprise-pipeline');
      if (!disruption) return BALANCED;
      if (ctx.quarter === 2) return a({ enterprise: 10, aiProduct: 10, consumer: 5, people: 5 });
      return pipeline > 85
        ? a({ enterprise: 12, aiProduct: 8, people: 5, consumer: 5 })
        : a({ enterprise: 10, aiProduct: 10, consumer: 5, people: 5 });
    },
    destination: () => 'enterprise-ai',
  },
  {
    id: 'wrong-way', name: 'Deliberately wrong-way',
    description: 'Doubles down on traditional Consumer through the AI disruption, then chases the Q3 AI engagement headline with an all-in AI bet, and commits to AI-powered Enterprise at Q4 without Enterprise capability.',
    allocate: ctx => (ctx.quarter <= 2 ? a({ consumer: 30 }) : a({ aiProduct: 30 })),
    destination: () => 'enterprise-ai',
  },
  { id: 'low-execution', name: 'Balanced, low Execution (30)', description: 'Balanced with Execution injected at 30', opening: withCaps({ execution: 30 }), allocate: constant(BALANCED), destination: () => 'balanced-marketplace' },
  { id: 'low-trust', name: 'Balanced, low Trust (40)', description: 'Balanced with Trust injected at 40', opening: withCaps({}, { trust: 40 }), allocate: constant(BALANCED), destination: () => 'balanced-marketplace' },
  { id: 'low-cs', name: 'Enterprise + AI, low CS (10)', description: 'Enterprise + AI with Customer Success injected at 10', opening: withCaps({ customerSuccess: 10 }), allocate: constant(a({ enterprise: 15, aiProduct: 15 })), destination: () => 'enterprise-ai' },
  { id: 'low-talent', name: 'AI100, low Talent (30)', description: 'AI100 with Talent injected at 30', opening: withCaps({ talent: 30 }), allocate: constant(a({ aiProduct: 30 })), destination: () => 'consumer-ai' },
];

export function runAllArcStrategies(quarters = lastAuthoredQuarter()): V2ArcRun[] {
  return ARC_STRATEGIES.map(s => runArc(s, quarters));
}


// ============ Q4 DESTINATION MATRIX ============

export const MATRIX_HISTORIES = ['consumer100', 'enterprise100', 'ai100', 'people100', 'university100', 'cash100', 'balanced', 'consumer-ai', 'enterprise-ai', 'evidence-responsive', 'wrong-way'];

export interface V2DestinationMatrixCell {
  historyId: string;
  destination: V2DestinationId;
  postQ4: 'same' | 'aligned';
  readiness: number;
  transitionLoad: number;
  run: V2ArcRun;
}

/** Run every history × destination through Q1–Q4 and the Q5–Q8 placeholder continuation. */
export function runDestinationMatrix(postQ4: 'same' | 'aligned' = 'aligned', quarters = 8, histories = MATRIX_HISTORIES): V2DestinationMatrixCell[] {
  const cells: V2DestinationMatrixCell[] = [];
  for (const h of histories) {
    const strategy = ARC_STRATEGIES.find(s => s.id === h)!;
    for (const d of V2_DESTINATION_IDS) {
      const run = runArc(strategy, quarters, { destination: d, postQ4Allocation: postQ4 });
      const ds = run.quarters[DESTINATION_COMMIT_QUARTER - 1].record.ending.destination!;
      cells.push({ historyId: h, destination: d, postQ4, readiness: ds.readinessAtCommit, transitionLoad: ds.transition.loadPerQuarter, run });
    }
  }
  return cells;
}
