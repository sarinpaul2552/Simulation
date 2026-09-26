import { describe, it, expect } from 'vitest';
import {
  calculateV2CostConsequence,
  getV2CostBaseline,
  baselineVariableCost,
  V2_COST_CALIBRATION,
  V2CostState,
} from './engineV2Costs';
import { getV2RevenueBaseline, V2RevenueConsequence } from './engineV2Revenue';
import { getNeutralMarket } from './engineV2Commercial';
import { getV2Baseline, calculateV2QuarterConsequence, applyV2Consequence, V2Allocation, V2TeamState } from './engineV2';
import { V2_COMMERCIAL_SCENARIOS, runV2IntegratedScenario, runAllV2IntegratedScenarios } from '../testlab/utils/v2Diagnostics';
import engineV2CostsSource from './engineV2Costs.ts?raw';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});
const staticMarket = () => ({ ...getNeutralMarket(), competitorProgress: { consumer: 0, enterprise: 0, credential: 0 } });

/** Minimal revenue consequence with given closing segments and live Enterprise run-rate. */
function revenueWith(seg: { consumer: number; enterprise: number; university: number; aiNative: number }, liveRunRate = 1.5): V2RevenueConsequence {
  const base = getV2RevenueBaseline();
  return {
    quarter: 1,
    consumer: {} as any,
    enterprise: { liveFromCurrentBookings: 0, liveFromEarlierBookings: liveRunRate } as any,
    university: {} as any,
    aiNative: {} as any,
    closing: { ...base, segments: seg },
    totalRevenue: seg.consumer + seg.enterprise + seg.university + seg.aiNative,
  };
}
const START = { consumer: 140, enterprise: 40, university: 16, aiNative: 4 };
const noInvest = { people: 0, enterprise: 0, aiProduct: 0 };

function runQuarters(a: V2Allocation, n: number, opening: V2TeamState = getV2Baseline()) {
  let s = opening;
  const out = [];
  for (let q = 1; q <= n; q++) {
    const c = calculateV2QuarterConsequence(s, { quarter: q, allocation: a, strategicEnvelope: 30, market: staticMarket(), revenueSource: 'segment', costSource: 'modelled' });
    s = applyV2Consequence(s, c);
    out.push(c);
  }
  return out;
}

describe('Phase 3A: baseline economics', () => {
  it('baseline reproduces $170M cost: $115.45M fixed/semi-fixed + $54.55M variable', () => {
    expect(baselineVariableCost()).toBeCloseTo(54.55, 9);
    expect(getV2CostBaseline().fixedSemiFixed).toBeCloseTo(115.45, 9);
    const c = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(START), noInvest, getNeutralMarket(), 1);
    expect(c.totalOperatingCost).toBeCloseTo(170, 9);
  });

  it('static-neutral Cash100 holds $200M / $170M / $30M / 15.0% exactly for 8 quarters', () => {
    for (const c of runQuarters(alloc({ cashReserve: 30 }), 8)) {
      expect(c.ledger.revenue).toBeCloseTo(200, 9);
      expect(c.ledger.operatingCost).toBeCloseTo(170, 9);
      expect(c.ledger.operatingProfit).toBeCloseTo(30, 9);
      expect(c.ledger.operatingProfit / c.ledger.revenue).toBeCloseTo(0.15, 9);
    }
  });

  it('module imports only V2 types', () => {
    const froms = [...engineV2CostsSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    expect(froms.sort()).toEqual(['./engineV2Commercial', './engineV2Revenue']);
  });
});

describe('Phase 3A: cost behaviour', () => {
  it('revenue decline does not create an equal proportional cost decline (fixed cost stays)', () => {
    const low = { consumer: 112, enterprise: 32, university: 12.8, aiNative: 3.2 }; // −20%
    const c = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(low, 1.2), noInvest, getNeutralMarket(), 1);
    const costDrop = (170 - c.totalOperatingCost) / 170;
    expect(costDrop).toBeGreaterThan(0);
    expect(costDrop).toBeLessThan(0.2 / 2);
    expect(c.fixedSemiFixed).toBeCloseTo(115.45, 9);
  });

  it('growth creates operating leverage (margin rises with revenue)', () => {
    const high = { consumer: 154, enterprise: 44, university: 17.6, aiNative: 4.4 }; // +10%
    const c = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(high, 1.65), noInvest, getNeutralMarket(), 1);
    const rev = 220;
    expect((rev - c.totalOperatingCost) / rev).toBeGreaterThan(0.15);
    expect((c.totalOperatingCost - 170) / 170).toBeLessThan(0.1);
  });

  it('variable cost is segment-specific: $10M of Consumer costs more to serve than $10M of AI-native or Enterprise', () => {
    const plus = (k: keyof typeof START) => {
      const seg = { ...START, [k]: START[k] + 10 };
      return calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(seg), noInvest, getNeutralMarket(), 1).variable.total - baselineVariableCost();
    };
    expect(plus('consumer')).toBeCloseTo(2.55, 9);
    expect(plus('enterprise')).toBeCloseTo(2.0, 9);
    expect(plus('university')).toBeCloseTo(2.0, 9);
    expect(plus('aiNative')).toBeCloseTo(1.5, 9);
  });

  it('Enterprise onboarding burden rises with run-rate going live', () => {
    const a = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(START, 1.5), noInvest, getNeutralMarket(), 1);
    const b = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(START, 4), noInvest, getNeutralMarket(), 1);
    expect(b.variable.enterpriseOnboarding - a.variable.enterpriseOnboarding).toBeCloseTo(1.25, 9);
  });

  it('semi-fixed ratchets up with lag and partially; unwinds slowly; never below floor', () => {
    let state: V2CostState = getV2CostBaseline();
    const big = { consumer: 180, enterprise: 50, university: 16, aiNative: 4 }; // $250M
    const c1 = calculateV2CostConsequence(state, START, revenueWith(big), noInvest, getNeutralMarket(), 1);
    expect(c1.fixedSemiFixed).toBeCloseTo(115.45, 9); // lag: prior-quarter revenue was $200M
    state = c1.closing;
    const c2 = calculateV2CostConsequence(state, big, revenueWith(big), noInvest, getNeutralMarket(), 2);
    const k = V2_COST_CALIBRATION.fixed;
    const step = k.scaleStepPerRevenueAboveBaseline * 50; // $250M − $200M
    expect(c2.fixedTarget).toBeCloseTo(115.45 + step, 9);
    expect(c2.fixedSemiFixed).toBeCloseTo(115.45 + step * k.adjustUpSpeed, 9);
    state = c2.closing;
    const c3 = calculateV2CostConsequence(state, START, revenueWith(START), noInvest, getNeutralMarket(), 3);
    expect(c3.fixedSemiFixed).toBeCloseTo(115.45 + step * k.adjustUpSpeed * (1 - k.adjustDownSpeed), 9); // unwinds slowly
    expect(c3.fixedSemiFixed).toBeGreaterThanOrEqual(115.45);
  });

  it('Cash100 does not shrink fixed cost merely by investing nothing', () => {
    const r = runV2IntegratedScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === 'cash100')!, 'competitive');
    for (const q of r.quarters) expect(q.consequence.cost.fixedSemiFixed).toBeCloseTo(115.45, 9);
  });
});

describe('Phase 3A: strategic investment vs opex (no double counting)', () => {
  it("this quarter's investment never changes this quarter's operating cost", () => {
    const a = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(START), noInvest, getNeutralMarket(), 1);
    const b = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(START), { people: 30, enterprise: 30, aiProduct: 30 }, getNeutralMarket(), 1);
    expect(b.totalOperatingCost).toBe(a.totalOperatingCost);
    expect(b.commitments.createdThisQuarter.every(c => c.startQuarter === 2)).toBe(true);
  });

  it('People $30M once: $1.8M/qtr from Q2 through Q9, then expires', () => {
    const qs = runQuarters(alloc({ people: 30 }), 1).concat([]);
    let s = applyV2Consequence(getV2Baseline(), qs[0]);
    const costs: number[] = [qs[0].cost.commitments.bySource.people];
    for (let q = 2; q <= 10; q++) {
      const c = calculateV2QuarterConsequence(s, { quarter: q, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30, market: staticMarket(), revenueSource: 'segment', costSource: 'modelled' });
      costs.push(c.cost.commitments.bySource.people);
      s = applyV2Consequence(s, c);
    }
    expect(costs[0]).toBe(0);
    for (let i = 1; i <= 8; i++) expect(costs[i]).toBeCloseTo(1.8, 9);
    expect(costs[9]).toBe(0);
  });

  it('Enterprise $30M → $1.2M/qtr for 6 quarters; AI $30M → $1.8M/qtr for 6 quarters; Consumer/University create none', () => {
    const k = V2_COST_CALIBRATION.commitments;
    const c = calculateV2CostConsequence(getV2CostBaseline(), START, revenueWith(START), { people: 0, enterprise: 30, aiProduct: 30 }, getNeutralMarket(), 1);
    const ent = c.commitments.createdThisQuarter.find(x => x.source === 'enterprise')!;
    const ai = c.commitments.createdThisQuarter.find(x => x.source === 'aiProduct')!;
    expect(ent.quarterlyCost).toBeCloseTo(1.2, 9);
    expect(ent.endQuarter - ent.startQuarter + 1).toBe(k.enterprise.duration);
    expect(ai.quarterlyCost).toBeCloseTo(1.8, 9);
    const cu = runQuarters(alloc({ consumer: 15, universityCredentials: 15 }), 4);
    for (const q of cu) expect(q.cost.commitments.total).toBe(0);
  });

  it('People100 shows visible carrying cost and lower operating profit than Cash100', () => {
    const p = runV2IntegratedScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === 'people100')!, 'competitive');
    const c = runV2IntegratedScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === 'cash100')!, 'competitive');
    expect(p.quarters[7].consequence.cost.commitments.bySource.people).toBeCloseTo(7 * 1.8, 9);
    expect(p.quarters[7].consequence.ledger.operatingProfit).toBeLessThan(c.quarters[7].consequence.ledger.operatingProfit - 5);
    expect(p.quarters[7].ending.organizationalCapacity).toBeGreaterThan(c.quarters[7].ending.organizationalCapacity + 20);
  });
});

describe('Phase 3A: modes and invariants', () => {
  it("'modelled' cost requires 'segment' revenue and rejects an override", () => {
    const b = getV2Baseline();
    expect(() => calculateV2QuarterConsequence(b, { quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30, costSource: 'modelled' })).toThrow(/segment/);
    expect(() => calculateV2QuarterConsequence(b, { quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30, revenueSource: 'segment', costSource: 'modelled', operatingCostOverride: 150 })).toThrow(/override/i);
  });

  it("'hold' cost mode is unchanged (segment mode still books $170M)", () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), { quarter: 1, allocation: alloc({ consumer: 30 }), strategicEnvelope: 30, revenueSource: 'segment' });
    expect(c.costSource).toBe('hold');
    expect(c.ledger.operatingCost).toBe(170);
    expect(c.ledger.operatingCostSource).toBe('carried-forward');
  });

  it('zero revenue still yields finite, non-negative cost (fixed + acquisition spend)', () => {
    const zero = { consumer: 0, enterprise: 0, university: 0, aiNative: 0 };
    const c = calculateV2CostConsequence(getV2CostBaseline(), zero, revenueWith(zero, 0), noInvest, getNeutralMarket(), 1);
    expect(c.totalOperatingCost).toBeCloseTo(115.45 + 6.3, 9);
  });

  it('all 12 strategies × 2 markets pass every ledger, capability, commercial, revenue and cost check', () => {
    for (const mc of ['competitive', 'static-neutral'] as const) {
      for (const r of runAllV2IntegratedScenarios(mc)) {
        const failed = r.quarters.flatMap(q => q.checks.filter(c => !c.passed).map(c => `${mc} ${r.scenario.id} Q${q.quarter} ${c.id}: ${c.details}`));
        expect(failed).toEqual([]);
      }
    }
  });
});
