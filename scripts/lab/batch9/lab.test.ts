/**
 * Batch 9 verification: the laboratory measures the real engine, leaves it untouched, and its experimental variants are
 * valid. Runs in the normal unit suite (~10 s).
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { labRun, MIXES, withCalibration, openingFor } from './runner';
import { LAB_STRATEGIES } from './strategies';
import { steadyStateCheck, envelopeChecks, contractAudit } from './experiments';
import { withOverrides, PACKAGES } from './proposals';
import { inputsOf } from '../../../src/production/v2/testing/arcGames';
import { replayInputs } from '../../../src/production/v2/adapter';
import { gameHistory } from '../../../src/production/v2/insights/history';
import { valuationSeries } from '../../../src/production/v2/insights/valuation';
import { allScorecards } from '../../../src/production/v2/insights/executive';
import { scoreV2Company } from '../../../src/simulation/engineV2Scoring';
import { V2_REVENUE_CALIBRATION } from '../../../src/simulation/engineV2Revenue';
import { V2_COST_CALIBRATION } from '../../../src/simulation/engineV2Costs';
import { V2_COMMERCIAL_CALIBRATION, V2_COMMERCIAL_START } from '../../../src/simulation/engineV2Commercial';
import { getV2Baseline } from '../../../src/simulation/engineV2';

const snapshot = () => JSON.stringify([V2_REVENUE_CALIBRATION, V2_COST_CALIBRATION, V2_COMMERCIAL_CALIBRATION, V2_COMMERCIAL_START]);

describe('Batch 9 economic balance laboratory', () => {
  it('the frozen engine is unchanged (no diff against 003f697)', () => {
    expect(execSync('git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts').toString().trim()).toBe('');
  });

  it('lab results equal the production path (replay → valuation, executive scores, terminal score) for all ten strategies', () => {
    for (const s of LAB_STRATEGIES) {
      const r = labRun({ id: s.strategy.id, strategy: s.strategy });
      const hist = gameHistory(replayInputs(inputsOf(r.run)));
      const val = valuationSeries(hist);
      expect(Math.abs(val.points[8].price - r.final.price)).toBeLessThan(1e-9);
      const cards = allScorecards(hist);
      expect(Math.abs(cards.reduce((t, c) => t + c.executive, 0) / 5 - r.final.execTeam!)).toBeLessThan(1e-9);
      expect(Math.abs(scoreV2Company(hist[7].after).overall - r.final.terminal)).toBeLessThan(1e-9);
      expect(Math.abs(hist[7].after.cash - r.final.cash)).toBeLessThan(1e-9);
    }
  });

  it('runs are deterministic and every quarter’s cash ledger reconciles', () => {
    for (const s of LAB_STRATEGIES) {
      const a = labRun({ id: s.strategy.id, strategy: s.strategy, withExec: false });
      const b = labRun({ id: s.strategy.id, strategy: s.strategy, withExec: false });
      expect(JSON.stringify(a.quarters)).toBe(JSON.stringify(b.quarters));
      for (const h of a.run.quarters) {
        const L = h.record.consequence.ledger;
        expect(Math.abs(L.openingCash + L.operatingProfit - L.strategicInvestment - L.eventCosts + L.financing - L.closingCash)).toBeLessThan(1e-9);
      }
    }
  });

  it('experimental overrides are restored after every run (production calibration untouched)', () => {
    const before = snapshot();
    for (const mode of ['naive', 'rebased', 'rebased-aifixed'] as const) labRun({ id: 'x', strategy: LAB_STRATEGIES[0].strategy, mix: 'altB', mixMode: mode, withExec: false });
    for (const p of PACKAGES) withOverrides(p.parts, () => labRun({ id: 'x', strategy: LAB_STRATEGIES[1].strategy, withExec: false }));
    expect(() => withCalibration(MIXES.altA, () => { throw new Error('boom'); })).toThrow('boom');
    expect(snapshot()).toBe(before);
    expect(JSON.stringify(getV2Baseline().segmentRevenue)).toBe(JSON.stringify(MIXES.baseline));
  });

  it('re-based starting mixes are steady states; naive ones drift (the engine needs the documented re-base)', () => {
    const rows = steadyStateCheck();
    const seg = rows.filter(r => r.segment !== 'operating profit');
    const base = Math.max(...seg.filter(r => r.mix === 'baseline').map(r => Math.abs(r.drift)));
    for (const r of seg.filter(r => r.mix.includes('rebased'))) expect(Math.abs(r.drift)).toBeLessThanOrEqual(base + 1e-6);
    for (const mix of ['altA:naive', 'altB:naive']) expect(Math.max(...seg.filter(r => r.mix === mix).map(r => Math.abs(r.drift)))).toBeGreaterThan(2);
    for (const m of ['altA', 'altB'] as const) {
      const o = withCalibration(MIXES[m], () => openingFor(MIXES[m], 'rebased'));
      expect(o.operatingCost).toBe(170);
      expect(o.segmentRevenue).toEqual(MIXES[m]);
    }
  });

  it('candidate calibration packages preserve the starting company (Q1 under a hold strategy is unchanged)', () => {
    const hold = { id: 'hold', name: 'hold', description: '', allocate: () => ({ consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 30 }), destination: () => 'balanced-marketplace' };
    const ref = labRun({ id: 'h', strategy: hold, quarters: 1, withExec: false }).quarters[0];
    for (const p of PACKAGES) {
      const q = withOverrides(p.parts, () => labRun({ id: 'h', strategy: hold, quarters: 1, withExec: false }).quarters[0]);
      expect(Math.abs(q.revenue - ref.revenue)).toBeLessThan(1e-9);
      expect(Math.abs(q.operatingProfit - ref.operatingProfit)).toBeLessThan(1e-9);
    }
  });

  it('the strategic envelope caps investment regardless of cash; a contract does not reduce it', () => {
    const e = envelopeChecks();
    expect(e[0].result).toBe('accepted');
    expect(e[1].result).toMatch(/^rejected/);
    for (const r of contractAudit()) {
      expect(r.q5Envelope).toBe(30);
      if (r.choice === 'accept') expect(r.q5EventCosts).toBeGreaterThan(5);
    }
    const acc = contractAudit().filter(r => r.choice === 'accept');
    const dec = contractAudit().filter(r => r.choice === 'decline');
    for (const a of acc) expect(a.q5Investment).toBe(dec.find(d => d.id === a.id)!.q5Investment);
  });
});
