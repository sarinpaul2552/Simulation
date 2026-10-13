/**
 * NEXLEARN V3 LABORATORY (Batch 10B) — invariants, plus the reproducible tables behind
 * docs/BATCH10B_V3_ECONOMIC_REPORT.md and docs/BATCH10B_V2_V3_COMPARISON.md.
 *
 *   npx vitest run scripts/lab/v3/lab.test.ts                    # invariants only
 *   V3LAB_WRITE=1 npx vitest run scripts/lab/v3/lab.test.ts      # also writes docs/v3lab/results.json + tables.md
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { play } from './player';
import { metricsOf, type GameMetrics } from './metrics';
import { V3_LAB_STRATEGIES } from './strategies';
import {
  comparison, attribution, sensitivity, marketSensitivity, recessionStances, cashStrainedStances, financingExpansion,
  contractClaim, marginal, SENSITIVITY, v3c, V2C,
} from './experiments';
import { V3_ECONOMICS, withV3Economics, ALL_MECHANISMS_OFF } from '../../../src/simulationV3/engineV3Config';
import { firstDifference } from '../../../src/production/v2/snapshot';
import { saturationStatus } from '../../../src/production/v2/insights/saturation';
import type { Bucket } from '../../../src/production/v2/insights/consequences';

const WRITE = process.env.V3LAB_WRITE === '1';

describe('V3 laboratory invariants', () => {
  it('the frozen V2 engine and adapter are unchanged since 003f697', () => {
    expect(execSync('git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts', { encoding: 'utf8' }).trim()).toBe('');
  });

  it('every V2 and V3 game: accounting identities hold, the snapshot replays exactly, cash is finite', () => {
    for (const s of V3_LAB_STRATEGIES) for (const cfg of [V2C, v3c()]) {
      const m = metricsOf(play(s.strategy, cfg));
      expect(m.identitiesHold, `${cfg.engine} ${s.strategy.id}`).toBe(true);
      expect(m.replayVerified, `${cfg.engine} ${s.strategy.id}`).toBe(true);
      expect(Number.isFinite(m.cash)).toBe(true);
    }
  });

  it('V3 with every mechanism off plays the same game as V2 (state-for-state, adapter level)', () => {
    withV3Economics({ mechanisms: ALL_MECHANISMS_OFF }, () => {
      for (const s of V3_LAB_STRATEGIES) {
        const g2 = play(s.strategy, V2C), g3 = play(s.strategy, v3c());
        expect(firstDifference(g3.snapshot.state, g2.snapshot.state), s.strategy.id).toBeNull();
      }
    });
  });

  it('deterministic: replaying the laboratory gives identical numbers', () => {
    const a1 = metricsOf(play(V3_LAB_STRATEGIES[0].strategy, v3c())), a2 = metricsOf(play(V3_LAB_STRATEGIES[0].strategy, v3c()));
    expect(a2).toEqual(a1);
  });

  it('E8: the saturation warning appears before capability is wasted (single-bucket plans, both engines)', () => {
    const singles: [string, Bucket][] = [['ai-only', 'aiProduct'], ['consumer-only', 'consumer'], ['enterprise-only', 'enterprise'], ['university-only', 'universityCredentials'], ['people-only', 'people']];
    let cases = 0, ok = 0;
    for (const [id, bucket] of singles) for (const cfg of [V2C, v3c()]) {
      const g = play(V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy, cfg);
      const target = { consumer: 'consumer', enterprise: 'enterprise', aiProduct: 'ai', people: 'talent', universityCredentials: 'credential' }[bucket];
      const firstWaste = g.quarters.find(q => (q.consequence.capability.targets.find(t => t.target === target)?.wastedSaturation ?? 0) > 0.5)?.quarter;
      if (firstWaste === undefined) continue;
      cases++;
      const firstWarn = g.quarters.find(q => saturationStatus(q.before, bucket).near)?.quarter;
      if (firstWarn !== undefined && firstWarn < firstWaste) ok++;
    }
    console.log(`E8 warning before waste: ${ok} of ${cases} wasting single-bucket games`);
    expect(cases).toBeGreaterThan(0);
    expect(ok / cases).toBeGreaterThanOrEqual(0.9);
  });

  it('withV3Economics restores the configuration', () => {
    const before = JSON.stringify(V3_ECONOMICS);
    withV3Economics({ ai: { revenuePerAdoptionPoint: 9 }, mechanisms: ALL_MECHANISMS_OFF }, () => undefined);
    expect(JSON.stringify(V3_ECONOMICS)).toBe(before);
  });
});

// ───────────────────────────── tables ─────────────────────────────

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '—');
const f0 = (x: number) => (Number.isFinite(x) ? x.toFixed(0) : '—');
const sg = (x: number, d = 1) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((_, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
const rank = (ms: GameMetrics[], key: (m: GameMetrics) => number) => {
  const order = [...ms].sort((a, b) => key(b) - key(a)).map(m => m.strategy);
  return (id: string) => order.indexOf(id) + 1;
};
function spearman(a: GameMetrics[], b: GameMetrics[]): number {
  const ra = rank(a, m => m.price), rb = rank(b, m => m.price);
  const n = a.length;
  const d2 = a.reduce((t, m) => t + (ra(m.strategy) - rb(m.strategy)) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}
const top = (ms: GameMetrics[], key: (m: GameMetrics) => number) => [...ms].sort((a, b) => key(b) - key(a))[0];

describe.runIf(WRITE)('V3 laboratory tables', () => {
  it('writes docs/v3lab/results.json and docs/v3lab/tables.md', () => {
    const cmp = comparison();
    const att = attribution();
    const sens = sensitivity();
    const mkt = marketSensitivity();
    const stance = recessionStances();
    const strained = cashStrainedStances();
    const fin = financingExpansion();
    const contract = contractClaim();
    const marg = marginal();
    const cat = Object.fromEntries(V3_LAB_STRATEGIES.map(s => [s.strategy.id, s.category]));
    const md: string[] = [];
    md.push(`# NexLearn V3 laboratory tables (generated)\n\nGenerated by \`V3LAB_WRITE=1 npx vitest run scripts/lab/v3/lab.test.ts\`. Engine calibration ${V3_ECONOMICS.version}; valuation NXLN-VAL-1.0 for V2 games, NXLN-VAL-1.1 for V3 games; executive NXLN-EXEC-1.1. Market: path A (the V2 arc) unless stated. All games are full eight-quarter games played through the production adapters with the Test Lab DEFAULT_POLICY for events.\n`);

    md.push('## T1 · V2 vs V3, path A (Q8)\n');
    md.push(table(['Strategy', 'Category', 'V2 price', 'V3 price', 'Δ price', 'V2 rank', 'V3 rank', 'V2 revenue', 'V3 revenue', 'V2 cum. op. profit', 'V3 cum. op. profit', 'V2 terminal', 'V3 terminal', 'V3 culture', 'V3 stance'],
      (() => { const r2 = rank(cmp.v2, m => m.price), r3 = rank(cmp.v3, m => m.price); return cmp.v2.map((m2, i) => { const m3 = cmp.v3[i]; return [m2.strategy, cat[m2.strategy], f1(m2.price), f1(m3.price), sg(m3.price - m2.price), r2(m2.strategy), r3(m3.strategy), f0(m2.revenue), f0(m3.revenue), f0(m2.cumulativeOperatingProfit), f0(m3.cumulativeOperatingProfit), f1(m2.terminal), f1(m3.terminal), f0(m3.culture), m3.stance ?? '—']; }); })()));
    md.push(`\nSpearman rank correlation of the price ranking V2 → V3: ${spearman(cmp.v2, cmp.v3).toFixed(2)}. Top by price: V2 ${top(cmp.v2, m => m.price).strategy}, V3 ${top(cmp.v3, m => m.price).strategy}. Top by cumulative operating profit: V2 ${top(cmp.v2, m => m.cumulativeOperatingProfit).strategy}, V3 ${top(cmp.v3, m => m.cumulativeOperatingProfit).strategy}. Top by terminal score: V2 ${top(cmp.v2, m => m.terminal).strategy}, V3 ${top(cmp.v3, m => m.terminal).strategy}.\n`);

    md.push('## T2 · Segment revenue at Q8 ($M: consumer / enterprise / university / AI-native)\n');
    md.push(table(['Strategy', 'V2', 'V3'], cmp.v2.map((m2, i) => { const m3 = cmp.v3[i]; const s = (m: GameMetrics) => `${f0(m.segments.consumer)} / ${f0(m.segments.enterprise)} / ${f0(m.segments.university)} / ${f0(m.segments.aiNative)}`; return [m2.strategy, s(m2), s(m3)]; })));

    md.push('\n## T3 · Executive scores at Q8 (team mean; V2 → V3)\n');
    md.push(table(['Strategy', 'V2 team', 'V3 team', 'V3 CEO', 'V3 CFO', 'V3 Product', 'V3 People', 'V3 Growth'], cmp.v2.map((m2, i) => { const m3 = cmp.v3[i]; return [m2.strategy, f1(m2.executiveTeam), f1(m3.executiveTeam), f1(m3.executive.CEO), f1(m3.executive.CFO), f1(m3.executive.Product), f1(m3.executive.People), f1(m3.executive.Growth)]; })));

    md.push('\n## T4 · Mechanism attribution (Q8 price; each mechanism alone vs all off, and all on minus each)\n');
    const mechs = Object.keys(att.only);
    md.push(table(['Strategy', 'All off', ...mechs.map(m => `only ${m}`), 'All on', ...mechs.map(m => `without ${m}`)],
      cmp.v3off.map((m0, i) => [m0.strategy, f1(m0.price), ...mechs.map(m => sg(att.only[m][i].price - m0.price)), f1(cmp.v3[i].price), ...mechs.map(m => sg(att.without[m][i].price - cmp.v3[i].price))])));

    md.push('\n## T5 · Parameter sensitivity (±25%): price-ranking stability vs the calibrated V3\n');
    md.push(table(['Parameter', 'Factor', 'Spearman vs base', 'Top strategy', 'Largest price move (strategy)'], sens.rows.map(r => {
      const moves = r.metrics.map((m, i) => ({ s: m.strategy, d: m.price - sens.base[i].price })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
      return [r.label, `×${r.factor}`, spearman(sens.base, r.metrics).toFixed(2), top(r.metrics, m => m.price).strategy, `${sg(moves.d)} (${moves.s})`];
    })));
    void SENSITIVITY;

    md.push('\n## T6 · Market sensitivity (V3, variants of path A): Q8 price and rank\n');
    md.push(table(['Strategy', 'Path A', ...mkt.map(v => v.id)], cmp.v3.map((m, i) => [m.strategy, `${f1(m.price)} (#${rank(cmp.v3, x => x.price)(m.strategy)})`, ...mkt.map(v => `${f1(v.v3[i].price)} (#${rank(v.v3, x => x.price)(m.strategy)})`)])));
    md.push('\n' + mkt.map(v => `- **${v.id}**: ${v.label}. Top: ${top(v.v3, m => m.price).strategy}; Spearman vs path A ${spearman(cmp.v3, v.v3).toFixed(2)}.`).join('\n') + '\n');

    md.push('\n## T7 · Recession stance (Q6) — Δ vs "protect" at Q8 (price / cumulative operating profit / culture)\n');
    const byS = [...new Set(stance.map(r => r.strategy))];
    const variants = [...new Set(stance.map(r => r.variant))].filter(v => v !== 'protect');
    md.push(table(['Strategy', ...variants.flatMap(v => [`V2 ${v}`, `V3 ${v}`])], byS.map(s => {
      const p = stance.find(r => r.strategy === s && r.variant === 'protect')!;
      return [s, ...variants.flatMap(v => { const r = stance.find(x => x.strategy === s && x.variant === v)!; const d = (a: GameMetrics, b: GameMetrics) => `${sg(a.price - b.price)} / ${sg(a.cumulativeOperatingProfit - b.cumulativeOperatingProfit, 0)} / ${sg(a.culture - b.culture, 0)}`; return [d(r.v2, p.v2), d(r.v3, p.v3)]; })];
    })));
    md.push('\nCash-strained case (heavy spender, $30M invested every quarter):\n');
    md.push(table(['Stance', 'V2 price', 'V3 price', 'V2 cum. OP', 'V3 cum. OP', 'V2 min cash', 'V3 min cash', 'V3 culture', 'V3 People score', 'V3 CFO score'], strained.map(r => [r.variant, f1(r.v2.price), f1(r.v3.price), f0(r.v2.cumulativeOperatingProfit), f0(r.v3.cumulativeOperatingProfit), f0(r.v2.minCash), f0(r.v3.minCash), f0(r.v3.culture), f1(r.v3.executive.People), f1(r.v3.executive.CFO)])));

    md.push('\n## T8 · Financing-funded expansion (E7): maximum X per quarter, Q2–Q7 (V3, path A)\n');
    md.push(table(['Strategy', ...fin.map(r => `X=${r.X}: price / net cash / ownership / expanded`)], fin[0].metrics.map((m, i) => [m.strategy, ...fin.map(r => { const x = r.metrics[i]; return `${f1(x.price)} / ${f0(x.netCash)} / ${(x.ownership * 100).toFixed(0)}% / $${f0(x.expansionTotal)}M`; })])));

    md.push('\n## T9 · Q5 contract: accept vs decline (Q8 price / cumulative operating profit)\n');
    md.push(table(['Strategy', 'V2 accept − decline', 'V3 accept − decline', 'V3 accept: claim on − claim off'], contract.v2Accept.map((m, i) => [m.strategy,
      `${sg(m.price - contract.v2Decline[i].price)} / ${sg(m.cumulativeOperatingProfit - contract.v2Decline[i].cumulativeOperatingProfit, 0)}`,
      `${sg(contract.v3Accept[i].price - contract.v3Decline[i].price)} / ${sg(contract.v3Accept[i].cumulativeOperatingProfit - contract.v3Decline[i].cumulativeOperatingProfit, 0)}`,
      `${sg(contract.v3Accept[i].price - contract.v3AcceptNoClaim[i].price)} / ${sg(contract.v3Accept[i].cumulativeOperatingProfit - contract.v3AcceptNoClaim[i].cumulativeOperatingProfit, 0)}`])));

    md.push('\n## T10 · Marginal $5M (from $6M in every bucket, Balanced Marketplace): Δ vs base at Q8\n');
    md.push(table(['+$5M to', 'V2 Δ price', 'V3 Δ price', 'V2 Δ revenue', 'V3 Δ revenue', 'V2 Δ cum. OP', 'V3 Δ cum. OP'], marg.v2.shift.map((s, i) => {
      const t = marg.v3.shift[i];
      return [s.bucket, sg(s.m.price - marg.v2.base.price), sg(t.m.price - marg.v3.base.price), sg(s.m.revenue - marg.v2.base.revenue), sg(t.m.revenue - marg.v3.base.revenue), sg(s.m.cumulativeOperatingProfit - marg.v2.base.cumulativeOperatingProfit), sg(t.m.cumulativeOperatingProfit - marg.v3.base.cumulativeOperatingProfit)];
    })));
    md.push('');

    mkdirSync('docs/v3lab', { recursive: true });
    writeFileSync('docs/v3lab/tables.md', md.join('\n'));
    const strip = (ms: GameMetrics[]) => ms.map(({ priceByQuarter, revenueByQuarter, cultureByQuarter, ...rest }) => ({ ...rest, priceByQuarter: priceByQuarter.map(x => +x.toFixed(2)) , revenueByQuarter: revenueByQuarter.map(x => +x.toFixed(2)), cultureByQuarter: cultureByQuarter.map(x => +x.toFixed(2)) }));
    writeFileSync('docs/v3lab/results.json', JSON.stringify({
      calibration: V3_ECONOMICS, comparison: { v2: strip(cmp.v2), v3off: strip(cmp.v3off), v3: strip(cmp.v3) },
      marketSensitivity: mkt.map(v => ({ id: v.id, label: v.label, v3: strip(v.v3) })),
      recessionStances: stance.map(r => ({ strategy: r.strategy, variant: r.variant, v2: strip([r.v2])[0], v3: strip([r.v3])[0] })),
      financingExpansion: fin.map(r => ({ X: r.X, metrics: strip(r.metrics) })),
    }, null, 1));
    expect(cmp.v3.length).toBe(V3_LAB_STRATEGIES.length);
  }, 600_000);
});
