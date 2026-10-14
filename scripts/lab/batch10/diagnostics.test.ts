/**
 * Batch 10 — targeted diagnostics on the FROZEN V2 engine (analysis only; nothing in src/ changes).
 * Each experiment emulates a proposed V3 mechanism with existing V2 inputs where that is possible, so results describe
 * verified V2 behaviour or V2-emulated proposals — never a V3 engine.
 *
 *   LAB_WRITE=1 npx vitest run scripts/lab/batch10/diagnostics.test.ts  →  docs/batch10/diagnostics.json
 */
import { it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { a, type V2ArcStrategy } from '../../../src/testlab/utils/v2ScenarioArc';
import { labRun, type RunResult } from '../batch9/runner';
import { LAB_STRATEGIES, EXTRA_STRATEGIES } from '../batch9/strategies';
import { SCENARIOS, summarize } from '../batch9/experiments';
import { valuationFromStates, FACTOR_IDS, VALUATION_CONFIG } from '../../../src/production/v2/insights/valuation';
import type { V2MarketConditions } from '../../../src/simulation/engineV2Commercial';
declare const process: { env: Record<string, string | undefined> };

const S = (id: string) => [...LAB_STRATEGIES, ...EXTRA_STRATEGIES].find(s => s.strategy.id === id)!.strategy;
const mk = (id: string, alloc: Parameters<typeof a>[0], dest: string): V2ArcStrategy => ({ id, name: id, description: '', allocate: () => a(alloc), destination: () => dest });
const cum = (r: RunResult, n = 8) => r.quarters.slice(0, n).reduce((t, x) => t + x.operatingProfit, 0);

/** D1 · AI marginal return by market scenario (is AI attractive because of the market or the formula?). */
function d1() {
  const base = { consumer: 3, enterprise: 3, aiProduct: 3, people: 3, universityCredentials: 3, cashReserve: 15 };
  const out: Record<string, unknown>[] = [];
  for (const sc of SCENARIOS) for (const b of ['aiProduct', 'consumer', 'enterprise', 'people', 'universityCredentials'] as const) {
    const run = (alloc: typeof base) => labRun({ id: 'm', strategy: mk('m', alloc, 'balanced-marketplace'), scenario: sc.id, market: sc.fn, withExec: false, policy: { opportunity: () => false } });
    const r0 = run(base); const r1 = run({ ...base, [b]: base[b] + 10, cashReserve: 5 });
    out.push({ scenario: sc.id, bucket: b, dRev8: r1.quarters[7].revenue - r0.quarters[7].revenue, dCumOP8: cum(r1) - cum(r0), dPrice8: r1.quarters[7].price - r0.quarters[7].price, dAiNative8: r1.quarters[7].aiNative - r0.quarters[7].aiNative });
  }
  // AI-native revenue path under AI-only: how the flow accumulates
  const ai = labRun({ id: 'ai-only', strategy: S('ai-only'), withExec: false });
  const path = ai.run.quarters.map(h => ({ q: h.quarter, aiNative: h.record.ending.segmentRevenue.aiNative, adoption: h.record.ending.commercial.aiAdoptionIndex, readiness: h.record.ending.commercial.aiCommercialReadiness, newMonetization: (h.record.consequence as unknown as { revenue: { aiNative: { newMonetization: number; churn: number } } }).revenue.aiNative.newMonetization, churn: (h.record.consequence as unknown as { revenue: { aiNative: { churn: number } } }).revenue.aiNative.churn }));
  return { marginal: out, aiOnlyPath: path };
}

/** D2 · Why a deep workforce reduction raises the share price: factor-by-factor decomposition at Q8. */
function d2() {
  const out: Record<string, unknown>[] = [];
  for (const id of ['consumer-only', 'university-led', 'enterprise-led', 'ai-led']) {
    const runs = { none: labRun({ id, strategy: S(id), withExec: false, policy: { recession: () => ({ actions: {} }) } }), deep: labRun({ id, strategy: S(id), withExec: false, policy: { recession: () => ({ actions: { workforceReduction: { depth: 'deep' } } }) } }) };
    const v = Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, valuationFromStates(r.run.quarters.map(h => h.record.ending))]));
    for (const q of [6, 7, 8]) {
      const fn = v.none.points[q].factors, fd = v.deep.points[q].factors;
      const contrib = Object.fromEntries(FACTOR_IDS.map(f => [f, 100 * VALUATION_CONFIG.multiplier * VALUATION_CONFIG.weights[f] * (fd[f] - fn[f])]));
      out.push({ id, q, priceNone: v.none.points[q].price, priceDeep: v.deep.points[q].price, factorContribution: contrib,
        cultureNone: runs.none.quarters[q - 1].culture, cultureDeep: runs.deep.quarters[q - 1].culture, talentNone: runs.none.quarters[q - 1].cap.talent, talentDeep: runs.deep.quarters[q - 1].cap.talent,
        execNone: runs.none.quarters[q - 1].cap.execution, execDeep: runs.deep.quarters[q - 1].cap.execution, revNone: runs.none.quarters[q - 1].revenue, revDeep: runs.deep.quarters[q - 1].revenue, opNone: runs.none.quarters[q - 1].operatingProfit, opDeep: runs.deep.quarters[q - 1].operatingProfit });
    }
    // horizon: does the deep cut still pay at Q12?
    const n12 = labRun({ id, strategy: S(id), withExec: false, quarters: 12, policy: { recession: () => ({ actions: {} }) } });
    const d12 = labRun({ id, strategy: S(id), withExec: false, quarters: 12, policy: { recession: () => ({ actions: { workforceReduction: { depth: 'deep' } } }) } });
    out.push({ id, q: 12, priceNone: n12.quarters[11].price, priceDeep: d12.quarters[11].price, revNone: n12.quarters[11].revenue, revDeep: d12.quarters[11].revenue, cultureNone: n12.quarters[11].culture, cultureDeep: d12.quarters[11].culture, cumOPNone: cum(n12, 12), cumOPDeep: cum(d12, 12) });
  }
  return out;
}

/** D3 · What People investment buys: same lead investment with $10M People vs $10M held in reserve. */
function d3() {
  const pairs: [string, Parameters<typeof a>[0], Parameters<typeof a>[0], string][] = [
    ['AI $20M', { aiProduct: 20, people: 10 }, { aiProduct: 20, cashReserve: 10 }, 'premium-human-ai'],
    ['Consumer $20M', { consumer: 20, people: 10 }, { consumer: 20, cashReserve: 10 }, 'consumer-ai'],
    ['Enterprise $20M', { enterprise: 20, people: 10 }, { enterprise: 20, cashReserve: 10 }, 'enterprise-ai'],
    ['Diversified $24M', { consumer: 8, enterprise: 8, aiProduct: 8, people: 6 }, { consumer: 8, enterprise: 8, aiProduct: 8, cashReserve: 6 }, 'balanced-marketplace'],
  ];
  const out: Record<string, unknown>[] = [];
  for (const [label, withP, without, dest] of pairs) for (const [variant, alloc] of [['with People', withP], ['without People', without]] as const) {
    const r = labRun({ id: label, strategy: mk(label, alloc, dest), withExec: true });
    const caps = r.run.quarters.map(h => h.record.consequence.capability);
    const absorptionLoss = caps.reduce((t, c) => t + c.targets.reduce((u, x) => u + x.absorptionLoss, 0), 0);
    const maxLoad = Math.max(...r.quarters.map(x => x.loadRatio));
    const sm = summarize(r);
    out.push({ label, variant, absorptionLoss, maxLoad, culture8: sm.culture8, org8: sm.org8, talent8: sm.talentCap, crisisSeverity: r.run.quarters[6].crisisAssessment?.severity ?? null, rev8: sm.rev8, cumOP: sm.cumOP, cash8: sm.cash8, price8: sm.price8, terminal: sm.terminal, tOrg: sm.tOrg, peopleExec: sm.exec?.People ?? null, finalOption: sm.finalOption });
  }
  return out;
}

/** D4 · Contract as a claim on the envelope, emulated: accept and move the upfront cost out of that quarter's investment. */
function d4() {
  const out: Record<string, unknown>[] = [];
  for (const id of ['enterprise-led', 'enterprise-ai-pair', 'enterprise-ai-people', 'diversified', 'adaptive', 'consumer-led', 'ai-led']) {
    const st = S(id);
    const decline = labRun({ id, strategy: st, withExec: false, policy: { opportunity: () => false } });
    const accept = labRun({ id, strategy: st, withExec: false, policy: { opportunity: () => true } });
    const upfront = accept.run.quarters[4].record.consequence.ledger.eventCosts;
    // Claim: Q5 investment reduced pro rata by the upfront cost (moved to reserve); the event cost remains, so total Q5 outflow = $30M.
    const claim = labRun({ id, strategy: { ...st, allocate: ctx => { const p = st.allocate(ctx); if (ctx.quarter !== 5) return p; const inv = p.consumer + p.enterprise + p.aiProduct + p.people + p.universityCredentials; const cut = Math.min(upfront, inv); const f = inv > 0 ? 1 - cut / inv : 1; return { consumer: p.consumer * f, enterprise: p.enterprise * f, aiProduct: p.aiProduct * f, people: p.people * f, universityCredentials: p.universityCredentials * f, cashReserve: p.cashReserve + cut }; } }, withExec: false, policy: { opportunity: () => true } });
    for (const [k, r] of [['decline', decline], ['accept (V2: cash only)', accept], ['accept, upfront claims envelope (emulated)', claim]] as const) {
      const sm = summarize(r); const q5 = r.run.quarters[4].record.consequence.ledger;
      out.push({ id, choice: k, upfront, q5Investment: q5.strategicInvestment, q5Outflow: q5.strategicInvestment + q5.eventCosts, rev8: sm.rev8, ent8: sm.seg8.enterprise, cumOP: sm.cumOP, netCash8: sm.netCash8, price8: sm.price8, terminal: sm.terminal, financing: sm.financingRaised });
    }
  }
  return out;
}

/** D5 · Capability ceilings: quarter the strategy's main capability saturates and how much matured gain was wasted. */
function d5() {
  return [...LAB_STRATEGIES, ...EXTRA_STRATEGIES].map(s => {
    const r = labRun({ id: s.strategy.id, strategy: s.strategy, withExec: false });
    let firstWasteQ: number | null = null; let wasted = 0; let invested = 0; let absorption = 0;
    for (const h of r.run.quarters) {
      const w = h.record.consequence.capability.targets.reduce((t, x) => t + x.wastedSaturation, 0);
      absorption += h.record.consequence.capability.targets.reduce((t, x) => t + x.absorptionLoss, 0);
      if (w > 0.05 && firstWasteQ === null) firstWasteQ = h.quarter;
      wasted += w; invested += h.record.consequence.ledger.strategicInvestment;
    }
    return { id: s.strategy.id, firstWasteQ, wastedPoints: wasted, absorptionLossPoints: absorption, invested };
  });
}

/** D6 · Recession: "freeze and move People to reserve" (proposed always-feasible freeze) for People strategies. */
function d6() {
  const out: Record<string, unknown>[] = [];
  for (const id of ['consumer-led', 'enterprise-led', 'ai-led', 'university-led', 'adaptive']) {
    const st = S(id);
    const variants: [string, Parameters<typeof labRun>[0]['policy']][] = [
      ['protect (no action)', { recession: () => ({ actions: {} }) }],
      ['slow ($10M to reserve)', { recession: (_c, p) => { const inv = p.consumer + p.enterprise + p.aiProduct + p.people + p.universityCredentials; const f = 1 - Math.min(10, inv) / inv; return { actions: {}, allocation: { consumer: p.consumer * f, enterprise: p.enterprise * f, aiProduct: p.aiProduct * f, people: p.people * f, universityCredentials: p.universityCredentials * f, cashReserve: p.cashReserve + Math.min(10, inv) } }; } }],
      ['freeze + People to reserve (proposed)', { recession: (_c, p) => ({ actions: { hiringFreeze: true }, allocation: { ...p, people: 0, cashReserve: p.cashReserve + p.people } }) }],
      ['targeted cut (protect R&D)', { recession: () => ({ actions: { workforceReduction: { depth: 'targeted', protectRnD: true } } }) }],
      ['deep cut', { recession: () => ({ actions: { workforceReduction: { depth: 'deep' } } }) }],
    ];
    for (const [k, pol] of variants) {
      const sm = summarize(labRun({ id, strategy: st, withExec: true, policy: pol }));
      out.push({ id, response: k, cash8: sm.cash8, rev8: sm.rev8, cumOP: sm.cumOP, price8: sm.price8, terminal: sm.terminal, tOrg: sm.tOrg, culture8: sm.culture8, talent8: sm.talentCap, peopleExec: sm.exec?.People ?? null, cfoExec: sm.exec?.CFO ?? null });
    }
  }
  return out;
}

/** D7 · University: is the constraint conversion, timing or market size? (market-size emulated through capacity). */
function d7() {
  const out: Record<string, unknown>[] = [];
  const caps: [string, ((q: number, m: V2MarketConditions) => V2MarketConditions) | undefined][] = [
    ['authored (capacity $40M)', undefined],
    ['capacity $80M', (_q, m) => ({ ...m, segmentCapacity: { ...m.segmentCapacity, university: 80 } })],
    ['capacity $80M + demand ×1.3', (q, m) => ({ ...m, universityDemand: q >= 2 ? m.universityDemand * 1.3 : m.universityDemand, segmentCapacity: { ...m.segmentCapacity, university: 80 } })],
  ];
  for (const id of ['university-led', 'university-only', 'consumer-led']) for (const [label, fn] of caps) {
    const r = labRun({ id, strategy: S(id), withExec: false, market: fn, scenario: label, quarters: 12 });
    out.push({ id, market: label, uni4: r.quarters[3].university, uni8: r.quarters[7].university, uni12: r.quarters[11].university, price8: r.quarters[7].price, credential8: r.quarters[7].cap.credential });
  }
  return out;
}

it.skipIf(!process.env.LAB_WRITE)('Batch 10 diagnostics', () => {
  const res = { generated: new Date().toISOString(), engine: 'V2 frozen (no diff vs 003f697)', d1: d1(), d2: d2(), d3: d3(), d4: d4(), d5: d5(), d6: d6(), d7: d7() };
  mkdirSync('docs/batch10', { recursive: true });
  writeFileSync('docs/batch10/diagnostics.json', JSON.stringify(res, null, 1));
  expect(res.d4.length).toBeGreaterThan(0);
}, 600_000);
