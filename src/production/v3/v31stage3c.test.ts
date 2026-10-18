/**
 * NexLearn V3.1 Stage 3C-A — valuation and scoring corrections (v3-econ-1.1 only).
 *  P1-1 Q8 growth-option credit only when exercised · P1-2 continuous distress discount · P1-3 strategy premium needs
 *  achieved readiness · P1-4 half the AI premium needs AI-native revenue. v3-econ-1.0 (and V2) are unchanged.
 */
import { describe, it, expect } from 'vitest';
import { V3_ECONOMICS, v3ConfigFor, withV3Version, withV3Economics, ALL_MECHANISMS_OFF } from '../../simulationV3/engineV3Config';
import { companyValuation, gradedDistressMultiplier, type V2ValuationView } from '../../simulationV3/engineV3Financing';
import { scoreV2Company, exercisedShare } from '../../simulationV3/engineV3Scoring';
import * as V3 from './adapter';
import * as F from '../v2/engine';
import { buildLearningReport } from '../v2/insights/report';
import type { V2PlayerQuarterInput } from '../v2/types';
import type { V2FinalDecisionRecord as V3FinalDecisionRecord } from '../../simulationV3/engineV3Final';
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

describe('Stage 3C Policy C · recent financing in the liquidity score (1.1 only)', () => {
  const OFF = { mechanisms: { liquidityNeedBasedRecentEquity: false } } as const;
  const v3rec = (s: { final: { record: unknown } }) => s.final.record as V3FinalDecisionRecord; // the V3 engine's record type carries the 1.1 metadata
  const sc = (s: unknown) => withV3Version(V11, () => scoreV2Company(s as never));
  const off = (s: unknown) => withV3Version(V11, () => withV3Economics(OFF as never, () => scoreV2Company(s as never)));
  const at7 = (id: string, path: 'A' | 'B' | 'C') => { const g = play(S(id), { engine: 'v3', path, version: V11 }); return { g, s6: V3.replayInputs(g.snapshot.inputs.slice(0, 6), path, V11), s7: V3.replayInputs(g.snapshot.inputs.slice(0, 7), path, V11) }; };
  const B5 = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const;
  const mix = (a: V2PlayerQuarterInput['allocation'], env: number, invest: number) => {
    const inv = B5.reduce((t, b) => t + a[b], 0); const o = { ...a };
    for (const b of B5) o[b] = +(a[b] * invest / inv).toFixed(6);
    o.cashReserve = +(env - B5.reduce((t, b) => t + o[b], 0)).toFixed(6); return o;
  };

  it('is off in 1.0 and ALL_MECHANISMS_OFF, on in 1.1; the Q8 record metadata exists only in 1.1 games', () => {
    expect(v3ConfigFor(V10).mechanisms.liquidityNeedBasedRecentEquity).toBe(false);
    expect(ALL_MECHANISMS_OFF.liquidityNeedBasedRecentEquity).toBe(false);
    expect(v3ConfigFor(V11).mechanisms.liquidityNeedBasedRecentEquity).toBe(true);
    const g10 = play(S('balanced'), { engine: 'v3', path: 'B', version: V10 }), g11 = play(S('balanced'), { engine: 'v3', path: 'B', version: V11 });
    expect('optionsWithoutRecentFinancing' in g10.snapshot.state.final.record!).toBe(false);
    expect(v3rec(g11.snapshot.state).optionsWithoutRecentFinancing).toBeDefined();
  });

  it('equity raised and held above $15M never helps; splitting a raise changes nothing; accounting is untouched', () => {
    const { g, s7 } = at7('adaptive', 'B'); const al = mix(g.snapshot.inputs[6].allocation, 30, 30);
    const run = (fin: V2PlayerQuarterInput['financing']) => V3.resolveQuarter(s7, { quarter: 8, allocation: al, finalOption: 'continue', financing: fin }).snapshot.state;
    const none = run([]), one = run([{ kind: 'equity', amount: 40 }]), two = run([{ kind: 'equity', amount: 20 }, { kind: 'equity', amount: 20 }]);
    expect(sc(one).overall).toBeLessThan(sc(none).overall);
    expect(off(one).overall).toBeGreaterThan(off(none).overall); // the exploit that existed before
    expect(Math.abs(sc(two).overall - sc(one).overall)).toBeLessThan(0.02);
    expect(sc(one).components.financial.find(c => c.id === 'liquidity')!.score).toBeCloseTo(sc(none).components.financial.find(c => c.id === 'liquidity')!.score, 12);
    expect(one.cash - none.cash).toBeCloseTo(40, 9); // cash, ownership and value unchanged by scoring
    expect(sc(one).shareholderValue).toBeCloseTo(off(one).shareholderValue, 9);
  });

  it('rescue financing is credited up to minimum operating cash ($15M), with no step at $15M', () => {
    const { g, s7 } = at7('people-only', 'C'); const i8 = g.snapshot.inputs[7];
    const run = (amount: number) => V3.resolveQuarter(s7, { ...i8, financing: amount > 0 ? [{ kind: 'equity', amount }] : [] }).snapshot.state;
    const insolvent = run(0), exact = 15 - insolvent.cash, rescue = run(exact); // equity that restores exactly $15M of closing cash
    expect(insolvent.solvency.status).toBe('insolvent');
    expect(rescue.cash).toBeCloseTo(15, 9);
    expect(sc(rescue).overall).toBeCloseTo(off(rescue).overall, 9); // exactly the rescue amount: fully recognised
    expect(sc(rescue).overall).toBeGreaterThan(sc(insolvent).overall);
    const near = [exact - 0.12, exact, exact + 0.12].map(a => sc(run(a)).components.financial.find(c => c.id === 'liquidity')!.score);
    expect(Math.abs(near[0] - near[1])).toBeLessThan(0.002);
    expect(Math.abs(near[2] - near[1])).toBeLessThan(0.002);
  });

  it('idle Q7 equity that unlocks a Q8 option earns no option credit unless the option is exercised', () => {
    const { g, s6 } = at7('university-led', 'A'); const i7 = g.snapshot.inputs[6];
    const a = V3.resolveQuarter(s6, { ...i7, financing: [...(i7.financing ?? []), { kind: 'equity', amount: 30 }] }).snapshot;
    const rec = (opt: 'continue' | 'scale-independently', invest: number) => V3.resolveQuarter(a, { quarter: 8, allocation: mix(i7.allocation, opt === 'continue' ? 30 : 45, invest), finalOption: opt }).snapshot.state;
    const held = rec('continue', 30), exercised = rec('scale-independently', 45);
    expect(held.final.record!.availability.some(o => o.id === 'scale-independently' && o.available)).toBe(true); // the option is still offered
    expect(v3rec(held).optionsWithoutRecentFinancing).not.toContain('scale-independently');
    const opt = (s: unknown, f: typeof sc) => f(s).components.strategic.find(c => c.id === 'optionality')!.score;
    expect(opt(held, sc)).toBeLessThan(opt(held, off));
    expect(opt(exercised, sc)).toBeCloseTo(opt(exercised, off), 12); // deployed capital keeps its credit
    const base = V3.resolveQuarter(V3.replayInputs(g.snapshot.inputs.slice(0, 7), 'A', V11), { quarter: 8, allocation: mix(i7.allocation, 30, 30), finalOption: 'continue' }).snapshot.state;
    expect(sc(held).overall).toBeLessThan(sc(base).overall);
  });

  it('strategic-partner cash held unused earns no liquidity credit; the partnership itself (stake, revenue share, ROFR) is unchanged', () => {
    const { g, s7 } = at7('consumer-led', 'B'); const al = mix(g.snapshot.inputs[6].allocation, 30, 30);
    const run = (fin: V2PlayerQuarterInput['financing']) => V3.resolveQuarter(s7, { quarter: 8, allocation: al, finalOption: 'continue', financing: fin }).snapshot.state;
    const none = run([]), partner = run([{ kind: 'partner' }]);
    expect(off(partner).overall).toBeGreaterThan(off(none).overall); // before: idle partner cash scored higher
    expect(sc(partner).overall).toBeLessThan(sc(none).overall);
    expect(partner.financing.partner).not.toBeNull();
    expect(partner.financing.ownership).toBeCloseTo(0.94, 12);
  });
});
