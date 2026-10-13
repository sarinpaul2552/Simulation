/**
 * NEXLEARN V3 — MARKET PATH C: ECONOMIC PRESSURE (Batch 10D)
 *
 * The same eight-beat skeleton as path A, in a world where the economy, not AI, is the main force:
 *   - conditions tighten from Q2: rising rates, cautious households, enterprise budget reviews;
 *   - AI tools spread, but mostly on free tiers: paying AI-native demand is modest;
 *   - career-change credentials are counter-cyclical (University holds up);
 *   - the recession arrives early (Q5) and is deep in Q6; recovery is slow (Q8 only partial);
 *   - the Q5 offer is a smaller, price-tight vendor-consolidation contract;
 *   - competitors are weakened (slower progress), so cash and resilience decide more than speed.
 *
 * Q1 is identical to path A. Q3 keeps path A's eight signal ids and sources with path-specific headlines and truths.
 */
import { V2_SCENARIO_ARC, type V2ScenarioQuarter } from './engineV3Scenario';

const A = (q: number) => structuredClone(V2_SCENARIO_ARC.find(s => s.quarter === q)!);
const shared = (q: number, ids: string[]) => A(q).signals.filter(s => ids.includes(s.id));

export const PATH_C_ARC: V2ScenarioQuarter[] = [
  A(1),
  {
    quarter: 2,
    id: 'c-q2-tightening',
    title: 'Q2 — Tightening Conditions',
    briefing:
      'Interest rates rise again and household budgets tighten. Free AI study tools spread quickly among price-sensitive ' +
      'learners, while employers start reviewing training budgets. Universities see more enquiries from people planning a ' +
      'career change. Nobody is calling it a recession yet.',
    demand: {
      consumerDemand: 0.93, consumerCommoditization: 0.3, consumerCacPressure: 1.1,
      enterpriseDemand: 0.97, enterpriseAIDemand: 1.15, universityDemand: 1.03, aiNativeDemand: 1.2, macroPressure: 0.25,
    },
    competitorProgress: { consumer: 1.0, enterprise: 0.75, credential: 0.5 },
    structuralChanges: [
      { field: 'aiNative', from: 80, to: 100, rationale: 'AI learning tools widen the market a little; free tiers capture most of the usage.' },
    ],
    signals: [
      {
        id: 'c-q2-rates', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'Interest rates rise again; household budgets tighten and consumer confidence falls for a second quarter.',
        truthReference: { field: 'macroPressure', value: 0.25, note: 'early pressure' },
      },
      {
        id: 'c-q2-ai-tools', audience: 'all', topic: 'ai-native', reliability: 'headline',
        headline: 'Free AI study tools spread quickly, especially among price-sensitive learners; AI tutoring downloads up about 40%.',
        shownValue: 40, unit: '% downloads',
        truthReference: { field: 'aiNativeDemand', value: 1.2, note: 'paying AI-native demand modest: free tiers capture the usage' },
      },
      {
        id: 'c-q2-consumer', audience: 'Growth', topic: 'consumer', reliability: 'estimate',
        headline: 'Subscription cancellations up; analysts expect consumer learning demand to change by −10% to −4%.',
        shownRange: [-10, -4], unit: '% demand',
        truthReference: { field: 'consumerDemand', value: 0.93, note: '−7%; CAC pressure 1.10' },
      },
      {
        id: 'c-q2-enterprise', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Employers are reviewing training budgets; some AI-productivity pilots continue.',
        truthReference: { field: 'enterpriseDemand', value: 0.97, note: 'enterprise AI 1.15' },
      },
      {
        id: 'c-q2-cfo', audience: 'CFO', topic: 'finance', reliability: 'headline',
        headline: 'Lenders are tightening terms; borrowing costs up about one percentage point.',
      },
      {
        id: 'c-q2-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'University partners report rising enquiries for career-change credentials.',
        truthReference: { field: 'universityDemand', value: 1.03, note: 'counter-cyclical' },
      },
      {
        id: 'c-q2-product-readiness', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'Engineering estimate: shipping credible AI features needs sustained AI and product investment for 2–3 quarters.',
        shownRange: [2, 3], unit: 'quarters',
      },
    ],
    designNotes: ['Macro 0.25 from Q2; consumer 0.93; enterprise 0.97 / AI 1.15; AI-native 1.2; university 1.03. Structural: AI-native 80 → 100.'],
  },
  {
    quarter: 3,
    id: 'c-q3-conflicting-evidence',
    title: 'Q3 — Conflicting Evidence',
    briefing:
      'Consumer usage looks stable, but paying subscribers are cancelling. Enterprise buyers are issuing more RFPs, many of ' +
      'them reviews of existing suppliers. AI engagement is soaring on free tiers. Career-change credentials are growing. ' +
      'Decide which evidence you believe.',
    demand: {
      consumerDemand: 0.9, consumerCommoditization: 0.3, consumerCacPressure: 1.08,
      enterpriseDemand: 0.95, enterpriseAIDemand: 1.15, universityDemand: 1.04, aiNativeDemand: 1.15, macroPressure: 0.4,
    },
    competitorProgress: { consumer: 0.8, enterprise: 0.6, credential: 0.4 },
    structuralChanges: [],
    signals: [
      {
        id: 'q3-consumer-usage', audience: 'Growth', topic: 'consumer', reliability: 'headline',
        headline: 'Consumer monthly active learners down only 4%; time-in-app stable.',
        shownValue: -4, unit: '% MAU',
        truthReference: { field: 'consumerDemand', value: 0.9, note: 'Usage understates the problem: paying demand −10% as learners drop to free tiers' },
      },
      {
        id: 'q3-consumer-paid-cohorts', audience: 'CFO', topic: 'consumer', reliability: 'estimate',
        headline: 'Finance cohort analysis: paying-subscriber revenue down an estimated 7%–12%; cancellations concentrated in monthly plans.',
        shownRange: [-12, -7], unit: '% paid revenue',
        truthReference: { field: 'consumerDemand', value: 0.9, note: 'consistent with truth' },
      },
      {
        id: 'q3-enterprise-rfps', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Enterprise RFPs for AI-enabled learning up ~15%; many are cost-cutting reviews of existing suppliers.',
        shownValue: 15, unit: '% RFPs',
        truthReference: { field: 'enterpriseDemand', value: 0.95, note: 'activity, not growth: enterprise demand slightly below neutral (AI 1.15)' },
      },
      {
        id: 'q3-ai-engagement', audience: 'Product', topic: 'ai-native', reliability: 'headline',
        headline: 'AI feature engagement up 35%, mostly on free tiers.',
        shownValue: 35, unit: '% engagement',
        truthReference: { field: 'aiNativeDemand', value: 1.15, note: 'paying AI-native demand eased (1.2 → 1.15): engagement ≠ willingness to pay' },
      },
      {
        id: 'q3-ai-wtp', audience: 'all', topic: 'ai-native', reliability: 'estimate',
        headline: 'Pilot-to-paid conversion for AI tutoring is uncertain: estimates range from 5% to 20%.',
        shownRange: [5, 20], unit: '% conversion',
        truthReference: { field: 'aiNativeDemand', value: 1.15, note: 'truth sits at the low end of the range' },
      },
      {
        id: 'q3-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'Career-change credential enrolments rising; partners plan to expand programmes.',
        truthReference: { field: 'universityDemand', value: 1.04, note: 'genuinely counter-cyclical' },
      },
      {
        id: 'q3-competition', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'Several consumer AI start-ups have run out of funding; competitors are cutting marketing.',
        truthReference: { field: 'competitorProgress.consumer', value: 0.8, note: 'competitors slowing toward or below normal pace' },
      },
      {
        id: 'q3-people-strain', audience: 'People', topic: 'competition', reliability: 'lagging',
        headline: 'Staff are anxious about layoffs elsewhere: voluntary attrition is down, engagement scores are falling.',
      },
    ],
    designNotes: [
      'Signals: usage (−4%) understates the paid loss (−10%); enterprise RFP activity overstates demand (cost reviews); AI engagement is on free tiers; university is genuinely counter-cyclical.',
      'Same eight Q3 signal ids and sources as path A.',
    ],
  },
  {
    ...A(4),
    id: 'c-q4-strategic-commitment',
    demand: {
      consumerDemand: 0.9, consumerCommoditization: 0.3, consumerCacPressure: 1.05,
      enterpriseDemand: 0.95, enterpriseAIDemand: 1.15, universityDemand: 1.04, aiNativeDemand: 1.15, macroPressure: 0.5,
    },
    competitorProgress: { consumer: 0.6, enterprise: 0.6, credential: 0.4 },
    signals: [
      {
        id: 'c-q4-market', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'The downturn is deepening: customers are choosing on value; AI is useful but not decisive.',
        truthReference: { field: 'macroPressure', value: 0.5, note: 'pressure rising' },
      },
      ...shared(4, ['q4-board', 'q4-readiness', 'q4-org-load']),
    ],
    designNotes: ['Rising macro pressure (0.5); competitors slowing.'],
  },
  {
    quarter: 5,
    id: 'c-q5-vendor-consolidation',
    title: 'Q5 — Major Growth Opportunity',
    briefing:
      'A global retailer is consolidating its training suppliers to save money. It offers you a $32M annual contract — if you ' +
      'can cut its training costs by a fifth. The terms are tight, with SLAs and a delivery team, but the revenue would be ' +
      'contracted for years. Meanwhile a recession now looks likely.',
    demand: {
      consumerDemand: 0.86, consumerCommoditization: 0.3, consumerCacPressure: 1.0,
      enterpriseDemand: 0.9, enterpriseAIDemand: 1.1, universityDemand: 1.03, aiNativeDemand: 1.1, macroPressure: 0.7,
    },
    competitorProgress: { consumer: 0.5, enterprise: 0.5, credential: 0.4 },
    structuralChanges: [],
    events: { opportunities: ['q5-vendor-consolidation'] },
    signals: [
      {
        id: 'c-q5-contract', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'A global retailer consolidating its training suppliers offers a $32M-a-year contract — if we cut its training costs by a fifth.',
        shownValue: 32, unit: '$M ACV',
      },
      {
        id: 'c-q5-contract-cfo', audience: 'CFO', topic: 'finance', reliability: 'estimate',
        headline: 'Finance: upfront set-up $4–7M; delivery team ≈ $1.2M/qtr; the price is tight and SLA penalties apply.',
        shownRange: [4, 7], unit: '$M upfront',
      },
      {
        id: 'c-q5-contract-product', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'Engineering: the client’s requirements would take 10–25% of product capacity for three quarters.',
        shownRange: [10, 25], unit: '% roadmap',
      },
      {
        id: 'c-q5-contract-people', audience: 'People', topic: 'organization', reliability: 'estimate',
        headline: 'People team: moderate extra workload for two to three quarters, at a time when morale is fragile.',
        shownRange: [2, 3], unit: 'quarters',
      },
      {
        id: 'c-q5-macro', audience: 'CFO', topic: 'macro', reliability: 'estimate',
        headline: 'Economists now put the probability of a recession within two quarters at 60–80%.',
        shownRange: [60, 80], unit: '% probability',
        truthReference: { field: 'macroPressure', value: 0.7, note: 'recession already biting; deep in Q6' },
      },
      {
        id: 'c-q5-consumer', audience: 'Growth', topic: 'consumer', reliability: 'headline',
        headline: 'Consumer cancellations are rising; discounted plans are the only growing segment.',
        truthReference: { field: 'consumerDemand', value: 0.86, note: '−14%' },
      },
    ],
    designNotes: ['Smaller, price-tight contract (ACV 32): lower upfront cost and load; contracted revenue matters more in a deep downturn.'],
  },
  {
    quarter: 6,
    id: 'c-q6-deep-recession',
    title: 'Q6 — Deep Recession',
    briefing:
      'The recession is deep. Unemployment is rising fast, households cancel subscriptions and enterprises cut training ' +
      'budgets sharply; only programmes that save money survive. Universities see more people retraining but face budget ' +
      'pressure. Two competitors have entered restructuring. The board asks how you will protect the company.',
    demand: {
      consumerDemand: 0.78, consumerCommoditization: 0.3, consumerCacPressure: 1.0,
      enterpriseDemand: 0.8, enterpriseAIDemand: 1.05, universityDemand: 1.0, aiNativeDemand: 1.05, macroPressure: 1.0,
    },
    competitorProgress: { consumer: 0.4, enterprise: 0.4, credential: 0.3 },
    structuralChanges: [],
    events: { recessionResponse: true },
    signals: [
      {
        id: 'c-q6-recession', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'Deep recession: unemployment rising fast; consumer confidence at a fifteen-year low.',
        truthReference: { field: 'macroPressure', value: 1.0, note: 'deepest of the three paths; demand shock, not structural' },
      },
      {
        id: 'c-q6-consumer', audience: 'Growth', topic: 'consumer', reliability: 'estimate',
        headline: 'Consumer learning spend expected to fall 15–25%; acquisition is cheap but few people convert.',
        shownRange: [-25, -15], unit: '% demand',
        truthReference: { field: 'consumerDemand', value: 0.78, note: '−22%' },
      },
      {
        id: 'c-q6-enterprise', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Enterprises cut training budgets sharply; only programmes that save money survive.',
        truthReference: { field: 'enterpriseDemand', value: 0.8, note: 'enterprise AI 1.05; strong customer success shields renewals' },
      },
      {
        id: 'c-q6-cfo', audience: 'CFO', topic: 'finance', reliability: 'estimate',
        headline: 'Finance: revenue likely 6–12% below plan for two to three quarters; credit markets are tight and valuations are down.',
        shownRange: [-12, -6], unit: '% vs plan',
      },
      {
        id: 'c-q6-people', audience: 'People', topic: 'organization', reliability: 'headline',
        headline: 'Layoffs everywhere; survivors’ morale is fragile. Deep cuts historically trigger regretted attrition for two to three quarters.',
      },
      {
        id: 'c-q6-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'Credential enrolments up as people retrain; university budgets are under pressure.',
        truthReference: { field: 'universityDemand', value: 1.0, note: 'holds at neutral while other segments fall' },
      },
      {
        id: 'c-q6-competition', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'Two competitors have entered restructuring; others are cutting deeply.',
        truthReference: { field: 'competitorProgress.consumer', value: 0.4, note: 'competitors nearly stalled' },
      },
    ],
    designNotes: ['Deep recession (macro 1.0). Capacities unchanged.'],
  },
  {
    ...A(7),
    id: 'c-q7-strategy-crisis',
    briefing:
      'There is no recovery yet: the downturn is lasting longer than forecast. Each strategy carries its own fragility, and ' +
      'this quarter the company you built meets the crisis its strategy invites. How badly it hurts depends on what you built.',
    demand: {
      consumerDemand: 0.84, consumerCommoditization: 0.3, consumerCacPressure: 1.0,
      enterpriseDemand: 0.88, enterpriseAIDemand: 1.1, universityDemand: 1.02, aiNativeDemand: 1.1, macroPressure: 0.7,
    },
    competitorProgress: { consumer: 0.5, enterprise: 0.5, credential: 0.4 },
    signals: [
      {
        id: 'c-q7-prolonged', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'No recovery yet: the downturn is lasting longer than economists forecast.',
        truthReference: { field: 'macroPressure', value: 0.7, note: 'prolonged' },
      },
      ...shared(7, ['q7-ai-errors', 'q7-sla-disputes', 'q7-poaching', 'q7-accreditation', 'q7-complexity']),
    ],
    designNotes: ['Prolonged downturn (macro 0.7). Crisis families unchanged.'],
  },
  {
    ...A(8),
    id: 'c-q8-final-decision',
    briefing:
      'The first signs of recovery appear, but budgets are still cautious. Investors favour profitable, cash-generative ' +
      'companies. The board asks what the company should become next: the options open to you depend on what you built.',
    demand: {
      consumerDemand: 0.92, consumerCommoditization: 0.3, consumerCacPressure: 1.02,
      enterpriseDemand: 0.98, enterpriseAIDemand: 1.2, universityDemand: 1.03, aiNativeDemand: 1.15, macroPressure: 0.35,
    },
    competitorProgress: { consumer: 0.7, enterprise: 0.7, credential: 0.4 },
    signals: [
      {
        id: 'c-q8-early-recovery', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'Early signs of recovery; customers’ budgets remain cautious.',
        truthReference: { field: 'macroPressure', value: 0.35, note: 'partial recovery' },
      },
      {
        id: 'c-q8-investors', audience: 'CFO', topic: 'finance', reliability: 'headline',
        headline: 'Investors favour profitable, cash-generative companies; growth stories are heavily discounted.',
      },
      ...shared(8, ['q8-consolidation', 'q8-board']),
    ],
    designNotes: ['Partial recovery (macro 0.35).'],
  },
];
