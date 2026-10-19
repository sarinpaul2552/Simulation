/**
 * STAGE 4B STUDENT EXPERIENCE CONTENT (v3-econ-1.1 games only — see usesStage4Experience in ../engine.ts)
 *
 * Plain-English text for the redesigned journey. Nothing here calculates economics: every statement about what a
 * choice does restates the engine's own mechanics (engineV3Destination, engineV3Opportunity, engineV3Final,
 * engineV3Crisis), and every figure shown next to it is read from the engine at render time.
 */
import type { V2DestinationId } from '../../../simulationV3/engineV3Destination';
import { V2_DESTINATION_CALIBRATION } from '../../../simulationV3/engineV3Destination';

/** Three questions asked of every major decision. */
export interface DecisionGuide { deciding: string; improve: string; risk: string }

// ---------------------------------------------------------------- Meet your company

export interface BusinessPart {
  id: 'consumer' | 'enterprise' | 'university' | 'ai' | 'people';
  name: string;
  what: string;
  examples: string;
  builtBy: string;
}

export const BUSINESS_PARTS: BusinessPart[] = [
  { id: 'consumer', name: 'Consumer', what: 'Individual learners pay a monthly subscription for courses and practice.', examples: 'Duolingo Super, Coursera Plus, MasterClass', builtBy: 'Consumer growth' },
  { id: 'enterprise', name: 'Enterprise', what: 'Companies buy multi-year training contracts for their employees, supported by sales and customer success teams.', examples: 'LinkedIn Learning or Udemy Business sold to employers', builtBy: 'Enterprise sales & Customer Success' },
  { id: 'university', name: 'University', what: 'Universities license the platform and award recognised credentials. Slow to win, but contracts renew.', examples: 'online degree and certificate programmes run with universities on edX or Coursera', builtBy: 'University & Credentials' },
  { id: 'ai', name: 'AI', what: 'AI tutoring and AI-native products. Small today, and the fastest-moving part of the market.', examples: 'AI tutors such as Khanmigo or Duolingo Max', builtBy: 'AI / Product' },
  { id: 'people', name: 'People', what: 'The experts, engineers and managers who build and deliver everything. Their talent, culture and capacity limit how much change the company can absorb.', examples: 'the teaching and engineering staff behind any of the services above', builtBy: 'People & Talent' },
];

export const EXAMPLES_DISCLAIMER = 'Examples are illustrative comparisons to familiar services. They are not NexLearn’s business model, partners or affiliates. NexLearn is a fictional company.';

// ---------------------------------------------------------------- Q4 strategic choices

const T = V2_DESTINATION_CALIBRATION;
const ceil = T.specializationCeiling;
const loadCut = Math.round(T.alignedLoadReductionAtFullStrength * 100);
const commercial = Math.round(T.commercializationAtFullStrength * 100);

export const DESTINATION_GUIDE: Record<V2DestinationId, { means: string; help: string; risk: string }> = {
  'consumer-ai': {
    means: 'Focus on individual learners and AI products: Consumer growth and AI / Product become the core.',
    help: `Up to ${loadCut}% less workload on Consumer and AI work, those capabilities can grow to ${ceil}, more consumer and AI customers within reach, and up to +${commercial}% stronger consumer returns.`,
    risk: 'Exposed to subscriber churn, brand damage and cheaper or free AI rivals. Enterprise and university work gets no focus benefit.',
  },
  'enterprise-ai': {
    means: 'Focus on companies as customers, with AI inside the product: Enterprise sales, Customer Success and AI / Product become the core.',
    help: `Up to ${loadCut}% less workload on Enterprise and AI work, enterprise, AI and Customer Success can grow to ${ceil}, more enterprise customers within reach, and up to +${commercial}% stronger enterprise returns.`,
    risk: 'Slower to build. Exposed to heavy implementation work and to depending on a few large clients.',
  },
  'premium-human-ai': {
    means: 'A premium service where expert people are supported by AI: People & Talent and AI / Product become the core.',
    help: `Up to ${loadCut}% less workload on People and AI work, talent, product quality and trust can grow to ${ceil}, and up to +${commercial}% stronger premium returns.`,
    risk: 'Exposed to capacity limits, dependence on scarce experts and a high cost base.',
  },
  'university-infrastructure': {
    means: 'Become the platform universities run credentials on: University & Credentials becomes the core.',
    help: `Up to ${loadCut}% less workload on University work, credential capability and trust can grow to ${ceil}, many more universities within reach, and up to +${commercial}% stronger university returns.`,
    risk: 'Slow and sticky. Exposed to a few large institutions and to accreditation rules.',
  },
  'balanced-marketplace': {
    means: 'Stay diversified across all four businesses, with no single focus.',
    help: 'Keeps options open and spreads risk across consumer, enterprise, university and AI customers.',
    risk: 'No workload, ceiling or market-reach benefits, and coordinating every front at once stays hard.',
  },
};

export const DESTINATION_COMMON_RISK = `Every commitment adds transition work for three quarters: up to ${T.maxTransitionLoad} workload points a quarter, more when readiness is low. Benefits phase in as readiness and strength build.`;

export function readinessLabel(pct: number): { text: string; tone: 'good' | 'caution' | 'bad' } {
  if (pct >= 70) return { text: 'Strong', tone: 'good' };
  if (pct >= 40) return { text: 'Partial', tone: 'caution' };
  return { text: 'Low', tone: 'bad' };
}

// ---------------------------------------------------------------- decision guides

export const ALLOCATION_GUIDE: DecisionGuide = {
  deciding: 'How to split the budget across five areas, and how much to keep as cash.',
  improve: 'The capabilities you fund, over one to three quarters; returns are not guaranteed.',
  risk: 'Too many initiatives overload the teams; spending near a ceiling adds little; less cash for a bad quarter.',
};

export const FINANCING_GUIDE: DecisionGuide = {
  deciding: 'Whether to borrow, sell new shares, bring in a strategic partner, repay debt or restructure.',
  improve: 'Cash now: it can close a shortfall or, in some quarters, fund a larger investment budget.',
  risk: 'Debt costs interest and limits future borrowing; new shares dilute the owners; a partner takes a stake and a share of revenue.',
};

export const EVENT_GUIDE: Record<number, DecisionGuide> = {
  4: {
    deciding: 'The company’s strategy for the rest of the game. It cannot be changed later.',
    improve: 'Focused strategies reduce workload in their core areas, let core capabilities grow past 100 and widen the reachable market.',
    risk: 'Low readiness means heavy transition work and slow benefits. Each strategy is exposed to its own risks.',
  },
  5: {
    deciding: 'Whether to accept a large contract offered to the company.',
    improve: 'New contract revenue every year, references and pipeline.',
    risk: 'Its upfront cost is taken from this quarter’s budget; delivery costs, extra workload and, if off strategy, diverted product time and lost focus.',
  },
  6: {
    deciding: 'How to steer through the recession: protect investment, slow it, or cut costs.',
    improve: 'Protecting keeps capabilities building; slowing keeps cash; cutting lowers costs.',
    risk: 'Protecting uses cash in a downturn; cuts damage culture, capacity and customers.',
  },
  7: {
    deciding: 'How to respond to the crisis: remediate, contain or absorb.',
    improve: 'Responding properly limits lasting damage to customers, trust and capability.',
    risk: 'Remediation costs cash and workload now; absorbing costs nothing now but more damage later.',
  },
  8: {
    deciding: 'The company’s final strategic move. Only options the company has earned are available.',
    improve: 'A larger budget, new capital, an acquisition or a sale, depending on the option.',
    risk: 'Each option has conditions and costs; a sale ends independent operation. Locked options show why.',
  },
};

/** One line per Q8 option: what it means. Terms and lock reasons come from the engine. */
export const FINAL_GUIDE: Record<string, string> = {
  'continue': 'Carry on with the current plan and the normal budget.',
  'scale-independently': 'Invest a larger, self-funded budget.',
  'raise-growth-capital': 'Sell new shares to raise money and invest a larger budget; the owners are diluted.',
  'acquire-consolidate': 'Buy a business in your focus segment: it adds revenue, cost and integration work.',
  'strategic-sale': 'Sell the company to a strategic buyer at the offered price.',
  'stabilize-restructure': 'A recovery plan for a company under strain: lasting savings and a lower interest rate, with investment capped.',
};

export const PACE_NOTE = 'Aim for about 6 minutes this quarter: 2–3 to read, 3–4 to discuss.';

// ---------------------------------------------------------------- career metrics (final report)

export interface CareerMetric {
  id: string;
  name: string;
  meaning: string;
  why: string;
  roles: string;
  how: string;
}

export const CAREER_METRICS: CareerMetric[] = [
  { id: 'revenue', name: 'Revenue', meaning: 'Money earned from customers in a period.', why: 'The size of the business and whether customers want what it sells.', roles: 'CEO, sales, finance, investors', how: 'Quarterly revenue from the four businesses, recorded each quarter.' },
  { id: 'operating-profit', name: 'Operating profit and margin', meaning: 'Revenue minus the costs of running the business; margin is that profit as a share of revenue.', why: 'Shows whether growth pays for itself.', roles: 'CFO, general managers, analysts', how: 'Quarterly revenue minus operating costs, before strategic investment and financing.' },
  { id: 'cash', name: 'Cash and runway', meaning: 'Money in the bank, and how many quarters it lasts at the current burn.', why: 'Companies fail when they run out of cash, even when profitable on paper.', roles: 'CFO, treasurers, founders, lenders', how: 'Closing cash each quarter; runway from last quarter’s net cash flow. Below $15M the company is short of the minimum it needs to operate.' },
  { id: 'fcf', name: 'Free cash flow', meaning: 'Cash generated after running the business and investing in it.', why: 'What a business can use to grow, repay debt or return to owners.', roles: 'CFO, investors, private equity', how: 'Operating profit minus strategic investment and one-off costs, before acquisitions and financing.' },
  { id: 'leverage', name: 'Debt and leverage', meaning: 'Money borrowed, and how large it is compared with annual profit.', why: 'Debt can fund growth but adds interest and risk when profit falls.', roles: 'CFO, bankers, credit analysts', how: 'Debt outstanding and net debt ÷ annualized operating profit; lenders’ covenants use it.' },
  { id: 'company-value', name: 'Company value', meaning: 'What the business is worth to its owners.', why: 'The board and investors judge leaders by the value they create.', roles: 'CEO, board, investors, corporate development', how: 'Engine valuation: annual revenue × a multiple set by growth, margin, AI readiness and strategy strength, plus cash minus debt, less any distress discount.' },
  { id: 'dilution', name: 'Ownership and dilution', meaning: 'The share of the company the original owners still hold.', why: 'Raising money by selling shares shrinks each owner’s slice.', roles: 'Founders, CFO, investors', how: 'Original shareholders’ ownership after any new shares or partner stake.' },
  { id: 'retention', name: 'Customer retention', meaning: 'The share of paying customers who stay.', why: 'Keeping customers is usually cheaper than winning new ones.', roles: 'Growth, marketing, customer success, product', how: 'Consumer paid retention (%) each quarter.' },
  { id: 'cac', name: 'Customer acquisition cost (CAC)', meaning: 'What it costs to win a new customer.', why: 'Growth is only valuable if customers are worth more than they cost to win.', roles: 'Growth, marketing, finance', how: 'An index, not a dollar figure: 100 = the cost at the start; above 100 means customers have become more expensive to win.' },
  { id: 'pipeline', name: 'Sales pipeline and win rate', meaning: 'The value of deals being negotiated, and the share that close.', why: 'Predicts future enterprise revenue.', roles: 'Sales leaders, CEO, finance', how: 'Enterprise qualified pipeline ($M) and enterprise win rate (%).' },
  { id: 'renewal', name: 'Renewal rate', meaning: 'The share of contracts that renew when they expire.', why: 'Renewals make revenue predictable.', roles: 'Account management, customer success', how: 'University renewal rate (%).' },
  { id: 'quality', name: 'Product quality and technical debt', meaning: 'How good and reliable the product is, and the backlog of shortcuts that slow future work.', why: 'Quality drives trust and retention; technical debt slows every later change.', roles: 'Product, engineering, CTO', how: 'Product Quality and Technical debt indices (0–100).' },
  { id: 'people', name: 'Talent, culture and capacity', meaning: 'The skills of the workforce, how well it works together, and how much change it can absorb.', why: 'Strategy fails when the organization cannot deliver it.', roles: 'HR, people leaders, COO, every manager', how: 'Talent, Culture and Organizational capacity indices, and workload compared with capacity.' },
];

export const NOT_MEASURED = [
  { name: 'Market share', note: 'NexLearn tracks your own customers and revenue, not your share of the whole market.' },
  { name: 'Employee productivity', note: 'NexLearn measures talent, culture and capacity, not output per employee.' },
  { name: 'Return on investment (ROI)', note: 'Investment builds capabilities that pay off over several quarters alongside market effects, so NexLearn does not calculate a return for each investment.' },
];
