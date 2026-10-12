/**
 * Batch 8 · Stage 2 — visual identity, Stage 1 refinements, attribution, dashboard data and reflection.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ARC_STRATEGIES } from '../../testlab/utils/v2ScenarioArc';
import { arcInputs } from './testing/arcGames';
import { replayInputs, resolveQuarter, forecastQuarter, V2_ROLES, initializeGame } from './adapter';
import { gameHistory } from './insights/history';
import { quarterAttribution } from './insights/attribution';
import { checkFinancing } from './insights/financingCheck';
import { kpiDashboard, dashboardData, healthMovements, DASH_METRICS } from './insights/intelligence';
import { segmentReflection } from './insights/reflection';
import { buildRoleBriefing, briefingWords, PRIORITY_KPIS } from './content/roleContent';
import { BUCKET_PERSPECTIVES } from './content/bucketPerspectives';
import { BACKSTORY, YOUR_ROLE } from './content/company';
import { CHAPTERS } from './content/chapters';
import { QUARTER_CARDS } from './content/scenarioContent';
import { V2_PRESENTATION_MODES, pick } from './content/modes';
import type { V2PlayerQuarterInput } from './types';

const STRATS = ARC_STRATEGIES.filter(s => !s.opening);
const games = STRATS.map(st => ({ id: st.id, inputs: arcInputs(st) }));
const hist = (id: string) => gameHistory(replayInputs(games.find(g => g.id === id)!.inputs));

describe('design system: palette, contrast and no motion', () => {
  let css = '';
  beforeAll(async () => {
    // Node's fs, loaded dynamically so the browser type-check does not need Node typings.
    const fsName = 'node:fs';
    const fs = (await import(/* @vite-ignore */ fsName)) as { readFileSync: (p: string, e: string) => string };
    css = fs.readFileSync(new URL('./ui/ds/ds.css', import.meta.url).pathname, 'utf8');
  });
  const lum = (h: string) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)![1];
  it('uses the NexLearn palette', () => {
    expect(token('nx-ink')).toBe('#17232D'); expect(token('nx-forest')).toBe('#193F3B'); expect(token('nx-teal')).toBe('#287C73');
    expect(token('nx-ivory')).toBe('#F5F2EB'); expect(token('nx-paper')).toBe('#FFFEFA'); expect(token('nx-stone')).toBe('#DDD8CD');
    expect(token('nx-copper')).toBe('#B45E3C'); expect(token('nx-amber')).toBe('#A77A24'); expect(token('nx-slate')).toBe('#65727A'); expect(token('nx-negative')).toBe('#A33F3F');
  });
  it('every text token meets WCAG AA (4.5:1) on Ivory and Paper', () => {
    for (const t of ['nx-ink', 'nx-forest', 'nx-teal-text', 'nx-copper-text', 'nx-amber-text', 'nx-slate-text', 'nx-negative-text']) {
      expect(ratio(token(t), token('nx-ivory')), t).toBeGreaterThanOrEqual(4.5);
      expect(ratio(token(t), token('nx-paper')), t).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(token('nx-paper'), token('nx-forest'))).toBeGreaterThanOrEqual(4.5); // buttons and top bar
    expect(ratio(token('nx-paper'), token('nx-copper'))).toBeGreaterThanOrEqual(4.5); // commit button
  });
  it('has no animations, transitions or decorative gradients', () => {
    expect(css).not.toMatch(/@keyframes|animation\s*:|transition\s*:|radial-gradient|text-stroke/);
  });
  it('uses Source Serif 4 and Inter', () => {
    expect(css).toMatch(/--ds-display:\s*'Source Serif 4 Variable'/);
    expect(css).toMatch(/--ds-font:\s*'Inter Variable'/);
    expect(css).not.toMatch(/Fraunces/);
  });
});

describe('Stage 1 refinements', () => {
  const FUTURE = /recession|downturn|crisis|\boffers?\b|global contract|fortune-100|consolidat|final move|the disruption|mixed signals/i;
  it('the introduction does not reveal future events (only the announced board deadline)', () => {
    for (const mode of V2_PRESENTATION_MODES) {
      const text = [pick(mode, YOUR_ROLE), ...BACKSTORY.map(b => pick(mode, b.body))].join(' ');
      expect(text).not.toMatch(FUTURE);
      expect(text).toMatch(/2023/); // the board's Q4 2023 deadline is announced
    }
  });
  it('Q1–Q3 quarter content does not disclose later events', () => {
    for (const q of [1, 2, 3]) for (const mode of V2_PRESENTATION_MODES) {
      const c = QUARTER_CARDS[q];
      const text = [pick(mode, CHAPTERS[q].sub), pick(mode, c.headline), pick(mode, c.whatHappened), pick(mode, c.challenge), ...c.whyItMatters.map(w => pick(mode, w))].join(' ');
      expect(text, `Q${q}`).not.toMatch(/recession|downturn|crisis|offer\b|final-quarter|final quarter/i);
    }
  });
  it('briefings are a 60–90 second read with three priority KPIs', () => {
    const inputs = games.find(g => g.id === 'balanced')!.inputs;
    for (let q = 1; q <= 8; q++) {
      const snap = replayInputs(inputs.slice(0, q - 1));
      for (const role of V2_ROLES) for (const mode of V2_PRESENTATION_MODES) {
        const b = buildRoleBriefing(snap, role, mode);
        expect(b.priority.length).toBe(3);
        for (const p of b.priority) expect(b.position).toContainEqual(p);
        expect(PRIORITY_KPIS[role].filter(id => b.priority.some(p => p.id === id)).length).toBeGreaterThanOrEqual(2);
        expect(briefingWords(b), `${role} Q${q} ${mode}`).toBeLessThanOrEqual(180); // ≈ 60–90 s at 150–200 wpm incl. the table
      }
    }
  });
  it('investment perspectives cover every bucket from several functions and never endorse', () => {
    for (const [b, per] of Object.entries(BUCKET_PERSPECTIVES)) {
      expect(Object.keys(per).length, b).toBeGreaterThanOrEqual(4);
      for (const t of Object.values(per)) for (const mode of V2_PRESENTATION_MODES) expect(pick(mode, t!)).not.toMatch(/\b(should|recommend|best|agree|disagree|must)\b/i);
    }
  });
});

describe('financing validation matches the frozen engine', () => {
  const snap = replayInputs(games.find(g => g.id === 'balanced')!.inputs.slice(0, 2));
  const base: V2PlayerQuarterInput = { quarter: 3, allocation: { consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6, cashReserve: 0 } };
  const fc = forecastQuarter(snap, base);
  it('limits: what the check rejects, the engine rejects; what it accepts, the engine accepts', () => {
    const over = [{ kind: 'equity' as const, amount: fc.options.maxEquity + 5 }];
    expect(checkFinancing(fc.options, over, snap.state.financing.debt, snap.state.financing.ownership).errors.length).toBe(1);
    expect(() => resolveQuarter(snap, { ...base, financing: over })).toThrow();
    const debtOver = [{ kind: 'debt' as const, amount: fc.options.debtCapacity + 5 }];
    expect(checkFinancing(fc.options, debtOver, 0, 1).errors.length).toBe(1);
    expect(() => resolveQuarter(snap, { ...base, financing: debtOver })).toThrow();
    const ok = [{ kind: 'equity' as const, amount: Math.min(10, fc.options.maxEquity) }];
    const chk = checkFinancing(fc.options, ok, snap.state.financing.debt, snap.state.financing.ownership);
    expect(chk.errors).toEqual([]);
    const r = resolveQuarter(snap, { ...base, financing: ok });
    expect(r.snapshot.state.financing.ownership).toBeCloseTo(chk.ownershipAfter, 9); // dilution formula matches
  });
  it('interest shown is an upper bound on the engine’s rate', () => {
    const d = [{ kind: 'debt' as const, amount: Math.min(10, fc.options.debtCapacity) }];
    if (d[0].amount <= 0) return;
    const chk = checkFinancing(fc.options, d, 0, 1);
    const r = resolveQuarter(snap, { ...base, financing: d });
    const rate = r.snapshot.state.financing.rounds[r.snapshot.state.financing.rounds.length - 1].rate!;
    expect(rate).toBeLessThanOrEqual(fc.options.debtRate + 1e-12);
    expect(chk.interestPerQuarter).toBeGreaterThanOrEqual(d[0].amount * rate - 1e-9);
  });
});

describe('attribution reconciles exactly with recorded movements', () => {
  for (const g of games) {
    it(`${g.id}: every quarter, every indicator`, () => {
      for (const rec of gameHistory(replayInputs(g.inputs))) {
        for (const row of quarterAttribution(rec)) {
          const sum = row.components.reduce((t, c) => t + c.amount, 0);
          expect(Math.abs(sum - row.movement), `${row.id} Q${rec.quarter}`).toBeLessThan(1e-6);
          expect(row.components.some(c => c.kind === 'other' && Math.abs(c.amount) > 1e-6), `${row.id} Q${rec.quarter} unexplained`).toBe(false);
        }
      }
    });
  }
});

describe('dashboard data, health movements, KPI dashboard and reflection', () => {
  const h = hist('aggressive');
  it('series run from Q4 2022 to the completed quarter only (no future data)', () => {
    for (let q = 1; q <= 8; q++) {
      const d = dashboardData(h, q);
      for (const m of DASH_METRICS) expect(d.series(m.id).length).toBe(q + 1);
    }
  });
  it('health movements: current − previous and current − start', () => {
    const rows = healthMovements(h, 5);
    const prev = healthMovements(h, 4);
    for (const r of rows) {
      expect(r.deltaPrevious!).toBeCloseTo(r.current - prev.find(p => p.id === r.id)!.current, 9);
      expect(Number.isFinite(r.deltaStart)).toBe(true);
    }
  });
  it('KPI dashboard covers every metric with start, end, change and interpretation', () => {
    const rows = kpiDashboard(h);
    expect(rows.length).toBe(DASH_METRICS.length);
    for (const r of rows) expect(`${r.start}${r.end}${r.change}${r.pct}${r.interpretation}`).not.toMatch(/NaN|undefined|Infinity/);
  });
  it('reflection shows all four businesses and flags only factual neglect', () => {
    const cash = hist('cash100');
    const rows = segmentReflection(cash, 3);
    expect(rows.map(r => r.key)).toEqual(['consumer', 'enterprise', 'aiNative', 'university']);
    for (const r of rows) { expect(r.allocatedTotal).toBe(0); expect(r.neglected).not.toBeNull(); }
    const agg = segmentReflection(h, 3);
    expect(agg.find(r => r.key === 'consumer')!.neglected).toBeNull();
    void initializeGame;
  });
});
