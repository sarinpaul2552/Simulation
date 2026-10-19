/**
 * LEADERSHIP TEAM BRIEF (Stage 4B · v3-econ-1.1 games only)
 *
 * One card per executive: an observation, a possible action and a short reason. Rules are documented in
 * NEXLEARN_V3_1_STAGE4B_SCREEN_SPEC.md §2.2. Every number is a measured signal that executive already receives in their
 * private brief (getRoleBrief) or a term the team sees on this quarter's decision screen (getDecisionSpec). Hidden
 * market truth is never used. The actions come from each role's mandate, so they can — and often do — disagree; none
 * is presented as the right answer.
 */
import type { V2Role } from '../types';
import type { V2GameSnapshot } from '../snapshot';
import { getRoleBrief, getDecisionSpec, workingQuarter, replayInputs, configOf } from '../engine';
import { V2_DESTINATIONS, type V2DestinationId } from '../../../simulationV3/engineV3Destination';
import { BUCKET_INFO } from './consequences';

export interface ExecutiveView { role: V2Role; observation: string; action: string; why: string }
export interface ReadinessRow { id: V2DestinationId; name: string; readiness: number }

const m1 = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(1)}M`;
const m0 = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(0)}M`;
const i0 = (x: number) => x.toFixed(0);

type Signals = Record<string, number | undefined>;
function signals(snap: V2GameSnapshot, role: V2Role): Signals {
  const out: Signals = {};
  for (const s of getRoleBrief(snap, role).signals) if (s.kind === 'measured') out[s.id] = s.value ?? undefined;
  return out;
}

/** The board readiness assessment for each strategy (the CEO's measured Q4 signals), highest first. */
export function readinessRows(snap: V2GameSnapshot): ReadinessRow[] {
  return getRoleBrief(snap, 'CEO').signals
    .filter(s => s.id.startsWith('ceo-readiness-') && s.value !== undefined)
    .map(s => { const id = s.id.slice('ceo-readiness-'.length) as V2DestinationId; return { id, name: V2_DESTINATIONS[id].name, readiness: s.value! }; })
    .sort((a, b) => b.readiness - a.readiness);
}

export function leadershipBrief(snap: V2GameSnapshot): ExecutiveView[] {
  const q = workingQuarter(snap) ?? snap.completedQuarter;
  const spec = getDecisionSpec(snap);
  const prev = snap.inputs.length > 0 ? replayInputs(snap.inputs.slice(0, -1), configOf(snap)) : null;
  const sig = (r: V2Role) => signals(snap, r);
  const was = (r: V2Role) => (prev ? signals(prev, r) : {});
  const s = snap.state;
  const dest = s.destination?.id;
  const opp = spec?.opportunity;

  // ---- CEO
  const ceo = sig('CEO');
  let CEO: ExecutiveView;
  const ready = readinessRows(snap);
  if (spec?.final) {
    const open = spec.final.options.filter(o => o.available).length;
    CEO = { role: 'CEO', observation: `${open} of ${spec.final.options.length} final options are open to us.`, action: 'Choose the option that best builds on the strategy we committed to.', why: 'The final move is judged against the company we built over seven quarters.' };
  } else if (ready.length) {
    const top = ready[0], low = ready[ready.length - 1];
    CEO = { role: 'CEO', observation: `Readiness is highest for ${top.name} (${i0(top.readiness)}%) and lowest for ${low.name} (${i0(low.readiness)}%).`, action: `Weigh ${top.name} seriously, and ask whether a less-ready option is worth its transition cost.`, why: 'Low readiness means more transition work and slower benefits.' };
  } else if (dest) {
    const aligned = V2_DESTINATIONS[dest].alignedBuckets.map(b => BUCKET_INFO[b].short);
    const atCommit = ceo['ceo-destination-readiness'];
    CEO = { role: 'CEO', observation: `We committed to ${V2_DESTINATIONS[dest].name}${atCommit !== undefined ? ` at ${i0(atCommit)}% readiness` : ''}.`,
      action: aligned.length ? `Keep most investment in ${aligned.join(' and ')}.` : 'Keep investment spread across the four businesses.',
      why: aligned.length ? 'On-strategy work carries less workload as the strategy strengthens.' : 'A balanced strategy gets no focus benefits, so coordination matters most.' };
  } else {
    const rev = ceo['ceo-revenue'] ?? s.revenue;
    CEO = { role: 'CEO', observation: `Revenue is ${m1(rev)} a quarter; trust is ${i0(ceo['ceo-trust'] ?? s.trust)}.`,
      action: q === 3 ? 'Agree which evidence should settle next quarter’s strategy choice.' : 'Build capabilities for the strategy we are most likely to choose in Q4.',
      why: 'The board expects a committed strategy in Q4, and readiness comes from what we build now.' };
  }

  // ---- CFO
  const cfo = sig('CFO'), cfoWas = was('CFO');
  const cash = cfo['cfo-cash'] ?? s.cash, margin = cfo['cfo-margin'];
  let CFO: ExecutiveView;
  if (cash < 15) CFO = { role: 'CFO', observation: `Cash is ${m1(cash)}, below the $15M minimum to operate.`, action: 'Finance the gap or invest less this quarter.', why: 'Below the minimum the company is distressed and loses value.' };
  else if (opp) CFO = { role: 'CFO', observation: `Cash is ${m1(cash)}. The contract needs ${m1(Math.ceil(opp.upfrontCash * 10 - 1e-9) / 10)} upfront, then ${m1(opp.deliveryCostPerQuarter)} a quarter to deliver.`, action: cash < 40 ? 'Decline unless the contract value clearly outweighs the cash strain.' : 'We can afford the upfront cost if the rest of the plan still keeps a cushion.', why: 'The upfront cost comes out of this quarter’s budget.' };
  else if (spec?.management) CFO = { role: 'CFO', observation: `Cash is ${m1(cash)}${margin !== undefined ? ` and operating margin ${margin.toFixed(1)}%` : ''}.`, action: cash < 40 ? 'Slow investment and keep part of the budget as cash.' : 'We can afford to keep investing, but keep a reserve.', why: 'A downturn can last longer than expected.' };
  else if (spec?.crisis) { const rem = spec.crisis.responses.find(r => r.id === 'remediate'); CFO = { role: 'CFO', observation: `Cash is ${m1(cash)}; a full remediation costs ${m1(rem?.cash ?? 0)} now.`, action: cash - (rem?.cash ?? 0) < 40 ? 'Contain the damage at lower cost, unless the risk to customers is too high.' : 'We can afford to remediate properly.', why: 'Crisis spending competes with this quarter’s investment.' }; }
  else if (spec?.final) CFO = { role: 'CFO', observation: `Cash is ${m1(cash)}; debt is ${m1(cfo['cfo-debt'] ?? s.financing.debt)}.`, action: 'Check what each open option costs in cash, debt and ownership.', why: 'The final move must leave the company solvent.' };
  else if (cash < 40) CFO = { role: 'CFO', observation: `Cash is ${m1(cash)}, below the $40M comfort level.`, action: 'Keep part of this quarter’s budget as cash.', why: 'A cushion protects us against a bad quarter.' };
  else if (margin !== undefined && cfoWas['cfo-margin'] !== undefined && margin < cfoWas['cfo-margin']! - 1) CFO = { role: 'CFO', observation: `Operating margin fell from ${cfoWas['cfo-margin']!.toFixed(1)}% to ${margin.toFixed(1)}%.`, action: 'Favour investments that pay off sooner.', why: 'Falling margin reduces the cash the business generates.' };
  else CFO = { role: 'CFO', observation: `Cash is ${m1(cash)}${margin !== undefined ? `; operating margin is ${margin.toFixed(1)}%` : ''}.`, action: 'We can afford to invest the full budget.', why: 'Cash above $40M leaves a cushion for a bad quarter.' };

  // ---- Product
  const pr = sig('Product');
  const pq = pr['product-pq'] ?? s.productQuality, ai = pr['product-ai'] ?? s.capabilities.ai, air = pr['product-ai-readiness'] ?? s.commercial.aiCommercialReadiness, td = pr['product-tech-debt'] ?? s.technicalDebt;
  let Product: ExecutiveView;
  if (opp && opp.roadmapDiversion > 0) Product = { role: 'Product', observation: `The contract would divert ${(opp.roadmapDiversion * 100).toFixed(0)}% of product team time.`, action: 'Accept only if the product roadmap can wait.', why: 'Diverted engineers slow AI and quality work.' };
  else if (spec?.crisis && dest === 'consumer-ai') Product = { role: 'Product', observation: `Product quality is ${i0(pq)}; AI capability is ${i0(ai)}.`, action: 'Fix the quality problem properly.', why: 'Trust in the product is what customers are judging.' };
  else if (air < 30) Product = { role: 'Product', observation: `AI commercial readiness is ${i0(air)} out of 100; AI capability is ${i0(ai)}.`, action: 'Keep investing in AI / Product.', why: 'AI capability takes one to three quarters to build and cannot be bought at the last minute.' };
  else if (td > 40) Product = { role: 'Product', observation: `Technical debt has reached ${i0(td)}.`, action: 'Protect product quality before adding new features.', why: 'Technical debt slows every later change.' };
  else Product = { role: 'Product', observation: `Product quality is ${i0(pq)}; AI capability is ${i0(ai)}.`, action: 'Keep AI / Product funding steady rather than spiking it.', why: 'Large one-off increases add workload and lose some of their value.' };

  // ---- People
  const pe = sig('People'), peWas = was('People');
  const culture = pe['people-culture'] ?? s.culture, talent = pe['people-talent'] ?? s.capabilities.talent, load = pe['people-load'] ?? s.transformationLoad, cap = pe['people-capacity'] ?? s.organizationalCapacity;
  let People: ExecutiveView;
  if (spec?.management) People = { role: 'People', observation: `Culture is ${i0(culture)}; talent is ${i0(talent)}.`, action: 'If we cut, prefer a hiring freeze or targeted cuts to deep layoffs.', why: 'Deep cuts damage culture and capacity for several quarters.' };
  else if (spec?.crisis) People = { role: 'People', observation: `Last quarter’s workload was ${i0(load)} against a capacity of ${i0(cap)}; culture is ${i0(culture)}.`, action: 'Choose a response the teams can deliver on top of this quarter’s plan.', why: 'A response that overloads the teams adds a second problem.' };
  else if (opp) People = { role: 'People', observation: `The contract adds about ${i0(opp.orgLoadPerQuarter)} workload points a quarter for ${opp.loadQuarters} quarters.`, action: 'Accept only if we run fewer other initiatives.', why: 'Overloaded teams turn less investment into capability.' };
  else if (culture < 60 || (peWas['people-culture'] !== undefined && culture < peWas['people-culture']! - 3)) People = { role: 'People', observation: `Culture is ${i0(culture)}${peWas['people-culture'] !== undefined ? `, down from ${i0(peWas['people-culture']!)}` : ''}.`, action: 'Run fewer initiatives at once, or invest in People & Talent.', why: 'Low culture reduces how much change the teams can absorb.' };
  else if (load >= 0.8 * cap && load > 0) People = { role: 'People', observation: `Last quarter’s workload (${i0(load)}) was close to our capacity (${i0(cap)}).`, action: 'Fund fewer areas this quarter.', why: 'Overloaded teams waste part of every investment.' };
  else People = { role: 'People', observation: `Culture is ${i0(culture)}; capacity is ${i0(cap)}.`, action: 'We can take on one more initiative if it matters.', why: 'There is spare capacity, but every extra area adds coordination work.' };

  // ---- Growth
  const gr = sig('Growth'), grWas = was('Growth');
  const ret = gr['growth-retention'] ?? s.commercial.consumerRetention, cac = gr['growth-cac'] ?? s.commercial.consumerCacIndex, pipe = gr['growth-pipeline'] ?? s.commercial.enterprisePipeline, win = gr['growth-win-rate'];
  const consumer = gr['growth-consumer-revenue'] ?? s.segmentRevenue.consumer;
  let Growth: ExecutiveView;
  if (opp) Growth = { role: 'Growth', observation: `The contract is worth ${m0(opp.acv)} a year.`, action: 'Accept if delivery will not hurt service to existing customers.', why: 'One large client can bring revenue and references, but also concentration.' };
  else if (spec?.crisis) Growth = { role: 'Growth', observation: `Consumer retention is ${ret.toFixed(1)}%; the enterprise pipeline is ${m0(pipe)}.`, action: 'Choose a response that protects customers and references.', why: 'Lost customers are slow and expensive to win back.' };
  else if (grWas['growth-retention'] !== undefined && ret < grWas['growth-retention']! - 1) Growth = { role: 'Growth', observation: `Consumer retention fell from ${grWas['growth-retention']!.toFixed(1)}% to ${ret.toFixed(1)}%.`, action: 'Protect existing subscribers before chasing new ones.', why: 'Keeping a customer is usually cheaper than winning one.' };
  else if (cac > 110) Growth = { role: 'Growth', observation: `The customer acquisition cost index is ${i0(cac)} (100 = the cost at the start).`, action: 'Shift effort from winning consumers towards retention or enterprise.', why: 'Each new consumer now costs more to win.' };
  else if (grWas['growth-pipeline'] !== undefined && pipe > grWas['growth-pipeline']! * 1.1) Growth = { role: 'Growth', observation: `The enterprise pipeline grew to ${m0(pipe)}${win !== undefined ? ` (win rate ${win.toFixed(0)}%)` : ''}.`, action: 'Fund Enterprise sales & Customer Success to convert it.', why: 'Pipeline only becomes revenue if we can win and serve it.' };
  else Growth = { role: 'Growth', observation: `Consumer revenue is ${m1(consumer)} a quarter; retention is ${ret.toFixed(1)}%.`, action: 'Keep funding Consumer growth to protect our largest revenue line.', why: `Consumers bring ${s.revenue > 0 ? ((consumer / s.revenue) * 100).toFixed(0) : '—'}% of revenue.` };

  return [CEO, CFO, Product, People, Growth];
}
