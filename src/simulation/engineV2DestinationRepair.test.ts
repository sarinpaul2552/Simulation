import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, V2ArcRun } from '../testlab/utils/v2ScenarioArc';
import { auditRow, runAuditMatrix, bestDestinationByHistory } from '../testlab/utils/v2FullAudit';
import { V2_DESTINATION_IDS, V2DestinationId } from './engineV2Destination';
import {
  premiumValue, credentialNetworkTarget, institutionalAdoption, calculateAIReadiness,
  PREMIUM_VALUE_START, CREDENTIAL_NETWORK_START, V2_COMMERCIAL_CALIBRATION,
} from './engineV2Commercial';
import { getV2Baseline } from './engineV2';
import revenueSource from './engineV2Revenue.ts?raw';
import destinationSource from './engineV2Destination.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const own = (id: string, d?: V2DestinationId, q = 8): V2ArcRun => runArc(strat(id), q, d ? { destination: d, postQ4Allocation: 'same' } : {});
const score = (r: V2ArcRun) => auditRow(r).score.overall;
const bestOwn = (id: string) => V2_DESTINATION_IDS.map(d => ({ d, s: score(own(id, d)) })).sort((a, b) => b.s - a.s);
const company = (caps: Partial<Record<string, number>>, pq = 70, trust = 70) => {
  const b = getV2Baseline();
  return { capabilities: { ...b.capabilities, ...caps }, productQuality: pq, trust };
};

describe('Batch 4: mechanisms are auditable and preserve the architecture', () => {
  it('flow stays Capabilities → value index → commercial indicators → revenue (no direct revenue, no destination revenue)', () => {
    expect(revenueSource).not.toMatch(/premiumValue|credentialNetwork/);
    expect(destinationSource).not.toMatch(/premiumValue|credentialNetwork|totalRevenue/);
    // Starting company: value indices sit exactly at their anchors (fixed point preserved)
    const b = getV2Baseline();
    expect(b.commercial.premiumValue).toBe(PREMIUM_VALUE_START);
    expect(b.commercial.credentialNetwork).toBe(CREDENTIAL_NETWORK_START);
  });

  it('Premium Value is a weakest-link combination: one strong dependency cannot carry it; a weak one materially limits it', () => {
    const pvOf = (caps: Partial<Record<string, number>>, pq = 70, trust = 70) => {
      const c = company(caps, pq, trust);
      return premiumValue(c, calculateAIReadiness(c).readiness).value;
    };
    const allStrong = pvOf({ talent: 100, execution: 80, ai: 60 }, 95, 90);
    expect(allStrong).toBeGreaterThan(85);
    expect(pvOf({ talent: 120 })).toBeLessThan(25); // Talent alone
    expect(pvOf({ talent: 100, execution: 80, ai: 60 }, 95, 55)).toBeLessThan(allStrong * 0.6); // weak Trust
    expect(pvOf({ talent: 100, execution: 35, ai: 60 }, 95, 90)).toBeLessThan(allStrong * 0.8); // weak Execution
    expect(pvOf({ talent: 100, execution: 80, ai: 60 }, 70, 90)).toBeLessThan(allStrong * 0.6); // weak Product Quality
  });

  it('Credential Network needs Credential AND Trust AND adoption; weak Trust caps it', () => {
    const cn = (cred: number, trust: number, adoption: number) => credentialNetworkTarget(company({ credential: cred }, 70, trust), adoption).value;
    expect(cn(100, 90, 1)).toBeCloseTo(100, 9);
    expect(cn(100, 45, 1)).toBeLessThan(40);
    expect(cn(40, 90, 1)).toBeLessThan(30);
    expect(institutionalAdoption(24, 90)).toBeLessThan(institutionalAdoption(48, 96));
    expect(V2_COMMERCIAL_CALIBRATION.credential.bounds).toEqual([0, 100]);
  });

  it('spillovers are itemised in the commercial diagnostics (retention, enterprise demand, pricing)', () => {
    const c = own('credential-builder').quarters[7].record.consequence.commercial;
    const driver = (ind: string, label: string) => c.indicators.find(i => i.indicator === ind)!.drivers.find(d => d.label.startsWith(label))!.value;
    expect(driver('consumerRetention', 'Credential Network term')).toBeGreaterThan(0);
    expect(driver('enterprisePipeline', 'Credential Network demand')).toBeGreaterThan(0);
    expect(driver('pricingPower', 'Credential Network')).toBeGreaterThan(0);
    const p = own('premium-builder').quarters[7].record.consequence.commercial;
    expect(p.indicators.find(i => i.indicator === 'pricingPower')!.drivers.find(d => d.label.startsWith('Premium Value'))!.value).toBeGreaterThan(5);
  });
});

describe('Batch 4: Premium Human + AI has a credible economic pathway', () => {
  it('strong Talent/Quality/Trust/Execution/AI → strong premium economics', () => {
    const r = auditRow(own('premium-builder'));
    expect(r.destination).toBe('premium-human-ai');
    expect(r.pv).toBeGreaterThan(60);
    expect(r.pp).toBeGreaterThan(62);
    expect(r.margin).toBeGreaterThan(0.18);
    expect(r.revenue).toBeGreaterThan(225);
    expect(r.score.overall).toBeGreaterThan(75);
  });

  it('the same Premium strategy is materially worse when Trust or Execution is weak', () => {
    const strong = auditRow(own('premium-builder'));
    for (const id of ['premium-weak-trust', 'premium-weak-execution']) {
      const w = auditRow(own(id));
      expect(w.pv).toBeLessThan(strong.pv - 15);
      expect(w.revenue).toBeLessThan(strong.revenue - 10);
      expect(w.score.overall).toBeLessThan(strong.score.overall - 8);
    }
  });

  it('with its own allocation, Premium is the best destination for the premium-builder history', () => {
    expect(bestOwn('premium-builder')[0].d).toBe('premium-human-ai');
  });
});

describe('Batch 4: University/Credential produces a strong resilient ecosystem when supported', () => {
  it('credential-builder → University: strong band, resilient through recession and crisis, network value built', () => {
    const run = own('credential-builder');
    const r = auditRow(run);
    expect(r.destination).toBe('university-infrastructure');
    expect(r.cn).toBeGreaterThan(50);
    expect(r.score.overall).toBeGreaterThanOrEqual(60);
    const L = run.finalState.ledgerHistory;
    const drawdown = Math.min(...L.slice(5, 8).map(l => l.revenue)) / L[4].revenue - 1;
    expect(drawdown).toBeGreaterThan(-0.025);
    // Mildest crisis of any destination for this history
    const sev = V2_DESTINATION_IDS.map(d => own('credential-builder', d).finalState.crisis.record!.assessment.severity);
    expect(r.crisis!.severity).toBe(Math.min(...sev));
  });

  it('with its own allocation, University is the best destination for credential-heavy histories', () => {
    expect(bestOwn('credential-builder')[0].d).toBe('university-infrastructure');
    expect(bestOwn('university100')[0].d).toBe('university-infrastructure');
  });

  it('weak Trust materially damages the credential strategy', () => {
    const s = auditRow(own('credential-builder')), w = auditRow(own('credential-weak-trust'));
    expect(w.cn).toBeLessThan(20);
    expect(w.score.overall).toBeLessThan(s.score.overall - 10);
    expect(w.revenue).toBeLessThan(s.revenue - 15);
  });

  it('the University segment itself stays slow and sticky (value comes through spillovers, not an exploding $16M business)', () => {
    for (const id of ['credential-builder', 'university100']) {
      const seg = own(id).finalState.segmentRevenue;
      expect(seg.university).toBeLessThan(20);
    }
  });
});

describe('Batch 4: the other destinations keep their legitimate pathways (no nerf, no bonus)', () => {
  const matrix = runAuditMatrix();
  const best = bestDestinationByHistory(matrix);

  it('Consumer AI remains strong where its thesis is supported', () => {
    expect(best['consumer-ai'].destination).toBe('consumer-ai');
    expect(auditRow(own('consumer-ai')).score.overall).toBeGreaterThan(80);
  });

  it('Enterprise AI remains competitive where preparation supports it', () => {
    expect(best['enterprise100'].destination).toBe('enterprise-ai');
    const row = matrix.filter(r => r.history === 'enterprise-ai');
    const ent = row.find(r => r.destination === 'enterprise-ai')!;
    expect(ent.score.overall).toBeGreaterThan(Math.max(...row.map(r => r.score.overall)) - 1.5);
  });

  it('Balanced is resilient without winning by default', () => {
    const b = auditRow(own('balanced'));
    expect(b.score.overall).toBeGreaterThan(70);
    expect(b.everInsolvent).toBe(false);
    expect(Object.values(best).filter(x => x.destination === 'balanced-marketplace').length).toBeLessThanOrEqual(2);
  });

  it('every destination is best for at least one supported history, without being made to win everywhere', () => {
    const winners = new Set(V2_DESTINATION_IDS.map(d => ['premium-builder', 'credential-builder', 'university100', 'consumer-ai', 'enterprise100', 'balanced']
      .some(h => bestOwn(h)[0].d === d) ? d : null).filter(Boolean));
    expect(winners.has('consumer-ai') && winners.has('enterprise-ai') && winners.has('premium-human-ai') && winners.has('university-infrastructure')).toBe(true);
  });
});

describe('Batch 4: long-horizon stability of the new mechanics (Q8, Q12, Q16, Q40)', () => {
  for (const id of ['premium-builder', 'credential-builder', 'balanced', 'consumer-ai', 'people100']) {
    it(`${id}: bounded, decelerating, identities hold for 40 quarters`, () => {
      const r = runArc(strat(id), 40);
      expect(r.passed).toBe(true);
      const rev = (q: number) => r.quarters[q - 1].record.consequence.ledger.revenue;
      const totalCapacity = 300 * 1.1 + 150 * 1.2 + 40 * 1.3 + 135 * 1.2; // generous upper bound incl. access uplifts
      for (const q of [8, 12, 16, 40]) {
        expect(Number.isFinite(rev(q))).toBe(true);
        expect(rev(q)).toBeLessThan(totalCapacity);
      }
      const late = (rev(40) / rev(36)) ** 0.25 - 1;
      expect(late).toBeLessThan(0.01);
      const c = r.finalState.commercial;
      expect(c.premiumValue).toBeLessThanOrEqual(100);
      expect(c.credentialNetwork).toBeLessThanOrEqual(100);
      expect(r.finalState.segmentRevenue.university).toBeLessThan(52);
    });
  }
});
