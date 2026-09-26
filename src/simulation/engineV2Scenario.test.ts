import { describe, it, expect } from 'vitest';
import {
  V2_SCENARIO_ARC,
  getScenarioMarket,
  getScenarioQuarter,
  scenarioCapacity,
  buildPlayerSignals,
  lastAuthoredQuarter,
  V2_ROLES,
  getScenarioContinuation,
  setScenarioContinuation,
} from './engineV2Scenario';
import { getNeutralMarket } from './engineV2Commercial';
import { getV2Baseline } from './engineV2';
import { runArc, runAllArcStrategies, ARC_STRATEGIES, companyView } from '../testlab/utils/v2ScenarioArc';
import { runV2IntegratedScenario, V2_COMMERCIAL_SCENARIOS } from '../testlab/utils/v2Diagnostics';
import scenarioSource from './engineV2Scenario.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;

describe('Scenario framework', () => {
  it('scenario module imports only V2 commercial types/market; never revenue, cost or V1', () => {
    const froms = [...scenarioSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    expect(froms.every(f => f === './engineV2Commercial')).toBe(true);
  });

  it('arc quarters are unique and ordered from Q1', () => {
    const qs = V2_SCENARIO_ARC.map(s => s.quarter);
    expect(qs[0]).toBe(1);
    expect(new Set(qs).size).toBe(qs.length);
  });

  it('player signals never expose truth references; KPIs are measured from company state and role-tagged', () => {
    const sig = buildPlayerSignals(1, companyView(getV2Baseline()));
    expect(sig.some(s => 'truthReference' in s)).toBe(false);
    const kpis = sig.filter(s => s.source === 'company-kpi');
    expect(kpis.every(s => s.reliability === 'measured')).toBe(true);
    expect(kpis.find(s => s.id === 'kpi-enterprise-pipeline')!.shownValue).toBe(80);
    const audiences = new Set(kpis.map(s => s.audience));
    for (const r of V2_ROLES) expect(audiences.has(r)).toBe(true);
  });

  it('quarters beyond the authored arc: default carries the last authored conditions; neutral mode available; structure persists', () => {
    const q = lastAuthoredQuarter() + 1;
    const last = getScenarioQuarter(lastAuthoredQuarter())!;
    expect(getScenarioContinuation()).toBe('carry-last');
    expect(getScenarioMarket(q).consumerDemand).toBe(last.demand.consumerDemand);
    expect(getScenarioMarket(q).segmentCapacity).toEqual(scenarioCapacity(lastAuthoredQuarter()));
    setScenarioContinuation('neutral');
    try {
      expect(getScenarioMarket(q).consumerDemand).toBe(1);
      expect(getScenarioMarket(q).segmentCapacity).toEqual(scenarioCapacity(lastAuthoredQuarter()));
    } finally {
      setScenarioContinuation('carry-last');
    }
  });
});

describe('Q1 — Capital allocation under uncertainty', () => {
  it('Q1 market is exactly the neutral competitive market (healthy, no favoured segment)', () => {
    expect(getScenarioMarket(1)).toEqual(getNeutralMarket());
    expect(getScenarioQuarter(1)!.structuralChanges).toEqual([]);
  });

  it('Q1 briefing covers every segment and competition without numeric hints that favour a segment', () => {
    const topics = new Set(getScenarioQuarter(1)!.signals.map(s => s.topic));
    for (const t of ['consumer', 'enterprise', 'ai-native', 'university', 'competition']) expect(topics.has(t as any)).toBe(true);
    expect(getScenarioQuarter(1)!.signals.every(s => s.shownValue === undefined)).toBe(true);
  });

  it('no Q1 winner: every baseline-state strategy ends Q1 within ±0.3% of $200M revenue', () => {
    for (const r of runAllArcStrategies(1).filter(r => !r.strategy.opening)) {
      const rev = r.quarters[0].record.consequence.ledger.revenue;
      expect(Math.abs(rev - 200) / 200, r.strategy.id).toBeLessThan(0.003);
    }
  });

  it('Q1 preserves Batch 1 economics exactly (arc Q1 = integrated competitive Q1)', () => {
    for (const id of ['cash100', 'consumer100', 'enterprise100', 'balanced']) {
      const arcL = runArc(strat(id), 1).quarters[0].record.consequence.ledger;
      const ref = runV2IntegratedScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === id)!, 'competitive', 1).quarters[0].consequence.ledger;
      expect(arcL).toEqual(ref);
    }
  });

  it('all 15 strategies pass every engine check in Q1', () => {
    for (const r of runAllArcStrategies(1)) expect(r.passed, r.strategy.id).toBe(true);
  });
});

// ============ Q2 ============
import { calculateV2QuarterConsequence, applyV2Consequence, V2Allocation, V2TeamState } from './engineV2';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});
/** One quarter from an identical opening state under a given scenario market (controlled comparison). */
function oneQuarter(opening: V2TeamState, q: number, marketQuarter: number, allocation = alloc({ cashReserve: 30 })) {
  return calculateV2QuarterConsequence(opening, {
    quarter: q, allocation, strategicEnvelope: 30, market: getScenarioMarket(marketQuarter), revenueSource: 'segment', costSource: 'modelled',
  });
}
/** A company state after Q1 under a given Q1 allocation. */
function afterQ1(a: V2Allocation, opening = getV2Baseline()) {
  return applyV2Consequence(opening, oneQuarter(opening, 1, 1, a));
}

describe('Q2 — Generative AI disruption', () => {
  const q2 = getScenarioQuarter(2)!;

  it('Q2 separates temporary demand, benchmark acceleration and structural market size', () => {
    expect(q2.demand.consumerDemand).toBeLessThan(1);
    expect(q2.demand.aiNativeDemand).toBeGreaterThan(1.5);
    expect(q2.competitorProgress.consumer).toBeGreaterThan(getNeutralMarket().competitorProgress.consumer);
    expect(q2.structuralChanges.map(c => c.field).sort()).toEqual(['aiNative', 'enterprise']);
    expect(scenarioCapacity(2).aiNative).toBe(150);
    expect(scenarioCapacity(2).consumer).toBe(getNeutralMarket().segmentCapacity.consumer); // not shrunk because demand fell
    expect(scenarioCapacity(1).aiNative).toBe(80);
  });

  it('structural changes persist after Q2 even when demand returns to neutral', () => {
    setScenarioContinuation('neutral');
    try {
      expect(getScenarioMarket(lastAuthoredQuarter() + 3).segmentCapacity.aiNative).toBe(150);
      expect(getScenarioMarket(lastAuthoredQuarter() + 3).aiNativeDemand).toBe(1);
    } finally {
      setScenarioContinuation('carry-last');
    }
  });

  it('the shock flows through market inputs only: identical state, Q2 vs Q1 market', () => {
    const s = afterQ1(alloc({ cashReserve: 30 }));
    const neutral = oneQuarter(s, 2, 1);
    const shock = oneQuarter(s, 2, 2);
    // same capability consequence and same strategic investment; only commercial/revenue/cost differ
    expect(shock.capability).toEqual(neutral.capability);
    expect(shock.ledger.strategicInvestment).toBe(neutral.ledger.strategicInvestment);
    // Consumer: demand/retention/CAC pressure
    expect(shock.commercial.closing.consumerRetention).toBeLessThan(neutral.commercial.closing.consumerRetention);
    expect(shock.commercial.closing.consumerCacIndex).toBeGreaterThan(neutral.commercial.closing.consumerCacIndex);
    expect(shock.revenue.closing.segments.consumer).toBeLessThan(neutral.revenue.closing.segments.consumer);
    // Enterprise opportunity improves
    expect(shock.commercial.closing.enterprisePipeline).toBeGreaterThan(neutral.commercial.closing.enterprisePipeline);
    // AI-native demand rises
    expect(shock.revenue.closing.segments.aiNative).toBeGreaterThan(neutral.revenue.closing.segments.aiNative);
    // University comparatively stable
    expect(Math.abs(shock.revenue.closing.segments.university - neutral.revenue.closing.segments.university)).toBeLessThan(0.01);
  });

  it('AI-enabled Consumer capability provides some defense against commoditization', () => {
    const b = getV2Baseline();
    const lowAi = b;
    const highAi = { ...b, capabilities: { ...b.capabilities, ai: 60, consumer: 75 } };
    const lowAiNoShock = { ...b, capabilities: { ...b.capabilities, consumer: 75 } };
    const dLow = oneQuarter(lowAiNoShock, 1, 2).commercial.closing.consumerRetention - oneQuarter(lowAiNoShock, 1, 1).commercial.closing.consumerRetention;
    const dHigh = oneQuarter(highAi, 1, 2).commercial.closing.consumerRetention - oneQuarter(highAi, 1, 1).commercial.closing.consumerRetention;
    expect(dLow).toBeLessThan(0);
    expect(dHigh).toBeLessThan(0);
    expect(dHigh).toBeGreaterThan(dLow); // smaller retention hit with AI readiness
    expect(lowAi).toBeDefined();
  });

  it('Enterprise AI interest only monetizes with capability: AI demand does not lift win rate without AI readiness', () => {
    const b = getV2Baseline();
    const shockNoAI = oneQuarter(b, 1, 2).commercial;
    const shockAI = oneQuarter({ ...b, capabilities: { ...b.capabilities, ai: 70, enterprise: 70, customerSuccess: 60 } }, 1, 2).commercial;
    const winTermNoAI = shockNoAI.indicators.find(i => i.indicator === 'enterpriseWinRate')!.marketContribution;
    const winTermAI = shockAI.indicators.find(i => i.indicator === 'enterpriseWinRate')!.marketContribution;
    expect(winTermAI).toBeGreaterThan(winTermNoAI);
  });

  it('AI-native: readiness/adoption constrain monetization of the demand surge', () => {
    const b = getV2Baseline();
    const low = oneQuarter(b, 1, 2).revenue.aiNative.newMonetization;
    const adopted = { ...b, commercial: { ...b.commercial, aiAdoptionIndex: 50 } };
    const high = oneQuarter(adopted, 1, 2).revenue.aiNative.newMonetization;
    expect(high).toBeGreaterThan(3 * low);
  });

  it('structural TAM expansion matters only once AI-native revenue is large', () => {
    const b = getV2Baseline();
    const big = { ...b, segmentRevenue: { ...b.segmentRevenue, aiNative: 60 }, commercial: { ...b.commercial, aiAdoptionIndex: 50 } };
    const withTam = oneQuarter(big, 1, 2).revenue.aiNative.headroom;
    const m1 = { ...getScenarioMarket(2), segmentCapacity: scenarioCapacity(1) };
    const withoutTam = calculateV2QuarterConsequence(big, { quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30, market: m1, revenueSource: 'segment', costSource: 'modelled' }).revenue.aiNative.headroom;
    expect(withTam).toBeGreaterThan(withoutTam);
    expect(oneQuarter(b, 1, 2).revenue.aiNative.headroom).toBe(1);
  });

  it('Q1–Q2 arc: all 15 strategies pass every check; Cash100 Q2 revenue falls < 2% (a shock, not a collapse)', () => {
    const runs = runAllArcStrategies(2);
    for (const r of runs) expect(r.passed, r.strategy.id).toBe(true);
    const cash = runs.find(r => r.strategy.id === 'cash100')!;
    const q2Rev = cash.quarters[1].record.consequence.ledger.revenue;
    expect(q2Rev).toBeLessThan(cash.quarters[0].record.consequence.ledger.revenue);
    expect(q2Rev).toBeGreaterThan(0.98 * 200);
  });
});

// ============ Q3 ============
describe('Q3 — Conflicting evidence', () => {
  const q3 = getScenarioQuarter(3)!;
  const q2 = getScenarioQuarter(2)!;
  const sig = (id: string) => q3.signals.find(s => s.id === id)!;

  it('no new giant shock: no structural change, and demand moves are smaller than Q2', () => {
    expect(q3.structuralChanges).toEqual([]);
    expect(scenarioCapacity(3)).toEqual(scenarioCapacity(2));
    expect(Math.abs(q3.demand.consumerDemand - 1)).toBeLessThan(Math.abs(q2.demand.consumerDemand - 1));
    expect(q3.competitorProgress.consumer).toBeLessThan(q2.competitorProgress.consumer);
  });

  it('signals diverge from truth: usage headline overstates paid consumer weakness', () => {
    const usage = sig('q3-consumer-usage');
    expect(usage.reliability).toBe('headline');
    expect(usage.shownValue!).toBeLessThan(-10);
    const truthPct = Math.round((q3.demand.consumerDemand - 1) * 1e6) / 1e4;
    expect(Math.abs(usage.shownValue!)).toBeGreaterThan(2 * Math.abs(truthPct));
    const cfo = sig('q3-consumer-paid-cohorts');
    expect(truthPct).toBeGreaterThanOrEqual(cfo.shownRange![0]);
    expect(truthPct).toBeLessThanOrEqual(cfo.shownRange![1]);
  });

  it('AI engagement rises while paying AI-native demand eases (engagement ≠ willingness to pay)', () => {
    expect(sig('q3-ai-engagement').shownValue!).toBeGreaterThan(0);
    expect(q3.demand.aiNativeDemand).toBeLessThan(q2.demand.aiNativeDemand);
    expect(sig('q3-ai-wtp').reliability).toBe('estimate');
    expect(sig('q3-ai-wtp').shownRange![1] - sig('q3-ai-wtp').shownRange![0]).toBeGreaterThanOrEqual(10);
  });

  it('enterprise strengthening is genuine and university renewals stay strong', () => {
    expect(q3.demand.enterpriseAIDemand).toBeGreaterThanOrEqual(q2.demand.enterpriseAIDemand);
    expect(q3.demand.enterpriseDemand).toBeGreaterThan(q2.demand.enterpriseDemand);
    expect(q3.demand.universityDemand).toBeGreaterThanOrEqual(1);
  });

  it('partial-information architecture: role-private signals for at least four roles', () => {
    const roles = new Set(q3.signals.filter(s => s.audience !== 'all').map(s => s.audience));
    expect(roles.size).toBeGreaterThanOrEqual(4);
  });

  it('controlled comparison (same state): Q3 market hurts Consumer less than Q2 and monetizes AI adoption less than Q2', () => {
    const s = afterQ1(alloc({ cashReserve: 30 }));
    const adopted = { ...s, commercial: { ...s.commercial, aiAdoptionIndex: 40 } };
    const c2 = oneQuarter(s, 2, 2).revenue.consumer.closing;
    const c3 = oneQuarter(s, 2, 3).revenue.consumer.closing;
    expect(c3).toBeGreaterThan(c2);
    expect(oneQuarter(adopted, 2, 3).revenue.aiNative.newMonetization).toBeLessThan(oneQuarter(adopted, 2, 2).revenue.aiNative.newMonetization);
  });

  it('Q1–Q3 arc: all 15 strategies pass every check; the disruption is material but not a collapse', () => {
    const runs = runAllArcStrategies(3);
    for (const r of runs) expect(r.passed, r.strategy.id).toBe(true);
    const cash = runs.find(r => r.strategy.id === 'cash100')!;
    const cons = cash.quarters[2].record.ending.segmentRevenue.consumer;
    expect(cons).toBeLessThan(0.98 * 140);
    expect(cons).toBeGreaterThan(0.94 * 140);
  });

  it('player policies can react to signals: the evidence-responsive policy changes allocation after the disruption', () => {
    const r = runArc(strat('evidence-responsive'), 3);
    expect(r.quarters[0].allocation).not.toEqual(r.quarters[1].allocation);
    expect(r.quarters[1].allocation.enterprise + r.quarters[1].allocation.aiProduct).toBeGreaterThan(r.quarters[0].allocation.enterprise + r.quarters[0].allocation.aiProduct);
  });
});
