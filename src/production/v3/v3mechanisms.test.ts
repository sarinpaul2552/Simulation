/**
 * NexLearn V3 mechanisms (Batch 10B/10C): each rule and economic mechanism, tested through the V3 production adapter.
 */
import { describe, it, expect } from 'vitest';
import * as V3 from './adapter';
import * as F from '../v2/engine';
import type { V2PlayerQuarterInput } from '../v2/types';
import type { V2GameSnapshot } from '../v2/snapshot';
import { V3_ECONOMICS, withV3Economics, ALL_MECHANISMS_OFF } from '../../simulationV3/engineV3Config';
import { universityWinRate, aiRevenueTarget } from '../../simulationV3/engineV3Revenue';
import { applyOrganizationalHealth, type V2CapabilityConsequence } from '../../simulationV3/engineV3Capabilities';

const al = (p: Partial<V2PlayerQuarterInput['allocation']> = {}) => ({ consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p });
const BAL = al({ consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 });

/** Play Q1–Q(n) with a balanced plan (Q4: Balanced Marketplace, Q5: decline, Q6: protect). */
function upTo(n: number, plan = BAL): V2GameSnapshot {
  let s = V3.initializeGame('A');
  for (let q = 1; q <= n; q++) {
    const i: V2PlayerQuarterInput = { quarter: q, allocation: plan };
    if (q === 4) i.destination = 'balanced-marketplace';
    if (q === 5) i.opportunity = { offerId: 'q5-global-enterprise', accept: false };
    if (q === 6) i.recessionStance = 'protect';
    if (q === 7) i.crisisResponse = 'absorb';
    if (q === 8) i.finalOption = 'continue';
    s = V3.resolveQuarter(s, i).snapshot;
  }
  return s;
}

describe('E1 · AI-native revenue converges to the level adoption supports', () => {
  it('the target equals the starting $4M at the starting adoption, neutral demand and quality', () => {
    expect(aiRevenueTarget(10, 1, 1, 0, 1, 80)).toBeCloseTo(4, 9);
  });
  it('higher adoption raises the target; lower demand lowers it; capacity caps it', () => {
    const base = aiRevenueTarget(50, 1.2, 1, 60, 1, 150);
    expect(aiRevenueTarget(70, 1.2, 1, 60, 1, 150)).toBeGreaterThan(base);
    expect(aiRevenueTarget(50, 0.8, 1, 60, 1, 150)).toBeLessThan(base);
    expect(aiRevenueTarget(100, 3, 1.5, 100, 1, 20)).toBeCloseTo(18, 9);
  });
  it('revenue moves part of the way to the target each quarter (and records the target)', () => {
    const s = upTo(3, al({ aiProduct: 30 }));
    const r = s.state.revenueHistory[2].aiNative as { opening: number; closing: number; target?: number };
    expect(r.target).toBeDefined();
    const gap0 = r.target! - r.opening, gap1 = r.target! - r.closing;
    expect(Math.abs(gap1)).toBeLessThan(Math.abs(gap0));
  });
});

describe('E3 · University wins depend on relative Credential', () => {
  it('stronger relative Credential raises the institutional win rate, within bounds', () => {
    expect(universityWinRate(70, 40)).toBeGreaterThan(universityWinRate(70, 0));
    expect(universityWinRate(70, 1000)).toBeCloseTo(V3_ECONOMICS.university.winRateBounds[1], 9);
    expect(universityWinRate(70, -1000)).toBeCloseTo(V3_ECONOMICS.university.winRateBounds[0], 9);
  });
});

describe('E4 · organizational health', () => {
  const cons = (ratio: number, culture: number, caps = { execution: 60, customerSuccess: 30, talent: 55 }) => ({
    loadToCapacityRatio: ratio, targets: [],
    closing: { culture, capabilities: { consumer: 55, enterprise: 30, ai: 10, credential: 40, ...caps } },
  }) as unknown as V2CapabilityConsequence;
  it('overload above the threshold costs culture (capped per quarter)', () => {
    const o = applyOrganizationalHealth(cons(0.8, 72), 0).organization!;
    expect(o.overloadLoss).toBeCloseTo(V3_ECONOMICS.organization.overloadCulturePerTenth * 2, 9);
    expect(applyOrganizationalHealth(cons(3, 72), 0).organization!.overloadLoss).toBe(V3_ECONOMICS.organization.overloadMaxPerQuarter);
  });
  it('culture recovers under low load, faster with People investment', () => {
    const slow = applyOrganizationalHealth(cons(0.2, 50), 0).organization!.recovery;
    const fast = applyOrganizationalHealth(cons(0.2, 50), 10).organization!.recovery;
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeCloseTo(2 * slow, 9);
  });
  it('culture below 72 strains execution, customer success and talent; none at 72', () => {
    const at = applyOrganizationalHealth(cons(0.55, 72), 0).organization!;
    expect(at.executionLoss + at.customerSuccessLoss + at.talentLoss).toBe(0);
    const low = applyOrganizationalHealth(cons(0.55, 52), 0);
    expect(low.organization!.executionLoss).toBeGreaterThan(0);
    expect(low.closing.capabilities.execution).toBeLessThan(60);
  });
  it('switched off, the consequence is returned unchanged', () => {
    const c = cons(0.95, 50);
    withV3Economics({ mechanisms: ALL_MECHANISMS_OFF }, () => expect(applyOrganizationalHealth(c, 0)).toBe(c));
  });
  it('a deep workforce reduction schedules execution and customer-success aftershocks', () => {
    const s5 = upTo(5);
    const r = V3.resolveQuarter(s5, { quarter: 6, allocation: BAL, recessionStance: 'cut', management: { workforceReduction: { depth: 'deep' } } });
    const due = r.snapshot.state.management.scheduledShocks.map(x => x.target);
    expect(due).toContain('execution');
    expect(due).toContain('customerSuccess');
  });
});

describe('E5 · the Q5 contract claims the strategic budget', () => {
  const s4 = upTo(4);
  it('accepting without the implementation cost in reserve is rejected, with the amount named', () => {
    const errs = V3.validateQuarterInput(s4, { quarter: 5, allocation: al({ consumer: 10, enterprise: 10, aiProduct: 10 }), opportunity: { offerId: 'q5-global-enterprise', accept: true } });
    expect(errs.join(' ')).toMatch(/claims \$\d+\.\dM of the strategic budget/);
  });
  it('holding the cost in reserve makes acceptance valid; the cost is recorded once (event cost), not added to investment', () => {
    const spec = V3.getDecisionSpec(s4)!;
    const up = Math.ceil(spec.opportunity!.upfrontCash * 10) / 10;
    const input = { quarter: 5, allocation: al({ consumer: 10, enterprise: 10, aiProduct: 10 - up, cashReserve: up }), opportunity: { offerId: 'q5-global-enterprise', accept: true } };
    expect(V3.validateQuarterInput(s4, input)).toEqual([]);
    const c = V3.resolveQuarter(s4, input).consequence;
    expect(c.ledger.strategicInvestment).toBeCloseTo(30 - up, 6);
    const opp = c.ledger.eventCostItems.filter(i => i.description.includes('[opportunity]'));
    expect(opp.reduce((t, i) => t + i.amount, 0)).toBeCloseTo(spec.opportunity!.upfrontCash, 6);
    expect(opp.every(i => i.description.includes('paid from the strategic budget'))).toBe(true);
    expect(c.identity.holds).toBe(true);
  });
});

describe('E6 · recession stance', () => {
  const s5 = upTo(5);
  const v = (i: Partial<V2PlayerQuarterInput>) => V3.validateQuarterInput(s5, { quarter: 6, allocation: BAL, ...i });
  it('a stance is required in Q6 and only in Q6', () => {
    expect(v({}).join(' ')).toMatch(/recession stance/);
    expect(V3.validateQuarterInput(upTo(4), { quarter: 5, allocation: BAL, opportunity: { offerId: 'q5-global-enterprise', accept: false }, recessionStance: 'protect' }).join(' ')).toMatch(/only chosen in Q6/);
  });
  it('protect: no cost cuts; slow: ≥ $5M reserve; cut: at least one cost action', () => {
    expect(v({ recessionStance: 'protect' })).toEqual([]);
    expect(v({ recessionStance: 'protect', management: { marketingLevel: 0.8 } }).join(' ')).toMatch(/cannot include cost cuts/);
    expect(v({ recessionStance: 'slow' })).toEqual([]);
    expect(v({ recessionStance: 'slow', allocation: al({ consumer: 10, enterprise: 10, aiProduct: 10 }) }).join(' ')).toMatch(/at least \$5M/);
    expect(v({ recessionStance: 'cut' }).join(' ')).toMatch(/at least one cost action/);
    expect(v({ recessionStance: 'cut', management: { marketingLevel: 0.8 } })).toEqual([]);
  });
  it('a hiring freeze with People funded is rejected (the UI moves People to reserve first)', () => {
    expect(v({ recessionStance: 'cut', management: { hiringFreeze: true } }).join(' ')).toMatch(/hiring freeze/i);
    expect(v({ recessionStance: 'cut', management: { hiringFreeze: true }, allocation: { ...BAL, people: 0, cashReserve: 10 } })).toEqual([]);
  });
});

describe('E7 · financing-funded budget expansion', () => {
  const s1 = upTo(1);
  const plan = (exp: number, debt: number): V2PlayerQuarterInput => ({
    quarter: 2, allocation: { ...BAL, consumer: 5 + exp }, expansion: exp, financing: debt > 0 ? [{ kind: 'debt', amount: debt }] : undefined,
  });
  it('the budget is $30M + the expansion', () => {
    expect(V3.budgetForInput(plan(5, 5))).toBe(35);
    expect(F.budgetFor(plan(5, 5), F.v3Config('A'))).toBe(35);
  });
  it('an expansion must be funded by capital raised this quarter', () => {
    expect(V3.validateQuarterInput(s1, plan(5, 0)).join(' ')).toMatch(/funded by new debt or equity/);
    expect(V3.validateQuarterInput(s1, plan(5, 3)).join(' ')).toMatch(/funded by new debt or equity/);
    expect(V3.validateQuarterInput(s1, plan(5, 5))).toEqual([]);
  });
  it('no round trip: debt repaid in the same quarter does not fund an expansion', () => {
    const rt: V2PlayerQuarterInput = { ...plan(5, 5), financing: [{ kind: 'debt', amount: 5 }, { kind: 'repay', amount: 5 }] };
    expect(V3.validateQuarterInput(s1, rt).join(' ')).toMatch(/net of repayments/);
  });
  it('an expansion is limited, and unavailable in Q1 and Q8', () => {
    const big = V3_ECONOMICS.financing.maxExpansion + 1;
    expect(V3.validateQuarterInput(s1, plan(big, big)).join(' ')).toMatch(/limited to/);
    expect(V3.validateQuarterInput(V3.initializeGame('A'), { ...plan(5, 5), quarter: 1 }).join(' ')).toMatch(/not available in Q1/);
  });
  it('the expanded spending is invested and the debt is recorded', () => {
    const r = V3.resolveQuarter(s1, plan(5, 5));
    expect(r.consequence.ledger.strategicInvestment).toBeCloseTo(30, 6);
    expect(r.snapshot.state.financing.debt).toBeCloseTo(5, 6);
    expect(r.snapshot.inputs[1].expansion).toBe(5);
    expect(V3.verifySnapshot(r.snapshot).ok).toBe(true);
  });
});

describe('V2 games never accept V3-only decisions', () => {
  it('the facade rejects a recession stance or an expansion for a V2 game', () => {
    const s = F.initializeGame();
    expect(F.validateQuarterInput(s, { quarter: 1, allocation: BAL, expansion: 5 })).toEqual(['This decision is not available in this game']);
    expect(F.validateQuarterInput(s, { quarter: 1, allocation: BAL, recessionStance: 'protect' })).toEqual(['This decision is not available in this game']);
    expect(F.validateQuarterInput(s, { quarter: 1, allocation: BAL })).toEqual([]);
  });
});

describe('V3 snapshots', () => {
  it('carry the engine version and path, and replay exactly', () => {
    const s = upTo(8);
    expect(s.engineVersion).toBe('v3-econ-1.0');
    expect(s.marketPath).toBe('A');
    expect(V3.verifySnapshot(s).ok).toBe(true);
    expect(F.configOf(s)).toEqual({ engine: 'v3', path: 'A', version: 'v3-econ-1.0' });
  });
});
