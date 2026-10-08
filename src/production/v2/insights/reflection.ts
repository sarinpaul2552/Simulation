/**
 * Structured reflection evidence (Batch 7 · 7A-E): shows the recorded before→after values relevant to the team's
 * chosen belief. It reports facts only — one quarter rarely proves or disproves a belief, so no verdict is given.
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { BELIEF_TOPICS, BeliefTopic } from '../content/deliberationContent';

export interface EvidenceRow { label: string; before: string; after: string; direction: 'up' | 'down' | 'flat' }
const m = (x: number) => `$${x.toFixed(1)}M`;
const p = (x: number) => `${x.toFixed(1)}%`;
const n = (x: number) => x.toFixed(0);

const TOPIC_ROWS: Record<BeliefTopic, (s: V2TeamState) => { label: string; value: number; fmt: (x: number) => string }[]> = {
  revenue: s => [{ label: 'Revenue', value: s.revenue, fmt: m }],
  cash: s => [{ label: 'Cash', value: s.cash, fmt: m }],
  consumer: s => [{ label: 'Consumer revenue', value: s.segmentRevenue.consumer, fmt: m }, { label: 'Consumer retention', value: s.commercial.consumerRetention, fmt: p }],
  enterprise: s => [{ label: 'Enterprise revenue', value: s.segmentRevenue.enterprise, fmt: m }, { label: 'Enterprise pipeline', value: s.commercial.enterprisePipeline, fmt: m }],
  ai: s => [{ label: 'AI-native revenue', value: s.segmentRevenue.aiNative, fmt: m }, { label: 'AI adoption', value: s.commercial.aiAdoptionIndex, fmt: n }],
  people: s => [{ label: 'Talent', value: s.capabilities.talent, fmt: n }, { label: 'Culture', value: s.culture, fmt: n }],
  university: s => [{ label: 'University revenue', value: s.segmentRevenue.university, fmt: m }],
  strategy: s => [{ label: 'Organizational capacity', value: s.organizationalCapacity, fmt: n }, { label: 'Change load', value: s.transformationLoad, fmt: n }],
};

export function reflectionEvidence(beliefId: string | undefined, before: V2TeamState, after: V2TeamState): EvidenceRow[] {
  const topics = (beliefId && BELIEF_TOPICS[beliefId]) || ['revenue', 'cash'];
  const rows: EvidenceRow[] = [];
  for (const t of topics) {
    const b = TOPIC_ROWS[t](before), a = TOPIC_ROWS[t](after);
    b.forEach((x, i) => {
      const d = a[i].value - x.value;
      rows.push({ label: x.label, before: x.fmt(x.value), after: a[i].fmt(a[i].value), direction: Math.abs(d) < 1e-6 * Math.max(1, Math.abs(x.value)) || x.fmt(x.value) === a[i].fmt(a[i].value) ? 'flat' : d > 0 ? 'up' : 'down' });
    });
  }
  return rows;
}
