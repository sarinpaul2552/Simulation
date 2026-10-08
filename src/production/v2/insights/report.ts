/**
 * FINAL LEARNING REPORT (Batch 7 · 7C)
 *
 * Explains the team's performance from its own recorded game. Scores come only from the frozen engineV2Scoring.
 * Strengths, weaknesses and pivotal decisions are reported only when the team's data supports them (each item
 * carries its evidence). Optional counterfactuals replay the SAME engine with one decision changed and every other
 * decision kept; when a later decision would no longer be valid, no counterfactual is shown.
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { scoreV2Company, V2TerminalScore } from '../../../simulation/engineV2Scoring';
import { V2_DESTINATIONS } from '../../../simulation/engineV2Destination';
import type { V2CrisisResponseId } from '../../../simulation/engineV2Crisis';
import { replayInputs, validateQuarterInput, initializeGame, resolveQuarter } from '../adapter';
import type { V2GameSnapshot } from '../snapshot';
import type { V2PlayerQuarterInput } from '../types';
import { QUARTER_CARDS } from '../content/scenarioContent';
import { V2PresentationMode, pick, mt } from '../content/modes';
import { gameHistory, startingCompany } from './history';
import { quarterImpacts } from './explain';

const moved = (label: string, a: number, b: number) => Math.abs(a - b) < 0.5 ? `${label} held at ${b.toFixed(0)}` : `${label} moved from ${a.toFixed(0)} to ${b.toFixed(0)}`;
const fmtM = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(1)}M`;
const CAP_LABEL: Record<string, string> = { consumer: 'Consumer', enterprise: 'Enterprise', customerSuccess: 'Customer Success', ai: 'AI/Product', talent: 'Talent', credential: 'Credential', execution: 'Execution', growth: 'Growth' };
const BUCKETS: Record<string, string> = { consumer: 'Consumer', enterprise: 'Enterprise', aiProduct: 'AI/Product', people: 'People', universityCredentials: 'University', cashReserve: 'Cash reserve' };
const FINAL: Record<string, string> = {
  'continue': 'continue on the current course', 'scale-independently': 'scale independently', 'raise-growth-capital': 'raise growth capital',
  'acquire-consolidate': 'acquire a competitor', 'strategic-sale': 'sell the company', 'stabilize-restructure': 'stabilize and restructure',
};

export interface DimensionExplain { id: 'financial' | 'strategic' | 'organizational'; label: string; score: number; measures: string; components: { label: string; score: number }[] }
export interface TimelineEntry { quarter: number; event: string; decision: string; revenue: number; operatingProfit: number; cash: number; consequence: string }
export interface Finding { title: string; evidence: string }
export interface PivotalDecision { quarter: number; decision: string; immediate: string; longerTerm: string; counterfactual?: string }
export interface LearningReport {
  score: V2TerminalScore;
  dimensions: DimensionExplain[];
  timeline: TimelineEntry[];
  strengths: Finding[];
  struggles: Finding[];
  pivotal: PivotalDecision[];
  tradeoffs: { title: string; text: string }[];
}

function managementText(m: NonNullable<V2PlayerQuarterInput['management']>): string {
  const out: string[] = [];
  if (m.workforceReduction) out.push(`${m.workforceReduction.depth} workforce reduction${m.workforceReduction.protectRnD ? ' (R&D protected)' : ''}`);
  if (m.hiringFreeze) out.push('hiring freeze');
  if (m.pricing) out.push(m.pricing === 'raise' ? 'price increase' : 'price discount');
  if (m.closeWeakOfferings) out.push('closed weak offerings');
  const rest = Object.keys(m).filter(k => !['workforceReduction', 'hiringFreeze', 'pricing', 'closeWeakOfferings'].includes(k));
  if (rest.length) out.push(rest.join(', '));
  return out.join(', ') || 'none';
}

export function decisionSummary(input: V2PlayerQuarterInput): string {
  const a = input.allocation;
  const ranked = (['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const).filter(b => a[b] > 0).sort((x, y) => a[y] - a[x]);
  const parts: string[] = [];
  if (ranked.length) parts.push(`Invested mostly in ${ranked.slice(0, 2).map(b => `${BUCKETS[b]} (${fmtM(a[b])})`).join(' and ')}`);
  if (a.cashReserve > 0.05) parts.push(`kept ${fmtM(a.cashReserve)} in reserve`);
  if (input.destination) parts.push(`committed to ${V2_DESTINATIONS[input.destination].name}`);
  if (input.opportunity) parts.push(input.opportunity.accept ? 'accepted the global contract' : 'declined the global contract');
  if (input.management && Object.keys(input.management).length) parts.push(`recession actions: ${managementText(input.management)}`);
  if (input.financing?.length) parts.push(`financing: ${input.financing.map(f => f.kind + ('amount' in f ? ` ${fmtM(f.amount)}` : '')).join(', ')}`);
  if (input.crisisResponse) parts.push(`crisis response: ${input.crisisResponse}`);
  if (input.finalOption) parts.push(`chose to ${FINAL[input.finalOption]}`);
  return parts.join('; ');
}

const DIM_MEASURES = {
  financial: mt('Growth, profit margin, cash, debt, ownership and the value of the company.', 'Revenue growth and quality, Q8 margin, net cash, leverage, dilution and shareholder value.'),
  strategic: mt('How strong you are where you chose to compete, how consistent your strategy was, and the options you earned.', 'Capability strength in the chosen focus, destination coherence, market position, adaptability and optionality.'),
  organizational: mt('The health of your people: talent, culture, trust and capacity to execute.', 'Talent, culture, trust, execution and organizational capacity at Q8.'),
};

function findings(s: V2TeamState, history: ReturnType<typeof gameHistory>): { strengths: Finding[]; struggles: Finding[] } {
  const s0 = startingCompany();
  const strengths: (Finding & { w: number })[] = [];
  const struggles: (Finding & { w: number })[] = [];
  const revGrowth = s.revenue / s0.revenue - 1;
  if (revGrowth >= 0.05) strengths.push({ w: revGrowth * 100, title: 'Grew revenue', evidence: `Quarterly revenue rose from ${fmtM(s0.revenue)} to ${fmtM(s.revenue)} (+${(revGrowth * 100).toFixed(1)}%).` });
  if (revGrowth <= -0.02) struggles.push({ w: -revGrowth * 100, title: 'Revenue declined', evidence: `Quarterly revenue fell from ${fmtM(s0.revenue)} to ${fmtM(s.revenue)} (${(revGrowth * 100).toFixed(1)}%).` });
  const invested = history.reduce((t, h) => t + h.consequence.ledger.strategicInvestment, 0);
  if (revGrowth < 0.02 && invested > 150) struggles.push({ w: 6, title: 'Revenue did not grow despite heavy investment', evidence: `${fmtM(invested)} of strategic investment over eight quarters; revenue changed ${(revGrowth * 100).toFixed(1)}%.` });
  const recession = history.filter(h => h.quarter >= 6);
  const minCash = Math.min(...recession.map(h => h.after.cash));
  if (recession.length && !s.solvency.everInsolvent && !recession.some(h => h.after.solvency.distressed) && minCash >= 25) strengths.push({ w: 8, title: 'Maintained liquidity through the recession', evidence: `Cash never fell below ${fmtM(minCash)} from Q6 onward and the company was never distressed.` });
  if (s.solvency.everInsolvent) struggles.push({ w: 12, title: 'Ran out of cash', evidence: `The company was insolvent in ${s.solvency.insolventQuarters} quarter(s).` });
  else if (history.some(h => h.after.solvency.distressed)) struggles.push({ w: 9, title: 'Fell into financial distress', evidence: `Lenders treated the company as distressed (lowest cash ${fmtM(Math.min(...history.map(h => h.after.cash)))}).` });
  const capGains = Object.entries(s.capabilities).map(([k, v]) => ({ k, d: v - (s0.capabilities as unknown as Record<string, number>)[k] })).sort((a, b) => b.d - a.d);
  if (capGains[0].d >= 20) strengths.push({ w: capGains[0].d / 3, title: `Built strong ${CAP_LABEL[capGains[0].k] ?? capGains[0].k} capability`, evidence: `${CAP_LABEL[capGains[0].k] ?? capGains[0].k} rose by ${capGains[0].d.toFixed(0)} points (to ${(s.capabilities as unknown as Record<string, number>)[capGains[0].k].toFixed(0)}).` });
  const dRet = s.commercial.consumerRetention - s0.commercial.consumerRetention;
  if (dRet >= 2) strengths.push({ w: dRet * 2, title: 'Improved customer retention', evidence: `Consumer retention rose from ${s0.commercial.consumerRetention.toFixed(1)}% to ${s.commercial.consumerRetention.toFixed(1)}%.` });
  if (dRet <= -2) struggles.push({ w: -dRet * 2, title: 'Customer retention deteriorated', evidence: `Consumer retention fell from ${s0.commercial.consumerRetention.toFixed(1)}% to ${s.commercial.consumerRetention.toFixed(1)}%.` });
  const overloaded = history.filter(h => (h.consequence.capability as unknown as { loadToCapacityRatio: number }).loadToCapacityRatio > 1);
  if (overloaded.length) struggles.push({ w: 4 + overloaded.length * 2, title: 'Organization was overstretched', evidence: `Change load exceeded capacity in ${overloaded.map(h => 'Q' + h.quarter).join(', ')}, so investments matured more slowly.` });
  const dCulture = s.culture - s0.culture;
  if (dCulture <= -6) struggles.push({ w: -dCulture, title: 'Culture weakened', evidence: `Culture fell from ${s0.culture.toFixed(0)} to ${s.culture.toFixed(0)}.` });
  if (dCulture >= 0 && s.capabilities.talent >= s0.capabilities.talent + 10) strengths.push({ w: 6, title: 'Built organizational resilience', evidence: `Talent rose to ${s.capabilities.talent.toFixed(0)} while culture held at ${s.culture.toFixed(0)}.` });
  if (s.financing.debt > 0 && revGrowth < 0.03) struggles.push({ w: 5, title: 'Debt increased without enough commercial progress', evidence: `Debt of ${fmtM(s.financing.debt)} at Q8 while revenue changed ${(revGrowth * 100).toFixed(1)}%.` });
  const margin = s.revenue > 0 ? s.operatingProfit / s.revenue : 0, m0 = s0.operatingProfit / s0.revenue;
  if (margin - m0 >= 0.02) strengths.push({ w: (margin - m0) * 200, title: 'Improved profitability', evidence: `Operating margin rose from ${(m0 * 100).toFixed(1)}% to ${(margin * 100).toFixed(1)}%.` });
  if (margin - m0 <= -0.03) struggles.push({ w: (m0 - margin) * 200, title: 'Profitability fell', evidence: `Operating margin fell from ${(m0 * 100).toFixed(1)}% to ${(margin * 100).toFixed(1)}%.` });
  const earned = s.final.record?.availability.filter(o => o.available).length ?? 0;
  if (earned >= 4) strengths.push({ w: 5, title: 'Earned many strategic options', evidence: `${earned} of 6 final options were open to the company at Q8.` });
  if (s.final.record && earned <= 2) struggles.push({ w: 5, title: 'Few strategic options at the end', evidence: `Only ${earned} of 6 final options were open at Q8.` });
  const top = (xs: (Finding & { w: number })[]) => xs.sort((a, b) => b.w - a.w).slice(0, 3).map(({ title, evidence }) => ({ title, evidence }));
  return { strengths: top(strengths), struggles: top(struggles) };
}

/** Replay with one quarter's input replaced; null when any later committed decision is no longer valid. */
function counterfactual(inputs: V2PlayerQuarterInput[], quarter: number, alt: V2PlayerQuarterInput): V2TeamState | null {
  let snap = initializeGame();
  for (const inp of inputs) {
    const use = inp.quarter === quarter ? alt : inp;
    if (validateQuarterInput(snap, use).length) return null;
    snap = resolveQuarter(snap, use).snapshot;
  }
  return snap.state;
}

function pivotalDecisions(snap: V2GameSnapshot, mode: V2PresentationMode): PivotalDecision[] {
  const h = gameHistory(snap);
  const inputs = snap.inputs;
  const s = snap.state;
  const out: PivotalDecision[] = [];
  const q4 = h[3];
  if (q4?.input.destination && q4.after.destination) {
    const d = q4.after.destination;
    out.push({
      quarter: 4,
      decision: `Committed to ${V2_DESTINATIONS[d.id].name}.`,
      immediate: `Readiness at commitment was ${(d.readinessAtCommit * 100).toFixed(0)}%, adding ${d.transition.loadPerQuarter.toFixed(1)} points of change load per quarter for three quarters.`,
      longerTerm: `It set the crisis you faced in Q7 (“${s.crisis.record?.assessment.title ?? '—'}”) and the strategic focus behind your Q8 options.`,
    });
  }
  const q5 = h[4];
  if (q5?.input.opportunity) {
    const accept = q5.input.opportunity.accept;
    const upfront = q5.consequence.ledger.eventCostItems.filter(i => i.description.includes('[opportunity]')).reduce((t, i) => t + i.amount, 0);
    const alt = counterfactual(inputs, 5, { ...q5.input, opportunity: { ...q5.input.opportunity, accept: !accept } });
    out.push({
      quarter: 5,
      decision: accept ? 'Accepted the $48M global contract.' : 'Declined the $48M global contract.',
      immediate: accept ? `Paid ${fmtM(upfront)} upfront and took on a delivery team and extra workload.` : 'Kept cash, people and roadmap focused on your own strategy.',
      longerTerm: `Enterprise revenue went from ${fmtM(q5.before.segmentRevenue.enterprise)} (Q4) to ${fmtM(s.segmentRevenue.enterprise)} (Q8).`,
      counterfactual: alt ? pick(mode, mt(
        `Replaying your game with the opposite choice (everything else the same): Q8 revenue ${fmtM(alt.revenue)} instead of ${fmtM(s.revenue)}, cash ${fmtM(alt.cash)} instead of ${fmtM(s.cash)}.`,
        `Counterfactual replay (same engine, all other decisions unchanged): Q8 revenue ${fmtM(alt.revenue)} vs ${fmtM(s.revenue)}; cash ${fmtM(alt.cash)} vs ${fmtM(s.cash)}; operating profit ${fmtM(alt.operatingProfit)} vs ${fmtM(s.operatingProfit)}.`)) : undefined,
    });
  }
  const q6 = h[5];
  if (q6 && ((q6.input.management && Object.keys(q6.input.management).length) || q6.input.financing?.length)) {
    out.push({
      quarter: 6,
      decision: `Recession response: ${decisionSummary({ ...q6.input, allocation: { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0 } }) || 'no special actions'}.`,
      immediate: [`Cash ended Q6 at ${fmtM(q6.after.cash)}`,
        q6.consequence.managementSummary.savingsPerQuarter > 0.05 ? `cost savings of ${fmtM(q6.consequence.managementSummary.savingsPerQuarter)}/quarter` : '',
        q6.consequence.managementSummary.oneOffCost > 0.05 ? `one-off cost of ${fmtM(q6.consequence.managementSummary.oneOffCost)}` : ''].filter(Boolean).join('; ') + '.',
      longerTerm: `${moved('Culture', q6.before.culture, s.culture)} and ${moved('talent', q6.before.capabilities.talent, s.capabilities.talent)} by Q8.`,
    });
  }
  const q7 = h[6];
  if (q7?.input.crisisResponse && q7.consequence.crisisAssessment) {
    const a = q7.consequence.crisisAssessment;
    const others = (['remediate', 'contain', 'absorb'] as V2CrisisResponseId[]).filter(r => r !== q7.input.crisisResponse);
    const alts = others.map(r => ({ r, st: counterfactual(inputs, 7, { ...q7.input, crisisResponse: r }) })).filter(x => x.st);
    const label = (id: string) => a.responses.find(x => x.id === id)?.label ?? id;
    out.push({
      quarter: 7,
      decision: `Crisis “${a.title}”: chose ${label(q7.input.crisisResponse)}.`,
      immediate: `Severity ${(a.severity * 100).toFixed(0)}%; cash cost ${fmtM(a.responses.find(x => x.id === q7.input.crisisResponse)?.cash ?? 0)}; trust ${q7.before.trust.toFixed(0)} → ${q7.after.trust.toFixed(0)}.`,
      longerTerm: `By Q8 trust was ${s.trust.toFixed(0)} and revenue ${fmtM(s.revenue)}.`,
      counterfactual: alts.length ? `Replaying with other responses (all else equal): ${alts.map(x => `${label(x.r)} → Q8 revenue ${fmtM(x.st!.revenue)}, cash ${fmtM(x.st!.cash)}, trust ${x.st!.trust.toFixed(0)}`).join('; ')}.` : undefined,
    });
  }
  // Keep the three with the largest Q8 cash/revenue spread (or the destination + two most recent)
  return out.slice(0, 3);
}

function tradeoffs(snap: V2GameSnapshot, mode: V2PresentationMode): { title: string; text: string }[] {
  const h = gameHistory(snap);
  const s = snap.state;
  const out: { title: string; text: string }[] = [];
  const shares = h.map(x => { const a = x.input.allocation; const inv = a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials; return inv > 0 ? Math.max(a.consumer, a.enterprise, a.aiProduct, a.people, a.universityCredentials) / inv : 0; });
  const focus = shares.reduce((t, x) => t + x, 0) / Math.max(1, shares.length);
  out.push({ title: 'Focus versus diversification', text: pick(mode, focus > 0.6
    ? mt('You concentrated your investment. Focus builds strength quickly but leaves you exposed if the market moves elsewhere. What evidence would have told you to spread your bets?', 'Your allocation was concentrated (average top-bucket share ' + (focus * 100).toFixed(0) + '%). Concentration compounds capability but raises exposure to a wrong thesis. Which signal would have justified hedging?')
    : mt('You spread your investment. Diversification lowers risk but may leave no area strong enough to win. Where would concentrating have helped?', 'Your allocation was diversified (average top-bucket share ' + (focus * 100).toFixed(0) + '%). Breadth reduces downside but can starve any single capability of critical mass. Where was the opportunity cost highest?')) });
  const minCash = Math.min(...h.map(x => x.after.cash));
  out.push({ title: 'Growth versus liquidity', text: pick(mode, minCash < 25
    ? mt(`Your cash fell as low as ${fmtM(minCash)}. Growth needs money, but running low limits your choices later. When would slowing down have been worth it?`, `Cash troughed at ${fmtM(minCash)}. Investment intensity constrained later optionality — when does liquidity become a strategic asset rather than idle capital?`)
    : mt(`Your cash never fell below ${fmtM(minCash)}. Safety gives options, but unused cash does not build capabilities. Could you have invested more?`, `Cash never fell below ${fmtM(minCash)}. Was that buffer optionality — or under-investment in capability?`)) });
  const overloaded = h.filter(x => (x.consequence.capability as unknown as { loadToCapacityRatio: number }).loadToCapacityRatio > 1).length;
  out.push({ title: 'Speed versus execution capacity', text: pick(mode, overloaded
    ? mt(`Your teams were overloaded in ${overloaded} quarter(s), so investments delivered less than planned. Doing fewer things at once can deliver more.`, `Load exceeded capacity in ${overloaded} quarter(s): parallel initiatives destroyed part of their own value. How would sequencing have changed the outcome?`)
    : mt('Your teams kept up with the change you asked of them. Could they have handled a faster pace?', 'Load stayed within capacity throughout. Was there unused execution headroom you could have deployed?')) });
  out.push({ title: 'Short-term results versus capability building', text: pick(mode, mt('Investments take one to three quarters to pay off. Look at your journey: which quarter’s results came from decisions made much earlier?', 'Capability investments mature with a lag of 1–3 quarters. Trace one result in your journey back to the investment that caused it — how did that lag affect your board narrative?')) });
  const readiness = s.destination?.readinessAtCommit ?? 0;
  out.push({ title: 'Strategic conviction versus adaptation', text: pick(mode, readiness < 0.5
    ? mt('You committed to a strategy your skills only partly supported. Conviction can pay off, but changing direction is slow. What would you have needed to see before committing?', `You committed with ${(readiness * 100).toFixed(0)}% readiness. Conviction ahead of capability lengthens the transition — what evidence would have justified waiting or choosing differently?`)
    : mt('Your strategy matched the skills you had built. How did you decide which new evidence to act on and which to ignore?', `You committed with ${(readiness * 100).toFixed(0)}% readiness. Given the conflicting evidence in Q2–Q3, how did the team separate signal from noise?`)) });
  return out;
}

export function buildLearningReport(snap: V2GameSnapshot, mode: V2PresentationMode): LearningReport {
  const s = snap.state;
  const score = scoreV2Company(s);
  const h = gameHistory(snap);
  const dims: DimensionExplain[] = (['financial', 'strategic', 'organizational'] as const).map(id => ({
    id, label: id === 'financial' ? 'Financial' : id === 'strategic' ? 'Strategic' : 'Organizational', score: score[id], measures: pick(mode, DIM_MEASURES[id]),
    components: score.components[id].map(c => ({ label: c.label, score: c.score * 100 })),
  }));
  const timeline = h.map(x => {
    const top = quarterImpacts(x.consequence, x.after, mode)[0];
    return {
      quarter: x.quarter, event: pick(mode, QUARTER_CARDS[x.quarter].headline), decision: decisionSummary(x.input),
      revenue: x.after.revenue, operatingProfit: x.after.operatingProfit, cash: x.after.cash,
      consequence: top ? top.text : `Revenue ${fmtM(x.after.revenue)}, cash ${fmtM(x.after.cash)}.`,
    };
  });
  return { score, dimensions: dims, timeline, ...findings(s, h), pivotal: pivotalDecisions(snap, mode), tradeoffs: tradeoffs(snap, mode) };
}

/** Sanity: the report never recomputes economics — it reads the replayed game (identical to the stored one). */
export const reportUsesReplay = (snap: V2GameSnapshot) => replayInputs(snap.inputs);
