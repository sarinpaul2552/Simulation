/**
 * Batch 8.1 audit strategies (analysis and tests only — never imported by the app).
 *
 * Every strategy is a valid player policy run through the frozen engine via the Test Lab arc runner and then replayed
 * through the production path. Nothing is manufactured: outcomes are whatever the engine produces.
 */
import { ARC_STRATEGIES, a, liquidityPolicy, runArc, V2ArcStrategy } from '../../../testlab/utils/v2ScenarioArc';
import { inputsOf } from './arcGames';
import { replayInputs } from '../adapter';
import { gameHistory, type QuarterRecord } from '../insights/history';

export interface AuditStrategy { strategy: V2ArcStrategy; family: string; tags: string[] }

const k = (x: ReturnType<typeof a>) => () => x;
const byQuarter = (early: ReturnType<typeof a>, late: ReturnType<typeof a>, switchAt = 4) => (ctx: { quarter: number }) => (ctx.quarter < switchAt ? early : late);
const arc = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const refuse = { liquidity: liquidityPolicy('refuse') };

export const AUDIT_STRATEGIES: AuditStrategy[] = [
  // existing Batch 8 calibration strategies (real starting company only)
  { strategy: arc('cash100'), family: 'Hold most capital as cash', tags: ['cash', 'destroys-value'] },
  { strategy: arc('conservative'), family: 'Conservative financial management', tags: ['cash'] },
  { strategy: arc('consumer100'), family: 'Concentrate on Consumer', tags: ['non-ai'] },
  { strategy: arc('enterprise100'), family: 'Concentrate on Enterprise', tags: ['non-ai'] },
  { strategy: arc('ai100'), family: 'Concentrate on AI/Product', tags: ['ai'] },
  { strategy: arc('people100'), family: 'Concentrate on People', tags: ['non-ai', 'org-over-profit'] },
  { strategy: arc('university100'), family: 'Concentrate on University/Credentials', tags: ['non-ai'] },
  { strategy: arc('balanced'), family: 'Diversified allocation', tags: [] },
  { strategy: arc('consumer-ai'), family: 'Paired: Consumer + AI', tags: ['ai'] },
  { strategy: arc('enterprise-ai'), family: 'Paired: Enterprise + AI', tags: ['ai'] },
  { strategy: arc('evidence-responsive'), family: 'Adaptive', tags: [] },
  { strategy: arc('wrong-way'), family: 'Adaptive (contrarian)', tags: [] },
  { strategy: arc('premium-builder'), family: 'Capability-led (premium)', tags: [] },
  { strategy: arc('credential-builder'), family: 'Capability-led (credentials)', tags: ['non-ai'] },
  { strategy: arc('aggressive'), family: 'Aggressive growth with financing', tags: ['financing'] },
  // Batch 8.1 additions — gaps in coverage
  { strategy: { id: 'cash-mostly', name: 'Hold $24M, $6M Consumer; Balanced', description: '', allocate: k(a({ cashReserve: 24, consumer: 6 })), destination: () => 'balanced-marketplace' }, family: 'Hold most capital as cash', tags: ['cash'] },
  { strategy: { id: 'pivot', name: 'Consumer + AI early, pivot to Enterprise at Q4', description: '', allocate: byQuarter(a({ consumer: 20, aiProduct: 10 }), a({ enterprise: 20, aiProduct: 10 })), destination: () => 'enterprise-ai' }, family: 'Early investment, then strategic pivot', tags: [] },
  { strategy: { id: 'delayed-catchup', name: 'Hold cash Q1–Q3, then $15M Consumer + $15M AI', description: '', allocate: byQuarter(a({ cashReserve: 25, people: 5 }), a({ consumer: 15, aiProduct: 15 })), destination: () => 'consumer-ai' }, family: 'Delayed investment, aggressive catch-up', tags: [] },
  { strategy: { id: 'growth-into-recession', name: 'Consumer $20M + Enterprise $10M, no recession action, accepts contract', description: '', allocate: k(a({ consumer: 20, enterprise: 10 })), destination: () => 'consumer-ai', policy: { opportunity: () => true, recession: () => ({ actions: {} }) } }, family: 'Strong early growth into the recession', tags: ['non-ai'] },
  { strategy: { id: 'weak-then-recovery', name: 'University $30M Q1–Q3, then diversified', description: '', allocate: byQuarter(a({ universityCredentials: 30 }), a({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 })), destination: () => 'balanced-marketplace' }, family: 'Weak early performance, then recovery', tags: [] },
  { strategy: { id: 'overload', name: '$10M each Consumer/Enterprise/AI, no People, accepts contract', description: '', allocate: k(a({ consumer: 10, enterprise: 10, aiProduct: 10 })), destination: () => 'enterprise-ai', policy: { opportunity: () => true, recession: () => ({ actions: {} }) } }, family: 'High investment with execution overload', tags: [] },
  { strategy: { id: 'insolvency', name: '$30M Enterprise, accepts contract, refuses financing', description: '', allocate: k(a({ enterprise: 30 })), destination: () => 'enterprise-ai', policy: { ...refuse, opportunity: () => true, recession: () => ({ actions: {} }), crisis: () => 'remediate' } }, family: 'Becomes insolvent', tags: ['insolvency'] },
  { strategy: { id: 'people-refuse', name: '$30M People, refuses financing', description: '', allocate: k(a({ people: 30 })), destination: () => 'premium-human-ai', policy: refuse }, family: 'Distress test', tags: ['distress'] },
  { strategy: { id: 'value-over-org', name: '$12M Consumer, $12M AI, $6M Enterprise; deep cuts in recession', description: '', allocate: k(a({ consumer: 12, aiProduct: 12, enterprise: 6 })), destination: () => 'consumer-ai', policy: { recession: () => ({ actions: { workforceReduction: { depth: 'deep' }, hiringFreeze: true } }) } }, family: 'Shareholder value at the expense of organizational health', tags: ['ai'] },
  { strategy: { id: 'non-ai-consumer', name: '$20M Consumer, $5M People, $5M Enterprise; Consumer AI destination, no AI spend', description: '', allocate: k(a({ consumer: 20, people: 5, enterprise: 5 })), destination: () => 'consumer-ai' }, family: 'Non-AI: consumer leadership', tags: ['non-ai'] },
  { strategy: { id: 'non-ai-enterprise', name: '$18M Enterprise, $8M People, $4M Consumer', description: '', allocate: k(a({ enterprise: 18, people: 8, consumer: 4 })), destination: () => 'enterprise-ai' }, family: 'Non-AI: enterprise specialization', tags: ['non-ai'] },
  { strategy: { id: 'non-ai-university', name: '$15M University, $8M People, $7M Enterprise', description: '', allocate: k(a({ universityCredentials: 15, people: 8, enterprise: 7 })), destination: () => 'university-infrastructure' }, family: 'Non-AI: university/credentials', tags: ['non-ai'] },
  { strategy: { id: 'non-ai-diversified', name: '$8M Consumer, $8M Enterprise, $7M People, $7M University', description: '', allocate: k(a({ consumer: 8, enterprise: 8, people: 7, universityCredentials: 7 })), destination: () => 'balanced-marketplace' }, family: 'Non-AI: diversified', tags: ['non-ai'] },
];

export interface AuditRun { id: string; name: string; family: string; tags: string[]; records: QuarterRecord[] }

const cache = new Map<string, AuditRun>();
export function runAudit(s: AuditStrategy): AuditRun {
  const hit = cache.get(s.strategy.id);
  if (hit) return hit;
  const records = gameHistory(replayInputs(inputsOf(runArc(s.strategy, 8))));
  const run = { id: s.strategy.id, name: s.strategy.name, family: s.family, tags: s.tags, records };
  cache.set(s.strategy.id, run);
  return run;
}
export const allAuditRuns = () => AUDIT_STRATEGIES.map(runAudit);
