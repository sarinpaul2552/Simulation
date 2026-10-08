/**
 * FACILITATOR DEBRIEF (Batch 7 · 7C-G)
 *
 * Built in the facilitator's browser from each team's committed decisions (replayed with the frozen engine), the
 * team-level deliberation (belief, risks) and — once a quarter is resolved — its revealed leadership votes.
 * Private role briefings are never part of the input.
 */
import type { V2Role } from '../../../simulation/engineV2Scenario';
import { V2_DESTINATIONS } from '../../../simulation/engineV2Destination';
import { replayInputs } from '../adapter';
import type { V2Deliberation, V2PlayerQuarterInput, V2VoteValue } from '../types';
import { buildLearningReport, decisionSummary } from './report';
import { beliefLabel } from '../content/deliberationContent';

export interface DebriefTeamInput {
  team_id: string;
  team_name: string;
  inputs: V2PlayerQuarterInput[];
  deliberations?: (V2Deliberation | null)[];
  votes?: Record<string, Partial<Record<V2Role, V2VoteValue>>>;
}

export interface TeamDebrief {
  teamId: string;
  teamName: string;
  completed: number;
  strategy: string;
  decisions: { quarter: number; text: string; belief?: string }[];
  trajectory: { quarter: number; revenue: number; operatingProfit: number; cash: number }[];
  strongest: string[];
  weakest: string[];
  disagreements: { quarter: number; text: string }[];
  pivotal: { quarter: number; text: string }[];
  questions: string[];
  final: { overall: number; financial: number; strategic: number; organizational: number } | null;
}

const CAP: Record<string, string> = { consumer: 'Consumer', enterprise: 'Enterprise', customerSuccess: 'Customer Success', ai: 'AI/Product', talent: 'Talent', credential: 'Credential', execution: 'Execution', growth: 'Growth' };

const BUCKET_NAME: Record<string, string> = { consumer: 'Consumer', enterprise: 'Enterprise', aiProduct: 'AI/Product', people: 'People', universityCredentials: 'University & Credentials' };

export function buildTeamDebrief(t: DebriefTeamInput): TeamDebrief {
  const snap = replayInputs(t.inputs);
  const s = snap.state;
  const complete = snap.completedQuarter >= 8;
  const report = complete ? buildLearningReport(snap, 'mba') : null;
  const caps = Object.entries(s.capabilities).sort((a, b) => b[1] - a[1]);
  const disagreements = Object.entries(t.votes ?? {}).flatMap(([q, v]) => {
    const vals = Object.entries(v);
    const against = vals.filter(([, x]) => x === 'oppose');
    const concern = vals.filter(([, x]) => x === 'concern');
    if (against.length + concern.length < 2) return [];
    return [{ quarter: Number(q), text: `${against.length} oppose${against.length ? ` (${against.map(([r]) => r).join(', ')})` : ''}, ${concern.length} concern${concern.length ? ` (${concern.map(([r]) => r).join(', ')})` : ''} — committed anyway.` }];
  }).sort((a, b) => a.quarter - b.quarter);
  const allocShare = t.inputs.reduce((acc, i) => { for (const [k, v] of Object.entries(i.allocation)) if (k !== 'cashReserve') acc[k] = (acc[k] ?? 0) + v; return acc; }, {} as Record<string, number>);
  const topBucket = Object.entries(allocShare).sort((a, b) => b[1] - a[1])[0];
  const strategy = `${s.destination ? V2_DESTINATIONS[s.destination.id].name : 'No destination yet'}; heaviest investment in ${topBucket ? (BUCKET_NAME[topBucket[0]] ?? topBucket[0]) : '—'}.`;
  const questions = [
    s.destination ? `Why did you choose ${V2_DESTINATIONS[s.destination.id].name}, and what evidence mattered most?` : 'What evidence will decide your Q4 commitment?',
    disagreements.length ? `In Q${disagreements[0].quarter} some leaders opposed or raised concerns — how did the team resolve it?` : 'Did anyone disagree privately but support publicly? What did that cost?',
    s.solvency.everInsolvent || s.financing.debt > 0 ? 'How did cash constraints change what you could do later?' : 'Was your cash buffer an asset or an under-investment?',
    'Which result surprised you most, and which earlier decision caused it?',
  ];
  return {
    teamId: t.team_id, teamName: t.team_name, completed: snap.completedQuarter, strategy,
    decisions: t.inputs.map((i, k) => ({ quarter: i.quarter, text: decisionSummary(i), belief: (() => { const d = t.deliberations?.[k]; const id = (d as { beliefId?: string } | null)?.beliefId; const l = id ? beliefLabel(i.quarter, id) : undefined; return l ? l.mba : d?.belief; })() })),
    trajectory: s.ledgerHistory.map(l => ({ quarter: l.quarter, revenue: l.revenue, operatingProfit: l.operatingProfit, cash: l.closingCash })),
    strongest: caps.slice(0, 2).map(([k, v]) => `${CAP[k] ?? k} ${v.toFixed(0)}`),
    weakest: caps.slice(-2).map(([k, v]) => `${CAP[k] ?? k} ${v.toFixed(0)}`),
    disagreements,
    pivotal: report ? report.pivotal.map(p => ({ quarter: p.quarter, text: `${p.decision} ${p.immediate}` })) : [],
    questions,
    final: report ? { overall: report.score.overall, financial: report.score.financial, strategic: report.score.strategic, organizational: report.score.organizational } : null,
  };
}
