import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, V2ArcRun } from '../testlab/utils/v2ScenarioArc';
import { V2_DESTINATION_IDS, V2DestinationId } from './engineV2Destination';
import { assessCrisis, V2CrisisResponseId } from './engineV2Crisis';
import { calculateV2QuarterConsequence, crisisView, V2_INTEGRATED_MODE } from './engineV2';
import { getScenarioMarket, getScenarioQuarter } from './engineV2Scenario';
import crisisSource from './engineV2Crisis.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const run = (id: string, response?: V2CrisisResponseId, extra: object = {}): V2ArcRun =>
  runArc(strat(id), 10, { ...(response ? { policy: { crisis: () => response } } : {}), ...extra });
const suppressed = (id: string) => runArc(strat(id), 10, { suppressCrisis: true });
const a7 = (r: V2ArcRun) => r.quarters[6].crisisAssessment!;
const revLoss = (id: string, resp: V2CrisisResponseId) => 1 - run(id, resp).finalState.revenue / suppressed(id).finalState.revenue;

describe('Batch 3 · Q7: the crisis derives from the company actually built', () => {
  it('scenario fires the crisis in Q7 only; signals do not reveal which crisis hits', () => {
    expect(getScenarioQuarter(7)!.events?.crisis).toBe(true);
    for (const q of [5, 6, 8]) expect(getScenarioQuarter(q)!.events?.crisis).toBeFalsy();
    expect(getScenarioQuarter(7)!.signals.length).toBeGreaterThanOrEqual(5);
  });

  it('crisis type follows the destination (same history, five destinations → five crisis types)', () => {
    const types = V2_DESTINATION_IDS.map(d => a7(runArc(strat('balanced'), 7, { destination: d as V2DestinationId })).type);
    expect(types).toEqual(['consumer-ai-quality', 'enterprise-client', 'premium-talent', 'university-accreditation', 'balanced-complexity']);
  });

  it('severity follows vulnerabilities: well-built companies face milder versions of their own crisis', () => {
    expect(a7(run('consumer-ai')).severity).toBeLessThan(a7(run('consumer100')).severity);
    // Enterprise: compare with the Q5 contract decision held equal (concentration is itself a chosen vulnerability)
    const dec = { policy: { opportunity: () => false } };
    expect(a7(run('enterprise-ai', undefined, dec)).severity).toBeLessThan(a7(run('wrong-way', undefined, dec)).severity);
    expect(a7(run('enterprise-ai', undefined, dec)).severity).toBeLessThan(a7(run('low-cs', undefined, dec)).severity);
    expect(a7(run('balanced')).severity).toBeLessThan(a7(run('low-execution')).severity);
    // Same destination, different company → different severity (no identical penalty by destination)
    const sev = ['consumer100', 'ai100', 'consumer-ai', 'low-talent'].map(id => a7(run(id)).severity.toFixed(3));
    expect(new Set(sev).size).toBe(4);
    for (const id of ['consumer100', 'enterprise-ai', 'people100', 'university100', 'balanced']) {
      const s = a7(run(id)).severity;
      expect(s).toBeGreaterThanOrEqual(0.2);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('improving the vulnerable capability lowers severity (Consumer AI: Product Quality)', () => {
    const st = runArc(strat('consumer-ai'), 6).finalState;
    const lo = assessCrisis('consumer-ai', crisisView(st));
    const hi = assessCrisis('consumer-ai', crisisView({ ...st, productQuality: st.productQuality + 15 }));
    expect(hi.severity).toBeLessThan(lo.severity);
  });

  it('a well-built Consumer AI company handles its crisis better than a badly built one', () => {
    expect(revLoss('consumer-ai', 'absorb')).toBeLessThan(revLoss('consumer100', 'absorb'));
  });

  it('client concentration from the Q5 contract raises Enterprise crisis vulnerability', () => {
    const acc = runArc(strat('enterprise-ai'), 7, { policy: { opportunity: () => true } });
    const dec = runArc(strat('enterprise-ai'), 7, { policy: { opportunity: () => false } });
    expect(a7(acc).vulnerability).toBeGreaterThan(a7(dec).vulnerability);
  });

  it('responses trade off cash now against revenue, trust and future economics', () => {
    for (const id of ['consumer-ai', 'enterprise-ai', 'people100', 'university100', 'balanced']) {
      const [R, C, A] = (['remediate', 'contain', 'absorb'] as const).map(x => run(id, x));
      const q7Crisis = (r: V2ArcRun) => r.quarters[6].record.consequence.ledger.eventCostItems.filter(e => e.id.startsWith('crisis-Q7-' + r.quarters[6].decisions!.crisisResponse)).reduce((t, e) => t + e.amount, 0);
      expect(q7Crisis(R)).toBeGreaterThan(q7Crisis(C)); // remediation costs the most cash up front
      expect(q7Crisis(A)).toBe(0);
      expect(R.finalState.revenue).toBeGreaterThan(A.finalState.revenue); // …and protects revenue best
      expect(R.finalState.revenue).toBeGreaterThan(C.finalState.revenue);
      expect(R.quarters[6].record.consequence.capability.eventLoad + (id === 'balanced' ? 0 : 0)).toBeGreaterThanOrEqual(A.quarters[6].record.consequence.capability.eventLoad);
    }
  });

  it('impacts flow only through itemised channels (losses, shocks, load, event costs), never a revenue override', () => {
    const r = run('enterprise-ai', 'absorb');
    const c = r.quarters[6].record.consequence;
    const crisisLost = c.effects.revenue.lostRunRate.filter(l => /crisis/.test(l.source)).reduce((t, l) => t + l.amount, 0);
    expect(crisisLost).toBeGreaterThan(0);
    expect(c.revenue.enterprise.eventLoss).toBeCloseTo(c.effects.revenue.lostRunRate.filter(l => l.segment === 'enterprise').reduce((t, l) => t + l.amount, 0), 9);
    expect(c.ledger.eventCostItems.every(e => e.amount >= 0)).toBe(true);
    const froms = [...crisisSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]).sort();
    expect(froms).toEqual(['./engineV2Capabilities', './engineV2Destination', './engineV2Effects']);
  });

  it('aftershocks land in Q8 and the crisis is recorded in state', () => {
    const r = run('consumer-ai', 'absorb');
    expect(r.quarters[7].record.consequence.appliedCommercialShocks.some(x => /lingering/.test(x.source))).toBe(true);
    const rec = r.finalState.crisis.record!;
    expect(rec.quarter).toBe(7);
    expect(rec.response).toBe('absorb');
    expect(r.finalState.crisis.pending).toEqual([]);
  });

  it('validation: response without a crisis throws; a second crisis throws; no response = absorb', () => {
    const st6 = runArc(strat('balanced'), 6).finalState;
    const input = (q: number, extra: object) => ({ quarter: q, allocation: { consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5, cashReserve: 5 }, strategicEnvelope: 30, market: getScenarioMarket(q), ...V2_INTEGRATED_MODE, ...extra });
    expect(() => calculateV2QuarterConsequence(st6, input(7, { decisions: { crisisResponse: 'remediate' } }))).toThrow(/No crisis/);
    const c = calculateV2QuarterConsequence(st6, input(7, { crisis: true }));
    expect(c.crisis.record!.response).toBe('absorb');
    const st7 = runArc(strat('balanced'), 7).finalState;
    expect(() => calculateV2QuarterConsequence(st7, input(8, { crisis: true }))).toThrow(/already occurred/);
  });

  it('hard gates: every strategy × every response passes all checks through Q10', () => {
    for (const s of ARC_STRATEGIES) {
      for (const resp of ['remediate', 'contain', 'absorb'] as const) {
        const r = runArc(s, 10, { policy: { crisis: () => resp } });
        const failed = r.quarters.flatMap(h => h.record.checks.filter(c => !c.passed).map(c => `${s.id} ${resp} Q${h.quarter} ${c.id}`));
        expect(failed).toEqual([]);
      }
    }
  });
});
