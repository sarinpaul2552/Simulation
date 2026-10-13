/**
 * BATCH 9 — NexLearn Economic Balance Laboratory: headless runner (analysis only; never imported by the app).
 *
 * Every number comes from the frozen V2 engine through the Test Lab scenario-arc runner (runArc), which plays the full
 * eight-quarter arc: market path, Q4 strategic commitment, Q5 contract, Q6 recession response, Q7 crisis, Q8 final
 * option, CFO liquidity forecast and financing. Valuation (NXLN-VAL-1.0), executive scoring (NXLN-EXEC-1.1) and the
 * terminal score are the production implementations, applied to the recorded states.
 *
 * Experimental starting-mix variants change calibration constants IN MEMORY ONLY for the duration of one run
 * (withCalibration restores every value in a finally block). No engine source file is modified.
 */
import { runArc, DEFAULT_POLICY, type V2ArcStrategy, type V2ArcOptions, type V2ArcRun, type V2ArcPolicy } from '../../../src/testlab/utils/v2ScenarioArc';
import type { V2TeamState } from '../../../src/simulation/engineV2';
import { getV2Baseline } from '../../../src/simulation/engineV2';
import { V2_REVENUE_CALIBRATION, getV2RevenueBaseline } from '../../../src/simulation/engineV2Revenue';
import { V2_COST_CALIBRATION } from '../../../src/simulation/engineV2Costs';
import { V2_COMMERCIAL_CALIBRATION, V2_COMMERCIAL_START, getV2CommercialBaseline, type V2MarketConditions } from '../../../src/simulation/engineV2Commercial';
import { scoreV2Company } from '../../../src/simulation/engineV2Scoring';
import { destinationStrength } from '../../../src/simulation/engineV2Destination';
import { valuationFromStates, VALUATION_VERSION } from '../../../src/production/v2/insights/valuation';
import { allScorecards, EXECUTIVE_VERSION } from '../../../src/production/v2/insights/executive';
import type { QuarterRecord } from '../../../src/production/v2/insights/history';

export const ENGINE_BASE_COMMIT = '003f697';
export const VERSIONS = { valuation: VALUATION_VERSION, executive: EXECUTIVE_VERSION, engine: `V2 frozen engine (no diff vs ${ENGINE_BASE_COMMIT})` };

// ───────────────────────────── starting-mix variants ─────────────────────────────

export type Mix = { consumer: number; enterprise: number; university: number; aiNative: number };
export const MIXES: Record<'baseline' | 'altA' | 'altB', Mix> = {
  baseline: { consumer: 140, enterprise: 40, university: 16, aiNative: 4 },
  altA: { consumer: 100, enterprise: 60, university: 25, aiNative: 15 },
  altB: { consumer: 80, enterprise: 70, university: 30, aiNative: 20 },
};
/** rebased = every segment flow scaled with the segment; rebased-aifixed = same, but the AI growth reward per adoption point stays absolute. */
export type MixMode = 'production' | 'naive' | 'rebased' | 'rebased-aifixed';

const BASE = MIXES.baseline;

/** The constants a proportional re-base must change (all others are untouched). */
export function rebaseOverrides(m: Mix) {
  const r = { c: m.consumer / BASE.consumer, e: m.enterprise / BASE.enterprise, u: m.university / BASE.university, a: m.aiNative / BASE.aiNative };
  return {
    ratios: r,
    revenueStart: { ...m },
    consumerBaseAcquisition: V2_REVENUE_CALIBRATION.consumer.baseAcquisition * r.c,
    consumerAcquisitionSpend: V2_COST_CALIBRATION.variable.consumerAcquisitionSpend * r.c,
    aiMonetizationToBaseline: V2_REVENUE_CALIBRATION.aiNative.monetizationPerPointToBaseline * r.a,
    aiMonetizationAbove: V2_REVENUE_CALIBRATION.aiNative.monetizationPerPointAbove * r.a,
    enterpriseBaseInflow: V2_COMMERCIAL_CALIBRATION.enterprise.baseInflow * r.e,
    universityBaseInflow: V2_COMMERCIAL_CALIBRATION.university.baseInflow * r.u,
    enterprisePipelineStart: V2_COMMERCIAL_START.enterprisePipeline * r.e,
    universityPipelineStart: V2_COMMERCIAL_START.universityPipeline * r.u,
  };
}

/** Variable cost of a starting mix at steady state (same rates as baselineVariableCost in engineV2Costs). */
export function variableCostAt(m: Mix, acquisitionSpend: number): number {
  const v = V2_COST_CALIBRATION.variable;
  const liveRunRate = 1.5 * (m.enterprise / BASE.enterprise);
  return v.consumerServicingRate * m.consumer + acquisitionSpend + v.enterpriseServicingRate * m.enterprise +
    v.enterpriseOnboardingPerLiveRunRate * liveRunRate + v.universityServicingRate * m.university + v.aiNativeServingRate * m.aiNative;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const W = (o: any) => o as Record<string, any>;

/** Apply a re-base in memory, run fn, restore every constant (even on error). */
export function withCalibration<T>(m: Mix | null, fn: () => T, aiFixed = false): T {
  if (!m) return fn();
  const o = rebaseOverrides(m);
  if (aiFixed) o.aiMonetizationAbove = V2_REVENUE_CALIBRATION.aiNative.monetizationPerPointAbove;
  const saved = {
    start: { ...V2_REVENUE_CALIBRATION.start },
    ba: V2_REVENUE_CALIBRATION.consumer.baseAcquisition,
    as: V2_COST_CALIBRATION.variable.consumerAcquisitionSpend,
    m1: V2_REVENUE_CALIBRATION.aiNative.monetizationPerPointToBaseline,
    m2: V2_REVENUE_CALIBRATION.aiNative.monetizationPerPointAbove,
    ei: V2_COMMERCIAL_CALIBRATION.enterprise.baseInflow,
    ui: V2_COMMERCIAL_CALIBRATION.university.baseInflow,
    ep: V2_COMMERCIAL_START.enterprisePipeline,
    up: V2_COMMERCIAL_START.universityPipeline,
  };
  try {
    Object.assign(W(V2_REVENUE_CALIBRATION.start), o.revenueStart);
    W(V2_REVENUE_CALIBRATION.consumer).baseAcquisition = o.consumerBaseAcquisition;
    W(V2_COST_CALIBRATION.variable).consumerAcquisitionSpend = o.consumerAcquisitionSpend;
    W(V2_REVENUE_CALIBRATION.aiNative).monetizationPerPointToBaseline = o.aiMonetizationToBaseline;
    W(V2_REVENUE_CALIBRATION.aiNative).monetizationPerPointAbove = o.aiMonetizationAbove;
    W(V2_COMMERCIAL_CALIBRATION.enterprise).baseInflow = o.enterpriseBaseInflow;
    W(V2_COMMERCIAL_CALIBRATION.university).baseInflow = o.universityBaseInflow;
    W(V2_COMMERCIAL_START).enterprisePipeline = o.enterprisePipelineStart;
    W(V2_COMMERCIAL_START).universityPipeline = o.universityPipelineStart;
    return fn();
  } finally {
    Object.assign(W(V2_REVENUE_CALIBRATION.start), saved.start);
    W(V2_REVENUE_CALIBRATION.consumer).baseAcquisition = saved.ba;
    W(V2_COST_CALIBRATION.variable).consumerAcquisitionSpend = saved.as;
    W(V2_REVENUE_CALIBRATION.aiNative).monetizationPerPointToBaseline = saved.m1;
    W(V2_REVENUE_CALIBRATION.aiNative).monetizationPerPointAbove = saved.m2;
    W(V2_COMMERCIAL_CALIBRATION.enterprise).baseInflow = saved.ei;
    W(V2_COMMERCIAL_CALIBRATION.university).baseInflow = saved.ui;
    W(V2_COMMERCIAL_START).enterprisePipeline = saved.ep;
    W(V2_COMMERCIAL_START).universityPipeline = saved.up;
  }
}

/** Opening state for a mix. Must be called INSIDE withCalibration for 'rebased'. */
export function openingFor(m: Mix, mode: MixMode): V2TeamState {
  const s = getV2Baseline();
  if (mode === 'production') return s;
  if (mode === 'naive') {
    // Only the four starting segment revenues change; every flow, anchor and cost stays calibrated to the baseline mix.
    return { ...s, segmentRevenue: { ...m } };
  }
  // rebased: steady-state backlogs/pipelines from the in-memory calibration; fixed pool keeps Q0 operating cost at $170M
  const rev = getV2RevenueBaseline();
  const commercial = getV2CommercialBaseline();
  commercial.aiCommercialReadiness = s.commercial.aiCommercialReadiness;
  const variable = variableCostAt(m, V2_COST_CALIBRATION.variable.consumerAcquisitionSpend);
  const fixed = V2_COST_CALIBRATION.baselineOperatingCost - variable;
  return {
    ...s,
    segmentRevenue: rev.segments,
    enterpriseBacklog: rev.enterpriseBacklog,
    universityBacklog: rev.universityBacklog,
    commercial,
    costs: { ...s.costs, fixedSemiFixed: fixed, fixedFloor: fixed },
  };
}

/** Rebased runs scale each segment's structural capacity so starting market fill (start / capacity) is unchanged. */
export function capacityScaler(m: Mix | null): ((q: number, mk: V2MarketConditions) => V2MarketConditions) | undefined {
  if (!m) return undefined;
  const r = rebaseOverrides(m).ratios;
  return (_q, mk) => ({ ...mk, segmentCapacity: { consumer: mk.segmentCapacity.consumer * r.c, enterprise: mk.segmentCapacity.enterprise * r.e, university: mk.segmentCapacity.university * r.u, aiNative: mk.segmentCapacity.aiNative * r.a } });
}

// ───────────────────────────── run + metrics ─────────────────────────────

export interface QuarterRow {
  q: number;
  revenue: number; consumer: number; enterprise: number; university: number; aiNative: number;
  operatingProfit: number; margin: number; investment: number; eventCosts: number; financing: number;
  cash: number; debt: number; equityRaised: number; ownership: number; price: number;
  cap: Record<string, number>; productQuality: number; trust: number; culture: number; orgCapacity: number; loadRatio: number;
  solvency: string; distressed: boolean;
}

export interface RunResult {
  id: string; label: string; family: string; mix: string; scenario: string; destination: string | null;
  quarters: QuarterRow[];
  final: {
    revenue: number; operatingProfit: number; cumulativeOperatingProfit: number; cumulativeInvestment: number; cash: number; debt: number; netCash: number;
    equityRaised: number; ownership: number; price: number; priceFromOwnStart: number; terminal: number; terminalFinancial: number; terminalStrategic: number; terminalOrganizational: number; band: string;
    gates: string; exec: Record<string, number> | null; execTeam: number | null; destinationStrength: number; finalOption: string | null; contractAccepted: boolean | null;
    everInsolvent: boolean; distressedQuarters: number; minCash: number; financingRaised: number; recessionActions: string; crisisResponse: string | null;
    capabilityGain: number;
  };
  run: V2ArcRun;
}

export interface LabRunSpec {
  id: string; label?: string; family?: string;
  strategy: V2ArcStrategy;
  mix?: keyof typeof MIXES; mixMode?: MixMode;
  scenario?: string; market?: (q: number, m: V2MarketConditions) => V2MarketConditions;
  policy?: Partial<V2ArcPolicy>; destination?: V2ArcOptions['destination'];
  quarters?: number;
  /** Executive scores are only meaningful against the production starting company. */
  withExec?: boolean;
}

const CAPS = ['consumer', 'enterprise', 'ai', 'talent', 'credential', 'customerSuccess', 'execution'] as const;

export function labRun(spec: LabRunSpec): RunResult {
  const mixKey = spec.mix ?? 'baseline';
  const mode = spec.mixMode ?? 'production';
  const m = MIXES[mixKey];
  const rebase = mode === 'rebased' || mode === 'rebased-aifixed' ? m : null;
  const aiFixed = mode === 'rebased-aifixed';
  const quarters = spec.quarters ?? 8;
  const cap = capacityScaler(rebase);
  const market = spec.market && cap ? (q: number, mk: V2MarketConditions) => spec.market!(q, cap(q, mk)) : spec.market ?? cap;
  const run = withCalibration(rebase, () => {
    const opening = openingFor(m, mode);
    const strategy: V2ArcStrategy = { ...spec.strategy, opening: () => structuredClone(opening) };
    return runArc(strategy, quarters, { marketOverride: market, policy: spec.policy, destination: spec.destination });
  }, aiFixed);
  const states = run.quarters.map(h => h.record.ending);
  const s0 = withCalibration(rebase, () => openingFor(m, mode), aiFixed);
  // Valuation is anchored on the production starting company (NXLN-VAL-1.0). For a different opening, the opening itself
  // is inserted as the first recorded state and prices are also reported relative to that point (priceFromOwnStart).
  const own = mode !== 'production';
  const val = valuationFromStates(own ? [s0, ...states] : states);
  const priceAt = (q: number) => val.points[own ? q + 1 : q].price;
  const rows: QuarterRow[] = run.quarters.map((h, i) => {
    const s = h.record.ending;
    const L = h.record.consequence.ledger;
    return {
      q: i + 1, revenue: L.revenue, ...s.segmentRevenue, operatingProfit: L.operatingProfit, margin: L.revenue > 0 ? L.operatingProfit / L.revenue : 0,
      investment: L.strategicInvestment, eventCosts: L.eventCosts, financing: L.financing, cash: s.cash, debt: s.financing.debt, equityRaised: s.financing.equityRaised,
      ownership: s.financing.ownership, price: priceAt(i + 1),
      cap: Object.fromEntries(CAPS.map(c => [c, s.capabilities[c]])), productQuality: s.productQuality, trust: s.trust, culture: s.culture,
      orgCapacity: s.organizationalCapacity, loadRatio: s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0,
      solvency: s.solvency.status, distressed: s.solvency.distressed,
    };
  });
  const fs = run.finalState;
  const last = rows[rows.length - 1];
  const sc = scoreV2Company(fs);
  let exec: Record<string, number> | null = null; let execTeam: number | null = null;
  if ((spec.withExec ?? true) && mode === 'production' && quarters === 8) {
    const recs: QuarterRecord[] = run.quarters.map((h, i) => ({ quarter: i + 1, before: i === 0 ? s0 : run.quarters[i - 1].record.ending, after: h.record.ending, consequence: h.record.consequence, input: undefined as never, result: undefined as never }));
    const cards = allScorecards(recs);
    exec = Object.fromEntries(cards.map(c => [c.role, c.executive]));
    execTeam = cards.reduce((a, c) => a + c.executive, 0) / cards.length;
  }
  const capGain = CAPS.reduce((t, c) => t + fs.capabilities[c] - s0.capabilities[c], 0);
  const q5 = run.quarters[4]?.decisions?.opportunity; const q6 = run.quarters[5]?.decisions?.management; const q7 = run.quarters[6]?.decisions?.crisisResponse;
  const finRaised = run.quarters.reduce((t, h) => t + (h.decisions?.financing ?? []).reduce((u, f) => u + ((f.kind === 'debt' || f.kind === 'equity') ? f.amount : 0), 0), 0);
  return {
    id: spec.id, label: spec.label ?? spec.strategy.name, family: spec.family ?? '', mix: `${mixKey}${mode === 'production' ? '' : ':' + mode}`, scenario: spec.scenario ?? 'authored',
    destination: fs.destination?.id ?? null, quarters: rows,
    final: {
      revenue: last.revenue, operatingProfit: last.operatingProfit, cumulativeOperatingProfit: rows.reduce((t, r) => t + r.operatingProfit, 0),
      cumulativeInvestment: rows.reduce((t, r) => t + r.investment, 0), cash: last.cash, debt: last.debt, netCash: last.cash - last.debt,
      equityRaised: last.equityRaised, ownership: last.ownership, price: last.price, priceFromOwnStart: own ? 100 * last.price / val.points[1].price : last.price,
      terminal: sc.overall, terminalFinancial: sc.financial, terminalStrategic: sc.strategic, terminalOrganizational: sc.organizational, band: sc.band,
      gates: sc.gates.filter(g => g.triggered).map(g => g.id).join(', '), exec, execTeam,
      destinationStrength: fs.destination ? destinationStrength(fs.destination, fs.quarter) : 0,
      finalOption: fs.final.record?.option ?? null, contractAccepted: q5 ? q5.accept : null,
      everInsolvent: fs.solvency.everInsolvent, distressedQuarters: rows.filter(r => r.distressed).length, minCash: Math.min(...rows.map(r => r.cash)),
      financingRaised: finRaised, recessionActions: q6 ? Object.entries(q6).filter(([, v]) => v).map(([k, v]) => typeof v === 'object' ? `${k}:${(v as { depth?: string }).depth ?? ''}` : k).join(', ') || 'none' : 'none',
      crisisResponse: q7 ?? null, capabilityGain: capGain,
    },
    run,
  };
}

export { DEFAULT_POLICY };
