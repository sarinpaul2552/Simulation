/**
 * NexLearn V3.1 Stage 3 · Checkpoint A — recession sensitivity of existing customers and the credit cycle (v3-econ-1.1).
 *
 *  - History is locked: V2 and v3-econ-1.0 reproduce the Stage 2 golden hash over 68 games (state, inputs, share prices,
 *    terminal scores). 1.0 states never carry Stage 3A fields.
 *  - Existing customers respond to demand (consumer lapse / win-back; enterprise seat contraction / restoration; expansion
 *    follows demand), and strong retention and Customer Success reduce the downside — each checked against its equation.
 *  - Credit: floating rates with a market spread, net leverage on operating profit before interest, a distressed-credit
 *    ceiling, recession-tightened capacity; healthy companies keep meaningful options; leverage costs more in a recession.
 *  - Every 1.1 game reconciles (cash flow statement = cash movement), verifies by replay and is deterministic.
 */
import { describe, it, expect } from 'vitest';
import { V3_ECONOMICS, V3_1_1_CHANGES, v3ConfigFor, withV3Version, withRegisteredV3Config } from '../../simulationV3/engineV3Config';
import { debtRate, debtCapacity, netLeverage, type V2FinancingView } from '../../simulationV3/engineV3Financing';
import * as V3 from './adapter';
import { firstDifference, type V2GameSnapshot } from '../v2/snapshot';
import { gameHistory } from '../v2/insights/history';
import { valuationSeries } from '../v2/insights/valuation';
import { quarterFinancials } from '../v2/insights/financials';
import { play, type PlayedGame } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';

const V10 = 'v3-econ-1.0' as const, V11 = 'v3-econ-1.1' as const;
type Ver = typeof V10 | typeof V11;
const S = (id: string) => V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy;
const ramp = (x: number, lo: number, hi: number) => (x <= lo ? 0 : x >= hi ? 1 : (x - lo) / (hi - lo));
const sum = (a: number[]) => a.reduce((t, x) => t + x, 0);
/** Stage 3A fields are 1.1-only extensions of the (frozen V2) state and diagnostic types: read them through these views. */
type Lapsed = { consumer: number; enterprise: number };
const lapsedOf = (st: unknown) => (st as { lapsedRevenue?: Lapsed }).lapsedRevenue;
type CDiag = { retained: number; marketLapse?: number; retentionShield?: number; winBack?: number };
type EDiag = { exposedBase: number; seatContraction?: number; expansionDemandFactor?: number };
const cOf = (pq: PlayedGame['quarters'][number]) => pq.consequence.revenue.consumer as unknown as CDiag;
const eOf = (pq: PlayedGame['quarters'][number]) => pq.consequence.revenue.enterprise as unknown as EDiag;
const marketC = (q: number) => V3.getScenarioMarket(q, 'C');
async function sha256(parts: string[]): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('')));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('Stage 3A · history is locked (V2 and v3-econ-1.0)', () => {
  it('V2 + v3-econ-1.0 golden hash over 68 games is unchanged (Stage 2 value)', async () => {
    const h: string[] = [];
    let n = 0;
    for (const cfg of [{ engine: 'v2' }, { engine: 'v3', path: 'A' }, { engine: 'v3', path: 'B' }, { engine: 'v3', path: 'C' }] as const)
      for (const s of V3_LAB_STRATEGIES) {
        const g = play(s.strategy, cfg as never);
        h.push(JSON.stringify(g.snapshot.state), JSON.stringify(g.snapshot.inputs));
        h.push(JSON.stringify(valuationSeries(gameHistory(g.snapshot)).points.map(p => p.price)));
        if (cfg.engine === 'v3') h.push(JSON.stringify(V3.getFinalOutcome(g.snapshot).score));
        n++;
      }
    expect(n).toBe(68);
    expect(await sha256(h)).toBe('71ee2074d0c75f98d92de0f1d19ec62ed9e3262e2e328e4b1506664fb1452b8a');
  }, 120_000);

  it('moved constants keep their exact 1.0 values; the Stage 3A mechanisms are off in 1.0 and on in 1.1', () => {
    const c10 = v3ConfigFor(V10), c11 = v3ConfigFor(V11);
    expect(c10.ai.macroMonetization).toBe(0.15);
    expect({ ...c10.credit }).toMatchObject({ baseRatePerQuarter: 0.02, leverageSpreadPerTurn: 0.0025, distressSpread: 0.015, capacityOpMultiple: 2.5, capacityRevenueShare: 0.4, maxLeverageTurns: 10 });
    expect(c10.mechanisms.installedBaseDemand).toBe(false);
    expect(c10.mechanisms.creditCycle).toBe(false);
    expect(c11.mechanisms.installedBaseDemand).toBe(true);
    expect(c11.mechanisms.creditCycle).toBe(true);
    expect(c11.demand).toMatchObject(V3_1_1_CHANGES.demand!);
    expect(c11.credit).toMatchObject(V3_1_1_CHANGES.credit!);
    expect(c11.ai.macroMonetization).toBe(0.25);
    expect(V3_ECONOMICS.version).toBe(V10); // at rest
  });

  it('1.0 states and diagnostics never carry Stage 3A fields; 1.1 states do', () => {
    const g10 = play(S('balanced'), { engine: 'v3', path: 'C', version: V10 });
    const g11 = play(S('balanced'), { engine: 'v3', path: 'C', version: V11 });
    expect(lapsedOf(g10.snapshot.state)).toBeUndefined();
    expect(JSON.stringify(g10.snapshot.state)).not.toMatch(/marketLapse|seatContraction|lapsedRevenue|lapsed"/);
    expect(lapsedOf(g11.snapshot.state)).toBeDefined();
  });
});

describe('Stage 3A · existing customers respond to the market (1.1)', () => {
  const g = play(S('balanced'), { engine: 'v3', path: 'C', version: V11 });
  const D = v3ConfigFor(V11).demand;

  it('consumer lapse follows its equation: zero in a neutral market, positive in a recession', () => {
    expect(cOf(g.quarters[0]).marketLapse).toBe(0); // Q1: demand 1.0, macro 0
    for (const pq of g.quarters) {
      const c = cOf(pq);
      const m = marketC(pq.quarter);
      const shield = D.consumerShieldMax * ramp(pq.after.commercial.consumerRetention, D.consumerShieldRamp[0], D.consumerShieldRamp[1]);
      expect(c.retentionShield!).toBeCloseTo(shield, 12);
      const rate = (D.consumerDemandLoss * Math.max(0, 1 - m.consumerDemand) + D.consumerMacroLoss * m.macroPressure) * (1 - shield);
      expect(c.marketLapse!).toBeCloseTo(c.retained * rate, 12);
    }
    expect(cOf(g.quarters[5]).marketLapse!).toBeGreaterThan(1); // Q6: demand 0.78, macro 1.0
  });

  it('lapsed consumers return as demand recovers, and the pool reconciles quarter to quarter', () => {
    let pool = 0;
    for (const pq of g.quarters) {
      const c = cOf(pq);
      expect(c.winBack!).toBeCloseTo(D.consumerWinBack * pool * ramp(marketC(pq.quarter).consumerDemand, D.consumerWinBackRamp[0], D.consumerWinBackRamp[1]), 12);
      pool = pool - c.winBack! + c.marketLapse!;
      expect(lapsedOf(pq.after)!.consumer).toBeCloseTo(pool, 12);
    }
    expect(cOf(g.quarters[7]).winBack!).toBeGreaterThan(0); // Q8: demand 0.92
  });

  it('enterprise seats contract with recession, are restored as it eases, and expansion follows demand', () => {
    for (const pq of g.quarters) {
      const e = eOf(pq);
      const m = marketC(pq.quarter);
      const cs = pq.after.capabilities.customerSuccess;
      expect(e.seatContraction!).toBeCloseTo(e.exposedBase * D.enterpriseMacroContraction * m.macroPressure * (1 - 0.5 * ramp(cs, 30, 80)), 12);
      expect(e.expansionDemandFactor!).toBe(Math.min(D.expansionDemandBounds[1], Math.max(D.expansionDemandBounds[0], m.enterpriseDemand)));
    }
  });

  it('a recession lowers revenue more in 1.1 than in 1.0, for every strategy (path C, Q6)', () => {
    for (const s of V3_LAB_STRATEGIES) {
      const r10 = play(s.strategy, { engine: 'v3', path: 'C', version: V10 }).quarters[5].consequence.ledger.revenue;
      const r11 = play(s.strategy, { engine: 'v3', path: 'C', version: V11 }).quarters[5].consequence.ledger.revenue;
      expect(r11, s.strategy.id).toBeLessThan(r10);
    }
  });

  it("path A's own Q6 recession now reduces revenue for most strategies (at least 12 of 17)", () => {
    const down = V3_LAB_STRATEGIES.filter(s => {
      const q = play(s.strategy, { engine: 'v3', path: 'A', version: V11 }).quarters;
      return q[5].consequence.ledger.revenue < q[4].consequence.ledger.revenue;
    }).length;
    expect(down).toBeGreaterThanOrEqual(12);
  });

  it('strong retention reduces the downside: removing the shield raises a strong retainer’s lapse by at least 20%', () => {
    const lapse = (x: PlayedGame) => sum(x.quarters.map(q => cOf(q).marketLapse ?? 0));
    const strong = play(S('consumer-led'), { engine: 'v3', path: 'C', version: V11 });
    const noShield = withRegisteredV3Config(V11, { demand: { consumerShieldMax: 0 } }, () => play(S('consumer-led'), { engine: 'v3', path: 'C', version: V11 }));
    expect(lapse(noShield)).toBeGreaterThan(1.2 * lapse(strong));
    const weak = play(S('all-reserve'), { engine: 'v3', path: 'C', version: V11 });
    expect(lapse(weak)).toBeGreaterThan(lapse(strong));
  });

  it('strong Customer Success reduces seat contraction (share of the renewing base, path C Q6)', () => {
    const share = (id: string) => { const e = eOf(play(S(id), { engine: 'v3', path: 'C', version: V11 }).quarters[5]); return e.seatContraction! / e.exposedBase; };
    expect(share('enterprise-only')).toBeLessThan(share('consumer-only'));
  });
});

describe('Stage 3A · credit cycle (1.1)', () => {
  const view = (o: Partial<V2FinancingView>): V2FinancingView => ({
    revenue: 200, operatingProfit: 30, cash: 20, revenueYearAgo: 200, aiCommercialReadiness: 10, destinationStrength: 0,
    debt: 0, status: 'healthy', distressed: false, fixedSemiFixed: 100, strategicValue: 0, ...o,
  });
  const fin0 = { debt: 0, interestRate: 0, ownership: 1, equityRaised: 0, partner: null, rounds: [], cumulativeInterest: 0 } as never;

  it('rate = base + market spread × macro + amplified net-leverage spread + distress − liquidity credit, within [base/2, ceiling]', () => withV3Version(V11, () => {
    const K = V3_ECONOMICS.credit;
    expect(debtRate(view({}), 0)).toBeCloseTo(K.baseRatePerQuarter, 12);
    expect(debtRate(view({ macroPressure: 1 }), 0)).toBeCloseTo(K.baseRatePerQuarter + K.marketSpread, 12);
    // net leverage 2.5x (debt 320 − cash 20 = 300 net ÷ 120 EBIT): spread 1.5 turns, doubled at macro 1
    expect(debtRate(view({ macroPressure: 1 }), 320)).toBeCloseTo(K.baseRatePerQuarter + K.marketSpread + K.leverageSpreadPerTurn * 1.5 * 2, 12);
    expect(debtRate(view({ cash: 50 }), 0)).toBeCloseTo(K.baseRatePerQuarter - K.cashBufferCredit, 12);
    expect(debtRate(view({ operatingProfit: -5, macroPressure: 1, distressed: true }), 200)).toBe(K.rateCeiling);
    // interest is added back: a quarter's interest does not inflate its own leverage
    expect(netLeverage(120, 0, 25, 5)).toBeCloseTo(1, 12);
    expect(netLeverage(120, 150, 25, 5)).toBe(0);
  }));

  it('1.0 credit terms are unchanged (no macro, gross leverage on post-interest profit)', () => withV3Version(V10, () => {
    expect(debtRate(view({ macroPressure: 1 }), 0)).toBe(0.02);
    expect(debtRate(view({ macroPressure: 1 }), 240)).toBeCloseTo(0.02 + 0.0025 * 1, 12);
    expect(debtCapacity(view({ macroPressure: 1 }), fin0)).toBe(300);
  }));

  it('capacity tightens with recession pressure but stays available to a profitable company', () => withV3Version(V11, () => {
    const K = V3_ECONOMICS.credit;
    expect(debtCapacity(view({}), fin0)).toBe(300);
    expect(debtCapacity(view({ macroPressure: 1 }), fin0)).toBeCloseTo(300 * (1 - K.capacityMacroTightening), 9);
  }));

  it('debt floats: a levered 1.1 company pays a different rate as the market moves; 1.0 debt is fixed at the draw rate', () => {
    const rates = (version: Ver) => {
      const g = play(S('enterprise-ai-pair'), { engine: 'v3', path: 'C', version }, { expansion: 10 });
      return g.quarters.filter(q => q.before.financing.debt > 0).map(q => (q.consequence.cost?.financingCost ?? 0) / q.before.financing.debt);
    };
    const r10 = rates(V10), r11 = rates(V11);
    expect(new Set(r10.map(x => x.toFixed(6))).size).toBe(1);
    expect(Math.max(...r11) - Math.min(...r11)).toBeGreaterThan(0.005);
  });

  it('a healthy company keeps meaningful financing options at the path C trough (≥ $100M at ≤ 3%/qtr)', () => {
    const g = play(S('balanced'), { engine: 'v3', path: 'C', version: V11 });
    const q6 = g.quarters[5];
    const snap: V2GameSnapshot = { ...g.snapshot, state: q6.before, completedQuarter: 5, inputs: g.snapshot.inputs.slice(0, 5) };
    const o = V3.forecastQuarter(snap, q6.input).options;
    expect(o.debtCapacity).toBeGreaterThan(100);
    expect(o.debtRate).toBeLessThanOrEqual(0.03);
  });

  it('leverage costs more in a recession: $250M borrowed in Q2 costs more interest on path C than path A (1.1); identical in 1.0', () => {
    const interest = (path: 'A' | 'C', version: Ver) => {
      const base = play(S('balanced'), { engine: 'v3', path, version }).snapshot.inputs;
      let snap = V3.initializeGame(path, version);
      for (const inp of base.slice(0, 6)) {
        const c = inp.quarter === 2 ? { ...inp, financing: [...(inp.financing ?? []), { kind: 'debt' as const, amount: 250 }] } : inp;
        snap = V3.resolveQuarter(snap, c).snapshot;
      }
      return sum(snap.state.costHistory.map(c => c.financingCost ?? 0));
    };
    expect(interest('C', V10)).toBeCloseTo(interest('A', V10), 9);
    expect(interest('C', V11)).toBeGreaterThan(interest('A', V11) + 1);
  });
});

describe('Stage 3A · integrity (1.1, 17 strategies × 3 paths)', () => {
  it('every 1.1 game reconciles exactly (free cash flow − acquisitions + financing = cash movement), verifies by replay and is deterministic', () => {
    for (const path of ['A', 'B', 'C'] as const)
      for (const s of V3_LAB_STRATEGIES) {
        const g = play(s.strategy, { engine: 'v3', path, version: V11 });
        expect(gameHistory(g.snapshot).map(quarterFinancials).every(f => f.reconciles), `${path} ${s.strategy.id}`).toBe(true);
        expect(V3.verifySnapshot(g.snapshot).ok, `${path} ${s.strategy.id}`).toBe(true);
        expect(g.snapshot.state.solvency.everInsolvent, `${path} ${s.strategy.id}`).toBe(false);
      }
    const a = play(S('adaptive'), { engine: 'v3', path: 'C', version: V11 }, { expansion: 10 }).snapshot;
    const b = play(S('adaptive'), { engine: 'v3', path: 'C', version: V11 }, { expansion: 10 }).snapshot;
    expect(firstDifference(a, b)).toBeNull();
  }, 120_000);
});
