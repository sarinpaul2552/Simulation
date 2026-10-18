/**
 * V2 Simulation Engine — Batch 3: Terminal Scoring
 *
 * Scores the COMPANY BUILT at the end of Q8 on three dimensions — Financial, Strategic, Organizational — with explicit
 * viability gates. Pure: reads the final state only. The engine never imports this module (no scoring → economic
 * feedback). No destination is rewarded for being chosen: every component is measured from state.
 *
 *   Financial      revenue growth, revenue quality (recurring share, concentration), operating margin, net cash/runway,
 *                  leverage, ownership retained (dilution), shareholder value (realized sale value if sold)
 *   Strategic      capability strength where the company competes, destination coherence (strength achieved),
 *                  market position vs competitor benchmarks, adaptability (AI readiness + crisis handling),
 *                  optionality earned at Q8, concentration risk, quality of the Q8 decision
 *   Organizational Culture, Talent, Execution, Trust, Organizational Capacity, sustainable load
 *
 * Overall = 0.40·F + 0.35·S + 0.25·O − 0.5 × max(0, 40 − weakest dimension)   (a terrible dimension is not averaged away)
 * Viability gates (the only cliffs):
 *   terminal insolvency (cash < 0 at the end, or ≥ 2 insolvent quarters) → overall ≤ 30, financial ≤ 20
 *   rescued insolvency (insolvent at some point, recovered)              → overall ≤ 55
 *   organizational collapse (Trust < 40, Culture < 40 or Talent < 30)    → overall ≤ 50
 *
 * V3.1 Stage 3C-A (v3-econ-1.1 only, switched by V3_ECONOMICS.mechanisms; 1.0 unchanged):
 *   decisionCreditOnExercise — a Q8 growth option earns decision credit only as far as it is exercised (Q8 strategic
 *     investment above the default envelope ÷ the option's extra envelope); unexercised it scores like "continue".
 *   readinessStrategyPremium — the commitment half of destination coherence is min(strength, readiness now).
 *   liquidityNeedBasedRecentEquity — Policy C: Q7–Q8 financing (equity and strategic-partner cash) neither deployed nor
 *     needed to restore minimum operating cash ($15M) is left out of the liquidity component (recentEquityAdjustment), and
 *     a Q8 option available only because of that unspent financing earns option credit only if exercised (optionWeight).
 *   The shareholder-value component uses companyValuation, whose 1.1 corrections (graded distress, readiness-based
 *   strategy premium, AI premium half-gated by AI-native revenue) are in engineV3Financing.
 */

import type { V2TeamState } from './engineV3';
import { companyValuation, V2_FINANCING_CALIBRATION, recentFinancingByQuarter } from './engineV3Financing';
import { V2_DESTINATIONS, destinationStrength, destinationReadiness } from './engineV3Destination';
import { contractConcentration } from './engineV3Opportunity';
import { maxEnvelope, V2_FINAL_CALIBRATION } from './engineV3Final';
import { V3_ECONOMICS } from './engineV3Config';

export const V2_SCORING_CALIBRATION = {
  weights: { financial: 0.4, strategic: 0.35, organizational: 0.25 },
  weakestLink: { threshold: 40, penalty: 0.5 },
  baselineShareholderValue: 1220,
  gates: {
    terminalInsolvency: { overallCap: 30, financialCap: 20 },
    rescuedInsolvency: { overallCap: 55 },
    organizationalCollapse: { overallCap: 50, trust: 40, culture: 40, talent: 30 },
  },
  bands: [
    [70, 'exceptional'],
    [55, 'strong'],
    [40, 'viable'],
    [25, 'weak'],
    [0, 'failed'],
  ] as [number, string][],
} as const;

function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}

export interface V2ScoreComponent {
  id: string;
  label: string;
  value: number;
  /** 0–1 score. */
  score: number;
  weight: number;
}

export interface V2TerminalScore {
  financial: number;
  strategic: number;
  organizational: number;
  /** Before gates and weakest-link adjustment. */
  blended: number;
  weakestLinkPenalty: number;
  overall: number;
  band: string;
  gates: { id: string; triggered: boolean; cap: number | null; detail: string }[];
  components: { financial: V2ScoreComponent[]; strategic: V2ScoreComponent[]; organizational: V2ScoreComponent[] };
  shareholderValue: number;
  tsr: number;
  sold: boolean;
}

/** Stage 3C-A: share of a Q8 growth option's extra envelope (above the default) actually invested, 0–1. */
export function exercisedShare(q8StrategicInvestment: number, option: 'scale-independently' | 'raise-growth-capital'): number {
  const base = V2_FINAL_CALIBRATION.defaultEnvelope;
  const extra = maxEnvelope(option) - base;
  return extra > 0 ? Math.max(0, Math.min(1, (q8StrategicInvestment - base) / extra)) : 0;
}

/**
 * Stage 3C Policy C (v3-econ-1.1) — how much recent financing the liquidity score leaves out.
 *   E  recent financing: equity rounds (incl. the Q8 raise option) and strategic-partner cash from
 *      `recentEquityFromQuarter` (Q7) to the end. Partner revenue share, capabilities, stake and dilution are untouched.
 *   X  financing deployed: Q7 financed expansion actually invested (strategic investment above the base envelope, at most
 *      that quarter's financing) + Q8 investment above the default envelope when that envelope was funded by financing:
 *      under raise-growth-capital, or under an option that was available only because of unspent recent financing.
 *      Investment paid from the company's own cash (base envelope; a self-funded scale-up) is not X.
 *   U  unspent = max(0, E − X)
 *   counted  = min(U, max(0, minimum operating cash − (cash − U)))   — rescue: what restores the $15M minimum
 *   excluded = U − counted
 * The liquidity component scores (cash − debt) − excluded. Continuous in cash and in each raise; splitting a raise
 * changes nothing (proceeds are summed); cash, debt, ownership and the valuation are untouched.
 */
export function recentEquityAdjustment(s: V2TeamState): { equity: number; deployed: number; unspent: number; counted: number; excluded: number } {
  const from = V3_ECONOMICS.liquidityScore.recentEquityFromQuarter;
  const base = V3_ECONOMICS.financing.baseEnvelope;
  const raised = recentFinancingByQuarter(s.financing.rounds, from);
  const equity = [...raised.values()].reduce((t, x) => t + x, 0);
  const rec = s.final.record;
  let deployed = 0;
  for (const l of s.ledgerHistory) {
    if (l.quarter < from) continue;
    if (rec && l.quarter === rec.quarter) {
      if (rec.option === 'raise-growth-capital' || unlockedByRecentFinancing(rec, rec.option)) deployed += Math.max(0, l.strategicInvestment - V2_FINAL_CALIBRATION.defaultEnvelope);
    } else deployed += Math.min(raised.get(l.quarter) ?? 0, Math.max(0, l.strategicInvestment - base));
  }
  const unspent = Math.max(0, equity - deployed);
  const counted = Math.min(unspent, Math.max(0, V2_FINANCING_CALIBRATION.liquidity.minimumOperatingCash - (s.cash - unspent)));
  return { equity, deployed, unspent, counted, excluded: unspent - counted };
}

/** Stage 3C Policy C: an option was available at Q8 only because of unspent recent financing (1.1 metadata present). */
function unlockedByRecentFinancing(rec: NonNullable<V2TeamState['final']['record']>, id: string): boolean {
  return !!rec.optionsWithoutRecentFinancing && rec.availability.some(o => o.id === id && o.available) && !rec.optionsWithoutRecentFinancing.includes(id as never);
}

/**
 * Stage 3C Policy C: weight of each available Q8 option in "options earned". An option available only because of unspent
 * recent financing counts only if it was chosen, and then only as far as it was exercised (an acquisition is exercised
 * when made); otherwise every available option counts 1, as before.
 */
function optionWeight(rec: NonNullable<V2TeamState['final']['record']>, id: string, q8Investment: number): number {
  if (!V3_ECONOMICS.mechanisms.liquidityNeedBasedRecentEquity || !unlockedByRecentFinancing(rec, id)) return 1;
  if (rec.option !== id) return 0;
  return id === 'scale-independently' || id === 'raise-growth-capital' ? exercisedShare(q8Investment, id) : 1;
}

const sum = (cs: V2ScoreComponent[]) => 100 * cs.reduce((t, c) => t + c.score * c.weight, 0);
const comp = (id: string, label: string, value: number, score: number, weight: number): V2ScoreComponent => ({ id, label, value, score, weight });

export function scoreV2Company(s: V2TeamState): V2TerminalScore {
  const K = V2_SCORING_CALIBRATION;
  const q = s.quarter;
  const L = s.ledgerHistory;
  if (L.length < 1) throw new Error('Terminal scoring needs at least one completed quarter');
  const last = L[L.length - 1];
  const revenue = last.revenue;
  const op = last.operatingProfit;
  const margin = revenue > 0 ? op / revenue : -1;
  const seg = s.segmentRevenue;
  const total = seg.consumer + seg.enterprise + seg.university + seg.aiNative;
  const dest = s.destination;
  const ds = dest ? destinationStrength(dest, q) : 0;
  const final = s.final.record;
  const sold = final?.option === 'strategic-sale';

  // ---------- Financial ----------
  const growth = revenue / 200 - 1;
  const recurring = total > 0 ? (seg.enterprise + seg.university) / total : 0;
  const conc = contractConcentration(s.contracts, seg.enterprise);
  const netCash = s.cash - s.financing.debt;
  const annualOP = 4 * op;
  const leverage = s.financing.debt > 0 ? (annualOP > 0 ? s.financing.debt / annualOP : 10) : 0;
  const revYearAgo = L.length >= 5 ? L[L.length - 5].revenue : 200;
  const readinessNow = dest ? destinationReadiness(dest.id, s).readiness : 0;
  const val = companyValuation({
    revenue, operatingProfit: op, cash: s.cash, revenueYearAgo: revYearAgo, aiCommercialReadiness: s.commercial.aiCommercialReadiness,
    destinationStrength: ds, debt: s.financing.debt, status: s.solvency.status, distressed: s.solvency.distressed,
    // Stage 3C-A inputs (read only by the v3-econ-1.1 valuation corrections)
    aiRevenueShare: total > 0 ? seg.aiNative / total : 0, destinationReadiness: readinessNow,
    interestExpense: s.costHistory.length ? s.costHistory[s.costHistory.length - 1].financingCost : 0,
  });
  const equityValue = sold ? final!.saleOffer! : Math.max(0, val.preMoney);
  const shareholderValue = equityValue * s.financing.ownership;
  const tsr = shareholderValue / K.baselineShareholderValue;
  const financial = [
    comp('growth', 'Revenue growth since Q0', growth, ramp(growth, -0.1, 0.3), 0.2),
    comp('quality', 'Revenue quality (recurring share, client concentration)', recurring, 0.7 * ramp(recurring, 0.2, 0.45) + 0.3 * (1 - ramp(conc, 0.15, 0.4)), 0.1),
    comp('margin', 'Operating margin (Q8)', margin, ramp(margin, 0, 0.25), 0.15),
    comp('liquidity', 'Net cash (cash − debt)', netCash, ramp(V3_ECONOMICS.mechanisms.liquidityNeedBasedRecentEquity ? netCash - recentEquityAdjustment(s).excluded : netCash, -50, 150), 0.15),
    comp('leverage', 'Leverage (debt ÷ annualized OP)', leverage, 1 - ramp(leverage, 1, 4), 0.1),
    comp('ownership', 'Ownership retained (dilution)', s.financing.ownership, ramp(s.financing.ownership, 0.8, 1), 0.1),
    comp('value', sold ? 'Shareholder value (realized sale)' : 'Shareholder value (valuation)', tsr, ramp(tsr, 0.6, 3), 0.2),
  ];

  // ---------- Strategic ----------
  const def = dest ? V2_DESTINATIONS[dest.id] : null;
  const drivers = def ? def.readiness.map(r => r.driver) : (['consumer', 'enterprise', 'ai', 'credential'] as const);
  const valueOf = (d: string): number => {
    switch (d) {
      case 'productQuality': return s.productQuality;
      case 'trust': return s.trust;
      case 'organizationalCapacity': return s.organizationalCapacity;
      default: return (s.capabilities as unknown as Record<string, number>)[d];
    }
  };
  const top = drivers.map(valueOf).sort((a, b) => b - a).slice(0, 3);
  const capStrength = top.reduce((t, x) => t + Math.min(1, x / 100), 0) / top.length;
  // Stage 3C-A (1.1): the commitment half of coherence counts only as far as readiness was achieved (time alone reaches 1).
  const committed = V3_ECONOMICS.mechanisms.readinessStrategyPremium ? Math.min(ds, readinessNow) : ds;
  const coherence = dest ? 0.5 * committed + 0.5 * readinessNow : 0;
  const bm = s.commercial.competitorBenchmarks;
  const posConsumer = ramp(s.capabilities.consumer - bm.consumer, -20, 40);
  const posEnterprise = ramp(s.capabilities.enterprise - bm.enterprise, -20, 40);
  const posCredential = ramp(s.capabilities.credential - bm.credential, -20, 40);
  const posAi = ramp(s.commercial.aiCommercialReadiness, 20, 80);
  const posPremium = ramp(s.commercial.pricingPower, 40, 80);
  const revenueWeighted = total > 0
    ? (seg.consumer * posConsumer + seg.enterprise * posEnterprise + seg.university * posCredential + seg.aiNative * posAi) / total
    : 0;
  // Calibration (audit): revenue weighting alone made "position" a Consumer-capability measure (every company is ~65%
  // Consumer). Half of the component now measures position where the company chose to compete: the commercial focus
  // it committed to (Consumer / Enterprise / University / Premium = pricing power); with no focus, revenue-weighted.
  const focusGroups = def ? def.commercialization : [];
  const focusPos = focusGroups.length === 0
    ? revenueWeighted
    : focusGroups.map(g => (g === 'consumer' ? posConsumer : g === 'enterprise' ? posEnterprise : g === 'university' ? posCredential : posPremium))
      .reduce((t, x) => t + x, 0) / focusGroups.length;
  const pos = 0.5 * revenueWeighted + 0.5 * focusPos;
  const crisis = s.crisis.record;
  const crisisHandling = crisis
    ? 0.5 * (1 - crisis.assessment.severity) + 0.5 * (crisis.response === 'remediate' ? 1 : crisis.response === 'contain' ? 0.6 : 0.2)
    : 0.5;
  const adaptability = 0.6 * ramp(s.commercial.aiCommercialReadiness, 10, 70) + 0.4 * crisisHandling;
  const earned = final ? final.availability.filter(o => o.available && o.id !== 'continue').reduce((t, o) => t + optionWeight(final, o.id, last.strategicInvestment), 0) : 0;
  const optionality = sold ? 0 : Math.min(1, earned / 4);
  const largestSegment = total > 0 ? Math.max(seg.consumer, seg.enterprise, seg.university, seg.aiNative) / total : 1;
  const risk = 1 - Math.max(ramp(largestSegment, 0.6, 0.9), ramp(conc, 0.1, 0.35));
  const growthOptionsExisted = final ? final.availability.some(o => o.available && ['scale-independently', 'raise-growth-capital', 'acquire-consolidate'].includes(o.id) && optionWeight(final, o.id, last.strategicInvestment) > 0) : false;
  const continueQuality = growthOptionsExisted ? 0.6 : 0.7;
  const decisionQuality = !final ? 0.5
    : V3_ECONOMICS.mechanisms.decisionCreditOnExercise && (final.option === 'scale-independently' || final.option === 'raise-growth-capital')
      // Stage 3C-A (1.1): a growth option earns credit only as far as it was exercised — Q8 strategic investment above
      // the default envelope, as a share of the option's extra envelope. Unexercised, it scores like "continue".
      ? continueQuality + (1 - continueQuality) * exercisedShare(last.strategicInvestment, final.option)
    : ['scale-independently', 'raise-growth-capital', 'acquire-consolidate'].includes(final.option) ? 1
    : final.option === 'stabilize-restructure' ? 0.8
    : final.option === 'strategic-sale' ? 0.5
    : continueQuality;
  const strategic = [
    comp('capability', 'Capability strength where it competes (top-3 relevant)', capStrength, capStrength, 0.2),
    comp('coherence', 'Destination coherence (strength achieved, readiness now)', coherence, coherence, 0.15),
    comp('position', 'Market position (½ revenue-weighted, ½ in the chosen competitive focus)', pos, pos, 0.2),
    comp('adaptability', 'Adaptability (AI readiness + crisis handling)', adaptability, adaptability, 0.1),
    comp('optionality', 'Options earned at Q8', earned, optionality, 0.15),
    comp('risk', 'Concentration risk (segment, client)', largestSegment, risk, 0.1),
    comp('decision', 'Quality of the Q8 decision', decisionQuality, decisionQuality, 0.1),
  ];

  // ---------- Organizational ----------
  const lastCap = s.capabilityHistory[s.capabilityHistory.length - 1];
  const loadRatio = lastCap ? lastCap.loadToCapacityRatio : 0;
  const organizational = [
    comp('culture', 'Culture', s.culture, ramp(s.culture, 40, 85), 0.2),
    comp('talent', 'Talent', s.capabilities.talent, ramp(s.capabilities.talent, 30, 90), 0.15),
    comp('execution', 'Execution', s.capabilities.execution, ramp(s.capabilities.execution, 40, 80), 0.2),
    comp('trust', 'Trust', s.trust, ramp(s.trust, 40, 85), 0.2),
    comp('capacity', 'Organizational Capacity', s.organizationalCapacity, ramp(s.organizationalCapacity, 40, 90), 0.15),
    comp('load', 'Sustainable transformation load', loadRatio, 1 - ramp(loadRatio, 0.8, 1.4), 0.1),
  ];

  let F = sum(financial);
  const S = sum(strategic);
  const O = sum(organizational);
  const G = K.gates;
  const terminalInsolvent = s.cash < 0 || s.solvency.insolventQuarters >= 2;
  const rescued = s.solvency.everInsolvent && !terminalInsolvent;
  const collapse = s.trust < G.organizationalCollapse.trust || s.culture < G.organizationalCollapse.culture || s.capabilities.talent < G.organizationalCollapse.talent;
  if (terminalInsolvent) F = Math.min(F, G.terminalInsolvency.financialCap);
  const blended = K.weights.financial * F + K.weights.strategic * S + K.weights.organizational * O;
  const weakestLinkPenalty = K.weakestLink.penalty * Math.max(0, K.weakestLink.threshold - Math.min(F, S, O));
  let overall = blended - weakestLinkPenalty;
  const gates = [
    { id: 'terminal-insolvency', triggered: terminalInsolvent, cap: G.terminalInsolvency.overallCap, detail: `cash ${s.cash.toFixed(1)}, insolvent quarters ${s.solvency.insolventQuarters}` },
    { id: 'rescued-insolvency', triggered: rescued, cap: G.rescuedInsolvency.overallCap, detail: `ever insolvent ${s.solvency.everInsolvent}` },
    { id: 'organizational-collapse', triggered: collapse, cap: G.organizationalCollapse.overallCap, detail: `Trust ${s.trust.toFixed(1)}, Culture ${s.culture.toFixed(1)}, Talent ${s.capabilities.talent.toFixed(1)}` },
  ];
  for (const g of gates) if (g.triggered) overall = Math.min(overall, g.cap);
  overall = Math.max(0, Math.min(100, overall));
  const band = K.bands.find(([lo]) => overall >= lo)![1];
  return { financial: F, strategic: S, organizational: O, blended, weakestLinkPenalty, overall, band, gates, components: { financial, strategic, organizational }, shareholderValue, tsr, sold };
}
