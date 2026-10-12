/**
 * DECISION CONSEQUENCES, CASH BRIDGE AND EXECUTIVE SUMMARY (Batch 7.5)
 *
 * Every statement here is derived from (a) what the team actually committed and (b) the frozen engine's recorded
 * consequence for that quarter, or from documented engine mechanics (maturation schedules, calibration curves,
 * coordination load). Nothing is a counterfactual: no alternative revenue or profit is invented. Where an outcome is
 * uncertain the text says so and frames it as a question or a risk, never as proven causality.
 */
import { calendarLabel } from '../content/calendar';
import type { V2TeamState } from '../../../simulation/engineV2';
import {
  V2_BUCKET_CURVES, V2_COORDINATION_LOAD, V2_ACTIVE_INITIATIVE_THRESHOLD, V2_MAX_CALIBRATED_BUCKET,
  interpolateCurve, bucketTransformationLoad, cultureCapacityFactor, calculateAbsorptionFactor,
} from '../../../simulation/engineV2Capabilities';
import { V2_DESTINATIONS } from '../../../simulation/engineV2Destination';
import type { V2PlayerQuarterInput } from '../types';
import type { QuarterRecord } from './history';
import { V2PresentationMode, mt, pick } from '../content/modes';

const fmtM = (x: number, d = 1) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(d)}M`;
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

export type Bucket = 'consumer' | 'enterprise' | 'aiProduct' | 'people' | 'universityCredentials';
export const BUCKETS: Bucket[] = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'];

/** Plain descriptions of each investment, what it builds (engine targets) and when it lands (maturation schedule). */
export const BUCKET_INFO: Record<Bucket, { name: string; short: string; builds: string; ug: string; mba: string }> = {
  consumer: { name: 'Consumer growth', short: 'Consumer', builds: 'Consumer capability', ug: 'Marketing and product for individual learners.', mba: 'Consumer acquisition and product: builds Consumer capability.' },
  enterprise: { name: 'Enterprise sales & success', short: 'Enterprise', builds: 'Enterprise capability, some Customer Success', ug: 'Selling to companies and keeping them happy.', mba: 'Enterprise go-to-market: builds Enterprise capability and some Customer Success.' },
  aiProduct: { name: 'AI & product', short: 'AI / Product', builds: 'AI capability, some Product Quality', ug: 'AI features and product quality.', mba: 'AI and core product: builds AI capability and some Product Quality.' },
  people: { name: 'People & talent', short: 'People', builds: 'Talent, organizational capacity, some Product Quality', ug: 'Hiring, training and the capacity to take on change.', mba: 'Talent and organizational capacity (raises how much change the company can absorb).' },
  universityCredentials: { name: 'University & credentials', short: 'University', builds: 'Credential capability, some Trust', ug: 'University partnerships and accredited courses.', mba: 'Credential network and accreditation: builds Credential capability and some Trust.' },
};

/** "When does it pay off": from the engine's maturation schedule (share maturing in Q, Q+1, Q+2). */
export function timeToImpact(b: Bucket): { schedule: readonly number[]; text: string } {
  const s = V2_BUCKET_CURVES[b].maturationSchedule;
  const first = s[0];
  const text = first >= 0.5 ? `Fast: ${pct(first)} lands this quarter, the rest over ${s.length - 1} more` : `Slow: ${pct(first)} this quarter, ${pct(1 - first)} over the next ${s.length - 1}`;
  return { schedule: s, text };
}

/** Nominal capability points from one quarter's investment (engine calibration curve, before absorption). */
export function nominalGain(b: Bucket, amount: number): number {
  return interpolateCurve(V2_BUCKET_CURVES[b].gains[0].points, Math.min(Math.max(amount, 0), V2_MAX_CALIBRATED_BUCKET));
}

export interface CapacityEstimate {
  load: number;
  capacity: number;
  ratio: number;
  absorption: number;
  activeInitiatives: number;
  coordination: number;
  level: 'comfortable' | 'busy' | 'stretched' | 'overloaded';
}

/**
 * Planning estimate of change load vs capacity for an allocation, from the engine's own load curves, coordination
 * load and culture-adjusted capacity. Excludes strategy-specific effects (destination focus, transitions, contracts,
 * events), so it is labelled an estimate in the UI.
 */
export function capacityEstimate(state: V2TeamState, allocation: V2PlayerQuarterInput['allocation']): CapacityEstimate {
  const amounts = BUCKETS.map(b => Math.min(Math.max(allocation[b] ?? 0, 0), V2_MAX_CALIBRATED_BUCKET));
  const bucketLoad = BUCKETS.reduce((t, b, i) => t + bucketTransformationLoad(b, amounts[i]), 0);
  const active = amounts.filter(x => x >= V2_ACTIVE_INITIATIVE_THRESHOLD).length;
  const coordination = V2_COORDINATION_LOAD[Math.min(active, V2_COORDINATION_LOAD.length - 1)];
  const load = bucketLoad + coordination;
  const capacity = state.organizationalCapacity * cultureCapacityFactor(state.culture);
  const ratio = capacity > 0 ? load / capacity : 0;
  const absorption = calculateAbsorptionFactor(ratio);
  const level = ratio <= 0.5 ? 'comfortable' : ratio <= 0.8 ? 'busy' : ratio <= 1 ? 'stretched' : 'overloaded';
  return { load, capacity, ratio, absorption, activeInitiatives: active, coordination, level };
}

// ---------------------------------------------------------------------------------------------------------------- //
// Cash bridge
// ---------------------------------------------------------------------------------------------------------------- //

export interface CashBridge {
  opening: number;
  operatingProfit: number;
  investment: number;
  eventCosts: number;
  eventItems: { label: string; amount: number }[];
  financing: number;
  financingItems: { label: string; amount: number }[];
  closing: number;
  /** opening + operating profit − investment − event costs + financing, computed in the engine's order. */
  computed: number;
  /** True when the bridge equals the engine's recorded closing cash and the company's cash after the quarter. */
  reconciles: boolean;
}

const cleanLabel = (s: string) => s.replace(/^\[[^\]]+\]\s*/, '');

export function cashBridge(rec: QuarterRecord): CashBridge {
  const l = rec.consequence.ledger;
  const computed = l.openingCash + l.operatingProfit - l.strategicInvestment - l.eventCosts + l.financing;
  return {
    opening: l.openingCash,
    operatingProfit: l.operatingProfit,
    investment: l.strategicInvestment,
    eventCosts: l.eventCosts,
    eventItems: l.eventCostItems.map(i => ({ label: cleanLabel(i.description), amount: i.amount })),
    financing: l.financing,
    financingItems: l.financingItems.map(i => ({ label: cleanLabel(i.description), amount: i.amount })),
    closing: l.closingCash,
    computed,
    reconciles: Math.abs(computed - l.closingCash) <= 1e-9 * Math.max(1, Math.abs(l.closingCash)) && Math.abs(l.closingCash - rec.after.cash) <= 1e-9 * Math.max(1, Math.abs(rec.after.cash)),
  };
}

// ---------------------------------------------------------------------------------------------------------------- //
// Decision consequences
// ---------------------------------------------------------------------------------------------------------------- //

export interface DecisionConsequence {
  id: string;
  /** What the team decided (always stated first, in the team's own terms). */
  decision: string;
  immediate: string;
  longerTerm: string;
  /** What remains uncertain — a risk or question, never a claim about what would have happened. */
  uncertainty: string;
  weight: number;
}

const CAP_OF: Record<Bucket, keyof V2TeamState['capabilities']> = {
  consumer: 'consumer', enterprise: 'enterprise', aiProduct: 'ai', people: 'talent', universityCredentials: 'credential',
};

function allocationFacts(input: V2PlayerQuarterInput, rec: QuarterRecord) {
  const al = input.allocation;
  const invested = BUCKETS.reduce((t, b) => t + al[b], 0);
  const envelope = rec.consequence.ledger.strategicEnvelope;
  const ranked = BUCKETS.filter(b => al[b] > 0).sort((x, y) => al[y] - al[x]);
  const top = ranked[0];
  const topShare = invested > 0 && top ? al[top] / invested : 0;
  return { al, invested, envelope, ranked, top, topShare, active: BUCKETS.filter(b => al[b] >= V2_ACTIVE_INITIATIVE_THRESHOLD) };
}

/** Points still to mature from THIS quarter's new investment cohorts (by capability target). */
function pendingFromThisQuarter(rec: QuarterRecord): { target: string; remaining: number; lastQuarter: number }[] {
  const out: { target: string; remaining: number; lastQuarter: number }[] = [];
  for (const c of rec.after.pendingCohorts.filter(x => x.quarterInvested === rec.quarter)) {
    for (const g of c.gains) if (g.remaining > 0.05) out.push({ target: g.target, remaining: g.remaining, lastQuarter: c.quarterInvested + c.maturationSchedule.length - 1 });
  }
  return out;
}

const TARGET_LABEL: Record<string, string> = {
  consumer: 'Consumer', enterprise: 'Enterprise', ai: 'AI', talent: 'Talent', credential: 'Credential', customerSuccess: 'Customer Success',
  productQuality: 'Product Quality', trust: 'Trust', organizationalCapacity: 'Organizational capacity', execution: 'Execution',
};

export function decisionConsequences(rec: QuarterRecord, mode: V2PresentationMode): DecisionConsequence[] {
  const input = rec.input;
  const c = rec.consequence;
  const cap = c.capability as unknown as { loadToCapacityRatio: number; absorptionFactor: number; transformationLoad: number; effectiveCapacity: number; coordinationLoad: number; activeInitiatives: string[] };
  const f = allocationFacts(input, rec);
  const out: DecisionConsequence[] = [];
  const pending = pendingFromThisQuarter(rec);
  const pendingText = (targets: string[]) => {
    const rows = pending.filter(p => targets.includes(p.target));
    if (!rows.length) return '';
    const last = Math.max(...rows.map(r => r.lastQuarter));
    return `${rows.map(r => `${TARGET_LABEL[r.target] ?? r.target} +${r.remaining.toFixed(1)}`).join(', ')} still to mature by ${calendarLabel(last)}`;
  };

  // --- Event decisions (the quarter's headline choice) -------------------------------------------------------- //
  if (input.quarter === 4 && input.destination && rec.after.destination) {
    const d = rec.after.destination;
    out.push({
      id: 'destination', weight: 100,
      decision: `You committed the company to become a ${V2_DESTINATIONS[d.id].name}.`,
      immediate: pick(mode, mt(`Your skills were ${pct(d.readinessAtCommit)} ready for this strategy, so the change adds ${d.transition.loadPerQuarter.toFixed(1)} points of workload each quarter while you transition.`,
        `Readiness at commitment ${pct(d.readinessAtCommit)}; transition load ${d.transition.loadPerQuarter.toFixed(1)}/quarter through ${calendarLabel(d.transition.endQuarter)}.`)),
      longerTerm: pick(mode, mt('Investments aligned with this strategy now cost your teams less effort, and the strategy strengthens each quarter you stay on it.',
        'Aligned buckets carry reduced load and strategy strength ramps each quarter; capability ceilings in the focus areas rise with it.')),
      uncertainty: pick(mode, mt('Whether the market rewards this direction is still unknown — watch your strategy’s customers in the next results.', 'Commitment trades optionality for focus; the market response to this destination is not yet observed.')),
    });
  }
  if (input.opportunity && c.opportunityTerms) {
    const t = c.opportunityTerms;
    out.push(input.opportunity.accept ? {
      id: 'opportunity', weight: 90,
      decision: `You accepted the ${fmtM(t.acv, 0)} ${t.name}.`,
      immediate: `It cost ${fmtM(t.upfrontCash)} upfront and added ${t.orgLoadPerQuarter.toFixed(0)} points of workload per quarter for ${t.loadQuarters} quarters.`,
      longerTerm: `Signed revenue of about ${fmtM(t.runRate)} per quarter goes live gradually as you deliver${t.roadmapDiversion > 0 ? `; part of your product roadmap is diverted to the client` : ''}.`,
      uncertainty: pick(mode, mt('Delivery strain could slow your other investments — watch workload versus capacity.', `Fit ${pct(t.fit.fit)}: delivery load competes with your own initiatives for capacity.`)),
    } : {
      id: 'opportunity', weight: 90,
      decision: `You declined the ${fmtM(t.acv, 0)} ${t.name}.`,
      immediate: `You kept the ${fmtM(t.upfrontCash)} upfront cost and your teams’ capacity.`,
      longerTerm: 'No contract revenue will be added; your roadmap and capacity stay on your own strategy.',
      uncertainty: 'Whether the capacity you protected produces more value than the contract would have is not knowable from this game.',
    });
  }
  if (input.management && Object.keys(input.management).length) {
    const m = input.management;
    const acts = [m.workforceReduction ? `${m.workforceReduction.depth} workforce reduction${m.workforceReduction.protectRnD ? ' (R&D protected)' : ''}` : '', m.hiringFreeze ? 'hiring freeze' : '',
      m.pricing ? (m.pricing === 'raise' ? 'price increase' : 'price discount') : '', m.closeWeakOfferings ? 'closing weak offerings' : ''].filter(Boolean);
    const sv = c.managementSummary;
    out.push({
      id: 'management', weight: 80,
      decision: `Recession response: ${acts.join(', ') || 'no special actions'}.`,
      immediate: [sv.savingsPerQuarter > 0.05 ? `Running costs fall by ${fmtM(sv.savingsPerQuarter)} per quarter` : 'No structural cost savings', sv.oneOffCost > 0.05 ? `one-off cost ${fmtM(sv.oneOffCost)}` : ''].filter(Boolean).join('; ') + '.',
      longerTerm: rec.after.management.scheduledShocks.length ? 'Staff actions have aftershocks on talent and culture in the coming quarter.' : `Culture ${rec.before.culture.toFixed(0)} → ${rec.after.culture.toFixed(0)}, talent ${rec.before.capabilities.talent.toFixed(0)} → ${rec.after.capabilities.talent.toFixed(0)} this quarter.`,
      uncertainty: 'How long the downturn lasts decides whether savings or protected capability matter more.',
    });
  }
  if (input.crisisResponse && c.crisisAssessment) {
    const a = c.crisisAssessment;
    const r = a.responses.find(x => x.id === input.crisisResponse);
    out.push({
      id: 'crisis', weight: 85,
      decision: `Crisis “${a.title}”: you chose to ${r?.label.toLowerCase() ?? input.crisisResponse}.`,
      immediate: `The response cost ${fmtM(r?.cash ?? 0)}; trust moved ${rec.before.trust.toFixed(0)} → ${rec.after.trust.toFixed(0)}.`,
      longerTerm: rec.after.crisis.pending.length ? 'Some effects of the crisis are still to come next quarter.' : 'The crisis has no further scheduled effects.',
      uncertainty: 'Customers’ and employees’ memory of how you handled it may matter beyond what this quarter shows.',
    });
  }
  if (input.finalOption && rec.after.final.record) {
    const opt = input.finalOption;
    out.push({
      id: 'final', weight: 95,
      decision: `Final strategic decision: ${FINAL_LABEL[opt] ?? opt}.`,
      immediate: `This quarter’s investment envelope was ${fmtM(f.envelope, 0)}.`,
      longerTerm: 'This choice sets the company’s position for the final assessment.',
      uncertainty: 'What happens after Q4 2024 is outside the simulation.',
    });
  }

  // --- Investment pattern -------------------------------------------------------------------------------------- //
  if (f.invested < 0.5) {
    out.push({
      id: 'held-cash', weight: 70,
      decision: `You retained the full ${fmtM(f.envelope, 0)} rather than investing.`,
      immediate: `You preserved cash: closing cash ${fmtM(rec.after.cash)}.`,
      longerTerm: 'No new capability investment was started this quarter, so nothing new will mature from it in the next one to three quarters.',
      uncertainty: 'Competitors may advance while you wait, but holding cash could protect you if conditions worsen.',
    });
  } else if (f.top && f.topShare >= 0.6 && f.invested >= 10) {
    const b = f.top;
    const amt = f.al[b];
    const capKey = CAP_OF[b];
    const firstHalf = nominalGain(b, amt / 2), full = nominalGain(b, amt);
    const later = pendingText(V2_BUCKET_CURVES[b].gains.map(g => g.target));
    out.push({
      id: 'concentrated', weight: 60,
      decision: `You concentrated ${fmtM(amt, 0)} (${pct(f.topShare)} of your investment) in ${BUCKET_INFO[b].name}.`,
      immediate: `${TARGET_LABEL[capKey] ?? capKey} moved ${rec.before.capabilities[capKey].toFixed(0)} → ${rec.after.capabilities[capKey].toFixed(0)} this quarter (including earlier investments maturing).`,
      longerTerm: later ? `${later}.` : 'This investment has fully matured.',
      uncertainty: pick(mode, mt(`Each extra dollar in one area adds less: the first half of this amount builds ${firstHalf.toFixed(1)} points, the whole amount ${full.toFixed(1)}. Other capabilities did not get new investment.`,
        `Diminishing returns: ${fmtM(amt / 2, 0)} → ${firstHalf.toFixed(1)} pts, ${fmtM(amt, 0)} → ${full.toFixed(1)} pts (calibration curve). Depth here is bought with exposure if this market weakens.`)),
    });
  } else if (f.ranked.length >= 2 && f.invested >= 10 && (f.al[f.ranked[0]] + f.al[f.ranked[1]]) / f.invested >= 0.8) {
    const [b1, b2] = f.ranked;
    const later = pendingText([...V2_BUCKET_CURVES[b1].gains, ...V2_BUCKET_CURVES[b2].gains].map(g => g.target));
    out.push({
      id: 'paired', weight: 58,
      decision: `You focused on two priorities: ${BUCKET_INFO[b1].name} (${fmtM(f.al[b1], 0)}) and ${BUCKET_INFO[b2].name} (${fmtM(f.al[b2], 0)}).`,
      immediate: `${TARGET_LABEL[CAP_OF[b1]]} ${rec.before.capabilities[CAP_OF[b1]].toFixed(0)} → ${rec.after.capabilities[CAP_OF[b1]].toFixed(0)}, ${TARGET_LABEL[CAP_OF[b2]]} ${rec.before.capabilities[CAP_OF[b2]].toFixed(0)} → ${rec.after.capabilities[CAP_OF[b2]].toFixed(0)} this quarter (including earlier investments maturing).`,
      longerTerm: later ? `${later}.` : 'These investments have fully matured.',
      uncertainty: 'Two priorities build depth where you chose; the areas you did not fund are unchanged by this decision.',
    });
  } else {
    const n = f.active.length;
    const later = pendingText(['consumer', 'enterprise', 'ai', 'talent', 'credential']);
    out.push({
      id: 'diversified', weight: 55,
      decision: `You spread ${fmtM(f.invested, 0)} across ${n} initiative${n === 1 ? '' : 's'}${f.al.cashReserve > 0.05 ? ` and kept ${fmtM(f.al.cashReserve, 0)} in reserve` : ''}.`,
      immediate: n >= 3 ? `Running ${n} initiatives at once added ${V2_COORDINATION_LOAD[Math.min(n, 5)]} points of coordination workload.` : 'Few parallel initiatives kept coordination workload low.',
      longerTerm: later ? `${later}.` : 'These investments have fully matured.',
      uncertainty: 'Breadth lowers the risk of betting on the wrong market, but no single capability may become strong enough to stand out.',
    });
  }
  if (cap.absorptionFactor < 0.995 && f.invested >= 0.5) {
    const heavy = cap.loadToCapacityRatio > 0.8 || cap.absorptionFactor < 0.85;
    out.push({
      id: 'capacity', weight: heavy ? 65 : 30,
      decision: `Your plan used ${pct(cap.loadToCapacityRatio)} of your teams’ capacity for change.`,
      immediate: `${pct(cap.absorptionFactor)} of this quarter’s investment turned into capability.`,
      longerTerm: heavy ? 'The rest of that investment is lost, not delayed.' : 'A small part of the investment was lost to the workload of running several changes at once.',
      uncertainty: 'Fewer simultaneous initiatives, or investing in People to raise capacity, reduces this loss.',
    });
  }

  // --- Financing ----------------------------------------------------------------------------------------------- //
  for (const fa of input.financing ?? []) {
    if (fa.kind === 'debt') out.push({ id: 'debt', weight: 75, decision: `You borrowed ${fmtM(fa.amount)}.`,
      immediate: `Cash is ${fmtM(fa.amount)} higher now.`,
      longerTerm: `Debt is now ${fmtM(rec.after.financing.debt)} at ${pct(rec.after.financing.interestRate, 1)} per quarter — about ${fmtM(rec.after.financing.debt * rec.after.financing.interestRate)} of interest each quarter until repaid.`,
      uncertainty: 'Debt is affordable while profits hold; in a downturn interest and repayment compete with investment.' });
    if (fa.kind === 'equity') out.push({ id: 'equity', weight: 75, decision: `You raised ${fmtM(fa.amount)} by selling shares.`,
      immediate: `Cash is ${fmtM(fa.amount)} higher, with no repayment due.`,
      longerTerm: `The original shareholders now own ${pct(rec.after.financing.ownership)} of the company (was ${pct(rec.before.financing.ownership)}).`,
      uncertainty: 'Dilution is permanent; whether the cash earns more than the ownership given up depends on how it is used.' });
    if (fa.kind === 'repay') out.push({ id: 'repay', weight: 50, decision: `You repaid ${fmtM(fa.amount)} of debt.`,
      immediate: `Cash is ${fmtM(fa.amount)} lower.`, longerTerm: `Debt is now ${fmtM(rec.after.financing.debt)}, so future interest falls.`,
      uncertainty: 'Repaying early trades flexibility for lower cost.' });
    if (fa.kind === 'partner') out.push({ id: 'partner', weight: 70, decision: 'You brought in a strategic partner.',
      immediate: `Partner cash arrived this quarter.`, longerTerm: 'The partner takes a minority stake and a share of revenue in later quarters.',
      uncertainty: 'A partner can open doors but also constrains future choices.' });
    if (fa.kind === 'restructure') out.push({ id: 'restructure', weight: 70, decision: `You chose a ${fa.depth} restructuring.`,
      immediate: 'It carries a one-off cost this quarter.', longerTerm: 'It lowers running costs in later quarters but damages culture.',
      uncertainty: 'Savings help cash; weaker culture reduces how much change the organization can absorb.' });
  }
  return out.sort((x, y) => y.weight - x.weight);
}

const FINAL_LABEL: Record<string, string> = {
  'continue': 'continue on the current course', 'scale-independently': 'scale independently', 'raise-growth-capital': 'raise growth capital',
  'acquire-consolidate': 'acquire a weakened competitor', 'strategic-sale': 'sell the company', 'stabilize-restructure': 'stabilize and restructure',
};

// ---------------------------------------------------------------------------------------------------------------- //
// Executive summary
// ---------------------------------------------------------------------------------------------------------------- //

export interface ExecutiveHeadline { text: string; tone: 'good' | 'bad' | 'mixed' | 'neutral'; basis: string }

/**
 * A one-line situation statement from the recorded quarter only (revenue, operating profit, cash, investment,
 * solvency). The basis explains which recorded numbers produced it.
 */
export function executiveHeadline(rec: QuarterRecord, prev: QuarterRecord | undefined): ExecutiveHeadline {
  const b = rec.before, a = rec.after;
  const prevRev = prev ? prev.after.revenue : b.revenue;
  const prevOp = prev ? prev.after.operatingProfit : b.operatingProfit;
  const rev = a.revenue / prevRev - 1;
  const op = a.operatingProfit - prevOp;
  const cash = a.cash - b.cash;
  const invested = rec.consequence.ledger.strategicInvestment;
  const basis = `Revenue ${rev >= 0 ? '+' : ''}${(rev * 100).toFixed(1)}%, operating profit ${op >= 0 ? '+' : '−'}$${Math.abs(op).toFixed(1)}M, cash ${cash >= 0 ? '+' : '−'}$${Math.abs(cash).toFixed(1)}M, invested $${invested.toFixed(1)}M.`;
  const up = rev >= 0.01, down = rev <= -0.01;
  if (a.solvency.status === 'insolvent') return { text: 'The company has run out of cash.', tone: 'bad', basis };
  if (a.solvency.status === 'warning' || a.solvency.distressed) return { text: 'Cash is dangerously low — the company needs a funding plan.', tone: 'bad', basis };
  if (up && cash <= -3) return { text: 'Your company is growing, but cash is tightening.', tone: 'mixed', basis };
  if (down && invested >= 20) return { text: 'Revenue is falling despite strong investment.', tone: 'bad', basis };
  if (invested < 10 && !up && cash >= 0) return { text: 'You protected cash, but growth is slowing.', tone: 'mixed', basis };
  if (up && op > 0.5) return { text: 'Your strategy is beginning to pay off.', tone: 'good', basis };
  if (up && cash >= 0) return { text: 'Revenue is growing and the company is generating cash.', tone: 'good', basis };
  if (down && cash < 0) return { text: 'Revenue and cash are both under pressure.', tone: 'bad', basis };
  if (down) return { text: 'Revenue slipped this quarter.', tone: 'bad', basis };
  if (a.cash >= 40 && op < -0.5) return { text: 'The company is financially stable, but profits are weakening.', tone: 'mixed', basis };
  if (a.cash >= 40) return { text: 'A steady quarter: revenue held and the balance sheet is solid.', tone: 'neutral', basis };
  return { text: 'A steady quarter, but cash is below the $40M comfort level.', tone: 'mixed', basis };
}
