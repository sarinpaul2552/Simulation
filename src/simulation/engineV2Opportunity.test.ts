import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, DEFAULT_POLICY, V2ArcRun, liquidityPolicy } from '../testlab/utils/v2ScenarioArc';
import { V2_OPPORTUNITIES, opportunityFit, opportunityTerms } from './engineV2Opportunity';
import { getV2Baseline, calculateV2QuarterConsequence, V2_INTEGRATED_MODE } from './engineV2';
import { getScenarioMarket } from './engineV2Scenario';
import { destinationStrength } from './engineV2Destination';
import opportunitySource from './engineV2Opportunity.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
// Recession response and financing held fixed (none) in both arms so comparisons isolate the contract decision.
const run = (id: string, accept: boolean, quarters = 10): V2ArcRun =>
  runArc(strat(id), quarters, { suppressCrisis: true, policy: { opportunity: () => accept, recession: () => ({ actions: {} }), liquidity: liquidityPolicy('refuse') } });
const q = (r: V2ArcRun, n: number) => r.quarters[n - 1].record;
const OFFER = 'q5-global-enterprise';

describe('Batch 3 · Q5: opportunity is not "take contract = revenue"', () => {
  it('module imports only V2 modules and never adds revenue directly', () => {
    const froms = [...opportunitySource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]).sort();
    expect(froms).toEqual(['./engineV2Capabilities', './engineV2Destination', './engineV2Effects']);
    expect(opportunitySource).not.toMatch(/totalRevenue|segments\.(consumer|enterprise)\s*[+]=/);
  });

  it('accepting books contracted run-rate into the Enterprise backlog; nothing goes live in Q5', () => {
    const acc = run('enterprise-ai', true);
    const R5 = q(acc, 5).consequence.revenue;
    expect(R5.enterprise.contractBookingsRunRate).toBeCloseTo(12, 9);
    expect(R5.enterprise.liveFromCurrentBookings).toBe(0);
    const cohort = R5.closing.enterpriseBacklog.find(c => c.id === `E-Q5-${OFFER}`)!;
    expect(cohort.remaining).toBeCloseTo(12, 9);
    expect(cohort.liveToDate).toBe(0);
    // Go-live 25/50/25 over Q6–Q8 (the normal Enterprise recognition schedule)
    const live = [6, 7, 8].map(n => q(acc, n).ending.contracts[0].recognizedToDate);
    expect(live[0]).toBeCloseTo(3, 9);
    expect(live[1]).toBeCloseTo(9, 9);
    expect(live[2]).toBeCloseTo(12, 9);
  });

  it('Q5 revenue is (almost) unchanged by accepting; the contract shows up only as it goes live', () => {
    const acc = run('enterprise-ai', true), dec = run('enterprise-ai', false);
    expect(Math.abs(q(acc, 5).consequence.ledger.revenue - q(dec, 5).consequence.ledger.revenue)).toBeLessThan(0.5);
    expect(q(acc, 8).ending.segmentRevenue.enterprise - q(dec, 8).ending.segmentRevenue.enterprise).toBeGreaterThan(8);
  });

  it('upfront implementation + customization are itemised event costs equal to the quoted terms', () => {
    const acc = run('consumer-ai', true);
    const t = acc.quarters[4].opportunityTerms!;
    const items = q(acc, 5).consequence.ledger.eventCostItems.filter(e => e.id.startsWith(OFFER));
    expect(items.map(e => e.id).sort()).toEqual([`${OFFER}-customization`, `${OFFER}-implementation`]);
    expect(items.reduce((s, e) => s + e.amount, 0)).toBeCloseTo(t.upfrontCash, 9);
    // Unready product costs more to customize
    const ready = run('enterprise-ai', true).quarters[4].opportunityTerms!;
    expect(t.upfrontCash).toBeGreaterThanOrEqual(ready.upfrontCash - 1e-9);
  });

  it('delivery team is a recurring cost commitment through the cost architecture (from Q6, 6 quarters)', () => {
    const acc = run('enterprise-ai', true, 12);
    for (let n = 5; n <= 12; n++) {
      const dec = q(acc, n).consequence.cost.commitments.bySource.decision;
      expect(dec).toBeCloseTo(n >= 6 && n <= 11 ? 1.5 : 0, 9);
    }
  });

  it('organizational load for Q5–Q7 (less when on strategy), none afterwards', () => {
    const ent = run('enterprise-ai', true), con = run('consumer-ai', true);
    const tE = ent.quarters[4].opportunityTerms!, tC = con.quarters[4].opportunityTerms!;
    expect(tE.aligned).toBe(true);
    expect(tC.aligned).toBe(false);
    expect(tE.orgLoadPerQuarter).toBeLessThan(tC.orgLoadPerQuarter);
    for (const n of [5, 6, 7]) expect(q(con, n).consequence.capability.eventLoad).toBeCloseTo(tC.orgLoadPerQuarter, 9);
    expect(q(con, 8).consequence.capability.eventLoad).toBe(0);
  });

  it('roadmap commitment diverts AI/Product gains off strategy (Q5–Q7), not when Enterprise AI is the destination', () => {
    const con = run('consumer-ai', true), ent = run('enterprise-ai', true);
    for (const n of [5, 6, 7]) {
      expect(q(con, n).consequence.capability.newCohorts.find(c => c.bucket === 'aiProduct')!.gainMultiplier).toBeCloseTo(0.7, 9);
      expect(q(ent, n).consequence.capability.newCohorts.find(c => c.bucket === 'aiProduct')!.gainMultiplier ?? 1).toBe(1);
    }
    expect(q(con, 8).consequence.capability.newCohorts.find(c => c.bucket === 'aiProduct')!.gainMultiplier ?? 1).toBe(1);
  });

  it('opportunity cost against the destination: off-strategy acceptance dilutes specialization strength', () => {
    const acc = run('consumer-ai', true), dec = run('consumer-ai', false);
    const sA = destinationStrength(q(acc, 6).ending.destination!, 6);
    const sD = destinationStrength(q(dec, 6).ending.destination!, 6);
    expect(sD - sA).toBeCloseTo(0.25, 9);
    const eA = run('enterprise-ai', true), eD = run('enterprise-ai', false);
    expect(destinationStrength(q(eA, 6).ending.destination!, 6)).toBeCloseTo(destinationStrength(q(eD, 6).ending.destination!, 6), 12);
  });

  it('weak delivery → SLA penalties, Trust damage and termination; strong delivery → none', () => {
    const weak = run('consumer100', true);
    const k = weak.finalState.contracts[0];
    expect(k.lostToDate).toBeGreaterThan(6);
    const sla = weak.quarters.flatMap(h => h.record.consequence.ledger.eventCostItems).filter(e => e.id.includes('-sla-'));
    expect(sla.length).toBeGreaterThan(0);
    expect(q(weak, 8).ending.trust).toBeLessThan(q(run('consumer100', false), 8).ending.trust - 3);
    const strong = run('enterprise-ai', true).finalState.contracts[0];
    // No delivery losses (the Q7 client crisis is a separate, itemised event)
    expect(strong.history.reduce((t, h) => t + h.lost, 0)).toBe(0);
    expect(strong.history.every(h => h.slaPenalty < 0.5)).toBe(true);
  });

  it('attractiveness depends on the company built in Q1–Q4 (no universally correct answer)', () => {
    const delta = (id: string) => {
      const A = run(id, true), D = run(id, false);
      return { rev: A.finalState.revenue - D.finalState.revenue, cash: A.finalState.cash - D.finalState.cash };
    };
    // Built for it: more revenue AND more cash
    for (const id of ['enterprise-ai', 'enterprise100', 'evidence-responsive']) {
      const d = delta(id);
      expect(d.rev).toBeGreaterThan(8);
      expect(d.cash).toBeGreaterThan(5);
    }
    // Not built for it: accepting destroys cash (Consumer, University, Premium/People, Consumer+AI)
    for (const id of ['consumer-ai', 'consumer100', 'university100', 'people100']) {
      expect(delta(id).cash).toBeLessThan(-10);
    }
    // Balanced: genuinely mixed (more revenue, a little less cash)
    const b = delta('balanced');
    expect(b.rev).toBeGreaterThan(0);
    expect(b.cash).toBeLessThan(0);
  });

  it('default rational policy: Enterprise AI companies accept; Consumer, University and Premium decline', () => {
    const accepted = (id: string) => runArc(strat(id), 5).quarters[4].decisions!.opportunity!.accept;
    for (const id of ['enterprise-ai', 'enterprise100', 'evidence-responsive', 'low-cs']) expect(accepted(id)).toBe(true);
    for (const id of ['consumer100', 'consumer-ai', 'university100', 'people100', 'ai100', 'cash100']) expect(accepted(id)).toBe(false);
    expect(DEFAULT_POLICY.opportunity).toBeTypeOf('function');
  });

  it('fit is measured from the company: same offer, different fit', () => {
    const fits = ['consumer100', 'enterprise100', 'enterprise-ai', 'balanced'].map(id => runArc(strat(id), 4).finalState)
      .map(s => opportunityFit({ capabilities: s.capabilities, productQuality: s.productQuality, trust: s.trust, aiCommercialReadiness: s.commercial.aiCommercialReadiness }).fit);
    expect(fits[0]).toBeLessThan(0.15);
    expect(fits[2]).toBeGreaterThan(0.45);
    expect(new Set(fits.map(f => f.toFixed(3))).size).toBe(4);
  });

  it('decisions are validated: wrong quarter, unknown offer and double acceptance throw', () => {
    const base = getV2Baseline();
    const input = (quarter: number, offerId: string) => ({
      quarter, allocation: { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 30 },
      strategicEnvelope: 30, market: getScenarioMarket(quarter), ...V2_INTEGRATED_MODE, decisions: { opportunity: { offerId, accept: true } },
    });
    expect(() => calculateV2QuarterConsequence(base, input(4, OFFER))).toThrow(/offered in Q5/);
    expect(() => calculateV2QuarterConsequence(base, input(5, 'nope'))).toThrow(/Unknown opportunity/);
    const accepted = run('enterprise-ai', true, 5).finalState;
    expect(() => calculateV2QuarterConsequence(accepted, input(5, OFFER))).toThrow(/already accepted/);
    expect(V2_OPPORTUNITIES[OFFER].quarter).toBe(5);
    expect(opportunityTerms(OFFER, { capabilities: base.capabilities, productQuality: 70, trust: 70, aiCommercialReadiness: 8 }, null).runRate).toBe(12);
  });

  it('hard gates: every quarter of every strategy passes all ledger/revenue/cost checks, accept or decline', () => {
    for (const s of ARC_STRATEGIES) {
      for (const accept of [true, false]) {
        const r = runArc(s, 10, { policy: { opportunity: () => accept } }); // default recession policy
        const failed = r.quarters.flatMap(h => h.record.checks.filter(c => !c.passed).map(c => `${s.id} ${accept} Q${h.quarter} ${c.id}`));
        expect(failed).toEqual([]);
        for (const h of r.quarters) {
          const L = h.record.consequence.ledger;
          expect(L.closingCash).toBe(L.openingCash + L.operatingProfit - L.strategicInvestment - L.eventCosts + L.financing);
        }
      }
    }
  });
});
