/**
 * LEADERSHIP DISCUSSION & STRUCTURED REFLECTION CONTENT (Batch 7 · 7A-D/E)
 *
 * Beliefs and risks are reflection inputs only. They are stored with the team's deliberation and never reach the
 * engine (the economic input type has no field for them).
 */
import { mt, ModeText } from './modes';

export interface Choice { id: string; label: ModeText }

export const BELIEFS: Record<number, Choice[]> = {
  1: [
    { id: 'q1-core-stable', label: mt('Our current customers will stay strong — keep building the core business.', 'The core consumer and enterprise franchises remain the primary value drivers.') },
    { id: 'q1-ai-shift', label: mt('AI will change learning soon — start building AI skills early.', 'AI will reshape learning within a few quarters; early capability building pays off.') },
    { id: 'q1-enterprise', label: mt('Companies training their staff are our best growth opportunity.', 'Enterprise L&D is the most attractive growth vector.') },
    { id: 'q1-people-first', label: mt('Strong people and culture will matter most whatever happens.', 'Talent and organizational capacity are the binding constraint on any strategy.') },
    { id: 'q1-optionality', label: mt('It is too early to know — keep options open and cash in reserve.', 'Uncertainty is high; preserve optionality and liquidity.') },
  ],
  2: [
    { id: 'q2-defend-core', label: mt('The AI hype will fade — defend our consumer business.', 'Disruption is overstated; defend the consumer franchise.') },
    { id: 'q2-ai-real', label: mt('AI disruption is real and permanent — we must move toward AI now.', 'The shift is structural; pivot investment toward AI products now.') },
    { id: 'q2-enterprise-ai', label: mt('The real money is companies retraining their staff for AI.', 'Enterprise AI upskilling is the monetizable opportunity.') },
    { id: 'q2-wait-evidence', label: mt('Interest is high but payment is unproven — wait for better evidence.', 'Willingness to pay is unproven; stage investment until evidence improves.') },
    { id: 'q2-hedge', label: mt('No one knows — spread our bets across several areas.', 'Hedge across segments until the market shape is clearer.') },
  ],
  3: [
    { id: 'q3-paid-sticky', label: mt('Paying customers are loyal — the usage drop is less serious than it looks.', 'Paid cohorts are resilient; usage decline overstates revenue risk.') },
    { id: 'q3-consumer-decline', label: mt('The consumer business is in real decline — shift away from it.', 'Consumer decline is structural; reallocate away from it.') },
    { id: 'q3-enterprise-demand', label: mt('Company requests for proposals show real enterprise demand.', 'RFP volume signals genuine enterprise AI demand.') },
    { id: 'q3-ai-monetizes', label: mt('High AI engagement will turn into paying customers.', 'AI engagement will convert into revenue.') },
    { id: 'q3-prepare-commitment', label: mt('Our priority is getting ready for next quarter’s big commitment.', 'Build readiness for the Q4 2023 destination commitment.') },
  ],
  4: [
    { id: 'q4-fit-capabilities', label: mt('We should choose the strategy our skills already support.', 'Choose the destination our capabilities already support.') },
    { id: 'q4-market-size', label: mt('We should choose the biggest market, even if we are not fully ready.', 'Choose the largest opportunity even with a readiness gap.') },
    { id: 'q4-differentiate', label: mt('We should choose where we can be clearly different from competitors.', 'Choose the destination with the most defensible differentiation.') },
    { id: 'q4-resilience', label: mt('We should choose the strategy that will survive a downturn best.', 'Choose the most resilient destination given macro risk.') },
  ],
  5: [
    { id: 'q5-contract-growth', label: mt('The contract will make us stronger and protect us in a downturn.', 'Contracted revenue de-risks a downturn and builds enterprise scale.') },
    { id: 'q5-contract-distraction', label: mt('The contract would distract us from our strategy.', 'The contract dilutes focus and diverts scarce capacity.') },
    { id: 'q5-capacity-limit', label: mt('Our people cannot take on that much extra work right now.', 'Organizational capacity is the binding constraint.') },
    { id: 'q5-downturn-coming', label: mt('A downturn is coming — protect cash above everything.', 'Macro risk dominates; preserve liquidity.') },
  ],
  6: [
    { id: 'q6-short-recession', label: mt('The recession will be short — keep investing through it.', 'The downturn is temporary; invest through the cycle.') },
    { id: 'q6-cash-first', label: mt('Cash is king — cut costs to survive.', 'Liquidity is paramount; reduce cost to protect runway.') },
    { id: 'q6-protect-capability', label: mt('Cutting skilled people would hurt us more than the recession.', 'Capability destruction from cuts outweighs near-term savings.') },
    { id: 'q6-ai-productivity', label: mt('Customers will still buy AI that saves them money.', 'Productivity-driven AI demand will hold up.') },
  ],
  7: [
    { id: 'q7-fix-properly', label: mt('Fixing the problem properly now will protect trust long-term.', 'Full remediation protects long-term trust and revenue.') },
    { id: 'q7-contain-cost', label: mt('We can contain the damage without spending too much.', 'Containment balances cost and damage.') },
    { id: 'q7-cash-tight', label: mt('We cannot afford a big fix — we must absorb it.', 'Liquidity constraints force absorption.') },
    { id: 'q7-recovery-soon', label: mt('The recovery will help us get past this quickly.', 'Macro recovery will offset crisis damage.') },
  ],
  8: [
    { id: 'q8-scale', label: mt('We are strong enough to grow faster on our own.', 'The company can self-fund accelerated growth.') },
    { id: 'q8-outside-capital', label: mt('Outside money or partners would help us grow.', 'External capital or combination creates more value.') },
    { id: 'q8-stabilize', label: mt('We need to repair the company before growing again.', 'Stabilization must precede growth.') },
    { id: 'q8-stay-course', label: mt('Our current plan is working — keep going.', 'The current strategy is delivering; continue.') },
  ],
};

export const RISKS: Record<number, Choice[]> = {
  1: [
    { id: 'misread-market', label: mt('We misread where the market is going', 'Thesis risk: demand shifts elsewhere') },
    { id: 'too-slow-ai', label: mt('We are too slow on AI', 'Falling behind on AI capability') },
    { id: 'spread-thin', label: mt('We spread our money too thin', 'Diluted investment without critical mass') },
    { id: 'cash', label: mt('We run short of cash', 'Liquidity risk') },
    { id: 'execution', label: mt('Our teams cannot deliver everything', 'Execution and capacity risk') },
    { id: 'competition', label: mt('Competitors move faster', 'Competitive response risk') },
  ],
  2: [
    { id: 'consumer-loss', label: mt('We lose consumer subscribers to free AI', 'Consumer substitution and churn') },
    { id: 'ai-unproven', label: mt('AI demand does not turn into paying customers', 'AI monetization risk') },
    { id: 'cac', label: mt('Winning new customers gets too expensive', 'Rising CAC erodes unit economics') },
    { id: 'too-slow-ai', label: mt('We are too slow on AI', 'Capability gap vs AI-native entrants') },
    { id: 'execution', label: mt('Our teams cannot deliver everything', 'Execution and capacity risk') },
    { id: 'cash', label: mt('We run short of cash', 'Liquidity risk') },
  ],
  3: [
    { id: 'wrong-evidence', label: mt('We trust the wrong evidence', 'Signal-selection risk') },
    { id: 'consumer-loss', label: mt('The consumer decline is worse than it looks', 'Consumer revenue erosion') },
    { id: 'ai-unproven', label: mt('AI users will not pay', 'AI monetization risk') },
    { id: 'talent-loss', label: mt('We lose key engineers to rivals', 'Talent attrition') },
    { id: 'not-ready', label: mt('We are not ready for next quarter’s commitment', 'Readiness gap for the Q4 2023 commitment') },
    { id: 'cash', label: mt('We run short of cash', 'Liquidity risk') },
  ],
  4: [
    { id: 'readiness-gap', label: mt('Our skills do not fit the strategy', 'Capability–destination readiness gap') },
    { id: 'transition-load', label: mt('The change exhausts our people', 'Transition load and culture strain') },
    { id: 'wrong-bet', label: mt('We pick the wrong market', 'Destination thesis risk') },
    { id: 'strategy-crisis', label: mt('Our strategy has a weak spot that gets exposed', 'Strategy-specific fragility') },
    { id: 'competition', label: mt('Competitors win the same customers', 'Competitive intensity in chosen focus') },
    { id: 'cash', label: mt('We run short of cash', 'Liquidity risk') },
  ],
  5: [
    { id: 'delivery-failure', label: mt('We fail to deliver and pay penalties', 'SLA delivery risk') },
    { id: 'overload', label: mt('Our people are overloaded', 'Organizational overload') },
    { id: 'roadmap', label: mt('Our product plans get pushed aside', 'Roadmap diversion') },
    { id: 'downturn', label: mt('A downturn hits our revenue', 'Macro downturn exposure') },
    { id: 'concentration', label: mt('We depend too much on one client', 'Client concentration') },
    { id: 'missed-growth', label: mt('We miss a big growth chance', 'Opportunity cost of declining') },
  ],
  6: [
    { id: 'cash', label: mt('We run out of cash', 'Insolvency risk') },
    { id: 'talent-loss', label: mt('Cuts make our best people leave', 'Regretted attrition after cuts') },
    { id: 'demand-drop', label: mt('Customers cut spending more than expected', 'Demand shock deeper than expected') },
    { id: 'price-war', label: mt('Discounting damages our pricing', 'Pricing power erosion') },
    { id: 'underinvest', label: mt('We cut so deep we cannot grow after the recession', 'Under-investment into the recovery') },
    { id: 'debt', label: mt('Borrowing becomes a burden', 'Leverage and interest burden') },
  ],
  7: [
    { id: 'trust-damage', label: mt('Customers lose trust in us', 'Trust and retention damage') },
    { id: 'cash', label: mt('The fix costs more than we can afford', 'Liquidity strain from remediation') },
    { id: 'repeat', label: mt('The problem happens again', 'Recurrence / aftershocks') },
    { id: 'talent-loss', label: mt('Key people leave', 'Talent attrition') },
    { id: 'revenue-loss', label: mt('We lose important customers', 'Revenue loss in the exposed segment') },
    { id: 'distraction', label: mt('The crisis distracts from the recovery', 'Management distraction') },
  ],
  8: [
    { id: 'overreach', label: mt('We take on more than we can handle', 'Overreach / integration risk') },
    { id: 'dilution', label: mt('We give away too much ownership', 'Dilution') },
    { id: 'cash', label: mt('We run short of cash', 'Liquidity risk') },
    { id: 'lose-momentum', label: mt('We lose momentum by being too cautious', 'Under-ambition') },
    { id: 'culture', label: mt('Our culture suffers from big changes', 'Culture and capacity strain') },
    { id: 'undervalued', label: mt('We sell the company too cheaply', 'Value leakage in a sale') },
  ],
};

export const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Low' },
  { value: 3, label: 'Medium' },
  { value: 5, label: 'High' },
] as const;

/** Structured reflection options (Batch 7 · 7A-E). */
export const LEARNING_OPTIONS: Choice[] = [
  { id: 'correct', label: mt('Our prediction was broadly correct') },
  { id: 'time', label: mt('We underestimated the time required') },
  { id: 'market', label: mt('We misunderstood the market') },
  { id: 'execution', label: mt('Execution was harder than expected') },
  { id: 'info', label: mt('We need more information') },
  { id: 'valid', label: mt('Our strategy remains valid') },
];

export const beliefLabel = (q: number, id?: string) => BELIEFS[q]?.find(b => b.id === id)?.label;
export const riskLabel = (q: number, id: string) => RISKS[q]?.find(r => r.id === id)?.label;

/** Structured reflection stored in the existing reflection text column (JSON, versioned; plain text still readable). */
export interface StructuredReflection { v: 1; learning: string[]; note?: string }
export function encodeReflection(r: StructuredReflection): string { return JSON.stringify(r); }
export function decodeReflection(text: string | null | undefined): StructuredReflection | null {
  if (!text) return null;
  try {
    const o = JSON.parse(text);
    if (o && o.v === 1 && Array.isArray(o.learning)) return o as StructuredReflection;
  } catch { /* legacy free text */ }
  return { v: 1, learning: [], note: text };
}

/** Which recorded results are relevant to a belief (used by the structured reflection's "What happened"). */
export type BeliefTopic = 'consumer' | 'enterprise' | 'ai' | 'people' | 'cash' | 'university' | 'strategy' | 'revenue';
export const BELIEF_TOPICS: Record<string, BeliefTopic[]> = {
  'q1-core-stable': ['consumer', 'enterprise'], 'q1-ai-shift': ['ai'], 'q1-enterprise': ['enterprise'], 'q1-people-first': ['people'], 'q1-optionality': ['cash', 'revenue'],
  'q2-defend-core': ['consumer'], 'q2-ai-real': ['ai'], 'q2-enterprise-ai': ['enterprise', 'ai'], 'q2-wait-evidence': ['ai', 'cash'], 'q2-hedge': ['revenue', 'cash'],
  'q3-paid-sticky': ['consumer'], 'q3-consumer-decline': ['consumer'], 'q3-enterprise-demand': ['enterprise'], 'q3-ai-monetizes': ['ai'], 'q3-prepare-commitment': ['strategy'],
  'q4-fit-capabilities': ['strategy', 'people'], 'q4-market-size': ['strategy', 'revenue'], 'q4-differentiate': ['strategy', 'revenue'], 'q4-resilience': ['strategy', 'cash'],
  'q5-contract-growth': ['enterprise', 'cash'], 'q5-contract-distraction': ['strategy', 'people'], 'q5-capacity-limit': ['people'], 'q5-downturn-coming': ['cash'],
  'q6-short-recession': ['revenue', 'cash'], 'q6-cash-first': ['cash'], 'q6-protect-capability': ['people'], 'q6-ai-productivity': ['ai'],
  'q7-fix-properly': ['consumer', 'enterprise'], 'q7-contain-cost': ['cash'], 'q7-cash-tight': ['cash'], 'q7-recovery-soon': ['revenue'],
  'q8-scale': ['revenue', 'cash'], 'q8-outside-capital': ['cash'], 'q8-stabilize': ['cash', 'people'], 'q8-stay-course': ['revenue'],
};
