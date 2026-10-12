/**
 * Structured reflection evidence (Batch 7 · 7A-E): shows the recorded before→after values relevant to the team's
 * chosen belief. It reports facts only — one quarter rarely proves or disproves a belief, so no verdict is given.
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { BELIEF_TOPICS, BeliefTopic } from '../content/deliberationContent';
import { startingCompany, type QuarterRecord } from './history';

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

// ───────────── Batch 8 · Stage 2: the four businesses in the reflection ─────────────

export const SEGMENT_LINKS = [
  { key: 'consumer', label: 'Consumer', bucket: 'consumer', capability: 'consumer', capabilityLabel: 'Consumer capability' },
  { key: 'enterprise', label: 'Enterprise', bucket: 'enterprise', capability: 'enterprise', capabilityLabel: 'Enterprise capability' },
  { key: 'aiNative', label: 'AI-native', bucket: 'aiProduct', capability: 'ai', capabilityLabel: 'AI capability' },
  { key: 'university', label: 'University', bucket: 'universityCredentials', capability: 'credential', capabilityLabel: 'Credential capability' },
] as const;

export interface SegmentReflectionRow {
  key: string; label: string;
  start: number; current: number; quarterMove: number;
  allocatedThisQuarter: number; allocatedTotal: number;
  capabilityStart: number; capabilityNow: number; capabilityLabel: string;
  neglected: string | null;
}

/** Every segment: start, current, this quarter's movement, allocation and capability movement — recorded values only. */
export function segmentReflection(history: QuarterRecord[], quarter = history.length): SegmentReflectionRow[] {
  const s0 = startingCompany();
  const rec = history[quarter - 1];
  return SEGMENT_LINKS.map(l => {
    const start = s0.segmentRevenue[l.key], current = rec.after.segmentRevenue[l.key];
    const allocatedTotal = history.slice(0, quarter).reduce((t, h) => t + ((h.input.allocation as unknown as Record<string, number>)[l.bucket] ?? 0), 0);
    const capStart = (s0.capabilities as unknown as Record<string, number>)[l.capability];
    const capNow = (rec.after.capabilities as unknown as Record<string, number>)[l.capability];
    const neglected = allocatedTotal < 0.05 && current < start - 0.05
      ? `No money has gone into ${l.label} since Q4 2022, and its revenue is $${(start - current).toFixed(1)}M a quarter lower than when you started.`
      : allocatedTotal < 0.05 ? `No money has gone into ${l.label} so far.` : null;
    return {
      key: l.key, label: l.label, start, current, quarterMove: current - rec.before.segmentRevenue[l.key],
      allocatedThisQuarter: (rec.input.allocation as unknown as Record<string, number>)[l.bucket] ?? 0, allocatedTotal,
      capabilityStart: capStart, capabilityNow: capNow, capabilityLabel: l.capabilityLabel, neglected,
    };
  });
}
