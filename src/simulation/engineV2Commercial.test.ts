import { describe, it, expect } from 'vitest';
import {
  calculateV2CommercialConsequence,
  calculateAIReadiness,
  getNeutralMarket,
  V2_NEUTRAL_COMPETITOR_PROGRESS,
  V2CommercialCapabilityInput,
  V2CommercialState,
  V2MarketConditions,
} from './engineV2Commercial';
import { getV2Baseline, calculateV2QuarterConsequence, applyV2Consequence, V2Allocation, V2TeamState } from './engineV2';
import {
  V2_COMMERCIAL_SCENARIOS,
  runV2CommercialScenario,
  runAllV2CommercialScenarios,
  runV2Strategy,
} from '../testlab/utils/v2Diagnostics';
import { allocationStrategies } from '../testlab/utils/testPresets';
import engineV2CommercialSource from './engineV2Commercial.ts?raw';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});

const baseCompany = (): V2CommercialCapabilityInput => {
  const b = getV2Baseline();
  return { capabilities: { ...b.capabilities }, productQuality: b.productQuality, trust: b.trust };
};
const company = (caps: Partial<V2CommercialCapabilityInput['capabilities']> = {}, extra: { productQuality?: number; trust?: number } = {}) => {
  const c = baseCompany();
  return { ...c, ...extra, capabilities: { ...c.capabilities, ...caps } };
};
const openingCommercial = (): V2CommercialState => getV2Baseline().commercial;
const noCompetitors = (): V2MarketConditions => ({ ...getNeutralMarket(), competitorProgress: { consumer: 0, enterprise: 0, credential: 0 } });

/** Converged (steady-state) commercial value after many quarters with a fixed company/market. */
function steady(c: V2CommercialCapabilityInput, market: V2MarketConditions = noCompetitors(), quarters = 60): V2CommercialState {
  let s = openingCommercial();
  for (let q = 1; q <= quarters; q++) s = calculateV2CommercialConsequence(s, c, market, q).closing;
  return s;
}
const one = (c: V2CommercialCapabilityInput, market: V2MarketConditions = getNeutralMarket(), opening = openingCommercial()) =>
  calculateV2CommercialConsequence(opening, c, market, 1);

function run(opening: V2TeamState, a: V2Allocation, quarters: number, market?: V2MarketConditions) {
  let s = opening;
  const states: V2TeamState[] = [];
  for (let q = 1; q <= quarters; q++) {
    s = applyV2Consequence(s, calculateV2QuarterConsequence(s, { quarter: q, allocation: a, strategicEnvelope: 30, market }));
    states.push(s);
  }
  return states;
}
const scenario = (id: string) => runV2CommercialScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === id)!);
const at = (id: string, q: number) => scenario(id).quarters[q - 1].ending;

describe('Architecture', () => {
  it('commercial module imports only V2 types, never V1', () => {
    const froms = [...engineV2CommercialSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    expect(froms).toEqual(['./engineV2Capabilities']);
  });

  it('commercial layer never changes the financial ledger or capability consequence', () => {
    const b = getV2Baseline();
    const q = { quarter: 1, allocation: alloc({ consumer: 10, aiProduct: 10, enterprise: 10 }), strategicEnvelope: 30 };
    const neutral = calculateV2QuarterConsequence(b, q);
    const stressed = calculateV2QuarterConsequence(b, { ...q, market: { ...getNeutralMarket(), consumerDemand: 0.8, macroPressure: 1, consumerCommoditization: 1 } });
    expect(stressed.ledger).toEqual(neutral.ledger);
    expect(stressed.capability).toEqual(neutral.capability);
    expect(stressed.commercial.closing.consumerRetention).toBeLessThan(neutral.commercial.closing.consumerRetention);
  });
});

describe('Baseline stability', () => {
  it('neutral market with zero competitor progress is an exact fixed point for the starting company', () => {
    const start = openingCommercial();
    const s = steady(baseCompany(), noCompetitors(), 8);
    expect(s.consumerRetention).toBeCloseTo(85, 9);
    expect(s.consumerCacIndex).toBeCloseTo(100, 9);
    expect(s.enterprisePipeline).toBeCloseTo(80, 9);
    expect(s.enterpriseWinRate).toBeCloseTo(25, 9);
    expect(s.aiAdoptionIndex).toBeCloseTo(10, 9);
    expect(s.aiCommercialReadiness).toBeCloseTo(start.aiCommercialReadiness, 9);
    expect(s.universityPipeline).toBeCloseTo(24, 9);
    expect(s.universityRenewalRate).toBeCloseTo(90, 9);
    expect(s.pricingPower).toBeCloseTo(50, 9);
  });

  it('starting AI readiness is in the experimentation band (≈7.5)', () => {
    const r = calculateAIReadiness(baseCompany());
    expect(r.band).toBe('experimentation');
    expect(r.readiness).toBeGreaterThan(5);
    expect(r.readiness).toBeLessThan(10);
  });
});

describe('Bounds and clipping are reported, never hidden', () => {
  it('extreme strength clips at upper bounds and reports it', () => {
    const strong = company({ consumer: 100, enterprise: 100, ai: 100, talent: 100, credential: 100, customerSuccess: 100, execution: 100 }, { productQuality: 100, trust: 100 });
    const s = steady(strong);
    expect(s.consumerRetention).toBe(95);
    expect(s.enterpriseWinRate).toBe(45);
    expect(s.universityRenewalRate).toBe(97);
    const c = calculateV2CommercialConsequence(s, strong, noCompetitors(), 61);
    const ret = c.indicators.find(i => i.indicator === 'consumerRetention')!;
    expect(ret.clipped).toBe(true);
    expect(ret.unclipped).toBeGreaterThan(95);
    expect(ret.clipAmount).toBeLessThan(0);
  });

  it('extreme weakness clips at lower bounds', () => {
    const weak = company({ consumer: 0, enterprise: 0, ai: 0, talent: 0, credential: 0, customerSuccess: 0, execution: 0 }, { productQuality: 0, trust: 0 });
    const s = steady(weak);
    expect(s.consumerRetention).toBe(60);
    expect(s.enterpriseWinRate).toBe(10);
    expect(s.universityRenewalRate).toBe(75);
    expect(s.consumerCacIndex).toBeLessThanOrEqual(200);
    expect(s.consumerCacIndex).toBeGreaterThan(100);
    expect(s.enterprisePipeline).toBeGreaterThan(0);
  });
});

describe('Monotonic responses (all else equal)', () => {
  const grid = [20, 35, 50, 65, 80, 95];

  it('stronger Trust never reduces Consumer Retention, Win Rate, Renewal or Pricing Power', () => {
    for (const cons of [40, 70, 100]) {
      let prev: V2CommercialState | null = null;
      for (const trust of grid) {
        const s = steady(company({ consumer: cons }, { trust }));
        if (prev) {
          expect(s.consumerRetention).toBeGreaterThanOrEqual(prev.consumerRetention - 1e-9);
          expect(s.enterpriseWinRate).toBeGreaterThanOrEqual(prev.enterpriseWinRate - 1e-9);
          expect(s.universityRenewalRate).toBeGreaterThanOrEqual(prev.universityRenewalRate - 1e-9);
          expect(s.pricingPower).toBeGreaterThanOrEqual(prev.pricingPower - 1e-9);
        }
        prev = s;
      }
    }
  });

  it('stronger Customer Success never reduces Enterprise Win Rate or Pipeline', () => {
    for (const ent of [30, 60, 100]) {
      let prev: V2CommercialState | null = null;
      for (const cs of [0, 10, 20, 30, 45, 60, 80, 100]) {
        const s = steady(company({ enterprise: ent, customerSuccess: cs }));
        if (prev) {
          expect(s.enterpriseWinRate).toBeGreaterThanOrEqual(prev.enterpriseWinRate - 1e-9);
          expect(s.enterprisePipeline).toBeGreaterThanOrEqual(prev.enterprisePipeline - 1e-9);
        }
        prev = s;
      }
    }
  });

  it('stronger Product Quality / Talent / Execution never reduces AI readiness', () => {
    for (const ai of [10, 30, 45, 70, 100]) {
      for (const key of ['productQuality', 'talent', 'execution'] as const) {
        let prev = -Infinity;
        for (const v of [0, 20, 40, 55, 70, 85, 100]) {
          const c = key === 'productQuality' ? company({ ai }, { productQuality: v }) : company({ ai, [key]: v });
          const r = calculateAIReadiness(c).readiness;
          expect(r).toBeGreaterThanOrEqual(prev - 1e-12);
          prev = r;
        }
      }
    }
  });

  it('stronger Consumer Capability never raises CAC or lowers Retention', () => {
    let prev: V2CommercialState | null = null;
    for (const cons of [20, 40, 55, 70, 85, 100]) {
      const s = steady(company({ consumer: cons }));
      if (prev) {
        expect(s.consumerCacIndex).toBeLessThanOrEqual(prev.consumerCacIndex + 1e-9);
        expect(s.consumerRetention).toBeGreaterThanOrEqual(prev.consumerRetention - 1e-9);
      }
      prev = s;
    }
  });

  it('stronger Credential Capability never reduces University pipeline or renewal', () => {
    let prev: V2CommercialState | null = null;
    for (const cred of [20, 40, 60, 80, 100]) {
      const s = steady(company({ credential: cred }));
      if (prev) {
        expect(s.universityPipeline).toBeGreaterThanOrEqual(prev.universityPipeline - 1e-9);
        expect(s.universityRenewalRate).toBeGreaterThanOrEqual(prev.universityRenewalRate - 1e-9);
      }
      prev = s;
    }
  });
});

describe('Dependency constraints', () => {
  it('strong AI with weak support has lower readiness than identical AI with strong support', () => {
    for (const ai of [25, 40, 60, 100]) {
      const weak = calculateAIReadiness(company({ ai, talent: 30, execution: 30 }, { productQuality: 45 }));
      const strong = calculateAIReadiness(company({ ai, talent: 80, execution: 80 }, { productQuality: 85 }));
      expect(strong.capabilityOnlyScore).toBe(weak.capabilityOnlyScore);
      expect(weak.readiness).toBeLessThan(strong.readiness * 0.6);
    }
  });

  it('high Consumer Capability with weak Trust/PQ cannot reach excellent retention', () => {
    const weakSupport = steady(company({ consumer: 100 }, { trust: 45, productQuality: 45 }));
    const strongSupport = steady(company({ consumer: 100 }, { trust: 85, productQuality: 85 }));
    expect(weakSupport.consumerRetention).toBeLessThan(85);
    expect(strongSupport.consumerRetention).toBeGreaterThan(92);
  });
});

describe('Indicator memory', () => {
  it('a step change in capability moves indicators only part-way in one quarter', () => {
    const strong = company({ consumer: 100 });
    const target = steady(strong).consumerRetention;
    const q1 = one(strong, noCompetitors()).closing.consumerRetention;
    expect(q1 - 85).toBeGreaterThan(0);
    expect(q1 - 85).toBeLessThan(0.5 * (target - 85));
  });

  it('identical company, different opening indicators → different closing indicators', () => {
    const c = baseCompany();
    const a = one(c, getNeutralMarket(), { ...openingCommercial(), consumerRetention: 80, enterprisePipeline: 60 }).closing;
    const b = one(c, getNeutralMarket(), { ...openingCommercial(), consumerRetention: 90, enterprisePipeline: 100 }).closing;
    expect(b.consumerRetention).toBeGreaterThan(a.consumerRetention);
    expect(b.enterprisePipeline).toBeGreaterThan(a.enterprisePipeline);
  });

  it('one quarter of any real strategy moves Pricing Power by < 1 point; even an all-100 company moves < 5', () => {
    for (const r of runAllV2CommercialScenarios()) {
      const opening = r.quarters[0].opening.commercial.pricingPower;
      expect(Math.abs(r.quarters[0].ending.commercial.pricingPower - opening), r.scenario.id).toBeLessThan(1);
    }
    const strong = company({ consumer: 100, enterprise: 100, ai: 100, talent: 100, execution: 100 }, { productQuality: 100, trust: 100 });
    const pp = one(strong).closing.pricingPower;
    expect(pp - 50).toBeGreaterThan(0);
    expect(pp - 50).toBeLessThan(5);
  });
});

describe('Pipeline attrition (stock-flow)', () => {
  it('with no new qualified pipeline, Enterprise pipeline resolves 30%/quarter and University 20%/quarter', () => {
    const dead = { ...noCompetitors(), enterpriseDemand: 0, universityDemand: 0 };
    const c = one(baseCompany(), dead);
    expect(c.closing.enterprisePipeline).toBeCloseTo(56, 9);
    expect(c.closing.universityPipeline).toBeCloseTo(19.2, 9);
    const ent = c.indicators.find(i => i.indicator === 'enterprisePipeline')!;
    expect(ent.decayOrAttrition).toBeCloseTo(-24, 9);
  });

  it('pipeline = opening × (1 − resolution) + new qualified pipeline', () => {
    const c = one(company({ enterprise: 50 }));
    const ent = c.indicators.find(i => i.indicator === 'enterprisePipeline')!;
    const inflow = ent.baseInflow + ent.marketContribution + ent.capabilityContribution + ent.dependencyContribution;
    expect(ent.closing).toBeCloseTo(80 * 0.7 + inflow, 9);
  });

  it('$10M Enterprise programme visibly grows pipeline as capability matures (vs Cash)', () => {
    const b = getV2Baseline();
    const ent10 = run(b, alloc({ enterprise: 10, cashReserve: 20 }), 4);
    const cash = run(b, alloc({ cashReserve: 30 }), 4);
    expect(ent10[3].commercial.enterprisePipeline - cash[3].commercial.enterprisePipeline).toBeGreaterThan(10);
    expect(ent10[0].commercial.enterprisePipeline - cash[0].commercial.enterprisePipeline).toBeLessThan(3);
  });
});

describe('AI readiness continuity and adoption lag', () => {
  it('readiness changes continuously with AI Capability (no cliff at 20/35/50)', () => {
    let prev = calculateAIReadiness(company({ ai: 0 })).readiness;
    for (let ai = 0.05; ai <= 100; ai += 0.05) {
      const r = calculateAIReadiness(company({ ai })).readiness;
      expect(Math.abs(r - prev)).toBeLessThan(0.2);
      expect(r).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = r;
    }
  });

  it('bands are descriptive: experimentation <20, usable 20–34, credible 35–49, scalable 50+', () => {
    expect(calculateAIReadiness(company({ ai: 19.9 })).band).toBe('experimentation');
    expect(calculateAIReadiness(company({ ai: 20 })).band).toBe('usable features');
    expect(calculateAIReadiness(company({ ai: 35 })).band).toBe('commercially credible');
    expect(calculateAIReadiness(company({ ai: 50 })).band).toBe('scalable platform');
  });

  it('AI adoption lags readiness and builds over time', () => {
    const ai = scenario('ai100').quarters.map(q => q.ending.commercial);
    expect(ai[0].aiAdoptionIndex).toBeLessThan(12);
    for (let i = 1; i < 8; i++) expect(ai[i].aiAdoptionIndex).toBeGreaterThan(ai[i - 1].aiAdoptionIndex);
    expect(ai[3].aiAdoptionIndex).toBeLessThan(ai[3].aiCommercialReadiness * 0.7);
  });
});

describe('Synergies', () => {
  it('Consumer + AI achieves better retention than Consumer alone with the same Consumer spend', () => {
    const b = getV2Baseline();
    const withAi = run(b, alloc({ consumer: 15, aiProduct: 15 }), 8)[7].commercial;
    const withoutAi = run(b, alloc({ consumer: 15, cashReserve: 15 }), 8)[7].commercial;
    expect(withAi.consumerRetention - withoutAi.consumerRetention).toBeGreaterThan(1.5);
  });

  it('AI alone does not fix Consumer economics (AI100 vs Cash100 retention gap < 1 point)', () => {
    const gap = at('ai100', 8).commercial.consumerRetention - at('cash100', 8).commercial.consumerRetention;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(1);
  });

  it('Enterprise + AI improves Win Rate vs Enterprise alone with the same Enterprise spend', () => {
    const b = getV2Baseline();
    const withAi = run(b, alloc({ enterprise: 15, aiProduct: 15 }), 8)[7].commercial;
    const withoutAi = run(b, alloc({ enterprise: 15, cashReserve: 15 }), 8)[7].commercial;
    expect(withAi.enterpriseWinRate).toBeGreaterThan(withoutAi.enterpriseWinRate + 1);
    // Pipeline differs only through Phase 2B absorption (AI adds Transformation Load), not via AI synergy
    // AI adds Transformation Load, lowering absorption of the Enterprise and CS cohorts; still ≤ 2%.
    expect(Math.abs(withAi.enterprisePipeline - withoutAi.enterprisePipeline) / withoutAi.enterprisePipeline).toBeLessThan(0.02);
  });

  it('AI synergy acts through Win Rate, not pipeline (identical capabilities, different AI)', () => {
    const lowAi = steady(company({ enterprise: 80, ai: 10 }));
    const highAi = steady(company({ enterprise: 80, ai: 100 }));
    expect(highAi.enterprisePipeline).toBeCloseTo(lowAi.enterprisePipeline, 9);
    expect(highAi.enterpriseWinRate).toBeGreaterThan(lowAi.enterpriseWinRate);
  });
});

describe('Weak-support constraints', () => {
  it('Enterprise-heavy with weak CS: lower Win Rate and pipeline than normal CS; higher CS does better still', () => {
    const weak = at('enterprise-weak-cs', 8).commercial;
    const normal = at('enterprise100', 8).commercial;
    const strong = run({ ...getV2Baseline(), capabilities: { ...getV2Baseline().capabilities, customerSuccess: 60 } }, alloc({ enterprise: 30 }), 8)[7].commercial;
    expect(weak.enterpriseWinRate).toBeLessThan(normal.enterpriseWinRate);
    expect(normal.enterpriseWinRate).toBeLessThan(strong.enterpriseWinRate);
    expect(weak.enterprisePipeline).toBeLessThan(normal.enterprisePipeline);
    // High Enterprise capability with CS held low stays near the starting win rate, well below normal CS.
    // (CS is pinned to 15 at each quarter start; that quarter's matured CS tranche still lands before indicators are read.)
    expect(weak.enterpriseWinRate).toBeLessThan(26);
    expect(normal.enterpriseWinRate - weak.enterpriseWinRate).toBeGreaterThan(5);
  });

  it('University-heavy with weak Trust renews worse than a Cash100 company with normal Trust', () => {
    const weak = at('university-weak-trust', 8).commercial;
    expect(weak.universityRenewalRate).toBeLessThan(at('cash100', 8).commercial.universityRenewalRate);
    expect(weak.universityRenewalRate).toBeLessThan(at('university100', 8).commercial.universityRenewalRate - 5);
    expect(at('university-weak-trust', 8).capabilities.credential).toBe(100);
  });

  it('AI-heavy with weak Talent/Execution has lower readiness and adoption than AI100', () => {
    expect(at('ai-weak-org', 8).commercial.aiCommercialReadiness).toBeLessThan(at('ai100', 8).commercial.aiCommercialReadiness - 10);
    expect(at('ai-weak-org', 8).commercial.aiAdoptionIndex).toBeLessThan(at('ai100', 8).commercial.aiAdoptionIndex);
  });
});

describe('Cash100 neglect is gradual; focused strategies are not instantly dominant', () => {
  it('one quarter of Cash100 remains commercially viable (every indicator within 1% of start)', () => {
    const q1 = at('cash100', 1).commercial;
    const start = openingCommercial();
    for (const k of ['consumerRetention', 'consumerCacIndex', 'enterprisePipeline', 'enterpriseWinRate', 'aiAdoptionIndex', 'universityPipeline', 'universityRenewalRate', 'pricingPower'] as const) {
      expect(Math.abs(q1[k] - start[k]) / start[k]).toBeLessThan(0.01);
    }
  });

  it('sustained Cash100 gradually loses relative position', () => {
    const c = scenario('cash100').quarters.map(q => q.ending.commercial);
    for (let i = 1; i < 8; i++) {
      expect(c[i].consumerRetention).toBeLessThanOrEqual(c[i - 1].consumerRetention);
      expect(c[i].enterprisePipeline).toBeLessThanOrEqual(c[i - 1].enterprisePipeline);
    }
    expect(c[7].consumerRetention).toBeLessThan(c[0].consumerRetention);
    expect(c[7].consumerRetention).toBeGreaterThan(82); // gradual, not collapse
    expect(c[7].enterprisePipeline).toBeGreaterThan(60);
    const bal = at('balanced', 8).commercial;
    expect(c[7].consumerRetention).toBeLessThan(bal.consumerRetention);
    expect(c[7].enterprisePipeline).toBeLessThan(bal.enterprisePipeline);
  });

  it('Consumer100 / Enterprise100 / AI100 do not dominate after Q1', () => {
    expect(at('consumer100', 1).commercial.consumerRetention).toBeLessThan(86);
    expect(at('enterprise100', 1).commercial.enterprisePipeline).toBeLessThan(85);
    expect(at('ai100', 1).commercial.aiAdoptionIndex).toBeLessThan(11);
  });

  it('differentiated signals: each focused strategy leads its own domain but not the others', () => {
    const q8 = (id: string) => at(id, 8).commercial;
    expect(q8('consumer100').consumerCacIndex).toBeLessThan(q8('enterprise100').consumerCacIndex);
    expect(q8('consumer100').enterprisePipeline).toBeLessThan(q8('enterprise100').enterprisePipeline);
    expect(q8('enterprise100').aiCommercialReadiness).toBeLessThan(q8('ai100').aiCommercialReadiness);
    expect(q8('ai100').universityRenewalRate).toBeLessThan(q8('university100').universityRenewalRate);
    expect(q8('university100').consumerRetention).toBeLessThan(q8('consumer100').consumerRetention);
  });
});

describe('Market inputs are injectable without changing formulas', () => {
  it('weaker consumer demand / higher CAC pressure worsen consumer indicators', () => {
    const neutral = one(baseCompany()).closing;
    const stressed = one(baseCompany(), { ...getNeutralMarket(), consumerDemand: 0.9, consumerCacPressure: 1.2 }).closing;
    expect(stressed.consumerRetention).toBeLessThan(neutral.consumerRetention);
    expect(stressed.consumerCacIndex).toBeGreaterThan(neutral.consumerCacIndex);
  });

  it('macro pressure reduces enterprise pipeline inflow more than university inflow (relative)', () => {
    const neutral = one(baseCompany()).closing;
    const rec = one(baseCompany(), { ...getNeutralMarket(), macroPressure: 1 }).closing;
    const entDrop = (neutral.enterprisePipeline - rec.enterprisePipeline) / neutral.enterprisePipeline;
    const uniDrop = (neutral.universityPipeline - rec.universityPipeline) / neutral.universityPipeline;
    expect(entDrop).toBeGreaterThan(uniDrop);
    expect(uniDrop).toBeGreaterThan(0);
  });

  it('commoditization erodes Pricing Power; AI readiness partially shields retention', () => {
    const market = { ...getNeutralMarket(), consumerCommoditization: 1 };
    expect(one(baseCompany(), market).closing.pricingPower).toBeLessThan(one(baseCompany()).closing.pricingPower);
    const lowAi = steady(company({ consumer: 80 }), { ...market, competitorProgress: { consumer: 0, enterprise: 0, credential: 0 } });
    const highAi = steady(company({ consumer: 80, ai: 100 }), { ...market, competitorProgress: { consumer: 0, enterprise: 0, credential: 0 } });
    expect(highAi.consumerRetention).toBeGreaterThan(lowAi.consumerRetention);
  });
});

describe('Phase 2A accounting and Phase 2B maturation preserved', () => {
  it('all 12 calibration scenarios pass every ledger, capability and commercial check in every quarter', () => {
    for (const r of runAllV2CommercialScenarios()) {
      const failed = r.quarters.flatMap(q => q.checks.filter(c => !c.passed).map(c => `${r.scenario.id} Q${q.quarter} ${c.id}: ${c.details}`));
      expect(failed).toEqual([]);
    }
  });

  it('existing preset runs still pass all checks and Balanced still ends with $125M cash', () => {
    for (const s of Object.values(allocationStrategies)) expect(runV2Strategy(s, 'carried-forward').passed).toBe(true);
    expect(runV2Strategy(allocationStrategies['balanced'], 'carried-forward').finalState.cash).toBeCloseTo(125, 9);
  });

  it('Consumer $10M still matures 55 → 59.5 → 62.65 → 64 with commercial layer active', () => {
    const s = run(getV2Baseline(), alloc({ consumer: 10, cashReserve: 20 }), 1);
    const s2 = applyV2Consequence(s[0], calculateV2QuarterConsequence(s[0], { quarter: 2, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 }));
    const s3 = applyV2Consequence(s2, calculateV2QuarterConsequence(s2, { quarter: 3, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 }));
    expect([s[0].capabilities.consumer, s2.capabilities.consumer, s3.capabilities.consumer]).toEqual([59.5, expect.closeTo(62.65, 12), expect.closeTo(64, 12)]);
  });
});

describe('Phase 2C patch: weak-CS scenario stays weak; CS develops otherwise', () => {
  it('weak-CS scenario keeps CS pinned at 15 in every quarter', () => {
    for (const q of scenario('enterprise-weak-cs').quarters) {
      expect(q.opening.capabilities.customerSuccess).toBe(15);
    }
  });

  it('Enterprise100 develops CS gradually from 30', () => {
    const cs = scenario('enterprise100').quarters.map(q => q.ending.capabilities.customerSuccess);
    expect(cs[0]).toBeGreaterThan(30);
    expect(cs[0]).toBeLessThan(32);
    for (let i = 1; i < 8; i++) expect(cs[i]).toBeGreaterThan(cs[i - 1]);
  });
});

describe('Phase 2C patch: competitor progress is a named, injectable market parameter', () => {
  it('neutral market uses the named Draft 1 values (Consumer 0.75, Enterprise 0.75, Credential 0.50)', () => {
    expect(getNeutralMarket().competitorProgress).toEqual({ consumer: 0.75, enterprise: 0.75, credential: 0.5 });
    expect(getNeutralMarket().competitorProgress).toEqual({ ...V2_NEUTRAL_COMPETITOR_PROGRESS });
    expect(Object.isFrozen(V2_NEUTRAL_COMPETITOR_PROGRESS)).toBe(true);
  });

  it('absolute capability never depends on competitor progress; relative position does', () => {
    const b = getV2Baseline();
    const fast = { ...getNeutralMarket(), competitorProgress: { consumer: 1.5, enterprise: 1.5, credential: 1.0 } };
    const neutral = run(b, alloc({ cashReserve: 30 }), 8);
    const faster = run(b, alloc({ cashReserve: 30 }), 8, fast);
    const stopped = run(b, alloc({ cashReserve: 30 }), 8, noCompetitors());
    expect(faster[7].capabilities).toEqual(neutral[7].capabilities);
    expect(stopped[7].capabilities).toEqual(neutral[7].capabilities);
    expect(faster[7].commercial.consumerRetention).toBeLessThan(neutral[7].commercial.consumerRetention);
    expect(neutral[7].commercial.consumerRetention).toBeLessThan(stopped[7].commercial.consumerRetention);
    expect(faster[7].commercial.enterprisePipeline).toBeLessThan(neutral[7].commercial.enterprisePipeline);
    expect(faster[7].commercial.competitorBenchmarks.consumer).toBeCloseTo(55 + 8 * 1.5, 9);
  });

  it('stopped competitor progress keeps the starting company commercially stable', () => {
    const s = run(getV2Baseline(), alloc({ cashReserve: 30 }), 8, noCompetitors())[7].commercial;
    expect(s.consumerRetention).toBeCloseTo(85, 9);
    expect(s.enterprisePipeline).toBeCloseTo(80, 9);
    expect(s.enterpriseWinRate).toBeCloseTo(25, 9);
    expect(s.universityRenewalRate).toBeCloseTo(90, 9);
    expect(s.competitorBenchmarks).toEqual({ consumer: 55, enterprise: 30, credential: 40 });
  });
});
