/**
 * Q8 BOARD VERDICT AND EVIDENCE-BASED BOARD DEFENSE (Batch 8.1)
 *
 * Five dimensions, each assessed Strong / Mixed / Weak by the documented rules in VERDICT_RULES using recorded
 * values only (Q4 2022 vs the final quarter, and the trend over the last two quarters). No new score is created: the
 * words are a reading of the KPI evidence shown beside them.
 *
 * Board-defense prompts cite recorded evidence. A prompt never says an investment "failed" unless the recorded
 * results support it (money invested in a business whose revenue ended below its Q4 2022 level).
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { destinationReadiness, V2_DESTINATIONS } from '../../../simulation/engineV2Destination';
import { startingCompany, type QuarterRecord } from './history';
import { valuationSeries } from './valuation';
import { STRATEGY_SEGMENTS } from './executive';
import { BUCKET_INFO, BUCKETS } from './consequences';
import { calendarLabel } from '../content/calendar';

export type Assessment = 'Strong' | 'Mixed' | 'Weak';
export interface Evidence { label: string; start: string; end: string; trend: 'improving' | 'deteriorating' | 'stable' }
export interface Dimension { id: string; label: string; assessment: Assessment; summary: string; evidence: Evidence[]; rule: string }

const m = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(1)}M`;
const pc = (x: number) => `${(x * 100).toFixed(1)}%`;
const n0 = (x: number) => x.toFixed(0);
const margin = (s: V2TeamState) => (s.revenue > 0 ? s.operatingProfit / s.revenue : 0);
const load = (s: V2TeamState) => (s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0);
const trend = (now: number, before: number, eps: number, higherBetter = true): Evidence['trend'] => (Math.abs(now - before) < eps ? 'stable' : (now > before) === higherBetter ? 'improving' : 'deteriorating');

export const VERDICT_RULES: Record<string, string> = {
  financial: 'Strong: liquidity healthy, cash ≥ $40M and margin at or above Q4 2022. Weak: liquidity warning, distress or insolvency, or margin more than 3 pts below Q4 2022. Otherwise Mixed.',
  commercial: 'Strong: revenue ≥ 10% above Q4 2022 and consumer retention at or above Q4 2022. Weak: revenue below Q4 2022. Otherwise Mixed.',
  product: 'Strong: product quality ≥ 5 above Q4 2022 and trust at or above Q4 2022. Weak: product quality below Q4 2022 or trust more than 5 below. Otherwise Mixed.',
  organization: 'Strong: culture within 2 of Q4 2022, talent at or above Q4 2022 and change load ≤ 95% of capacity. Weak: culture more than 8 below Q4 2022 or load above 110%. Otherwise Mixed.',
  strategy: 'Strong: readiness of the committed strategy ≥ 70% and its target businesses grew ≥ 10%. Weak: readiness below 40% or the target businesses shrank. Otherwise Mixed.',
};

export function boardVerdict(history: QuarterRecord[]): Dimension[] {
  const s0 = startingCompany();
  const s = history[history.length - 1].after;
  const sp = history.length >= 3 ? history[history.length - 3].after : s0; // trend over the last two quarters
  const fin: Assessment = s.solvency.everInsolvent || s.solvency.distressed || s.solvency.status === 'warning' || s.solvency.status === 'insolvent' || margin(s) < margin(s0) - 0.03 ? 'Weak'
    : s.solvency.status === 'healthy' && s.cash >= 40 && margin(s) >= margin(s0) ? 'Strong' : 'Mixed';
  const revG = s.revenue / s0.revenue - 1;
  const com: Assessment = revG < 0 ? 'Weak' : revG >= 0.1 && s.commercial.consumerRetention >= s0.commercial.consumerRetention ? 'Strong' : 'Mixed';
  const prod: Assessment = s.productQuality < s0.productQuality || s.trust < s0.trust - 5 ? 'Weak' : s.productQuality >= s0.productQuality + 5 && s.trust >= s0.trust ? 'Strong' : 'Mixed';
  const org: Assessment = s.culture < s0.culture - 8 || load(s) > 1.1 ? 'Weak' : s.culture >= s0.culture - 2 && s.capabilities.talent >= s0.capabilities.talent && load(s) <= 0.95 ? 'Strong' : 'Mixed';
  const dest = s.destination;
  const readiness = dest ? destinationReadiness(dest.id, s).readiness : 0;
  const segs = dest ? STRATEGY_SEGMENTS[dest.id] : [];
  const tgt = (x: V2TeamState) => segs.reduce((a, k) => a + x.segmentRevenue[k], 0);
  const tgtG = dest && tgt(s0) > 0 ? tgt(s) / tgt(s0) - 1 : 0;
  const strat: Assessment = !dest || readiness < 0.4 || tgtG < 0 ? 'Weak' : readiness >= 0.7 && tgtG >= 0.1 ? 'Strong' : 'Mixed';
  const say = (a: Assessment, strong: string, mixed: string, weak: string) => (a === 'Strong' ? strong : a === 'Mixed' ? mixed : weak);
  return [
    { id: 'financial', label: 'Financial resilience', assessment: fin, rule: VERDICT_RULES.financial,
      summary: say(fin, 'The company can fund its plans and absorb a bad quarter.', 'Finances are serviceable but leave limited room for error.', 'Liquidity or profitability constrains what the next team can do.'),
      evidence: [
        { label: 'Cash', start: m(s0.cash), end: m(s.cash), trend: trend(s.cash, sp.cash, 0.5) },
        { label: 'Operating margin', start: pc(margin(s0)), end: pc(margin(s)), trend: trend(margin(s), margin(sp), 0.0025) },
        { label: 'Debt', start: m(s0.financing.debt), end: m(s.financing.debt), trend: trend(s.financing.debt, sp.financing.debt, 0.5, false) },
        { label: 'Liquidity status', start: 'healthy', end: `${s.solvency.status}${s.solvency.distressed ? ', distressed' : ''}`, trend: 'stable' },
      ] },
    { id: 'commercial', label: 'Commercial strength', assessment: com, rule: VERDICT_RULES.commercial,
      summary: say(com, 'Revenue has grown and the customer base is holding.', 'Revenue is up modestly or retention has slipped.', 'The company is smaller than the one it inherited.'),
      evidence: [
        { label: 'Quarterly revenue', start: m(s0.revenue), end: m(s.revenue), trend: trend(s.revenue, sp.revenue, 0.5) },
        { label: 'Consumer retention', start: `${s0.commercial.consumerRetention.toFixed(1)}%`, end: `${s.commercial.consumerRetention.toFixed(1)}%`, trend: trend(s.commercial.consumerRetention, sp.commercial.consumerRetention, 0.2) },
        { label: 'Enterprise pipeline', start: m(s0.commercial.enterprisePipeline), end: m(s.commercial.enterprisePipeline), trend: trend(s.commercial.enterprisePipeline, sp.commercial.enterprisePipeline, 1) },
      ] },
    { id: 'product', label: 'Product competitiveness', assessment: prod, rule: VERDICT_RULES.product,
      summary: say(prod, 'A better product that customers trust.', 'The product has held its ground without a clear edge.', 'Product quality or trust has eroded.'),
      evidence: [
        { label: 'Product quality', start: n0(s0.productQuality), end: n0(s.productQuality), trend: trend(s.productQuality, sp.productQuality, 0.5) },
        { label: 'Customer trust', start: n0(s0.trust), end: n0(s.trust), trend: trend(s.trust, sp.trust, 0.5) },
        { label: 'AI commercial readiness', start: n0(s0.commercial.aiCommercialReadiness), end: n0(s.commercial.aiCommercialReadiness), trend: trend(s.commercial.aiCommercialReadiness, sp.commercial.aiCommercialReadiness, 0.5) },
        { label: 'AI product adoption', start: n0(s0.commercial.aiAdoptionIndex), end: n0(s.commercial.aiAdoptionIndex), trend: trend(s.commercial.aiAdoptionIndex, sp.commercial.aiAdoptionIndex, 0.5) },
      ] },
    { id: 'organization', label: 'Organizational sustainability', assessment: org, rule: VERDICT_RULES.organization,
      summary: say(org, 'The organization can carry the next phase of change.', 'The organization is coping but has little slack.', 'Culture, talent or workload will hold the next team back.'),
      evidence: [
        { label: 'Culture', start: n0(s0.culture), end: n0(s.culture), trend: trend(s.culture, sp.culture, 0.5) },
        { label: 'Talent', start: n0(s0.capabilities.talent), end: n0(s.capabilities.talent), trend: trend(s.capabilities.talent, sp.capabilities.talent, 0.5) },
        { label: 'Change load vs capacity', start: pc(load(s0)), end: pc(load(s)), trend: trend(load(s), load(sp), 0.02, false) },
      ] },
    { id: 'strategy', label: 'Strategic execution', assessment: strat, rule: VERDICT_RULES.strategy,
      summary: !dest ? 'No strategic direction was committed.' : say(strat, `${V2_DESTINATIONS[dest.id].name}: capabilities and results both support the strategy.`, `${V2_DESTINATIONS[dest.id].name}: partly built, partly delivered.`, `${V2_DESTINATIONS[dest.id].name}: the capabilities or the results do not yet support it.`),
      evidence: dest ? [
        { label: 'Readiness of the committed strategy', start: pc(destinationReadiness(dest.id, s0).readiness), end: pc(readiness), trend: trend(readiness, destinationReadiness(dest.id, sp).readiness, 0.01) },
        { label: 'Revenue of its target businesses', start: m(tgt(s0)), end: m(tgt(s)), trend: trend(tgt(s), tgt(sp), 0.5) },
        { label: 'Strategic focus retained', start: '100%', end: pc(1 - (dest.focusDilution ?? 0)), trend: 'stable' },
      ] : [],
    },
  ];
}

export interface DefensePrompt { id: string; question: string; evidence: string }

/** Board-defense prompts grounded in the team's recorded results. */
export function defensePrompts(history: QuarterRecord[]): DefensePrompt[] {
  const s0 = startingCompany();
  const s = history[history.length - 1].after;
  const pts = valuationSeries(history).points;
  const out: DefensePrompt[] = [];
  const best = pts.slice(1).reduce((a, p) => (p.change > a.change ? p : a));
  const worst = pts.slice(1).reduce((a, p) => (p.change < a.change ? p : a));
  const bestDrivers = [...best.bridge].sort((a, b) => b.amount - a.amount).slice(0, 2).map(b => b.label.toLowerCase()).join(' and ');
  out.push({ id: 'strongest', question: 'What was your strongest strategic decision?', evidence: `Your largest share-price gain came in ${calendarLabel(best.quarter)} (${best.change >= 0 ? '+' : '−'}$${Math.abs(best.change).toFixed(2)}), driven mainly by ${bestDrivers}. Which earlier decision made that possible?` });
  // investment that did not deliver (only claimed when the record supports it)
  const SEG: Record<string, 'consumer' | 'enterprise' | 'university' | 'aiNative'> = { consumer: 'consumer', enterprise: 'enterprise', universityCredentials: 'university', aiProduct: 'aiNative' };
  const invested = BUCKETS.map(b => ({ b, amt: history.reduce((t, h) => t + h.consequence.ledger.strategicInvestmentByBucket[b], 0) }));
  const failed = invested.filter(x => SEG[x.b] && x.amt >= 20 && s.segmentRevenue[SEG[x.b]] < s0.segmentRevenue[SEG[x.b]] - 0.05).sort((a, b) => b.amt - a.amt)[0];
  if (failed) out.push({ id: 'under-delivered', question: 'Which investment failed to deliver its expected value?', evidence: `You invested ${m(failed.amt)} in ${BUCKET_INFO[failed.b].name}, yet ${SEG[failed.b] === 'aiNative' ? 'AI-native' : SEG[failed.b]} revenue ended at ${m(s.segmentRevenue[SEG[failed.b]])}, below its ${calendarLabel(0)} level of ${m(s0.segmentRevenue[SEG[failed.b]])}. Why?` });
  else {
    const top = [...invested].sort((a, b) => b.amt - a.amt)[0];
    out.push({ id: 'under-delivered', question: 'Which investment delivered least relative to its cost?', evidence: top && top.amt > 0 ? `Your largest commitment was ${m(top.amt)} in ${BUCKET_INFO[top.b].name}. No business you funded ended below its starting revenue — so compare what each dollar produced.` : 'You made little strategic investment. What did holding back cost the company?' });
  }
  out.push({ id: 'underestimated', question: 'What did management underestimate?', evidence: worst.change < 0 ? `The sharpest share-price fall came in ${calendarLabel(worst.quarter)} (−$${Math.abs(worst.change).toFixed(2)}), mainly from ${[...worst.bridge].sort((a, b) => a.amount - b.amount)[0].label.toLowerCase()}. Was it foreseeable from the evidence you had?` : 'The share price never fell in a quarter. What risk did you carry that the price did not show?' });
  const maxLoad = history.reduce((a, h) => { const l = load(h.after); return l > a.l ? { l, q: h.quarter } : a; }, { l: 0, q: 1 });
  const lost = history.reduce((t, h) => t + h.consequence.capability.targets.reduce((u, x) => u + x.absorptionLoss, 0), 0);
  out.push({ id: 'capacity', question: 'How did organizational capability constrain execution?', evidence: `Change load peaked at ${(maxLoad.l * 100).toFixed(0)}% of capacity in ${calendarLabel(maxLoad.q)}; ${lost.toFixed(1)} capability points of investment were lost to overload over eight quarters.` });
  const pending = s.pendingCohorts.reduce((t, c) => t + c.gains.reduce((u, g) => u + (g.remaining ?? 0), 0), 0);
  out.push({ id: 'inherit', question: 'What will the next leadership team inherit?', evidence: `${m(s.cash)} cash, ${m(s.financing.debt)} debt, ${(s.financing.ownership * 100).toFixed(0)}% of the original ownership, culture ${n0(s.culture)} (was ${n0(s0.culture)}), and about ${pending.toFixed(0)} capability points still maturing.` });
  const weakest = boardVerdict(history).find(d => d.assessment === 'Weak') ?? boardVerdict(history).find(d => d.assessment === 'Mixed');
  out.push({ id: 'next', question: 'What should the company prioritize over the next two years?', evidence: weakest ? `The board assessment rates ${weakest.label.toLowerCase()} as ${weakest.assessment.toLowerCase()}. Would you fix that first, or build on your strengths?` : 'All five board dimensions are rated strong. What would keep them strong?' });
  void pts;
  return out;
}
