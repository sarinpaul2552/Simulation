/**
 * Batch 7.5 §10 — strategic balance analysis (ANALYSIS ONLY: the frozen engine is used unchanged).
 * Runs controlled eight-quarter Test Lab arcs and reports outcomes. With BALANCE_WRITE=1 it writes the data tables
 * to docs/BATCH7_5_STRATEGIC_BALANCE_DATA.md. Without it, it only asserts that every run completes deterministically.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { runArc, a, liquidityPolicy, V2ArcStrategy, V2ArcPolicy } from '../../src/testlab/utils/v2ScenarioArc';
import { scoreV2Company } from '../../src/simulation/engineV2Scoring';
import { healthIndicators } from '../../src/production/v2/insights/dashboard';
import { V2_DESTINATIONS } from '../../src/simulation/engineV2Destination';

declare const process: { env: Record<string, string | undefined> };

const constant = (x: ReturnType<typeof a>) => () => x;
const refuse: Partial<V2ArcPolicy> = { liquidity: liquidityPolicy('refuse') };

/** Each family is run with management that refuses outside financing AND with the default (financing-willing) policy. */
const FAMILIES: { family: string; strategies: V2ArcStrategy[] }[] = [
  { family: 'Cash preservation', strategies: [
    { id: 'cash-all→balanced', name: 'Hold all $30M; Balanced Marketplace', description: '', allocate: constant(a({ cashReserve: 30 })), destination: () => 'balanced-marketplace' },
    { id: 'cash-all→consumer-ai', name: 'Hold all $30M; Consumer AI', description: '', allocate: constant(a({ cashReserve: 30 })), destination: () => 'consumer-ai' },
    { id: 'cash-heavy', name: 'Hold $20M, $10M AI', description: '', allocate: constant(a({ cashReserve: 20, aiProduct: 10 })), destination: () => 'balanced-marketplace' },
  ] },
  { family: 'Concentrated Consumer', strategies: [
    { id: 'consumer-all', name: '$30M Consumer; Consumer AI', description: '', allocate: constant(a({ consumer: 30 })), destination: () => 'consumer-ai' },
    { id: 'consumer-ai-15', name: '$15M Consumer + $15M AI; Consumer AI', description: '', allocate: constant(a({ consumer: 15, aiProduct: 15 })), destination: () => 'consumer-ai' },
  ] },
  { family: 'Concentrated Enterprise/AI', strategies: [
    { id: 'enterprise-ai-15', name: '$15M Enterprise + $15M AI; Enterprise AI', description: '', allocate: constant(a({ enterprise: 15, aiProduct: 15 })), destination: () => 'enterprise-ai' },
    { id: 'enterprise-all', name: '$30M Enterprise; Enterprise AI', description: '', allocate: constant(a({ enterprise: 30 })), destination: () => 'enterprise-ai' },
    { id: 'ai-all', name: '$30M AI; Enterprise AI', description: '', allocate: constant(a({ aiProduct: 30 })), destination: () => 'enterprise-ai' },
  ] },
  { family: 'Diversified', strategies: [
    { id: 'balanced-5', name: '$5M in each bucket + $5M reserve; Balanced', description: '', allocate: constant(a({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 })), destination: () => 'balanced-marketplace' },
    { id: 'balanced-6', name: '$6M in each of five buckets; Balanced', description: '', allocate: constant(a({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 })), destination: () => 'balanced-marketplace' },
  ] },
  { family: 'People / capability-led', strategies: [
    { id: 'people-all', name: '$30M People; Premium Human+AI', description: '', allocate: constant(a({ people: 30 })), destination: () => 'premium-human-ai' },
    { id: 'people-led-mix', name: '$15M People + $8M AI + $7M Enterprise; Premium Human+AI', description: '', allocate: constant(a({ people: 15, aiProduct: 8, enterprise: 7 })), destination: () => 'premium-human-ai' },
  ] },
];

interface Row {
  family: string; id: string; name: string; policy: string;
  revenue: number[]; op8: number; cash8: number; minCash: number; debt8: number; ownership8: number;
  readiness: number; destination: string; culture: number; talent: number; capacity: number; loadRatio: number;
  overall: number; financial: number; strategic: number; organizational: number; gates: string[];
  insolvent: boolean; distressed: boolean; finalOption: string;
}

function run(family: string, st: V2ArcStrategy, policyName: 'refuses financing' | 'default policy'): Row {
  const strategy = policyName === 'refuses financing' ? { ...st, policy: { ...(st.policy ?? {}), ...refuse } } : st;
  const r = runArc(strategy, 8);
  const s = r.finalState;
  const score = scoreV2Company(s);
  const strat = healthIndicators(s).find(h => h.id === 'strategy')!;
  return {
    family, id: st.id, name: st.name, policy: policyName,
    revenue: [s.ledgerHistory[0].openingCash === undefined ? 0 : 0, ...r.quarters.map(q => q.record.ending.revenue)].slice(1),
    op8: s.operatingProfit, cash8: s.cash,
    minCash: Math.min(...r.quarters.map(q => q.record.ending.cash)),
    debt8: s.financing.debt, ownership8: s.financing.ownership,
    readiness: strat.score, destination: s.destination ? V2_DESTINATIONS[s.destination.id].name : '—',
    culture: s.culture, talent: s.capabilities.talent, capacity: s.organizationalCapacity,
    loadRatio: s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0,
    overall: score.overall, financial: score.financial, strategic: score.strategic, organizational: score.organizational,
    gates: score.gates.filter(g => g.triggered).map(g => g.id),
    insolvent: s.solvency.everInsolvent, distressed: s.solvency.distressed,
    finalOption: s.final.record?.option ?? '—',
  };
}

const f1 = (x: number) => x.toFixed(1);

describe('Batch 7.5 strategic balance (analysis only)', () => {
  const rows: Row[] = [];
  for (const fam of FAMILIES) for (const st of fam.strategies) for (const p of ['refuses financing', 'default policy'] as const) rows.push(run(fam.family, st, p));

  it('every controlled run completes eight quarters deterministically', () => {
    expect(rows.length).toBe(FAMILIES.reduce((n, f) => n + f.strategies.length, 0) * 2);
    for (const r of rows) { expect(r.revenue).toHaveLength(8); expect(Number.isFinite(r.overall)).toBe(true); }
    const again = run(FAMILIES[0].family, FAMILIES[0].strategies[0], 'refuses financing');
    expect(again.overall).toBe(rows[0].overall);
  });

  it.skipIf(process.env.BALANCE_WRITE !== '1')('writes the data tables', () => {
    const out: string[] = [];
    out.push('# Batch 7.5 — Strategic balance: raw results', '', 'Generated by `BALANCE_WRITE=1 npx vitest run scripts/analysis/strategic-balance.test.ts`. Frozen engine, unchanged. Test Lab default policies for Q5–Q8 (opportunity fit, recession response, crisis, earned final option); financing either refused or the default liquidity policy.', '');
    out.push('## Outcomes', '', '| Family | Strategy | Management | Revenue Q1 → Q4 → Q8 ($M) | Op. profit Q8 | Cash Q8 (min) | Debt / ownership | Strategic readiness | Culture / talent / capacity | Score (F / S / O) | Overall | Failures |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      out.push(`| ${r.family} | ${r.name} | ${r.policy} | ${f1(r.revenue[0])} → ${f1(r.revenue[3])} → ${f1(r.revenue[7])} | ${f1(r.op8)} | ${f1(r.cash8)} (${f1(r.minCash)}) | ${f1(r.debt8)} / ${(r.ownership8 * 100).toFixed(0)}% | ${r.readiness.toFixed(0)} (${r.destination}) | ${r.culture.toFixed(0)} / ${r.talent.toFixed(0)} / ${r.capacity.toFixed(0)} | ${f1(r.financial)} / ${f1(r.strategic)} / ${f1(r.organizational)} | **${f1(r.overall)}** | ${[r.insolvent ? 'insolvent' : '', r.distressed ? 'distressed' : '', ...r.gates].filter(Boolean).join(', ') || '—'} |`);
    }
    out.push('', '## Ranking by overall score', '');
    [...rows].sort((x, y) => y.overall - x.overall).forEach((r, i) => out.push(`${i + 1}. ${f1(r.overall)} — ${r.name} (${r.policy})`));
    writeFileSync('docs/BATCH7_5_STRATEGIC_BALANCE_DATA.md', out.join('\n') + '\n');
  });
});
