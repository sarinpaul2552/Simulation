/**
 * NexLearn V3.1 Stage 3C-A — valuation and scoring corrections (v3-econ-1.1 only).
 *  P1-1 Q8 growth-option credit only when exercised · P1-2 continuous distress discount · P1-3 strategy premium needs
 *  achieved readiness · P1-4 half the AI premium needs AI-native revenue. v3-econ-1.0 (and V2) are unchanged.
 */
import { describe, it, expect } from 'vitest';
import { V3_ECONOMICS, v3ConfigFor, withV3Version, ALL_MECHANISMS_OFF } from '../../simulationV3/engineV3Config';
import { companyValuation, gradedDistressMultiplier, type V2ValuationView } from '../../simulationV3/engineV3Financing';
import { scoreV2Company, exercisedShare } from '../../simulationV3/engineV3Scoring';
import * as V3 from './adapter';
import * as F from '../v2/engine';
import { buildLearningReport } from '../v2/insights/report';
import type { V2PlayerQuarterInput } from '../v2/types';
import { play } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';

const V10 = 'v3-econ-1.0' as const, V11 = 'v3-econ-1.1' as const;
const S = (id: string) => V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy;
const NEW = ['decisionCreditOnExercise', 'gradedDistressValuation', 'readinessStrategyPremium', 'aiPremiumOnProof'] as const;
const ramp = (x: number, lo: number, hi: number) => (x <= lo ? 0 : x >= hi ? 1 : (x - lo) / (hi - lo));
const view = (o: Partial<V2ValuationView> = {}): V2ValuationView => ({
  revenue: 220, operatingProfit: 40, cash: 60, revenueYearAgo: 200, aiCommercialReadiness: 70, destinationStrength: 1, debt: 0,
  status: 'healthy', distressed: false, aiRevenueShare: 0.15, destinationReadiness: 1, interestExpense: 0, ...o,
});
/** The original (1.0) formula, written out independently. */
const legacy = (v: V2ValuationView) => {
  const m = Math.min(4, Math.max(0.5, 1 + 5 * (v.revenue / v.revenueYearAgo - 1) + 3 * v.operatingProfit / v.revenue + 0.8 * ramp(v.aiCommercialReadiness, 15, 70) + 0.5 * v.destinationStrength));
  const d = v.status === 'insolvent' ? 0.4 : v.distressed ? 0.7 : 1;
  return (4 * v.revenue * m + v.cash - v.debt) * d;
};

describe('Stage 3C-A · version isolation', () => {
  it('the four corrections are off in 1.0 (explicitly) and in ALL_MECHANISMS_OFF, on in 1.1', () => {
    for (const k of NEW) {
      expect(v3ConfigFor(V10).mechanisms[k]).toBe(false);
      expect(ALL_MECHANISMS_OFF[k]).toBe(false);
      expect(v3ConfigFor(V11).mechanisms[k]).toBe(true);
    }
    expect(v3ConfigFor(V11).valuation).toEqual({ maxDiscount: 0.6, liquidityRange: 30, covenantDiscount: 0.3, covenantRamp: [3.5, 4.5], aiProofShare: 0.5, aiShareRamp: [0.03, 0.15] });
    expect(V3_ECONOMICS.version).toBe(V10);
  });

  it('1.0 valuation is the original formula whatever the new inputs say', () => {
    const cases: Partial<V2ValuationView>[] = [
      {}, { aiRevenueShare: 0, destinationReadiness: 0 }, { cash: 14.8, status: 'warning', distressed: true }, { cash: -5, status: 'insolvent', distressed: true },
      { debt: 300, operatingProfit: -5, distressed: true }, { ignoreDistress: true, distressed: true }, { revenueYearAgo: 260, operatingProfit: -12 },
    ];
    withV3Version(V10, () => { for (const c of cases) { const v = view(c); if (!v.ignoreDistress) expect(companyValuation(v).preMoney).toBeCloseTo(legacy(v), 9); } });
  });
});

describe('Stage 3C-A · P1-2 continuous distress discount (1.1)', () => {
  const mult = (o: Partial<V2ValuationView>) => withV3Version(V11, () => gradedDistressMultiplier(view(o)));
  it('no step at minimum operating cash; old end points kept: $0 → ×0.7, −$15M → ×0.4 (floor)', () => {
    expect(mult({ cash: 15.2 })).toBe(1);
    expect(mult({ cash: 14.8 })).toBeCloseTo(1 - 0.6 * 0.2 / 30, 12);
    expect(mult({ cash: 15.2 }) - mult({ cash: 14.8 })).toBeLessThan(0.005);
    expect(mult({ cash: 0 })).toBeCloseTo(0.7, 12);
    expect(mult({ cash: -15 })).toBeCloseTo(0.4, 12);
    expect(mult({ cash: -100 })).toBeCloseTo(0.4, 12);
    for (let c = 20; c > -20; c -= 0.25) expect(mult({ cash: c - 0.25 })).toBeLessThanOrEqual(mult({ cash: c }) + 1e-12); // monotone
  });
  it('leverage ramps across the covenant (net debt ÷ EBIT 3.5× → 4.5×); net debt with no EBIT = full leverage discount', () => {
    // EBIT 40/qtr = 160/yr; net debt 600 → 3.75×; 720 → 4.5×
    expect(mult({ cash: 60, debt: 60 + 480 })).toBe(1); // 3.0×
    expect(mult({ cash: 60, debt: 60 + 600 })).toBeCloseTo(1 - 0.3 * 0.25, 12);
    expect(mult({ cash: 60, debt: 60 + 800 })).toBeCloseTo(0.7, 12);
    expect(mult({ cash: 60, debt: 100, operatingProfit: -1 })).toBeCloseTo(0.7, 12);
    expect(mult({ cash: 5, debt: 1000 })).toBeCloseTo(0.5, 12); // liquidity 20% + leverage 30% add up
    expect(mult({ cash: -5, debt: 1000 })).toBeCloseTo(0.4, 12); // … capped at the old insolvency discount (60%)
    expect(mult({ cash: -50, debt: 0, ignoreDistress: true })).toBe(1);
  });
  it('in a game: same net debt, Q8 cash $15.2M vs $14.8M → equity differs by < 1% (was 30%)', () => {
    const g = play(S('enterprise-ai-pair'), { engine: 'v3', path: 'C', version: V11 });
    const s7 = V3.replayInputs(g.snapshot.inputs.slice(0, 7), 'C', V11);
    const base: V2PlayerQuarterInput = { quarter: 8, allocation: { consumer: 0, enterprise: 6, aiProduct: 6, people: 0, universityCredentials: 0, cashReserve: 18 }, finalOption: 'continue' };
    const c0 = V3.forecastQuarter(s7, base).projectedClosingCash;
    const at = (cash: number) => { const s = V3.resolveQuarter(s7, { ...base, financing: [{ kind: 'repay', amount: c0 - cash }] }).snapshot.state; return withV3Version(V11, () => scoreV2Company(s)); };
    const hi = at(15.2), lo = at(14.8);
    expect(lo.shareholderValue / hi.shareholderValue).toBeGreaterThan(0.99);
  });
});

describe('Stage 3C-A · P1-3 / P1-4 premiums (1.1)', () => {
  const ev = (o: Partial<V2ValuationView>, version: string = V11) => withV3Version(version, () => companyValuation(view(o)).multiple);
  it('strategy premium = 0.5 × min(strength, achieved readiness): elapsed time alone earns nothing', () => {
    expect(ev({ destinationStrength: 1, destinationReadiness: 0 }) - ev({ destinationStrength: 0, destinationReadiness: 0 })).toBeCloseTo(0, 12);
    expect(ev({ destinationStrength: 1, destinationReadiness: 0.6 }) - ev({ destinationStrength: 0, destinationReadiness: 0.6 })).toBeCloseTo(0.3, 12);
    expect(ev({ destinationStrength: 0.4, destinationReadiness: 1 }) - ev({ destinationStrength: 0, destinationReadiness: 1 })).toBeCloseTo(0.2, 12);
    expect(ev({ destinationStrength: 1, destinationReadiness: 0 }, V10) - ev({ destinationStrength: 0, destinationReadiness: 0 }, V10)).toBeCloseTo(0.5, 12);
  });
  it('AI premium: half for readiness, half for AI-native revenue (3% → 15%)', () => {
    const noAi = ev({ aiCommercialReadiness: 0, aiRevenueShare: 0 });
    expect(ev({ aiRevenueShare: 0.15 }) - noAi).toBeCloseTo(0.8, 12);
    expect(ev({ aiRevenueShare: 0.03 }) - noAi).toBeCloseTo(0.4, 12);
    expect(ev({ aiRevenueShare: 0.09 }) - noAi).toBeCloseTo(0.6, 12);
    expect(ev({ aiRevenueShare: 0 }, V10) - ev({ aiCommercialReadiness: 0, aiRevenueShare: 0 }, V10)).toBeCloseTo(0.8, 12);
  });
  it('a company that invests nothing no longer ends above its starting EV while shrinking; a successful one keeps its premium', () => {
    const val = (id: string) => { const g = play(S(id), { engine: 'v3', path: 'B', version: V11 }); return withV3Version(V11, () => scoreV2Company(g.snapshot.state)); };
    const idle = val('all-reserve'), bal = val('balanced');
    expect(idle.shareholderValue).toBeLessThan(1220); // was 1,519 (TSR 1.25) with revenue 6% below the start
    expect(bal.components.strategic.find(c => c.id === 'coherence')!.score).toBeCloseTo(1, 9); // readiness 1.00 → full coherence
  });
});

describe('Stage 3C-A · P1-1 Q8 decision credit follows the economics (1.1)', () => {
  const g = play(S('adaptive'), { engine: 'v3', path: 'B', version: V11 });
  const s7 = V3.replayInputs(g.snapshot.inputs.slice(0, 7), 'B', V11);
  const al = { consumer: 0, enterprise: 12, aiProduct: 10, people: 8, universityCredentials: 0, cashReserve: 0 };
  const run = (input: Partial<V2PlayerQuarterInput>) => { const snap = V3.resolveQuarter(s7, { quarter: 8, allocation: al, ...input } as V2PlayerQuarterInput).snapshot; return { snap, score: F.getFinalOutcome(snap).score }; };
  const cont = run({ finalOption: 'continue' });
  const scaleSame = run({ finalOption: 'scale-independently', allocation: { ...al, cashReserve: 15 } });
  const scaleFull = run({ finalOption: 'scale-independently', allocation: { ...al, enterprise: 17, aiProduct: 15, people: 13 } });
  const raiseHold = run({ finalOption: 'raise-growth-capital', allocation: { ...al, cashReserve: 30 } });
  const raiseUse = run({ finalOption: 'raise-growth-capital', allocation: { ...al, enterprise: 22, aiProduct: 20, people: 18 } });
  const dq = (r: typeof cont) => r.score.components.strategic.find(c => c.id === 'decision')!.score;

  it('choosing a growth option and spending the same as "continue" scores exactly the same (1.0 gave +1.4)', () => {
    expect(scaleSame.score.overall).toBeCloseTo(cont.score.overall, 12);
    expect(dq(scaleSame)).toBe(dq(cont));
    const s10 = withV3Version(V10, () => scoreV2Company(scaleSame.snap.state).overall - scoreV2Company(cont.snap.state).overall);
    expect(s10).toBeCloseTo(1.4, 6);
  });
  it('credit grows with the share of the extra envelope invested', () => {
    expect(exercisedShare(30, 'scale-independently')).toBe(0);
    expect(exercisedShare(45, 'scale-independently')).toBe(1);
    expect(exercisedShare(45, 'raise-growth-capital')).toBe(0.5);
    expect(dq(scaleFull)).toBeCloseTo(1, 12);
    expect(dq(raiseUse)).toBeCloseTo(1, 12);
    expect(dq(raiseHold)).toBe(dq(cont));
  });
  it('unspent raised cash still counts as cash (liquidity), is not counted as value (shareholder value ≈ unchanged), and deploying it scores higher than holding it here', () => {
    const liq = (r: typeof cont) => r.score.components.financial.find(c => c.id === 'liquidity')!.value;
    expect(liq(raiseHold) - liq(cont)).toBeCloseTo(60, 6);
    expect(Math.abs(raiseHold.score.shareholderValue - cont.score.shareholderValue) / cont.score.shareholderValue).toBeLessThan(0.01);
    expect(raiseUse.score.overall).toBeGreaterThan(raiseHold.score.overall);
  });
  it('strategic sale scoring is preserved: realized offer as shareholder value, decision 0.5, optionality 0', () => {
    const sale = run({ finalOption: 'strategic-sale' });
    expect(sale.score.sold).toBe(true);
    expect(sale.score.shareholderValue).toBeCloseTo(sale.snap.state.final.record!.saleOffer!, 9);
    expect(dq(sale)).toBe(0.5);
    expect(sale.score.components.strategic.find(c => c.id === 'optionality')!.score).toBe(0);
  });
});

describe('Stage 3C-A · consistency', () => {
  it('the learning report shows the game version’s score (1.1 differs from 1.0 for the same state); replay is deterministic', () => {
    const g = play(S('balanced'), { engine: 'v3', path: 'A', version: V11 });
    expect(buildLearningReport(g.snapshot, 'mba').score).toEqual(F.getFinalOutcome(g.snapshot).score);
    expect(F.getFinalOutcome(g.snapshot).score.overall).not.toBeCloseTo(withV3Version(V10, () => scoreV2Company(g.snapshot.state)).overall, 3);
    const again = V3.replayInputs(g.snapshot.inputs, 'A', V11);
    expect(F.getFinalOutcome(again).score).toEqual(F.getFinalOutcome(g.snapshot).score);
    expect(F.verifySnapshot(g.snapshot).ok).toBe(true);
  });
});
