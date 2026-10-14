/**
 * MARKET PATH C CONTENT — Economic Pressure (Batch 10D)
 *
 * Student-facing overrides for path C (src/simulationV3/engineV3PathC.ts). Q1 and Q4 framing is shared with path A and
 * is not repeated here; shared signal ids copied from path A keep their path A plain-language text.
 *
 * Rules are those of the path A files this overrides (chapters.ts, scenarioContent.ts, briefings.ts,
 * signalAssessments.ts): written only from the path's shared briefing and role signals; numbers quoted are the ones
 * players are shown and ranges stay ranges; briefs give competing readings, never an answer; the Q3 assessments restate
 * only the authored notes of this path and are shown after Q4 is completed.
 */
import type { V2Role } from '../../../simulation/engineV2Scenario';
import type { PathContent } from './paths';
import type { QuarterRoleBrief } from './briefings';
import { mt, ModeText } from './modes';

const b = (suggests: ModeText[], uncertain: ModeText[], discuss: [V2Role, ModeText][]): QuarterRoleBrief => ({ suggests, uncertain, discuss: discuss.map(([w, a]) => ({ with: w, ask: a })) });

export const PATH_C_CONTENT: PathContent = {
  chapters: {
    2: { quarter: 2, year: 1, title: 'Tightening', sub: mt('Money is getting tighter for customers and for us. Decide how to respond before anyone calls it a recession.', 'Rates rise, households tighten and employers review training budgets. Respond early, adapt or wait — with incomplete evidence.') },
    3: { quarter: 3, year: 1, title: 'Mixed signals', sub: mt('The evidence is conflicting. Usage looks calm, but some customers have stopped paying.', 'The evidence is conflicting: activity and payment tell different stories. Separate signal from noise before the board’s Q4 2023 deadline for a strategic direction.') },
    5: { quarter: 5, year: 2, title: 'The offer', sub: mt('A big client offers a tight-priced deal just as a downturn looks likely. Is it right for the company you are building?', 'A price-tight, multi-year contract appears as recession risk climbs. Weigh fit, capacity and cash against contracted revenue.') },
    6: { quarter: 6, year: 2, title: 'The deep recession', sub: mt('The recession is deep. Protect cash, protect people, or keep investing?', 'A deep recession tests your resilience: liquidity, cost structure and the capabilities you refuse to cut.') },
    7: { quarter: 7, year: 2, title: 'The long downturn', sub: mt('Recovery has not come yet, and your strategy creates a crisis. How you respond matters.', 'The downturn outlasts forecasts while your strategy creates its own crisis. The response trades cash against trust.') },
    8: { quarter: 8, year: 2, title: 'The final move', sub: mt('Recovery is only beginning. Make the final strategic decision with the company you built.', 'An early, partial recovery. Make the final strategic decision: the options open to you were earned over seven quarters.') },
  },

  quarterCards: {
    2: {
      quarter: 2, stage: 'Year 1 · Q2',
      headline: mt('Money gets tighter for everyone', 'Tightening conditions'),
      whatHappened: mt(
        'Interest rates have gone up again. Households have less to spend, and consumer confidence has fallen for a second quarter. Free AI study tools are spreading fast, mostly among people watching their money. Companies are reviewing their training budgets. More people are asking universities about career-change courses. Nobody is calling it a recession yet.',
        'Rates rise again; household budgets tighten and consumer confidence falls for a second quarter. Free AI study tools spread quickly among price-sensitive learners (AI tutoring downloads up about 40%). Employers are reviewing training budgets while some AI-productivity pilots continue. University partners report rising career-change enquiries. No one is calling it a recession yet.'),
      whyItMatters: [
        mt('Our biggest business (consumer subscriptions) depends on people choosing to spend money they now have less of.', 'The core consumer franchise is discretionary spend: cancellations rise as household budgets tighten.'),
        mt('Lots of downloads does not mean lots of paying customers — many people want the free version.', 'Download growth is a leading indicator of usage, not of willingness to pay; free tiers capture much of the interest.'),
        mt('Acting early could protect us or waste money; waiting keeps cash but may leave us slow if things get worse.', 'Early action builds resilience or capability ahead of clear evidence; waiting preserves cash and the option to respond once the direction is clearer.'),
      ],
      challenge: mt('How do we respond to tighter times — and how fast?', 'How do we position for tightening conditions: defend the core, adapt, or hold cash and wait?'),
    },
    3: {
      quarter: 3, stage: 'Year 1 · Q3',
      headline: mt('The evidence points in different directions', 'Conflicting evidence'),
      whatHappened: mt(
        'Use of our consumer app looks stable. But finance sees paying subscribers cancelling, mostly on monthly plans. Companies are sending more requests for proposals, but many are reviews of their current suppliers. People use our AI features a lot, mostly for free. Career-change courses are growing.',
        'Headline consumer usage looks stable, yet finance’s cohort analysis shows paying subscribers cancelling, concentrated in monthly plans. Enterprise RFPs are up, many of them cost-cutting reviews of existing suppliers. AI engagement is soaring, mostly on free tiers. Career-change credential enrolments are rising.'),
      whyItMatters: [
        mt('Different numbers tell different stories — you must decide which evidence you trust.', 'Usage, revenue and activity metrics diverge; the team must weigh signal quality, not just direction.'),
        mt('Busy activity — more requests, more AI use — is not the same as more paying customers.', 'Activity measures (RFP counts, free-tier engagement) are not demand; willingness to pay is not yet established.'),
        mt('Next quarter you must commit to a long-term direction, so this is your last chance to prepare.', 'Q4 2023 requires a destination commitment; Q3 2023 is the last quarter to build readiness for it.'),
      ],
      challenge: mt('Which evidence do we believe, and what do we build before we commit?', 'Which signals do we act on, and which capabilities must be ready for the Q4 2023 commitment?'),
    },
    5: {
      quarter: 5, stage: 'Year 2 · Q5',
      headline: mt('A retailer offers a $32M-a-year deal — at a tight price', 'Major growth opportunity'),
      whatHappened: mt(
        'A global retailer is cutting down its number of training suppliers to save money. It offers us a $32M-a-year contract. The condition: we must cut its training costs by a fifth. The price is tight, with strict service promises and a delivery team. But the revenue would be signed for years. Meanwhile, a downturn now looks likely.',
        'A global retailer consolidating its training suppliers offers a $32M ACV contract, conditional on cutting its training costs by a fifth. Terms are tight, with SLAs, penalties and a dedicated delivery team, but the revenue would be contracted for years. Economists now see a recession as likely.'),
      whyItMatters: [
        mt('Signed contracts are steadier income if the economy weakens.', 'Contracted revenue is more resilient than discretionary spend in a downturn.'),
        mt('The price is tight, so delivering it costs money upfront and leaves little room for mistakes.', 'Upfront cost, delivery overhead, SLA penalties and a thin price leave little margin for execution error.'),
        mt('If it does not fit our chosen strategy, it can pull us off course.', 'An off-strategy contract dilutes destination focus.'),
      ],
      challenge: mt('Do we accept the contract or decline it?', 'Accept or decline the consolidation contract — and how do we resource it?'),
    },
    6: {
      quarter: 6, stage: 'Year 2 · Q6',
      headline: mt('A deep recession: spending falls sharply', 'Deep recession'),
      whatHappened: mt(
        'The recession is deep. Unemployment is rising fast and consumer confidence is at a fifteen-year low. Households cancel subscriptions. Companies cut training budgets sharply; only programmes that save money survive. More people are retraining at universities, but university budgets are under pressure. Two competitors are restructuring. The board asks how you will protect the company.',
        'The recession is deep: unemployment is rising fast and consumer confidence is at a fifteen-year low. Households cancel subscriptions; enterprises cut training budgets sharply and only cost-saving programmes survive. Credential enrolments rise as people retrain, but university budgets are under pressure. Two competitors have entered restructuring. The board asks for a protection plan.'),
      whyItMatters: [
        mt('Less money will come in for the next few quarters.', 'Revenue will likely run below plan for two to three quarters.'),
        mt('Cutting jobs saves money now but can hurt skills and morale for months.', 'Workforce reductions save cost but carry lasting talent, culture and capacity damage.'),
        mt('Borrowing is hard and expensive, and the company is worth less to investors.', 'Credit markets are tight and valuations are down.'),
      ],
      challenge: mt('How do we protect the company without destroying what we built?', 'What is our recession response: cut, protect, reprice, refinance — or invest through the cycle?'),
    },
    7: {
      quarter: 7, stage: 'Year 2 · Q7',
      headline: mt('No recovery yet — and a crisis linked to our strategy', 'Prolonged downturn and strategy-dependent crisis'),
      whatHappened: mt(
        'Recovery has not come yet. The downturn is lasting longer than economists expected. Your company now faces a serious problem connected to the strategy you chose. How badly it hurts depends on how strong the company you built is.',
        'There is no recovery yet: the downturn is outlasting forecasts. Each strategy has its own fragility, and the company now meets the crisis its strategy invites. Severity depends on the capabilities built.'),
      whyItMatters: [
        mt('Every strategy has a weak spot — this is yours.', 'Strategy-specific fragility: the crisis type follows the destination.'),
        mt('Fixing the problem properly costs money at a time when money is tight.', 'Remediation trades scarce near-term cash for limiting longer-term damage to trust and revenue.'),
        mt('How you respond shows customers and employees what the company stands for.', 'Crisis handling feeds trust, retention and adaptability.'),
      ],
      challenge: mt('How do we respond to the crisis?', 'What is the right crisis response given our cash, capabilities and exposure?'),
    },
    8: {
      quarter: 8, stage: 'Year 2 · Q8',
      headline: mt('Early recovery — what should we become next?', 'Final strategic decision'),
      whatHappened: mt(
        'The first signs of recovery appear. But customers are still careful with their budgets. Investors now prefer companies that make a profit and bring in cash. Growth stories are worth much less to them. The board asks for your final big decision — but which options you have depends on what you built.',
        'An early, partial recovery: customers’ budgets remain cautious. Investors favour profitable, cash-generative companies and heavily discount growth stories; weakened competitors are available. The final options depend on the company built.'),
      whyItMatters: [
        mt('Only some options are open to you — they reflect your cash, profits and organization.', 'Option availability is earned from cash, margin, execution, capacity and strategic value.'),
        mt('Bigger moves bring bigger rewards and bigger risks, and the recovery is not complete.', 'Scale, raise, acquire and sell each carry distinct risk/return and integration load, in a recovery that is only partial.'),
        mt('This decision is how the board will remember your leadership.', 'The Q4 2024 choice and its consequences feed the terminal evaluation.'),
      ],
      challenge: mt('What should the company do next?', 'Which earned option creates the most durable value?'),
    },
  },

  signalPlain: {
    'c-q2-rates': 'Interest rates went up again. Households have less to spend, and consumer confidence fell for a second quarter.',
    'c-q2-ai-tools': 'Free AI study tools are spreading fast, mostly among people watching their money. AI tutoring downloads are up about 40%.',
    'c-q2-consumer': 'More people are cancelling subscriptions. Analysts expect consumer learning demand to fall 4–10%.',
    'c-q2-enterprise': 'Companies are reviewing their training budgets. Some test projects using AI to boost productivity are continuing.',
    'c-q2-cfo': 'Lenders are making loans harder to get. Borrowing now costs about one percentage point more.',
    'c-q2-university': 'University partners say more people are asking about courses to change careers.',
    'c-q2-product-readiness': 'Our engineers estimate it takes 2–3 quarters of steady investment to ship credible AI features.',
    'q3-consumer-usage': 'Monthly active learners on our consumer app fell only 4%. Time in the app is stable.',
    'q3-consumer-paid-cohorts': 'Our finance team estimates revenue from paying subscribers fell 7–12%. Most cancellations are on monthly plans.',
    'q3-enterprise-rfps': 'Companies are sending about 15% more requests for AI learning proposals. Many are reviews of current suppliers to cut costs.',
    'q3-ai-engagement': 'Use of our AI features is up 35%. Most of it is on free plans.',
    'q3-ai-wtp': 'Nobody knows how many AI tutor users will pay: estimates range from 5% to 20%.',
    'q3-university': 'More people are enrolling in career-change courses. University partners plan to expand these programmes.',
    'q3-competition': 'Several consumer AI start-ups have run out of money. Competitors are cutting their marketing.',
    'q3-people-strain': 'Staff are worried about layoffs at other companies. Fewer people are choosing to leave, but engagement scores are falling.',
    'c-q4-market': 'The downturn is getting worse. Customers choose on value; AI is useful but does not decide the sale.',
    'c-q5-contract': 'A global retailer is cutting down its training suppliers. It offers us a $32M-a-year contract — if we cut its training costs by a fifth.',
    'c-q5-contract-cfo': 'Finance: $4–7M upfront to set it up and about $1.2M per quarter for a delivery team. The price is tight, and there are penalties if we miss service promises.',
    'c-q5-contract-product': 'Engineers: the client’s needs would take 10–25% of our product team’s time for three quarters.',
    'c-q5-contract-people': 'People team: it adds a moderate amount of extra work for 2–3 quarters, while morale is fragile.',
    'c-q5-macro': 'Economists now see a 60–80% chance of a recession within two quarters.',
    'c-q5-consumer': 'More consumers are cancelling. Discounted plans are the only part still growing.',
    'c-q6-recession': 'Deep recession: unemployment is rising fast. Consumer confidence is at a fifteen-year low.',
    'c-q6-consumer': 'Consumer spending on learning is expected to fall 15–25%. Winning customers is cheap, but few of them pay.',
    'c-q6-enterprise': 'Companies are cutting training budgets sharply. Only programmes that save money are surviving.',
    'c-q6-cfo': 'Finance: revenue likely 6–12% below plan for 2–3 quarters. Loans are hard to get, and company valuations are down.',
    'c-q6-people': 'Layoffs are everywhere, and the staff who remain are fragile. Deep cuts usually make good people leave for 2–3 quarters afterwards.',
    'c-q6-university': 'More people are enrolling in credentials to retrain. University budgets are under pressure.',
    'c-q6-competition': 'Two competitors are restructuring. Others are cutting deeply.',
    'c-q7-prolonged': 'No recovery yet. The downturn is lasting longer than economists expected.',
    'c-q8-early-recovery': 'There are early signs of recovery. Customers are still careful with their budgets.',
    'c-q8-investors': 'Investors prefer companies that make a profit and bring in cash. They value growth stories much less.',
  },

  quarterBriefs: {
    2: {
      CEO: b([mt('Rates are up, households are tightening and employers are reviewing training budgets.'), mt('University partners report more enquiries about career-change credentials — not every segment is moving the same way.')],
        [mt('Whether this is a short squeeze or the start of a recession.'), mt('Whether acting early or waiting for clearer evidence is the bigger risk.')],
        [['Growth', mt('How much of our consumer business depends on people who are now cutting back?')], ['CFO', mt('If conditions get worse, how much room do we have to act?')]]),
      CFO: b([mt('Lenders are tightening terms and borrowing costs are up about one percentage point.'), mt('Our cash and margin are still healthy today — but money may cost more if we need it later.')],
        [mt('How much consumer revenue we will actually lose.'), mt('Whether we will need to borrow, and on what terms.')],
        [['Growth', mt('Should we spend to keep customers, or protect margin and accept some losses?')], ['Product', mt('What would AI features cost us, and over how many quarters?')]]),
      Product: b([mt('Engineering estimates credible AI features need two to three quarters of sustained investment.'), mt('AI tool downloads are up about 40%, but much of that use is on free tiers.')],
        [mt('Whether customers will pay for AI features when money is tight.'), mt('Whether a better core product matters more than new features right now.')],
        [['CFO', mt('Can we commit to two or three quarters of spending in a tightening market?')], ['Growth', mt('Are customers asking for new features, or for better value?')]]),
      People: b([mt('Teams are steady and culture is intact.'), mt('Employers everywhere are reviewing budgets — our own people will notice the mood.')],
        [mt('How staff will react if conditions keep getting worse.'), mt('How much change the organization can take this year.')],
        [['CEO', mt('Are we preparing for growth, for a downturn, or for both?')], ['CFO', mt('What workforce plans should we have ready in case budgets tighten?')]]),
      Growth: b([mt('Cancellations are up: analysts expect consumer demand to change by −10% to −4%.'), mt('Employers are reviewing training budgets, though some AI-productivity pilots continue.')],
        [mt('Whether cancelling customers will come back when conditions improve.'), mt('Whether enterprise reviews will cut our contracts or just slow them.')],
        [['Product', mt('What could we offer that a free AI tool cannot?')], ['CFO', mt('Should we discount to keep customers, or hold our price?')]]),
    },
    3: {
      CEO: b([mt('The numbers disagree: usage looks stable, but paying subscribers are cancelling.'), mt('Career-change enrolments are rising and partners plan to expand programmes.')],
        [mt('Which evidence reflects the real market.'), mt('What we must have ready before we choose a strategy next quarter.')],
        [['CFO', mt('What do the paying-customer numbers tell you that the usage numbers do not?')], ['Growth', mt('Are the extra enterprise requests new business, or customers shopping for cheaper suppliers?')]]),
      CFO: b([mt('Finance estimates paying-subscriber revenue is down 7–12%, mostly on monthly plans.'), mt('AI engagement is high, but estimates of how many users will pay range from 5% to 20%.')],
        [mt('Whether the cancellations will spread to annual plans.'), mt('Whether busier activity will ever turn into revenue.')],
        [['Growth', mt('Usage looks stable — why do you think payers are leaving?')], ['Product', mt('What would convince you that users will pay for AI features?')]]),
      Product: b([mt('AI feature engagement is up 35%, mostly on free tiers.'), mt('Several consumer AI start-ups have run out of funding, so the field is less crowded.')],
        [mt('Whether free users will ever upgrade.'), mt('Which capabilities each possible strategy would need from us.')],
        [['CFO', mt('How much proof do you need before funding more product work?')], ['Growth', mt('Which features would make a paying customer stay?')]]),
      People: b([mt('Staff are anxious about layoffs elsewhere: fewer people are leaving, but engagement scores are falling.'), mt('Next quarter’s strategic decision will add a major reorganization on top.')],
        [mt('Whether low attrition means commitment or just fear of the job market.'), mt('Which strategy the organization is actually ready for.')],
        [['CEO', mt('What can we tell staff about the future, and when?')], ['Product', mt('Which people are irreplaceable for the next year?')]]),
      Growth: b([mt('Monthly active learners are down only 4% and time in the app is stable.'), mt('Enterprise requests for AI learning are up about 15%, but many are reviews of existing suppliers.')],
        [mt('Whether stable usage means customers are still paying.'), mt('Which segment will hold up best if conditions get worse.')],
        [['CFO', mt('Your numbers show payers leaving — how should we read our usage numbers?')], ['CEO', mt('Which customers do we want to be the company for?')]]),
    },
    5: {
      CEO: b([mt('A global retailer offers a $32M-a-year contract — if we cut its training costs by a fifth.'), mt('The revenue would be signed for years, but the terms are tight and a recession now looks likely.')],
        [mt('Whether the contract strengthens or distracts our strategy.'), mt('What a recession would do to us with or without it.')],
        [['CFO', mt('Can we afford the upfront cost if a recession arrives?')], ['People', mt('Who would deliver this, and what would they stop doing?')]]),
      CFO: b([mt('Finance: $4–7M upfront plus about $1.2M a quarter for delivery; the price is tight and penalties apply.'), mt('Economists put a recession within two quarters at 60–80% — contracted revenue and cash both matter more if it comes.')],
        [mt('Whether we can deliver at this price and still make money.'), mt('How deep a recession would be.')],
        [['Growth', mt('How secure is this revenue once signed?')], ['Product', mt('Can we really cut the client’s costs by a fifth?')]]),
      Product: b([mt('Engineering: the client’s requirements would take 10–25% of product capacity for three quarters.'), mt('Helping a client cut costs could also sharpen a product other customers want right now.')],
        [mt('How much of the work would be useful beyond this client.'), mt('Whether our own roadmap can wait.')],
        [['CEO', mt('Is this client our future, or a detour?')], ['People', mt('Can we staff this without stopping core product work?')]]),
      People: b([mt('People team: moderate extra workload for two to three quarters, while morale is fragile.'), mt('A long-term client could also give staff a sense of security.')],
        [mt('Whether the teams can absorb it alongside everything else.'), mt('What a recession would do to morale under extra load.')],
        [['CFO', mt('If we take it on, can we afford the people to deliver it?')], ['CEO', mt('What else will we stop doing to make room?')]]),
      Growth: b([mt('Consumer cancellations are rising; discounted plans are the only growing segment.'), mt('A large signed client would add steady revenue — and tie more of our income to one customer.')],
        [mt('Whether other buyers will also start consolidating suppliers.'), mt('Whether delivery problems at a tight price would damage our reputation.')],
        [['Product', mt('Can we deliver to strict service promises?')], ['CFO', mt('Is one large client too much concentration risk?')]]),
    },
    6: {
      CEO: b([mt('The recession is deep: unemployment is rising fast and enterprises are cutting training sharply.'), mt('Credential enrolments are up as people retrain, though university budgets are under pressure; two competitors are restructuring.')],
        [mt('How long the downturn lasts.'), mt('Whether cutting deeply or investing through the cycle will look wiser in a year.')],
        [['CFO', mt('How many quarters can we last if revenue keeps falling?')], ['People', mt('What would cuts do to the capabilities we need for the recovery?')]]),
      CFO: b([mt('Finance: revenue likely 6–12% below plan for two to three quarters; credit is tight and valuations are down.'), mt('Raising money now would be hard and expensive.')],
        [mt('How deep and how long the drop in revenue will be.'), mt('Whether lenders will be willing to lend later.')],
        [['People', mt('Where can we save money, and what would each saving cost us later?')], ['Growth', mt('Would discounts protect revenue or just lower our prices for good?')]]),
      Product: b([mt('Enterprises are cutting budgets sharply; only programmes that save money survive.'), mt('Two competitors are restructuring and others are cutting deeply.')],
        [mt('Which product work customers will still pay for in a recession.'), mt('How quickly a cut-back product team could restart.')],
        [['CFO', mt('Which product investments must be protected, and which can pause?')], ['Growth', mt('What do customers need most from us right now?')]]),
      People: b([mt('Layoffs are everywhere and survivors’ morale is fragile.'), mt('Deep cuts have usually led to regretted attrition for two to three quarters afterwards.')],
        [mt('How the remaining staff will react to whatever we decide.'), mt('Whether we can rehire the skills we lose.')],
        [['CFO', mt('How much do we really need to save, and by when?')], ['CEO', mt('Which capabilities are we refusing to cut?')]]),
      Growth: b([mt('Consumer learning spend is expected to fall 15–25%; winning customers is cheap, but few convert.'), mt('Enterprises are cutting training budgets; only programmes that save money survive.')],
        [mt('Whether customers we lose now will come back.'), mt('Whether price cuts can be reversed later.')],
        [['CFO', mt('Should we raise prices, hold them or discount?')], ['CEO', mt('Which customers matter most to protect?')]]),
    },
    7: {
      CEO: b([mt('There is no recovery yet: the downturn is lasting longer than forecast.'), mt('Accreditation bodies are reviewing AI-assisted assessments, and our crisis is tied to the strategy we chose.')],
        [mt('How severe the damage will be if we respond cheaply.'), mt('How much longer the downturn will last.')],
        [['CFO', mt('What can we afford to spend on the response?')], ['Growth', mt('What would customers need to see to keep trusting us?')]]),
      CFO: b([mt('Enterprise buyers are using service-contract clauses and cutting suppliers after reliability problems.'), mt('A full fix costs cash now, in a downturn that has not ended; a cheaper response risks larger losses later.')],
        [mt('How much a partial response would really cost in lost revenue.'), mt('Whether our cash can absorb a full fix if the downturn continues.')],
        [['Product', mt('What does a proper fix take, and how quickly?')], ['CEO', mt('How much cash are you prepared to spend to protect trust?')]]),
      Product: b([mt('Launch slippage and cross-team escalations rose last quarter.'), mt('Fixing the root cause takes people away from new work.')],
        [mt('Whether the problem will recur.'), mt('How much new work we must pause to fix it.')],
        [['People', mt('Do we have the senior people to lead the fix?')], ['CFO', mt('If we spend less now, what is the risk later?')]]),
      People: b([mt('Recovering competitors are poaching senior experts at 30%+ premiums.'), mt('A long downturn plus a crisis adds pressure on the people we can least afford to lose.')],
        [mt('Who will leave under the pressure.'), mt('How long the teams can sustain crisis mode.')],
        [['CEO', mt('How long do you expect crisis mode to last?')], ['Product', mt('Who must be protected from being pulled into the fix?')]]),
      Growth: b([mt('A rival’s AI error has sparked refund requests across consumer learning apps.'), mt('Customers are still cutting back, and they are watching how providers respond to problems.')],
        [mt('Whether customers will blame the whole industry or specific companies.'), mt('How quickly trust recovers while budgets stay tight.')],
        [['CEO', mt('What will we tell customers?')], ['CFO', mt('Are refunds and credits cheaper than losing customers?')]]),
    },
    8: {
      CEO: b([mt('Early signs of recovery; weakened competitors are available at 1.5–2× revenue, and buyers are circling the sector.'), mt('The board wants to know what this company should become next — and whether we can afford it.')],
        [mt('Whether the recovery will hold.'), mt('Which option will create lasting value rather than a short-term boost.')],
        [['CFO', mt('Which options can we actually fund?')], ['People', mt('Could the organization absorb an acquisition or rapid growth?')]]),
      CFO: b([mt('Investors favour profitable, cash-generative companies; growth stories are heavily discounted.'), mt('Every option has a different mix of cash, debt, ownership and risk.')],
        [mt('Whether the recovery is strong enough to justify a big move.'), mt('What raising money or borrowing would cost us in ownership or interest.')],
        [['CEO', mt('Is growth worth giving up part of the company at today’s valuations?')], ['Growth', mt('Is the recovery real in our customers’ numbers?')]]),
      Product: b([mt('The product we have built decides which options are realistic.'), mt('Rapid growth or an acquisition would strain product quality.')],
        [mt('Whether our product can scale without problems.'), mt('How much integration work an acquisition would need.')],
        [['CEO', mt('Which option protects the product we built?')], ['People', mt('Can we grow without losing quality?')]]),
      People: b([mt('After eight quarters and a long downturn, the organization’s capacity and culture limit what we can do next.'), mt('Big moves add workload; stabilizing gives people time to recover.')],
        [mt('How much more change the teams can take.'), mt('Whether key people will stay through another big change.')],
        [['CEO', mt('What will this choice ask of our people?')], ['CFO', mt('Will there be money to support the people through it?')]]),
      Growth: b([mt('The first signs of recovery are here, but customers’ budgets remain cautious.'), mt('Growth options need customers ready to buy — not just available money.')],
        [mt('How fast demand will recover in our segments.'), mt('Which customers an acquisition would bring.')],
        [['CEO', mt('Where will the next two years of revenue come from?')], ['Product', mt('Can the product support faster growth?')]]),
    },
  },

  q3Assessments: [
    {
      id: 'q3-consumer-usage', source: 'Growth brief', verdict: 'misleading',
      showed: 'Usage barely fell, but paying demand fell about 10%. Many learners kept using the app after dropping to free tiers.',
      lesson: 'Usage is not revenue. Stable activity can hide paying customers who have quietly downgraded.',
      measures: ['consumerRevenue', 'consumerRetention'],
    },
    {
      id: 'q3-consumer-paid-cohorts', source: 'CFO brief', verdict: 'reliable',
      showed: 'The estimated 7%–12% fall in paying-subscriber revenue matched what the market did.',
      lesson: 'Evidence based on what customers actually pay was the better guide to consumer revenue.',
      measures: ['consumerRevenue', 'consumerRetention'],
    },
    {
      id: 'q3-enterprise-rfps', source: 'Shared brief', verdict: 'overstated',
      showed: 'Interest in AI-enabled learning was real, but many requests were cost-cutting reviews of existing suppliers. Overall enterprise demand was slightly weaker than normal.',
      lesson: 'Activity is not growth. More requests can mean buyers are looking for cheaper suppliers.',
      measures: ['enterprisePipeline', 'enterpriseRevenue'],
    },
    {
      id: 'q3-ai-engagement', source: 'Product brief', verdict: 'misleading',
      showed: 'Engagement rose, mostly on free tiers, while paying demand for AI-native products eased compared with Q2.',
      lesson: 'Engagement is not willingness to pay. Free use can grow while paid demand shrinks.',
      measures: ['aiAdoption', 'aiRevenue'],
    },
    {
      id: 'q3-ai-wtp', source: 'Shared brief', verdict: 'reliable',
      showed: 'Conversion sat at the low end of the 5%–20% range.',
      lesson: 'A wide range was honest about uncertainty. When budgets are squeezed, planning for the low end was the prudent reading.',
      measures: ['aiRevenue'],
    },
    {
      id: 'q3-university', source: 'CEO brief', verdict: 'reliable',
      showed: 'Career-change credential demand genuinely grew while other segments weakened.',
      lesson: 'Some demand moves against the economic cycle. A downturn does not hit every segment equally.',
      measures: ['universityRevenue'],
    },
    {
      id: 'q3-competition', source: 'Shared brief', verdict: 'reliable',
      showed: 'Competitors really were slowing, toward or below their normal pace.',
      lesson: 'Rivals face the same pressure you do. A weaker field is part of the evidence too.',
      measures: ['consumerRevenue'],
    },
    {
      id: 'q3-people-strain', source: 'People brief', verdict: 'not-assessed',
      showed: 'No market outcome is recorded for this signal, so it is not assessed here. Your own talent record is shown instead.',
      lesson: 'Some signals describe pressure inside the company. Your own records are the evidence.',
      measures: ['talent'],
    },
  ],

  revealSummary:
    'In Q3, the usage measure understated the problem: learners kept using the app while dropping to free tiers, so paying demand fell further than usage suggested. Activity measures such as RFP counts and free-tier engagement overstated demand. Evidence about payment (paid cohorts, conversion estimates) was again the better guide to what the market did.',
};
