/**
 * FACILITATOR DISCUSSION MODEL (Batch 10E)
 *
 * Turns each team's saved history — committed inputs, team-level deliberation (priority, belief, confidence, risk,
 * Q3 evidence), reflections, revealed votes and agreements — into the four questions the facilitator leads with:
 * what the team intended → what it decided → what happened → what it learned.
 *
 * Source: the existing PIN-protected `v2_facilitator_debrief` RPC (resolved quarters only; no private briefs, no
 * drafts). Outcomes are replayed with the frozen V2 engine and the existing valuation; nothing here creates a score,
 * a ranking or a good/bad verdict. Every indicator states its rule.
 */
import type { V2DebriefRow } from '../api';
import type { V2Deliberation, V2PlayerQuarterInput } from '../types';
import { replayInputs, envelopeFor } from '../adapter';
import { V2_FINAL_CALIBRATION } from '../../../simulation/engineV2Final';
import { gameHistory, type QuarterRecord } from './history';
import { valuationSeries } from './valuation';
import { decisionSummary } from './report';
import { BELIEFS, CONFIDENCE_LEVELS, LEARNING_OPTIONS, RISKS, decodeReflection } from '../content/deliberationContent';
import { DECISION_FRAMING, priorityLabel, evidenceLabel } from '../content/decisionFraming';
import { Q3_SIGNAL_ASSESSMENTS, VERDICT_LABEL } from '../content/signalAssessments';
import { AGREEMENT_LABEL } from './debrief';
import { destinationName, FINAL_LABELS } from '../ui/format';
import { pick, V2PresentationMode } from '../content/modes';

// ───────────────────────────── thresholds (approved: $5M or 15 percentage points) ─────────────────────────────
export const CHANGE_RULES = {
  dollars: 5,
  sharePoints: 0.15,
  confidenceSwing: 4,
  text: 'A change of direction is flagged when an investment area moves by at least $5M or 15 percentage points of the budget from the previous quarter. When the budget itself changes, or a decision caps investment, only the share of the money actually invested is compared. Stated priorities are compared only between quarters that ask the same question (Q4–Q8).',
} as const;

const AREAS = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const;
type Area = typeof AREAS[number];
export const AREA_LABEL: Record<Area | 'cashReserve', string> = { consumer: 'Consumer', enterprise: 'Enterprise', aiProduct: 'AI & product', people: 'People', universityCredentials: 'University', cashReserve: 'Kept as cash' };
const m = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(1)}M`;
const pp = (x: number) => `${Math.round(x * 100)}%`;

export interface FacQuarter {
  quarter: number;
  input: V2PlayerQuarterInput;
  deliberation: V2Deliberation | null;
  reflection: { learning: string[]; note: string | null } | null;
  record: QuarterRecord;
  price: number;
  priceChange: number;
  agreement: string | null;
  envelope: number;
  /** Investment ceiling imposed by a decision this quarter (Q8 stabilize and restructure), if any. */
  cap: number | null;
}

export interface FacTeam { teamId: string; name: string; completed: number; quarters: FacQuarter[] }

/** Build the per-team model from the facilitator debrief rows (resolved quarters only). */
export function buildFacilitatorTeams(rows: V2DebriefRow[]): FacTeam[] {
  return rows.map(r => {
    const inputs = r.inputs ?? [];
    const history = inputs.length ? gameHistory(replayInputs(inputs)) : [];
    const prices = history.length ? valuationSeries(history).points : [];
    return {
      teamId: r.team_id, name: r.team_name, completed: inputs.length,
      quarters: history.map((rec, i) => {
        const input = inputs[i];
        const dec = decodeReflection(r.reflections?.[i] ?? null);
        const ag = r.agreements?.[String(input.quarter)];
        return {
          quarter: input.quarter, input, deliberation: (r.deliberations?.[i] ?? null) as V2Deliberation | null,
          reflection: dec ? { learning: dec.learning ?? [], note: dec.note?.trim() ? dec.note.trim() : null } : null,
          record: rec, price: prices[i + 1]?.price ?? 0, priceChange: (prices[i + 1]?.price ?? 0) - (prices[i]?.price ?? 0),
          agreement: ag ? AGREEMENT_LABEL[ag.agreement] : null,
          envelope: envelopeFor(input.quarter, input.finalOption),
          cap: input.finalOption === 'stabilize-restructure' ? V2_FINAL_CALIBRATION.stabilize.investmentCap : null,
        };
      }),
    };
  });
}

// ───────────────────────────── privacy (projector) ─────────────────────────────

/** Display labels: real names normally; "Team A, B, …" in projector view (stable order). */
export function teamLabels(teams: { teamId: string; name: string }[], projector: boolean): Record<string, string> {
  const letter = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + Math.floor(i / 26) - 1)}${String.fromCharCode(65 + (i % 26))}`);
  return Object.fromEntries(teams.map((t, i) => [t.teamId, projector ? `Team ${letter(i)}` : t.name]));
}

export const reflectionKey = (teamId: string, quarter: number) => `${teamId}:${quarter}`;

/**
 * Free-text reflections are hidden by default. In normal view the facilitator reviews them and selects individual
 * notes; in projector view only the selected notes are returned.
 */
export function visibleNotes(teams: FacTeam[], selected: ReadonlySet<string>, projector: boolean, quarter?: number) {
  const all = teams.flatMap(t => t.quarters.filter(q => q.reflection?.note && (quarter === undefined || q.quarter === quarter))
    .map(q => ({ key: reflectionKey(t.teamId, q.quarter), teamId: t.teamId, quarter: q.quarter, note: q.reflection!.note!, selected: selected.has(reflectionKey(t.teamId, q.quarter)) })));
  return projector ? all.filter(n => n.selected) : all;
}

// ───────────────────────────── Q3 reveal gate ─────────────────────────────

/** Open only when there is at least one participating (started) team and every one of them has completed Q4. No override. */
export function q3RevealOpen(teams: { started: boolean; completed_quarter: number }[]): boolean {
  const participating = teams.filter(t => t.started);
  return participating.length > 0 && participating.every(t => t.completed_quarter >= 4);
}

export interface Q3SignalRow { id: string; label: string; citedBy: string[]; verdict: string | null; showed: string | null }

/** Which Q3 signals each team cited. Assessments are attached only when the gate is open. */
export function q3SignalPanel(teams: FacTeam[], gateOpen: boolean, mode: V2PresentationMode): Q3SignalRow[] {
  return (DECISION_FRAMING[3].evidence ?? []).map(e => {
    const a = Q3_SIGNAL_ASSESSMENTS.find(x => x.id === e.id);
    return {
      id: e.id, label: pick(mode, e.label),
      citedBy: teams.filter(t => t.quarters.find(q => q.quarter === 3)?.deliberation?.evidenceIds?.includes(e.id)).map(t => t.teamId),
      verdict: gateOpen && a ? VERDICT_LABEL[a.verdict] : null,
      showed: gateOpen && a ? a.showed : null,
    };
  });
}

// ───────────────────────────── intended / decided / happened / learned ─────────────────────────────

export interface FourColumns {
  intended: { priority: string | null; belief: string | null; confidence: string | null; risk: string | null; signals: string[] };
  decided: { allocation: string; event: string | null; commitment: string | null };
  happened: { revenue: string; cash: string; price: string };
  learned: { choices: string[]; hasNote: boolean };
}

export function fourColumns(q: FacQuarter, mode: V2PresentationMode): FourColumns {
  const d = q.deliberation;
  const pr = priorityLabel(q.quarter, d?.priorityId);
  const belief = BELIEFS[q.quarter]?.find(b => b.id === d?.beliefId);
  const risks = (d?.riskIds ?? []).map(id => RISKS[q.quarter]?.find(r => r.id === id)).filter(Boolean);
  const a = q.input.allocation;
  const invested = AREAS.filter(k => a[k] > 0).map(k => `${AREA_LABEL[k]} ${m(a[k])}`);
  const summary = decisionSummary(q.input);
  const event = [
    q.input.destination && `Destination: ${destinationName(q.input.destination)}`,
    q.input.opportunity && (q.input.opportunity.accept ? 'Accepted the global contract' : 'Declined the global contract'),
    q.input.management && Object.keys(q.input.management).length > 0 && summary.split('; ').find(s => s.startsWith('recession actions')),
    q.input.crisisResponse && `Crisis response: ${q.input.crisisResponse}`,
    q.input.finalOption && `Final decision: ${FINAL_LABELS[q.input.finalOption]}`,
  ].filter(Boolean).join(' · ') || null;
  const b = q.record.before, af = q.record.after;
  return {
    intended: {
      priority: pr ? pick(mode, pr) : null,
      belief: belief ? pick(mode, belief.label) : (d?.belief ?? null),
      confidence: CONFIDENCE_LEVELS.find(c => c.value === d?.confidence)?.label ?? null,
      risk: risks.length ? risks.map(r => pick(mode, r!.label)).join(' · ') : null,
      signals: (d?.evidenceIds ?? []).map(id => evidenceLabel(q.quarter, id)).filter(Boolean).map(l => pick(mode, l!)),
    },
    decided: { allocation: `${invested.join(' · ') || 'Nothing invested'}${a.cashReserve > 0.05 ? ` · kept ${m(a.cashReserve)}` : ''}`, event, commitment: q.agreement },
    happened: {
      revenue: `${m(b.revenue)} → ${m(af.revenue)} (${af.revenue - b.revenue >= 0 ? '+' : '−'}${m(Math.abs(af.revenue - b.revenue))})`,
      cash: m(af.cash),
      price: `$${q.price.toFixed(2)} (${q.priceChange >= 0 ? '+' : '−'}$${Math.abs(q.priceChange).toFixed(2)})`,
    },
    learned: {
      choices: (q.reflection?.learning ?? []).map(id => LEARNING_OPTIONS.find(o => o.id === id)).filter(Boolean).map(o => pick(mode, o!.label)),
      hasNote: !!q.reflection?.note,
    },
  };
}

// ───────────────────────────── change-of-direction indicators ─────────────────────────────

export interface ChangeIndicator {
  quarter: number;
  kind: 'allocation' | 'largest-area' | 'priority' | 'confidence';
  text: string;
  /** For ordering only (dollar-equivalent size of the move); never displayed as a score. */
  size: number;
}
export interface ChangeContext { quarter: number; text: string }

const investedOf = (a: V2PlayerQuarterInput['allocation']) => AREAS.reduce((t, k) => t + (a[k] || 0), 0);
const largest = (a: V2PlayerQuarterInput['allocation']): Area | null => {
  const sorted = AREAS.filter(k => a[k] > 0).sort((x, y) => a[y] - a[x]);
  return sorted.length && (sorted.length === 1 || a[sorted[0]] > a[sorted[1]] + 1e-9) ? sorted[0] : null;
};

/**
 * Factual changes between consecutive committed quarters, with the context that shapes them (a different budget, an
 * investment cap). Neutral wording; no change is labelled good or bad.
 */
export function changeIndicators(prev: FacQuarter, cur: FacQuarter): { changes: ChangeIndicator[]; context: ChangeContext[] } {
  const q = cur.quarter, a = cur.input.allocation, p = prev.input.allocation;
  const context: ChangeContext[] = [];
  const budgetChanged = Math.abs(cur.envelope - prev.envelope) > 0.01;
  if (budgetChanged) context.push({ quarter: q, text: `Budget changed from ${m(prev.envelope)} to ${m(cur.envelope)} (set by the final decision), so amounts are compared as shares of the money invested.` });
  if (cur.cap !== null) context.push({ quarter: q, text: `The chosen final option capped investment at ${m(cur.cap)}; lower amounts were required, not necessarily chosen.` });
  const constrained = budgetChanged || cur.cap !== null;
  const changes: ChangeIndicator[] = [];
  const invC = investedOf(a), invP = investedOf(p);
  const areas: (Area | 'cashReserve')[] = constrained ? [...AREAS] : [...AREAS, 'cashReserve'];
  for (const k of areas) {
    const dc = (a[k] || 0) - (p[k] || 0);
    const share = (x: V2PlayerQuarterInput['allocation'], env: number, inv: number) => constrained ? (inv > 0 && k !== 'cashReserve' ? (x[k] || 0) / inv : 0) : (x[k] || 0) / env;
    const sC = share(a, cur.envelope, invC), sP = share(p, prev.envelope, invP);
    const ds = sC - sP;
    const byDollars = !constrained && Math.abs(dc) >= CHANGE_RULES.dollars - 1e-9;
    const byShare = Math.abs(ds) >= CHANGE_RULES.sharePoints - 1e-9;
    if (byDollars || byShare) {
      changes.push({
        quarter: q, kind: 'allocation', size: constrained ? Math.abs(ds) * 30 : Math.max(Math.abs(dc), Math.abs(ds) * 30),
        text: `${AREA_LABEL[k]}: ${m(p[k] || 0)} → ${m(a[k] || 0)} (${pp(sP)} → ${pp(sC)} of ${constrained ? 'the money invested' : 'the budget'})`,
      });
    }
  }
  const lp = largest(p), lc = largest(a);
  if (lp && lc && lp !== lc) changes.push({ quarter: q, kind: 'largest-area', size: 1, text: `Largest investment area: ${AREA_LABEL[lp]} → ${AREA_LABEL[lc]}` });
  const dp = prev.deliberation, dcur = cur.deliberation;
  if (prev.quarter >= 4 && q >= 4 && dp?.priorityId && dcur?.priorityId && dp.priorityId !== dcur.priorityId) {
    changes.push({ quarter: q, kind: 'priority', size: 1, text: `Stated priority: ${priorityLabel(prev.quarter, dp.priorityId)?.ug} → ${priorityLabel(q, dcur.priorityId)?.ug}` });
  }
  if (dp?.confidence && dcur?.confidence && Math.abs(dcur.confidence - dp.confidence) >= CHANGE_RULES.confidenceSwing) {
    changes.push({ quarter: q, kind: 'confidence', size: 0.5, text: `Confidence: ${CONFIDENCE_LEVELS.find(c => c.value === dp.confidence)?.label} → ${CONFIDENCE_LEVELS.find(c => c.value === dcur.confidence)?.label}` });
  }
  return { changes, context };
}

// ───────────────────────────── continuity / adaptation / potential misalignment ─────────────────────────────

/**
 * Explicit, stated rules that compare a stated priority with the money committed. A match prompts a question
 * ("potential misalignment"), never a verdict: the team may have had reasons. Priorities without a clear money
 * signature (for example Q2 stances, "get ready for the likely direction") have no rule.
 */
export const ALIGNMENT_RULES: Record<string, { rule: string; test: (i: V2PlayerQuarterInput, env: number) => boolean }> = {
  'q1-grow-now': { rule: 'less than a third of the investment went to the established businesses (Consumer, Enterprise, University)', test: (i) => { const v = investedOf(i.allocation); return v > 0 && (i.allocation.consumer + i.allocation.enterprise + i.allocation.universityCredentials) / v < 1 / 3; } },
  'q1-build-future': { rule: 'less than a third of the investment went to AI & product and People', test: (i) => { const v = investedOf(i.allocation); return v > 0 && (i.allocation.aiProduct + i.allocation.people) / v < 1 / 3; } },
  'q1-strengthen-org': { rule: 'nothing was invested in People', test: (i) => i.allocation.people <= 0 },
  'q1-stay-flexible': { rule: 'less than 20% of the budget was kept as cash', test: (i, env) => i.allocation.cashReserve / env < 0.2 },
  'q3-keep-options': { rule: 'one area received more than 70% of the investment', test: (i) => { const v = investedOf(i.allocation); return v > 0 && Math.max(...AREAS.map(k => i.allocation[k])) / v > 0.7; } },
  'q3-protect-revenue': { rule: 'less than a third of the investment went to the established businesses (Consumer, Enterprise, University)', test: (i) => { const v = investedOf(i.allocation); return v > 0 && (i.allocation.consumer + i.allocation.enterprise + i.allocation.universityCredentials) / v < 1 / 3; } },
  'q3-test-small': { rule: 'AI & product received more than half of the budget', test: (i, env) => i.allocation.aiProduct / env > 0.5 },
  'growth': { rule: 'less than half of the budget was invested', test: (i, env) => investedOf(i.allocation) / env < 0.5 },
  'resilience': { rule: 'the whole budget was invested and nothing was kept as cash', test: (i) => i.allocation.cashReserve <= 0.05 },
  'capability': { rule: 'less than half of the budget was invested', test: (i, env) => investedOf(i.allocation) / env < 0.5 },
  'organization': { rule: 'nothing was invested in People, or a deep workforce reduction was chosen', test: (i) => i.allocation.people <= 0 || i.management?.workforceReduction?.depth === 'deep' },
};

export type Pattern = 'starting-position' | 'continuity' | 'adaptation';
export interface TimelineRow {
  quarter: number;
  cols: FourColumns;
  pattern: Pattern;
  patternText: string;
  changes: ChangeIndicator[];
  context: ChangeContext[];
  misalignment: string | null;
}

export function teamTimeline(t: FacTeam, mode: V2PresentationMode): TimelineRow[] {
  return t.quarters.map((q, i) => {
    const prev = i > 0 ? t.quarters[i - 1] : null;
    const { changes, context } = prev ? changeIndicators(prev, q) : { changes: [], context: [] };
    const direction = changes.filter(c => c.kind !== 'confidence');
    const pattern: Pattern = !prev ? 'starting-position' : direction.length ? 'adaptation' : 'continuity';
    const prevLearn = prev?.reflection?.learning.map(id => LEARNING_OPTIONS.find(o => o.id === id)?.label.ug).filter(Boolean) ?? [];
    const patternText = pattern === 'starting-position' ? 'Starting position.'
      : pattern === 'continuity' ? `Continuity: no change of direction against ${'Q' + prev!.quarter}.`
        : `Adaptation: ${direction.length} change${direction.length === 1 ? '' : 's'} of direction against Q${prev!.quarter}.${prevLearn.length ? ` The previous reflection recorded: ${prevLearn.map(x => `“${x}”`).join(', ')}.` : ''}`;
    const rule = q.deliberation?.priorityId ? ALIGNMENT_RULES[q.deliberation.priorityId] : undefined;
    const limit = q.cap ?? q.envelope;
    const misalignment = rule && rule.test(q.input, limit)
      ? `Potential misalignment: the stated priority was “${priorityLabel(q.quarter, q.deliberation!.priorityId)?.ug}”, and ${rule.rule}. A question for discussion — the team may have had reasons.`
      : null;
    return { quarter: q.quarter, cols: fourColumns(q, mode), pattern, patternText, changes, context, misalignment };
  });
}

/** A one-paragraph, factual description of a team's path. No score. */
export function teamPathSummary(rows: TimelineRow[]): string {
  if (!rows.length) return 'No quarter completed yet.';
  const adapt = rows.filter(r => r.pattern === 'adaptation').map(r => `Q${r.quarter}`);
  const cont = rows.filter(r => r.pattern === 'continuity').map(r => `Q${r.quarter}`);
  const mis = rows.filter(r => r.misalignment).map(r => `Q${r.quarter}`);
  return [
    adapt.length ? `Changed direction in ${adapt.join(', ')}.` : 'No change of direction flagged.',
    cont.length ? `Held course in ${cont.join(', ')}.` : '',
    mis.length ? `Stated priority and allocation diverged by the stated rules in ${mis.join(', ')}.` : 'Stated priorities and allocations were consistent by the stated rules.',
  ].filter(Boolean).join(' ');
}

// ───────────────────────────── class view ─────────────────────────────

const tally = (xs: string[]) => {
  const c = new Map<string, number>();
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} × ${k}`).join(' · ');
};

/** One factual line describing how the class decided in a quarter. */
export function classPattern(teams: FacTeam[], quarter: number, mode: V2PresentationMode): string[] {
  const qs = teams.map(t => t.quarters.find(q => q.quarter === quarter)).filter(Boolean) as FacQuarter[];
  if (!qs.length) return [];
  const out: string[] = [];
  const pr = qs.map(q => priorityLabel(quarter, q.deliberation?.priorityId)).filter(Boolean).map(l => pick(mode, l!));
  if (pr.length) out.push(`${quarter === 2 ? 'Stances' : 'Priorities'}: ${tally(pr)}`);
  if (quarter === 3) {
    const cited = qs.flatMap(q => (q.deliberation?.evidenceIds ?? []).map(id => evidenceLabel(3, id)).filter(Boolean).map(l => pick(mode, l!)));
    if (cited.length) out.push(`Signals cited: ${tally(cited)}`);
  }
  const ev = qs.map(q => q.input.destination ? destinationName(q.input.destination)
    : q.input.opportunity ? (q.input.opportunity.accept ? 'Accepted the contract' : 'Declined the contract')
      : q.input.crisisResponse ? `Crisis: ${q.input.crisisResponse}`
        : q.input.finalOption ? FINAL_LABELS[q.input.finalOption]
          : quarter === 6 ? (q.input.management && Object.keys(q.input.management).length ? 'Took recession actions' : 'No recession actions') : null).filter(Boolean) as string[];
  if (ev.length) out.push(`Decisions: ${tally(ev)}`);
  const lead = qs.map(q => largest(q.input.allocation)).map(a => (a ? AREA_LABEL[a] : 'No single largest area'));
  out.push(`Largest investment area: ${tally(lead)}`);
  return out;
}

/** The quarter the class view opens on: the latest quarter every team with data has completed. */
export function defaultDiscussionQuarter(teams: FacTeam[]): number {
  const withData = teams.filter(t => t.completed > 0);
  return withData.length ? Math.max(1, Math.min(...withData.map(t => t.completed))) : 1;
}

// ───────────────────────────── final debrief ─────────────────────────────

export interface Q3ToQ4Row { teamId: string; signals: string[]; verdicts: (string | null)[]; q4Priority: string | null; destination: string | null }

export function q3ToQ4(teams: FacTeam[], gateOpen: boolean, mode: V2PresentationMode): Q3ToQ4Row[] {
  return teams.filter(t => t.completed >= 4).map(t => {
    const q3 = t.quarters.find(q => q.quarter === 3), q4 = t.quarters.find(q => q.quarter === 4);
    const ids = q3?.deliberation?.evidenceIds ?? [];
    return {
      teamId: t.teamId,
      signals: ids.map(id => evidenceLabel(3, id)).filter(Boolean).map(l => pick(mode, l!)),
      verdicts: ids.map(id => { const a = Q3_SIGNAL_ASSESSMENTS.find(x => x.id === id); return gateOpen && a ? VERDICT_LABEL[a.verdict] : null; }),
      q4Priority: (() => { const l = priorityLabel(4, q4?.deliberation?.priorityId); return l ? pick(mode, l) : null; })(),
      destination: q4?.input.destination ? destinationName(q4.input.destination) : null,
    };
  });
}

/**
 * The largest factual changes of direction across the class, one entry per team and quarter (ordering only; the
 * size is never shown as a score).
 */
export function biggestChanges(teams: FacTeam[], n = 3): { teamId: string; quarter: number; items: string[]; size: number }[] {
  return teams.flatMap(t => t.quarters.slice(1).map((q, i) => {
    const ch = changeIndicators(t.quarters[i], q).changes.filter(c => c.kind === 'allocation');
    return { teamId: t.teamId, quarter: q.quarter, items: ch.map(c => c.text), size: ch.reduce((x, c) => x + c.size, 0) };
  })).filter(g => g.items.length > 0).sort((a, b) => b.size - a.size).slice(0, n);
}

/** Learning choices across the class for one quarter (structured; safe to project as counts). */
export function learningTally(teams: FacTeam[], quarter: number, mode: V2PresentationMode): string {
  const ids = teams.flatMap(t => t.quarters.find(q => q.quarter === quarter)?.reflection?.learning ?? []);
  return tally(ids.map(id => LEARNING_OPTIONS.find(o => o.id === id)).filter(Boolean).map(o => pick(mode, o!.label)));
}

export const FINAL_DEBRIEF_AGENDA = [
  { minutes: 5, title: 'Teams read their board report', detail: 'Final report, verdict and defence prompts.' },
  { minutes: 8, title: 'Board defence', detail: 'Each team defends one decision; sample teams if there are more than four.' },
  { minutes: 7, title: 'Class debrief', detail: 'Where teams ended, the biggest changes of direction, Q3 evidence and the Q4 commitment, and what teams would do differently.' },
] as const;
