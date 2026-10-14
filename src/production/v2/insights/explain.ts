/**
 * WHAT HAPPENED AND WHY (Batch 7 · 7B-D)
 *
 * Builds impact statements ONLY from the engine's own consequence diagnostics, separated into:
 *  - market:     the scenario's effect on commercial indicators (indicator.marketContribution);
 *  - decision:   this quarter's explicit management decisions (itemised one-off costs, savings, financing, contract
 *                bookings, destination transition load, crisis response);
 *  - investment: capability that matured this quarter from money invested in EARLIER quarters, and potential lost
 *                to organizational overload.
 * Rankings use fixed unit weights (documented below) only to choose what to show first; the numbers shown are the
 * engine's numbers. No causality is invented: each statement names the diagnostic it comes from.
 */
import type { V2Consequence, V2TeamState } from '../../../simulation/engineV2';
import type { V2PresentationMode } from '../content/modes';
import { pick, mt } from '../content/modes';

export type ImpactKind = 'market' | 'decision' | 'investment';
export interface Impact { kind: ImpactKind; polarity: 1 | -1; weight: number; text: string; detail?: string }

const fmtM = (x: number) => `$${Math.abs(x).toFixed(1)}M`;

/** Ranking weights per unit (only for ordering what to show). */
const INDICATORS: Record<string, { label: string; ug: string; unit: 'pts' | '$M' | 'idx'; weight: number; goodWhenUp: boolean }> = {
  consumerRetention: { label: 'consumer retention', ug: 'how many paying consumers stay', unit: 'pts', weight: 1.0, goodWhenUp: true },
  consumerCacIndex: { label: 'the cost to win a consumer (CAC index)', ug: 'the cost of winning each new consumer', unit: 'idx', weight: 0.3, goodWhenUp: false },
  enterprisePipeline: { label: 'the enterprise pipeline', ug: 'the enterprise sales pipeline', unit: '$M', weight: 0.15, goodWhenUp: true },
  enterpriseWinRate: { label: 'the enterprise win rate', ug: 'how many enterprise deals we win', unit: 'pts', weight: 0.8, goodWhenUp: true },
  aiAdoptionIndex: { label: 'AI product adoption', ug: 'how many customers adopt our AI products', unit: 'idx', weight: 0.3, goodWhenUp: true },
  universityPipeline: { label: 'the university pipeline', ug: 'new university deals in progress', unit: '$M', weight: 0.5, goodWhenUp: true },
  universityRenewalRate: { label: 'university renewals', ug: 'how many universities renew', unit: 'pts', weight: 0.8, goodWhenUp: true },
  pricingPower: { label: 'pricing power', ug: 'our ability to charge good prices', unit: 'idx', weight: 0.6, goodWhenUp: true },
};
const CAPABILITY_LABEL: Record<string, string> = {
  consumer: 'Consumer', enterprise: 'Enterprise', customerSuccess: 'Customer Success', ai: 'AI/Product', talent: 'Talent',
  credential: 'Credential', productQuality: 'Product Quality', trust: 'Trust', organizationalCapacity: 'Organizational Capacity',
};

function unitText(v: number, unit: 'pts' | '$M' | 'idx') {
  return unit === '$M' ? fmtM(v) : unit === 'pts' ? `${Math.abs(v).toFixed(1)} points` : `${Math.abs(v).toFixed(1)} index points`;
}

export function quarterImpacts(c: V2Consequence, after: V2TeamState, mode: V2PresentationMode): Impact[] {
  const out: Impact[] = [];
  const q = c.quarter;

  // Market impact (scenario conditions acting on commercial indicators)
  for (const ind of c.commercial.indicators) {
    const meta = INDICATORS[ind.indicator];
    if (!meta || Math.abs(ind.marketContribution) < 0.05) continue;
    const up = ind.marketContribution > 0;
    const good = up === meta.goodWhenUp;
    out.push({
      kind: 'market', polarity: good ? 1 : -1, weight: Math.abs(ind.marketContribution) * meta.weight,
      text: pick(mode, mt(`Market conditions ${up ? 'raised' : 'lowered'} ${meta.ug} by ${unitText(ind.marketContribution, meta.unit)}.`, `Market conditions ${up ? 'added' : 'took'} ${unitText(ind.marketContribution, meta.unit)} ${up ? 'to' : 'from'} ${meta.label}.`)),
      detail: `Recorded change in ${meta.label} attributed to market conditions`,
    });
  }

  // Decision impact
  for (const item of c.ledger.eventCostItems) {
    const tag = /^\[(\w+)\]/.exec(item.description)?.[1] ?? 'decision';
    const what = item.description.replace(/^\[\w+\]\s*/, '');
    out.push({ kind: 'decision', polarity: -1, weight: item.amount, text: pick(mode, mt(`One-off cost of ${fmtM(item.amount)}: ${what}.`, `${fmtM(item.amount)} one-off ${tag} cost — ${what}.`)), detail: 'Quarter ledger (one-off costs)' });
  }
  if (c.managementSummary.savingsPerQuarter > 0.05) out.push({ kind: 'decision', polarity: 1, weight: c.managementSummary.savingsPerQuarter, text: pick(mode, mt(`Your recession actions cut running costs by ${fmtM(c.managementSummary.savingsPerQuarter)} per quarter.`, `Recession actions reduce the cost base by ${fmtM(c.managementSummary.savingsPerQuarter)}/quarter.`)), detail: 'Recession actions (cost savings)' });
  for (const f of c.ledger.financingItems) {
    if (Math.abs(f.amount) < 0.05) continue;
    out.push({ kind: 'decision', polarity: f.amount > 0 ? 1 : -1, weight: Math.abs(f.amount) * 0.5, text: `${f.amount > 0 ? 'Financing brought in' : 'Financing cost'} ${fmtM(f.amount)}: ${f.description}.`, detail: 'Quarter ledger (financing)' });
  }
  const booked = (c.revenue as unknown as { enterprise?: { contractBookingsRunRate?: number } }).enterprise?.contractBookingsRunRate ?? 0;
  if (booked > 0.05) out.push({ kind: 'decision', polarity: 1, weight: booked * 2, text: pick(mode, mt(`The contract you signed adds ${fmtM(booked)} of revenue per quarter as it goes live over the coming quarters.`, `Contract bookings add ${fmtM(booked)}/quarter of enterprise run-rate, going live via the backlog.`)), detail: 'Enterprise contract bookings' });
  const transition = (c.capability as unknown as { transitionLoad?: number }).transitionLoad ?? 0;
  if (transition > 0.5) out.push({ kind: 'decision', polarity: -1, weight: transition * 0.3, text: pick(mode, mt(`Changing strategy added ${transition.toFixed(0)} points of extra workload for your teams.`, `Destination transition adds ${transition.toFixed(1)} load points this quarter.`)), detail: 'Strategy transition workload' });
  if (c.crisisAssessment) out.push({ kind: 'decision', polarity: -1, weight: c.crisisAssessment.severity * 10, text: pick(mode, mt(`The crisis (“${c.crisisAssessment.title}”) hit with ${c.crisisAssessment.severity >= 0.45 ? 'serious' : c.crisisAssessment.severity >= 0.3 ? 'moderate' : 'minor'} severity, based on the company you built.`, `Crisis “${c.crisisAssessment.title}” — severity ${(c.crisisAssessment.severity * 100).toFixed(0)}% from the company's own vulnerabilities.`)), detail: 'Crisis assessment' });

  // Delayed investment impact: capability that matured this quarter from earlier investment
  const matured: Record<string, number> = {};
  for (const m of (c.capability as unknown as { maturation?: { quarterInvested: number; target: string; matured: number }[] }).maturation ?? []) {
    if (m.quarterInvested < q && m.matured > 0) matured[m.target] = (matured[m.target] ?? 0) + m.matured;
  }
  for (const [target, v] of Object.entries(matured)) {
    if (v < 0.5) continue;
    out.push({ kind: 'investment', polarity: 1, weight: v * 0.4, text: pick(mode, mt(`Money invested in earlier quarters paid off: ${CAPABILITY_LABEL[target] ?? target} +${v.toFixed(1)}.`, `Earlier investment matured into ${CAPABILITY_LABEL[target] ?? target} +${v.toFixed(1)} this quarter.`)), detail: 'Investments from earlier quarters maturing' });
  }
  const lost = ((c.capability as unknown as { targets?: { absorptionLoss: number }[] }).targets ?? []).reduce((t, x) => t + (x.absorptionLoss ?? 0), 0);
  if (lost > 0.5) out.push({ kind: 'investment', polarity: -1, weight: lost * 0.4, text: pick(mode, mt(`Teams were stretched, so ${lost.toFixed(1)} points of potential capability from this quarter’s investment were lost.`, `Load/capacity absorption lost ${lost.toFixed(1)} capability points of this quarter's investment.`)), detail: 'Investment lost to team overload' });
  void after;
  return out.sort((a, b) => b.weight - a.weight);
}

export interface QuarterStory { challenge: Impact | null; opportunity: Impact | null; watch: { text: string; detail: string } | null; impacts: Impact[] }

export function quarterStory(c: V2Consequence, after: V2TeamState, mode: V2PresentationMode): QuarterStory {
  const impacts = quarterImpacts(c, after, mode);
  return {
    challenge: impacts.find(i => i.polarity < 0) ?? null,
    opportunity: impacts.find(i => i.polarity > 0) ?? null,
    watch: whatToWatch(after, mode),
    impacts,
  };
}

/** One leading indicator or unresolved risk, from state that will affect coming quarters. */
export function whatToWatch(s: V2TeamState, mode: V2PresentationMode): { text: string; detail: string } | null {
  if (s.solvency.status === 'insolvent' || s.solvency.status === 'warning') return { text: pick(mode, mt(`Cash is dangerously low (${fmtM(s.cash)}). Plan financing or slower spending next quarter.`, `Liquidity status ${s.solvency.status} at ${fmtM(s.cash)}: resolve funding before committing new investment.`)), detail: 'Solvency status' };
  if (s.management.scheduledShocks.length > 0) return { text: pick(mode, mt('Staff cuts will keep affecting talent and culture next quarter as more people leave.', 'Committed aftershocks from workforce actions land next quarter (talent, culture).')), detail: 'Workforce actions (aftershocks)' };
  if (s.crisis.pending.length > 0) return { text: pick(mode, mt('The crisis is not over — more effects are still coming.', 'Crisis aftershocks are still pending.')), detail: 'Crisis (pending effects)' };
  const backlog = s.enterpriseBacklog.reduce((t, b) => t + (b.remaining ?? 0), 0);
  if (backlog > 0.5) return { text: pick(mode, mt(`${fmtM(backlog)} per quarter of signed enterprise revenue has not started yet — it should appear in coming quarters if delivery goes well.`, `${fmtM(backlog)}/quarter of contracted enterprise run-rate is still in backlog.`)), detail: 'Enterprise backlog' };
  const ratio = s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0;
  if (ratio > 0.9) return { text: pick(mode, mt('Teams are close to their limit. If you add more change, less of each new investment will turn into capability.', `Load at ${(ratio * 100).toFixed(0)}% of capacity: further initiatives will convert less investment into capability (absorption loss).`)), detail: 'Load vs capacity' };
  const pending = s.pendingCohorts.flatMap(c => c.gains.filter(g => (g.remaining ?? 0) > 0.3).map(g => g.target));
  if (pending.length) return { text: pick(mode, mt(`Investments in ${[...new Set(pending)].map(t => CAPABILITY_LABEL[t] ?? t).join(', ')} are still maturing — expect more improvement over the next quarters.`, `Capability still maturing: ${[...new Set(pending)].map(t => CAPABILITY_LABEL[t] ?? t).join(', ')}.`)), detail: 'Pending investment cohorts' };
  return null;
}
