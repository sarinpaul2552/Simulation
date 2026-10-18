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
import { replayInputs, validateQuarterInput, initializeGame, resolveQuarter, configOf, isV3, getFinalOutcome, type GameConfig } from '../engine';
import type { V2GameSnapshot } from '../snapshot';
import type { V2PlayerQuarterInput } from '../types';
import { quarterCardFor, contractShort, CONTRACT_LABEL } from '../content/paths';
import { V2PresentationMode, pick, mt } from '../content/modes';
import { gameHistory, startingCompany } from './history';
import { quarterImpacts } from './explain';
import { V2_DESTINATION_IDS, destinationReadiness } from '../../../simulation/engineV2Destination';

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
  /** Batch 7.5: risks arising from the chosen strategy and the observed final company. */
  vulnerabilities: Finding[];
  /** Batch 7.5: alternatives the team explicitly declined or under-funded (no invented outcomes). */
  notPursued: Finding[];
  /** Batch 7.5: "What kind of company did your team build?" */
  conclusion: string;
  /** Batch 7.5: discussion questions for every team, including high performers. */
  questions: string[];
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
  if (input.opportunity) parts.push(`${input.opportunity.accept ? 'accepted' : 'declined'} the ${contractShort(input.opportunity.offerId)}`);
  if (input.recessionStance) parts.push(`recession stance: ${input.recessionStance}`);
  if (input.management && Object.keys(input.management).length) parts.push(`recession actions: ${managementText(input.management)}`);
  if (input.financing?.length) parts.push(`financing: ${input.financing.map(f => f.kind + ('amount' in f ? ` ${fmtM(f.amount)}` : '')).join(', ')}`);
  if ((input.expansion ?? 0) > 0) parts.push(`expanded the investment budget by ${fmtM(input.expansion!)}`);
  if (input.crisisResponse) parts.push(`crisis response: ${input.crisisResponse}`);
  if (input.finalOption) parts.push(`chose to ${FINAL[input.finalOption]}`);
  return parts.join('; ');
}

const DIM_MEASURES = {
  financial: mt('Growth, profit margin, cash, debt, ownership and the value of the company.', 'Revenue growth and quality, final-quarter margin, net cash, leverage, dilution and shareholder value.'),
  strategic: mt('How strong you are where you chose to compete, how consistent your strategy was, and the options you earned.', 'Capability strength in the chosen focus, destination coherence, market position, adaptability and optionality.'),
  organizational: mt('The health of your people: talent, culture, trust and capacity to execute.', 'Talent, culture, trust, execution and organizational capacity at the end of Q4 2024.'),
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
  if (overloaded.length) struggles.push({ w: 4 + overloaded.length * 2, title: 'Organization was overstretched', evidence: `Change load exceeded capacity in ${overloaded.map(h => 'Q' + h.quarter).join(', ')}, so part of the investment in those quarters did not turn into capability.` });
  const dCulture = s.culture - s0.culture;
  if (dCulture <= -6) struggles.push({ w: -dCulture, title: 'Culture weakened', evidence: `Culture fell from ${s0.culture.toFixed(0)} to ${s.culture.toFixed(0)}.` });
  if (dCulture >= 0 && s.capabilities.talent >= s0.capabilities.talent + 10) strengths.push({ w: 6, title: 'Built organizational resilience', evidence: `Talent rose to ${s.capabilities.talent.toFixed(0)} while culture held at ${s.culture.toFixed(0)}.` });
  if (s.financing.debt > 0 && revGrowth < 0.03) struggles.push({ w: 5, title: 'Debt increased without enough commercial progress', evidence: `Debt of ${fmtM(s.financing.debt)} at the end of Q4 2024 while revenue changed ${(revGrowth * 100).toFixed(1)}%.` });
  const margin = s.revenue > 0 ? s.operatingProfit / s.revenue : 0, m0 = s0.operatingProfit / s0.revenue;
  if (margin - m0 >= 0.02) strengths.push({ w: (margin - m0) * 200, title: 'Improved profitability', evidence: `Operating margin rose from ${(m0 * 100).toFixed(1)}% to ${(margin * 100).toFixed(1)}%.` });
  if (margin - m0 <= -0.03) struggles.push({ w: (m0 - margin) * 200, title: 'Profitability fell', evidence: `Operating margin fell from ${(m0 * 100).toFixed(1)}% to ${(margin * 100).toFixed(1)}%.` });
  const earned = s.final.record?.availability.filter(o => o.available).length ?? 0;
  if (earned >= 4) strengths.push({ w: 5, title: 'Earned many strategic options', evidence: `${earned} of 6 final options were open to the company in Q4 2024.` });
  if (s.final.record && earned <= 2) struggles.push({ w: 5, title: 'Few strategic options at the end', evidence: `Only ${earned} of 6 final options were open in Q4 2024.` });
  const top = (xs: (Finding & { w: number })[]) => xs.sort((a, b) => b.w - a.w).slice(0, 3).map(({ title, evidence }) => ({ title, evidence }));
  return { strengths: top(strengths), struggles: top(struggles) };
}

/** Replay with one quarter's input replaced; null when any later committed decision is no longer valid. */
function counterfactual(inputs: V2PlayerQuarterInput[], quarter: number, alt: V2PlayerQuarterInput, cfg: GameConfig): V2TeamState | null {
  let snap = initializeGame(cfg);
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
  const cfg = configOf(snap);
  const s = snap.state;
  const out: PivotalDecision[] = [];
  const q4 = h[3];
  if (q4?.input.destination && q4.after.destination) {
    const d = q4.after.destination;
    out.push({
      quarter: 4,
      decision: `Committed to ${V2_DESTINATIONS[d.id].name}.`,
      immediate: `Readiness at commitment was ${(d.readinessAtCommit * 100).toFixed(0)}%, adding ${d.transition.loadPerQuarter.toFixed(1)} points of change load per quarter for three quarters.`,
      longerTerm: `It set the crisis you faced in Q3 2024 (“${s.crisis.record?.assessment.title ?? '—'}”) and the strategic focus behind your final options.`,
    });
  }
  const q5 = h[4];
  if (q5?.input.opportunity) {
    const accept = q5.input.opportunity.accept;
    const upfront = q5.consequence.ledger.eventCostItems.filter(i => i.description.includes('[opportunity]')).reduce((t, i) => t + i.amount, 0);
    const alt = counterfactual(inputs, 5, { ...q5.input, opportunity: { ...q5.input.opportunity, accept: !accept } }, cfg);
    out.push({
      quarter: 5,
      decision: `${accept ? 'Accepted' : 'Declined'} the $${CONTRACT_LABEL[q5.input.opportunity.offerId]?.acv ?? ''}M ${contractShort(q5.input.opportunity.offerId)}.`,
      immediate: accept ? (q5.engine === 'v3' ? `Used ${fmtM(upfront)} of that quarter’s investment budget for implementation and took on a delivery team and extra workload.` : `Paid ${fmtM(upfront)} upfront and took on a delivery team and extra workload.`) : 'Kept cash, people and roadmap focused on your own strategy.',
      longerTerm: `Enterprise revenue went from ${fmtM(q5.before.segmentRevenue.enterprise)} (Q4 2023) to ${fmtM(s.segmentRevenue.enterprise)} (Q4 2024).`,
      counterfactual: alt ? pick(mode, mt(
        `Replaying your game with the opposite choice (everything else the same): Q4 2024 revenue ${fmtM(alt.revenue)} instead of ${fmtM(s.revenue)}, cash ${fmtM(alt.cash)} instead of ${fmtM(s.cash)}.`,
        `Counterfactual replay (same engine, all other decisions unchanged): Q4 2024 revenue ${fmtM(alt.revenue)} vs ${fmtM(s.revenue)}; cash ${fmtM(alt.cash)} vs ${fmtM(s.cash)}; operating profit ${fmtM(alt.operatingProfit)} vs ${fmtM(s.operatingProfit)}.`)) : undefined,
    });
  }
  const q6 = h[5];
  if (q6 && ((q6.input.management && Object.keys(q6.input.management).length) || q6.input.financing?.length)) {
    out.push({
      quarter: 6,
      decision: `Recession response: ${decisionSummary({ ...q6.input, allocation: { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0 } }) || 'no special actions'}.`,
      immediate: [`Cash ended Q2 2024 at ${fmtM(q6.after.cash)}`,
        q6.consequence.managementSummary.savingsPerQuarter > 0.05 ? `cost savings of ${fmtM(q6.consequence.managementSummary.savingsPerQuarter)}/quarter` : '',
        q6.consequence.managementSummary.oneOffCost > 0.05 ? `one-off cost of ${fmtM(q6.consequence.managementSummary.oneOffCost)}` : ''].filter(Boolean).join('; ') + '.',
      longerTerm: `${moved('Culture', q6.before.culture, s.culture)} and ${moved('talent', q6.before.capabilities.talent, s.capabilities.talent)} by Q4 2024.`,
    });
  }
  const q7 = h[6];
  if (q7?.input.crisisResponse && q7.consequence.crisisAssessment) {
    const a = q7.consequence.crisisAssessment;
    const others = (['remediate', 'contain', 'absorb'] as V2CrisisResponseId[]).filter(r => r !== q7.input.crisisResponse);
    const alts = others.map(r => ({ r, st: counterfactual(inputs, 7, { ...q7.input, crisisResponse: r }, cfg) })).filter(x => x.st);
    const label = (id: string) => a.responses.find(x => x.id === id)?.label ?? id;
    out.push({
      quarter: 7,
      decision: `Crisis “${a.title}”: chose ${label(q7.input.crisisResponse)}.`,
      immediate: `Severity ${(a.severity * 100).toFixed(0)}%; cash cost ${fmtM(a.responses.find(x => x.id === q7.input.crisisResponse)?.cash ?? 0)}; trust ${q7.before.trust.toFixed(0)} → ${q7.after.trust.toFixed(0)}.`,
      longerTerm: `By Q4 2024 trust was ${s.trust.toFixed(0)} and revenue ${fmtM(s.revenue)}.`,
      counterfactual: alts.length ? `Replaying with other responses (all else equal): ${alts.map(x => `${label(x.r)} → Q4 2024 revenue ${fmtM(x.st!.revenue)}, cash ${fmtM(x.st!.cash)}, trust ${x.st!.trust.toFixed(0)}`).join('; ')}.` : undefined,
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
  // V3 games are scored by their own engine version (V3.1 Stage 3C-A: v3-econ-1.1 scoring differs from 1.0); V2 unchanged.
  const score = isV3(snap) ? getFinalOutcome(snap).score : scoreV2Company(s);
  const h = gameHistory(snap);
  const dims: DimensionExplain[] = (['financial', 'strategic', 'organizational'] as const).map(id => ({
    id, label: id === 'financial' ? 'Financial' : id === 'strategic' ? 'Strategic' : 'Organizational', score: score[id], measures: pick(mode, DIM_MEASURES[id]),
    components: score.components[id].map(c => ({ label: c.label, score: c.score * 100 })),
  }));
  const timeline = h.map(x => {
    const top = quarterImpacts(x.consequence, x.after, mode)[0];
    return {
      quarter: x.quarter, event: pick(mode, quarterCardFor(x.quarter, x.path).headline), decision: decisionSummary(x.input),
      revenue: x.after.revenue, operatingProfit: x.after.operatingProfit, cash: x.after.cash,
      consequence: top ? top.text : `Revenue ${fmtM(x.after.revenue)}, cash ${fmtM(x.after.cash)}.`,
    };
  });
  const vulnerabilities = strategicVulnerabilities(s);
  const notPursued = alternativesNotPursued(snap);
  return {
    score, dimensions: dims, timeline, ...findings(s, h), pivotal: pivotalDecisions(snap, mode), tradeoffs: tradeoffs(snap, mode),
    vulnerabilities, notPursued, conclusion: companyConclusion(snap, mode), questions: discussionQuestions(score, vulnerabilities, notPursued),
  };
}

/** Sanity: the report never recomputes economics — it reads the replayed game (identical to the stored one). */
export const reportUsesReplay = (snap: V2GameSnapshot) => replayInputs(snap.inputs, configOf(snap));

// ------------------------------------------------------------------------------------------------------------------ //
// Batch 7.5 interpretation
// ------------------------------------------------------------------------------------------------------------------ //

const SEGMENT_LABEL: Record<string, string> = { consumer: 'Consumer', enterprise: 'Enterprise', university: 'University', aiNative: 'AI-native products' };
const BUCKET_CAP: Record<string, keyof V2TeamState['capabilities']> = { consumer: 'consumer', enterprise: 'enterprise', aiProduct: 'ai', people: 'talent', universityCredentials: 'credential' };

/** Risks visible in the final company, tied to the chosen strategy. Only reported when the data shows them. */
export function strategicVulnerabilities(s: V2TeamState): Finding[] {
  const out: (Finding & { w: number })[] = [];
  const seg = Object.entries(s.segmentRevenue).sort((a, b) => b[1] - a[1]);
  const total = seg.reduce((t, [, v]) => t + v, 0);
  if (total > 0 && seg[0][1] / total >= 0.65) out.push({ w: seg[0][1] / total * 10, title: `Revenue depends on ${SEGMENT_LABEL[seg[0][0]] ?? seg[0][0]}`, evidence: `${((seg[0][1] / total) * 100).toFixed(0)}% of final-quarter revenue comes from one business (${fmtM(seg[0][1])} of ${fmtM(total)}).` });
  if (s.destination) {
    const def = V2_DESTINATIONS[s.destination.id];
    for (const b of def.alignedBuckets) {
      const key = BUCKET_CAP[b];
      const v = s.capabilities[key];
      if (v < 50) out.push({ w: (50 - v) / 3 + 4, title: `${def.name} relies on a weak capability`, evidence: `The strategy depends on ${CAP_LABEL[key] ?? key}, which ended at ${v.toFixed(0)}/100.` });
    }
    if ((s.destination.id === 'consumer-ai' || s.destination.id === 'enterprise-ai') && s.commercial.aiCommercialReadiness < 50) out.push({ w: 7, title: 'An AI strategy with limited AI readiness', evidence: `AI commercial readiness ended at ${s.commercial.aiCommercialReadiness.toFixed(0)}/100.` });
  }
  if (s.cash < 40) out.push({ w: (40 - s.cash) / 4 + 4, title: 'Thin cash buffer', evidence: `Final cash of ${fmtM(s.cash)} is below the ${fmtM(40)} comfort level; a further shock would need new financing.` });
  if (s.financing.debt > 0) out.push({ w: 3 + s.financing.debt / 10, title: 'Carrying debt', evidence: `${fmtM(s.financing.debt)} of debt at ${(s.financing.interestRate * 100).toFixed(1)}% per quarter.` });
  if (s.financing.ownership < 0.85) out.push({ w: 4, title: 'Diluted ownership', evidence: `Original shareholders own ${(s.financing.ownership * 100).toFixed(0)}% of the company.` });
  if (s.culture < 65) out.push({ w: (65 - s.culture) / 2 + 3, title: 'Fragile culture', evidence: `Culture ended at ${s.culture.toFixed(0)} (started 72): less capacity to absorb the next change.` });
  if (s.capabilities.talent < 50) out.push({ w: 4, title: 'Thin talent bench', evidence: `Talent ended at ${s.capabilities.talent.toFixed(0)}/100.` });
  if (s.trust < 60) out.push({ w: 5, title: 'Low customer trust', evidence: `Trust ended at ${s.trust.toFixed(0)}/100.` });
  if (s.commercial.consumerRetention < 80) out.push({ w: 4, title: 'Customers are leaving faster', evidence: `Consumer retention ended at ${s.commercial.consumerRetention.toFixed(1)}%.` });
  if (!out.length) {
    // No acute exposure: name the least-developed capability, which is where a market shift would hurt first.
    const weakest = Object.entries(s.capabilities).sort((a, b) => a[1] - b[1])[0];
    if (weakest && weakest[1] < 60) out.push({ w: 1, title: `${CAP_LABEL[weakest[0]] ?? weakest[0]} is your least-developed capability`, evidence: `${CAP_LABEL[weakest[0]] ?? weakest[0]} ended at ${weakest[1].toFixed(0)}/100 — the area least able to respond if the market moved toward it.` });
  }
  return out.sort((a, b) => b.w - a.w).slice(0, 3).map(({ title, evidence }) => ({ title, evidence }));
}

/** Alternatives the team declined or barely funded — described, never valued. */
export function alternativesNotPursued(snap: V2GameSnapshot): Finding[] {
  const h = gameHistory(snap);
  const s = snap.state;
  const out: Finding[] = [];
  const q5 = h[4];
  if (q5?.input.opportunity && !q5.input.opportunity.accept && q5.consequence.opportunityTerms) {
    const t = q5.consequence.opportunityTerms;
    out.push({ title: `Declined the ${fmtM(t.acv)} contract`, evidence: `The offer fitted your company at ${(t.fit.fit * 100).toFixed(0)}% and would have needed ${fmtM(t.upfrontCash)} upfront.` });
  }
  const q4 = h[3];
  if (q4?.input.destination) {
    const ranked = V2_DESTINATION_IDS.map(id => ({ id, r: destinationReadiness(id, q4.before).readiness })).sort((a, b) => b.r - a.r);
    const chosen = ranked.find(x => x.id === q4.input.destination)!;
    if (ranked[0].id !== chosen.id && ranked[0].r - chosen.r >= 0.1) out.push({ title: `Did not choose ${V2_DESTINATIONS[ranked[0].id].name}`, evidence: `In Q4 2023 your skills fitted it best (${(ranked[0].r * 100).toFixed(0)}% ready); you chose ${V2_DESTINATIONS[chosen.id].name} (${(chosen.r * 100).toFixed(0)}%).` });
  }
  const totals: Record<string, number> = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0 };
  for (const x of h) for (const k of Object.keys(totals)) totals[k] += (x.input.allocation as unknown as Record<string, number>)[k];
  const invested = Object.values(totals).reduce((a, b) => a + b, 0);
  const low = Object.entries(totals).filter(([, v]) => invested > 0 && v / invested < 0.05).sort((a, b) => a[1] - b[1]);
  for (const [k, v] of low.slice(0, 2)) out.push({ title: `Little investment in ${BUCKETS[k]}`, evidence: `${fmtM(v)} over eight quarters (${((v / invested) * 100).toFixed(0)}% of your investment); ${CAP_LABEL[BUCKET_CAP[k]] ?? k} ended at ${s.capabilities[BUCKET_CAP[k]].toFixed(0)}.` });
  const rec = s.final.record;
  if (rec) {
    const others = rec.availability.filter(o => o.available && o.id !== rec.option).map(o => FINAL[o.id] ?? o.id);
    if (others.length) out.push({ title: 'Other final options you had earned', evidence: `You could also have chosen to ${others.join(', ')}.` });
  }
  return out.slice(0, 4);
}

/** "What kind of company did your team build?" — from the final state and the eight-quarter record. */
export function companyConclusion(snap: V2GameSnapshot, mode: V2PresentationMode): string {
  const s = snap.state;
  const s0 = startingCompany();
  const growth = s.revenue / s0.revenue - 1;
  const margin = s.revenue > 0 ? s.operatingProfit / s.revenue : 0;
  const caps = Object.entries(s.capabilities).sort((a, b) => b[1] - a[1]);
  const kind = s.destination ? V2_DESTINATIONS[s.destination.id].name : 'company without a committed strategy';
  const scale = growth >= 0.1 ? 'fast-growing' : growth >= 0.03 ? 'growing' : growth > -0.03 ? 'stable' : 'shrinking';
  const money = s.cash >= 40 && s.financing.debt === 0 ? 'a strong balance sheet' : s.cash >= 25 ? 'an adequate cash position' : 'a thin cash position';
  const people = s.culture >= 70 && s.capabilities.talent >= 60 ? 'a healthy, capable organization' : s.culture < 65 ? 'an organization under strain' : 'an organization that held steady';
  const lead = `You built a ${scale} ${kind}: quarterly revenue ${growth >= 0 ? 'grew' : 'fell'} ${Math.abs(growth * 100).toFixed(0)}% to ${fmtM(s.revenue)} at a ${(margin * 100).toFixed(0)}% operating margin, with ${money} (${fmtM(s.cash)} of cash${s.financing.debt > 0 ? ` and ${fmtM(s.financing.debt)} of debt` : ', no debt'}).`;
  const strengths = `Its strongest capabilities are ${CAP_LABEL[caps[0][0]] ?? caps[0][0]} (${caps[0][1].toFixed(0)}) and ${CAP_LABEL[caps[1][0]] ?? caps[1][0]} (${caps[1][1].toFixed(0)}), carried by ${people}.`;
  return pick(mode, mt(`${lead} ${strengths}`, `${lead} ${strengths} Final decision: ${s.final.record ? FINAL[s.final.record.option] : '—'}.`));
}

function discussionQuestions(score: V2TerminalScore, vuln: Finding[], notPursued: Finding[]): string[] {
  const q: string[] = [];
  if (score.overall >= 70) {
    q.push('Which of your advantages would a competitor find hardest to copy — and which would they copy first?');
    q.push('Which single decision was most responsible for your result, and was it judgement or luck?');
  } else {
    q.push('Looking back, which quarter changed your trajectory most, and what did you know at the time?');
    q.push('Which early signal would you weigh differently if you played again?');
  }
  if (vuln[0]) q.push(`${vuln[0].title}: what would you do in the next two quarters to reduce this risk?`);
  if (notPursued[0]) q.push(`${notPursued[0].title}: under what conditions would that have been the better choice?`);
  q.push('If a new CEO took over tomorrow, what would you tell them is the company’s biggest unresolved question?');
  return q.slice(0, 5);
}
