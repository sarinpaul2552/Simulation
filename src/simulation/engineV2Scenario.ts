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
  topic: 'consumer' | 'enterprise' | 'ai-native' | 'university' | 'macro' | 'competition' | 'finance' | 'organization';
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
  /**
   * Batch 3: decision events offered this quarter. The scenario only declares WHICH event exists;
   * company-specific terms/severity are computed by the decision modules from the company actually built.
   */
  events?: {
    /** Opportunity ids (engineV2Opportunity catalog). */
    opportunities?: string[];
    /** Recession response menu is open (engineV2Management). */
    recessionResponse?: boolean;
    /** Strategy-dependent crisis fires this quarter (engineV2Crisis). */
    crisis?: boolean;
    /** Final strategic decision (engineV2Final). */
    finalDecision?: boolean;
  };
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
  {
    quarter: 2,
    id: 'q2-generative-ai-disruption',
    title: 'Q2 — Generative AI Disruption',
    briefing:
      'Consumer-grade generative AI reaches mass adoption within weeks. Free AI tutors undercut paid consumer learning; ' +
      'acquisition gets more expensive and differentiation erodes. Enterprises urgently ask how AI changes workforce ' +
      'learning. AI-native learning products see a surge of interest. Universities are cautious but stable.',
    // Calibration (Q3 checkpoint): 0.93/0.35/1.15 → 0.90/0.45/1.20 — cumulative Q2+Q3 consumer hit was only −2.4%.
    demand: {
      consumerDemand: 0.9,
      consumerCommoditization: 0.45,
      consumerCacPressure: 1.2,
      // Calibration (Q4 checkpoint): enterprise 1.05 → 1.10, enterprise AI 1.35 → 1.40 (opportunity was too weak to matter).
      enterpriseDemand: 1.1,
      enterpriseAIDemand: 1.4,
      universityDemand: 1.0,
      aiNativeDemand: 1.7,
      macroPressure: 0,
    },
    competitorProgress: { consumer: 1.5, enterprise: 1.0, credential: 0.5 },
    structuralChanges: [
      { field: 'aiNative', from: 80, to: 150, rationale: 'Generative AI creates a structurally larger AI-native learning market (new use cases, new buyers).' },
      { field: 'enterprise', from: 120, to: 135, rationale: 'AI-enabled workforce reskilling widens the addressable enterprise learning budget.' },
    ],
    signals: [
      {
        id: 'q2-ai-disruption', audience: 'all', topic: 'ai-native', reliability: 'headline',
        headline: 'Consumer AI assistants pass 100M users; AI tutoring app downloads up ~70% in a quarter.',
        shownValue: 70, unit: '% downloads',
        truthReference: { field: 'aiNativeDemand', value: 1.7, note: 'AI-native demand index; paying demand still depends on readiness/adoption' },
      },
      {
        id: 'q2-consumer-conversion', audience: 'all', topic: 'consumer', reliability: 'estimate',
        headline: 'Consumer trial-to-paid conversion is falling; analysts estimate −4% to −12% category demand.',
        shownRange: [-12, -4], unit: '% demand',
        truthReference: { field: 'consumerDemand', value: 0.9, note: '−10%' },
      },
      {
        id: 'q2-consumer-cac', audience: 'Growth', topic: 'consumer', reliability: 'headline',
        headline: 'Paid acquisition costs up ~20% as AI-native apps bid for the same audiences; price comparison intensifies.',
        shownValue: 20, unit: '% CAC',
        truthReference: { field: 'consumerCacPressure', value: 1.2, note: 'plus commoditization 0.45' },
      },
      {
        id: 'q2-enterprise-interest', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Chief learning officers report 30%+ more interest in AI upskilling programmes; budgets not yet reallocated.',
        shownValue: 30, unit: '% interest',
        truthReference: { field: 'enterpriseAIDemand', value: 1.4, note: 'enterpriseDemand 1.10; monetization needs Enterprise capability + CS + Trust' },
      },
      {
        id: 'q2-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'University partners are debating AI policy; renewal intentions unchanged.',
        truthReference: { field: 'universityDemand', value: 1.0, note: 'stable' },
      },
      {
        id: 'q2-competition', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'Well-funded AI-native entrants are launching consumer learning products at speed.',
        truthReference: { field: 'competitorProgress.consumer', value: 1.5, note: 'consumer benchmark doubles its pace' },
      },
      {
        id: 'q2-product-readiness', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'Engineering estimate: shipping credible AI features needs sustained AI and product investment for 2–3 quarters.',
        shownRange: [2, 3], unit: 'quarters',
      },
    ],
    designNotes: [
      'Temporary (this quarter): consumer demand 0.90, commoditization 0.45, CAC pressure 1.20, enterprise demand 1.05, enterprise AI demand 1.35, AI-native demand 1.7.',
      'Benchmark acceleration: consumer 0.75 → 1.5 /qtr, enterprise 0.75 → 1.0 /qtr.',
      'Structural: AI-native capacity 80 → 150, enterprise 120 → 135. Consumer capacity NOT reduced (pressure is demand/commoditization, not ceiling).',
      'AI-enabled Consumer defense operates through the existing commoditization shield (AI readiness) in retention.',
    ],
  },
  {
    quarter: 3,
    id: 'q3-conflicting-evidence',
    title: 'Q3 — Conflicting Evidence',
    briefing:
      'The dust has not settled. Headline consumer usage is down sharply, yet paying subscribers seem stickier than usage ' +
      'suggests. Enterprise buyers are issuing AI-learning RFPs. AI product engagement is soaring, but nobody yet knows ' +
      'how much people will pay for it. Universities are renewing. Decide which evidence you believe.',
    demand: {
      consumerDemand: 0.95,
      consumerCommoditization: 0.35,
      consumerCacPressure: 1.12,
      // Calibration (Q4 checkpoint): enterprise 1.08 → 1.15, AI 1.40 → 1.50 — the RFP surge is "genuine".
      enterpriseDemand: 1.15,
      enterpriseAIDemand: 1.5,
      universityDemand: 1.02,
      aiNativeDemand: 1.45,
      macroPressure: 0,
    },
    competitorProgress: { consumer: 1.25, enterprise: 1.0, credential: 0.5 },
    structuralChanges: [],
    signals: [
      {
        id: 'q3-consumer-usage', audience: 'Growth', topic: 'consumer', reliability: 'headline',
        headline: 'Consumer monthly active learners down 11% quarter-on-quarter; time-in-app down 15%.',
        shownValue: -11, unit: '% MAU',
        truthReference: { field: 'consumerDemand', value: 0.95, note: 'Usage is not revenue: paid demand only −5%; free/casual users churned first' },
      },
      {
        id: 'q3-consumer-paid-cohorts', audience: 'CFO', topic: 'consumer', reliability: 'estimate',
        headline: 'Finance cohort analysis: paying-subscriber revenue down an estimated 2%–5%, far less than usage.',
        shownRange: [-5, -2], unit: '% paid revenue',
        truthReference: { field: 'consumerDemand', value: 0.95, note: 'consistent with truth' },
      },
      {
        id: 'q3-enterprise-rfps', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Enterprise RFPs for AI-enabled learning up ~25%; procurement cycles still long.',
        shownValue: 25, unit: '% RFPs',
        truthReference: { field: 'enterpriseAIDemand', value: 1.5, note: 'enterpriseDemand 1.15 — genuine strengthening' },
      },
      {
        id: 'q3-ai-engagement', audience: 'Product', topic: 'ai-native', reliability: 'headline',
        headline: 'AI product engagement up 45%; sessions per user doubling.',
        shownValue: 45, unit: '% engagement',
        truthReference: { field: 'aiNativeDemand', value: 1.45, note: 'Paying AI-native demand actually eased from 1.7 to 1.45: engagement ≠ willingness to pay' },
      },
      {
        id: 'q3-ai-wtp', audience: 'all', topic: 'ai-native', reliability: 'estimate',
        headline: 'Pilot-to-paid conversion for AI tutoring is uncertain: estimates range from 5% to 20%.',
        shownRange: [5, 20], unit: '% conversion',
        truthReference: { field: 'aiNativeDemand', value: 1.45, note: 'truth sits in the lower-middle of the range' },
      },
      {
        id: 'q3-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'University renewals strong; three partners expanding credential programmes.',
        truthReference: { field: 'universityDemand', value: 1.02, note: 'mildly positive' },
      },
      {
        id: 'q3-competition', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'Consumer AI entrants are consolidating; the pace of new launches is slowing.',
        truthReference: { field: 'competitorProgress.consumer', value: 1.25, note: 'still faster than normal (0.75), slower than Q2 (1.5)' },
      },
      {
        id: 'q3-people-strain', audience: 'People', topic: 'competition', reliability: 'lagging',
        headline: 'AI engineers are being poached at 30–40% premiums; attrition risk rising in product teams.',
        shownRange: [30, 40], unit: '% premium',
      },
    ],
    designNotes: [
      'No new structural shock and no structural capacity change.',
      'Signals deliberately diverge from truth: usage (−11%) overstates paid consumer weakness (−5%); AI engagement (+45%) rises while paying AI-native demand eases (1.7 → 1.45); enterprise strengthening is genuine.',
      'Role-private signals: Growth sees usage; CFO sees paid cohorts; Product sees engagement; CEO sees university; People sees talent strain.',
      'Belief quality is not scored yet.',
    ],
  },
  {
    quarter: 4,
    id: 'q4-strategic-commitment',
    title: 'Q4 — Strategic Commitment',
    briefing:
      'The board asks for a strategic commitment. Choose what company you will become: Consumer AI Learning Platform, ' +
      'AI-powered Enterprise Learning Company, Premium Human + AI, University/Credential Infrastructure, or Balanced ' +
      'Learning Marketplace. Commitment focuses the organization and opens specialized opportunity, but it takes time, and ' +
      'it works best when the capabilities you built in Q1–Q3 support it.',
    demand: {
      // Calibration (Q4 checkpoint): commoditization 0.35 → 0.40; enterprise 1.06 → 1.12, AI 1.35 → 1.45.
      consumerDemand: 0.97,
      consumerCommoditization: 0.4,
      consumerCacPressure: 1.1,
      enterpriseDemand: 1.12,
      enterpriseAIDemand: 1.45,
      universityDemand: 1.02,
      aiNativeDemand: 1.45,
      macroPressure: 0,
    },
    competitorProgress: { consumer: 1.0, enterprise: 1.0, credential: 0.5 },
    structuralChanges: [],
    signals: [
      {
        id: 'q4-market-settling', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'The market is settling into a new shape: AI is now table stakes; the question is where to win.',
        truthReference: { field: 'competitorProgress.consumer', value: 1.0, note: 'consumer benchmark pace easing toward normal' },
      },
      {
        id: 'q4-board', audience: 'CEO', topic: 'competition', reliability: 'headline',
        headline: 'Board: “We will back a clear destination. Half-commitments will not get funded beyond this year.”',
      },
      {
        id: 'q4-readiness', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'Engineering: repositioning around a destination that our capabilities do not yet support would take 2–4 quarters.',
        shownRange: [2, 4], unit: 'quarters',
      },
      {
        id: 'q4-org-load', audience: 'People', topic: 'competition', reliability: 'estimate',
        headline: 'People team: a strategic reorganization adds significant change load for about three quarters.',
        shownRange: [2, 3], unit: 'quarters',
      },
    ],
    designNotes: [
      'Moderate, settling market: consumer 0.97 / commoditization 0.35 / CAC 1.10; enterprise 1.06 / AI 1.35; AI-native 1.45; university 1.02.',
      'Benchmark pace easing: consumer 1.0, enterprise 1.0, credential 0.5. No structural change.',
      'Destination economics are implemented in engineV2Destination (focus, ceiling, access, transition) — never revenue.',
    ],
  },
  {
    quarter: 5,
    id: 'q5-growth-opportunity',
    title: 'Q5 — Major Growth Opportunity',
    briefing:
      'A Fortune-100 client invites you to deliver a global AI-enabled learning programme across 40 countries: a $48M ' +
      'annual contract with strict SLAs, localisation, product customization and a dedicated delivery team. It would be ' +
      'the largest contract in the company\'s history. Accepting commits cash, people and roadmap for three quarters; ' +
      'declining preserves capacity and focus. Meanwhile, some leading economic indicators are softening.',
    demand: {
      consumerDemand: 0.98,
      consumerCommoditization: 0.35,
      consumerCacPressure: 1.08,
      enterpriseDemand: 1.12,
      enterpriseAIDemand: 1.45,
      universityDemand: 1.02,
      aiNativeDemand: 1.4,
      macroPressure: 0.1,
    },
    competitorProgress: { consumer: 1.0, enterprise: 1.0, credential: 0.5 },
    structuralChanges: [],
    events: { opportunities: ['q5-global-enterprise'] },
    signals: [
      {
        id: 'q5-global-contract', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Fortune-100 client offers a $48M-a-year global AI-learning contract; go-live across 40 countries within three quarters.',
        shownValue: 48, unit: '$M ACV',
      },
      {
        id: 'q5-contract-cfo', audience: 'CFO', topic: 'finance', reliability: 'estimate',
        headline: 'Finance: upfront implementation and customization $6–11M; dedicated delivery team ≈ $1.5M/qtr; SLA penalties if delivery slips.',
        shownRange: [6, 11], unit: '$M upfront',
      },
      {
        id: 'q5-contract-product', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'Engineering: client customization would absorb 20–40% of AI/Product roadmap capacity for three quarters unless it is our core product direction.',
        shownRange: [20, 40], unit: '% roadmap',
      },
      {
        id: 'q5-contract-people', audience: 'People', topic: 'organization', reliability: 'estimate',
        headline: 'People team: the delivery programme adds heavy change load for about three quarters; lighter if enterprise delivery is already our focus.',
        shownRange: [2, 3], unit: 'quarters',
      },
      {
        id: 'q5-macro-early', audience: 'CFO', topic: 'macro', reliability: 'estimate',
        headline: 'Economists put the probability of a downturn within two quarters at 30–50%; contracted revenue tends to be more resilient than discretionary spend.',
        shownRange: [30, 50], unit: '% probability',
        truthReference: { field: 'macroPressure', value: 0.1, note: 'mild softening now; recession arrives in Q6' },
      },
      {
        id: 'q5-consumer', audience: 'Growth', topic: 'consumer', reliability: 'headline',
        headline: 'Consumer category stabilising; AI features now expected as standard.',
        truthReference: { field: 'consumerDemand', value: 0.98, note: 'near neutral, commoditization 0.35 persists' },
      },
    ],
    designNotes: [
      'Settled post-disruption market with mild macro softening (0.1). No structural change.',
      'The opportunity is company-specific (engineV2Opportunity): fit from Enterprise, CS, AI readiness, PQ, Trust, Execution.',
      'Contracted revenue flows through the Enterprise backlog; costs, load, roadmap diversion, focus dilution and SLA exposure are explicit.',
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
/**
 * How quarters beyond the authored arc are filled (placeholder until Q5–Q8 are authored):
 *   'carry-last' (default) — the last authored quarter's demand and competitor pace persist
 *                            (the post-disruption world does not silently revert to neutral);
 *   'neutral'              — neutral demand and pace.
 * Structural capacity always persists either way.
 */
export type V2ContinuationMode = 'carry-last' | 'neutral';
let continuationMode: V2ContinuationMode = 'carry-last';
export function setScenarioContinuation(mode: V2ContinuationMode): void {
  continuationMode = mode;
}
export function getScenarioContinuation(): V2ContinuationMode {
  return continuationMode;
}

export function getScenarioMarket(quarter: number, arc: V2ScenarioQuarter[] = V2_SCENARIO_ARC): V2MarketConditions {
  const sq = getScenarioQuarter(quarter, arc);
  const capacity = scenarioCapacity(quarter, arc);
  if (!sq) {
    if (continuationMode === 'carry-last') {
      const last = getScenarioQuarter(lastAuthoredQuarter(arc), arc)!;
      return { ...last.demand, competitorProgress: { ...last.competitorProgress }, segmentCapacity: capacity };
    }
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
  topic: V2ScenarioBriefingSignal['topic'];
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
