/**
 * NexLearn V3.1 Stage 3B — Enterprise deal conversion follows enterprise demand (v3-econ-1.1 only) and
 * engine-backed investment effectiveness indicators.
 */
import { describe, it, expect } from 'vitest';
import { V3_ECONOMICS, v3ConfigFor, withRegisteredV3Config } from '../../simulationV3/engineV3Config';
import * as V3 from './adapter';
import * as F from '../v2/engine';
import type { V2GameSnapshot } from '../v2/snapshot';
import type { V2PlayerQuarterInput } from '../v2/types';
import { play, type PlayedGame } from '../../../scripts/lab/v3/player';
import { V3_LAB_STRATEGIES } from '../../../scripts/lab/v3/strategies';

const V10 = 'v3-econ-1.0' as const, V11 = 'v3-econ-1.1' as const;
const S = (id: string) => V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy;
const OFF = { mechanisms: { enterpriseDemandConversion: false } };
type Ind = { indicator: string; capabilityContribution: number; drivers: { label: string; value: number }[] };
const winInd = (c: unknown) => (c as { commercial: { indicators: Ind[] } }).commercial.indicators.find(i => i.indicator === 'enterpriseWinRate')!;
/** Snapshot of a played game after `n` quarters (replayed from its own inputs). */
const after = (g: PlayedGame, path: 'A' | 'B' | 'C', n: number, version = V11) => V3.replayInputs(g.snapshot.inputs.slice(0, n), path, version);

describe('Stage 3B · Enterprise deal conversion (1.1 only)', () => {
  it('is off in 1.0 and on in 1.1 with unit elasticity and [0.5, 1.5] bounds', () => {
    expect(v3ConfigFor(V10).mechanisms.enterpriseDemandConversion).toBe(false);
    expect(v3ConfigFor(V10).enterprise.winCapDemandSensitivity).toBe(0);
    const c = v3ConfigFor(V11);
    expect(c.mechanisms.enterpriseDemandConversion).toBe(true);
    expect(c.enterprise.winCapDemandSensitivity).toBe(1);
    expect([...c.enterprise.winCapDemandBounds]).toEqual([0.5, 1.5]);
    expect(V3_ECONOMICS.version).toBe(V10);
  });

  it('scales only the capability term of the win rate by clamp(1 + s × (demand − 1)) — same quarter, mechanism on vs off', () => {
    for (const path of ['B', 'C'] as const) {
      const g = play(S('enterprise-only'), { engine: 'v3', path, version: V11 });
      for (const q of [3, 6]) {
        const snap = after(g, path, q - 1);
        const input = g.snapshot.inputs[q - 1];
        const on = winInd(V3.resolveQuarter(snap, input).consequence);
        const off = withRegisteredV3Config(V11, OFF, () => winInd(V3.resolveQuarter(snap, input).consequence));
        const factor = Math.min(1.5, Math.max(0.5, 1 + (V3.getScenarioMarket(q, path).enterpriseDemand - 1)));
        expect(on.drivers.find(d => d.label.startsWith('Enterprise demand factor'))!.value).toBeCloseTo(factor, 12);
        expect(on.capabilityContribution).toBeCloseTo(off.capabilityContribution * factor, 9);
      }
    }
  });

  it('strong demand raises and weak demand lowers an Enterprise investor’s win rate and bookings; no Enterprise investment ≈ unchanged', () => {
    const avg = (g: PlayedGame) => g.quarters.slice(1).reduce((t, q) => t + q.after.commercial.enterpriseWinRate, 0) / 7;
    const bookings = (g: PlayedGame) => g.quarters.reduce((t, q) => t + (q.consequence.revenue.enterprise as unknown as { bookingsACV: number }).bookingsACV, 0);
    const pair = (id: string, path: 'B' | 'C') => [play(S(id), { engine: 'v3', path, version: V11 }), withRegisteredV3Config(V11, OFF, () => play(S(id), { engine: 'v3', path, version: V11 }))];
    const [bOn, bOff] = pair('enterprise-only', 'B');
    expect(avg(bOn)).toBeGreaterThan(avg(bOff) + 1);
    expect(bookings(bOn)).toBeGreaterThan(bookings(bOff));
    const [cOn, cOff] = pair('enterprise-only', 'C');
    expect(avg(cOn)).toBeLessThan(avg(cOff));
    expect(bookings(cOn)).toBeLessThan(bookings(cOff));
    const [nOn, nOff] = pair('consumer-only', 'B');
    expect(Math.abs(avg(nOn) - avg(nOff))).toBeLessThan(0.5);
  });

  it('leaves revenue recognition, pipeline accounting and Stage 3A retention untouched (equations unchanged)', () => {
    const c = v3ConfigFor(V11);
    expect(c.enterprise.recognition).toEqual(v3ConfigFor(V10).enterprise.recognition);
    expect(c.enterprise.inflowCapabilityAmplitude).toBe(v3ConfigFor(V10).enterprise.inflowCapabilityAmplitude);
    expect(c.enterprise.deliveryCommitmentScale).toBe(v3ConfigFor(V10).enterprise.deliveryCommitmentScale);
    expect(c.demand.enterpriseMacroContraction).toBe(0.10);
    expect(c.credit.capacityMacroTightening).toBe(0.4);
  });
});

describe('Stage 3B · investment effectiveness preview (engine-backed)', () => {
  const g = play(S('consumer-only'), { engine: 'v3', path: 'A', version: V11 });

  it('matches the engine’s own resolution of the same plan (absorption, load, gains, opening capability)', () => {
    for (const q of [1, 3, 4, 6]) {
      const snap = after(g, 'A', q - 1);
      const input = g.snapshot.inputs[q - 1];
      const p = V3.investmentPreview(snap, input)!;
      const cap = V3.resolveQuarter(snap, { ...input, financing: [] }).consequence.capability;
      expect(p.workload.ratio).toBe(cap.loadToCapacityRatio);
      expect(p.workload.absorption).toBe(cap.absorptionFactor);
      expect(p.workload.coordinationLoad).toBe(cap.coordinationLoad);
      expect(p.workload.cultureLoss).toBe(cap.organization?.overloadLoss ?? 0);
      for (const b of Object.keys(V3.PRIMARY_TARGET) as (keyof typeof V3.PRIMARY_TARGET)[]) {
        const t = cap.targets.find(x => x.target === V3.PRIMARY_TARGET[b])!;
        const pb = p.buckets[b];
        expect(pb.current).toBe(t.opening);
        expect(pb.effectiveGain).toBe(t.effectiveNew);
        expect(pb.lostToWorkload).toBe(t.absorptionLoss);
        expect(pb.ceiling).toBe(cap.ceilings[V3.PRIMARY_TARGET[b]]);
        expect(pb.usableGain + pb.wastedGain).toBeCloseTo(pb.effectiveGain, 12);
        expect(pb.projected).toBeLessThanOrEqual(pb.ceiling + 1e-9);
      }
    }
  });

  it('detects saturation: heavy Consumer investment near 100 shows wasted gain, and the projection is what actually happens', () => {
    // Q4 after three quarters of $30M Consumer: the plan wastes gain at the ceiling
    const snap3 = after(g, 'A', 3);
    const p4 = V3.investmentPreview(snap3, g.snapshot.inputs[3])!;
    expect(p4.buckets.consumer.wastedGain).toBeGreaterThan(1);
    expect(p4.buckets.consumer.headroom).toBeLessThan(p4.buckets.consumer.effectiveGain);
    // Same quarter with Consumer moved to cash: projection = the capability actually reached once earlier investment lands (Q5)
    const move = (i: V2PlayerQuarterInput): V2PlayerQuarterInput => ({ ...i, allocation: { ...i.allocation, cashReserve: i.allocation.cashReserve + i.allocation.consumer, consumer: 0 } });
    const q4 = move(g.snapshot.inputs[3]);
    const pZero = V3.investmentPreview(snap3, q4)!;
    expect(pZero.buckets.consumer.effectiveGain).toBe(0);
    let s: V2GameSnapshot = V3.resolveQuarter(snap3, q4).snapshot;
    s = V3.resolveQuarter(s, move(g.snapshot.inputs[4])).snapshot;
    expect(s.state.capabilities.consumer).toBeCloseTo(pZero.buckets.consumer.projected, 9);
    // a capability far from the ceiling is not flagged
    expect(p4.buckets.enterprise.headroom).toBeGreaterThan(20);
  });

  it('workload level follows the engine: High exactly when overload erodes culture; Moderate when >5% is lost to workload', () => {
    const plans: [string, Partial<V2PlayerQuarterInput['allocation']>][] = [
      ['light', { consumer: 5, cashReserve: 25 }],
      ['five', { consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6, cashReserve: 0 }],
      ['ai heavy', { aiProduct: 30, cashReserve: 0 }],
    ];
    const snap = after(g, 'A', 1);
    const levels: string[] = [];
    for (const [, a] of plans) {
      const input: V2PlayerQuarterInput = { quarter: 2, allocation: { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...a } };
      const p = V3.investmentPreview(snap, input)!;
      const cap = V3.resolveQuarter(snap, input).consequence.capability;
      const loss = cap.organization?.overloadLoss ?? 0;
      expect(p.workload.level).toBe(loss > 0 ? 'high' : cap.absorptionFactor < 0.95 ? 'moderate' : 'low');
      levels.push(p.workload.level);
    }
    expect(levels[0]).toBe('low');
    expect(levels).toContain('high');
  });

  it('reveals no market information: after an identical Q1, the Q2 preview is identical on all three market paths', () => {
    const a = play(S('balanced'), { engine: 'v3', path: 'A', version: V11 });
    const q2 = a.snapshot.inputs[1];
    const previews = (['A', 'B', 'C'] as const).map(path => V3.investmentPreview(V3.replayInputs(a.snapshot.inputs.slice(0, 1), path, V11), q2));
    expect(previews[1]).toEqual(previews[0]);
    expect(previews[2]).toEqual(previews[0]);
    // ...while the same quarter's market really differs across paths
    expect(V3.getScenarioMarket(2, 'B').enterpriseDemand).not.toBe(V3.getScenarioMarket(2, 'A').enterpriseDemand);
  });

  it('V2 games get no preview (their original display is unchanged); invalid plans return null instead of throwing', () => {
    const v2 = F.initializeGame();
    expect(F.investmentPreview(v2, { quarter: 1, allocation: { consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 } })).toBeNull();
    const v3 = F.initializeGame(F.v3Config('A', V11));
    expect(F.investmentPreview(v3, { quarter: 1, allocation: { consumer: 50, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0 } })).toBeNull();
    expect(F.investmentPreview(v3, { quarter: 1, allocation: { consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 } })).not.toBeNull();
  });
});
