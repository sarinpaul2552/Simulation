import { describe, it, expect } from 'vitest';
import {
  V2_DESTINATIONS,
  V2_DESTINATION_IDS,
  V2_DESTINATION_CALIBRATION,
  commitDestination,
  destinationEffects,
  destinationReadiness,
} from './engineV2Destination';
import { getV2Baseline, calculateV2QuarterConsequence, applyV2Consequence, V2Allocation, V2TeamState } from './engineV2';
import { getScenarioMarket } from './engineV2Scenario';
import { runArc, ARC_STRATEGIES, runDestinationMatrix, DESTINATION_COMMIT_QUARTER, runAllArcStrategies } from '../testlab/utils/v2ScenarioArc';
import revenueSource from './engineV2Revenue.ts?raw';
import destinationSource from './engineV2Destination.ts?raw';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});
const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const q4 = (s: V2TeamState, a: V2Allocation, destination?: any) =>
  calculateV2QuarterConsequence(s, { quarter: 4, allocation: a, strategicEnvelope: 30, market: getScenarioMarket(4), revenueSource: 'segment', costSource: 'modelled', destination });
const stateEnteringQ4 = (id: string) => runArc(strat(id), 3).finalState;
const rev = (r: ReturnType<typeof runArc>, q: number) => r.quarters[q - 1].record.consequence.ledger.revenue;

describe('Q4 destinations: definitions', () => {
  it('five locked destinations with distinct economics; Balanced has no specialization premium', () => {
    expect(V2_DESTINATION_IDS.sort()).toEqual(['balanced-marketplace', 'consumer-ai', 'enterprise-ai', 'premium-human-ai', 'university-infrastructure']);
    for (const id of V2_DESTINATION_IDS) {
      const d = V2_DESTINATIONS[id];
      expect(d.readiness.reduce((s, r) => s + r.weight, 0)).toBeCloseTo(1, 12);
    }
    const bal = V2_DESTINATIONS['balanced-marketplace'];
    expect(bal.alignedBuckets).toEqual([]);
    expect(bal.ceilingTargets).toEqual([]);
    expect(bal.accessUplift).toEqual({});
    expect(bal.commercialization).toEqual([]);
  });

  it('destinations never touch revenue: the revenue module has no destination input; destination module has no revenue terms', () => {
    expect(revenueSource).not.toMatch(/destination/i);
    expect(destinationSource).not.toMatch(/revenue\s*[+*]=|segmentRevenue|totalRevenue/);
  });
});

describe('Q4 destinations: commitment state and switching architecture', () => {
  it('commit once; same destination is a no-op; switching is rejected (not yet implemented); history/transition stored', () => {
    const s = stateEnteringQ4('balanced');
    const c = q4(s, alloc({ cashReserve: 30 }), 'enterprise-ai');
    const after = applyV2Consequence(s, c);
    expect(after.destination!.id).toBe('enterprise-ai');
    expect(after.destination!.history).toEqual([{ id: 'enterprise-ai', fromQuarter: 4, toQuarter: null }]);
    expect(after.destination!.transition.cashCost).toBe(0);
    const q5 = (d?: any) => calculateV2QuarterConsequence(after, { quarter: 5, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30, market: getScenarioMarket(5), revenueSource: 'segment', costSource: 'modelled', destination: d });
    expect(() => q5('enterprise-ai')).not.toThrow();
    expect(() => q5('consumer-ai')).toThrow(/switching/);
    expect(q5().destinationState!.id).toBe('enterprise-ai');
  });
});

describe('Q4 destinations: preparation matters (same destination, different Q1–Q3 history)', () => {
  it('readiness, transition load and Q4 absorption differ materially for Enterprise AI', () => {
    const prepared = stateEnteringQ4('enterprise-ai');
    const unprepared = stateEnteringQ4('cash100');
    const rp = destinationReadiness('enterprise-ai', prepared).readiness;
    const ru = destinationReadiness('enterprise-ai', unprepared).readiness;
    expect(rp - ru).toBeGreaterThan(0.35);
    const same = alloc({ enterprise: 15, aiProduct: 15 });
    const cp = q4(prepared, same, 'enterprise-ai');
    const cu = q4(unprepared, same, 'enterprise-ai');
    expect(cp.capability.transitionLoad).toBeLessThan(cu.capability.transitionLoad - 5);
    expect(cp.destination.strength).toBeGreaterThan(cu.destination.strength + 0.35);
  });

  it('unprepared commitment creates transition difficulty: higher load and lower absorption than not committing', () => {
    const s = stateEnteringQ4('consumer100');
    const a = alloc({ enterprise: 15, aiProduct: 15 });
    const none = q4(s, a);
    const committed = q4(s, a, 'enterprise-ai');
    expect(committed.capability.transformationLoad).toBeGreaterThan(none.capability.transformationLoad);
    expect(committed.capability.absorptionFactor).toBeLessThan(none.capability.absorptionFactor);
  });

  it('matrix: same destination across histories spans a wide readiness range for every destination', () => {
    const m = runDestinationMatrix('aligned', 4);
    for (const d of V2_DESTINATION_IDS) {
      const rs = m.filter(c => c.destination === d).map(c => c.readiness);
      expect(Math.max(...rs) - Math.min(...rs), d).toBeGreaterThan(0.3);
    }
  });
});

describe('Q4 destinations: choice matters (same history, different destination)', () => {
  it('holding post-Q4 spending fixed, the matching destination beats every mismatched destination by Q12', () => {
    const pairs: [string, string][] = [
      ['consumer100', 'consumer-ai'], ['enterprise100', 'enterprise-ai'], ['enterprise-ai', 'enterprise-ai'],
      ['consumer-ai', 'consumer-ai'], ['people100', 'premium-human-ai'],
    ];
    for (const [h, match] of pairs) {
      const results = V2_DESTINATION_IDS.map(d => ({ d, r: rev(runArc(strat(h), 12, { destination: d, postQ4Allocation: 'same' }), 12) }));
      const best = results.reduce((a, b) => (b.r > a.r ? b : a));
      expect(best.d, h).toBe(match);
    }
  });

  it('destinations begin separating trajectories from Q5 and the separation widens by Q8', () => {
    // Destination mechanics only: the Batch 3 Q7 crisis (which deliberately tests each destination's own fragility) is suppressed.
    const runs = V2_DESTINATION_IDS.map(d => runArc(strat('balanced'), 8, { destination: d, postQ4Allocation: 'aligned', suppressCrisis: true }));
    const spread = (q: number) => Math.max(...runs.map(r => rev(r, q))) - Math.min(...runs.map(r => rev(r, q)));
    expect(spread(5)).toBeGreaterThan(0.5);
    expect(spread(8)).toBeGreaterThan(spread(5));
    const entUnderEnt = runs[V2_DESTINATION_IDS.indexOf('enterprise-ai')].quarters[7].record.ending.segmentRevenue.enterprise;
    const entUnderUni = runs[V2_DESTINATION_IDS.indexOf('university-infrastructure')].quarters[7].record.ending.segmentRevenue.enterprise;
    expect(entUnderEnt).toBeGreaterThan(entUnderUni);
  });

  it('specialization ceiling: aligned capabilities can exceed 100 only under a destination, never above 120', () => {
    const withD = runArc(strat('consumer100'), 10, { destination: 'consumer-ai', postQ4Allocation: 'same' }).finalState.capabilities.consumer;
    const withOther = runArc(strat('consumer100'), 10, { destination: 'enterprise-ai', postQ4Allocation: 'same' }).finalState.capabilities.consumer;
    expect(withD).toBeGreaterThan(100);
    expect(withD).toBeLessThanOrEqual(V2_DESTINATION_CALIBRATION.specializationCeiling);
    expect(withOther).toBeLessThanOrEqual(100);
  });

  it('Balanced is not made inferior: a broadly prepared company is most ready for Balanced and pays the lowest transition load', () => {
    const s = stateEnteringQ4('balanced');
    const rs = V2_DESTINATION_IDS.map(d => destinationReadiness(d, s).readiness);
    expect(destinationReadiness('balanced-marketplace', s).readiness).toBe(Math.max(...rs));
  });
});

describe('Q4 destinations: no revenue injection', () => {
  it('committing with no positive capability to commercialize and zero investment leaves revenue identical', () => {
    const b = getV2Baseline();
    for (const d of V2_DESTINATION_IDS) {
      const none = q4(b, alloc({ cashReserve: 30 }));
      const withD = q4(b, alloc({ cashReserve: 30 }), d);
      expect(withD.revenue.closing.segments, d).toEqual(none.revenue.closing.segments);
      expect(withD.revenue.aiNative.headroom).toBe(1);
    }
  });

  it('effects are bounded: strength ∈ [0,1], aligned load multiplier ≥ 0.8, ceilings ≤ 120, access ≤ 1.3, commercialization ≤ 1.5', () => {
    for (const d of V2_DESTINATION_IDS) {
      const st = commitDestination(d, getV2Baseline(), 4);
      for (const q of [4, 5, 6, 7, 8, 12]) {
        const e = destinationEffects(st, q);
        expect(e.strength).toBeGreaterThanOrEqual(0);
        expect(e.strength).toBeLessThanOrEqual(1);
        expect(e.alignedLoadMultiplier).toBeGreaterThanOrEqual(0.8 - 1e-12);
        for (const c of Object.values(e.ceilings)) expect(c).toBeLessThanOrEqual(120 + 1e-12);
        for (const m of Object.values(e.accessMultiplier)) expect(m).toBeLessThanOrEqual(1.3 + 1e-12);
        for (const m of Object.values(e.commercialization)) expect(m).toBeLessThanOrEqual(1.5 + 1e-12);
        expect(e.transitionLoad > 0).toBe(q <= 6);
      }
    }
  });
});

describe('Q4 arc integrity', () => {
  it('all 15 strategies commit their destination at Q4 and pass every check through Q4', () => {
    for (const r of runAllArcStrategies(4)) {
      expect(r.passed, r.strategy.id).toBe(true);
      expect(r.quarters[DESTINATION_COMMIT_QUARTER - 1].record.ending.destination, r.strategy.id).not.toBeNull();
    }
  });

  it('full destination matrix (11 histories × 5 destinations, Q1–Q8, both post-Q4 policies) passes every check', () => {
    for (const mode of ['aligned', 'same'] as const) {
      for (const c of runDestinationMatrix(mode, 8)) {
        const failed = c.run.quarters.flatMap(q => q.record.checks.filter(x => !x.passed).map(x => `${c.historyId}/${c.destination} Q${q.quarter} ${x.id}`));
        expect(failed).toEqual([]);
      }
    }
  });
});
