import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, liquidityPolicy, V2ArcRun } from '../testlab/utils/v2ScenarioArc';
import { finalOptions, acquisitionPrice, saleOffer, V2FinalOptionId, V2_FINAL_CALIBRATION, focusSegment } from './engineV2Final';
import { calculateV2QuarterConsequence, finalView, V2_INTEGRATED_MODE, V2TeamState } from './engineV2';
import { getScenarioMarket, getScenarioQuarter } from './engineV2Scenario';
import finalSource from './engineV2Final.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const withFinal = (id: string, option: V2FinalOptionId, extra: object = {}): V2ArcRun =>
  runArc(strat(id), 8, { ...extra, policy: { ...((extra as any).policy ?? {}), final: () => option } });
const q8 = (r: V2ArcRun) => r.quarters[7];
const availableAt = (id: string, extra: object = {}) => q8(runArc(strat(id), 8, extra)).finalOptions!.filter(o => o.available).map(o => o.id);
const Q8 = (state: V2TeamState, extra: object) => calculateV2QuarterConsequence(state, {
  quarter: 8, allocation: { consumer: 10, enterprise: 10, aiProduct: 10, people: 0, universityCredentials: 0, cashReserve: 0 },
  strategicEnvelope: 30, market: getScenarioMarket(8), ...V2_INTEGRATED_MODE, finalDecision: true, ...extra,
});

describe('Batch 3 · Q8: options emerge from the company built', () => {
  it('Q8 opens the final decision; module imports only V2 modules', () => {
    expect(getScenarioQuarter(8)!.events?.finalDecision).toBe(true);
    const froms = [...finalSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]).sort();
    expect(froms).toEqual(['./engineV2Destination', './engineV2Effects']);
  });

  it('not every option is available to every company', () => {
    const sets = ['consumer-ai', 'enterprise100', 'cash100', 'low-execution', 'people100'].map(id => availableAt(id));
    expect(new Set(sets.map(x => x.join(','))).size).toBeGreaterThanOrEqual(3);
    expect(sets[0]).toEqual(expect.arrayContaining(['scale-independently', 'raise-growth-capital', 'acquire-consolidate', 'strategic-sale']));
    expect(sets[1]).not.toContain('scale-independently'); // Enterprise100: thin cash/capacity
    expect(sets[2]).not.toContain('strategic-sale');       // Cash100: not strategically valuable to a buyer
    expect(sets[3]).not.toContain('acquire-consolidate');  // weak Execution cannot integrate
    for (const s of sets) expect(s).toContain('continue');
  });

  it('a distressed/insolvent company can stabilize but cannot scale, acquire or raise growth capital', () => {
    const av = availableAt('people100', { policy: { liquidity: liquidityPolicy('refuse') } });
    expect(av).toContain('stabilize-restructure');
    for (const id of ['scale-independently', 'acquire-consolidate', 'raise-growth-capital'] as const) expect(av).not.toContain(id);
  });

  it('choosing an unavailable option throws with the reasons; decisions outside Q8 throw', () => {
    const st = runArc(strat('enterprise100'), 7).finalState;
    expect(() => Q8(st, { decisions: { finalOption: 'scale-independently' } })).toThrow(/not available/);
    expect(() => calculateV2QuarterConsequence(st, { quarter: 8, allocation: { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 30 }, strategicEnvelope: 30, market: getScenarioMarket(8), ...V2_INTEGRATED_MODE, decisions: { finalOption: 'continue' } })).toThrow(/not open/);
    expect(() => Q8(st, { strategicEnvelope: 45, allocation: { consumer: 15, enterprise: 15, aiProduct: 15, people: 0, universityCredentials: 0, cashReserve: 0 } })).toThrow(/exceeds/);
  });

  it('scale independently: a self-funded $45M envelope (extra capability building, more cash spent)', () => {
    const s = withFinal('consumer-ai', 'scale-independently'), c = withFinal('consumer-ai', 'continue');
    expect(q8(s).record.consequence.ledger.strategicEnvelope).toBe(45);
    expect(q8(s).record.consequence.ledger.strategicInvestment).toBeGreaterThan(q8(c).record.consequence.ledger.strategicInvestment);
    expect(s.finalState.cash).toBeLessThan(c.finalState.cash);
  });

  it('raise growth capital: an explicit equity raise priced from the valuation (dilution) and a $60M envelope', () => {
    const r = withFinal('enterprise-ai', 'raise-growth-capital');
    const L = q8(r).record.consequence.ledger;
    const eq = L.financingItems.filter(f => /equity/i.test(f.description));
    expect(eq.reduce((t, f) => t + f.amount, 0)).toBeCloseTo(V2_FINAL_CALIBRATION.raise.amount, 9);
    expect(r.finalState.financing.ownership).toBeLessThan(runArc(strat('enterprise-ai'), 7).finalState.financing.ownership);
    expect(L.strategicEnvelope).toBe(60);
  });

  it('acquire: consideration is an itemised cash line; acquired run-rate arrives with its own cost base, integration load and culture strain', () => {
    const r = withFinal('consumer-ai', 'acquire-consolidate'), c = withFinal('consumer-ai', 'continue');
    const C = q8(r).record.consequence;
    expect(C.ledger.eventCostItems.find(e => e.id === 'acquisition-Q8')!.amount).toBeCloseTo(acquisitionPrice(), 9);
    const seg = focusSegment('consumer-ai');
    expect(C.revenue.consumer.acquired).toBe(seg === 'consumer' ? V2_FINAL_CALIBRATION.acquire.targetRunRate : 0);
    expect(C.cost.structuralFixedChange).toBeGreaterThan(0);
    expect(C.capability.eventLoad).toBeGreaterThanOrEqual(V2_FINAL_CALIBRATION.acquire.integrationLoad[0]);
    expect(r.finalState.final.pendingLoad[0]).toMatchObject({ quarter: 9, load: V2_FINAL_CALIBRATION.acquire.integrationLoad[1] });
    expect(r.finalState.culture).toBeLessThan(c.finalState.culture);
    expect(r.finalState.revenue).toBeGreaterThan(c.finalState.revenue);
  });

  it('strategic sale: the offer comes from the company’s own valuation × strategic premium; no cash enters the company', () => {
    const r = withFinal('consumer-ai', 'strategic-sale');
    const rec = r.finalState.final.record!;
    const v = finalView(runArc(strat('consumer-ai'), 7).finalState, 8);
    expect(rec.saleOffer).toBeCloseTo(saleOffer(v), 6);
    expect(rec.saleOffer!).toBeGreaterThan(v.standaloneEquityValue); // valuable company → premium
    const L = q8(r).record.consequence.ledger;
    expect(L.financing).toBe(0);
    expect(L.eventCostItems.some(e => e.id === 'sale-Q8')).toBe(true);
  });

  it('stabilize/restructure: caps investment, cuts structural cost, relieves the interest rate', () => {
    const base = runArc(strat('people100'), 7, { policy: { liquidity: liquidityPolicy('debt-first') } }).finalState;
    const withDebt: V2TeamState = { ...base, solvency: { ...base.solvency, distressed: true } };
    expect(() => Q8(withDebt, { decisions: { finalOption: 'stabilize-restructure' } })).toThrow(/caps/);
    const c = Q8(withDebt, { allocation: { consumer: 0, enterprise: 0, aiProduct: 0, people: 10, universityCredentials: 0, cashReserve: 20 }, decisions: { finalOption: 'stabilize-restructure' } });
    expect(c.cost.structuralFixedChange).toBeLessThan(0);
    if (base.financing.debt > 0) expect(c.financing.interestRate).toBeLessThan(base.financing.interestRate);
  });

  it('Q8 stays playable and does not erase Q1–Q7: history identical across options, Q8 economics computed normally', () => {
    const runs = (['continue', 'scale-independently', 'strategic-sale'] as const).map(o => withFinal('consumer-ai', o));
    for (let q = 0; q < 7; q++) {
      expect(runs[1].quarters[q].record.consequence.ledger).toEqual(runs[0].quarters[q].record.consequence.ledger);
      expect(runs[2].quarters[q].record.consequence.ledger).toEqual(runs[0].quarters[q].record.consequence.ledger);
    }
    for (const r of runs) {
      expect(r.finalState.ledgerHistory).toHaveLength(8);
      expect(q8(r).record.passed).toBe(true);
    }
  });

  it('hard gates: every strategy × every available option passes all checks', () => {
    for (const s of ARC_STRATEGIES) {
      const opts = finalOptions(finalView(runArc(s, 7).finalState, 8)).filter(o => o.available).map(o => o.id);
      for (const o of opts) {
        const r = withFinal(s.id, o);
        const failed = r.quarters.flatMap(h => h.record.checks.filter(c => !c.passed).map(c => `${s.id} ${o} Q${h.quarter} ${c.id}`));
        expect(failed).toEqual([]);
      }
    }
  });
});
