/**
 * NexLearn V3.1 Stage 1 — evidence integrity and financial reporting (presentation only).
 *
 * Plays the laboratory's 21 strategies through the production adapters (V2, and V3 on paths A, B and C) and checks:
 *  1. the Q3 reveal separates market evidence (computed from scenario data) from company evidence (computed from the
 *     team's own records), and every company statement agrees with the recorded change;
 *  2. authored market text contains no company claims and no invented figures;
 *  3. the derived financial statement reconciles exactly with the engine ledger and the cash bridge.
 */
import { describe, it, expect } from 'vitest';
import { play, type PlayedGame } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';
import { gameHistory } from './insights/history';
import { buildSignalReveal, marketEvidence, AGAINST_MARKET_NOTE } from './insights/signalReveal';
import { quarterFinancials, periodFinancials } from './insights/financials';
import { cashBridge } from './insights/consequences';
import { q3AssessmentsFor } from './content/paths';
import { pathArc } from '../../simulationV3/engineV3Paths';
import { getNeutralMarket } from '../../simulationV3/engineV3Commercial';

type Cfg = { engine: 'v2' | 'v3'; path?: 'A' | 'B' | 'C' };
const CONFIGS: Cfg[] = [{ engine: 'v2' }, { engine: 'v3', path: 'A' }, { engine: 'v3', path: 'B' }, { engine: 'v3', path: 'C' }];
const games: { cfg: Cfg; g: PlayedGame }[] = CONFIGS.flatMap(cfg => V3_LAB_STRATEGIES.map(s => ({ cfg, g: play(s.strategy, cfg) })));
const label = (c: Cfg) => (c.engine === 'v2' ? 'V2' : `V3 path ${c.path}`);

describe('V3.1 Stage 1 · Q3 reveal: market evidence and company evidence are separated', () => {
  it('every assessed row carries a computed market measure that matches the scenario truth; not-assessed rows carry none', () => {
    for (const { cfg, g } of games) {
      const rows = buildSignalReveal(gameHistory(g.snapshot), 8)!;
      const path = cfg.path ?? 'A';
      const signals = pathArc(path).find(s => s.quarter === 3)!.signals;
      for (const r of rows) {
        const t = signals.find(s => s.id === r.id)!.truthReference;
        if (r.verdict === 'not-assessed' || !t) { expect(r.market, `${label(cfg)} ${r.id}`).toBeNull(); continue; }
        expect(r.market, `${label(cfg)} ${r.id}`).not.toBeNull();
        expect(r.market!.value).toBe(t.value);
        expect(Math.sign(r.market!.vsNormal)).toBe(Math.sign(Math.round((t.value - r.market!.normal) * 1e6)));
        expect(r.market!.statement).toMatch(/normal/);
      }
    }
  });

  it('every company statement agrees with the recorded change (direction and size), for every strategy and path', () => {
    for (const { cfg, g } of games) {
      const h = gameHistory(g.snapshot);
      for (const r of buildSignalReveal(h, 8)!) {
        expect(r.company.length).toBeGreaterThan(0);
        for (const c of r.company) {
          const ctx = `${label(cfg)} ${g.strategy.id} ${r.id} ${c.id}`;
          expect(c.change, ctx).toBeCloseTo(c.endValue - c.startValue, 9);
          if (c.direction === 'up') { expect(c.change, ctx).toBeGreaterThan(0); expect(c.statement, ctx).toMatch(/ rose /); }
          if (c.direction === 'down') { expect(c.change, ctx).toBeLessThan(0); expect(c.statement, ctx).toMatch(/ fell /); }
          if (c.direction === 'flat') expect(c.statement, ctx).toMatch(/essentially unchanged/);
          expect(c.statement, ctx).toContain(c.start);
          expect(c.statement, ctx).toContain(c.end);
          // against-market is set only when the company moved opposite to the market measure's level
          if (c.againstMarket) {
            expect(r.market, ctx).not.toBeNull();
            expect(c.direction === 'up' ? r.market!.vsNormal < 0 : r.market!.vsNormal > 0, ctx).toBe(true);
            // …and only when the market's level and its change on Q2 point the same way
            if (r.market!.vsPrevious !== null && Math.abs(r.market!.vsPrevious) >= 0.005) expect(Math.sign(r.market!.vsPrevious), ctx).toBe(Math.sign(r.market!.vsNormal));
          }
        }
        expect(r.recorded).toEqual(r.company.map(c => ({ label: c.label, start: c.start, end: c.end })));
      }
    }
  });

  it('the path C consumer case from the evaluation is now explained, not contradicted', () => {
    const { g } = games.find(x => x.cfg.path === 'C' && x.g.strategy.id === V3_LAB_STRATEGIES[0].strategy.id)!;
    const row = buildSignalReveal(gameHistory(g.snapshot), 8)!.find(r => r.id === 'q3-consumer-paid-cohorts')!;
    expect(row.market!.statement).toMatch(/^Consumer paying demand: 10% below normal/);
    const rev = row.company.find(c => c.id === 'consumerRevenue')!;
    expect(Math.abs(rev.changePct!)).toBeLessThan(0.1); // the company moved less than the market…
    expect(rev.transmission).toMatch(/moves more slowly, and usually by less, than the market measure/); // …and the reveal says why
    expect(row.showed).not.toMatch(/\byour\b|\byou\b/i);
  });

  it('authored market text makes no company claims and invents no figures (all paths)', () => {
    for (const path of ['A', 'B', 'C'] as const) {
      const signals = pathArc(path).find(s => s.quarter === 3)!.signals;
      for (const a of q3AssessmentsFor(path)) {
        if (a.verdict === 'not-assessed') continue;
        expect(a.showed, `${path} ${a.id}`).not.toMatch(/\byour\b|\byou\b|\bour\b|\bwe\b/i);
        const s = signals.find(x => x.id === a.id)!;
        const allowed = new Set(`${s.headline} ${s.truthReference?.note ?? ''} ${s.shownRange?.join(' ') ?? ''}`.match(/\d+(\.\d+)?/g) ?? []);
        for (const n of `${a.showed} ${a.lesson}`.replace(/\bQ\d\b/g, '').match(/\d+(\.\d+)?/g) ?? []) expect(allowed.has(n), `${path} ${a.id}: ${n}`).toBe(true);
      }
    }
  });

  it('AI-demand wording matches the scenario: above normal and lower than Q2 on every path (no claim that paying demand shrank below normal)', () => {
    for (const path of ['A', 'B', 'C'] as const) {
      const t = pathArc(path).find(s => s.quarter === 3)!.signals.find(s => s.id === 'q3-ai-engagement')!.truthReference!;
      const m = marketEvidence(path, t.field, t.value)!;
      expect(m.vsNormal).toBeGreaterThan(0);
      expect(m.vsPrevious!).toBeLessThan(0);
      const showed = q3AssessmentsFor(path).find(a => a.id === 'q3-ai-engagement')!.showed;
      expect(showed).toMatch(/above normal/);
      expect(showed).not.toMatch(/shrank|shrinks|fell below/);
    }
    expect(getNeutralMarket().aiNativeDemand).toBe(1);
    expect(AGAINST_MARKET_NOTE).not.toMatch(/because|caused/i);
  });
});

describe('V3.1 Stage 1 · financial reporting reconciles with the engine ledger', () => {
  it('per quarter: free cash flow = operating profit − strategic investment − one-off costs; FCF + financing = change in cash; equals the cash bridge', () => {
    for (const { cfg, g } of games) {
      for (const rec of gameHistory(g.snapshot)) {
        const f = quarterFinancials(rec);
        const l = rec.consequence.ledger;
        const b = cashBridge(rec);
        const ctx = `${label(cfg)} ${g.strategy.id} Q${rec.quarter}`;
        expect(f.reconciles, ctx).toBe(true);
        expect(f.operatingProfit).toBe(l.operatingProfit);
        expect(f.strategicInvestment).toBe(l.strategicInvestment);
        expect(f.oneOffCosts).toBe(l.eventCosts);
        expect(f.freeCashFlow).toBeCloseTo(b.operatingProfit - b.investment - b.eventCosts, 9);
        expect(f.freeCashFlow + f.financing).toBeCloseTo(f.closingCash - f.openingCash, 9);
        expect(f.closingCash).toBe(rec.after.cash);
        expect(b.reconciles, ctx).toBe(true);
      }
    }
  });

  it('eight-quarter totals reconcile: Σ FCF + Σ financing = closing − opening cash', () => {
    for (const { cfg, g } of games) {
      const h = gameHistory(g.snapshot);
      const p = periodFinancials(h);
      expect(p.reconciles, `${label(cfg)} ${g.strategy.id}`).toBe(true);
      expect(p.quarters).toBe(8);
      expect(p.openingCash).toBe(h[0].before.cash);
      expect(p.closingCash).toBe(g.snapshot.state.cash);
      expect(p.freeCashFlow + p.financing).toBeCloseTo(p.closingCash - p.openingCash, 6);
    }
  });
});
