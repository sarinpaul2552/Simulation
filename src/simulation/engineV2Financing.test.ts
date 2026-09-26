import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, liquidityPolicy } from '../testlab/utils/v2ScenarioArc';
import {
  V2TeamState, V2Allocation, V2Consequence, V2FinancingAction,
  calculateV2QuarterConsequence, applyV2Consequence, assessLiquidity, getV2Baseline, V2_INTEGRATED_MODE,
} from './engineV2';
import { getScenarioMarket } from './engineV2Scenario';
import { V2_FINANCING_CALIBRATION, companyValuation } from './engineV2Financing';
import { V2_MINIMUM_FIXED_POOL } from './engineV2Effects';
import { checkV2Quarter } from '../testlab/utils/v2Diagnostics';
import financingSource from './engineV2Financing.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const K = V2_FINANCING_CALIBRATION;
const REFUSE = { liquidity: liquidityPolicy('refuse') };

/** State after Q5 (default policy, no financing) and its planned allocation. */
const atQ5 = (id: string) => { const r = runArc(strat(id), 5, { policy: REFUSE }); return { state: r.finalState, alloc: r.quarters[4].allocation }; };

function step(s: V2TeamState, q: number, alloc: V2Allocation, financing?: V2FinancingAction[]) {
  const input = { quarter: q, allocation: alloc, strategicEnvelope: 30, market: getScenarioMarket(q), ...V2_INTEGRATED_MODE, decisions: financing ? { financing } : {} };
  const c = calculateV2QuarterConsequence(s, input);
  const next = applyV2Consequence(s, c);
  const failed = checkV2Quarter(s, alloc, c, next).filter(k => !k.passed).map(k => `Q${q} ${k.id}: ${k.details}`);
  expect(failed).toEqual([]);
  const L = c.ledger;
  expect(L.closingCash).toBe(L.openingCash + L.operatingProfit - L.strategicInvestment - L.eventCosts + L.financing);
  return { c, next };
}

describe('Batch 3: financing instruments use the canonical accounting model', () => {
  const { state, alloc } = atQ5('balanced');

  it('equity: cash via the financing line, no interest, dilution from the company valuation', () => {
    const val = companyValuation({ ...state, revenueYearAgo: state.ledgerHistory[0].revenue, aiCommercialReadiness: state.commercial.aiCommercialReadiness, destinationStrength: 0.75, debt: 0, status: 'healthy', distressed: false });
    expect(val.preMoney).toBeGreaterThan(500);
    const { c, next } = step(state, 6, alloc, [{ kind: 'equity', amount: 40 }]);
    expect(c.ledger.financing).toBe(40);
    expect(c.ledger.financingItems).toHaveLength(1);
    const pre = c.financingOptions.valuation.preMoney;
    expect(next.financing.ownership).toBeCloseTo(1 - 40 / (pre + 40), 12);
    expect(next.financing.debt).toBe(0);
    const { c: c7 } = step(next, 7, alloc);
    expect(c7.cost.financingCost).toBe(0);
  });

  it('debt: cash in now; interest from next quarter as financing cost inside operating cost — exactly once', () => {
    const d = step(state, 6, alloc, [{ kind: 'debt', amount: 30 }]);
    const n = step(state, 6, alloc);
    expect(d.c.ledger.financing).toBe(30);
    expect(d.c.cost.financingCost).toBe(0); // drawn this quarter: no interest yet
    expect(d.next.debt).toBe(30);
    const d7 = step(d.next, 7, alloc).c, n7 = step(n.next, 7, alloc).c;
    const interest = 30 * d.next.financing.interestRate;
    expect(interest).toBeGreaterThan(0);
    expect(d7.cost.financingCost).toBeCloseTo(interest, 12);
    // Interest appears exactly once: in operating cost, never in financing or event lines
    expect(d7.ledger.operatingCost - n7.ledger.operatingCost).toBeCloseTo(interest, 9);
    expect(d7.ledger.financing).toBe(0);
    expect(d7.ledger.eventCosts).toBe(n7.ledger.eventCosts);
    expect(d7.ledger.revenue).toBe(n7.ledger.revenue); // cash never feeds the economics
  });

  it('debt capacity is enforced, rises with leverage, and repayment is a negative financing line', () => {
    const cap = assessLiquidity(state, { quarter: 6, allocation: alloc, strategicEnvelope: 30, market: getScenarioMarket(6), ...V2_INTEGRATED_MODE }).options.debtCapacity;
    expect(cap).toBeGreaterThan(0);
    expect(() => step(state, 6, alloc, [{ kind: 'debt', amount: cap + 1 }])).toThrow(/exceeds capacity/);
    const small = step(state, 6, alloc, [{ kind: 'debt', amount: 10 }]).next.financing.interestRate;
    const big = step(state, 6, alloc, [{ kind: 'debt', amount: cap }]).next.financing.interestRate;
    expect(big).toBeGreaterThanOrEqual(small);
    const d = step(state, 6, alloc, [{ kind: 'debt', amount: 20 }]).next;
    const r = step(d, 7, alloc, [{ kind: 'repay', amount: 15 }]);
    expect(r.c.ledger.financing).toBe(-15);
    expect(r.next.debt).toBeCloseTo(5, 12);
    expect(() => step(d, 7, alloc, [{ kind: 'repay', amount: 25 }])).toThrow(/Repayment/);
  });

  it('strategic partner: cash from strategic value, stake dilution, ongoing revenue share as variable cost, once only', () => {
    const p = step(state, 6, alloc, [{ kind: 'partner' }]);
    const P = p.next.financing.partner!;
    expect(p.c.ledger.financing).toBeCloseTo(P.cash, 12);
    expect(P.cash).toBeGreaterThanOrEqual(K.partner.baseCash);
    expect(p.next.financing.ownership).toBeCloseTo(1 - K.partner.stake, 12);
    expect(P.rightOfFirstRefusal).toBe(true);
    const seg = p.c.revenue.closing.segments;
    expect(p.c.cost.variable.partnerRevenueShare).toBeCloseTo(K.partner.revenueShare * (seg.enterprise + seg.aiNative), 12);
    const p7 = step(p.next, 7, alloc).c;
    const s7 = p7.revenue.closing.segments;
    expect(p7.cost.variable.partnerRevenueShare).toBeCloseTo(K.partner.revenueShare * (s7.enterprise + s7.aiNative), 12);
    expect(() => step(p.next, 7, alloc, [{ kind: 'partner' }])).toThrow(/already/);
  });

  it('cost restructuring: pool and floor fall, 2× event cost, damage scales with depth', () => {
    const m = step(state, 6, alloc, [{ kind: 'restructure', depth: 'moderate' }]).c;
    const d = step(state, 6, alloc, [{ kind: 'restructure', depth: 'deep' }]).c;
    const cutM = state.costs.fixedSemiFixed * 0.08;
    expect(m.cost.structuralFixedChange).toBeCloseTo(-cutM, 9);
    expect(m.ledger.eventCostItems.find(e => e.id === 'restructure-Q6')!.amount).toBeCloseTo(2 * cutM, 9);
    const dmg = (c: V2Consequence) => c.appliedShocks.reduce((t, x) => t + (x.after - x.before), 0);
    expect(dmg(d)).toBeLessThan(dmg(m) * 1.8);
  });

  it('structural minimum: repeated cuts never take the fixed pool below 60% of the starting pool', () => {
    let s = state;
    for (let q = 6; q <= 12; q++) s = step(s, q, alloc, [{ kind: 'restructure', depth: 'deep' }]).next;
    expect(s.costs.fixedSemiFixed).toBeGreaterThanOrEqual(V2_MINIMUM_FIXED_POOL - 1e-9);
    expect(s.costs.fixedFloor).toBeGreaterThanOrEqual(V2_MINIMUM_FIXED_POOL - 1e-9);
  });

  it('module imports only V2 effects and never touches revenue', () => {
    const froms = [...financingSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    expect(froms).toEqual(['./engineV2Effects']);
    expect(financingSource).not.toMatch(/totalRevenue|lostRunRate|acquiredRunRate/);
  });
});

describe('Batch 3: liquidity triggers, insolvency and distress (no floor, no hidden rescue)', () => {
  it('baseline valuation: $800M annual revenue × 1.45 + $60M cash = $1,220M', () => {
    const b = getV2Baseline();
    const v = companyValuation({ revenue: 200, operatingProfit: 30, cash: 60, revenueYearAgo: 200, aiCommercialReadiness: b.commercial.aiCommercialReadiness, destinationStrength: 0, debt: 0, status: 'healthy', distressed: false });
    expect(v.multiple).toBeCloseTo(1.45, 12);
    expect(v.preMoney).toBeCloseTo(1220, 9);
  });

  it('refusing to resolve a liquidity gap → explicit insolvency; no cash appears from nowhere', () => {
    const r = runArc(strat('people100'), 10, { policy: REFUSE });
    for (const h of r.quarters) {
      expect(h.record.consequence.ledger.financing).toBe(0);
      expect(h.record.consequence.ledger.financingItems).toEqual([]);
    }
    const S = r.finalState.solvency;
    expect(S.everInsolvent).toBe(true);
    expect(S.insolventQuarters).toBeGreaterThanOrEqual(2);
    expect(r.finalState.cash).toBeLessThan(0); // no floor
    const first = S.firstInsolventQuarter!;
    const rec = r.quarters[first - 1].record.consequence;
    expect(rec.flags).toEqual(expect.arrayContaining(['INSOLVENT', 'LIQUIDITY_EVENT', 'LIQUIDITY_UNRESOLVED']));
  });

  it('while insolvent: distress damages Trust/Talent/Culture and commercial indicators and costs cash', () => {
    const r = runArc(strat('people100'), 10, { policy: REFUSE });
    const first = r.finalState.solvency.firstInsolventQuarter!;
    const next = r.quarters[first].record.consequence;
    expect(next.appliedShocks.filter(x => x.source === 'insolvency distress').map(x => x.target).sort()).toEqual(['culture', 'talent', 'trust']);
    expect(next.appliedCommercialShocks.some(x => x.source === 'insolvency distress')).toBe(true);
    expect(next.ledger.eventCostItems.some(e => e.id.startsWith('distress-'))).toBe(true);
    expect(next.financingOptions.debtCapacity).toBe(0); // lenders gone
    expect(next.financingOptions.valuation.discount).toBe(K.valuation.insolvencyDiscount); // down-round only
  });

  it('resolving explicitly (debt / equity / partner / restructuring) keeps the company solvent, each at its own price', () => {
    const outcomes = (['debt-first', 'equity-first', 'partner-first', 'restructure-first'] as const).map(pref => {
      const r = runArc(strat('people100'), 10, { policy: { liquidity: liquidityPolicy(pref) } });
      return { pref, s: r.finalState, r };
    });
    for (const o of outcomes) {
      expect(o.s.solvency.everInsolvent).toBe(false);
      expect(o.r.passed).toBe(true);
      const events = o.s.solvency.history.filter(h => h.liquidityEvent);
      for (const h of events) expect(h.unresolved).toBe(false);
    }
    const by = Object.fromEntries(outcomes.map(o => [o.pref, o.s]));
    expect(by['debt-first'].financing.debt).toBeGreaterThan(0);
    expect(by['debt-first'].financing.cumulativeInterest).toBeGreaterThan(0);
    expect(by['equity-first'].financing.ownership).toBeLessThan(1);
    expect(by['equity-first'].financing.debt).toBe(0);
    expect(by['partner-first'].financing.partner).not.toBeNull();
    expect(by['restructure-first'].culture).toBeLessThan(by['debt-first'].culture);
  });

  it('liquidity events are recorded from the counterfactual of taking no action', () => {
    const r = runArc(strat('people100'), 10, { policy: { liquidity: liquidityPolicy('debt-first') } });
    const ev = r.finalState.solvency.history.filter(h => h.liquidityEvent);
    expect(ev.length).toBeGreaterThan(0);
    for (const h of ev) {
      expect(h.projectedWithoutResolution).toBeLessThan(K.liquidity.minimumOperatingCash);
      expect(h.resolved).toBe(true);
    }
  });

  it('all strategies with the default financing policy pass every hard gate; financing = Σ explicit actions', () => {
    for (const s of ARC_STRATEGIES) {
      const r = runArc(s, 8);
      expect(r.passed).toBe(true);
      for (const h of r.quarters) {
        const acts = h.decisions?.financing ?? [];
        const L = h.record.consequence.ledger;
        const growthRaise = h.decisions?.finalOption === 'raise-growth-capital' ? 1 : 0; // Q8 option = an explicit equity raise
        expect(L.financingItems.length).toBe(acts.filter(a => a.kind !== 'restructure').length + growthRaise);
      }
    }
  });
});
