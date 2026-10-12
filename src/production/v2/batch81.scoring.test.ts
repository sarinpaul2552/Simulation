/**
 * Batch 8.1 — scoring integrity, award fairness and valuation regression tests (NXLN-EXEC-1.1, NXLN-VAL-1.0).
 */
import { describe, it, expect } from 'vitest';
import { allAuditRuns } from './testing/auditStrategies';
import { valuationSeries, factorScores } from './insights/valuation';
import {
  allScorecards, buildScorecard, computeAwards, EXECUTIVE_METRICS, EXECUTIVE_VERSION, SCORECARD_ROLES, SURVIVAL_GATE_CAP, DISTRESS_GATE_CAP, metricScore,
} from './insights/executive';
import { startingCompany } from './insights/history';
import type { V2TeamState } from '../../simulation/engineV2';
import type { V2Role } from './types';

const runs = allAuditRuns();
const run = (id: string) => runs.find(r => r.id === id)!;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const pearson = (a: number[], b: number[]) => {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
  return va && vb ? c / Math.sqrt(va * vb) : 0;
};

describe('executive scoring integrity (NXLN-EXEC-1.1)', () => {
  it('is versioned 1.1 and each role’s weights sum to 1', () => {
    expect(EXECUTIVE_VERSION).toBe('NXLN-EXEC-1.1');
    for (const role of SCORECARD_ROLES) expect(EXECUTIVE_METRICS.filter(m => m.role === role).reduce((t, m) => t + m.weight, 0)).toBeCloseTo(1, 9);
  });
  it('no metric in one role duplicates a metric in another role (|r| < 0.95 across all strategy-quarters)', () => {
    const obs: Record<string, number[]> = {};
    for (const r of runs) for (let q = 2; q <= 8; q++) {
      const recs = r.records.slice(0, q);
      const ctx = { states: [startingCompany(), ...recs.map(h => h.after)], records: recs, t: q };
      for (const m of EXECUTIVE_METRICS) (obs[m.id] ??= []).push(metricScore(m, ctx) ?? 50);
    }
    for (const a of EXECUTIVE_METRICS) for (const b of EXECUTIVE_METRICS) {
      if (a.role === b.role || a.id >= b.id) continue;
      expect(Math.abs(pearson(obs[a.id], obs[b.id])), `${a.id} vs ${b.id}`).toBeLessThan(0.95);
    }
  });
  it('CFO: pure cash hoarding scores below the median of active strategies; prudence is not penalised', () => {
    const cfo = (id: string) => buildScorecard(run(id).records, 'CFO').functional;
    const active = runs.filter(r => !r.tags.includes('cash') && !r.tags.includes('insolvency') && !r.tags.includes('distress')).map(r => cfo(r.id));
    expect(cfo('cash100')).toBeLessThan(median(active));
    expect(cfo('cash100')).toBeLessThan(cfo('balanced'));
    // liquidity below the comfort level is penalised; holding more than $40M earns nothing extra
    const liq = EXECUTIVE_METRICS.find(m => m.id === 'cfo-liquidity')!;
    const s0 = startingCompany();
    const ctx = (cash: number) => ({ states: [s0, { ...s0, cash } as V2TeamState], records: run('balanced').records.slice(0, 1), t: 1 });
    expect(metricScore(liq, ctx(40))).toBe(100);
    expect(metricScore(liq, ctx(400))).toBe(100);
    expect(metricScore(liq, ctx(20))!).toBeLessThan(100);
  });
  it('CFO capital efficiency counts held cash as deployed capital with no return', () => {
    const eff = (id: string) => buildScorecard(run(id).records, 'CFO').rows.find(r => r.id === 'cfo-efficiency')!.score!;
    expect(eff('cash100')).toBeLessThan(eff('consumer-ai'));
  });
  it('Product: capability without customer adoption is not fully credited (adoption is scored)', () => {
    expect(EXECUTIVE_METRICS.some(m => m.id === 'cpo-monetization')).toBe(true);
    expect(EXECUTIVE_METRICS.some(m => m.id === 'cpo-capability')).toBe(false);
  });
  it('People: avoiding change does not produce a high score', () => {
    const p = (id: string) => buildScorecard(run(id).records, 'People').functional;
    expect(p('cash100')).toBeLessThan(60);
    expect(p('cash100')).toBeLessThan(p('balanced'));
  });
  it('CEO: no longer duplicates operating profit or the People load metric', () => {
    const ceo = EXECUTIVE_METRICS.filter(m => m.role === 'CEO').map(m => m.id);
    expect(ceo).not.toContain('ceo-op');
    expect(ceo).not.toContain('ceo-sustain');
  });
  it('survival gates: insolvency caps CEO and CFO at 30; distress caps them at 45', () => {
    const ins = run('insolvency').records;
    expect(ins[7].after.solvency.everInsolvent).toBe(true);
    for (const role of ['CEO', 'CFO'] as V2Role[]) {
      const c = buildScorecard(ins, role);
      expect(c.functional).toBeLessThanOrEqual(SURVIVAL_GATE_CAP);
    }
    const d = run('people-refuse').records;
    if (d[7].after.solvency.distressed && !d[7].after.solvency.everInsolvent) {
      const c = buildScorecard(d, 'CEO');
      expect(c.functional).toBeLessThanOrEqual(DISTRESS_GATE_CAP);
      expect(c.gate).toMatch(/distressed/);
    }
    // a healthy company is never gated
    for (const c of allScorecards(run('balanced').records)) expect(c.gate).toBeNull();
  });
  it('functional scores are distinguishable between roles (mean pairwise Pearson < 0.7 across strategies)', () => {
    const f = (role: V2Role) => runs.map(r => buildScorecard(r.records, role).functional);
    let s = 0, n = 0;
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { s += pearson(f(SCORECARD_ROLES[i]), f(SCORECARD_ROLES[j])); n++; }
    expect(s / n).toBeLessThan(0.7);
  });
});

describe('awards (Batch 8.1)', () => {
  const team = (id: string, q = 8) => ({ teamId: id, teamName: id, records: run(id).records.slice(0, q) });
  it('role awards rank the functional score; the team award ranks the executive average', () => {
    const r = computeAwards(['consumer-ai', 'balanced', 'non-ai-consumer', 'people100', 'conservative'].map(id => team(id)));
    expect(r.available).toBe(true);
    const cfoAward = r.awards.find(a => a.id === 'CFO')!;
    const bestCfo = Math.max(...r.table.map(t => t.scores.CFO));
    expect(cfoAward.score).toBeCloseTo(bestCfo, 9);
    const fCfo = (id: string) => buildScorecard(run(id).records, 'CFO').functional;
    expect(bestCfo).toBeCloseTo(Math.max(...['consumer-ai', 'balanced', 'non-ai-consumer', 'people100', 'conservative'].map(fCfo)), 9);
    expect(r.awards.find(a => a.id === 'team')!.basis).toMatch(/executive/);
  });
  it('different teams can win different functions', () => {
    const r = computeAwards(['evidence-responsive', 'value-over-org', 'non-ai-diversified', 'enterprise100', 'cash100'].map(id => team(id)));
    const winners = new Set(r.awards.flatMap(a => a.winners));
    expect(winners.size).toBeGreaterThanOrEqual(2);
    // the team that sacrificed its organization does not win People leadership
    expect(r.awards.find(a => a.id === 'People')!.winners).not.toContain('value-over-org');
  });
  it('insolvent teams are excluded at every quarter after insolvency; teams are compared at the same quarter', () => {
    const r = computeAwards([team('premium-builder'), team('pivot'), team('insolvency'), team('non-ai-university'), { ...team('delayed-catchup'), records: run('delayed-catchup').records.slice(0, 6) }]);
    expect(r.quarter).toBe(6);
    const insolventBy6 = run('insolvency').records.slice(0, 6).some(h => h.after.solvency.everInsolvent);
    if (insolventBy6) for (const a of r.awards) expect(a.winners).not.toContain('insolvency');
  });
  it('a dead heat produces a shared award', () => {
    const r = computeAwards([team('balanced'), { ...team('balanced'), teamId: 'b2', teamName: 'balanced-twin' }, team('cash100')]);
    for (const a of r.awards) if (a.winners.includes('balanced')) expect(a.winners).toContain('balanced-twin');
  });
});

describe('valuation integrity (Batch 8.1 audit)', () => {
  it('no look-ahead: the price at quarter q depends only on results up to q', () => {
    for (const r of runs.slice(0, 12)) {
      const full = valuationSeries(r.records).points;
      for (let q = 1; q <= 8; q++) expect(valuationSeries(r.records.slice(0, q)).points[q].price).toBe(full[q].price);
    }
  });
  it('every bridge reconciles for all audit strategies, including insolvency', () => {
    for (const r of runs) for (const p of valuationSeries(r.records).points.slice(1)) {
      expect(Math.abs(p.bridge.reduce((t, b) => t + b.amount, 0) - p.change)).toBeLessThan(1e-9);
    }
  });
  it('liquidity protection is recognised (cash below $40M lowers the financial factor)', () => {
    const s = startingCompany();
    expect(factorScores({ ...s, cash: 25 } as V2TeamState).financial).toBeLessThan(factorScores({ ...s, cash: 45 } as V2TeamState).financial);
  });
  it('insolvency is priced consistently below survival', () => {
    expect(valuationSeries(run('insolvency').records).points[8].price).toBeLessThan(valuationSeries(run('enterprise100').records).points[8].price);
    expect(valuationSeries(run('insolvency').records).points[8].distress).toBeGreaterThan(0);
  });
  it('dilution from equity raises appears in the bridge', () => {
    const agg = valuationSeries(run('aggressive').records).points;
    if (run('aggressive').records[7].after.financing.ownership < 0.9999) expect(agg.some(p => p.bridge.some(b => b.id === 'dilution' && Math.abs(b.amount) > 1e-6))).toBe(true);
  });
  it('a strategy with AI at most a quarter of investment reaches the top tier', () => {
    const rows = runs.map(r => {
      const inv = r.records.reduce((t, h) => t + h.consequence.ledger.strategicInvestment, 0);
      const ai = r.records.reduce((t, h) => t + h.consequence.ledger.strategicInvestmentByBucket.aiProduct, 0);
      return { id: r.id, ai: inv > 0 ? ai / inv : 0, price: valuationSeries(r.records).points[8].price };
    }).sort((a, b) => b.price - a.price);
    expect(rows.slice(0, 8).some(r => r.ai <= 0.25)).toBe(true);
  });
});
