/**
 * Q1–Q8 PRESENTATION CONTENT (Batch 7 · 7A)
 *
 * Plain-English framing of the frozen V2 scenario arc. Every card keeps the meaning and the uncertainty of the
 * authored scenario (engineV2Scenario) and never states hidden market truth: no demand indices, no competitor pace,
 * no "which strategy wins". Numbers quoted are the ones players were already shown (signal values and ranges).
 *
 * Simplification rules (documented in Notion):
 *  1. One idea per sentence; explain every business term the first time it is used.
 *  2. Keep every range as a range ("analysts expect 12–20% less"), never collapse it to a single number.
 *  3. Label where information comes from (Market News / Industry Estimate / Company Data).
 *  4. Name the decision as a question the team can answer.
 *  5. Never hint at the "right" answer or reveal how the engine will react.
 */
import type { V2ScenarioBriefingSignal } from '../../../simulation/engineV2Scenario';
import { mt, ModeText } from './modes';

export interface QuarterCard {
  quarter: number;
  stage: string;
  headline: ModeText;
  whatHappened: ModeText;
  whyItMatters: ModeText[];
  challenge: ModeText;
}

export const QUARTER_CARDS: Record<number, QuarterCard> = {
  1: {
    quarter: 1, stage: 'Year 1 · Q1',
    headline: mt('A calm market — and $30M to invest', 'Capital allocation under uncertainty'),
    whatHappened: mt(
      'Business is steady. Consumers keep subscribing, companies keep renewing their training contracts, and universities are stable. People are talking about AI tutors, but nobody is paying for them in large numbers yet. The board gives you up to $30M to invest.',
      'The learning market is healthy: consumer subscriptions are steady, enterprise renewals are on track and university partners are stable. Generative-AI tutoring is widely discussed but commercially unproven. The board authorizes up to $30M of strategic investment with no obvious winning segment.'),
    whyItMatters: [
      mt('Investments take one to three quarters to turn into real capability — what you fund now shapes the company you can be later.', 'Capability investments mature over 1–3 quarters, so Q1 allocation sets the option set for Q4 and beyond.'),
      mt('There is no clear winner yet, so every choice is a bet on how the market will change.', 'With no dominant signal, the allocation is an explicit thesis about where demand will move.'),
      mt('Money you do not invest stays in the bank as a safety cushion.', 'Unallocated envelope is retained as cash — optionality versus capability building.'),
    ],
    challenge: mt('Where should we invest our first $30M?', 'How do we allocate $30M to test our strategic thesis?'),
  },
  2: {
    quarter: 2, stage: 'Year 1 · Q2',
    headline: mt('AI tutors go mainstream overnight', 'Generative AI disruption'),
    whatHappened: mt(
      'Free AI assistants suddenly have more than 100 million users. Some people are using them instead of paying for learning apps, and it now costs more to win each new customer. Companies are asking how AI will change employee training, and AI-first learning products are getting a lot of attention.',
      'Consumer-grade generative AI reaches mass adoption within weeks. Free AI tutors undercut paid consumer learning, acquisition costs rise and differentiation erodes. Enterprises urgently ask how AI changes workforce learning; AI-native learning products see a surge of interest. Universities are cautious but stable.'),
    whyItMatters: [
      mt('Our biggest business (consumer subscriptions) may lose customers to free tools.', 'The core consumer franchise faces substitution and rising customer-acquisition cost (CAC).'),
      mt('Interest is not the same as paying customers — demand for AI products is still unproven.', 'Interest signals are leading indicators; willingness to pay for AI products is not yet established.'),
      mt('Building good AI features takes time, so waiting has a cost too.', 'AI capability compounds: delayed investment widens the gap to faster competitors.'),
    ],
    challenge: mt('Do we defend what we have, or move toward AI — and how fast?', 'How do we respond to the disruption: defend the core, pivot toward AI, or hedge?'),
  },
  3: {
    quarter: 3, stage: 'Year 1 · Q3',
    headline: mt('The evidence points in different directions', 'Conflicting evidence'),
    whatHappened: mt(
      'Fewer people are using our consumer app, but paying subscribers are staying more than the usage numbers suggest. Companies are asking for AI training proposals. People love our AI features, but nobody knows yet how much they will pay for them. Universities are renewing.',
      'Headline consumer usage is down sharply, yet paying cohorts look stickier than usage suggests. Enterprise AI-learning RFPs are rising; AI engagement is soaring with uncertain monetization. University renewals are strong.'),
    whyItMatters: [
      mt('Different numbers tell different stories — you must decide which evidence you trust.', 'Usage, revenue and engagement metrics diverge; the team must weigh signal quality, not just direction.'),
      mt('Strong interest in AI does not yet prove people will pay.', 'Engagement without proven willingness-to-pay is an option, not a revenue stream.'),
      mt('Next quarter you must commit to a long-term direction, so this is your last chance to prepare.', 'Q4 requires a destination commitment; Q3 is the last quarter to build readiness for it.'),
    ],
    challenge: mt('Which evidence do we believe, and what do we build before we commit?', 'Which signals do we act on, and which capabilities must be ready for the Q4 commitment?'),
  },
  4: {
    quarter: 4, stage: 'Year 1 · Q4',
    headline: mt('Time to choose what company we will become', 'Strategic commitment'),
    whatHappened: mt(
      'The board wants a clear direction. Choose one of five strategies: Consumer AI, Enterprise AI, Premium Human + AI, University/Credentials, or a Balanced marketplace. A clear choice focuses the company, but changing direction takes time and works best when you already have the right skills.',
      'The board requires a strategic commitment among five destinations. Commitment focuses the organization and unlocks specialized upside, but repositioning takes time and is most effective when Q1–Q3 capabilities support it.'),
    whyItMatters: [
      mt('Your choice decides which future opportunities and risks you face.', 'The destination shapes focus effects, market access, crisis exposure and Q8 options.'),
      mt('If your skills do not match the strategy, the change will be slow and tiring for your people.', 'Low readiness means a longer, more load-heavy transition.'),
      mt('This choice cannot be changed later in the game.', 'The commitment is irreversible within the game horizon.'),
    ],
    challenge: mt('Which strategy fits what we have built — and what we believe about the market?', 'Which destination best fits our capabilities and our market thesis?'),
  },
  5: {
    quarter: 5, stage: 'Year 2 · Q5',
    headline: mt('A huge client offers a $48M-a-year deal', 'Major growth opportunity'),
    whatHappened: mt(
      'A Fortune-100 company wants us to run an AI learning programme in 40 countries. It would be our biggest contract ever, with strict service promises. Saying yes ties up cash, people and product work for about three quarters. Meanwhile, some signs suggest the economy is slowing.',
      'A Fortune-100 client offers a $48M ACV global AI-learning contract with strict SLAs, localisation, customization and a dedicated delivery team — the largest in company history. Acceptance commits cash, people and roadmap for three quarters. Leading macro indicators are softening.'),
    whyItMatters: [
      mt('Signed contracts are steadier income if the economy weakens.', 'Contracted revenue is more resilient than discretionary spend in a downturn.'),
      mt('Delivering it costs money upfront and puts heavy pressure on our people and product team.', 'Upfront cost, delivery overhead, change load and roadmap diversion are real and immediate.'),
      mt('If it does not fit our chosen strategy, it can pull us off course.', 'An off-strategy contract dilutes destination focus.'),
    ],
    challenge: mt('Do we accept the contract or decline it?', 'Accept or decline the global contract — and how do we resource it?'),
  },
  6: {
    quarter: 6, stage: 'Year 2 · Q6',
    headline: mt('Recession: customers and companies cut spending', 'Recession and resource constraint'),
    whatHappened: mt(
      'A real recession has started. Households cancel subscriptions, companies freeze training budgets, and buyers slow down AI purchases — even though AI could help them save money. Universities are holding steady. The board asks how you will protect the company.',
      'A genuine downturn arrives: households cut discretionary subscriptions, enterprises freeze discretionary training, and AI purchasing slows even as productivity pressure rises. Universities are comparatively steady. The board asks for a protection plan.'),
    whyItMatters: [
      mt('Less money will come in for the next few quarters.', 'Revenue will likely run below plan for two quarters.'),
      mt('Cutting jobs saves money now but hurts skills and morale for months.', 'Workforce reductions save cost but carry lasting talent, culture and capacity damage.'),
      mt('Borrowing gets harder and more expensive.', 'Credit is tightening and equity valuations are down.'),
    ],
    challenge: mt('How do we protect the company without destroying what we built?', 'What is our recession response: cut, protect, reprice, refinance — or invest through the cycle?'),
  },
  7: {
    quarter: 7, stage: 'Year 2 · Q7',
    headline: mt('A crisis linked to our strategy hits', 'Strategy-dependent crisis'),
    whatHappened: mt(
      'The economy is beginning to recover, but customers are still cautious. Your company now faces a serious problem connected to the strategy you chose. How badly it hurts depends on how strong the company you built is.',
      'The recession is easing but not over. Each strategy has its own fragility, and the company now meets the crisis its strategy invites. Severity depends on the capabilities built.'),
    whyItMatters: [
      mt('Every strategy has a weak spot — this is yours.', 'Strategy-specific fragility: the crisis type follows the destination.'),
      mt('Fixing the problem properly costs money now; ignoring it can cost much more later.', 'Remediation trades near-term cash for limiting longer-term damage to trust and revenue.'),
      mt('How you respond shows customers and employees what the company stands for.', 'Crisis handling feeds trust, retention and adaptability.'),
    ],
    challenge: mt('How do we respond to the crisis?', 'What is the right crisis response given our cash, capabilities and exposure?'),
  },
  8: {
    quarter: 8, stage: 'Year 2 · Q8',
    headline: mt('Recovery — what should we become next?', 'Final strategic decision'),
    whatHappened: mt(
      'The economy is recovering. Companies are spending again and consumers are steadier. Investors are interested in AI learning companies. The board asks for your final big decision — but which options you have depends on what you built.',
      'Recovery is under way: enterprise budgets are reopening and consumer spending is stabilising. Growth investors are returning; weakened competitors are available. The final options depend on the company built.'),
    whyItMatters: [
      mt('Only some options are open to you — they reflect your cash, profits and organization.', 'Option availability is earned from cash, margin, execution, capacity and strategic value.'),
      mt('Bigger moves bring bigger rewards and bigger risks.', 'Scale, raise, acquire and sell each carry distinct risk/return and integration load.'),
      mt('This decision is how the board will remember your leadership.', 'The Q8 choice and its consequences feed the terminal evaluation.'),
    ],
    challenge: mt('What should the company do next?', 'Which earned option creates the most durable value?'),
  },
};

/** Evidence categories shown to players (Batch 7 · 7A-B). */
export type EvidenceKind = 'market-news' | 'industry-estimate' | 'company-data';
export const EVIDENCE_LABEL: Record<EvidenceKind, { title: string; meaning: string }> = {
  'market-news': { title: 'Market News', meaning: 'What people are reporting — may overstate.' },
  'industry-estimate': { title: 'Industry Estimate', meaning: 'What analysts believe may happen — a range, not a fact.' },
  'company-data': { title: 'Company Data', meaning: 'What our company actually measured last quarter.' },
};

export function evidenceKind(reliability: V2ScenarioBriefingSignal['reliability'] | 'measured'): EvidenceKind {
  if (reliability === 'measured') return 'company-data';
  if (reliability === 'estimate') return 'industry-estimate';
  return 'market-news'; // headline and lagging reports
}

/** Plain-English rewrites of scenario signals for undergraduate mode (same facts, same ranges). */
export const SIGNAL_PLAIN: Record<string, string> = {
  'q1-consumer-steady': 'Consumer subscriptions are steady, growing about as fast as last year.',
  'q1-enterprise-renewing': 'Companies are keeping their training budgets about the same and renewing contracts.',
  'q1-ai-chatter': 'AI tutoring demos are popular, but it is not yet clear that people will pay for them.',
  'q1-university-stable': 'University partners expect stable enrolment and plan to renew.',
  'q1-competition': 'Competitors are investing steadily; no disruptive newcomer yet.',
  'q2-ai-disruption': 'Consumer AI assistants pass 100 million users; AI tutoring app downloads up about 70% in one quarter.',
  'q2-consumer-conversion': 'Fewer free users are becoming paying customers; analysts expect consumer demand to fall 4–12%.',
  'q2-consumer-cac': 'Winning each new customer costs about 20% more as AI apps compete for the same people.',
  'q2-enterprise-interest': 'Company training leaders report 30%+ more interest in AI skills programmes — but have not moved budgets yet.',
  'q2-university': 'Universities are debating AI rules; they still plan to renew.',
  'q2-competition': 'Well-funded AI start-ups are launching consumer learning products quickly.',
  'q2-product-readiness': 'Our engineers estimate it takes 2–3 quarters of steady investment to ship credible AI features.',
  'q3-consumer-usage': 'Monthly active learners on our consumer app fell 11%; time in the app fell 15%.',
  'q3-consumer-paid-cohorts': 'Our finance team estimates revenue from paying subscribers fell only 2–5% — much less than usage.',
  'q3-enterprise-rfps': 'Companies are sending about 25% more requests for AI learning proposals; buying decisions are still slow.',
  'q3-ai-engagement': 'Use of our AI features is up 45%; sessions per user have doubled.',
  'q3-ai-wtp': 'Nobody knows how many AI tutor users will pay: estimates range from 5% to 20%.',
  'q3-university': 'University renewals are strong; three partners are expanding credential programmes.',
  'q3-competition': 'Consumer AI start-ups are merging; fewer new launches.',
  'q3-people-strain': 'Rivals are offering our AI engineers 30–40% more pay; the risk of losing people is rising.',
  'q4-market-settling': 'The market is settling: AI is now expected everywhere — the question is where to win.',
  'q4-board': 'The board: "We will back a clear direction. Half-commitments will not get funded beyond this year."',
  'q4-readiness': 'Engineers: switching to a strategy our skills do not support would take 2–4 quarters.',
  'q4-org-load': 'People team: a big reorganization adds a lot of pressure on staff for about 2–3 quarters.',
  'q5-global-contract': 'A Fortune-100 client offers a $48M-a-year global AI learning contract, live in 40 countries within three quarters.',
  'q5-contract-cfo': 'Finance: $6–11M upfront to set it up and customize, about $1.5M per quarter for a delivery team, and penalties if we miss service promises.',
  'q5-contract-product': 'Engineers: the client would take 20–40% of our AI/product team’s time for three quarters — unless that is already our main direction.',
  'q5-contract-people': 'People team: delivering it puts heavy pressure on staff for 2–3 quarters — less if enterprise delivery is already our focus.',
  'q5-macro-early': 'Economists see a 30–50% chance of a downturn within two quarters; signed contracts usually hold up better than optional spending.',
  'q5-consumer': 'The consumer market is stabilising; customers now expect AI features as standard.',
  'q6-recession': 'Recession confirmed: the economy shrank two quarters in a row; consumer confidence is at a ten-year low.',
  'q6-consumer': 'Consumer spending on learning is expected to fall 12–20%; more people want discounts.',
  'q6-enterprise': 'Companies freeze optional training; essential programmes and AI productivity projects continue.',
  'q6-ai': 'AI buyers are split: new deals expected 10–30% lower, while productivity uses grow.',
  'q6-university': 'University partners keep their budgets; more people may study for credentials in a recession.',
  'q6-cfo': 'Finance: revenue likely 3–8% below plan for two quarters; lenders are stricter; company valuations are down.',
  'q6-people': 'Layoffs across the sector; deep cuts usually make good people leave for 2–3 quarters afterwards.',
  'q6-competition': 'Competitors are cutting too; several AI start-ups paused launches.',
  'q7-easing': 'Economists think the downturn is bottoming out; consumers are still nervous.',
  'q7-ai-errors': 'A rival AI tutor’s viral mistake triggers refund requests across consumer learning apps.',
  'q7-sla-disputes': 'Business clients are enforcing service-level penalties and cutting suppliers after reliability problems.',
  'q7-poaching': 'Recovering competitors are hiring away senior experts with 30%+ pay rises.',
  'q7-accreditation': 'Accreditation bodies will review the integrity of AI-assisted assessments.',
  'q7-complexity': 'Last quarter, product launches slipped and more problems were escalated between teams.',
  'q8-recovery': 'Recovery under way: company training budgets reopening; consumer spending stabilising.',
  'q8-investors': 'Growth investors are returning to AI learning companies with momentum; valuations are still below their peak.',
  'q8-consolidation': 'Weakened competitors are for sale at 1.5–2× their yearly revenue; several large buyers are looking at the sector.',
  'q8-board': 'The board: "Tell us what this company should become next — and whether we can afford it."',
};
