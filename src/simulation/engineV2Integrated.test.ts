import { describe, it, expect } from 'vitest';
import { getV2Baseline, calculateV2QuarterConsequence, applyV2Consequence, summarizeV2Financials, V2Allocation, V2_INTEGRATED_MODE } from './engineV2';
import { V2_COMMERCIAL_SCENARIOS, runV2IntegratedScenario, runAllV2IntegratedScenarios } from '../testlab/utils/v2Diagnostics';
import { getNeutralMarket } from './engineV2Commercial';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});
const run = (id: string) => runV2IntegratedScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === id)!, 'competitive');

describe('Phase 3B: integrated financial model', () => {
  it('canonical identity holds exactly (===) in every quarter of every strategy, both markets; financing = 0, events = 0', () => {
    for (const mc of ['competitive', 'static-neutral'] as const) {
      for (const r of runAllV2IntegratedScenarios(mc)) {
        for (const q of r.quarters) {
          const L = q.consequence.ledger;
          expect(L.operatingInputsSource).toBe('segment');
          expect(L.operatingCostSource).toBe('modelled');
          expect(L.financing).toBe(0);
          expect(L.eventCosts).toBe(0);
          expect(L.operatingProfit).toBe(L.revenue - L.operatingCost);
          expect(L.closingCash).toBe(L.openingCash + L.operatingProfit - L.strategicInvestment - L.eventCosts + L.financing);
          expect(q.ending.cash).toBe(L.closingCash);
          const failed = q.checks.filter(c => !c.passed).map(c => `${mc} ${r.scenario.id} Q${q.quarter} ${c.id}`);
          expect(failed).toEqual([]);
        }
      }
    }
  });

  it('integrated summary: margin, operating cash generation and net cash flow restate the ledger', () => {
    const q = run('enterprise100').quarters[3].consequence;
    const F = q.financials;
    expect(F.operatingMargin).toBeCloseTo(q.ledger.operatingProfit / q.ledger.revenue, 12);
    expect(F.operatingCashGeneration).toBe(q.ledger.operatingProfit);
    expect(F.netCashFlow).toBeCloseTo(q.ledger.operatingProfit - 30, 12);
    expect(F.runway.status).toBe('burning');
    expect(F.runway.quarters).toBeCloseTo(q.ledger.closingCash / -F.netCashFlow, 12);
    expect(F.operatingRunway.status).toBe('self-funding');
  });

  it('baseline integrated quarter: $200M / $170M / $30M / 15% margin / self-funding', () => {
    const q = runV2IntegratedScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === 'cash100')!, 'static-neutral').quarters[0].consequence.financials;
    expect(q.revenue).toBeCloseTo(200, 9);
    expect(q.operatingCost).toBeCloseTo(170, 9);
    expect(q.operatingMargin!).toBeCloseTo(0.15, 9);
    expect(q.runway.status).toBe('self-funding');
  });

  it('no cash floor: a low-cash company spending into losses goes observably negative', () => {
    let s = { ...getV2Baseline(), cash: 10 };
    const statuses: string[] = [];
    let minCash = Infinity;
    for (let q = 1; q <= 8; q++) {
      const c = calculateV2QuarterConsequence(s, {
        quarter: q, allocation: alloc({ people: 30 }), strategicEnvelope: 30, ...V2_INTEGRATED_MODE,
        market: { ...getNeutralMarket(), consumerDemand: 0.85 },
      });
      s = applyV2Consequence(s, c);
      statuses.push(c.financials.runway.status);
      minCash = Math.min(minCash, s.cash);
      expect(s.cash).toBe(c.ledger.closingCash);
    }
    expect(minCash).toBeLessThan(-20);
    expect(statuses).toContain('cash-negative');
  });

  it('the economic price of strategy is visible: Cash100 has the most cash; investing strategies trade cash for capability', () => {
    const cash = (id: string) => run(id).quarters[7].ending.cash;
    for (const id of ['consumer100', 'enterprise100', 'ai100', 'people100', 'university100', 'balanced', 'consumer-ai', 'enterprise-ai']) {
      expect(cash('cash100')).toBeGreaterThan(cash(id));
    }
    expect(run('ai100').quarters[7].ending.capabilities.ai).toBeGreaterThan(run('cash100').quarters[7].ending.capabilities.ai + 50);
  });

  it('summarizeV2Financials handles zero revenue and positive/negative flows', () => {
    const base = run('cash100').quarters[0].consequence.ledger;
    const z = summarizeV2Financials({ ...base, revenue: 0, operatingProfit: -170, closingCash: base.openingCash - 170 - base.strategicInvestment, netCashFlow: -170 });
    expect(z.operatingMargin).toBeNull();
    expect(z.runway.status).toBe('cash-negative');
  });
});
