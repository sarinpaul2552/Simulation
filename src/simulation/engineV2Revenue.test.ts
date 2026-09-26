import { describe, it, expect } from 'vitest';
import {
  calculateV2RevenueConsequence,
  getV2RevenueBaseline,
  enterpriseRenewalRate,
  aiNewMonetization,
  aiQualityExecutionFactor,
  V2RevenueState,
  V2RevenueConsequence,
} from './engineV2Revenue';
import {
  calculateV2CommercialConsequence,
  getNeutralMarket,
  V2CommercialConsequence,
  V2CommercialState,
  V2MarketConditions,
} from './engineV2Commercial';
import { getV2Baseline, calculateV2QuarterConsequence, applyV2Consequence, V2Allocation } from './engineV2';
import { V2_COMMERCIAL_SCENARIOS, runV2RevenueScenario, runAllV2RevenueScenarios, V2RevenueMarketCase } from '../testlab/utils/v2Diagnostics';
import engineV2RevenueSource from './engineV2Revenue.ts?raw';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});
const staticMarket = (): V2MarketConditions => ({ ...getNeutralMarket(), competitorProgress: { consumer: 0, enterprise: 0, credential: 0 } });
const company = () => {
  const b = getV2Baseline();
  return { capabilities: { ...b.capabilities }, productQuality: b.productQuality, trust: b.trust };
};

/** A real Phase 2C consequence for the starting company, with optional overrides of closing indicators. */
function commercial(overrides: Partial<V2CommercialState> = {}, pipelineOpening?: { enterprise?: number; university?: number }): {
  opening: V2CommercialState;
  cons: V2CommercialConsequence;
} {
  const opening = getV2Baseline().commercial;
  const base = calculateV2CommercialConsequence(opening, company(), staticMarket(), 1);
  const indicators = base.indicators.map(i => {
    if (i.indicator === 'enterprisePipeline' && pipelineOpening?.enterprise !== undefined) {
      return { ...i, opening: pipelineOpening.enterprise, decayOrAttrition: -0.3 * pipelineOpening.enterprise };
    }
    if (i.indicator === 'universityPipeline' && pipelineOpening?.university !== undefined) {
      return { ...i, opening: pipelineOpening.university, decayOrAttrition: -0.2 * pipelineOpening.university };
    }
    return i;
  });
  return { opening, cons: { ...base, indicators, closing: { ...base.closing, ...overrides } } };
}

function rev(overrides: Partial<V2CommercialState> = {}, opts: { state?: V2RevenueState; market?: V2MarketConditions; co?: ReturnType<typeof company>; quarter?: number; pipe?: { enterprise?: number; university?: number } } = {}): V2RevenueConsequence {
  const { opening, cons } = commercial(overrides, opts.pipe);
  return calculateV2RevenueConsequence(opts.state ?? getV2RevenueBaseline(), opening, cons, opts.co ?? company(), opts.market ?? staticMarket(), opts.quarter ?? 1);
}

const scenario = (id: string, mc: V2RevenueMarketCase = 'competitive') =>
  runV2RevenueScenario(V2_COMMERCIAL_SCENARIOS.find(s => s.id === id)!, mc);
const total = (id: string, q: number, mc: V2RevenueMarketCase = 'competitive') => scenario(id, mc).quarters[q - 1].consequence.revenue.totalRevenue;

describe('Architecture', () => {
  it('revenue module imports only V2 types and never reads AI Capability or investment', () => {
    const froms = [...engineV2RevenueSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    expect(froms.sort()).toEqual(['./engineV2Capabilities', './engineV2Commercial', './engineV2Effects']);
    expect(engineV2RevenueSource).not.toMatch(/capabilities\.ai\b/);
    expect(engineV2RevenueSource).not.toMatch(/allocation|strategicInvestment/);
  });
});

describe('Static baseline is revenue-stable (exact fixed point)', () => {
  it('Cash100 under a static neutral market holds $140 / $40 / $16 / $4 = $200M every quarter', () => {
    for (const q of scenario('cash100', 'static-neutral').quarters) {
      const s = q.ending.segmentRevenue;
      expect(s.consumer).toBeCloseTo(140, 9);
      expect(s.enterprise).toBeCloseTo(40, 9);
      expect(s.university).toBeCloseTo(16, 9);
      expect(s.aiNative).toBeCloseTo(4, 9);
      expect(q.consequence.ledger.revenue).toBeCloseTo(200, 9);
    }
  });

  it('baseline flows balance: churn = replacement in every segment', () => {
    const r = rev();
    expect(r.consumer.churn).toBeCloseTo(6.3, 9);
    expect(r.consumer.acquisition).toBeCloseTo(6.3, 9);
    expect(r.enterprise.churn).toBeCloseTo(1.5, 9);
    expect(r.enterprise.liveFromEarlierBookings).toBeCloseTo(1.5, 9);
    expect(r.university.churn).toBeCloseTo(0.4, 9);
    expect(r.university.liveFromEarlierWins).toBeCloseTo(0.4, 9);
    expect(r.aiNative.churn).toBeCloseTo(0.4, 9);
    expect(r.aiNative.newMonetization).toBeCloseTo(0.4, 9);
  });
});

describe('Consumer economics', () => {
  it('higher retention never reduces Consumer revenue (all else equal)', () => {
    let prev = -Infinity;
    for (const ret of [60, 70, 80, 85, 90, 95]) {
      const c = rev({ consumerRetention: ret }).consumer.closing;
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it('worse CAC never improves acquisition revenue', () => {
    let prev = Infinity;
    for (const cac of [50, 75, 100, 125, 150, 200]) {
      const a = rev({ consumerCacIndex: cac }).consumer.acquisition;
      expect(a).toBeLessThanOrEqual(prev);
      prev = a;
    }
  });

  it('only the exposed 30% of the base is subject to churn in a quarter', () => {
    const r = rev({ consumerRetention: 60 });
    expect(r.consumer.exposedBase).toBeCloseTo(42, 9);
    expect(r.consumer.churn).toBeCloseTo(42 * 0.4, 9);
    expect(r.consumer.churn).toBeLessThan(0.15 * 140);
  });

  it('Pricing Power moves revenue modestly (+5 points ≈ +1% of retained base)', () => {
    const r = rev({ pricingPower: 55 });
    expect(r.consumer.priceMix / r.consumer.retained).toBeCloseTo(0.01, 9);
  });
});

describe('Enterprise economics', () => {
  it('pipeline itself is never counted as revenue (closing pipeline has no effect this quarter)', () => {
    const a = rev({ enterprisePipeline: 80 });
    const b = rev({ enterprisePipeline: 500 });
    expect(b.enterprise.closing).toBe(a.enterprise.closing);
    expect(b.enterprise.bookingsACV).toBe(a.enterprise.bookingsACV);
  });

  it('higher Win Rate never reduces bookings', () => {
    let prev = -Infinity;
    for (const w of [10, 20, 25, 30, 40, 45]) {
      const b = rev({ enterpriseWinRate: w }).enterprise.bookingsACV;
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });

  it('bookings are recognized over multiple quarters: 0% in the booking quarter, then 25/50/25', () => {
    // Q1 has a booking spike (win rate 45% on a $200M opening pipeline); later quarters return to baseline.
    let state = getV2RevenueBaseline();
    const spike = rev({ enterpriseWinRate: 45 }, { state, pipe: { enterprise: 200 }, quarter: 1 });
    const cohort = spike.closing.enterpriseBacklog.find(c => c.id === 'E-Q1')!;
    expect(spike.enterprise.liveFromCurrentBookings).toBe(0);
    expect(cohort.runRate).toBeCloseTo(200 * 0.3 * 0.45 * 0.25, 9);
    expect(cohort.liveToDate).toBe(0);
    state = spike.closing;
    const live: number[] = [];
    for (let q = 2; q <= 5; q++) {
      const r = rev({}, { state, quarter: q });
      const c = [...r.closing.enterpriseBacklog].find(k => k.id === 'E-Q1');
      live.push(c ? c.liveToDate : cohort.runRate); // a fully-live cohort leaves the backlog
      state = r.closing;
    }
    expect(live[0]).toBeCloseTo(cohort.runRate * 0.25, 9);
    expect(live[1]).toBeCloseTo(cohort.runRate * 0.75, 9);
    expect(live[2]).toBeCloseTo(cohort.runRate, 9); // fully live (cohort leaves backlog)
  });

  it('Enterprise investment → pipeline first → revenue later; Enterprise100 does not outperform Consumer100 early', () => {
    const ent = scenario('enterprise100');
    expect(ent.quarters[0].ending.commercial.enterprisePipeline).toBeGreaterThan(80);
    expect(ent.quarters[0].ending.segmentRevenue.enterprise).toBeCloseTo(40, 1);
    expect(ent.quarters[7].ending.segmentRevenue.enterprise).toBeGreaterThan(45);
    for (let q = 1; q <= 4; q++) expect(total('enterprise100', q)).toBeLessThan(total('consumer100', q));
  });

  it('weak Customer Success reduces Enterprise revenue, with the gap widening over time', () => {
    const weak = scenario('enterprise-weak-cs').quarters.map(q => q.ending.segmentRevenue.enterprise);
    const normal = scenario('enterprise100').quarters.map(q => q.ending.segmentRevenue.enterprise);
    expect(normal[7] - weak[7]).toBeGreaterThan(5);
    expect(normal[7] - weak[7]).toBeGreaterThan(normal[3] - weak[3]);
  });

  it('stronger CS / Trust never lower the renewal rate; macro pressure lowers it', () => {
    const m = getNeutralMarket();
    let prev = -Infinity;
    for (const cs of [0, 15, 30, 60, 100]) {
      const c = company(); c.capabilities.customerSuccess = cs;
      const r = enterpriseRenewalRate(c, m);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
    expect(enterpriseRenewalRate(company(), { ...m, macroPressure: 1 })).toBeLessThan(enterpriseRenewalRate(company(), m));
  });
});

describe('University economics', () => {
  it('higher University renewal never reduces University revenue', () => {
    let prev = -Infinity;
    for (const r of [75, 80, 85, 90, 95, 97]) {
      const u = rev({ universityRenewalRate: r }).university.closing;
      expect(u).toBeGreaterThanOrEqual(prev);
      prev = u;
    }
  });

  it('University wins convert more slowly than Enterprise bookings', () => {
    let state = getV2RevenueBaseline();
    const q1 = rev({ enterpriseWinRate: 45 }, { state, pipe: { enterprise: 200, university: 200 }, quarter: 1 });
    const entRate = q1.closing.enterpriseBacklog.find(c => c.id === 'E-Q1')!.runRate;
    const uniRate = q1.closing.universityBacklog.find(c => c.id === 'U-Q1')!.runRate;
    state = q1.closing;
    const shareLive = { ent: [] as number[], uni: [] as number[] };
    for (let q = 2; q <= 4; q++) {
      const r = rev({}, { state, quarter: q });
      const e = r.closing.enterpriseBacklog.find(c => c.id === 'E-Q1');
      const u = r.closing.universityBacklog.find(c => c.id === 'U-Q1');
      shareLive.ent.push(e ? e.liveToDate / entRate : 1);
      shareLive.uni.push(u ? u.liveToDate / uniRate : 1);
      state = r.closing;
    }
    expect(shareLive.uni[0]).toBe(0); // nothing live one quarter after the win
    for (let i = 0; i < 3; i++) expect(shareLive.uni[i]).toBeLessThan(shareLive.ent[i]);
  });

  it('University100 is resilient but not explosive (Q8 growth < 15%)', () => {
    const u = scenario('university100').quarters[7].ending.segmentRevenue.university;
    expect(u).toBeGreaterThan(16);
    expect(u).toBeLessThan(16 * 1.15);
  });
});

describe('AI-native economics', () => {
  it('adoption and readiness improvements never reduce AI monetization or AI revenue', () => {
    let prev = -Infinity;
    for (const adoption of [0, 5, 10, 20, 40, 60, 80, 100]) {
      const m = aiNewMonetization(adoption, 1, 1);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
    let prevRev = -Infinity;
    for (const readiness of [0, 10, 30, 50, 70, 90]) {
      const r = rev({ aiCommercialReadiness: readiness }).aiNative.closing;
      expect(r).toBeGreaterThanOrEqual(prevRev);
      prevRev = r;
    }
  });

  it('AI Capability alone cannot create AI revenue (same commercial state, AI Capability 10 vs 100)', () => {
    const low = company();
    const high = company(); high.capabilities.ai = 100;
    expect(rev({}, { co: high }).aiNative.closing).toBe(rev({}, { co: low }).aiNative.closing);
  });

  it('weak Talent/Execution materially constrains AI revenue (Q8 < 70% of AI100)', () => {
    const strong = scenario('ai100').quarters[7].ending.segmentRevenue.aiNative;
    const weak = scenario('ai-weak-org').quarters[7].ending.segmentRevenue.aiNative;
    expect(weak).toBeLessThan(0.7 * strong);
    expect(aiQualityExecutionFactor(70, 35)).toBeLessThan(aiQualityExecutionFactor(70, 60));
  });

  it('AI payoff is delayed: AI-native < $5M in Q1–Q2, but grows faster than any other segment late', () => {
    const ai = scenario('ai100').quarters.map(q => q.ending.segmentRevenue.aiNative);
    expect(ai[0]).toBeLessThan(5);
    expect(ai[1]).toBeLessThan(5);
    const lateAiGrowth = ai[7] - ai[6];
    const cons = scenario('consumer100').quarters.map(q => q.ending.segmentRevenue.consumer);
    expect(lateAiGrowth).toBeGreaterThan(cons[7] - cons[6]);
  });
});

describe('Strategy behaviour (competitive market)', () => {
  it('Cash100 does not collapse: each quarter declines < 1% and Q8 total > $190M', () => {
    const t = scenario('cash100').quarters.map(q => q.consequence.revenue.totalRevenue);
    let prev = 200;
    for (const x of t) {
      expect(x).toBeLessThanOrEqual(prev + 1e-9);
      expect((prev - x) / prev).toBeLessThan(0.01);
      prev = x;
    }
    expect(t[7]).toBeGreaterThan(190);
  });

  it('Cash100 has the strongest early liquidity', () => {
    const cash = scenario('cash100').quarters[0].ending.cash;
    for (const s of V2_COMMERCIAL_SCENARIOS.filter(x => x.id !== 'cash100')) {
      expect(cash).toBeGreaterThan(runV2RevenueScenario(s, 'competitive').quarters[0].ending.cash);
    }
  });

  it('People100 gets no artificial direct revenue: Q1 ≈ Cash100, Q8 within 5% of Cash100 and below every market-facing focus', () => {
    expect(Math.abs(total('people100', 1) - total('cash100', 1))).toBeLessThan(0.2);
    expect(total('people100', 8)).toBeLessThan(total('cash100', 8) * 1.05);
    for (const id of ['consumer100', 'ai100', 'enterprise100', 'balanced', 'consumer-ai']) {
      expect(total('people100', 8)).toBeLessThan(total(id, 8));
    }
  });

  it('complementarity emerges without a synergy multiplier: Consumer+AI > Consumer100 and > AI100 at Q8', () => {
    expect(total('consumer-ai', 8)).toBeGreaterThan(total('consumer100', 8));
    expect(total('consumer-ai', 8)).toBeGreaterThan(total('ai100', 8));
  });

  it('ordinary strategies stay inside the $180–330M diagnostic band at Q8 (warning band, not a target)', () => {
    for (const r of runAllV2RevenueScenarios('competitive')) {
      const t = r.quarters[7].consequence.revenue.totalRevenue;
      expect(t, r.scenario.id).toBeGreaterThan(180);
      expect(t, r.scenario.id).toBeLessThan(330);
    }
  });

  it('competitive market is never better than static neutral for Cash100', () => {
    for (let q = 1; q <= 8; q++) expect(total('cash100', q, 'competitive')).toBeLessThanOrEqual(total('cash100', q, 'static-neutral') + 1e-9);
  });
});

describe('Accounting integration and invariants', () => {
  it('all 12 strategies × 2 markets pass every ledger, capability, commercial and revenue check in every quarter', () => {
    for (const mc of ['competitive', 'static-neutral'] as const) {
      for (const r of runAllV2RevenueScenarios(mc)) {
        const failed = r.quarters.flatMap(q => q.checks.filter(c => !c.passed).map(c => `${mc} ${r.scenario.id} Q${q.quarter} ${c.id}: ${c.details}`));
        expect(failed).toEqual([]);
      }
    }
  });

  it('segment revenues sum exactly to ledger revenue; revenue feeds Operating Profit; cash identity holds exactly', () => {
    const r = scenario('balanced');
    for (const q of r.quarters) {
      const s = q.consequence.revenue.closing.segments;
      const L = q.consequence.ledger;
      expect(L.revenue).toBe(s.consumer + s.enterprise + s.university + s.aiNative);
      expect(L.operatingProfit).toBe(L.revenue - L.operatingCost);
      expect(L.closingCash).toBe(L.openingCash + L.operatingProfit - L.strategicInvestment - L.eventCosts + L.financing);
      expect(L.operatingCost).toBe(170);
      expect(L.operatingInputsSource).toBe('segment');
    }
  });

  it("'hold' mode (default) is unchanged: ledger revenue carried forward even though segments are computed", () => {
    const b = getV2Baseline();
    const c = calculateV2QuarterConsequence(b, { quarter: 1, allocation: alloc({ consumer: 30 }), strategicEnvelope: 30 });
    expect(c.revenueSource).toBe('hold');
    expect(c.ledger.revenue).toBe(200);
    expect(c.ledger.operatingInputsSource).toBe('carried-forward');
    expect(c.revenue.totalRevenue).toBeGreaterThan(0);
  });

  it("'segment' mode rejects injected revenue and honours operatingCostOverride", () => {
    const b = getV2Baseline();
    expect(() => calculateV2QuarterConsequence(b, {
      quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30, revenueSource: 'segment',
      operatingInputs: { revenue: 999, operatingCost: 170 },
    })).toThrow(/endogenous/);
    const c = calculateV2QuarterConsequence(b, {
      quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30, revenueSource: 'segment', operatingCostOverride: 180,
    });
    expect(c.ledger.operatingCost).toBe(180);
    expect(c.ledger.operatingProfit).toBeCloseTo(c.revenue.totalRevenue - 180, 9);
  });

  it('no NaN/Infinity/negative revenue under extreme adverse and favourable inputs for many quarters', () => {
    const extremes: [Partial<V2CommercialState>, V2MarketConditions][] = [
      [{ consumerRetention: 60, consumerCacIndex: 200, enterpriseWinRate: 10, universityRenewalRate: 75, aiAdoptionIndex: 0, aiCommercialReadiness: 0, pricingPower: 0 },
        { ...staticMarket(), consumerDemand: 0, aiNativeDemand: 0, macroPressure: 1 }],
      [{ consumerRetention: 95, consumerCacIndex: 50, enterpriseWinRate: 45, universityRenewalRate: 97, aiAdoptionIndex: 100, aiCommercialReadiness: 100, pricingPower: 100 },
        { ...staticMarket(), consumerDemand: 2, aiNativeDemand: 2 }],
    ];
    for (const [ov, market] of extremes) {
      let state = getV2RevenueBaseline();
      for (let q = 1; q <= 40; q++) {
        const r = rev(ov, { state, market, quarter: q, pipe: { enterprise: 80, university: 24 } });
        for (const v of Object.values(r.closing.segments)) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
        state = r.closing;
      }
    }
  });

  it('revenue engine is deterministic', () => {
    const a = scenario('balanced').quarters[7].ending;
    const b = scenario('balanced').quarters[7].ending;
    expect(JSON.stringify(a.segmentRevenue)).toBe(JSON.stringify(b.segmentRevenue));
    expect(JSON.stringify(a.enterpriseBacklog)).toBe(JSON.stringify(b.enterpriseBacklog));
  });

  it('Phase 2B maturation unaffected by segment mode (Consumer $10M: 55 → 59.5)', () => {
    const s = applyV2Consequence(getV2Baseline(), calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 10, cashReserve: 20 }), strategicEnvelope: 30, revenueSource: 'segment',
    }));
    expect(s.capabilities.consumer).toBe(59.5);
  });
});
