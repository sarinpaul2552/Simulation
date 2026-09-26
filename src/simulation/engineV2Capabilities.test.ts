import { describe, it, expect } from 'vitest';
import {
  interpolateCurve,
  calculateAbsorptionFactor,
  bucketNominalGains,
  bucketTransformationLoad,
  calculateV2CapabilityConsequence,
  coordinationLoad,
  countActiveInitiatives,
  V2CapabilityBucket,
  V2CapabilityTarget,
} from './engineV2Capabilities';
import {
  getV2Baseline,
  calculateV2QuarterConsequence,
  applyV2Consequence,
  V2Allocation,
  V2TeamState,
} from './engineV2';
import { runV2Strategy, runV2Quarter, V2_CAPABILITY_SCENARIOS, runV2CapabilityScenario } from '../testlab/utils/v2Diagnostics';
import { allocationStrategies } from '../testlab/utils/testPresets';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});

/** Run a sequence of quarters from an opening state; returns every consequence and the final state. */
function runQuarters(opening: V2TeamState, steps: { a: V2Allocation; env: number }[]) {
  let state = opening;
  const out = steps.map((s, i) => {
    const c = calculateV2QuarterConsequence(state, { quarter: i + 1, allocation: s.a, strategicEnvelope: s.env });
    state = applyV2Consequence(state, c);
    return { c, state };
  });
  return { out, final: state };
}

const target = (c: ReturnType<typeof calculateV2QuarterConsequence>, t: V2CapabilityTarget) =>
  c.capability.targets.find(x => x.target === t)!;

// Approved Draft 1 tables, written independently of the engine constants.
const SPEC: Record<V2CapabilityBucket, { gains: Partial<Record<V2CapabilityTarget, number[]>>; load: number[] }> = {
  consumer: { gains: { consumer: [0, 5, 9, 14, 17] }, load: [0, 6, 11, 20, 28] },
  enterprise: { gains: { enterprise: [0, 6, 11, 17, 21] }, load: [0, 5, 10, 18, 26] },
  aiProduct: { gains: { ai: [0, 7, 13, 21, 27] }, load: [0, 7, 13, 23, 32] },
  people: {
    gains: { talent: [0, 4, 7, 11, 13], organizationalCapacity: [0, 3, 6, 10, 12], productQuality: [0, 0.5, 1.0, 1.8, 2.2] },
    load: [0, 3, 6, 11, 16],
  },
  universityCredentials: { gains: { credential: [0, 5, 9, 14, 17], trust: [0, 0.5, 1, 2, 2.5] }, load: [0, 4, 8, 15, 22] },
};
const POINTS = [0, 5, 10, 20, 30];

describe('1. Exact $0/$5/$10/$20/$30M calibration points', () => {
  for (const bucket of Object.keys(SPEC) as V2CapabilityBucket[]) {
    it(bucket, () => {
      POINTS.forEach((amt, i) => {
        expect(bucketTransformationLoad(bucket, amt)).toBeCloseTo(SPEC[bucket].load[i], 12);
        const gains = bucketNominalGains(bucket, amt);
        for (const [t, pts] of Object.entries(SPEC[bucket].gains)) {
          expect(gains.find(g => g.target === t)!.nominalGain, `${bucket}/${t}@${amt}`).toBeCloseTo(pts![i], 12);
        }
        expect(gains.map(g => g.target).sort()).toEqual(Object.keys(SPEC[bucket].gains).sort());
      });
    });
  }
});

describe('2. Piecewise-linear interpolation', () => {
  // amount → [gain(s)…, load]
  const cases: [V2CapabilityBucket, number, Partial<Record<V2CapabilityTarget, number>>, number][] = [
    ['consumer', 2.5, { consumer: 2.5 }, 3],
    ['consumer', 7.5, { consumer: 7 }, 8.5],
    ['consumer', 8, { consumer: 7.4 }, 9],
    ['consumer', 15, { consumer: 11.5 }, 15.5],
    ['consumer', 25, { consumer: 15.5 }, 24],
    ['enterprise', 2.5, { enterprise: 3 }, 2.5],
    ['enterprise', 7.5, { enterprise: 8.5 }, 7.5],
    ['enterprise', 15, { enterprise: 14 }, 14],
    ['enterprise', 25, { enterprise: 19 }, 22],
    ['aiProduct', 2.5, { ai: 3.5 }, 3.5],
    ['aiProduct', 7.5, { ai: 10 }, 10],
    ['aiProduct', 15, { ai: 17 }, 18],
    ['aiProduct', 25, { ai: 24 }, 27.5],
    ['people', 2.5, { talent: 2, organizationalCapacity: 1.5, productQuality: 0.25 }, 1.5],
    ['people', 7.5, { talent: 5.5, organizationalCapacity: 4.5, productQuality: 0.75 }, 4.5],
    ['people', 15, { talent: 9, organizationalCapacity: 8, productQuality: 1.4 }, 8.5],
    ['people', 25, { talent: 12, organizationalCapacity: 11, productQuality: 2.0 }, 13.5],
    ['universityCredentials', 2.5, { credential: 2.5, trust: 0.25 }, 2],
    ['universityCredentials', 7.5, { credential: 7, trust: 0.75 }, 6],
    ['universityCredentials', 15, { credential: 11.5, trust: 1.5 }, 11.5],
    ['universityCredentials', 25, { credential: 15.5, trust: 2.25 }, 18.5],
  ];
  for (const [bucket, amt, gains, load] of cases) {
    it(`${bucket} $${amt}M`, () => {
      expect(bucketTransformationLoad(bucket, amt)).toBeCloseTo(load, 12);
      const g = bucketNominalGains(bucket, amt);
      for (const [t, v] of Object.entries(gains)) expect(g.find(x => x.target === t)!.nominalGain).toBeCloseTo(v!, 12);
    });
  }

  it('no extrapolation above $30M (rejected), $30M exact accepted, negatives rejected', () => {
    expect(() => interpolateCurve(SPEC.consumer.load, 30.5)).toThrow(/calibrated range/);
    expect(() => bucketNominalGains('aiProduct', 40)).toThrow();
    expect(interpolateCurve(SPEC.consumer.load, 30)).toBe(28);
    expect(() => interpolateCurve(SPEC.consumer.load, -1)).toThrow();
  });

  it('a V2 quarter with >$30M in one bucket is rejected, not extrapolated', () => {
    expect(() => calculateV2QuarterConsequence(getV2Baseline(), { quarter: 1, allocation: alloc({ consumer: 40 }), strategicEnvelope: 40 })).toThrow();
  });
});

describe('Absorption curve (recalibrated)', () => {
  it('≤0.30 → 1.00; 0.50 → 0.95; 0.70 → 0.85; 0.90 → 0.70; 1.10 → 0.50; ≥1.30 → 0.40, continuous', () => {
    const f = calculateAbsorptionFactor;
    expect(f(0)).toBe(1);
    expect(f(0.3)).toBeCloseTo(1, 12);
    expect(f(0.4)).toBeCloseTo(0.975, 12);
    expect(f(0.5)).toBeCloseTo(0.95, 12);
    expect(f(0.6)).toBeCloseTo(0.9, 12);
    expect(f(0.7)).toBeCloseTo(0.85, 12);
    expect(f(0.8)).toBeCloseTo(0.775, 12);
    expect(f(0.9)).toBeCloseTo(0.7, 12);
    expect(f(1.0)).toBeCloseTo(0.6, 12);
    expect(f(1.1)).toBeCloseTo(0.5, 12);
    expect(f(1.2)).toBeCloseTo(0.45, 12);
    expect(f(1.3)).toBeCloseTo(0.4, 12);
    expect(f(2)).toBe(0.4);
    for (const x of [0.3, 0.5, 0.7, 0.9, 1.1, 1.3]) {
      expect(Math.abs(f(x - 1e-9) - f(x + 1e-9))).toBeLessThan(1e-6);
    }
    for (let x = 0; x < 2; x += 0.01) expect(f(x + 0.01)).toBeLessThanOrEqual(f(x) + 1e-12);
  });
});

describe('Coordination load (initiative breadth)', () => {
  it('0–1 → 0, 2 → 1, 3 → 3, 4 → 6, 5 → 10', () => {
    expect([0, 1, 2, 3, 4, 5].map(coordinationLoad)).toEqual([0, 0, 1, 3, 6, 10]);
    expect(() => coordinationLoad(6)).toThrow();
  });

  it('active initiative = non-reserve bucket with ≥ $2M; Cash Reserve never counts', () => {
    expect(countActiveInitiatives(alloc({ consumer: 2, enterprise: 1.99, cashReserve: 26.01 }))).toEqual(['consumer']);
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 2, enterprise: 1.99, cashReserve: 26.01 }), strategicEnvelope: 30,
    });
    expect(c.capability.activeInitiatives).toEqual(['consumer']);
    expect(c.capability.coordinationLoad).toBe(0);
    const reserveOnly = calculateV2QuarterConsequence(getV2Baseline(), { quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 });
    expect(reserveOnly.capability.activeInitiatives).toEqual([]);
    expect(reserveOnly.capability.coordinationLoad).toBe(0);
  });

  it('sub-$2M buckets still add their own bucket load but not coordination load', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 1, enterprise: 1, aiProduct: 1, people: 1, universityCredentials: 1, cashReserve: 25 }), strategicEnvelope: 30,
    });
    expect(c.capability.bucketLoad).toBeCloseTo((6 + 5 + 7 + 3 + 4) / 5, 12);
    expect(c.capability.coordinationLoad).toBe(0);
  });
});

describe('3. Cash Reserve produces no capability and no load', () => {
  it('all-reserve quarter', () => {
    const b = getV2Baseline();
    const c = calculateV2QuarterConsequence(b, { quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 });
    expect(c.capability.transformationLoad).toBe(0);
    expect(c.capability.absorptionFactor).toBe(1);
    expect(c.capability.newCohorts).toEqual([]);
    expect(c.capability.pendingCohortsAfter).toEqual([]);
    for (const t of c.capability.targets) {
      expect(t.nominalNew).toBe(0);
      expect(t.maturedThisQuarter).toBe(0);
      expect(t.closing).toBe(t.opening);
    }
  });

  it('adding reserve to an allocation changes nothing in the capability consequence', () => {
    const b = getV2Baseline();
    const withReserve = calculateV2QuarterConsequence(b, { quarter: 1, allocation: alloc({ consumer: 10, cashReserve: 20 }), strategicEnvelope: 30 });
    const without = calculateV2QuarterConsequence(b, { quarter: 1, allocation: alloc({ consumer: 10 }), strategicEnvelope: 10 });
    expect(withReserve.capability).toEqual(without.capability);
  });
});

describe('4. Transformation Load aggregates across simultaneous initiatives', () => {
  it('Consumer $10M + AI $10M + People $10M → bucket 11 + 13 + 6 = 30, coordination 3, total 33', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 10, aiProduct: 10, people: 10 }), strategicEnvelope: 30,
    });
    expect(c.capability.bucketLoad).toBeCloseTo(30, 12);
    expect(c.capability.activeInitiatives).toEqual(['consumer', 'aiProduct', 'people']);
    expect(c.capability.coordinationLoad).toBe(3);
    expect(c.capability.transformationLoad).toBeCloseTo(33, 12);
    expect(c.capability.loadToCapacityRatio).toBeCloseTo(0.55, 12);
    expect(c.capability.newCohorts.map(x => x.bucket)).toEqual(['consumer', 'aiProduct', 'people']);
  });

  it('$6M over five buckets → bucket 7 + 6 + 8.2 + 3.6 + 4.8 = 29.6, coordination 10, total 39.6', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 }), strategicEnvelope: 30,
    });
    expect(c.capability.bucketLoad).toBeCloseTo(29.6, 12);
    expect(c.capability.coordinationLoad).toBe(10);
    expect(c.capability.transformationLoad).toBeCloseTo(39.6, 12);
  });
});

describe('5. Load within the no-penalty band does not penalize', () => {
  it('$10M Consumer alone: load 11 of 60 (18.3%) → factor 1, effective = nominal', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), { quarter: 1, allocation: alloc({ consumer: 10, cashReserve: 20 }), strategicEnvelope: 30 });
    expect(c.capability.absorptionFactor).toBe(1);
    for (const t of c.capability.targets) expect(t.effectiveNew).toBe(t.nominalNew);
    expect(c.capabilityFlags).toEqual([]);
  });

  it('$30M People: load 16 of 60 (26.7%) → factor 1', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), { quarter: 1, allocation: alloc({ people: 30 }), strategicEnvelope: 30 });
    expect(c.capability.absorptionFactor).toBe(1);
  });

  it('exactly 30% of capacity (load 18 of 60) → factor 1', () => {
    // Consumer $15M (bucket 15.5) + Enterprise $2.5M (bucket 2.5) = 18, 2 initiatives → +1 = 19 → just above; use capacity 63.333…
    const c = calculateV2QuarterConsequence({ ...getV2Baseline(), organizationalCapacity: 19 / 0.3 }, {
      quarter: 1, allocation: alloc({ consumer: 15, enterprise: 2.5, cashReserve: 12.5 }), strategicEnvelope: 30,
    });
    expect(c.capability.transformationLoad).toBeCloseTo(19, 12);
    expect(c.capability.absorptionFactor).toBeCloseTo(1, 12);
  });
});

describe('6. Heavier load reduces new capability creation', () => {
  it('$10M C/E/AI at capacity 60: load 37 (61.7%) → factor 0.891667; Consumer +9 nominal → +8.025 effective', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 10, enterprise: 10, aiProduct: 10 }), strategicEnvelope: 30,
    });
    expect(c.capability.transformationLoad).toBe(37);
    expect(c.capability.absorptionFactor).toBeCloseTo(0.95 - ((37 / 60 - 0.5) / 0.2) * 0.1, 12);
    expect(c.capability.absorptionFactor).toBeCloseTo(0.891667, 5);
    const consumer = target(c, 'consumer');
    expect(consumer.nominalNew).toBe(9);
    expect(consumer.effectiveNew).toBeCloseTo(8.025, 5);
    expect(consumer.absorptionLoss).toBeCloseTo(0.975, 5);
    expect(consumer.maturedThisQuarter).toBeCloseTo(4.0125, 5);
    expect(target(c, 'ai').effectiveNew).toBeCloseTo(13 * 0.891667, 4);
    expect(c.capabilityFlags).toEqual(['ABSORPTION_PENALTY']);
  });

  it('synthetic $90M envelope ($30M C/E/AI): load 86 + 3 = 89 (148%) → floor 0.40', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 30, enterprise: 30, aiProduct: 30 }), strategicEnvelope: 90,
    });
    expect(c.capability.transformationLoad).toBe(89);
    expect(c.capability.absorptionFactor).toBe(0.4);
    expect(c.capabilityFlags).toEqual(expect.arrayContaining(['ABSORPTION_PENALTY', 'LOAD_EXCEEDS_CAPACITY']));
  });
});

describe('7. Absorption never reduces existing capability', () => {
  it('floor absorption (capacity 20) still leaves every stock ≥ opening', () => {
    const opening = { ...getV2Baseline(), organizationalCapacity: 20 };
    const c = calculateV2QuarterConsequence(opening, {
      quarter: 1, allocation: alloc({ consumer: 30, enterprise: 30, aiProduct: 30, people: 30, universityCredentials: 30 }), strategicEnvelope: 150,
    });
    expect(c.capability.absorptionFactor).toBe(0.4);
    for (const t of c.capability.targets) expect(t.closing).toBeGreaterThanOrEqual(t.opening);
  });

  it('a later overloaded quarter does not scale down earlier cohorts', () => {
    const { out } = runQuarters(getV2Baseline(), [
      { a: alloc({ consumer: 10, cashReserve: 20 }), env: 30 },
      { a: alloc({ consumer: 30, enterprise: 30, aiProduct: 30 }), env: 90 },
    ]);
    const q2 = out[1].c.capability;
    const q1CohortTranche = q2.maturation.find(m => m.cohortId === 'Q1-consumer')!;
    expect(q1CohortTranche.matured).toBeCloseTo(9 * 0.35, 12); // unaffected by Q2 factor
    expect(q2.absorptionFactor).toBeLessThan(1);
  });
});

describe('8. Cohorts mature exactly across their schedules', () => {
  const schedules: [V2CapabilityBucket, V2CapabilityTarget, number, number[]][] = [
    ['consumer', 'consumer', 9, [0.5, 0.35, 0.15]],
    ['enterprise', 'enterprise', 11, [0.25, 0.45, 0.3]],
    ['aiProduct', 'ai', 13, [0.2, 0.4, 0.4]],
    ['people', 'talent', 7, [0.5, 0.35, 0.15]],
    ['people', 'organizationalCapacity', 6, [0.5, 0.35, 0.15]],
    ['people', 'productQuality', 1.0, [0.5, 0.35, 0.15]],
    ['universityCredentials', 'credential', 9, [0.2, 0.4, 0.4]],
    ['universityCredentials', 'trust', 1, [0.2, 0.4, 0.4]],
  ];
  for (const [bucket, t, gain, sched] of schedules) {
    it(`$10M ${bucket} → ${t} +${gain} over ${sched.join('/')}`, () => {
      const steps = [{ a: alloc({ [bucket]: 10, cashReserve: 20 }), env: 30 }, ...Array(3).fill({ a: alloc({ cashReserve: 30 }), env: 30 })];
      const { out } = runQuarters(getV2Baseline(), steps);
      const matured = out.map(o => target(o.c, t).maturedThisQuarter);
      expect(matured[0]).toBeCloseTo(gain * sched[0], 12);
      expect(matured[1]).toBeCloseTo(gain * sched[1], 12);
      expect(matured[2]).toBeCloseTo(gain * sched[2], 12);
      expect(matured[3]).toBe(0);
      expect(matured.reduce((a, b) => a + b, 0)).toBeCloseTo(gain, 12);
      // pending after each quarter
      expect(target(out[0].c, t).pendingAfter).toBeCloseTo(gain * (1 - sched[0]), 12);
      expect(target(out[2].c, t).pendingAfter).toBe(0);
      expect(out[2].state.pendingCohorts).toEqual([]);
      // cohort record
      const cohort = out[0].c.capability.newCohorts[0];
      expect(cohort).toMatchObject({ id: `Q1-${bucket}`, quarterInvested: 1, bucket, amount: 10, absorptionFactor: 1, maturationSchedule: sched });
      const g = cohort.gains.find(x => x.target === t)!;
      expect(g.nominalGain).toBeCloseTo(gain, 12);
      expect(g.maturedThisQuarter).toBeCloseTo(gain * sched[0], 12);
      expect(g.remaining).toBeCloseTo(gain * (1 - sched[0]), 12);
    });
  }

  it('Consumer $10M: 55 → 59.5 → 62.65 → 64.0', () => {
    const { out } = runQuarters(getV2Baseline(), [
      { a: alloc({ consumer: 10, cashReserve: 20 }), env: 30 },
      { a: alloc({ cashReserve: 30 }), env: 30 },
      { a: alloc({ cashReserve: 30 }), env: 30 },
    ]);
    expect(out.map(o => o.state.capabilities.consumer)).toEqual([59.5, expect.closeTo(62.65, 12), expect.closeTo(64, 12)]);
  });

  it('overlapping cohorts add their tranches in the same quarter', () => {
    const { out } = runQuarters(getV2Baseline(), [
      { a: alloc({ consumer: 10, cashReserve: 20 }), env: 30 },
      { a: alloc({ consumer: 10, cashReserve: 20 }), env: 30 },
    ]);
    // Q2 = Q1 cohort 35% + Q2 cohort 50% of 9
    expect(target(out[1].c, 'consumer').maturedThisQuarter).toBeCloseTo(9 * 0.85, 12);
    expect(out[1].state.pendingCohorts.map(c => c.id)).toEqual(['Q1-consumer', 'Q2-consumer']);
  });
});

describe('9–10. Cap at 100 and saturation waste is observable', () => {
  it('Consumer $30M every quarter never exceeds 100', () => {
    const { out } = runQuarters(getV2Baseline(), Array(8).fill({ a: alloc({ consumer: 30 }), env: 30 }));
    for (const o of out) expect(o.state.capabilities.consumer).toBeLessThanOrEqual(100);
    expect(out[7].state.capabilities.consumer).toBe(100);
  });

  it('Consumer at 98 + $30M: factor 0.958333, effective 16.2917; realized +2, then all excess wasted; nominal 17 retained', () => {
    const b = getV2Baseline();
    const opening = { ...b, capabilities: { ...b.capabilities, consumer: 98 } };
    const { out } = runQuarters(opening, [
      { a: alloc({ consumer: 30 }), env: 30 },
      { a: alloc({ cashReserve: 30 }), env: 30 },
      { a: alloc({ cashReserve: 30 }), env: 30 },
    ]);
    const f = 1 - ((28 / 60 - 0.3) / 0.2) * 0.05;
    expect(out[0].c.capability.absorptionFactor).toBeCloseTo(f, 12);
    const eff = 17 * f;
    const t1 = target(out[0].c, 'consumer');
    expect(t1.nominalNew).toBe(17);
    expect(t1.effectiveNew).toBeCloseTo(eff, 12);
    expect(t1.effectiveNew).toBeCloseTo(16.291667, 5);
    expect(t1.maturedThisQuarter).toBeCloseTo(eff * 0.5, 12);
    expect(t1.realized).toBe(2);
    expect(t1.wastedSaturation).toBeCloseTo(eff * 0.5 - 2, 12);
    expect(t1.closing).toBe(100);
    expect(target(out[1].c, 'consumer').wastedSaturation).toBeCloseTo(eff * 0.35, 12);
    expect(target(out[2].c, 'consumer').wastedSaturation).toBeCloseTo(eff * 0.15, 12);
    const totalWaste = out.reduce((s, o) => s + target(o.c, 'consumer').wastedSaturation, 0);
    expect(totalWaste).toBeCloseTo(eff - 2, 12);
    expect(out[0].c.capabilityFlags).toContain('CAPABILITY_SATURATION_WASTE');
    for (const t of ['enterprise', 'ai', 'talent', 'credential', 'organizationalCapacity', 'productQuality', 'trust'] as V2CapabilityTarget[]) {
      expect(target(out[0].c, t).closing).toBe(target(out[0].c, t).opening);
    }
    expect(out[0].state.cash).toBe(60);
  });
});

describe('11. People investment raises Organizational Capacity on its schedule', () => {
  it('People $10M: capacity 60 → 63 → 65.1 → 66; Talent 55 → 58.5 → 60.95 → 62; PQ 70 → 70.5 → 70.85 → 71', () => {
    const { out } = runQuarters(getV2Baseline(), [
      { a: alloc({ people: 10, cashReserve: 20 }), env: 30 },
      { a: alloc({ cashReserve: 30 }), env: 30 },
      { a: alloc({ cashReserve: 30 }), env: 30 },
      { a: alloc({ cashReserve: 30 }), env: 30 },
    ]);
    expect(out.map(o => o.state.organizationalCapacity)).toEqual([63, expect.closeTo(65.1, 12), expect.closeTo(66, 12), expect.closeTo(66, 12)]);
    expect(out.map(o => o.state.capabilities.talent)).toEqual([58.5, expect.closeTo(60.95, 12), expect.closeTo(62, 12), expect.closeTo(62, 12)]);
    expect(out.map(o => o.state.productQuality)).toEqual([70.5, expect.closeTo(70.85, 12), expect.closeTo(71, 12), expect.closeTo(71, 12)]);
  });

  it('matured capacity feeds the next quarter’s absorption (People $30M → capacity 66; then $10M C/E/AI: 37 / 66 → 0.919697)', () => {
    const { out } = runQuarters(getV2Baseline(), [
      { a: alloc({ people: 30 }), env: 30 },
      { a: alloc({ consumer: 10, enterprise: 10, aiProduct: 10 }), env: 30 },
    ]);
    expect(out[0].c.capability.absorptionFactor).toBe(1);
    expect(out[0].state.organizationalCapacity).toBe(66);
    expect(out[1].c.capability.openingOrganizationalCapacity).toBe(66);
    expect(out[1].c.capability.absorptionFactor).toBeCloseTo(0.95 - ((37 / 66 - 0.5) / 0.2) * 0.1, 12);
    expect(out[1].c.capability.absorptionFactor).toBeCloseTo(0.919697, 5);
  });
});

describe('12. Same strategy, different Organizational Capacity → different effective gains under heavy load', () => {
  it('$10M C/E/AI at capacity 60 vs 75', () => {
    const q = { quarter: 1, allocation: alloc({ consumer: 10, enterprise: 10, aiProduct: 10 }), strategicEnvelope: 30 };
    const low = calculateV2QuarterConsequence(getV2Baseline(), q);
    const high = calculateV2QuarterConsequence({ ...getV2Baseline(), organizationalCapacity: 75 }, q);
    expect(low.capability.absorptionFactor).toBeCloseTo(0.891667, 5);
    expect(high.capability.absorptionFactor).toBeCloseTo(1 - ((37 / 75 - 0.3) / 0.2) * 0.05, 12); // 0.951667
    expect(target(low, 'consumer').effectiveNew).toBeCloseTo(8.025, 5);
    expect(target(high, 'consumer').effectiveNew).toBeCloseTo(8.565, 5);
    expect(target(high, 'ai').effectiveNew).toBeGreaterThan(target(low, 'ai').effectiveNew);
    expect(high.ledger).toEqual(low.ledger);
  });
});

describe('13. Q1→Q8 deterministic runs preserve the Phase 2A identity and pass all capability checks', () => {
  for (const strategy of Object.values(allocationStrategies)) {
    it(strategy.id, () => {
      const run = runV2Strategy(strategy, 'carried-forward');
      const failed = run.quarters.flatMap(q => q.checks.filter(c => !c.passed).map(c => `Q${q.quarter} ${c.id}: ${c.details}`));
      expect(failed).toEqual([]);
      for (const q of run.quarters) expect(q.consequence.identity.holds).toBe(true);
      expect(run.finalState.capabilityHistory).toHaveLength(8);
      expect(run.finalState.ledgerHistory).toHaveLength(8);
    });
  }

  it('Balanced ledger is unchanged from Phase 2A (final cash $125M) and deterministic', () => {
    const a = runV2Strategy(allocationStrategies['balanced'], 'carried-forward');
    const b = runV2Strategy(allocationStrategies['balanced'], 'carried-forward');
    expect(a.finalState.cash).toBeCloseTo(125, 9);
    expect(JSON.stringify(a.finalState)).toBe(JSON.stringify(b.finalState));
  });

  it('capability pipeline does not read or change any financial field', () => {
    const opening = getV2Baseline();
    const cap = calculateV2CapabilityConsequence(opening, alloc({ consumer: 10, enterprise: 10, aiProduct: 10 }), 1);
    expect(Object.keys(cap.closing)).not.toContain('cash');
    const rec = runV2Quarter(opening, 1, alloc({ consumer: 10, enterprise: 10, aiProduct: 10 }), 30);
    expect(rec.ending.cash).toBe(60);
  });
});

describe('Test Lab capability demo scenarios pass all per-quarter checks', () => {
  for (const s of V2_CAPABILITY_SCENARIOS) {
    it(s.id, () => {
      const r = runV2CapabilityScenario(s);
      const failed = r.quarters.flatMap(q => q.checks.filter(c => !c.passed).map(c => `Q${q.quarter} ${c.id}: ${c.details}`));
      expect(failed).toEqual([]);
    });
  }
});

// ============ GAMEPLAY-SCALE CALIBRATION TABLE (legal $30M allocations) ============

const GAMEPLAY_CASES: { name: string; a: Partial<V2Allocation> }[] = [
  { name: '$30M Consumer', a: { consumer: 30 } },
  { name: '$30M Enterprise', a: { enterprise: 30 } },
  { name: '$30M AI', a: { aiProduct: 30 } },
  { name: '$30M People', a: { people: 30 } },
  { name: '$30M University', a: { universityCredentials: 30 } },
  { name: '$10M Consumer + $10M Enterprise + $10M AI', a: { consumer: 10, enterprise: 10, aiProduct: 10 } },
  { name: '$6M × five strategic buckets', a: { consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 } },
  { name: '$10M Consumer + $10M AI + $10M People', a: { consumer: 10, aiProduct: 10, people: 10 } },
];

// [bucket load, coordination load, total, factor @60, factor @75] — hand-computed from the approved curves
const EXPECTED: [number, number, number, number, number][] = [
  [28, 0, 28, 0.958333, 0.981667],
  [26, 0, 26, 0.966667, 0.988333],
  [32, 0, 32, 0.933333, 0.968333],
  [16, 0, 16, 1.0, 1.0],
  [22, 0, 22, 0.983333, 1.0],
  [34, 3, 37, 0.891667, 0.951667],
  [29.6, 10, 39.6, 0.87, 0.936],
  [30, 3, 33, 0.925, 0.965],
];

describe('Gameplay-scale absorption for legal $30M allocations (capacity 60 vs 75)', () => {
  GAMEPLAY_CASES.forEach((gc, i) => {
    it(gc.name, () => {
      const [bucket, coord, total, f60, f75] = EXPECTED[i];
      const q = { quarter: 1, allocation: alloc(gc.a), strategicEnvelope: 30 };
      const at60 = calculateV2QuarterConsequence(getV2Baseline(), q).capability;
      const at75 = calculateV2QuarterConsequence({ ...getV2Baseline(), organizationalCapacity: 75 }, q).capability;
      expect(at60.bucketLoad).toBeCloseTo(bucket, 12);
      expect(at60.coordinationLoad).toBe(coord);
      expect(at60.transformationLoad).toBeCloseTo(total, 12);
      expect(at60.loadToCapacityRatio).toBeCloseTo(total / 60, 12);
      expect(at60.absorptionFactor).toBeCloseTo(f60, 5);
      expect(at75.transformationLoad).toBeCloseTo(total, 12);
      expect(at75.absorptionFactor).toBeCloseTo(f75, 5);
      // capacity 75 never hurts, and the advantage is bounded (≤ 7 points) at legal scale
      expect(at75.absorptionFactor).toBeGreaterThanOrEqual(at60.absorptionFactor);
      expect(at75.absorptionFactor - at60.absorptionFactor).toBeLessThanOrEqual(0.07);
    });
  });

  it('worst legal $30M allocation on a $1M grid: 5/2/19/2/2 → load 42.8 → 0.84 @60, 0.914667 @75', () => {
    const worst = (capacity: number) => {
      let w = { f: 1, key: '' };
      for (let c = 0; c <= 30; c++) for (let e = 0; e <= 30 - c; e++) for (let a = 0; a <= 30 - c - e; a++)
        for (let p = 0; p <= 30 - c - e - a; p++) {
          const u = 30 - c - e - a - p;
          const r = calculateV2CapabilityConsequence({ ...getV2Baseline(), organizationalCapacity: capacity },
            { consumer: c, enterprise: e, aiProduct: a, people: p, universityCredentials: u }, 1);
          if (r.absorptionFactor < w.f - 1e-12) w = { f: r.absorptionFactor, key: [c, e, a, p, u].join('/') };
        }
      return w;
    };
    const w60 = worst(60);
    expect(w60.key).toBe('5/2/19/2/2');
    expect(w60.f).toBeCloseTo(0.84, 12);
    expect(worst(75).f).toBeCloseTo(0.914667, 5);
  });
});
