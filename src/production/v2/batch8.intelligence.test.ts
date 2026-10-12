/**
 * Batch 8 · Stages 2 & 3 — executive scorecards, awards and the simulated share price.
 * The frozen engine is used unchanged; these modules only read recorded state.
 */
import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, a, liquidityPolicy } from '../../testlab/utils/v2ScenarioArc';
import { arcInputs, inputsOf } from './testing/arcGames';
import { replayInputs } from './adapter';
import { gameHistory, startingCompany } from './insights/history';
import {
  valuationSeries, valuationFromStates, roundedBridge, factorScores, VALUATION_CONFIG, STARTING_PRICE, FACTOR_IDS, strategicFit,
} from './insights/valuation';
import {
  allScorecards, buildScorecard, computeAwards, EXECUTIVE_METRICS, EXECUTIVE_WEIGHTS, SCORECARD_ROLES, metricScore, companyComponent,
} from './insights/executive';
import { scoreV2Company } from '../../simulation/engineV2Scoring';
import type { V2TeamState } from '../../simulation/engineV2';

const STRATS = ARC_STRATEGIES.filter(s => !s.opening);
const games = Object.fromEntries(STRATS.map(st => [st.id, gameHistory(replayInputs(arcInputs(st)))]));
const refuse = (id: string, alloc: ReturnType<typeof a>, dest: 'premium-human-ai' | 'enterprise-ai') =>
  gameHistory(replayInputs(inputsOf(runArc({ id, name: id, description: '', allocate: () => alloc, destination: () => dest, policy: { liquidity: liquidityPolicy('refuse') } }, 8))));
const distressed = refuse('people-refuse', a({ people: 30 }), 'premium-human-ai');

describe('valuation — determinism, start and reconciliation', () => {
  it('starts at $100 at Q4 2022 for every team', () => {
    for (const h of Object.values(games)) expect(valuationSeries(h).points[0].price).toBe(STARTING_PRICE);
  });
  it('is deterministic and replayable (same inputs → identical price path)', () => {
    for (const st of STRATS.slice(0, 5)) {
      const p1 = valuationSeries(gameHistory(replayInputs(arcInputs(st)))).points.map(p => p.price);
      const p2 = valuationSeries(gameHistory(replayInputs(arcInputs(st)))).points.map(p => p.price);
      expect(p1).toEqual(p2);
    }
  });
  it('the valuation bridge reconciles exactly to each quarter’s change, also when rounded for display', () => {
    for (const h of [...Object.values(games), distressed]) {
      for (const p of valuationSeries(h).points.slice(1)) {
        const sum = p.bridge.reduce((t, b) => t + b.amount, 0);
        expect(Math.abs(sum - p.change)).toBeLessThan(1e-9);
        const r = roundedBridge(p);
        expect(Math.round(r.lines.reduce((t, l) => t + l.shown, 0) * 100)).toBe(Math.round(r.total * 100));
      }
    }
  });
  it('quarterly moves are bounded by the volatility limit', () => {
    for (const h of [...Object.values(games), distressed]) {
      for (const p of valuationSeries(h).points.slice(1)) expect(Math.abs(p.changePct)).toBeLessThanOrEqual(VALUATION_CONFIG.quarterlyCap + 1e-9);
    }
  });
  it('never modifies engine state or the terminal score', () => {
    const h = games['balanced'];
    const before = JSON.stringify(h[7].after);
    const score = scoreV2Company(h[7].after).overall;
    valuationSeries(h); allScorecards(h);
    expect(JSON.stringify(h[7].after)).toBe(before);
    expect(scoreV2Company(h[7].after).overall).toBe(score);
    expect(h[7].after.stockPrice).toBe(100); // the frozen engine field is untouched and unused
  });
});

describe('valuation — calibration behaviour', () => {
  const price8 = (id: string) => valuationSeries(games[id]).points[8].price;
  it('does not reward cash hoarding', () => {
    expect(price8('cash100')).toBeLessThan(STARTING_PRICE);
    for (const id of ['balanced', 'consumer-ai', 'enterprise-ai', 'premium-builder']) expect(price8(id)).toBeGreaterThan(price8('cash100'));
    const s = { ...games['cash100'][7].after };
    const f1 = factorScores(s).financial;
    const f2 = factorScores({ ...s, cash: s.cash + 200 } as V2TeamState).financial;
    expect(f2).toBe(f1); // cash above the comfort level earns nothing
  });
  it('penalises financial distress', () => {
    const p = valuationSeries(distressed).points;
    expect(p[8].price).toBeLessThan(price8('people100'));
    expect(p.some(x => x.distress > 0)).toBe(true);
    expect(p[8].bridge.find(b => b.id === 'distress')).toBeTruthy();
  });
  it('revenue decline lowers the growth factor; margin improvement raises profitability', () => {
    const s = startingCompany();
    expect(factorScores({ ...s, revenue: 180 } as V2TeamState).growth).toBeLessThan(factorScores(s).growth);
    expect(factorScores({ ...s, operatingProfit: 45 } as V2TeamState).profitability).toBeGreaterThan(factorScores(s).profitability);
  });
  it('readiness without commercial traction earns at most half the readiness factor', () => {
    const s = startingCompany();
    const caps = Object.fromEntries(Object.keys(s.capabilities).map(k => [k, 100])) as unknown as V2TeamState['capabilities'];
    const noTraction = { ...s, capabilities: caps, commercial: { ...s.commercial, enterprisePipeline: 0, aiAdoptionIndex: 0, universityPipeline: 0, enterpriseWinRate: 10 } } as V2TeamState;
    expect(factorScores(noTraction).readiness).toBeCloseTo(0.5, 6);
  });
  it('does not reward AI investment mechanically: AI capability only counts where the strategy relies on it', () => {
    const s = games['consumer100'][7].after; // committed to Consumer AI (aligned: consumer + AI)
    const univ = { ...s, destination: { ...s.destination!, id: 'university-infrastructure' } } as V2TeamState;
    const boosted = { ...univ, capabilities: { ...univ.capabilities, ai: 100 } } as V2TeamState;
    expect(strategicFit(boosted)).toBe(strategicFit(univ));
  });
  it('growth with weak retention is valued below growth with strong retention', () => {
    const s = games['consumer-ai'][7].after;
    const weak = { ...s, commercial: { ...s.commercial, consumerRetention: 75, universityRenewalRate: 80 } } as V2TeamState;
    const v = valuationFromStates([...games['consumer-ai'].slice(0, 7).map(h => h.after), weak]);
    expect(v.points[8].fairValue).toBeLessThan(valuationSeries(games['consumer-ai']).points[8].fairValue);
  });
  it('sensitivity: a 10% change in any weight moves no team’s Q8 price by more than 6%', () => {
    for (const k of FACTOR_IDS) {
      const cfg = { ...VALUATION_CONFIG, weights: { ...VALUATION_CONFIG.weights, [k]: VALUATION_CONFIG.weights[k] * 1.1 } };
      for (const h of Object.values(games)) {
        const base = valuationSeries(h).points[8].price;
        expect(Math.abs(valuationSeries(h, cfg).points[8].price / base - 1)).toBeLessThan(0.06);
      }
    }
  });
  it('the weights are the documented starting weights', () => {
    expect(VALUATION_CONFIG.weights).toEqual({ growth: 0.25, profitability: 0.25, readiness: 0.20, retention: 0.15, financial: 0.15 });
    expect(Object.values(VALUATION_CONFIG.weights).reduce((t, w) => t + w, 0)).toBeCloseTo(1, 9);
  });
});

describe('executive scorecards', () => {
  it('five scorecards from engine metrics, each metric in exactly one scorecard', () => {
    const ids = EXECUTIVE_METRICS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const role of SCORECARD_ROLES) {
      const ms = EXECUTIVE_METRICS.filter(m => m.role === role);
      expect(ms.length).toBeGreaterThanOrEqual(4);
      expect(ms.reduce((t, m) => t + m.weight, 0)).toBeCloseTo(1, 9);
    }
  });
  it('60% functional + 40% company', () => {
    expect(EXECUTIVE_WEIGHTS).toEqual({ functional: 0.6, company: 0.4 });
    for (const c of allScorecards(games['balanced'])) expect(c.executive).toBeCloseTo(0.6 * c.functional + 0.4 * c.company, 9);
  });
  it('the starting position scores 50 on change metrics', () => {
    const h = games['balanced'];
    const ctx = { states: [startingCompany(), ...h.map(r => r.after)], records: h, t: 0 };
    for (const m of EXECUTIVE_METRICS.filter(m => m.norm.kind === 'change')) expect(metricScore(m, ctx, 0)).toBe(50);
  });
  it('rows show start, previous, current, change and interpretation without NaN', () => {
    for (const c of allScorecards(games['aggressive'])) {
      for (const r of c.rows) {
        expect(`${r.start}${r.previous}${r.current}${r.change}${r.interpretation}`).not.toMatch(/NaN|undefined|Infinity/);
        expect(r.score === null || (r.score >= 0 && r.score <= 100)).toBe(true);
      }
    }
  });
  it('cash hoarding scores below active strategies for every role’s executive score on average', () => {
    const avg = (id: string) => allScorecards(games[id]).reduce((t, c) => t + c.executive, 0) / 5;
    for (const id of ['balanced', 'consumer-ai', 'premium-builder', 'evidence-responsive']) expect(avg(id)).toBeGreaterThan(avg('cash100'));
  });
  it('idle capacity is not rewarded (load far below the sustainable range scores below the range)', () => {
    const sc = buildScorecard(games['cash100'], 'People');
    expect(sc.rows.find(r => r.id === 'cpeo-load')!.score!).toBeLessThan(100);
  });
  it('company component maps $0 → 0, $100 → 50, $200 → 100', () => {
    expect(companyComponent(0)).toBe(0); expect(companyComponent(100)).toBe(50); expect(companyComponent(200)).toBe(100); expect(companyComponent(400)).toBe(100);
  });
  it('scorecards are available for any completed quarter and are deterministic', () => {
    const h = games['balanced'];
    for (let t = 1; t <= 8; t++) {
      const a1 = allScorecards(h.slice(0, t), t).map(c => c.executive);
      const a2 = allScorecards(h.slice(0, t), t).map(c => c.executive);
      expect(a1).toEqual(a2);
    }
  });
});

describe('awards', () => {
  const teams = (ids: string[]) => ids.map(id => ({ teamId: id, teamName: id, records: games[id] }));
  it('are withheld with fewer than three teams', () => {
    const r = computeAwards(teams(['balanced', 'cash100']));
    expect(r.available).toBe(false);
    expect(r.reason).toMatch(/3 teams/);
  });
  it('are withheld until every team has completed four quarters', () => {
    const r = computeAwards([...teams(['balanced', 'cash100']), { teamId: 'x', teamName: 'x', records: games['consumer-ai'].slice(0, 3) }]);
    expect(r.available).toBe(false);
  });
  it('compare teams at the same quarter and name the role, not a student', () => {
    const r = computeAwards(teams(['balanced', 'cash100', 'consumer-ai', 'conservative']));
    expect(r.available).toBe(true);
    expect(r.awards.map(x => x.id)).toEqual(['CEO', 'CFO', 'Product', 'Growth', 'People', 'team']);
    expect(r.awards.find(x => x.id === 'team')!.winners).not.toContain('cash100');
    for (const aw of r.awards) expect(aw.winners.length).toBeGreaterThan(0);
  });
  it('exclude teams that became insolvent', () => {
    const r = computeAwards([...teams(['balanced', 'cash100', 'consumer-ai']), { teamId: 'd', teamName: 'distressed', records: distressed }]);
    const insolvent = distressed[distressed.length - 1].after.solvency.everInsolvent;
    if (insolvent) expect(r.excluded.map(e => e.teamName)).toContain('distressed');
    for (const aw of r.awards) if (insolvent) expect(aw.winners).not.toContain('distressed');
  });
  it('share an award when the lead is under one point', () => {
    const r = computeAwards([...teams(['balanced', 'cash100']), { teamId: 'b2', teamName: 'balanced-twin', records: games['balanced'] }]);
    for (const aw of r.awards) if (aw.winners.includes('balanced')) expect(aw.winners).toContain('balanced-twin');
  });
});
