import {
  V2Allocation,
  V2Consequence,
  V2EventCost,
  V2OperatingInputs,
  V2TeamState,
  V2MarketConditions,
  calculateV2QuarterConsequence,
  getV2Baseline,
  getNeutralMarket,
  V2_IDENTITY_TOLERANCE,
} from '../../simulation/engineV2';
import {
  calculateAbsorptionFactor,
  coordinationLoad,
  readTarget,
  V2_ACTIVE_INITIATIVE_THRESHOLD,
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
  operatingInputs?: V2OperatingInputs,
  operatingCostOverride?: number
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

  const expectedOpex = consequence.costSource === 'modelled'
    ? consequence.cost.totalOperatingCost
    : operatingInputs ? operatingInputs.operatingCost : operatingCostOverride ?? opening.operatingCost;
  checks.push({
    id: 'v2_strategic_outside_opex',
    message: 'Operating cost is exactly the selected source (held / injected / override / modelled); strategic investment booked separately',
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
  checks.push(...checkV2CommercialQuarter(opening, consequence, ending));
  checks.push(...checkV2RevenueQuarter(opening, consequence, ending));
  checks.push(...checkV2CostQuarter(opening, consequence, ending));
  checks.push(...checkV2FinancialSummary(consequence));

  return checks;
}

/** Phase 3B: the integrated summary is a pure restatement of the ledger. */
export function checkV2FinancialSummary(consequence: V2Consequence): V2LedgerCheck[] {
  const F = consequence.financials;
  const L = consequence.ledger;
  const tol = 1e-9;
  const consistent =
    near(F.revenue, L.revenue, tol) && near(F.operatingCost, L.operatingCost, tol) && near(F.operatingProfit, L.operatingProfit, tol) &&
    near(F.operatingCashGeneration, L.operatingProfit, tol) && near(F.netCashFlow, L.netCashFlow, tol) &&
    near(F.closingCash, F.openingCash + F.netCashFlow, tol) && near(F.closingCash, L.closingCash, tol) &&
    (F.operatingMargin === null || near(F.operatingMargin, L.operatingProfit / L.revenue, tol));
  const runwayOk =
    (F.netCashFlow >= 0 && F.runway.status === 'self-funding') ||
    (F.netCashFlow < 0 && F.closingCash <= 0 && F.runway.status === 'cash-negative' && F.runway.quarters === 0) ||
    (F.netCashFlow < 0 && F.closingCash > 0 && F.runway.status === 'burning' && near(F.runway.quarters!, F.closingCash / -F.netCashFlow, tol));
  return [
    { id: 'fin_summary_restates_ledger', message: 'Integrated summary restates the ledger exactly (no new accounting)', passed: consistent, details: '' },
    { id: 'fin_runway_consistent', message: 'Runway indicator consistent with cash and net cash flow (no floor)', passed: runwayOk, details: `${F.runway.status} ${F.runway.quarters ?? ''}` },
  ];
}

/** Phase 3A operating cost invariants. */
export function checkV2CostQuarter(opening: V2TeamState, consequence: V2Consequence, ending: V2TeamState): V2LedgerCheck[] {
  const K = consequence.cost;
  const L = consequence.ledger;
  const q = consequence.quarter;
  const tol = 1e-9;
  const checks: V2LedgerCheck[] = [];
  const v = K.variable;
  const varSum = v.consumerServicing + v.consumerAcquisitionSpend + v.enterpriseServicing + v.enterpriseOnboarding + v.universityServicing + v.aiNativeServing;

  checks.push({
    id: 'cost_total_reconstructs',
    message: 'Operating cost = fixed/semi-fixed + variable + commitments + financing (0)',
    passed: near(v.total, varSum, tol) && near(K.totalOperatingCost, K.fixedSemiFixed + v.total + K.commitments.total + K.financingCost, tol) &&
      K.financingCost === 0 && K.eventCostPlaceholder === 0,
    details: `${K.fixedSemiFixed.toFixed(3)} + ${v.total.toFixed(3)} + ${K.commitments.total.toFixed(3)} = ${K.totalOperatingCost.toFixed(3)}`,
  });

  const parts = [K.fixedSemiFixed, ...Object.values(v), K.commitments.total, K.totalOperatingCost];
  checks.push({
    id: 'cost_finite_nonnegative',
    message: 'All cost components finite and ≥ 0',
    passed: parts.every(x => Number.isFinite(x) && x >= -tol),
    details: '',
  });

  checks.push({
    id: 'cost_ledger_consumes_model',
    message: "In 'modelled' cost mode the ledger operating cost is exactly the modelled total",
    passed: consequence.costSource !== 'modelled' ||
      (near(L.operatingCost, K.totalOperatingCost, tol) && L.operatingCostSource === 'modelled' && near(L.operatingProfit, L.revenue - L.operatingCost, tol)),
    details: `mode ${consequence.costSource}; ledger ${fmt(L.operatingCost)}, model ${fmt(K.totalOperatingCost)}`,
  });

  const lo = Math.min(K.openingFixedSemiFixed, K.fixedTarget);
  const hi = Math.max(K.openingFixedSemiFixed, K.fixedTarget);
  checks.push({
    id: 'cost_fixed_sticky',
    message: 'Fixed/semi-fixed moves only part-way toward its lagged target and never below its floor',
    passed: K.fixedSemiFixed >= opening.costs.fixedFloor - tol && K.fixedSemiFixed >= lo - tol && K.fixedSemiFixed <= hi + tol,
    details: `opening ${K.openingFixedSemiFixed.toFixed(3)} → ${K.fixedSemiFixed.toFixed(3)} (target ${K.fixedTarget.toFixed(3)})`,
  });

  const expensedNow = K.commitments.active.filter(c => c.quarterCreated >= q || c.startQuarter > q || c.endQuarter < q);
  const createdOk = K.commitments.createdThisQuarter.every(c => c.startQuarter > q);
  checks.push({
    id: 'cost_investment_not_double_counted',
    message: "This quarter's strategic investment is never in this quarter's operating cost (commitments start later, expire)",
    passed: expensedNow.length === 0 && createdOk,
    details: expensedNow.map(c => c.id).join(', '),
  });

  checks.push({
    id: 'cost_state_links',
    message: 'Cost state opens at prior state and closes into ending state',
    passed: near(K.openingFixedSemiFixed, opening.costs.fixedSemiFixed, tol) && near(ending.costs.fixedSemiFixed, K.fixedSemiFixed, tol) &&
      ending.costs.commitments.length === K.closing.commitments.length,
    details: '',
  });

  return checks;
}

/** Phase 2D segment revenue invariants: every segment's movement is reconstructable. */
export function checkV2RevenueQuarter(
  opening: V2TeamState,
  consequence: V2Consequence,
  ending: V2TeamState
): V2LedgerCheck[] {
  const R = consequence.revenue;
  const L = consequence.ledger;
  const tol = 1e-9;
  const checks: V2LedgerCheck[] = [];
  const seg = R.closing.segments;
  const sum = seg.consumer + seg.enterprise + seg.university + seg.aiNative;

  checks.push({
    id: 'rev_segments_sum_to_total',
    message: 'Total revenue = Consumer + Enterprise + University + AI-native',
    passed: near(R.totalRevenue, sum, tol),
    details: `${sum.toFixed(3)} vs total ${R.totalRevenue.toFixed(3)}`,
  });

  checks.push({
    id: 'rev_ledger_consumes_segment_total',
    message: "In 'segment' mode the ledger revenue is exactly the segment total",
    passed: consequence.revenueSource !== 'segment' ||
      (near(L.revenue, R.totalRevenue, tol) && L.operatingInputsSource === 'segment' && near(L.operatingProfit, R.totalRevenue - L.operatingCost, tol)),
    details: `mode ${consequence.revenueSource}; ledger ${fmt(L.revenue)}, segments ${fmt(R.totalRevenue)}`,
  });

  const c = R.consumer, e = R.enterprise, u = R.university, a = R.aiNative;
  const recon = [
    ['consumer', c.closing, Math.max(0, c.opening - c.churn + c.acquisition + c.priceMix)],
    ['enterprise', e.closing, Math.max(0, e.opening - e.churn + e.expansion + e.liveFromCurrentBookings + e.liveFromEarlierBookings)],
    ['university', u.closing, Math.max(0, u.opening - u.churn + u.liveFromEarlierWins)],
    ['aiNative', a.closing, Math.max(0, a.opening - a.churn + a.newMonetization)],
  ] as const;
  const badRecon = recon.filter(([, got, want]) => !near(got, want, tol));
  checks.push({
    id: 'rev_movement_explained',
    message: 'Each segment: opening − churn + new/live/expansion (+ price/mix) = closing',
    passed: badRecon.length === 0,
    details: badRecon.map(([k]) => k).join(', '),
  });

  const values = [...Object.values(seg), e.bookingsACV, e.backlogRunRate, u.winsACV, u.backlogRunRate, a.newMonetization, c.acquisition];
  checks.push({
    id: 'rev_finite_nonnegative',
    message: 'Segment revenue, bookings, backlog and monetization are finite and ≥ 0',
    passed: values.every(v => Number.isFinite(v) && v >= -tol),
    details: '',
  });

  const cohorts = [...R.closing.enterpriseBacklog, ...R.closing.universityBacklog];
  const badCohorts = cohorts.filter(k => !near(k.liveToDate + k.remaining, k.runRate, 1e-9) || k.remaining < -tol);
  checks.push({
    id: 'rev_backlog_conservation',
    message: 'Every booking cohort: live to date + remaining backlog = booked run-rate',
    passed: badCohorts.length === 0,
    details: badCohorts.map(k => k.id).join(', '),
  });

  checks.push({
    id: 'rev_pipeline_is_not_revenue',
    message: 'Enterprise/University revenue enters only via bookings × recognition, never pipeline directly',
    passed: near(e.bookingsACV, e.resolvedPipeline * e.winRate * e.headroom, tol) && near(e.newRunRateBooked, e.bookingsACV * 0.25, tol) &&
      near(u.winsACV, u.resolvedPipeline * u.institutionalWinRate * u.headroom, tol) && e.liveFromCurrentBookings === 0 &&
      [c.headroom, e.headroom, u.headroom, a.headroom].every(h => Number.isFinite(h) && h >= 0),
    details: `bookings ${e.bookingsACV.toFixed(3)} = resolved ${e.resolvedPipeline.toFixed(3)} × win ${e.winRate.toFixed(4)} × headroom ${e.headroom.toFixed(4)}`,
  });

  const openMatch = near(c.opening, opening.segmentRevenue.consumer, tol) && near(e.opening, opening.segmentRevenue.enterprise, tol) &&
    near(u.opening, opening.segmentRevenue.university, tol) && near(a.opening, opening.segmentRevenue.aiNative, tol);
  const closeMatch = near(ending.segmentRevenue.consumer, seg.consumer, tol) && near(ending.segmentRevenue.aiNative, seg.aiNative, tol) &&
    near(ending.segmentRevenue.enterprise, seg.enterprise, tol) && near(ending.segmentRevenue.university, seg.university, tol);
  checks.push({
    id: 'rev_state_links',
    message: 'Segments open at prior state and close into ending state',
    passed: openMatch && closeMatch,
    details: `opening ${openMatch ? 'ok' : 'mismatch'}, closing ${closeMatch ? 'ok' : 'mismatch'}`,
  });

  return checks;
}

/** Phase 2C commercial invariants: every indicator's movement is fully explained. */
export function checkV2CommercialQuarter(
  opening: V2TeamState,
  consequence: V2Consequence,
  ending: V2TeamState
): V2LedgerCheck[] {
  const M = consequence.commercial;
  const tol = 1e-9;
  const checks: V2LedgerCheck[] = [];

  const badDecomp = M.indicators.filter(i =>
    !near(i.unclipped, i.opening + i.baseInflow + i.marketContribution + i.capabilityContribution + i.dependencyContribution + i.decayOrAttrition, tol));
  checks.push({
    id: 'com_movement_explained',
    message: 'Each indicator: opening + base inflow + market + capability + dependency + decay/attrition = unclipped',
    passed: badDecomp.length === 0,
    details: badDecomp.map(i => i.indicator).join(', '),
  });

  const badClip = M.indicators.filter(i =>
    i.closing < i.bounds[0] - tol || i.closing > i.bounds[1] + tol ||
    !near(i.closing, Math.min(i.bounds[1], Math.max(i.bounds[0], i.unclipped)), tol) ||
    i.clipped !== (Math.abs(i.clipAmount) > 0) || !near(i.clipAmount, i.closing - i.unclipped, tol));
  checks.push({
    id: 'com_bounds_and_clipping_reported',
    message: 'Closing = unclipped clamped to bounds; clipping reported',
    passed: badClip.length === 0,
    details: badClip.map(i => i.indicator).join(', '),
  });

  const openingMatches = M.indicators.every(i => near(i.opening, (opening.commercial as any)[i.indicator], tol));
  const closingMatches = M.indicators.every(i => near(i.closing, (ending.commercial as any)[i.indicator], tol));
  checks.push({
    id: 'com_state_links',
    message: 'Indicators open at prior commercial state and close into ending state',
    passed: openingMatches && closingMatches,
    details: `opening ${openingMatches ? 'ok' : 'mismatch'}, closing ${closingMatches ? 'ok' : 'mismatch'}`,
  });

  checks.push({
    id: 'com_reads_post_maturation_capability',
    message: 'Commercial engine read the post-maturation capability state',
    passed: near(M.aiReadiness.aiCapability, ending.capabilities.ai, tol) &&
      near(M.relativeCapability.consumer, ending.capabilities.consumer - M.competitorBenchmarks.consumer, tol),
    details: `AI ${M.aiReadiness.aiCapability.toFixed(2)} vs state ${ending.capabilities.ai.toFixed(2)}`,
  });

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

  const bucketSum = C.buckets.reduce((s, b) => s + b.transformationLoad, 0);
  const expectedActive = C.buckets.filter(b => b.amount >= V2_ACTIVE_INITIATIVE_THRESHOLD).map(b => b.bucket);
  checks.push({
    id: 'cap_load_aggregates',
    message: 'Total load = Σ bucket loads + coordination load (Cash Reserve never an initiative)',
    passed: near(C.bucketLoad, bucketSum, tol) &&
      JSON.stringify(C.activeInitiatives) === JSON.stringify(expectedActive) &&
      near(C.coordinationLoad, coordinationLoad(expectedActive.length), tol) &&
      near(C.transformationLoad, C.bucketLoad + C.coordinationLoad, tol),
    details: `bucket ${C.bucketLoad.toFixed(3)} + coordination ${C.coordinationLoad} (${C.activeInitiatives.length} active) = ${C.transformationLoad.toFixed(3)}`,
  });

  const expectedFactor = calculateAbsorptionFactor(C.transformationLoad / opening.organizationalCapacity);
  checks.push({
    id: 'cap_absorption_factor',
    message: 'Absorption factor from total Load ÷ opening Org Capacity, within [0.40, 1.00]',
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
  eventCosts?: V2EventCost[],
  market?: V2MarketConditions,
  revenueOptions?: { revenueSource?: 'hold' | 'segment'; operatingCostOverride?: number; costSource?: 'hold' | 'modelled' }
): V2QuarterRecord {
  const consequence = calculateV2QuarterConsequence(opening, {
    quarter,
    allocation,
    strategicEnvelope,
    operatingInputs,
    eventCosts,
    market,
    revenueSource: revenueOptions?.revenueSource,
    operatingCostOverride: revenueOptions?.operatingCostOverride,
    costSource: revenueOptions?.costSource,
  });
  const ending = applyV2(opening, consequence);
  const checks = checkV2Quarter(opening, allocation, consequence, ending, operatingInputs, revenueOptions?.operatingCostOverride);
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
    id: 'three-initiatives-cap60',
    name: '$10M Consumer + $10M Enterprise + $10M AI, capacity 60',
    description: 'Bucket load 34 + coordination 3 (3 initiatives) = 37 → 61.7% of capacity 60 → absorption 89.2%.',
    opening: getV2Baseline,
    steps: [{ allocation: alloc({ consumer: 10, enterprise: 10, aiProduct: 10 }), strategicEnvelope: 30 }],
  },
  {
    id: 'three-initiatives-cap75',
    name: 'Same allocation, capacity 75',
    description: 'Identical allocation with Org Capacity 75 → 49.3% → absorption 95.2%. Prior organizational investment absorbs more.',
    opening: () => ({ ...getV2Baseline(), organizationalCapacity: 75 }),
    steps: [{ allocation: alloc({ consumer: 10, enterprise: 10, aiProduct: 10 }), strategicEnvelope: 30 }],
  },
  {
    id: 'broad-five-cap60',
    name: '$6M in each of the five strategic buckets, capacity 60',
    description: 'Bucket load 29.6 + coordination 10 (5 initiatives) = 39.6 → 66% → absorption 87.0%. Five active initiatives pay the full +10 coordination load.',
    opening: getV2Baseline,
    steps: [{ allocation: alloc({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 }), strategicEnvelope: 30 }],
  },
  {
    id: 'saturation',
    name: 'Saturation: Consumer at 98, $30M Consumer',
    description: 'Load 28 (46.7%) → absorption 95.8% → effective +16.29; first tranche 8.15 → only +2 realized, 6.15 wasted; later tranches fully wasted.',
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

// ============ PHASE 2C COMMERCIAL CALIBRATION SCENARIOS ============

/**
 * Twelve required Q1→Q8 calibration strategies under the neutral market.
 * Each runs a constant $30M envelope in every quarter (including Q8) so that
 * strategies are comparable. "Deliberately weak" scenarios inject the weak
 * capability into the opening state (no Phase 2B curve moves CS/Execution yet).
 */
export interface V2CommercialScenario {
  id: string;
  name: string;
  description: string;
  opening: () => V2TeamState;
  allocation: V2Allocation;
  market?: V2MarketConditions;
  /**
   * Test-Lab-only diagnostic override: capability values re-imposed at the start of every
   * quarter (e.g. to hold Customer Success low while Enterprise investment would otherwise
   * develop it). Not an engine mechanic.
   */
  pinnedCapabilities?: Partial<V2TeamState['capabilities']>;
}

const withCaps = (p: Partial<V2TeamState['capabilities']>, extra: Partial<V2TeamState> = {}) => () => {
  const b = getV2Baseline();
  return { ...b, ...extra, capabilities: { ...b.capabilities, ...p } };
};

export const V2_COMMERCIAL_SCENARIOS: V2CommercialScenario[] = [
  { id: 'consumer100', name: 'Consumer100', description: '$30M Consumer every quarter', opening: getV2Baseline, allocation: alloc({ consumer: 30 }) },
  { id: 'enterprise100', name: 'Enterprise100', description: '$30M Enterprise every quarter', opening: getV2Baseline, allocation: alloc({ enterprise: 30 }) },
  { id: 'ai100', name: 'AI100', description: '$30M AI & Product every quarter', opening: getV2Baseline, allocation: alloc({ aiProduct: 30 }) },
  { id: 'people100', name: 'People100', description: '$30M People every quarter', opening: getV2Baseline, allocation: alloc({ people: 30 }) },
  { id: 'university100', name: 'University100', description: '$30M University & Credentials every quarter', opening: getV2Baseline, allocation: alloc({ universityCredentials: 30 }) },
  { id: 'cash100', name: 'Cash100', description: '$30M Cash Reserve every quarter (no investment)', opening: getV2Baseline, allocation: alloc({ cashReserve: 30 }) },
  { id: 'balanced', name: 'Balanced', description: '$5M in each bucket incl. $5M reserve', opening: getV2Baseline, allocation: alloc({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 }) },
  { id: 'consumer-ai', name: 'Consumer + AI', description: '$15M Consumer + $15M AI', opening: getV2Baseline, allocation: alloc({ consumer: 15, aiProduct: 15 }) },
  { id: 'enterprise-ai', name: 'Enterprise + AI', description: '$15M Enterprise + $15M AI', opening: getV2Baseline, allocation: alloc({ enterprise: 15, aiProduct: 15 }) },
  { id: 'enterprise-weak-cs', name: 'Enterprise100, weak CS (pinned)', description: '$30M Enterprise with Customer Success re-pinned to 15 at the start of every quarter (diagnostic override; Enterprise investment would otherwise develop CS). That quarter\'s matured CS tranche still lands before indicators are read, so end-of-quarter CS is ≈16–20.', opening: withCaps({ customerSuccess: 15 }), allocation: alloc({ enterprise: 30 }), pinnedCapabilities: { customerSuccess: 15 } },
  { id: 'ai-weak-org', name: 'AI100, weak Talent/Execution', description: '$30M AI with Talent 35 and Execution 35 injected (vs 55/60)', opening: withCaps({ talent: 35, execution: 35 }), allocation: alloc({ aiProduct: 30 }) },
  { id: 'university-weak-trust', name: 'University100, weak Trust', description: '$30M University with Trust injected at 45 (vs 70)', opening: withCaps({}, { trust: 45 }), allocation: alloc({ universityCredentials: 30 }) },
];

export interface V2CommercialScenarioResult {
  scenario: V2CommercialScenario;
  quarters: V2QuarterRecord[];
  passed: boolean;
}

export function runV2CommercialScenario(scenario: V2CommercialScenario, quarters = 8): V2CommercialScenarioResult {
  let state = scenario.opening();
  const recs: V2QuarterRecord[] = [];
  for (let q = 1; q <= quarters; q++) {
    if (scenario.pinnedCapabilities) {
      state = { ...state, capabilities: { ...state.capabilities, ...scenario.pinnedCapabilities } };
    }
    const rec = runV2Quarter(state, q, scenario.allocation, 30, undefined, undefined, scenario.market);
    recs.push(rec);
    state = rec.ending;
  }
  return { scenario, quarters: recs, passed: recs.every(r => r.passed) };
}

export function runAllV2CommercialScenarios(): V2CommercialScenarioResult[] {
  return V2_COMMERCIAL_SCENARIOS.map(s => runV2CommercialScenario(s));
}


// ============ PHASE 2D SEGMENT REVENUE RUNS ============

export type V2RevenueMarketCase = 'static-neutral' | 'competitive';

export function marketForCase(c: V2RevenueMarketCase): V2MarketConditions {
  const m = getNeutralMarket();
  return c === 'static-neutral' ? { ...m, competitorProgress: { consumer: 0, enterprise: 0, credential: 0 } } : m;
}

export interface V2RevenueRunResult {
  scenario: V2CommercialScenario;
  marketCase: V2RevenueMarketCase;
  quarters: V2QuarterRecord[];
  passed: boolean;
}

/**
 * Run a Phase 2C calibration strategy with Phase 2D segment revenue feeding the ledger.
 * Operating cost stays at the $170M placeholder: profit/cash are diagnostic only.
 */
export function runV2RevenueScenario(
  scenario: V2CommercialScenario,
  marketCase: V2RevenueMarketCase,
  quarters = 8,
  costSource: 'hold' | 'modelled' = 'hold'
): V2RevenueRunResult {
  let state = scenario.opening();
  const market = scenario.market ?? marketForCase(marketCase);
  const recs: V2QuarterRecord[] = [];
  for (let q = 1; q <= quarters; q++) {
    if (scenario.pinnedCapabilities) {
      state = { ...state, capabilities: { ...state.capabilities, ...scenario.pinnedCapabilities } };
    }
    const rec = runV2Quarter(state, q, scenario.allocation, 30, undefined, undefined, market, { revenueSource: 'segment', costSource });
    recs.push(rec);
    state = rec.ending;
  }
  return { scenario, marketCase, quarters: recs, passed: recs.every(r => r.passed) };
}

export function runAllV2RevenueScenarios(marketCase: V2RevenueMarketCase): V2RevenueRunResult[] {
  return V2_COMMERCIAL_SCENARIOS.map(s => runV2RevenueScenario(s, marketCase));
}

/** Phase 3A/3B: segment revenue + modelled operating cost (integrated financial model). */
export function runV2IntegratedScenario(scenario: V2CommercialScenario, marketCase: V2RevenueMarketCase, quarters = 8): V2RevenueRunResult {
  return runV2RevenueScenario(scenario, marketCase, quarters, 'modelled');
}

export function runAllV2IntegratedScenarios(marketCase: V2RevenueMarketCase, quarters = 8): V2RevenueRunResult[] {
  return V2_COMMERCIAL_SCENARIOS.map(s => runV2IntegratedScenario(s, marketCase, quarters));
}
