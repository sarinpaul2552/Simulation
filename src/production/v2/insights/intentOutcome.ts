/**
 * Board report: "Intent and outcome" and defence prompts that quote the team's own recorded rationale (Batch 10E).
 * Team-visible, own data only. Reuses the facilitator model so students and facilitator see the same facts.
 */
import type { V2DebriefRow } from '../api';
import type { V2Deliberation, V2PlayerQuarterInput } from '../types';
import { buildFacilitatorTeams, teamTimeline, biggestChanges, type FacTeam, type TimelineRow } from './facilitator';
import { evidenceLabel } from '../content/decisionFraming';
import { Q3_SIGNAL_ASSESSMENTS, VERDICT_LABEL } from '../content/signalAssessments';
import { destinationName } from '../ui/format';
import { pick, V2PresentationMode } from '../content/modes';

export interface OwnResolution { quarter: number; input: V2PlayerQuarterInput; deliberation?: unknown; reflection?: string | null; agreement?: string | null }

export function ownTeam(teamName: string, resolutions: OwnResolution[]): FacTeam {
  const rs = [...resolutions].sort((a, b) => a.quarter - b.quarter);
  const row: V2DebriefRow = {
    team_id: 'own', team_name: teamName, completed_quarter: rs.length,
    inputs: rs.map(r => r.input), deliberations: rs.map(r => (r.deliberation ?? null) as V2Deliberation | null), reflections: rs.map(r => r.reflection ?? null), votes: {},
    agreements: Object.fromEntries(rs.filter(r => r.agreement).map(r => [String(r.quarter), { agreement: r.agreement as 'agreed', committed_by: null }])),
  };
  return buildFacilitatorTeams([row])[0];
}

export function intentOutcomeRows(team: FacTeam, mode: V2PresentationMode): TimelineRow[] {
  return teamTimeline(team, mode);
}

export interface RationalePrompt { id: string; question: string; evidence: string }

/** Up to three board questions built from what the team itself recorded. No verdicts. */
export function rationalePrompts(team: FacTeam, mode: V2PresentationMode): RationalePrompt[] {
  const out: RationalePrompt[] = [];
  const rows = teamTimeline(team, mode);
  const q3 = team.quarters.find(q => q.quarter === 3), q4 = team.quarters.find(q => q.quarter === 4);
  const ids = q3?.deliberation?.evidenceIds ?? [];
  if (ids.length && q4) {
    const names = ids.map(id => evidenceLabel(3, id)).filter(Boolean).map(l => pick(mode, l!));
    const verdicts = ids.map(id => { const a = Q3_SIGNAL_ASSESSMENTS.find(x => x.id === id); return a ? `${pick(mode, evidenceLabel(3, id)!)}: ${VERDICT_LABEL[a.verdict].toLowerCase()}` : null; }).filter(Boolean);
    out.push({
      id: 'q3-evidence',
      question: `In Q3 you cited ${names.join(' and ')}. How did that evidence shape your Q4 commitment to ${destinationName(q4.input.destination)}, and would you weight it the same way now?`,
      evidence: `Looking back at Q3: ${verdicts.join('; ')}.`,
    });
  }
  const big = biggestChanges([team], 1)[0];
  if (big) out.push({ id: 'change', question: `In Q${big.quarter} you changed direction. What prompted the change, and what did you expect it to achieve?`, evidence: big.items.join('; ') + '.' });
  const mis = rows.find(r => r.misalignment);
  if (mis) out.push({ id: 'alignment', question: `In Q${mis.quarter}, how would you explain to the board the gap between your stated priority and where the money went?`, evidence: mis.misalignment! });
  else {
    const diff = team.quarters.find(q => q.reflection?.learning.includes('different'));
    if (diff) out.push({ id: 'different-call', question: `After Q${diff.quarter} you said you would make a different call. What would it have been, and what would it have cost?`, evidence: `Recorded in your Q${diff.quarter} reflection.` });
  }
  return out.slice(0, 3);
}
