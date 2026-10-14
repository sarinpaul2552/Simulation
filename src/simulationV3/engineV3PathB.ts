/**
 * NEXLEARN V3 — MARKET PATH B: ENTERPRISE TRANSFORMATION (Batch 10D)
 *
 * The same eight-beat skeleton as path A (Q1 calm → Q2 shock → Q3 conflicting evidence → Q4 commitment → Q5 contract →
 * Q6 downturn → Q7 strategy crisis → Q8 final move), with a different world:
 *   - AI arrives through the workplace: employers mandate AI reskilling and fund it, so part of self-paid consumer
 *     learning moves to employer programmes (consumer market capacity 300 → 160: the paying consumer market stops growing);
 *   - enterprise demand is strong and long-lived; enterprise competitors are still piloting (delivery at scale decides);
 *   - stand-alone AI-native demand is modest; the Q5 offer is a larger consortium programme;
 *   - the Q6 downturn is a shallower budget squeeze, and enterprise recovers first.
 *
 * Q1 is identical to path A. Q3 keeps path A's eight signal ids and sources (so Batch 10A evidence choices stay valid),
 * with path-specific headlines and truths. Every other signal id is path-specific or a shared generic id whose text is
 * identical across paths (Q4 board/readiness/load, Q7 crisis families, Q8 investors/consolidation/board).
 * Truth references are audit-only: never shown to players, never read by the engine.
 */
import { V2_SCENARIO_ARC, type V2ScenarioQuarter } from './engineV3Scenario';

const A = (q: number) => structuredClone(V2_SCENARIO_ARC.find(s => s.quarter === q)!);
const shared = (q: number, ids: string[]) => A(q).signals.filter(s => ids.includes(s.id));

export const PATH_B_ARC: V2ScenarioQuarter[] = [
  A(1),
  {
    quarter: 2,
    id: 'b-q2-workplace-ai',
    title: 'Q2 — AI Reaches the Workplace',
    briefing:
      'Employers move first. Boards mandate AI reskilling for their workforces, and chief learning officers are asked for ' +
      'plans within a year. Consumer AI assistants keep growing, but the substitution of paid consumer learning is milder ' +
      'than many feared. Enterprise learning suites and consultancies are bundling AI training into existing contracts.',
    demand: {
      consumerDemand: 0.92, consumerCommoditization: 0.25, consumerCacPressure: 1.08,
      enterpriseDemand: 1.35, enterpriseAIDemand: 1.75, universityDemand: 1.0, aiNativeDemand: 1.2, macroPressure: 0,
    },
    competitorProgress: { consumer: 1.1, enterprise: 1.0, credential: 0.5 },
    structuralChanges: [
      { field: 'consumer', from: 300, to: 160, rationale: 'Employer-funded AI programmes replace part of self-paid learning: the paying consumer market stops growing.' },
      { field: 'enterprise', from: 120, to: 165, rationale: 'Workforce AI reskilling becomes a board-level budget line: a structurally larger enterprise learning market.' },
      { field: 'aiNative', from: 80, to: 105, rationale: 'Stand-alone AI learning products grow, but more slowly than workplace programmes.' },
    ],
    signals: [
      {
        id: 'b-q2-enterprise-mandates', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Board-level AI mandates: about 60% of large employers plan AI reskilling programmes within a year.',
        shownValue: 60, unit: '% employers',
        truthReference: { field: 'enterpriseAIDemand', value: 1.75, note: 'enterpriseDemand 1.35; strong and durable' },
      },
      {
        id: 'b-q2-consumer-ai', audience: 'all', topic: 'consumer', reliability: 'estimate',
        headline: 'Employees now get AI training through work; analysts expect self-paid consumer learning demand to change by −10% to −4%.',
        shownRange: [-10, -4], unit: '% demand',
        truthReference: { field: 'consumerDemand', value: 0.92, note: '−8%; consumer capacity 300 → 160 (employer-funded substitution); commoditization 0.25' },
      },
      {
        id: 'b-q2-consumer-cac', audience: 'Growth', topic: 'consumer', reliability: 'headline',
        headline: 'Paid acquisition costs up about 8%; price comparison is increasing but not severe.',
        shownValue: 8, unit: '% CAC',
        truthReference: { field: 'consumerCacPressure', value: 1.08, note: 'mild' },
      },
      {
        id: 'b-q2-enterprise-competition', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'Enterprise learning suites are adding AI modules, but none has yet shown it can deliver at scale; consumer AI apps keep improving quickly.',
        truthReference: { field: 'competitorProgress.enterprise', value: 1.0, note: 'enterprise benchmark at a modest pace (1.0); consumer benchmark 1.1' },
      },
      {
        id: 'b-q2-delivery', audience: 'People', topic: 'organization', reliability: 'estimate',
        headline: 'Implementation and customer-success specialists are scarce; hiring a delivery team takes 2–3 quarters.',
        shownRange: [2, 3], unit: 'quarters',
      },
      {
        id: 'b-q2-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'University partners report employer requests for AI-skills credentials; renewal intentions unchanged.',
        truthReference: { field: 'universityDemand', value: 1.0, note: 'stable this quarter' },
      },
      {
        id: 'b-q2-product-readiness', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'Engineering: enterprise buyers need security, integrations and admin controls before buying AI tools — 2–3 quarters of work.',
        shownRange: [2, 3], unit: 'quarters',
      },
    ],
    designNotes: [
      'Temporary: consumer 0.92 / commoditization 0.25 / CAC 1.08; enterprise 1.35 / AI 1.75; AI-native 1.2.',
      'Benchmarks: consumer 1.1, enterprise 1.0, credential 0.5 /qtr. Structural: consumer 300 → 160 (employer-funded substitution), enterprise 120 → 165, AI-native 80 → 105.',
    ],
  },
  {
    quarter: 3,
    id: 'b-q3-conflicting-evidence',
    title: 'Q3 — Conflicting Evidence',
    briefing:
      'Enterprise buyers are issuing AI-learning RFPs and asking for proof of delivery at scale. Consumer usage dipped a ' +
      'little. AI feature engagement is rising, much of it from enterprise pilots. Competitors are signing multi-year ' +
      'platform deals. Decide which evidence you believe.',
    demand: {
      consumerDemand: 0.92, consumerCommoditization: 0.25, consumerCacPressure: 1.06,
      enterpriseDemand: 1.42, enterpriseAIDemand: 1.8, universityDemand: 1.04, aiNativeDemand: 1.15, macroPressure: 0,
    },
    competitorProgress: { consumer: 1.1, enterprise: 1.0, credential: 0.6 },
    structuralChanges: [],
    signals: [
      {
        id: 'q3-consumer-usage', audience: 'Growth', topic: 'consumer', reliability: 'headline',
        headline: 'Consumer monthly active learners down 9% quarter-on-quarter; time-in-app down 7%.',
        shownValue: -9, unit: '% MAU',
        truthReference: { field: 'consumerDemand', value: 0.92, note: 'Paid demand about −8%: this time usage tracked paying demand closely' },
      },
      {
        id: 'q3-consumer-paid-cohorts', audience: 'CFO', topic: 'consumer', reliability: 'estimate',
        headline: 'Finance cohort analysis: paying-subscriber revenue down an estimated 6%–10%; more learners say their employer now pays for training.',
        shownRange: [-10, -6], unit: '% paid revenue',
        truthReference: { field: 'consumerDemand', value: 0.92, note: 'consistent with truth' },
      },
      {
        id: 'q3-enterprise-rfps', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Enterprise RFPs for AI-enabled learning up ~40%; buyers ask for proof of delivery at scale.',
        shownValue: 40, unit: '% RFPs',
        truthReference: { field: 'enterpriseAIDemand', value: 1.8, note: 'enterpriseDemand 1.42 — genuine and strong; delivery capability decides who wins' },
      },
      {
        id: 'q3-ai-engagement', audience: 'Product', topic: 'ai-native', reliability: 'headline',
        headline: 'AI feature engagement up 30%, mostly from enterprise pilot users.',
        shownValue: 30, unit: '% engagement',
        truthReference: { field: 'aiNativeDemand', value: 1.15, note: 'Engagement came from enterprise pilots; stand-alone AI-native paying demand stayed modest (1.2 → 1.15)' },
      },
      {
        id: 'q3-ai-wtp', audience: 'all', topic: 'ai-native', reliability: 'estimate',
        headline: 'Pilot-to-paid conversion for stand-alone AI tutoring is uncertain: estimates range from 5% to 20%.',
        shownRange: [5, 20], unit: '% conversion',
        truthReference: { field: 'aiNativeDemand', value: 1.15, note: 'truth sits at the low end of the range' },
      },
      {
        id: 'q3-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'Universities report strong employer demand for AI-skills micro-credentials; two partners propose joint programmes.',
        truthReference: { field: 'universityDemand', value: 1.04, note: 'mildly positive' },
      },
      {
        id: 'q3-competition', audience: 'all', topic: 'competition', reliability: 'headline',
        headline: 'Consumer AI apps keep improving quickly; enterprise competitors are still mostly running pilots.',
        truthReference: { field: 'competitorProgress.consumer', value: 1.1, note: 'consumer benchmark faster than normal (1.1); enterprise benchmark modest (1.0)' },
      },
      {
        id: 'q3-people-strain', audience: 'People', topic: 'competition', reliability: 'lagging',
        headline: 'Implementation and customer-success staff are being hired away at 25–35% premiums.',
        shownRange: [25, 35], unit: '% premium',
      },
    ],
    designNotes: [
      'Signals: usage (−9%) and paid cohorts (−6% to −10%) agree (paid −8%); enterprise strengthening is genuine and strong; AI engagement reflects enterprise pilots, not stand-alone willingness to pay.',
      'Same eight Q3 signal ids and sources as path A (Batch 10A evidence options).',
    ],
  },
  {
    ...A(4),
    id: 'b-q4-strategic-commitment',
    demand: {
      consumerDemand: 0.92, consumerCommoditization: 0.25, consumerCacPressure: 1.05,
      enterpriseDemand: 1.4, enterpriseAIDemand: 1.75, universityDemand: 1.04, aiNativeDemand: 1.15, macroPressure: 0,
    },
    competitorProgress: { consumer: 1.1, enterprise: 1.0, credential: 0.5 },
    signals: [
      {
        id: 'b-q4-market', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Workplace AI reskilling is becoming the industry’s main growth market; self-paid consumer learning is flat.',
        truthReference: { field: 'enterpriseDemand', value: 1.4, note: 'enterprise AI demand 1.75' },
      },
      ...shared(4, ['q4-board', 'q4-readiness', 'q4-org-load']),
    ],
    designNotes: ['Enterprise demand remains strong; consumer market capped by employer-funded substitution.'],
  },
  {
    quarter: 5,
    id: 'b-q5-consortium',
    title: 'Q5 — Major Growth Opportunity',
    briefing:
      'A consortium of three global manufacturers invites you to run its AI reskilling programme across 25 countries: a $64M ' +
      'annual contract with strict SLAs, integration work and a dedicated delivery team. It would be the largest contract in ' +
      'the company\'s history. Accepting commits cash, people and roadmap for three quarters; declining preserves capacity ' +
      'and focus. Economic indicators are softening slightly.',
    demand: {
      consumerDemand: 0.93, consumerCommoditization: 0.25, consumerCacPressure: 1.05,
      enterpriseDemand: 1.38, enterpriseAIDemand: 1.75, universityDemand: 1.03, aiNativeDemand: 1.1, macroPressure: 0.05,
    },
    competitorProgress: { consumer: 1.1, enterprise: 1.0, credential: 0.5 },
    structuralChanges: [],
    events: { opportunities: ['q5-enterprise-consortium'] },
    signals: [
      {
        id: 'b-q5-consortium', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'A consortium of three global manufacturers offers a $64M-a-year AI reskilling programme; go-live in 25 countries within three quarters.',
        shownValue: 64, unit: '$M ACV',
      },
      {
        id: 'b-q5-contract-cfo', audience: 'CFO', topic: 'finance', reliability: 'estimate',
        headline: 'Finance: upfront implementation and integration $7–13M; dedicated delivery team ≈ $2M/qtr; SLA penalties if delivery slips.',
        shownRange: [7, 13], unit: '$M upfront',
      },
      {
        id: 'b-q5-contract-product', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'Engineering: integrations for three clients would absorb 15–35% of AI/Product roadmap capacity for three quarters unless enterprise is our core direction.',
        shownRange: [15, 35], unit: '% roadmap',
      },
      {
        id: 'b-q5-contract-people', audience: 'People', topic: 'organization', reliability: 'estimate',
        headline: 'People team: the programme adds heavy change load for about three quarters, and the delivery hiring market is tight.',
        shownRange: [2, 3], unit: 'quarters',
      },
      {
        id: 'b-q5-macro', audience: 'CFO', topic: 'macro', reliability: 'estimate',
        headline: 'Economists put the probability of a slowdown within two quarters at 20–35%; contracted revenue tends to hold up better than discretionary spend.',
        shownRange: [20, 35], unit: '% probability',
        truthReference: { field: 'macroPressure', value: 0.05, note: 'mild; a shallow budget squeeze arrives in Q6' },
      },
      {
        id: 'b-q5-pipeline', audience: 'Growth', topic: 'enterprise', reliability: 'headline',
        headline: 'Other enterprise prospects are waiting to see which providers win the first large programmes.',
      },
    ],
    designNotes: ['Larger contract than path A (ACV 64): more upfront cost, more load, a stronger reference effect in a strong enterprise market.'],
  },
  {
    quarter: 6,
    id: 'b-q6-budget-squeeze',
    title: 'Q6 — Budget Squeeze',
    briefing:
      'Growth stalls for two quarters. Employers delay new training programmes and freeze new suppliers, but keep funding ' +
      'AI projects that cut costs and renew programmes that are already delivering. Consumer spending softens. The board ' +
      'asks how you will steer through the squeeze.',
    demand: {
      consumerDemand: 0.87, consumerCommoditization: 0.25, consumerCacPressure: 1.03,
      enterpriseDemand: 1.06, enterpriseAIDemand: 1.45, universityDemand: 0.99, aiNativeDemand: 1.05, macroPressure: 0.5,
    },
    competitorProgress: { consumer: 1.1, enterprise: 0.8, credential: 0.4 },
    structuralChanges: [],
    events: { recessionResponse: true },
    signals: [
      {
        id: 'b-q6-slowdown', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'Economic growth stalls for two quarters; employers delay new training programmes but keep AI-productivity projects.',
        truthReference: { field: 'macroPressure', value: 0.5, note: 'shallower than path A (0.8); demand shock, not structural' },
      },
      {
        id: 'b-q6-consumer', audience: 'Growth', topic: 'consumer', reliability: 'estimate',
        headline: 'Consumer learning spend expected to fall 5–10%; discount-seeking is rising.',
        shownRange: [-10, -5], unit: '% demand',
        truthReference: { field: 'consumerDemand', value: 0.87, note: '−13% from neutral; about −5% on the already-lower base' },
      },
      {
        id: 'b-q6-enterprise', audience: 'all', topic: 'enterprise', reliability: 'headline',
        headline: 'Procurement freezes on new suppliers; renewals of programmes that are delivering continue.',
        truthReference: { field: 'enterpriseDemand', value: 1.06, note: 'enterprise demand dips but stays above neutral (AI 1.45); strong customer success shields renewals' },
      },
      {
        id: 'b-q6-ai', audience: 'Product', topic: 'ai-native', reliability: 'estimate',
        headline: 'AI projects that cut costs keep their funding; experimental pilots are cancelled (−10% to −25% new pilots).',
        shownRange: [-25, -10], unit: '% new pilots',
        truthReference: { field: 'aiNativeDemand', value: 1.05, note: 'modest' },
      },
      {
        id: 'b-q6-university', audience: 'CEO', topic: 'university', reliability: 'headline',
        headline: 'University partners hold budgets; employer-sponsored credentials slow slightly.',
        truthReference: { field: 'universityDemand', value: 0.99, note: 'steady' },
      },
      {
        id: 'b-q6-cfo', audience: 'CFO', topic: 'finance', reliability: 'estimate',
        headline: 'Finance: revenue likely 2–5% below plan for two quarters; lenders cautious but open.',
        shownRange: [-5, -2], unit: '% vs plan',
      },
      {
        id: 'b-q6-people', audience: 'People', topic: 'organization', reliability: 'headline',
        headline: 'Delivery teams are stretched; sector layoffs are concentrated in sales and marketing. Deep cuts historically trigger regretted attrition for two to three quarters.',
      },
    ],
    designNotes: ['Shallow budget squeeze (macro 0.5); enterprise AI demand holds above neutral.'],
  },
  {
    ...A(7),
    id: 'b-q7-strategy-crisis',
    briefing:
      'Enterprise budgets are reopening and the slowdown is fading. Each strategy carries its own fragility, and this ' +
      'quarter the company you built meets the crisis its strategy invites. How badly it hurts depends on what you built.',
    demand: {
      consumerDemand: 0.9, consumerCommoditization: 0.25, consumerCacPressure: 1.03,
      enterpriseDemand: 1.21, enterpriseAIDemand: 1.6, universityDemand: 1.0, aiNativeDemand: 1.1, macroPressure: 0.3,
    },
    competitorProgress: { consumer: 1.1, enterprise: 1.0, credential: 0.5 },
    signals: [
      {
        id: 'b-q7-reopening', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'Enterprise budgets are reopening faster than expected; consumers remain cautious.',
        truthReference: { field: 'macroPressure', value: 0.3, note: 'easing' },
      },
      ...shared(7, ['q7-ai-errors', 'q7-sla-disputes', 'q7-poaching', 'q7-accreditation', 'q7-complexity']),
    ],
    designNotes: ['Crisis families unchanged (destination-dependent); recovery led by enterprise.'],
  },
  {
    ...A(8),
    id: 'b-q8-final-decision',
    briefing:
      'Enterprise AI spending is at record levels and consumer learning is steady. The board asks what the company should ' +
      'become next: the options open to you depend on what you built.',
    demand: {
      consumerDemand: 0.93, consumerCommoditization: 0.25, consumerCacPressure: 1.03,
      enterpriseDemand: 1.32, enterpriseAIDemand: 1.75, universityDemand: 1.03, aiNativeDemand: 1.1, macroPressure: 0.05,
    },
    competitorProgress: { consumer: 1.1, enterprise: 1.0, credential: 0.5 },
    signals: [
      {
        id: 'b-q8-recovery', audience: 'all', topic: 'macro', reliability: 'headline',
        headline: 'Enterprise AI-learning budgets at record levels; self-paid consumer learning flat.',
        truthReference: { field: 'macroPressure', value: 0.05, note: 'recovered' },
      },
      ...shared(8, ['q8-investors', 'q8-consolidation', 'q8-board']),
    ],
    designNotes: ['Recovered, enterprise-led market.'],
  },
];
