import {
  V2Allocation,
  V2Consequence,
  V2EventCost,
  V2OperatingInputs,
  V2TeamState,
  calculateV2QuarterConsequence,
  getV2Baseline,
  V2_IDENTITY_TOLERANCE,
} from '../../simulation/engineV2';
import {
  calculateAbsorptionFactor,
  readTarget,
  V2_ABSORPTION_FLOOR,
  V2_CAPABILITY_MAX,
} from '../../simulation/engineV2Capabilities';
import { applyV2, getV2StartingState, v1AllocationToV2 } from './v2StateBuilder';
import { AllocationStrategy, weightsToAllocation } from './testPresets';
import gameplayContent from '../../content/gameplay.json';

/**
 * V2 LEDGER DIAGNOSTICS (Phase 2A)
 *
 * Deterministic accounting scenarios + per-quarter ledger invariants.
 * Shared by Test Lab Mode 5 and the headless Vitest suite so both run
 * exactly the same cases.
 */

// ============ PER-QUARTER LEDGER INVARIANTS ============

export interface V2LedgerCheck {
  id: string;
  message: string;
  passed: boolean;
  details: string;
}

export interface V2QuarterRecord {
  quarter: number;
  opening: V2TeamState;
  allocation: V2Allocation;
  consequence: V2Consequence;
  ending: V2TeamState;
  checks: V2LedgerCheck[];
  passed: boolean;
}

const fmt = (n: number) => `$${n.toFixed(2)}M`;
const near = (a: number, b: number, tol = V2_IDENTITY_TOLERANCE) => Math.abs(a - b) <= tol;

export function checkV2Quarter(
  opening: V2TeamState,
  allocation: V2Allocation,
  consequence: V2Consequence,
  ending: V2TeamState,
  operatingInputs?: V2OperatingInputs
): V2LedgerCheck[] {
  const L = consequence.ledger;
  const checks: V2LedgerCheck[] = [];

  checks.push({
    id: 'v2_identity_operating_profit',
    message: 'Operating Profit = Revenue − Operating Costs',
    passed: consequence.identity.operatingProfitHolds,
    details: `${fmt(L.revenue)} − ${fmt(L.operatingCost)} = ${fmt(L.revenue - L.operatingCost)}; ledger ${fmt(L.operatingProfit)}`,
  });

  checks.push({
    id: 'v2_identity_closing_cash',
    message: 'Closing = Opening + OpProfit − Strategic − Events + Financing',
    passed: consequence.identity.closingCashHolds,
    details: `${fmt(L.openingCash)} + ${fmt(L.operatingProfit)} − ${fmt(L.strategicInvestment)} − ${fmt(L.eventCosts)} + ${fmt(L.financing)} = ${fmt(consequence.identity.expectedClosingCash)}; ledger ${fmt(L.closingCash)}`,
  });

  checks.push({
    id: 'v2_opening_links_prior_close',
    message: 'Opening cash equals prior closing cash',
    passed: near(L.openingCash, opening.cash),
    details: `opening ${fmt(L.openingCash)}, prior state cash ${fmt(opening.cash)}`,
  });

  checks.push({
    id: 'v2_state_cash_equals_ledger',
    message: 'State cash equals ledger closing cash (no floor, no clamp)',
    passed: near(ending.cash, L.closingCash),
    details: `state ${fmt(ending.cash)}, ledger ${fmt(L.closingCash)}`,
  });

  checks.push({
    id: 'v2_cash_reserve_not_inflow',
    message: 'Cash Reserve is memo only (Strategic = Envelope − Reserve)',
    passed: near(L.strategicInvestment, L.strategicEnvelope - allocation.cashReserve, 0.01) &&
      near(L.cashReserveRetained, allocation.cashReserve),
    details: `envelope ${fmt(L.strategicEnvelope)}, reserve ${fmt(L.cashReserveRetained)}, strategic ${fmt(L.strategicInvestment)}`,
  });

  const expectedOpex = operatingInputs ? operatingInputs.operatingCost : opening.operatingCost;
  checks.push({
    id: 'v2_strategic_outside_opex',
    message: 'Strategic investment is not included in operating cost',
    passed: near(L.operatingCost, expectedOpex),
    details: `operating cost ${fmt(L.operatingCost)} (expected ${fmt(expectedOpex)}); strategic ${fmt(L.strategicInvestment)} booked separately`,
  });

  checks.push({
    id: 'v2_financing_explicit_zero',
    message: 'Financing is an explicit line and 0 (no financing choices yet)',
    passed: L.financing === 0 && L.financingItems.length === 0,
    details: `financing ${fmt(L.financing)}`,
  });

  checks.push({
    id: 'v2_all_finite',
    message: 'All ledger values finite',
    passed: [L.openingCash, L.revenue, L.operatingCost, L.operatingProfit, L.strategicInvestment, L.eventCosts, L.financing, L.closingCash].every(Number.isFinite),
    details: '',
  });

  checks.push(...checkV2CapabilityQuarter(opening, consequence, ending));

  return checks;
}

/** Phase 2B capability-consequence invariants (audited separately from the ledger). */
export function checkV2CapabilityQuarter(
  opening: V2TeamState,
  consequence: V2Consequence,
  ending: V2TeamState
): V2LedgerCheck[] {
  const C = consequence.capability;
  const tol = 1e-9;
  const checks: V2LedgerCheck[] = [];

  const loadSum = C.buckets.reduce((s, b) => s + b.transformationLoad, 0);
  checks.push({
    id: 'cap_load_aggregates',
    message: 'Transformation Load = Σ bucket loads',
    passed: near(C.transformationLoad, loadSum, tol),
    details: `load ${C.transformationLoad.toFixed(3)} vs Σ ${loadSum.toFixed(3)}`,
  });

  const expectedFactor = calculateAbsorptionFactor(C.transformationLoad / opening.organizationalCapacity);
  checks.push({
    id: 'cap_absorption_factor',
    message: 'Absorption factor from Load ÷ opening Org Capacity, within [0.40, 1.00]',
    passed: near(C.absorptionFactor, expectedFactor, tol) && C.absorptionFactor >= V2_ABSORPTION_FLOOR - tol && C.absorptionFactor <= 1 + tol &&
      near(C.openingOrganizationalCapacity, opening.organizationalCapacity, tol),
    details: `ratio ${(C.loadToCapacityRatio * 100).toFixed(1)}% → factor ${C.absorptionFactor.toFixed(4)}`,
  });

  const badNew = C.newCohorts.flatMap(c => c.gains.filter(g => !near(g.effectiveGain, g.nominalGain * c.absorptionFactor, tol)).map(g => `${c.id}/${g.target}`));
  checks.push({
    id: 'cap_effective_equals_nominal_x_factor',
    message: 'New cohorts: effective gain = nominal gain × absorption factor',
    passed: badNew.length === 0,
    details: badNew.join(', '),
  });

  const allCohorts = [...C.pendingCohortsAfter, ...C.completedCohorts];
  const badConservation = allCohorts.flatMap(c => c.gains.filter(g => !near(g.maturedToDate + g.remaining, g.effectiveGain, 1e-9) || g.remaining < -tol).map(g => `${c.id}/${g.target}`));
  checks.push({
    id: 'cap_cohort_conservation',
    message: 'Every cohort: matured to date + remaining = effective gain',
    passed: badConservation.length === 0,
    details: badConservation.join(', '),
  });

  const badTargets = C.targets.filter(t =>
    !near(t.closing, t.opening + t.realized, tol) ||
    !near(t.realized + t.wastedSaturation, t.maturedThisQuarter, tol) ||
    t.realized < -tol || t.wastedSaturation < -tol);
  checks.push({
    id: 'cap_target_reconciliation',
    message: 'Per target: closing = opening + realized; realized + wasted = matured',
    passed: badTargets.length === 0,
    details: badTargets.map(t => t.target).join(', '),
  });

  const reduced = C.targets.filter(t => t.closing < t.opening - tol);
  checks.push({
    id: 'cap_existing_stock_never_reduced',
    message: 'Existing capability stock is never reduced by the pipeline',
    passed: reduced.length === 0,
    details: reduced.map(t => `${t.target} ${t.opening.toFixed(2)}→${t.closing.toFixed(2)}`).join(', '),
  });

  const overCap = C.targets.filter(t => t.closing > V2_CAPABILITY_MAX + tol && t.closing > t.opening + tol);
  checks.push({
    id: 'cap_bounded_at_100',
    message: 'No capability pushed above 100',
    passed: overCap.length === 0,
    details: overCap.map(t => `${t.target} ${t.closing.toFixed(2)}`).join(', '),
  });

  const mismatched = C.targets.filter(t => !near(readTarget(ending, t.target), t.closing, tol));
  checks.push({
    id: 'cap_state_matches_consequence',
    message: 'Ending state equals capability consequence closing values',
    passed: mismatched.length === 0 && ending.pendingCohorts.length === C.pendingCohortsAfter.length,
    details: mismatched.map(t => t.target).join(', '),
  });

  return checks;
}

export function runV2Quarter(
  opening: V2TeamState,
  quarter: number,
  allocation: V2Allocation,
  strategicEnvelope: number,
  operatingInputs?: V2OperatingInputs,
  eventCosts?: V2EventCost[]
): V2QuarterRecord {
  const consequence = calculateV2QuarterConsequence(opening, {
    quarter,
    allocation,
    strategicEnvelope,
    operatingInputs,
    eventCosts,
  });
  const ending = applyV2(opening, consequence);
  const checks = checkV2Quarter(opening, allocation, consequence, ending, operatingInputs);
  return { quarter, opening, allocation, consequence, ending, checks, passed: checks.every(c => c.passed) };
}

// ============ DETERMINISTIC SCENARIOS ============

export interface V2ScenarioStep {
  allocation: V2Allocation;
  strategicEnvelope: number;
  operatingInputs?: V2OperatingInputs;
  eventCosts?: V2EventCost[];
  expectedClosingCash: number;
  expectedOperatingProfit: number;
  expectedStrategicInvestment: number;
  expectedFlags?: string[];
}

export interface V2Scenario {
  id: string;
  name: string;
  description: string;
  steps: V2ScenarioStep[];
}

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});

export const V2_SCENARIOS: V2Scenario[] = [
  {
    id: 'positive-cash-generation',
    name: 'Positive cash generation',
    description: 'Baseline $200M revenue / $170M opex, $10M invested, $20M held in reserve. Cash rises by $20M (reserve is not added back).',
    steps: [
      {
        allocation: alloc({ consumer: 10, cashReserve: 20 }),
        strategicEnvelope: 30,
        expectedOperatingProfit: 30,
        expectedStrategicInvestment: 10,
        expectedClosingCash: 80, // 60 + 30 − 10
      },
    ],
  },
  {
    id: 'strategic-spending',
    name: 'Strategic spending',
    description: 'Full $30M envelope invested across five buckets. Operating cost stays $170M; the $30M is booked as strategic cash outflow.',
    steps: [
      {
        allocation: alloc({ consumer: 10, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5 }),
        strategicEnvelope: 30,
        expectedOperatingProfit: 30,
        expectedStrategicInvestment: 30,
        expectedClosingCash: 60, // 60 + 30 − 30
      },
    ],
  },
  {
    id: 'operating-loss',
    name: 'Operating loss',
    description: 'Injected revenue $150M vs opex $170M, zero investment. Operating loss of $20M flows straight to cash.',
    steps: [
      {
        allocation: alloc({ cashReserve: 30 }),
        strategicEnvelope: 30,
        operatingInputs: { revenue: 150, operatingCost: 170 },
        expectedOperatingProfit: -20,
        expectedStrategicInvestment: 0,
        expectedClosingCash: 40, // 60 − 20
        expectedFlags: ['OPERATING_LOSS', 'ZERO_STRATEGIC_INVESTMENT'],
      },
    ],
  },
  {
    id: 'zero-investment',
    name: 'Zero investment (8 quarters)',
    description: 'Entire envelope held as Cash Reserve for Q1–Q8 at the flat baseline run-rate. Cash grows only by operating profit: 60 + 8×30 = 300.',
    steps: Array.from({ length: 8 }, (_, i) => ({
      allocation: alloc({ cashReserve: 30 }),
      strategicEnvelope: 30,
      expectedOperatingProfit: 30,
      expectedStrategicInvestment: 0,
      expectedClosingCash: 60 + 30 * (i + 1),
      expectedFlags: ['ZERO_STRATEGIC_INVESTMENT'],
    })),
  },
  {
    id: 'cash-below-zero',
    name: 'Cash crossing below zero',
    description: 'Injected revenue $160M vs opex $170M, full $30M invested every quarter: −$40M/quarter. 60 → 20 → −20 → −60 → −100. No floor, no financing.',
    steps: [20, -20, -60, -100].map((expected, i) => ({
      allocation: alloc({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 }),
      strategicEnvelope: 30,
      operatingInputs: { revenue: 160, operatingCost: 170 },
      expectedOperatingProfit: -10,
      expectedStrategicInvestment: 30,
      expectedClosingCash: expected,
      expectedFlags: i === 1
        ? ['OPERATING_LOSS', 'NEGATIVE_CASH', 'CASH_CROSSED_BELOW_ZERO']
        : i > 1 ? ['OPERATING_LOSS', 'NEGATIVE_CASH'] : ['OPERATING_LOSS'],
    })),
  },
  {
    id: 'event-cost-line',
    name: 'Event cost line (mechanics only)',
    description: 'Synthetic $12M event cost to prove the event line is separately auditable. Not a Q1–Q8 event rebalance.',
    steps: [
      {
        allocation: alloc({ aiProduct: 10, cashReserve: 20 }),
        strategicEnvelope: 30,
        eventCosts: [{ id: 'synthetic-shock', description: 'Synthetic test shock', amount: 12 }],
        expectedOperatingProfit: 30,
        expectedStrategicInvestment: 10,
        expectedClosingCash: 68, // 60 + 30 − 10 − 12
      },
    ],
  },
];

export interface V2ScenarioResult {
  scenario: V2Scenario;
  quarters: V2QuarterRecord[];
  expectationChecks: V2LedgerCheck[][];
  passed: boolean;
}

export function runV2Scenario(scenario: V2Scenario): V2ScenarioResult {
  let state = getV2StartingState();
  const quarters: V2QuarterRecord[] = [];
  const expectationChecks: V2LedgerCheck[][] = [];

  scenario.steps.forEach((step, idx) => {
    const rec = runV2Quarter(state, idx + 1, step.allocation, step.strategicEnvelope, step.operatingInputs, step.eventCosts);
    const L = rec.consequence.ledger;
    const exp: V2LedgerCheck[] = [
      {
        id: 'expected_operating_profit',
        message: 'Operating profit matches hand-computed expectation',
        passed: near(L.operatingProfit, step.expectedOperatingProfit, 1e-6),
        details: `expected ${fmt(step.expectedOperatingProfit)}, got ${fmt(L.operatingProfit)}`,
      },
      {
        id: 'expected_strategic_investment',
        message: 'Strategic investment matches hand-computed expectation',
        passed: near(L.strategicInvestment, step.expectedStrategicInvestment, 1e-6),
        details: `expected ${fmt(step.expectedStrategicInvestment)}, got ${fmt(L.strategicInvestment)}`,
      },
      {
        id: 'expected_closing_cash',
        message: 'Closing cash matches hand-computed expectation',
        passed: near(L.closingCash, step.expectedClosingCash, 1e-6),
        details: `expected ${fmt(step.expectedClosingCash)}, got ${fmt(L.closingCash)}`,
      },
    ];
    if (step.expectedFlags) {
      const want = [...step.expectedFlags].sort().join(',');
      const got = [...rec.consequence.flags].sort().join(',');
      exp.push({
        id: 'expected_flags',
        message: 'Ledger flags match expectation',
        passed: want === got,
        details: `expected [${want}], got [${got}]`,
      });
    }
    quarters.push(rec);
    expectationChecks.push(exp);
    state = rec.ending;
  });

  const passed = quarters.every(q => q.passed) && expectationChecks.every(list => list.every(c => c.passed));
  return { scenario, quarters, expectationChecks, passed };
}

export function runAllV2Scenarios(): V2ScenarioResult[] {
  return V2_SCENARIOS.map(runV2Scenario);
}

// ============ Q1–Q8 STRATEGY RUN (existing presets on V2 ledger) ============

export type V2OperatingMode = 'carried-forward' | 'stress-loss';

export const V2_OPERATING_MODES: Record<V2OperatingMode, { label: string; inputs?: V2OperatingInputs }> = {
  'carried-forward': {
    label: 'Flat run-rate (carry forward $200M / $170M) — Phase 2A placeholder',
  },
  'stress-loss': {
    label: 'Stress: injected $160M revenue / $170M opex every quarter',
    inputs: { revenue: 160, operatingCost: 170 },
  },
};

export interface V2StrategyRun {
  strategyId: string;
  strategyName: string;
  operatingMode: V2OperatingMode;
  quarters: V2QuarterRecord[];
  finalState: V2TeamState;
  passed: boolean;
  /** Visible notes, e.g. preset weights that do not sum to 1. */
  notes: string[];
}

export function runV2Strategy(strategy: AllocationStrategy, operatingMode: V2OperatingMode): V2StrategyRun {
  let state = getV2StartingState();
  const quarters: V2QuarterRecord[] = [];
  const mode = V2_OPERATING_MODES[operatingMode];
  const notes: string[] = [];

  for (let q = 1; q <= 8; q++) {
    const qContent = (gameplayContent as Record<string, any>)[`q${q}`];
    const envelope: number = qContent?.available_capital ?? 30;
    const allocation = v1AllocationToV2(weightsToAllocation(strategy, envelope, q));
    // Some legacy presets under-allocate (weights sum < 1). Unallocated envelope is,
    // by definition, unspent liquidity: book it as Cash Reserve and surface it.
    const allocated = Object.values(allocation).reduce((a, b) => a + b, 0);
    const remainder = envelope - allocated;
    if (remainder > 0.01) {
      allocation.cashReserve += remainder;
      notes.push(`Q${q}: preset allocated $${allocated.toFixed(2)}M of $${envelope}M; $${remainder.toFixed(2)}M unallocated booked as Cash Reserve`);
    }
    const rec = runV2Quarter(state, q, allocation, envelope, mode.inputs);
    quarters.push(rec);
    state = rec.ending;
  }

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    operatingMode,
    quarters,
    finalState: state,
    passed: quarters.every(r => r.passed),
    notes,
  };
}


// ============ PHASE 2B CAPABILITY DEMO SCENARIOS (Test Lab section C) ============

export interface V2CapabilityScenario {
  id: string;
  name: string;
  description: string;
  opening: () => V2TeamState;
  steps: { allocation: V2Allocation; strategicEnvelope: number }[];
}

export interface V2CapabilityScenarioResult {
  scenario: V2CapabilityScenario;
  quarters: V2QuarterRecord[];
  passed: boolean;
}

export const V2_CAPABILITY_SCENARIOS: V2CapabilityScenario[] = [
  {
    id: 'consumer-maturation',
    name: 'Consumer $10M in Q1, then nothing',
    description: 'Nominal +9 matures 50/35/15%: Consumer 55 → 59.5 → 62.65 → 64.0, then flat.',
    opening: getV2Baseline,
    steps: [
      { allocation: alloc({ consumer: 10, cashReserve: 20 }), strategicEnvelope: 30 },
      { allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 },
      { allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 },
      { allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 },
    ],
  },
  {
    id: 'people-org-capacity',
    name: 'People $10M in Q1 → Org Capacity',
    description: 'Org Capacity +6 matures 50/35/15%: 60 → 63 → 65.1 → 66. Talent +7 and Product Quality +1.0 on the same schedule.',
    opening: getV2Baseline,
    steps: [
      { allocation: alloc({ people: 10, cashReserve: 20 }), strategicEnvelope: 30 },
      { allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 },
      { allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 },
    ],
  },
  {
    id: 'overload-cap60',
    name: 'Synthetic overload: $90M envelope, capacity 60',
    description: '$30M each Consumer/Enterprise/AI → load 86, 143% of capacity 60 → absorption 60.3%. Synthetic envelope to exercise absorption.',
    opening: getV2Baseline,
    steps: [{ allocation: alloc({ consumer: 30, enterprise: 30, aiProduct: 30 }), strategicEnvelope: 90 }],
  },
  {
    id: 'overload-cap100',
    name: 'Same overload, capacity 100',
    description: 'Identical allocation with Org Capacity 100 → 86% → absorption 94.7%. Higher capacity absorbs more.',
    opening: () => ({ ...getV2Baseline(), organizationalCapacity: 100 }),
    steps: [{ allocation: alloc({ consumer: 30, enterprise: 30, aiProduct: 30 }), strategicEnvelope: 90 }],
  },
  {
    id: 'saturation',
    name: 'Saturation: Consumer at 98, $30M Consumer',
    description: 'Nominal +17; first tranche 8.5 → only +2 realized, 6.5 wasted; later tranches fully wasted.',
    opening: () => {
      const b = getV2Baseline();
      return { ...b, capabilities: { ...b.capabilities, consumer: 98 } };
    },
    steps: [
      { allocation: alloc({ consumer: 30 }), strategicEnvelope: 30 },
      { allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 },
      { allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 },
    ],
  },
];

export function runV2CapabilityScenario(scenario: V2CapabilityScenario): V2CapabilityScenarioResult {
  let state = scenario.opening();
  const quarters: V2QuarterRecord[] = [];
  scenario.steps.forEach((step, i) => {
    const rec = runV2Quarter(state, i + 1, step.allocation, step.strategicEnvelope);
    quarters.push(rec);
    state = rec.ending;
  });
  return { scenario, quarters, passed: quarters.every(q => q.passed) };
}

export function runAllV2CapabilityScenarios(): V2CapabilityScenarioResult[] {
  return V2_CAPABILITY_SCENARIOS.map(runV2CapabilityScenario);
}
