import type { V2Deliberation, V2PlayerQuarterInput } from '../../types';
import { budgetFor, type GameConfig } from '../../engine';
import { BELIEFS, RISKS, CONFIDENCE_LEVELS } from '../../content/deliberationContent';
import { pick, V2PresentationMode } from '../../content/modes';
import { priorityLabel, evidenceLabel, DECISION_FRAMING } from '../../content/decisionFraming';
import { BUCKET_LABELS, FINAL_LABELS, destinationName, money } from '../format';

/** Concise "are we ready?" summary of the decision and the discussion (Batch 7). */
export function DecisionSummary({ input, deliberation, quarter, mode, config }: { input: V2PlayerQuarterInput; deliberation?: V2Deliberation; quarter: number; mode: V2PresentationMode; config?: GameConfig }) {
  const env = budgetFor(input, config);
  const buckets = (['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const).filter(b => input.allocation[b] > 0);
  const belief = BELIEFS[quarter]?.find(b => b.id === deliberation?.beliefId);
  const conf = CONFIDENCE_LEVELS.find(c => c.value === deliberation?.confidence)?.label;
  const risks = (deliberation?.riskIds ?? []).map(id => RISKS[quarter]?.find(r => r.id === id)).filter(Boolean);
  const prio = priorityLabel(quarter, deliberation?.priorityId);
  const evidence = (deliberation?.evidenceIds ?? []).map(id => evidenceLabel(quarter, id)).filter(Boolean);
  const decision = [
    input.destination && `Strategy: ${destinationName(input.destination)}`,
    input.opportunity && `Contract: ${input.opportunity.accept ? 'accept' : 'decline'}`,
    input.management && Object.keys(input.management).length > 0 && 'Recession actions selected',
    input.crisisResponse && `Crisis response: ${input.crisisResponse}`,
    input.finalOption && `Final decision: ${FINAL_LABELS[input.finalOption]}`,
    ...(input.financing ?? []).map(f => `Financing: ${f.kind}${'amount' in f ? ` ${money(f.amount)}` : ''}`),
  ].filter(Boolean) as string[];
  return (
    <div className="ds-stack" style={{ gap: 8 }} data-testid="v2-decision-summary">
      <div>
        <p className="ds-h4">Investment ({money(env, 0)})</p>
        <div className="ds-small">{buckets.length ? buckets.map(b => `${BUCKET_LABELS[b]} ${money(input.allocation[b])}`).join(' · ') : 'Nothing invested'}{input.allocation.cashReserve > 0 ? ` · Kept as cash ${money(input.allocation.cashReserve)}` : ''}</div>
      </div>
      {decision.length > 0 && <div><p className="ds-h4">Decision</p><div className="ds-small">{decision.join(' · ')}</div></div>}
      {deliberation && (
        <>
          {DECISION_FRAMING[quarter] && <div><p className="ds-h4">{quarter === 2 ? 'Our stance' : 'Our strategic priority'}</p><div className="ds-small" data-testid="v2-summary-priority">{prio ? pick(mode, prio) : '—'}</div></div>}
          {evidence.length > 0 && <div><p className="ds-h4">Evidence we weighted most</p><div className="ds-small">{evidence.map(e => pick(mode, e!)).join(' · ')}</div></div>}
          <div><p className="ds-h4">Our evidence</p><div className="ds-small">{belief ? pick(mode, belief.label) : '—'}{conf ? ` (confidence: ${conf})` : ''}</div></div>
          <div><p className="ds-h4">{risks.length > 1 ? 'Top risks' : 'Our biggest risk'}</p><div className="ds-small">{risks.length ? risks.map(r => pick(mode, r!.label)).join(' · ') : '—'}</div></div>
        </>
      )}
    </div>
  );
}
