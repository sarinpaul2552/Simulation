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
