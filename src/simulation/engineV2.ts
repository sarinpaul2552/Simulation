/**
 * V2 Simulation Engine — Phase 2A: Financial Accounting Core
 *
 * Parallel to the frozen V1 engine (engine.ts). Self-contained: imports nothing
 * from V1 (no runtime logic, no types). Phase 2B capability logic lives in
 * engineV2Capabilities.ts, Phase 2C commercial logic in engineV2Commercial.ts and
 * Phase 2D segment revenue in engineV2Revenue.ts and Phase 3A operating costs in
 * engineV2Costs.ts; all are orchestrated here but audited separately from the ledger.
 *
 * Canonical accounting identity (ECONOMICS_V2_ARCHITECTURE.md §1):
 *
 *   Operating Profit = Revenue − Operating Costs
 *   Closing Cash     = Opening Cash + Operating Profit − Strategic Investment
 *                      − Event Costs + Financing
 *
 * Phase 2A rules:
 *   - Cash is real cash. No ΔOperatingProfit-as-cash semantics.
 *   - No artificial cash floor. Negative cash is observable and never clamped.
 *   - Cash Reserve is unspent liquidity (memo line), never an inflow.
 *   - Strategic investment is real cash expenditure, separate from operating cost.
 *   - Financing is an explicit ledger line fixed at 0 (financing choices not yet implemented).
 *   - Event costs are an explicit, itemised ledger line (Q1–Q8 events not yet rebalanced;
 *     default is no event costs).
 *
 * Out of scope for Phase 2A (do not add here yet):
 *   capability/revenue calibration, financing choices, event rebalancing,
 *   scoring changes, Q4 destination effects.
 */

import {
  V2Capabilities,
  V2CapabilityConsequence,
  V2InvestmentCohort,
  calculateV2CapabilityConsequence,
} from './engineV2Capabilities';

import {
  V2CommercialState,
  V2CommercialConsequence,
  V2MarketConditions,
  calculateV2CommercialConsequence,
  calculateAIReadiness,
  getNeutralMarket,
  getV2CommercialBaseline,
} from './engineV2Commercial';

export type { V2Capabilities, V2CapabilityConsequence, V2InvestmentCohort } from './engineV2Capabilities';
import {
  V2BookingCohort,
  V2RevenueConsequence,
  V2SegmentRevenue,
  calculateV2RevenueConsequence,
  getV2RevenueBaseline,
} from './engineV2Revenue';

export type { V2CommercialState, V2CommercialConsequence, V2MarketConditions } from './engineV2Commercial';
import { V2CostConsequence, V2CostState, calculateV2CostConsequence, getV2CostBaseline } from './engineV2Costs';
import {
  V2DestinationId,
  V2DestinationState,
  V2DestinationEffects,
  commitDestination,
  destinationEffects,
} from './engineV2Destination';
export type { V2DestinationId, V2DestinationState, V2DestinationEffects } from './engineV2Destination';

export type { V2BookingCohort, V2RevenueConsequence, V2SegmentRevenue } from './engineV2Revenue';
export type { V2CostConsequence, V2CostState, V2CostCommitment } from './engineV2Costs';
export { getNeutralMarket } from './engineV2Commercial';

// ============ TYPES ============

/** The six V2 allocation buckets (Architecture §4). Values in $M. */
export interface V2Allocation {
  consumer: number;
  enterprise: number;
  aiProduct: number;
  people: number;
  universityCredentials: number;
  /** Unspent liquidity. Not expenditure, not an inflow. */
  cashReserve: number;
}

export type V2InvestmentBucket = Exclude<keyof V2Allocation, 'cashReserve'>;

export const V2_INVESTMENT_BUCKETS: V2InvestmentBucket[] = [
  'consumer',
  'enterprise',
  'aiProduct',
  'people',
  'universityCredentials',
];

export interface V2EventCost {
  id: string;
  description: string;
  /** Positive number = cash outflow ($M). */
  amount: number;
}

export interface V2FinancingItem {
  id: string;
  description: string;
  /** Positive = inflow, negative = outflow ($M). */
  amount: number;
}

/**
 * Operating inputs for a quarter. In Phase 2A there is no calibrated
 * revenue/cost model yet, so the default is to carry the opening run-rate
 * forward unchanged. Tests may inject explicit values.
 */
export interface V2OperatingInputs {
  revenue: number;
  operatingCost: number;
}

/** A fully auditable financial ledger for one quarter. All values in $M. */
export interface V2FinancialLedger {
  quarter: number;
  openingCash: number;
  revenue: number;
  operatingCost: number;
  operatingProfit: number;
  strategicInvestment: number;
  strategicInvestmentByBucket: Record<V2InvestmentBucket, number>;
  /** Memo only: portion of the strategic envelope left unspent. Never added to cash. */
  cashReserveRetained: number;
  strategicEnvelope: number;
  eventCosts: number;
  eventCostItems: V2EventCost[];
  financing: number;
  financingItems: V2FinancingItem[];
  closingCash: number;
  /** operatingProfit − strategicInvestment − eventCosts + financing */
  netCashFlow: number;
  /**
   * Source of revenue/operating cost, for audit:
   * 'carried-forward' (hold), 'injected' (test operating inputs), or
   * 'segment' (Phase 2D: revenue = Σ segment revenue; cost carried forward or overridden).
   */
  operatingInputsSource: 'carried-forward' | 'injected' | 'segment';
  /** Source of operating cost: carried forward, injected, overridden, or modelled (Phase 3A cost architecture). */
  operatingCostSource: 'carried-forward' | 'injected' | 'override' | 'modelled';
}

export interface V2TeamState {
  /** Last completed quarter (0 = pre-Q1 baseline). */
  quarter: number;

  // Financial
  revenue: number;
  operatingCost: number;
  operatingProfit: number;
  cash: number;
  debt: number;
  stockPrice: number;

  // Capabilities & operating state (Phase 2B)
  capabilities: V2Capabilities;
  productQuality: number;
  culture: number;
  trust: number;
  /** Finite transformation capacity (0–100 index). Raised by People investment as it matures. */
  organizationalCapacity: number;
  /** Transformation Load created by the most recent quarter's simultaneous initiatives. */
  transformationLoad: number;
  /** Carried unchanged in Phase 2B (no approved curve yet). */
  innovationVelocity: number;
  /** Carried unchanged in Phase 2B (no approved curve yet). */
  technicalDebt: number;
  /** Investment cohorts still maturing into capability. */
  pendingCohorts: V2InvestmentCohort[];

  /** Leading commercial indicators (Phase 2C). Not revenue. */
  commercial: V2CommercialState;

  /** Phase 2D segment revenue stocks (always computed; feeds the ledger only in 'segment' mode). */
  segmentRevenue: V2SegmentRevenue;
  /** Contracted Enterprise run-rate not yet live (booking cohorts). */
  enterpriseBacklog: V2BookingCohort[];
  /** Won University run-rate not yet live (booking cohorts). */
  universityBacklog: V2BookingCohort[];

  /** Phase 3A operating cost structure (fixed/semi-fixed pool + recurring commitment cohorts). */
  costs: V2CostState;

  /** Batch 2 · Q4 strategic destination (null until committed). */
  destination: V2DestinationState | null;

  /** Every completed quarter's financial ledger, in order. */
  ledgerHistory: V2FinancialLedger[];
  /** Every completed quarter's capability consequence, in order. */
  capabilityHistory: V2CapabilityConsequence[];
  /** Every completed quarter's commercial consequence, in order. */
  commercialHistory: V2CommercialConsequence[];
  /** Every completed quarter's segment revenue consequence, in order. */
  revenueHistory: V2RevenueConsequence[];
  /** Every completed quarter's operating cost consequence, in order. */
  costHistory: V2CostConsequence[];
}

export interface V2QuarterInput {
  quarter: number;
  allocation: V2Allocation;
  /** Size of the authorized strategic envelope ($M). Allocation must sum to it. */
  strategicEnvelope: number;
  /** Optional operating inputs; if omitted, opening run-rate is carried forward. */
  operatingInputs?: V2OperatingInputs;
  /** Itemised event costs; defaults to none. */
  eventCosts?: V2EventCost[];
  /** Market conditions for the commercial engine; defaults to the neutral market. */
  market?: V2MarketConditions;
  /**
   * Revenue source for the ledger. 'hold' (default) keeps Phase 2A–2C behaviour: revenue carried
   * forward or taken from operatingInputs. 'segment' (Phase 2D): ledger revenue = Σ segment revenue.
   */
  revenueSource?: 'hold' | 'segment';
  /** 'segment' mode only: operating cost override (otherwise carried forward). */
  operatingCostOverride?: number;
  /**
   * Operating cost source. 'hold' (default) keeps Phase 2A–2D behaviour. 'modelled' (Phase 3A, requires
   * revenueSource 'segment'): ledger operating cost = fixed/semi-fixed + variable + commitments.
   */
  costSource?: 'hold' | 'modelled';
  /**
   * Batch 2 · Q4: commit to a strategic destination this quarter. Allowed once (when no destination
   * exists); repeating the same destination is a no-op. Switching is architecturally supported by
   * V2DestinationState (history + transition) but not yet enabled.
   */
  destination?: V2DestinationId;
}

/**
 * One quarter's outcome. The financial consequence (`ledger`, `identity`, `flags`)
 * and the capability consequence (`capability`, `capabilityFlags`) are computed by
 * separate functions and can be audited independently.
 */
export interface V2Consequence {
  quarter: number;
  // Financial consequence (Phase 2A)
  ledger: V2FinancialLedger;
  identity: V2IdentityCheck;
  flags: string[];
  // Capability consequence (Phase 2B)
  capability: V2CapabilityConsequence;
  capabilityFlags: string[];
  // Commercial consequence (Phase 2C) — leading indicators only, no revenue
  commercial: V2CommercialConsequence;
  commercialFlags: string[];
  // Segment revenue consequence (Phase 2D)
  revenue: V2RevenueConsequence;
  revenueSource: 'hold' | 'segment';
  // Operating cost consequence (Phase 3A)
  cost: V2CostConsequence;
  costSource: 'hold' | 'modelled';
  // Integrated financial summary (Phase 3B) — derived from the ledger only
  financials: V2FinancialSummary;
  // Strategic destination (Batch 2 · Q4) — effects on focus/ceiling/access/transition only
  destination: V2DestinationEffects;
  destinationState: V2DestinationState | null;
}

export interface V2IdentityCheck {
  operatingProfitHolds: boolean;
  closingCashHolds: boolean;
  holds: boolean;
  operatingProfitResidual: number;
  closingCashResidual: number;
  expectedClosingCash: number;
}

export const V2_IDENTITY_TOLERANCE = 1e-9;

/**
 * Phase 3B integrated financial summary, derived purely from the ledger (no new accounting).
 * Operating cash generation = operating profit (no working-capital model yet).
 */
export interface V2FinancialSummary {
  quarter: number;
  revenue: number;
  operatingCost: number;
  operatingProfit: number;
  /** operatingProfit / revenue (null when revenue is 0). */
  operatingMargin: number | null;
  strategicInvestment: number;
  eventCosts: number;
  financing: number;
  operatingCashGeneration: number;
  /** operatingCashGeneration − strategicInvestment − eventCosts + financing */
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
  /**
   * Simple runway indicator at this quarter's net cash flow:
   * 'self-funding' (net cash flow ≥ 0), 'burning' (cash > 0, quarters = cash / burn),
   * 'cash-negative' (cash ≤ 0 while burning; quarters = 0). No floor is applied.
   */
  runway: { status: 'self-funding' | 'burning' | 'cash-negative'; quarters: number | null };
  /** Runway if strategic investment stopped: only operating losses consume cash. */
  operatingRunway: { status: 'self-funding' | 'burning' | 'cash-negative'; quarters: number | null };
}

function runwayOf(cash: number, flow: number): V2FinancialSummary['runway'] {
  if (flow >= 0) return { status: 'self-funding', quarters: null };
  if (cash <= 0) return { status: 'cash-negative', quarters: 0 };
  return { status: 'burning', quarters: cash / -flow };
}

export function summarizeV2Financials(ledger: V2FinancialLedger): V2FinancialSummary {
  const operatingCashGeneration = ledger.operatingProfit;
  const netCashFlow = operatingCashGeneration - ledger.strategicInvestment - ledger.eventCosts + ledger.financing;
  return {
    quarter: ledger.quarter,
    revenue: ledger.revenue,
    operatingCost: ledger.operatingCost,
    operatingProfit: ledger.operatingProfit,
    operatingMargin: ledger.revenue !== 0 ? ledger.operatingProfit / ledger.revenue : null,
    strategicInvestment: ledger.strategicInvestment,
    eventCosts: ledger.eventCosts,
    financing: ledger.financing,
    operatingCashGeneration,
    netCashFlow,
    openingCash: ledger.openingCash,
    closingCash: ledger.closingCash,
    runway: runwayOf(ledger.closingCash, netCashFlow),
    operatingRunway: runwayOf(ledger.closingCash, operatingCashGeneration - ledger.eventCosts + ledger.financing),
  };
}

/** Phase 3B integrated financial model: segment revenue + modelled operating cost. */
export const V2_INTEGRATED_MODE = { revenueSource: 'segment', costSource: 'modelled' } as const;

// ============ BASELINE ============

/** V2 starting company (Architecture §1–2; Notion "Starting company"). */
export function getV2Baseline(): V2TeamState {
  const capabilities = {
    consumer: 55,
    enterprise: 30,
    ai: 10,
    talent: 55,
    credential: 40,
    customerSuccess: 30,
    execution: 60,
  };
  const productQuality = 70;
  const trust = 70;
  const commercial = getV2CommercialBaseline();
  commercial.aiCommercialReadiness = calculateAIReadiness({ capabilities, productQuality, trust }).readiness;
  const revenueBaseline = getV2RevenueBaseline();
  return {
    quarter: 0,
    revenue: 200,
    operatingCost: 170,
    operatingProfit: 30,
    cash: 60,
    debt: 0,
    stockPrice: 100,
    productQuality,
    culture: 72,
    trust,
    capabilities,
    organizationalCapacity: 60,
    transformationLoad: 0,
    innovationVelocity: 55,
    technicalDebt: 25,
    pendingCohorts: [],
    commercial,
    segmentRevenue: revenueBaseline.segments,
    enterpriseBacklog: revenueBaseline.enterpriseBacklog,
    universityBacklog: revenueBaseline.universityBacklog,
    costs: getV2CostBaseline(),
    destination: null,
    ledgerHistory: [],
    capabilityHistory: [],
    commercialHistory: [],
    revenueHistory: [],
    costHistory: [],
  };
}

// ============ VALIDATION ============

export function validateV2Allocation(allocation: V2Allocation, strategicEnvelope: number): void {
  const entries = Object.entries(allocation) as [keyof V2Allocation, number][];
  for (const [bucket, amount] of entries) {
    if (!Number.isFinite(amount)) {
      throw new Error(`V2 allocation ${bucket} must be finite, got ${amount}`);
    }
    if (amount < 0) {
      throw new Error(`V2 allocation ${bucket} must be non-negative, got ${amount}`);
    }
  }
  if (!Number.isFinite(strategicEnvelope) || strategicEnvelope < 0) {
    throw new Error(`V2 strategic envelope must be a non-negative finite number, got ${strategicEnvelope}`);
  }
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  if (Math.abs(total - strategicEnvelope) > 0.01) {
    throw new Error(`V2 allocation must total the strategic envelope ${strategicEnvelope}, got ${total}`);
  }
}

// ============ LEDGER ============

export function sumStrategicInvestment(allocation: V2Allocation): number {
  return V2_INVESTMENT_BUCKETS.reduce((sum, bucket) => sum + allocation[bucket], 0);
}

/**
 * Build one quarter's financial ledger from opening state + inputs.
 * Pure: does not mutate `opening`.
 */
export function calculateV2Ledger(
  opening: V2TeamState,
  input: V2QuarterInput,
  /** Phase 2D: Σ segment revenue; required when input.revenueSource === 'segment'. */
  segmentTotalRevenue?: number,
  /** Phase 3A: modelled operating cost; required when input.costSource === 'modelled'. */
  modelledOperatingCost?: number
): V2FinancialLedger {
  validateV2Allocation(input.allocation, input.strategicEnvelope);

  const segmentMode = input.revenueSource === 'segment';
  if (segmentMode && input.operatingInputs !== undefined) {
    throw new Error("Revenue is endogenous in 'segment' mode; inject operating cost via operatingCostOverride, not operatingInputs");
  }
  if (segmentMode && segmentTotalRevenue === undefined) {
    throw new Error("'segment' revenue mode requires the segment total revenue");
  }
  const modelledCost = input.costSource === 'modelled';
  if (modelledCost && !segmentMode) {
    throw new Error("costSource 'modelled' requires revenueSource 'segment' (variable cost follows segment activity)");
  }
  if (modelledCost && input.operatingCostOverride !== undefined) {
    throw new Error("operatingCostOverride cannot be combined with costSource 'modelled'");
  }
  if (modelledCost && modelledOperatingCost === undefined) {
    throw new Error("costSource 'modelled' requires the modelled operating cost");
  }
  const injected = input.operatingInputs !== undefined;
  const revenue = segmentMode ? segmentTotalRevenue! : injected ? input.operatingInputs!.revenue : opening.revenue;
  const operatingCost = modelledCost
    ? modelledOperatingCost!
    : segmentMode
      ? input.operatingCostOverride ?? opening.operatingCost
      : injected
        ? input.operatingInputs!.operatingCost
        : opening.operatingCost;
  const operatingCostSource: V2FinancialLedger['operatingCostSource'] = modelledCost
    ? 'modelled'
    : segmentMode
      ? input.operatingCostOverride !== undefined ? 'override' : 'carried-forward'
      : injected ? 'injected' : 'carried-forward';
  if (!Number.isFinite(revenue) || !Number.isFinite(operatingCost)) {
    throw new Error(`V2 operating inputs must be finite (revenue=${revenue}, operatingCost=${operatingCost})`);
  }

  // Operating Profit = Revenue − Operating Costs
  const operatingProfit = revenue - operatingCost;

  // Strategic investment: real cash expenditure, outside operating cost
  const strategicInvestmentByBucket = V2_INVESTMENT_BUCKETS.reduce(
    (acc, bucket) => ({ ...acc, [bucket]: input.allocation[bucket] }),
    {} as Record<V2InvestmentBucket, number>
  );
  const strategicInvestment = sumStrategicInvestment(input.allocation);

  // Event costs: explicit and itemised (none by default in Phase 2A)
  const eventCostItems = (input.eventCosts ?? []).map(e => ({ ...e }));
  for (const e of eventCostItems) {
    if (!Number.isFinite(e.amount) || e.amount < 0) {
      throw new Error(`V2 event cost ${e.id} must be a non-negative finite outflow, got ${e.amount}`);
    }
  }
  const eventCosts = eventCostItems.reduce((sum, e) => sum + e.amount, 0);

  // Financing: explicit line, fixed at 0 until financing choices are implemented
  const financingItems: V2FinancingItem[] = [];
  const financing = 0;

  const netCashFlow = operatingProfit - strategicInvestment - eventCosts + financing;

  // Closing Cash = Opening Cash + Operating Profit − Strategic Investment − Event Costs + Financing
  // No floor. Negative cash is allowed and observable.
  const closingCash = opening.cash + operatingProfit - strategicInvestment - eventCosts + financing;

  return {
    quarter: input.quarter,
    openingCash: opening.cash,
    revenue,
    operatingCost,
    operatingProfit,
    strategicInvestment,
    strategicInvestmentByBucket,
    cashReserveRetained: input.allocation.cashReserve,
    strategicEnvelope: input.strategicEnvelope,
    eventCosts,
    eventCostItems,
    financing,
    financingItems,
    closingCash,
    netCashFlow,
    operatingInputsSource: segmentMode ? 'segment' : injected ? 'injected' : 'carried-forward',
    operatingCostSource,
  };
}

/**
 * Independently re-derive both identities from the ledger's own components.
 * Used by Test Lab and tests; never used to produce the ledger.
 */
export function checkV2AccountingIdentity(
  ledger: V2FinancialLedger,
  tolerance: number = V2_IDENTITY_TOLERANCE
): V2IdentityCheck {
  const operatingProfitResidual = ledger.operatingProfit - (ledger.revenue - ledger.operatingCost);
  const itemisedEvents = ledger.eventCostItems.reduce((s, e) => s + e.amount, 0);
  const itemisedFinancing = ledger.financingItems.reduce((s, f) => s + f.amount, 0);
  const bucketTotal = V2_INVESTMENT_BUCKETS.reduce((s, b) => s + ledger.strategicInvestmentByBucket[b], 0);

  const expectedClosingCash =
    ledger.openingCash + ledger.operatingProfit - ledger.strategicInvestment - ledger.eventCosts + ledger.financing;
  const closingCashResidual = ledger.closingCash - expectedClosingCash;

  const componentsConsistent =
    Math.abs(itemisedEvents - ledger.eventCosts) <= tolerance &&
    Math.abs(itemisedFinancing - ledger.financing) <= tolerance &&
    Math.abs(bucketTotal - ledger.strategicInvestment) <= tolerance;

  const operatingProfitHolds = Math.abs(operatingProfitResidual) <= tolerance;
  const closingCashHolds = Math.abs(closingCashResidual) <= tolerance && componentsConsistent;

  return {
    operatingProfitHolds,
    closingCashHolds,
    holds: operatingProfitHolds && closingCashHolds,
    operatingProfitResidual,
    closingCashResidual,
    expectedClosingCash,
  };
}

// ============ QUARTER ============

export function calculateV2QuarterConsequence(opening: V2TeamState, input: V2QuarterInput): V2Consequence {
  const market = input.market ?? getNeutralMarket();

  // Strategic destination (Batch 2 · Q4): commit once; effects change focus, ceilings, access and transition only
  let destinationState = opening.destination;
  if (input.destination !== undefined) {
    if (destinationState === null) {
      destinationState = commitDestination(input.destination, opening, input.quarter);
    } else if (destinationState.id !== input.destination) {
      throw new Error(`Destination switching (${destinationState.id} → ${input.destination}) is not yet implemented`);
    }
  }
  const destination = destinationEffects(destinationState, input.quarter);
  const accessibleMarket: V2MarketConditions = {
    ...market,
    segmentCapacity: {
      consumer: market.segmentCapacity.consumer * destination.accessMultiplier.consumer,
      enterprise: market.segmentCapacity.enterprise * destination.accessMultiplier.enterprise,
      university: market.segmentCapacity.university * destination.accessMultiplier.university,
      aiNative: market.segmentCapacity.aiNative * destination.accessMultiplier.aiNative,
    },
  };

  // Capability consequence (Phase 2B) — never touches cash
  const capability = calculateV2CapabilityConsequence(
    opening,
    input.allocation,
    input.quarter,
    destination.destinationId ? destination : undefined
  );
  const capabilityFlags: string[] = [];
  if (capability.absorptionFactor < 1) capabilityFlags.push('ABSORPTION_PENALTY');
  if (capability.loadToCapacityRatio > 1) capabilityFlags.push('LOAD_EXCEEDS_CAPACITY');
  if (capability.targets.some(t => t.wastedSaturation > 1e-9)) capabilityFlags.push('CAPABILITY_SATURATION_WASTE');

  // Commercial consequence (Phase 2C) — reads post-maturation capabilities + market; never touches cash
  const commercial = calculateV2CommercialConsequence(
    opening.commercial,
    capability.closing,
    market,
    input.quarter,
    destination.destinationId ? destination.commercialization : undefined
  );
  const commercialFlags = commercial.indicators.filter(i => i.clipped).map(i => `CLIPPED_${i.indicator}`);

  // Segment revenue consequence (Phase 2D) — reads commercial state; investment never enters
  const revenue = calculateV2RevenueConsequence(
    { segments: opening.segmentRevenue, enterpriseBacklog: opening.enterpriseBacklog, universityBacklog: opening.universityBacklog },
    opening.commercial,
    commercial,
    capability.closing,
    accessibleMarket,
    input.quarter
  );
  const revenueSource = input.revenueSource ?? 'hold';

  // Operating cost consequence (Phase 3A) — investment only creates FUTURE commitments; never expensed here
  const cost = calculateV2CostConsequence(
    opening.costs,
    opening.segmentRevenue,
    revenue,
    { people: input.allocation.people, enterprise: input.allocation.enterprise, aiProduct: input.allocation.aiProduct },
    market,
    input.quarter
  );
  const costSource = input.costSource ?? 'hold';

  // Financial consequence (Phase 2A identity) — revenue from segments / cost from model only when selected
  const ledger = calculateV2Ledger(
    opening,
    input,
    revenueSource === 'segment' ? revenue.totalRevenue : undefined,
    costSource === 'modelled' ? cost.totalOperatingCost : undefined
  );
  const identity = checkV2AccountingIdentity(ledger);

  const flags: string[] = [];
  if (ledger.operatingProfit < 0) flags.push('OPERATING_LOSS');
  if (ledger.closingCash < 0) flags.push('NEGATIVE_CASH');
  if (ledger.openingCash >= 0 && ledger.closingCash < 0) flags.push('CASH_CROSSED_BELOW_ZERO');
  if (ledger.strategicInvestment === 0) flags.push('ZERO_STRATEGIC_INVESTMENT');
  if (!identity.holds) flags.push('ACCOUNTING_IDENTITY_VIOLATION');

  return {
    quarter: input.quarter, ledger, identity, flags, capability, capabilityFlags, commercial, commercialFlags,
    revenue, revenueSource, cost, costSource, financials: summarizeV2Financials(ledger),
    destination, destinationState,
  };
}

/**
 * Apply a V2 consequence to state. Pure. No clamping of financial values.
 * Capability values come from the capability consequence (already capped at 100).
 */
export function applyV2Consequence(state: V2TeamState, consequence: V2Consequence): V2TeamState {
  const { ledger, capability } = consequence;
  return {
    ...state,
    quarter: ledger.quarter,
    revenue: ledger.revenue,
    operatingCost: ledger.operatingCost,
    operatingProfit: ledger.operatingProfit,
    cash: ledger.closingCash,
    capabilities: { ...capability.closing.capabilities },
    productQuality: capability.closing.productQuality,
    culture: capability.closing.culture,
    trust: capability.closing.trust,
    organizationalCapacity: capability.closing.organizationalCapacity,
    transformationLoad: capability.closing.transformationLoad,
    innovationVelocity: capability.closing.innovationVelocity,
    technicalDebt: capability.closing.technicalDebt,
    pendingCohorts: capability.pendingCohortsAfter,
    commercial: consequence.commercial.closing,
    segmentRevenue: consequence.revenue.closing.segments,
    enterpriseBacklog: consequence.revenue.closing.enterpriseBacklog,
    universityBacklog: consequence.revenue.closing.universityBacklog,
    costs: consequence.cost.closing,
    destination: consequence.destinationState,
    ledgerHistory: [...state.ledgerHistory, ledger],
    capabilityHistory: [...state.capabilityHistory, capability],
    commercialHistory: [...state.commercialHistory, consequence.commercial],
    revenueHistory: [...state.revenueHistory, consequence.revenue],
    costHistory: [...state.costHistory, consequence.cost],
  };
}
