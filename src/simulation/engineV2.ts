/**
 * V2 Simulation Engine — Phase 2A: Financial Accounting Core
 *
 * Parallel to the frozen V1 engine (engine.ts). Self-contained: imports nothing
 * from V1 (no runtime logic, no types). Phase 2B capability logic lives in
 * engineV2Capabilities.ts and Phase 2C commercial logic in engineV2Commercial.ts;
 * both are orchestrated here but audited separately from the financial ledger.
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
export type { V2CommercialState, V2CommercialConsequence, V2MarketConditions } from './engineV2Commercial';
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
  /** Source of operating inputs, for audit. */
  operatingInputsSource: 'carried-forward' | 'injected';
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

  /** Every completed quarter's financial ledger, in order. */
  ledgerHistory: V2FinancialLedger[];
  /** Every completed quarter's capability consequence, in order. */
  capabilityHistory: V2CapabilityConsequence[];
  /** Every completed quarter's commercial consequence, in order. */
  commercialHistory: V2CommercialConsequence[];
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
    ledgerHistory: [],
    capabilityHistory: [],
    commercialHistory: [],
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
export function calculateV2Ledger(opening: V2TeamState, input: V2QuarterInput): V2FinancialLedger {
  validateV2Allocation(input.allocation, input.strategicEnvelope);

  const injected = input.operatingInputs !== undefined;
  const revenue = injected ? input.operatingInputs!.revenue : opening.revenue;
  const operatingCost = injected ? input.operatingInputs!.operatingCost : opening.operatingCost;
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
    operatingInputsSource: injected ? 'injected' : 'carried-forward',
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
  // Financial consequence (Phase 2A) — unchanged
  const ledger = calculateV2Ledger(opening, input);
  const identity = checkV2AccountingIdentity(ledger);

  const flags: string[] = [];
  if (ledger.operatingProfit < 0) flags.push('OPERATING_LOSS');
  if (ledger.closingCash < 0) flags.push('NEGATIVE_CASH');
  if (ledger.openingCash >= 0 && ledger.closingCash < 0) flags.push('CASH_CROSSED_BELOW_ZERO');
  if (ledger.strategicInvestment === 0) flags.push('ZERO_STRATEGIC_INVESTMENT');
  if (!identity.holds) flags.push('ACCOUNTING_IDENTITY_VIOLATION');

  // Capability consequence (Phase 2B) — separate calculation; never touches cash
  const capability = calculateV2CapabilityConsequence(opening, input.allocation, input.quarter);
  const capabilityFlags: string[] = [];
  if (capability.absorptionFactor < 1) capabilityFlags.push('ABSORPTION_PENALTY');
  if (capability.loadToCapacityRatio > 1) capabilityFlags.push('LOAD_EXCEEDS_CAPACITY');
  if (capability.targets.some(t => t.wastedSaturation > 1e-9)) capabilityFlags.push('CAPABILITY_SATURATION_WASTE');

  // Commercial consequence (Phase 2C) — reads post-maturation capabilities + market; never touches cash
  const commercial = calculateV2CommercialConsequence(
    opening.commercial,
    capability.closing,
    input.market ?? getNeutralMarket(),
    input.quarter
  );
  const commercialFlags = commercial.indicators.filter(i => i.clipped).map(i => `CLIPPED_${i.indicator}`);

  return { quarter: input.quarter, ledger, identity, flags, capability, capabilityFlags, commercial, commercialFlags };
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
    ledgerHistory: [...state.ledgerHistory, ledger],
    capabilityHistory: [...state.capabilityHistory, capability],
    commercialHistory: [...state.commercialHistory, consequence.commercial],
  };
}
