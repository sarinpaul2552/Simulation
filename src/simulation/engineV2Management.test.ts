import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc } from '../testlab/utils/v2ScenarioArc';
import {
  V2TeamState, V2Allocation, V2Consequence, V2ManagementActions,
  calculateV2QuarterConsequence, applyV2Consequence, V2_INTEGRATED_MODE,
} from './engineV2';
import { getScenarioMarket, getScenarioQuarter, scenarioCapacity } from './engineV2Scenario';
import { V2_MANAGEMENT_CALIBRATION } from './engineV2Management';
import { enterpriseRenewalRate } from './engineV2Revenue';
import { checkV2Quarter } from '../testlab/utils/v2Diagnostics';
import managementSource from './engineV2Management.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const atQ5 = (id: string) => { const r = runArc(strat(id), 5); return { state: r.finalState, alloc: r.quarters[4].allocation }; };

/** Play Q6..last with an action in Q6 only (optionally an alternate market for Q6). */
function play(state0: V2TeamState, alloc: V2Allocation, actions: V2ManagementActions, last = 12, q6Market = 6, q6Alloc?: V2Allocation) {
  let s = state0;
  const cons: V2Consequence[] = [];
  for (let q = 6; q <= last; q++) {
    const input = {
      quarter: q, allocation: q === 6 && q6Alloc ? q6Alloc : alloc, strategicEnvelope: 30,
      market: getScenarioMarket(q === 6 ? q6Market : q), ...V2_INTEGRATED_MODE, decisions: q === 6 ? { management: actions } : {},
    };
    const c = calculateV2QuarterConsequence(s, input);
    const next = applyV2Consequence(s, c);
    const failed = checkV2Quarter(s, input.allocation, c, next).filter(k => !k.passed).map(k => `Q${q} ${k.id}: ${k.details}`);
    expect(failed).toEqual([]);
    expect(c.ledger.closingCash).toBe(c.ledger.openingCash + c.ledger.operatingProfit - c.ledger.strategicInvestment - c.ledger.eventCosts + c.ledger.financing);
    cons.push(c);
    s = next;
  }
  return { state: s, cons, at: (q: number) => cons[q - 6] };
}

describe('Batch 3 · Q6: recession is a demand shock with exposure by actual economics', () => {
  it('structural market size is unchanged by the recession (demand ≠ size)', () => {
    expect(scenarioCapacity(6)).toEqual(scenarioCapacity(5));
    expect(getScenarioQuarter(6)!.structuralChanges).toEqual([]);
    expect(getScenarioMarket(6).macroPressure).toBe(0.8);
    expect(getScenarioQuarter(6)!.events?.recessionResponse).toBe(true);
  });

  it('relative exposure: Consumer hit hardest, Enterprise installed base more resilient, University most resilient', () => {
    const { state, alloc } = atQ5('balanced');
    // Sustained recession (Q6 market for 3 quarters) vs counterfactual (Q5 market)
    const run = (mk: number) => {
      let s = state; let c!: V2Consequence;
      for (let q = 6; q <= 8; q++) { c = calculateV2QuarterConsequence(s, { quarter: q, allocation: alloc, strategicEnvelope: 30, market: getScenarioMarket(mk), ...V2_INTEGRATED_MODE }); s = applyV2Consequence(s, c); }
      return c.revenue.closing.segments;
    };
    const R = run(6), B = run(5);
    const loss = (k: keyof typeof R) => 1 - R[k] / B[k];
    expect(loss('consumer')).toBeGreaterThan(0.04);
    expect(loss('consumer')).toBeGreaterThan(loss('enterprise'));
    expect(loss('enterprise')).toBeGreaterThan(loss('university'));
    expect(loss('university')).toBeLessThan(0.01);
    expect(loss('aiNative')).toBeGreaterThan(0); // funding/procurement pressure…
    expect(R.aiNative).toBeGreaterThan(state.segmentRevenue.aiNative); // …but productivity demand keeps it growing
  });

  it('proven-ROI resilience: strong Customer Success halves the macro pressure on Enterprise renewals', () => {
    const m = getScenarioMarket(6);
    const co = (cs: number) => ({ capabilities: { consumer: 55, enterprise: 60, ai: 30, talent: 55, credential: 40, customerSuccess: cs, execution: 60 }, productQuality: 70, trust: 70 });
    const neutral = { ...m, macroPressure: 0 };
    const hitWeak = enterpriseRenewalRate(co(30), neutral) - enterpriseRenewalRate(co(30), m);
    const hitStrong = enterpriseRenewalRate(co(80), neutral) - enterpriseRenewalRate(co(80), m);
    expect(hitStrong).toBeCloseTo(hitWeak * 0.5, 12);
  });
});

describe('Batch 3 · Q6: management responses have second-order consequences (no free savings)', () => {
  const { state, alloc } = atQ5('balanced');
  const none = play(state, alloc, {});

  it('no actions = no management effects', () => {
    const c = none.at(6);
    expect(c.effects.stateShocks).toEqual([]);
    expect(c.effects.cost.fixedPoolDelta).toEqual([]);
    expect(c.managementSummary.savingsPerQuarter).toBe(0);
  });

  it('workforce reduction: pool and floor fall, severance itemised, capability/culture shocks, survivor attrition for two quarters', () => {
    const deep = play(state, alloc, { workforceReduction: { depth: 'deep' } });
    const c6 = deep.at(6);
    const cut = state.costs.fixedSemiFixed * V2_MANAGEMENT_CALIBRATION.workforce.deep.poolCut;
    expect(c6.cost.structuralFixedChange).toBeCloseTo(-cut, 9);
    expect(c6.cost.closing.fixedFloor).toBeCloseTo(state.costs.fixedFloor - cut, 9);
    expect(c6.ledger.eventCostItems.find(e => e.id === 'mgmt-severance-Q6')!.amount).toBeCloseTo(1.25 * cut, 9);
    const shocked = (t: string) => c6.appliedShocks.filter(x => x.target === t).reduce((s, x) => s + x.after - x.before, 0);
    expect(shocked('talent')).toBeLessThan(-10);
    expect(shocked('culture')).toBeLessThan(-10);
    expect(shocked('organizationalCapacity')).toBeLessThan(-10);
    for (const q of [7, 8]) expect(deep.at(q).appliedShocks.some(x => /survivor attrition/.test(x.source))).toBe(true);
    expect(deep.at(9).appliedShocks.some(x => /survivor attrition/.test(x.source))).toBe(false);
  });

  it('deep cut: more cash and short-term profit, but lower revenue and a weaker organization that absorbs investment worse', () => {
    const deep = play(state, alloc, { workforceReduction: { depth: 'deep' } });
    expect(deep.state.cash).toBeGreaterThan(none.state.cash + 20);
    expect(deep.at(6).ledger.operatingProfit).toBeGreaterThan(none.at(6).ledger.operatingProfit + 10);
    expect(deep.state.revenue).toBeLessThan(none.state.revenue - 10);
    expect(deep.state.culture).toBeLessThan(none.state.culture - 15);
    expect(deep.state.capabilities.talent).toBeLessThan(none.state.capabilities.talent - 15);
    // Same investment, weaker organization → lower absorption
    expect(deep.at(7).capability.effectiveCapacity).toBeLessThan(none.at(7).capability.effectiveCapacity - 10);
    expect(deep.at(7).capability.absorptionFactor).toBeLessThanOrEqual(none.at(7).capability.absorptionFactor);
  });

  it('protecting R&D: 75% of the savings, AI/Product untouched, commercial teams take more', () => {
    const p = play(state, alloc, { workforceReduction: { depth: 'deep', protectRnD: true } }, 6);
    const d = play(state, alloc, { workforceReduction: { depth: 'deep' } }, 6);
    expect(p.at(6).managementSummary.savingsPerQuarter).toBeCloseTo(0.75 * d.at(6).managementSummary.savingsPerQuarter, 9);
    expect(p.at(6).appliedShocks.some(x => x.target === 'ai' || x.target === 'productQuality')).toBe(false);
    expect(d.at(6).appliedShocks.some(x => x.target === 'ai')).toBe(true);
    expect(p.at(6).appliedShocks.some(x => x.target === 'consumer')).toBe(true);
  });

  it('marketing cut: spend × level and volume × level^0.7, persisting; saves cash now, loses revenue and cash later', () => {
    const m = play(state, alloc, { marketingLevel: 0.6 });
    for (const q of [6, 9, 12]) {
      expect(m.at(q).cost.variable.consumerAcquisitionSpend).toBeCloseTo(none.at(q).cost.variable.consumerAcquisitionSpend * 0.6, 9);
      expect(m.at(q).revenue.consumer.acquisitionMultiplier).toBeCloseTo(Math.pow(0.6, 0.7), 12);
    }
    expect(m.at(6).ledger.operatingProfit).toBeGreaterThan(none.at(6).ledger.operatingProfit);
    expect(m.state.revenue).toBeLessThan(none.state.revenue - 5);
    expect(m.state.cash).toBeLessThan(none.state.cash);
  });

  it('hiring freeze: incompatible with People investment; ratchet frozen; talent and culture erode', () => {
    expect(() => play(state, alloc, { hiringFreeze: true }, 6)).toThrow(/hiring freeze/i);
    const noPeople = { ...alloc, cashReserve: alloc.cashReserve + alloc.people, people: 0 };
    const f = play(state, alloc, { hiringFreeze: true }, 8, 6, noPeople);
    const c = f.at(6).cost;
    expect(c.ratchetFrozen).toBe(true);
    expect(c.fixedSemiFixed).toBeLessThanOrEqual(c.openingFixedSemiFixed + c.structuralFixedChange + 1e-9);
    expect(f.at(6).appliedShocks.filter(x => x.source === 'hiring freeze').map(x => x.target).sort()).toEqual(['culture', 'organizationalCapacity', 'talent']);
  });

  it('pricing: an explicit price line on the retained base; the volume response to a raise shrinks with pricing power', () => {
    const r = play(state, alloc, { pricing: 'raise' }, 6).at(6);
    expect(r.revenue.consumer.priceAction).toBeGreaterThan(0);
    const shockAt = (pp: number) => {
      const s = { ...state, commercial: { ...state.commercial, pricingPower: pp } };
      return play(s, alloc, { pricing: 'raise' }, 6).at(6).appliedCommercialShocks.find(x => x.indicator === 'consumerRetention')!.delta;
    };
    expect(Math.abs(shockAt(80))).toBeLessThan(Math.abs(shockAt(50)));
    expect(Math.abs(shockAt(50))).toBeLessThan(Math.abs(shockAt(30)));
    const d = play(state, alloc, { pricing: 'discount' }, 6).at(6);
    expect(d.revenue.consumer.priceAction).toBeLessThan(0);
  });

  it('closing weak offerings: explicit consumer loss, overhead removed, wind-down cost, capacity freed', () => {
    const c = play(state, alloc, { closeWeakOfferings: true }, 6).at(6);
    expect(c.revenue.consumer.eventLoss).toBeCloseTo(state.segmentRevenue.consumer * 0.06, 9);
    expect(c.cost.structuralFixedChange).toBeCloseTo(-state.costs.fixedSemiFixed * 0.055, 9);
    expect(c.ledger.eventCostItems.some(e => e.id === 'mgmt-winddown-Q6')).toBe(true);
    expect(c.appliedShocks.find(x => x.target === 'organizationalCapacity')!.delta).toBe(4);
  });

  it('marketing level is validated', () => {
    expect(() => play(state, alloc, { marketingLevel: 0.1 }, 6)).toThrow(/Marketing level/);
  });

  it('module imports only V2 effects and never touches revenue or cash directly', () => {
    const froms = [...managementSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    expect(froms).toEqual(['./engineV2Effects']);
    expect(managementSource).not.toMatch(/closingCash|totalRevenue/);
  });

  it('arc runner: default recession policy runs for every strategy; all hard gates hold through Q8', () => {
    for (const s of ARC_STRATEGIES) {
      const r = runArc(s, 8);
      expect(r.passed).toBe(true);
      expect(r.quarters[5].decisions!.management).toBeDefined();
    }
  });
});
