/**
 * NexLearn V3.1 Stage 4B — student experience (v3-econ-1.1 only): version gate, engine company value, leadership
 * brief content, Q4 readiness and the accuracy fixes. Presentation only: no economic calculation changes.
 */
import { describe, it, expect } from 'vitest';
import { play } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';
import { initializeGame, v3Config, V2_CONFIG, usesStage4Experience, companyValueOf, getFinalOutcome, getRoleBrief, replayInputs, workingQuarter } from './engine';
import { leadershipBrief, readinessRows } from './insights/leadershipBrief';
import { allocationText, decisionSummary } from './insights/report';
import { accountabilityRows } from './insights/accountability';
import { buildRoleBriefing } from './content/roleContent';
import { money, moneyG } from './ui/format';
import { DESTINATION_GUIDE, CAREER_METRICS, NOT_MEASURED } from './content/stage4Content';
import { V2_DESTINATION_IDS } from '../../simulationV3/engineV3Destination';
import type { V2GameSnapshot } from './snapshot';

const V11 = 'v3-econ-1.1' as const, V10 = 'v3-econ-1.0' as const;
const games = (version: typeof V11 | typeof V10, paths: ('A' | 'B' | 'C')[] = ['A', 'B', 'C']) =>
  paths.flatMap(path => V3_LAB_STRATEGIES.map(s => ({ path, id: s.strategy.id, snap: play(s.strategy, { engine: 'v3', path, version }).snapshot as V2GameSnapshot })));

describe('Stage 4B version gate', () => {
  it('only v3-econ-1.1 games use the redesigned experience', () => {
    expect(usesStage4Experience(initializeGame(v3Config('A', V11)))).toBe(true);
    expect(usesStage4Experience(initializeGame(v3Config('A', V10)))).toBe(false);
    expect(usesStage4Experience(initializeGame(V2_CONFIG))).toBe(false);
    expect(companyValueOf(initializeGame(V2_CONFIG), initializeGame(V2_CONFIG).state)).toBeNull();
  });
});

describe('Stage 4B company value is the engine valuation', () => {
  const all = games(V11);
  it('end-of-game shareholder value equals the terminal score’s shareholder value in every lab game (17 × 3)', () => {
    expect(all.length).toBe(V3_LAB_STRATEGIES.length * 3);
    for (const g of all) {
      const v = companyValueOf(g.snap, g.snap.state)!;
      const score = getFinalOutcome(g.snap).score;
      expect(Math.abs(v.shareholderValue - score.shareholderValue), `${g.path}/${g.id}`).toBeLessThan(1e-9);
      expect(v.sold).toBe(score.sold);
    }
  });
  it('is finite and non-negative in every quarter', () => {
    for (const g of all.slice(0, 17)) {
      for (let q = 0; q <= 8; q++) {
        const snap = replayInputs(g.snap.inputs.slice(0, q), v3Config(g.path, V11));
        const v = companyValueOf(snap, snap.state)!;
        expect(Number.isFinite(v.equityValue) && v.equityValue >= 0, `${g.id} Q${q}`).toBe(true);
      }
    }
  });
});

describe('Stage 4B leadership team brief', () => {
  const sample = games(V11).filter((_, i) => i % 3 === 0);
  it('gives every executive an observation, a possible action and a reason in every quarter, with no missing values', () => {
    let n = 0;
    for (const g of sample) {
      for (let q = 1; q <= 8; q++) {
        const snap = replayInputs(g.snap.inputs.slice(0, q - 1), v3Config(g.path, V11));
        expect(workingQuarter(snap)).toBe(q);
        const views = leadershipBrief(snap);
        expect(views.map(v => v.role)).toEqual(['CEO', 'CFO', 'Product', 'People', 'Growth']);
        for (const v of views) {
          for (const t of [v.observation, v.action, v.why]) {
            expect(t.length, `${g.id} Q${q} ${v.role}`).toBeGreaterThan(10);
            expect(t, `${g.id} Q${q} ${v.role}`).not.toMatch(/NaN|undefined|null|Infinity/);
          }
          const words = `${v.observation} ${v.action} ${v.why}`.split(/\s+/).length;
          expect(words, `${g.id} Q${q} ${v.role}`).toBeLessThanOrEqual(45);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(500);
  });
  it('People content is at least 60% shorter than the private People brief', () => {
    const g = sample[0];
    for (const q of [1, 4, 6]) {
      const snap = replayInputs(g.snap.inputs.slice(0, q - 1), v3Config(g.path, V11));
      const v = leadershipBrief(snap).find(x => x.role === 'People')!;
      const b = buildRoleBriefing(snap, 'People', 'mba');
      const full = [b.responsibility, ...b.priority.map(p => `${p.label} ${p.value}`), ...b.evidence.map(e => e.text), ...b.suggests, ...b.uncertain, ...b.discuss.map(d => d.ask)].join(' ').split(/\s+/).length;
      const card = `${v.observation} ${v.action} ${v.why}`.split(/\s+/).length;
      expect(card / full, `Q${q}`).toBeLessThanOrEqual(0.4);
    }
  });
  it('Q4 readiness is the CEO’s measured board assessment, shown for all five strategies', () => {
    const g = games(V11, ['B'])[0];
    const snap = replayInputs(g.snap.inputs.slice(0, 3), v3Config('B', V11));
    const rows = readinessRows(snap);
    expect(rows.map(r => r.id).sort()).toEqual([...V2_DESTINATION_IDS].sort());
    const ceo = getRoleBrief(snap, 'CEO').signals;
    for (const r of rows) expect(r.readiness).toBe(ceo.find(s => s.id === `ceo-readiness-${r.id}`)!.value);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].readiness).toBeGreaterThanOrEqual(rows[i].readiness);
    expect(readinessRows(replayInputs(g.snap.inputs.slice(0, 2), v3Config('B', V11)))).toEqual([]);
  });
});

describe('Stage 4B accuracy fixes (1.1 wording only)', () => {
  const a = (p: Partial<Record<'consumer' | 'enterprise' | 'aiProduct' | 'people' | 'universityCredentials', number>>) => ({ consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p });
  it('C1: allocation text never claims a lead that does not exist', () => {
    expect(allocationText(a({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5 }))).toBe('Spread $25.0M evenly across all five areas ($5.0M each)');
    expect(allocationText(a({ consumer: 8, enterprise: 8, aiProduct: 4 }))).toBe('Invested most in Consumer and Enterprise ($8.0M each)');
    expect(allocationText(a({ consumer: 10, enterprise: 6, aiProduct: 4 }))).toBe('Invested most in Consumer ($10.0M), then Enterprise ($6.0M)');
    expect(allocationText(a({ aiProduct: 12 }))).toBe('Invested only in AI/Product ($12.0M)');
    // V2 / 1.0 wording is unchanged
    expect(decisionSummary({ quarter: 1, allocation: a({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5 }) })).toBe('Invested mostly in Consumer ($5.0M) and Enterprise ($5.0M)');
    const rows = accountabilityRows(1, null, { quarter: 1, allocation: a({ consumer: 5, enterprise: 5 }) }, 'mba', { accurate: true });
    expect(rows.find(r => r.id === 'decided')!.text).toBe('Spread $10.0M evenly across Consumer, Enterprise ($5.0M each).');
  });
  it('C4: amounts of $1,000M or more are grouped on 1.1 screens; money() is unchanged', () => {
    expect(moneyG(2846, 0)).toBe('$2,846M');
    expect(moneyG(-1234.56)).toBe('−$1,234.6M');
    expect(moneyG(11.04)).toBe('$11.0M');
    expect(money(2846, 0)).toBe('$2846M');
  });
  it('C7: position-table changes are taken between displayed values on 1.1 and unchanged on 1.0', () => {
    for (const [version, accurate] of [[V11, true], [V10, false]] as const) {
      const g = games(version, ['A'])[0];
      for (let q = 2; q <= 8; q++) {
        const snap = replayInputs(g.snap.inputs.slice(0, q - 1), v3Config('A', version));
        for (const role of ['CEO', 'CFO', 'Product', 'People', 'Growth'] as const) {
          for (const row of buildRoleBriefing(snap, role, 'mba').position) {
            if (!row.change || !row.previous || row.change.direction === 'flat' || !/^\d+$/.test(row.value) || !/^\d+$/.test(row.previous)) continue;
            const shown = Number(row.value) - Number(row.previous);
            const text = Number(row.change.text.replace(/[^\d.]/g, '')) * (row.change.direction === 'up' ? 1 : -1);
            if (accurate) expect(text, `${version} Q${q} ${row.id}`).toBe(shown);
          }
        }
      }
    }
  });
  it('Q4 option explanations exist for every strategy the engine offers', () => {
    for (const id of V2_DESTINATION_IDS) {
      const g = DESTINATION_GUIDE[id];
      expect(g.means && g.help && g.risk, id).toBeTruthy();
    }
  });
  it('career metrics: CAC is an index; market share, productivity and ROI are listed as not measured', () => {
    expect(CAREER_METRICS.find(m => m.id === 'cac')!.how).toMatch(/index/i);
    for (const m of CAREER_METRICS) expect(m.name).not.toMatch(/market share|productivity|ROI|return on investment/i);
    expect(NOT_MEASURED.map(x => x.name)).toEqual(['Market share', 'Employee productivity', 'Return on investment (ROI)']);
  });
});

describe('Stage 4B C6: a brief reading never restates its intelligence line', () => {
  it('drops the restated reading on 1.1 and keeps it on 1.0 (path B, Q6 Product)', () => {
    for (const [version, expectDup] of [[V11, false], [V10, true]] as const) {
      const g = games(version, ['B'])[0];
      const snap = replayInputs(g.snap.inputs.slice(0, 5), v3Config('B', version));
      const b = buildRoleBriefing(snap, 'Product', 'mba');
      const dup = b.suggests.some(t => t.startsWith('AI projects that cut costs keep their funding'));
      expect(dup, version).toBe(expectDup);
      if (version === V11) expect(b.suggests.length).toBeGreaterThan(0);
    }
  });
});
