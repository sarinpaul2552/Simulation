/**
 * MARKET-PATH B CONTENT — Enterprise Transformation (NexLearn V3 · Batch 10D)
 *
 * Overrides path A content for Q2, Q3 and Q5–Q8 (Q1 and Q4 are shared and fall back to path A).
 * Written only from what this path's shared briefings and role-private signals tell players
 * (src/simulationV3/engineV3PathB.ts): numbers quoted are shown values and shown ranges, ranges stay ranges,
 * no recommended answer, and no investment is presented as automatically superior.
 * The Q3 assessments restate only this path's authored Q3 notes and design notes; they are shown after Q4.
 */
import type { V2Role } from '../../../simulation/engineV2Scenario';
import type { PathContent } from './paths';
import type { QuarterRoleBrief } from './briefings';
import { mt, type ModeText } from './modes';

const b = (suggests: ModeText[], uncertain: ModeText[], discuss: [V2Role, ModeText][]): QuarterRoleBrief => ({ suggests, uncertain, discuss: discuss.map(([w, a]) => ({ with: w, ask: a })) });

export const PATH_B_CONTENT: PathContent = {
  chapters: {
    2: { quarter: 2, year: 1, title: 'AI goes to work', sub: mt('Employers start paying for AI training. Decide where the company should stand as the market shifts.', 'AI arrives through the workplace. Decide how to position between a softening consumer core and fast-rising employer demand.') },
    3: { quarter: 3, year: 1, title: 'Mixed signals', sub: mt('The evidence is mixed. Decide which numbers you trust before you choose a direction.', 'The evidence is mixed. Separate signal from noise before the board’s Q4 2023 deadline for a strategic direction.') },
    5: { quarter: 5, year: 2, title: 'The offer', sub: mt('A very large contract is on the table. Is it right for the company you are building?', 'The largest contract in company history is on the table. Weigh fit, delivery capacity and cash against the upside.') },
    6: { quarter: 6, year: 2, title: 'The squeeze', sub: mt('Budgets tighten for a while. Protect cash, protect people, or keep investing?', 'A budget squeeze tests your resilience: liquidity, delivery capacity and the capabilities you refuse to cut.') },
    7: { quarter: 7, year: 2, title: 'The crisis', sub: mt('Budgets are reopening, but your strategy creates a crisis. How you respond matters.', 'Budgets are reopening, but your chosen strategy creates its own crisis. The response trades cash against trust.') },
    8: { quarter: 8, year: 2, title: 'The final move', sub: mt('Make the final strategic decision. Your options depend on the company you built.', 'Make the final strategic decision in a recovered market. The options open to you were earned over seven quarters.') },
  },

  quarterCards: {
    2: {
      quarter: 2, stage: 'Year 1 · Q2',
      headline: mt('Employers start paying for AI training', 'AI reaches the workplace'),
      whatHappened: mt(
        'About 60% of large employers plan AI training for their staff within a year. Many employees now get training through work instead of paying for it themselves. Analysts expect self-paid consumer learning to fall 4–10%. Learning companies are adding AI modules, but none has shown it can deliver at scale yet.',
        'Boards mandate AI reskilling: about 60% of large employers plan programmes within a year. Employer-funded training substitutes for part of self-paid learning; analysts expect consumer demand to change by −10% to −4%. Enterprise learning suites and consultancies are bundling AI modules, but none has yet shown delivery at scale. Consumer AI apps keep improving quickly.'),
      whyItMatters: [
        mt('Our biggest business (consumer subscriptions) may shrink as employers pay for training instead.', 'The core consumer franchise faces substitution by employer-funded programmes, not only by free tools.'),
        mt('Plans are not contracts — companies still have to choose suppliers and sign deals.', 'Mandates are intent; procurement, budgets and supplier selection still lie ahead.'),
        mt('Selling to companies needs skills we must build first, and that takes time.', 'Enterprise buyers need delivery capacity, security and integrations; building them ahead of demand costs cash, while waiting risks arriving after suppliers are chosen.'),
      ],
      challenge: mt('Do we defend consumers, move toward companies, or do some of both — and how fast?', 'How do we respond to the shift: defend the consumer core, build toward enterprise, or hedge?'),
    },
    3: {
      quarter: 3, stage: 'Year 1 · Q3',
      headline: mt('Companies ask for proof we can deliver', 'Conflicting evidence'),
      whatHappened: mt(
        'Companies are sending about 40% more requests for AI learning proposals. They want proof that suppliers can deliver at scale. Consumer usage dipped a little. Use of our AI features is up 30%, mostly from company pilot users. Competitors are signing multi-year deals.',
        'Enterprise AI-learning RFPs are up about 40%, and buyers ask for proof of delivery at scale. Consumer usage dipped. AI feature engagement is up 30%, much of it from enterprise pilots, while stand-alone conversion estimates range from 5% to 20%. Competitors are signing multi-year platform deals.'),
      whyItMatters: [
        mt('Different numbers tell different stories — you must decide which evidence you trust.', 'Usage, revenue, engagement and pipeline metrics must be weighed for signal quality, not just direction.'),
        mt('People using a feature is not the same as people paying for it.', 'Engagement driven by pilots is not the same as stand-alone willingness to pay.'),
        mt('Next quarter you must commit to a long-term direction, so this is your last chance to prepare.', 'Q4 2023 requires a destination commitment; Q3 2023 is the last quarter to build readiness for it.'),
      ],
      challenge: mt('Which evidence do we believe, and what do we build before we commit?', 'Which signals do we act on, and which capabilities must be ready for the Q4 2023 commitment?'),
    },
    5: {
      quarter: 5, stage: 'Year 2 · Q5',
      headline: mt('A group of manufacturers offers a $64M-a-year deal', 'Major growth opportunity'),
      whatHappened: mt(
        'Three global manufacturers want us to run their AI training programme in 25 countries. It would be our biggest contract ever, with strict service promises. Saying yes ties up cash, people and product work for about three quarters. Saying no keeps our capacity and focus. Some signs suggest the economy is slowing a little.',
        'A consortium of three global manufacturers offers a $64M ACV AI reskilling programme across 25 countries, with strict SLAs, integration work and a dedicated delivery team — the largest contract in company history. Acceptance commits cash, people and roadmap for three quarters; declining preserves capacity and focus. Leading economic indicators are softening slightly.'),
      whyItMatters: [
        mt('Signed contracts are steadier income if the economy weakens.', 'Contracted revenue tends to hold up better than discretionary spend in a slowdown.'),
        mt('Delivering it costs money upfront and puts heavy pressure on our people and product team.', 'Upfront cost, delivery overhead, change load, SLA penalty risk and roadmap diversion are real and immediate.'),
        mt('If it does not fit our chosen strategy, it can pull us off course.', 'An off-strategy contract dilutes destination focus; other buyers are watching which providers deliver.'),
      ],
      challenge: mt('Do we accept the contract or decline it?', 'Accept or decline the consortium programme — and how do we resource it?'),
    },
    6: {
      quarter: 6, stage: 'Year 2 · Q6',
      headline: mt('Budget squeeze: employers pause new programmes', 'Budget squeeze and resource constraint'),
      whatHappened: mt(
        'Economic growth stalls for two quarters. Employers delay new training programmes and stop taking on new suppliers. They keep paying for AI projects that cut costs and for programmes that are already working. Consumers spend a little less. The board asks how you will steer through.',
        'Growth stalls for two quarters. Employers delay new training programmes and freeze new suppliers, but keep funding cost-cutting AI projects and renew programmes that are delivering. Consumer spending softens. The board asks how you will steer through the squeeze.'),
      whyItMatters: [
        mt('Less money will come in for the next two quarters.', 'Revenue will likely run below plan for two quarters.'),
        mt('Cutting jobs saves money now but can make good people leave for months.', 'Workforce reductions save cost but carry lasting talent, culture and capacity damage.'),
        mt('Programmes that are already delivering keep their funding — new ones wait.', 'Renewals of performing programmes continue while new-supplier procurement freezes.'),
      ],
      challenge: mt('How do we get through the squeeze without destroying what we built?', 'What is our response to the squeeze: cut, protect, reprice, refinance — or invest through the cycle?'),
    },
    7: {
      quarter: 7, stage: 'Year 2 · Q7',
      headline: mt('A crisis linked to our strategy hits', 'Strategy-dependent crisis'),
      whatHappened: mt(
        'Company training budgets are reopening faster than expected. Consumers are still cautious. Your company now faces a serious problem connected to the strategy you chose. How badly it hurts depends on how strong the company you built is.',
        'Enterprise budgets are reopening faster than expected and the slowdown is fading; consumers remain cautious. Each strategy has its own fragility, and the company now meets the crisis its strategy invites. Severity depends on the capabilities built.'),
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
        'Companies are spending more on AI training than ever before. Consumer learning is steady but not growing. Investors are returning, and some weaker competitors are for sale. The board asks for your final big decision — but which options you have depends on what you built.',
        'Enterprise AI-learning budgets are at record levels; self-paid consumer learning is flat. Growth investors are returning and weakened competitors are available. The final options depend on the company built.'),
      whyItMatters: [
        mt('Only some options are open to you — they reflect your cash, profits and organization.', 'Option availability is earned from cash, margin, execution, capacity and strategic value.'),
        mt('Bigger moves bring bigger rewards and bigger risks.', 'Scale, raise, acquire and sell each carry distinct risk/return and integration load.'),
        mt('This decision is how the board will remember your leadership.', 'The Q4 2024 choice and its consequences feed the terminal evaluation.'),
      ],
      challenge: mt('What should the company do next?', 'Which earned option creates the most durable value?'),
    },
  },

  signalPlain: {
    'b-q2-enterprise-mandates': 'Company boards are ordering AI training: about 60% of large employers plan AI skills programmes within a year.',
    'b-q2-consumer-ai': 'Employees now get AI training through work. Analysts expect people to spend 4–10% less on learning they pay for themselves.',
    'b-q2-consumer-cac': 'Winning each new customer costs about 8% more; people compare prices more, but not a lot more.',
    'b-q2-enterprise-competition': 'Learning companies are adding AI modules, but none has shown it can deliver at scale yet; consumer AI apps keep getting better fast.',
    'b-q2-delivery': 'People who set up programmes and look after business clients are hard to find; hiring a delivery team takes 2–3 quarters.',
    'b-q2-university': 'University partners say employers are asking for AI-skills certificates; they still plan to renew.',
    'b-q2-product-readiness': 'Engineers: companies want security, connections to their own systems and admin controls before they buy AI tools — 2–3 quarters of work.',
    'q3-consumer-usage': 'Monthly active learners on our consumer app fell 9%; time in the app fell 7%.',
    'q3-consumer-paid-cohorts': 'Our finance team estimates revenue from paying subscribers fell 6–10%; more learners say their employer now pays for training.',
    'q3-enterprise-rfps': 'Companies are sending about 40% more requests for AI learning proposals; they want proof we can deliver at scale.',
    'q3-ai-engagement': 'Use of our AI features is up 30%, mostly by people in company pilot programmes.',
    'q3-ai-wtp': 'Nobody knows how many pilot users will pay for a stand-alone AI tutor: estimates range from 5% to 20%.',
    'q3-university': 'Universities say employers strongly want short AI-skills certificates; two partners suggest running programmes together.',
    'q3-competition': 'Consumer AI apps keep getting better fast; competitors selling to companies are still mostly running trials.',
    'q3-people-strain': 'Rivals are hiring away our programme delivery and client support staff with 25–35% more pay.',
    'b-q4-market': 'Training staff in AI at work is becoming the industry’s main growth market; self-paid consumer learning is flat.',
    'b-q5-consortium': 'Three global manufacturers offer a $64M-a-year AI training programme, live in 25 countries within three quarters.',
    'b-q5-contract-cfo': 'Finance: $7–13M upfront to set it up and connect systems, about $2M per quarter for a delivery team, and penalties if we miss service promises.',
    'b-q5-contract-product': 'Engineers: connecting to three clients’ systems would take 15–35% of our AI/product team’s time for three quarters — unless companies are already our main direction.',
    'b-q5-contract-people': 'People team: the programme puts heavy pressure on staff for 2–3 quarters, and delivery specialists are hard to hire.',
    'b-q5-macro': 'Economists see a 20–35% chance of a slowdown within two quarters; signed contracts usually hold up better than optional spending.',
    'b-q5-pipeline': 'Other companies are waiting to see which providers win the first big programmes before they buy.',
    'b-q6-slowdown': 'Economic growth stops for two quarters; employers delay new training programmes but keep AI projects that save money.',
    'b-q6-consumer': 'Consumer spending on learning is expected to fall 5–10%; more people want discounts.',
    'b-q6-enterprise': 'Companies stop signing new suppliers, but keep renewing programmes that are working.',
    'b-q6-ai': 'AI projects that cut costs keep their money; trial projects are cancelled (10–25% fewer new pilots).',
    'b-q6-university': 'University partners keep their budgets; employer-paid certificates slow a little.',
    'b-q6-cfo': 'Finance: revenue likely 2–5% below plan for two quarters; lenders are careful but still willing.',
    'b-q6-people': 'Delivery teams are stretched; most sector layoffs are in sales and marketing. Deep cuts usually make good people leave for 2–3 quarters afterwards.',
    'b-q7-reopening': 'Company training budgets are reopening faster than expected; consumers are still careful.',
    'b-q8-recovery': 'Company budgets for AI training are at record levels; self-paid consumer learning is flat.',
  },

  quarterBriefs: {
    2: {
      CEO: b([mt('About 60% of large employers plan AI training within a year, and universities hear the same requests from employers.'), mt('But plans are not purchases: no competitor has shown it can deliver at scale, and our consumer business is still our largest.')],
        [mt('Whether employer plans turn into budgets, or stay as intentions.'), mt('Whether moving early or waiting for evidence is the bigger risk.')],
        [['Growth', mt('How much of our consumer business could move to employer-paid training this year?')], ['People', mt('Could we build a delivery team in time if companies start buying?')]]),
      CFO: b([mt('Analysts expect self-paid consumer demand to fall 4–10% as employers pay for training.'), mt('Our cash and margin are still healthy — we have room to act, but not to waste money.')],
        [mt('How much consumer revenue we will actually lose.'), mt('Whether employer interest will become paying contracts before the money we spend runs out.')],
        [['Product', mt('What would it cost to make our product ready for company buyers, and for how many quarters?')], ['Growth', mt('Should we spend to defend consumers, or protect margin and accept some losses?')]]),
      Product: b([mt('Engineering: company buyers need security, integrations and admin controls — 2–3 quarters of work.'), mt('Our current product is still good, and consumer AI apps keep improving quickly.')],
        [mt('Whether company features or a better consumer product will matter more.'), mt('Whether we can build both without overloading the teams.')],
        [['CFO', mt('Can we commit to two or three quarters of spending before seeing any return?')], ['Growth', mt('Are company buyers asking for features we do not have, or for proof we can deliver?')]]),
      People: b([mt('Delivery and client-success specialists are scarce; hiring a team takes 2–3 quarters.'), mt('Teams are steady today, and a sudden change of direction would add workload.')],
        [mt('Whether we will need a delivery team at all, and how soon.'), mt('How much change the organization can take this year.')],
        [['CEO', mt('If we hire delivery people now, what happens if company demand does not arrive?')], ['Product', mt('Which skills would we need to hire first?')]]),
      Growth: b([mt('Winning a new consumer costs about 8% more; price comparison is rising but not severe.'), mt('Employers say they will fund AI training, which may move some learners away from paying us directly.')],
        [mt('How many of our paying consumers will switch to training their employer pays for.'), mt('Whether employer plans will become signed deals, and with whom.')],
        [['Product', mt('What would make us the supplier a company chooses?')], ['CFO', mt('If consumer growth slows, should we still spend on winning consumers?')]]),
    },
    3: {
      CEO: b([mt('Companies are sending about 40% more AI learning requests, and universities report strong employer demand for AI certificates.'), mt('But buyers want proof we can deliver at scale, and competitors are signing multi-year deals.')],
        [mt('Which evidence reflects the real market.'), mt('What we must have ready before we choose a strategy next quarter.')],
        [['CFO', mt('What do the paying-customer numbers tell you about our consumer business?')], ['People', mt('What strategy could our organization actually deliver next year?')]]),
      CFO: b([mt('Finance estimates paying-subscriber revenue is down 6–10%; more learners say their employer now pays.'), mt('Pilot-to-paid estimates for stand-alone AI tutoring range from 5% to 20%.')],
        [mt('Whether the consumer decline will continue next year.'), mt('Whether AI engagement will ever turn into profit.')],
        [['Growth', mt('Does the usage you see match the revenue drop I see?')], ['Product', mt('Who is using the AI features — and would they pay on their own?')]]),
      Product: b([mt('AI feature engagement is up 30%, mostly from enterprise pilot users.'), mt('Pilot use is not payment: stand-alone conversion estimates range from 5% to 20%.')],
        [mt('Whether pilot users will turn into paying customers, and who would pay.'), mt('Whether we can prove delivery at scale if buyers ask for it.')],
        [['Growth', mt('Are the pilots a sign of future contracts, or just trials?')], ['CFO', mt('How much proof do you need before funding more product work?')]]),
      People: b([mt('Rivals are hiring away implementation and client-success staff at 25–35% pay premiums.'), mt('Next quarter’s strategic decision will add a major reorganization on top.')],
        [mt('How many key delivery people we might lose.'), mt('Which strategy the organization is actually ready for.')],
        [['Product', mt('Which people are irreplaceable for the next year?')], ['CEO', mt('Are we prepared to pay more to keep delivery people, or to accept losing some?')]]),
      Growth: b([mt('Monthly active learners are down 9% and time in the app is down 7%.'), mt('Enterprise requests for AI learning are up about 40%, but buyers want proof of delivery before they sign.')],
        [mt('Whether the consumer decline will stop or keep going.'), mt('Which segment will be the biggest opportunity in two years.')],
        [['CFO', mt('Is the drop in payers as large as the drop in usage?')], ['CEO', mt('Which customers do we want to be the company for?')]]),
    },
    5: {
      CEO: b([mt('A $64M-a-year programme would be the largest contract in our history.'), mt('It ties up cash, people and product work for about three quarters — and may or may not fit our strategy.')],
        [mt('Whether the contract strengthens or distracts our strategy.'), mt('What a slowdown would do to us with or without it.')],
        [['CFO', mt('Can we afford the upfront cost if the economy slows?')], ['People', mt('Who would deliver this, and what would they stop doing?')]]),
      CFO: b([mt('Finance: $7–13M upfront plus about $2M a quarter for delivery, with penalties if we slip.'), mt('Economists put a slowdown within two quarters at 20–35%, and contracted revenue tends to hold up better than optional spending.')],
        [mt('Whether the slowdown comes.'), mt('Whether we can deliver on time and avoid penalties.')],
        [['Growth', mt('How certain is this revenue once signed?')], ['Product', mt('What happens to our own roadmap if we say yes?')]]),
      Product: b([mt('Engineering: integrations for three clients would take 15–35% of product capacity for three quarters — less if enterprise is already our focus.'), mt('Integration work for large clients can also make the product easier to sell to others.')],
        [mt('How much of the integration work would be useful beyond these clients.'), mt('Whether our own roadmap can wait.')],
        [['CEO', mt('Are these clients our future, or a detour?')], ['People', mt('Can we staff this without stopping core product work?')]]),
      People: b([mt('People team: the programme adds heavy change load for 2–3 quarters, and the delivery hiring market is tight.'), mt('A flagship programme could also attract talent and build experience.')],
        [mt('Whether we can hire delivery people fast enough.'), mt('What a slowdown would do to morale under heavy load.')],
        [['CFO', mt('If we take it on, can we afford extra people to deliver it?')], ['CEO', mt('What else will we stop doing to make room?')]]),
      Growth: b([mt('Other enterprise prospects are waiting to see which providers win the first large programmes.'), mt('A reference client could open other doors — or pull attention from the rest of the pipeline.')],
        [mt('How many other deals would follow this one.'), mt('Whether delivery problems would damage our reputation with those watching.')],
        [['Product', mt('Can we deliver to strict service promises in 25 countries?')], ['CFO', mt('Is one huge contract too much concentration risk?')]]),
    },
    6: {
      CEO: b([mt('Growth has stalled for two quarters: employers delay new programmes and freeze new suppliers, but keep cost-cutting AI projects.'), mt('University partners are holding budgets, though employer-paid certificates are slowing slightly.')],
        [mt('How long the squeeze lasts.'), mt('Whether cutting back or investing through it will look wiser in a year.')],
        [['CFO', mt('How many quarters can we absorb if revenue stays below plan?')], ['People', mt('What would cuts do to the capabilities we need when budgets reopen?')]]),
      CFO: b([mt('Finance: revenue likely 2–5% below plan for two quarters; lenders are cautious but open.'), mt('Renewals of programmes that are delivering continue, while new-supplier deals are frozen.')],
        [mt('How deep and how long the drop in revenue will be.'), mt('Whether lenders will stay open if things get worse.')],
        [['People', mt('Where can we save money without losing people we will need?')], ['Growth', mt('Would discounts protect revenue or just lower our prices for good?')]]),
      Product: b([mt('AI projects that cut costs keep their funding, but new pilots are down 10–25%.'), mt('Cutting product investment saves cash but slows everything we have built.')],
        [mt('Which customers will keep buying during the squeeze.'), mt('How quickly a cut-back product team could restart.')],
        [['CFO', mt('Which product investments must be protected even now?')], ['Growth', mt('What do customers need most from us right now?')]]),
      People: b([mt('Delivery teams are stretched; sector layoffs are mostly in sales and marketing.'), mt('Deep cuts usually lead good people to leave for two to three quarters afterwards; a hiring freeze is milder but slows everything.')],
        [mt('How the remaining staff will react to cuts.'), mt('Whether we can rehire the skills we lose.')],
        [['CFO', mt('How much do we really need to save, and by when?')], ['CEO', mt('Which capabilities are we refusing to cut?')]]),
      Growth: b([mt('Consumer learning spend is expected to fall 5–10%; customers are looking for discounts.'), mt('Companies keep renewing programmes that are delivering, but are not signing with new suppliers.')],
        [mt('Whether customers we lose now will come back.'), mt('Whether price cuts can be reversed later.')],
        [['CFO', mt('Should we raise prices, hold them or discount?')], ['CEO', mt('Which customers matter most to protect?')]]),
    },
    7: {
      CEO: b([mt('Enterprise budgets are reopening faster than expected, but consumers remain cautious.'), mt('Our crisis is tied to the strategy we chose — how we respond will be remembered.')],
        [mt('How severe the damage will be if we respond cheaply.'), mt('What customers and staff expect from us.')],
        [['CFO', mt('What can we afford to spend on the response?')], ['Growth', mt('What would customers need to see to keep trusting us?')]]),
      CFO: b([mt('Enterprise buyers are using service-contract clauses and cutting suppliers after reliability problems.'), mt('A full fix costs cash now; a cheaper response risks larger losses just as budgets reopen.')],
        [mt('How much a partial response would really cost in lost revenue.'), mt('Whether our cash can absorb a full fix.')],
        [['Product', mt('What does a proper fix take, and how quickly?')], ['CEO', mt('How much cash are you prepared to spend to protect trust?')]]),
      Product: b([mt('Launch slippage and cross-team escalations rose last quarter.'), mt('Fixing the root cause takes people away from new work.')],
        [mt('Whether the problem will recur.'), mt('How much new work we must pause to fix it.')],
        [['People', mt('Do we have the senior people to lead the fix?')], ['CFO', mt('If we spend less now, what is the risk later?')]]),
      People: b([mt('Recovering competitors are poaching senior experts at 30%+ premiums.'), mt('A crisis adds pressure on exactly the people we can least afford to lose.')],
        [mt('Who will leave under the pressure.'), mt('How long the teams can sustain crisis mode.')],
        [['CEO', mt('How long do you expect crisis mode to last?')], ['Product', mt('Who must be protected from being pulled into the fix?')]]),
      Growth: b([mt('A rival’s AI error has sparked refund requests across consumer learning apps.'), mt('Company budgets are reopening, and buyers are watching how providers handle problems.')],
        [mt('Whether customers will blame the whole industry or specific companies.'), mt('How quickly trust recovers.')],
        [['CEO', mt('What will we tell customers?')], ['CFO', mt('Are refunds and credits cheaper than losing customers?')]]),
    },
    8: {
      CEO: b([mt('Enterprise AI-learning budgets are at record levels; weakened competitors are available at 1.5–2× revenue.'), mt('The board wants to know what this company should become next — and whether we can afford it.')],
        [mt('Which option will create lasting value rather than a short-term boost.'), mt('How the market will value each choice.')],
        [['CFO', mt('Which options can we actually fund?')], ['People', mt('Could the organization absorb an acquisition or rapid growth?')]]),
      CFO: b([mt('Growth investors are back for companies with momentum, though valuations are below their peak.'), mt('Every option has a different mix of cash, debt, ownership and risk.')],
        [mt('Whether record enterprise budgets will last long enough to justify a big move.'), mt('What raising money or borrowing would cost us in ownership or interest.')],
        [['CEO', mt('Is growth worth giving up part of the company?')], ['Growth', mt('Is the recovery real in our customers’ numbers?')]]),
      Product: b([mt('The product we have built decides which options are realistic.'), mt('Rapid growth or an acquisition would strain product quality.')],
        [mt('Whether our product can scale without problems.'), mt('How much integration work an acquisition would need.')],
        [['CEO', mt('Which option protects the product we built?')], ['People', mt('Can we grow without losing quality?')]]),
      People: b([mt('After eight quarters, the organization’s capacity and culture limit what we can do next.'), mt('Big moves add workload; stabilizing gives people time to recover.')],
        [mt('How much more change the teams can take.'), mt('Whether key people will stay through another big change.')],
        [['CEO', mt('What will this choice ask of our people?')], ['CFO', mt('Will there be money to support the people through it?')]]),
      Growth: b([mt('Enterprise AI-learning budgets are at record levels, while self-paid consumer learning is flat.'), mt('Growth options need customers ready to buy — not just available money.')],
        [mt('How long strong enterprise spending will last, and how much of it we can win.'), mt('Which customers an acquisition would bring.')],
        [['CEO', mt('Where will the next two years of revenue come from?')], ['Product', mt('Can the product support faster growth?')]]),
    },
  },

  q3Assessments: [
    {
      id: 'q3-consumer-usage', source: 'Growth brief', verdict: 'reliable',
      showed: 'Paying demand fell by about as much as usage did. This time the drop in activity was a fair guide to the drop in paying customers.',
      lesson: 'Usage is not always misleading. When it agrees with payment evidence, it can be trusted more.',
      measures: ['consumerRevenue', 'consumerRetention'],
    },
    {
      id: 'q3-consumer-paid-cohorts', source: 'CFO brief', verdict: 'reliable',
      showed: 'The estimated 6%–10% fall in paying-subscriber revenue matched what the market did.',
      lesson: 'Evidence closest to what customers pay for was a sound guide. Here it and usage told the same story.',
      measures: ['consumerRevenue', 'consumerRetention'],
    },
    {
      id: 'q3-enterprise-rfps', source: 'Shared brief', verdict: 'reliable',
      showed: 'Enterprise demand was genuine and strong. As the signal said, buyers wanted proof of delivery: the ability to deliver decided who won the work.',
      lesson: 'Strong demand is not the same as an easy win. Who captures it depends on what you can deliver.',
      measures: ['enterprisePipeline', 'enterpriseRevenue'],
    },
    {
      id: 'q3-ai-engagement', source: 'Product brief', verdict: 'misleading',
      showed: 'The engagement came from enterprise pilots. Paying demand for stand-alone AI products stayed modest and eased slightly from Q2.',
      lesson: 'Ask who is engaging. Pilot users inside company programmes are not stand-alone customers ready to pay.',
      measures: ['aiAdoption', 'aiRevenue'],
    },
    {
      id: 'q3-ai-wtp', source: 'Shared brief', verdict: 'reliable',
      showed: 'Conversion landed at the low end of the 5%–20% range.',
      lesson: 'The wide range was honest about uncertainty. Planning for the low end was the prudent choice.',
      measures: ['aiRevenue'],
    },
    {
      id: 'q3-university', source: 'CEO brief', verdict: 'partly-supported',
      showed: 'University demand rose only mildly. Employer interest was real, but it moved demand less than "strong" implied.',
      lesson: 'Partner enthusiasm shows a direction, not a size. Proposals show interest before they show revenue.',
      measures: ['universityRevenue'],
    },
    {
      id: 'q3-competition', source: 'Shared brief', verdict: 'reliable',
      showed: 'Both halves held: consumer AI apps kept improving faster than normal, while enterprise competitors moved at a modest pace.',
      lesson: 'Competitive pressure can differ by segment. One signal can describe two different races.',
      measures: ['consumerRevenue', 'enterprisePipeline'],
    },
    {
      id: 'q3-people-strain', source: 'People brief', verdict: 'not-assessed',
      showed: 'No market outcome is recorded for this signal in the scenario, so it is not assessed. Your own talent record is shown in its place.',
      lesson: 'Some signals describe pressure inside the company. Your own records are the evidence.',
      measures: ['talent'],
    },
  ],

  revealSummary:
    'In Q3, the consumer evidence agreed: usage and paying-subscriber revenue fell by similar amounts, and the market followed both. The strongest and most reliable signal was enterprise demand, although winning it depended on proof of delivery. AI engagement overstated how much people would pay for stand-alone AI products, because much of it came from enterprise pilots.',
};
