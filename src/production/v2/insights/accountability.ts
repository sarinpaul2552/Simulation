/**
 * Expected → decided → happened → learned (Batch 10A).
 *
 * Restates what the team recorded before committing and what it decided, from stored data only. It makes no
 * causal claim: the "happened" side is the existing recorded before→after table (insights/reflection.ts), and the
 * caveat names the other forces that move results.
 */
import type { V2Deliberation, V2PlayerQuarterInput } from '../types';
import { BELIEFS, CONFIDENCE_LEVELS, RISKS } from '../content/deliberationContent';
import { evidenceLabel, priorityLabel } from '../content/decisionFraming';
import { pick, V2PresentationMode } from '../content/modes';
import { decisionSummary } from './report';

export interface AccountabilityRow { id: 'priority' | 'evidence' | 'signals' | 'risk' | 'decided'; label: string; text: string }

export const NOT_RECORDED = 'Not recorded';

export const ACCOUNTABILITY_CAVEAT =
  'Results reflect market conditions, earlier investments and your teams’ capacity as well as this quarter’s choices. Compare them with what you expected; one quarter rarely proves a call right or wrong.';

export function accountabilityRows(quarter: number, d: V2Deliberation | null | undefined, input: V2PlayerQuarterInput, mode: V2PresentationMode, opts: { accurate?: boolean } = {}): AccountabilityRow[] {
  const prio = priorityLabel(quarter, d?.priorityId);
  const belief = BELIEFS[quarter]?.find(b => b.id === d?.beliefId);
  const conf = CONFIDENCE_LEVELS.find(c => c.value === d?.confidence)?.label;
  const risks = (d?.riskIds ?? []).map(id => RISKS[quarter]?.find(r => r.id === id)).filter(Boolean);
  const signals = (d?.evidenceIds ?? []).map(id => evidenceLabel(quarter, id)).filter(Boolean);
  const rows: AccountabilityRow[] = [
    { id: 'priority', label: quarter === 2 ? 'Our stance' : 'Our priority', text: prio ? pick(mode, prio) : NOT_RECORDED },
    { id: 'evidence', label: 'Our evidence', text: belief ? `${pick(mode, belief.label)}${conf ? ` (${conf.toLowerCase()} confidence)` : ''}` : (d?.belief ?? NOT_RECORDED) },
  ];
  if (signals.length) rows.push({ id: 'signals', label: 'Signals we weighted most', text: signals.map(s => pick(mode, s!)).join(' · ') });
  rows.push({ id: 'risk', label: risks.length > 1 ? 'Risks we named' : 'Our biggest risk', text: risks.length ? risks.map(r => pick(mode, r!.label)).join(' · ') : NOT_RECORDED });
  const decided = decisionSummary(input, opts);
  rows.push({ id: 'decided', label: 'What we decided', text: decided ? decided.charAt(0).toUpperCase() + decided.slice(1) + '.' : 'Kept the whole budget as cash.' });
  return rows;
}
