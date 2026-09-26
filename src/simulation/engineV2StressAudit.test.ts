import { describe, it, expect } from 'vitest';
import { runV2StressAudit, V2_STRESS_CASES, runV2StressCase } from '../testlab/utils/v2StressAudit';
import { headroomMultiplier, getV2RevenueBaseline, calculateV2RevenueConsequence } from './engineV2Revenue';
import { getNeutralMarket, calculateV2CommercialConsequence, V2_NEUTRAL_SEGMENT_CAPACITY } from './engineV2Commercial';
import { getV2Baseline } from './engineV2';

/** Detectors that indicate an economic/accounting defect (any hit fails the audit). */
const DEFECT_DETECTORS = [
  'non-finite', 'negative-revenue-or-cost', 'investment-expensed-in-quarter', 'runaway-growth',
  'margin-out-of-band', 'cost-disappears-with-revenue', 'consumer-growth-without-cause',
  'ai-growth-without-cause', 'enterprise-growth-without-cause',
];

describe('Phase 3C: economic stress audit', () => {
  const results = runV2StressAudit();

  it('every stress case passes every engine invariant in every quarter', () => {
    const inv = results.flatMap(r => r.anomalies.filter(a => a.detector.startsWith('invariant:')).map(a => `${r.stress.id} Q${a.quarter} ${a.detector}`));
    expect(inv).toEqual([]);
  });

  it('no defect detector fires in any stress case (8, 16 and 40 quarters)', () => {
    const hits = results.flatMap(r => r.anomalies.filter(a => DEFECT_DETECTORS.includes(a.detector)).map(a => `${r.stress.id} Q${a.quarter} ${a.detector} ${a.detail}`));
    expect(hits).toEqual([]);
  });

  it('revenue-scale flags (> 2× baseline) occur only in 40-quarter broad/balanced runs, and stay < 2.1×', () => {
    for (const r of results) {
      const scale = r.anomalies.filter(a => a.detector === 'revenue-scale');
      if (scale.length > 0) expect(['extreme40-balanced', 'extreme40-broad6x5']).toContain(r.stress.id);
      expect(r.summary.final.revenue).toBeLessThan(2.1 * 200);
    }
  });

  it('Q8 of every ordinary stress case stays within $180–330M (warning band)', () => {
    for (const r of results.filter(x => x.summary.q8 && x.stress.id !== 'saturation')) {
      expect(r.summary.q8!.revenue, r.stress.id).toBeGreaterThan(180);
      expect(r.summary.q8!.revenue, r.stress.id).toBeLessThan(330);
    }
  });

  it('spending into insolvency is possible and observable (People100), never floored', () => {
    const p = results.find(r => r.stress.id === 'extreme40-people100')!;
    expect(p.firstNegativeCashQuarter).not.toBeNull();
    expect(p.summary.final.cash).toBeLessThan(-100);
  });

  it('static-neutral Cash100 is an exact 40-quarter fixed point', () => {
    const r = results.find(x => x.stress.id === 'extreme40-static-cash100')!;
    for (const q of r.quarters) {
      expect(q.consequence.ledger.revenue).toBeCloseTo(200, 9);
      expect(q.consequence.ledger.operatingCost).toBeCloseTo(170, 9);
    }
  });

  it('long-run neglect erodes gradually: competitive Cash100 declines < 1%/qtr for 40 quarters and never collapses', () => {
    const r = results.find(x => x.stress.id === 'extreme40-cash100')!;
    let prev = 200;
    for (const q of r.quarters) {
      expect((prev - q.consequence.ledger.revenue) / prev).toBeLessThan(0.01);
      prev = q.consequence.ledger.revenue;
    }
    expect(prev).toBeGreaterThan(140);
  });

  it('no segment ever exceeds its addressable market capacity', () => {
    const cap = V2_NEUTRAL_SEGMENT_CAPACITY;
    for (const r of results) for (const q of r.quarters) {
      const s = q.consequence.revenue.closing.segments;
      expect(s.consumer).toBeLessThan(cap.consumer);
      expect(s.enterprise).toBeLessThan(cap.enterprise);
      expect(s.university).toBeLessThan(cap.university);
      expect(s.aiNative).toBeLessThan(cap.aiNative);
    }
  });

  it('audit is deterministic', () => {
    const a = runV2StressCase(V2_STRESS_CASES[1]);
    const b = runV2StressCase(V2_STRESS_CASES[1]);
    expect(JSON.stringify(a.summary)).toBe(JSON.stringify(b.summary));
  });
});

describe('Phase 3C calibration: market headroom', () => {
  it('multiplier is exactly 1 at starting revenue, falls monotonically, and is 0 at capacity', () => {
    expect(headroomMultiplier(140, 300, 140)).toBe(1);
    let prev = Infinity;
    for (const r of [0, 50, 140, 200, 250, 299, 300, 400]) {
      const h = headroomMultiplier(r, 300, 140);
      expect(h).toBeLessThanOrEqual(prev);
      expect(h).toBeGreaterThanOrEqual(0);
      prev = h;
    }
    expect(headroomMultiplier(300, 300, 140)).toBe(0);
    expect(() => headroomMultiplier(100, 100, 140)).toThrow();
  });

  it('segment capacity is injectable: a bigger AI-native market allows more AI monetization from the same state', () => {
    const b = getV2Baseline();
    const opening = { ...getV2RevenueBaseline(), segments: { ...getV2RevenueBaseline().segments, aiNative: 30 } };
    const cons = calculateV2CommercialConsequence(b.commercial, b, getNeutralMarket(), 1);
    const adopt = { ...cons, closing: { ...cons.closing, aiAdoptionIndex: 60 } };
    const small = calculateV2RevenueConsequence(opening, b.commercial, adopt, b, getNeutralMarket(), 1);
    const big = calculateV2RevenueConsequence(opening, b.commercial, adopt, b, { ...getNeutralMarket(), segmentCapacity: { ...V2_NEUTRAL_SEGMENT_CAPACITY, aiNative: 200 } }, 1);
    expect(big.aiNative.newMonetization).toBeGreaterThan(small.aiNative.newMonetization);
  });
});
