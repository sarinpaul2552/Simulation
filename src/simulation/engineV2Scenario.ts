/**
 * V2 Simulation Engine — Batch 2: Q1–Q8 Scenario Arc (market truth + player signals)
 *
 * A scenario quarter NEVER alters revenue, costs or cash. It only supplies:
 *   1. `truth`   — the underlying market inputs the engine consumes (V2MarketConditions);
 *   2. `signals` — what players are shown, which may be noisy, headline-driven or partial,
 *                  tagged by audience so role-private information can be added later.
 *
 * Scenario → market inputs → commercial indicators → segment revenue → costs/profit/cash.
 *
 * Market-input semantics (locked decision B):
 *   - Demand indices (consumerDemand, enterpriseDemand, enterpriseAIDemand, universityDemand,
 *     aiNativeDemand, consumerCacPressure, consumerCommoditization, macroPressure) are near-term
 *     market activity, specified per quarter (temporary unless the scenario repeats them).
 *   - competitorProgress is the pace at which competitor benchmarks advance (acceleration).
 *   - segmentCapacity is the structural opportunity ceiling. It changes only when a scenario
 *     explicitly declares a structural change, never merely because demand moved.
 *
 * Imports only V2 modules; never the frozen V1 engine.
 */

import type { V2MarketConditions, V2SegmentCapacity, V2CompetitorProgress } from './engineV2Commercial';
import { getNeutralMarket } from './engineV2Commercial';

// ============ TYPES ============

export type V2Role = 'CEO' | 'CFO' | 'Product' | 'People' | 'Growth';
export const V2_ROLES: V2Role[] = ['CEO', 'CFO', 'Product', 'People', 'Growth'];

/** How a signal relates to the underlying truth. */
export type V2SignalReliability =
  /** Measured company KPI (exact, from the company's own state). */
  | 'measured'
  /** Headline/market chatter: directionally related to truth but can overstate it. */
  | 'headline'
  /** Estimate with a stated range; truth lies inside the range. */
  | 'estimate'
  /** Lagging indicator: reflects earlier conditions. */
  | 'lagging';

/** A briefing signal authored by the scenario (not computed from company state). */
export interface V2ScenarioBriefingSignal {
  id: string;
  /** 'all' = shared briefing; a role = private to that role (later phases). */
  audience: 'all' | V2Role;
  topic: 'consumer' | 'enterprise' | 'ai-native' | 'university' | 'macro' | 'competition';
  headline: string;
  /** Value shown to players (e.g. % change), if numeric. */
  shownValue?: number;
  shownRange?: [number, number];
  unit?: string;
  reliability: V2SignalReliability;
  /**
   * Hidden: the truth this signal refers to, for audit/debrief only. Never shown to players
   * and never read by the engine.
   */
  truthReference?: { field: string; value: number; note: string };
}

/** Structural changes are declared explicitly and persist until another scenario quarter changes them. */
export interface V2StructuralChange {
  field: keyof V2SegmentCapacity;
  from: number;
  to: number;
  rationale: string;
}

export interface V2ScenarioQuarter {
  quarter: number;
  id: string;
  title: string;
  /** Narrative shown to all players at the start of the quarter. */
  briefing: string;
  /** Near-term demand/activity inputs for this quarter only (absolute values, 1.0 = neutral). */
  demand: {
    consumerDemand: number;
    consumerCommoditization: number;
    consumerCacPressure: number;
    enterpriseDemand: number;
    enterpriseAIDemand: number;
    universityDemand: number;
    aiNativeDemand: number;
    macroPressure: number;
  };
  /** Competitor benchmark progress this quarter (capability points). */
  competitorProgress: V2CompetitorProgress;
  /** Explicit structural market-size changes taking effect this quarter (persist afterwards). */
  structuralChanges: V2StructuralChange[];
  /** Scenario-authored signals shown to players entering this quarter. */
  signals: V2ScenarioBriefingSignal[];
  /** Designer notes (audit only). */
  designNotes: string[];
}

// ============ SCENARIO ARC ============

const NEUTRAL = getNeutralMarket();
const NEUTRAL_DEMAND: V2ScenarioQuarter['demand'] = {
  consumerDemand: NEUTRAL.consumerDemand,
  consumerCommoditization: NEUTRAL.consumerCommoditization,
  consumerCacPressure: NEUTRAL.consumerCacPressure,
  enterpriseDemand: NEUTRAL.enterpriseDemand,
  enterpriseAIDemand: NEUTRAL.enterpriseAIDemand,
  universityDemand: NEUTRAL.universityDemand,
  aiNativeDemand: NEUTRAL.aiNativeDemand,
  macroPressure: NEUTRAL.macroPressure,
};

export const V2_SCENARIO_ARC: V2ScenarioQuarter[] = [
  {
    quarter: 1,
    id: 'q1-capital-allocation',
    title: 'Q1 — Capital Allocation Under Uncertainty',
    briefing:
      'The learning market is healthy. Consumer subscriptions are steady, enterprise buyers are renewing, universities ' +
      'are stable and AI tools are generating discussion but no clear commercial impact yet. The board authorizes up to ' +
      '$30M of strategic investment. There is no obvious winning segment: allocate to test your thesis.',
    demand: { ...NEUTRAL_DEMAND },
    competitorProgress: { ...NEUTRAL.competitorProgress },
    structuralChanges: [],
    signals: [
      {
        id: 'q1-consumer-steady', audience: 'all', topic: 'consumer', reliability: 'headline',
        headline: 'Consumer subscriptions steady; category growth in line with last year.',
        truthReference: { field: 'consumerDemand', value: 1.0, note: 'neutral' },
      },
      {
        id: 'q1-enterprise-renewing', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Enterprise L&D budgets flat to slightly up; renewals on track.',
        truthReference: { field: 'enterpriseDemand', value: 1.0, note: 'neutral' },
      },
      {
        id: 'q1-ai-chatter', audience: 'all', topic: 'ai-native', reliability: 'headline',
        headline: 'Generative-AI tutoring demos are widely discussed; paying demand is unproven.',
        truthReference: { field: 'aiNativeDemand', value: 1.0, note: 'neutral this quarter' },
      },
      {
        id: 'q1-university-stable', audience: 'all', topic: 'university', reliability: 'headline',
        headline: 'University partners report stable enrolment and renewal intentions.',
        truthReference: { field: 'universityDemand', value: 1.0, note: 'neutral' },
      },
      {
        id: 'q1-competition', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'Competitors are investing steadily; no disruptive entrant yet.',
        truthReference: { field: 'competitorProgress.consumer', value: NEUTRAL.competitorProgress.consumer, note: 'normal pace' },
      },
    ],
    designNotes: [
      'Q1 uses the neutral competitive market exactly (demand 1.0, normal competitor progress, neutral capacities).',
      'No segment is favoured; Q1 should establish hypotheses, not reveal the answer.',
    ],
  },
];

// ============ MARKET CONSTRUCTION ============

/** Structural capacity in force for a quarter: neutral capacity plus all structural changes up to that quarter. */
export function scenarioCapacity(quarter: number, arc: V2ScenarioQuarter[] = V2_SCENARIO_ARC): V2SegmentCapacity {
  const cap: V2SegmentCapacity = { ...NEUTRAL.segmentCapacity };
  for (const sq of arc.filter(s => s.quarter <= quarter).sort((a, b) => a.quarter - b.quarter)) {
    for (const ch of sq.structuralChanges) cap[ch.field] = ch.to;
  }
  return cap;
}

export function getScenarioQuarter(quarter: number, arc: V2ScenarioQuarter[] = V2_SCENARIO_ARC): V2ScenarioQuarter | undefined {
  return arc.find(s => s.quarter === quarter);
}

/**
 * Underlying market truth for a quarter. For quarters beyond the authored arc, a placeholder
 * continuation is used: neutral demand, neutral competitor progress, and the structural capacity
 * reached by the last authored quarter (structure persists; temporary demand does not).
 */
export function getScenarioMarket(quarter: number, arc: V2ScenarioQuarter[] = V2_SCENARIO_ARC): V2MarketConditions {
  const sq = getScenarioQuarter(quarter, arc);
  const capacity = scenarioCapacity(quarter, arc);
  if (!sq) {
    return { ...NEUTRAL, competitorProgress: { ...NEUTRAL.competitorProgress }, segmentCapacity: capacity };
  }
  return {
    ...sq.demand,
    competitorProgress: { ...sq.competitorProgress },
    segmentCapacity: capacity,
  };
}

export function lastAuthoredQuarter(arc: V2ScenarioQuarter[] = V2_SCENARIO_ARC): number {
  return Math.max(...arc.map(s => s.quarter));
}

// ============ PLAYER SIGNALS ============

/** A signal as presented to players entering a quarter. */
export interface V2PlayerSignal {
  id: string;
  audience: 'all' | V2Role;
  source: 'scenario-briefing' | 'company-kpi';
  topic: V2ScenarioBriefingSignal['topic'] | 'finance' | 'organization';
  label: string;
  shownValue?: number;
  shownRange?: [number, number];
  unit?: string;
  reliability: V2SignalReliability;
}

/** Minimal company-state view used to render measured KPI signals (no engine logic). */
export interface V2SignalCompanyView {
  quarter: number;
  cash: number;
  revenue: number;
  operatingProfit: number;
  segmentRevenue: { consumer: number; enterprise: number; university: number; aiNative: number };
  commercial: {
    consumerRetention: number;
    consumerCacIndex: number;
    enterprisePipeline: number;
    enterpriseWinRate: number;
    aiAdoptionIndex: number;
    universityRenewalRate: number;
    pricingPower: number;
  };
  organizationalCapacity: number;
  transformationLoad: number;
  culture: number;
}

/**
 * Signals visible to players at the start of `quarter`: the scenario briefing (possibly noisy)
 * plus measured KPIs from the company's opening state (exact, lagging by construction), tagged
 * with the role that would naturally own each KPI. Truth references are stripped.
 */
export function buildPlayerSignals(quarter: number, company: V2SignalCompanyView, arc: V2ScenarioQuarter[] = V2_SCENARIO_ARC): V2PlayerSignal[] {
  const sq = getScenarioQuarter(quarter, arc);
  const briefing: V2PlayerSignal[] = (sq?.signals ?? []).map(s => ({
    id: s.id,
    audience: s.audience,
    source: 'scenario-briefing',
    topic: s.topic,
    label: s.headline,
    shownValue: s.shownValue,
    shownRange: s.shownRange,
    unit: s.unit,
    reliability: s.reliability,
  }));
  const k = (id: string, audience: V2PlayerSignal['audience'], topic: V2PlayerSignal['topic'], label: string, value: number, unit: string): V2PlayerSignal => ({
    id: `kpi-${id}`, audience, source: 'company-kpi', topic, label, shownValue: value, unit, reliability: 'measured',
  });
  const c = company.commercial;
  const kpis: V2PlayerSignal[] = [
    k('revenue', 'all', 'finance', 'Quarterly revenue (last quarter)', company.revenue, '$M'),
    k('operating-profit', 'all', 'finance', 'Operating profit (last quarter)', company.operatingProfit, '$M'),
    k('cash', 'CFO', 'finance', 'Cash balance', company.cash, '$M'),
    k('consumer-revenue', 'Growth', 'consumer', 'Consumer revenue', company.segmentRevenue.consumer, '$M'),
    k('consumer-retention', 'Growth', 'consumer', 'Consumer paid retention', c.consumerRetention, '%'),
    k('consumer-cac', 'Growth', 'consumer', 'Consumer CAC index (100 = start)', c.consumerCacIndex, 'index'),
    k('enterprise-pipeline', 'Growth', 'enterprise', 'Enterprise qualified pipeline (ACV)', c.enterprisePipeline, '$M'),
    k('enterprise-win-rate', 'Growth', 'enterprise', 'Enterprise win rate', c.enterpriseWinRate, '%'),
    k('ai-adoption', 'Product', 'ai-native', 'AI product adoption index', c.aiAdoptionIndex, 'index'),
    k('ai-revenue', 'Product', 'ai-native', 'AI-native revenue', company.segmentRevenue.aiNative, '$M'),
    k('university-renewal', 'CEO', 'university', 'University renewal rate', c.universityRenewalRate, '%'),
    k('pricing-power', 'CEO', 'consumer', 'Pricing power', c.pricingPower, 'index'),
    k('org-capacity', 'People', 'organization', 'Organizational capacity', company.organizationalCapacity, 'index'),
    k('transformation-load', 'People', 'organization', 'Transformation load (last quarter)', company.transformationLoad, 'index'),
    k('culture', 'People', 'organization', 'Culture', company.culture, 'index'),
  ];
  return [...briefing, ...kpis];
}
