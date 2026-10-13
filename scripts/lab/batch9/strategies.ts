/**
 * Batch 9 strategy set. Allocations are $30M per quarter (the strategic envelope). Every strategy uses the same
 * event policy (DEFAULT_POLICY in v2ScenarioArc: rational contract acceptance, default recession response, debt-first
 * liquidity, crisis by severity, Q8 option by eligibility) so differences come from the investment strategy.
 */
import { a, ARC_STRATEGIES, type V2ArcStrategy } from '../../../src/testlab/utils/v2ScenarioArc';
import type { V2DestinationId } from '../../../src/simulation/engineV2Destination';

const k = (x: ReturnType<typeof a>) => () => x;
const S = (id: string, name: string, description: string, alloc: ReturnType<typeof a>, destination: V2DestinationId): V2ArcStrategy =>
  ({ id, name, description, allocate: k(alloc), destination: () => destination });

export interface LabStrategy { strategy: V2ArcStrategy; family: 'Consumer' | 'Enterprise' | 'AI' | 'University' | 'Diversified' | 'Cash' | 'Adaptive'; allocationText: string }

export const LAB_STRATEGIES: LabStrategy[] = [
  { family: 'Consumer', allocationText: '$20M Consumer + $10M People', strategy: S('consumer-led', 'Consumer-led', '$20M Consumer + $10M People every quarter; commits to Consumer AI', a({ consumer: 20, people: 10 }), 'consumer-ai') },
  { family: 'Enterprise', allocationText: '$20M Enterprise + $10M People', strategy: S('enterprise-led', 'Enterprise-led', '$20M Enterprise + $10M People; commits to AI-powered Enterprise', a({ enterprise: 20, people: 10 }), 'enterprise-ai') },
  { family: 'AI', allocationText: '$20M AI/Product + $10M People', strategy: S('ai-led', 'AI-led', '$20M AI/Product + $10M People; commits to Premium Human + AI', a({ aiProduct: 20, people: 10 }), 'premium-human-ai') },
  { family: 'Diversified', allocationText: '$10M Consumer + $10M Enterprise + $10M AI', strategy: S('diversified', 'Diversified', '$10M each Consumer, Enterprise, AI/Product; commits to Balanced Marketplace', a({ consumer: 10, enterprise: 10, aiProduct: 10 }), 'balanced-marketplace') },
  { family: 'Consumer', allocationText: '$30M Consumer', strategy: S('consumer-only', 'Consumer-only', '$30M Consumer; commits to Consumer AI', a({ consumer: 30 }), 'consumer-ai') },
  { family: 'Enterprise', allocationText: '$30M Enterprise', strategy: S('enterprise-only', 'Enterprise-only', '$30M Enterprise; commits to AI-powered Enterprise', a({ enterprise: 30 }), 'enterprise-ai') },
  { family: 'AI', allocationText: '$30M AI/Product', strategy: S('ai-only', 'AI-only', '$30M AI/Product; commits to Consumer AI', a({ aiProduct: 30 }), 'consumer-ai') },
  { family: 'University', allocationText: '$20M University + $10M People', strategy: S('university-led', 'University-led', '$20M University/Credentials + $10M People; commits to University/Credential Infrastructure', a({ universityCredentials: 20, people: 10 }), 'university-infrastructure') },
  { family: 'Cash', allocationText: '$20M held in reserve; $4M Consumer, $3M Enterprise, $3M AI', strategy: S('cash-preservation', 'Cash preservation', 'Invests $10M a quarter ($4M Consumer, $3M Enterprise, $3M AI/Product) and holds $20M in reserve; Balanced Marketplace', a({ consumer: 4, enterprise: 3, aiProduct: 3, cashReserve: 20 }), 'balanced-marketplace') },
  { family: 'Adaptive', allocationText: 'Balanced Q1, then shifts with market evidence (Test Lab "evidence-responsive")', strategy: { ...ARC_STRATEGIES.find(s => s.id === 'evidence-responsive')!, id: 'adaptive', name: 'Adaptive (evidence-responsive)' } },
];

/** Supplementary single-bucket and paired strategies for the dominance study. */
export const EXTRA_STRATEGIES: LabStrategy[] = [
  { family: 'University', allocationText: '$30M University', strategy: S('university-only', 'University-only', '$30M University/Credentials', a({ universityCredentials: 30 }), 'university-infrastructure') },
  { family: 'Consumer', allocationText: '$15M Consumer + $15M AI', strategy: S('consumer-ai-pair', 'Consumer + AI', '$15M Consumer + $15M AI', a({ consumer: 15, aiProduct: 15 }), 'consumer-ai') },
  { family: 'Enterprise', allocationText: '$15M Enterprise + $15M AI', strategy: S('enterprise-ai-pair', 'Enterprise + AI', '$15M Enterprise + $15M AI', a({ enterprise: 15, aiProduct: 15 }), 'enterprise-ai') },
  { family: 'Enterprise', allocationText: '$15M Enterprise + $10M AI + $5M People', strategy: S('enterprise-ai-people', 'Enterprise + AI + People', '$15M Enterprise + $10M AI + $5M People', a({ enterprise: 15, aiProduct: 10, people: 5 }), 'enterprise-ai') },
];
