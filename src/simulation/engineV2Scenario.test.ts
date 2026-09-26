import { describe, it, expect } from 'vitest';
import {
  V2_SCENARIO_ARC,
  getScenarioMarket,
  getScenarioQuarter,
  scenarioCapacity,
  buildPlayerSignals,
  lastAuthoredQuarter,
  V2_ROLES,
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

  it('quarters beyond the authored arc continue with neutral demand and persisting structural capacity', () => {
    const q = lastAuthoredQuarter() + 1;
    const m = getScenarioMarket(q);
    expect(m.consumerDemand).toBe(1);
    expect(m.segmentCapacity).toEqual(scenarioCapacity(lastAuthoredQuarter()));
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
