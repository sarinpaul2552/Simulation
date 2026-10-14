/**
 * NEXLEARN V3 LABORATORY — strategy set. Reuses the Batch 9 laboratory strategies and the Test Lab arc strategies
 * unchanged (same allocations, same DEFAULT_POLICY for events), plus the categories the V3 brief names explicitly.
 */
import { ARC_STRATEGIES, a, type V2ArcStrategy } from '../../../src/testlab/utils/v2ScenarioArc';
import { LAB_STRATEGIES, EXTRA_STRATEGIES } from '../batch9/strategies';

export type Category = 'AI-heavy' | 'Consumer-heavy' | 'Enterprise-heavy' | 'University-heavy' | 'People-heavy' | 'Diversified' | 'Cash preservation' | 'Adaptive' | 'Deliberately weak';
export interface V3LabStrategy { category: Category; strategy: V2ArcStrategy; allocationText: string }

const lab = (id: string) => [...LAB_STRATEGIES, ...EXTRA_STRATEGIES].find(s => s.strategy.id === id)!;
const arc = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;

export const V3_LAB_STRATEGIES: V3LabStrategy[] = [
  { category: 'AI-heavy', strategy: lab('ai-only').strategy, allocationText: lab('ai-only').allocationText },
  { category: 'AI-heavy', strategy: lab('ai-led').strategy, allocationText: lab('ai-led').allocationText },
  { category: 'Consumer-heavy', strategy: lab('consumer-only').strategy, allocationText: lab('consumer-only').allocationText },
  { category: 'Consumer-heavy', strategy: lab('consumer-led').strategy, allocationText: lab('consumer-led').allocationText },
  { category: 'Enterprise-heavy', strategy: lab('enterprise-only').strategy, allocationText: lab('enterprise-only').allocationText },
  { category: 'Enterprise-heavy', strategy: lab('enterprise-led').strategy, allocationText: lab('enterprise-led').allocationText },
  { category: 'Enterprise-heavy', strategy: lab('enterprise-ai-pair').strategy, allocationText: lab('enterprise-ai-pair').allocationText },
  { category: 'University-heavy', strategy: lab('university-only').strategy, allocationText: lab('university-only').allocationText },
  { category: 'University-heavy', strategy: lab('university-led').strategy, allocationText: lab('university-led').allocationText },
  { category: 'People-heavy', strategy: { ...arc('people100'), id: 'people-only', name: 'People-only' }, allocationText: '$30M People' },
  { category: 'People-heavy', strategy: arc('premium-builder'), allocationText: '$12M People + $12M AI + $6M University' },
  { category: 'Diversified', strategy: lab('diversified').strategy, allocationText: lab('diversified').allocationText },
  { category: 'Diversified', strategy: arc('balanced'), allocationText: '$5M in every bucket + $5M reserve' },
  { category: 'Cash preservation', strategy: lab('cash-preservation').strategy, allocationText: lab('cash-preservation').allocationText },
  { category: 'Adaptive', strategy: lab('adaptive').strategy, allocationText: lab('adaptive').allocationText },
  { category: 'Deliberately weak', strategy: arc('wrong-way'), allocationText: 'Consumer Q1–Q2, then all-in AI; Enterprise destination without Enterprise capability' },
  { category: 'Deliberately weak', strategy: { id: 'all-reserve', name: 'All reserve', description: 'Holds the full $30M in reserve every quarter', allocate: () => a({ cashReserve: 30 }), destination: () => 'balanced-marketplace' }, allocationText: '$30M reserve (no investment)' },
];

/**
 * Lab-only: an evidence-reading team for the V3 market paths. It reads only signals players are shown (ids), never truth: Q1 balanced; from Q2 it tilts toward what the shared evidence emphasises.
 */
/** Signals seen so far (this quarter and every earlier briefing). */
const sig = (ctx: { signals: { id: string }[]; history: { signals: { id: string }[] }[] }, id: string) =>
  ctx.signals.some(s => s.id === id) || ctx.history.some(h => h.signals.some(s => s.id === id));
export const ADAPTIVE_PATHS: V3LabStrategy = {
  category: 'Adaptive', allocationText: 'Balanced Q1, then follows each path’s shared evidence',
  strategy: {
    id: 'adaptive-paths', name: 'Adaptive (reads the path’s evidence)', description: 'Evidence-reading play across market paths',
    allocate: ctx => {
      if (ctx.quarter === 1) return a({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 });
      const st = ctx.state as unknown as { destination: { id: string } | null; cash: number };
      const d = st.destination?.id;
      if (d === 'enterprise-ai' || sig(ctx, 'b-q2-enterprise-mandates') || sig(ctx, 'b-q4-market')) return a({ enterprise: 12, aiProduct: 10, people: 8 });
      if (d === 'consumer-ai' && st.cash < 60) return a({ consumer: 12, aiProduct: 8, people: 5, cashReserve: 5 });
      if (sig(ctx, 'c-q2-rates') || sig(ctx, 'c-q4-market')) return a({ consumer: 12, aiProduct: 8, people: 5, cashReserve: 5 });
      return a({ consumer: 10, aiProduct: 12, people: 8 });
    },
    destination: ctx => (sig(ctx, 'b-q2-enterprise-mandates') ? 'enterprise-ai' : 'consumer-ai'),
  },
};
