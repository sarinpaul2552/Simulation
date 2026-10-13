/**
 * Batch 9 experiment definitions. Each function returns plain data (no file I/O) so tests can assert on it and the
 * writer can serialize it for the workbook.
 */
import { a, type V2ArcStrategy } from '../../../src/testlab/utils/v2ScenarioArc';
import { V2_DESTINATION_IDS, type V2DestinationId } from '../../../src/simulation/engineV2Destination';
import type { V2MarketConditions } from '../../../src/simulation/engineV2Commercial';
import { getV2Baseline, validateV2Allocation } from '../../../src/simulation/engineV2';
import { labRun, MIXES, withCalibration, openingFor, capacityScaler, type RunResult, type MixMode } from './runner';
import { LAB_STRATEGIES, EXTRA_STRATEGIES, type LabStrategy } from './strategies';
import { runArc } from '../../../src/testlab/utils/v2ScenarioArc';

// ───────────────────────────── market scenarios (sensitivity) ─────────────────────────────

type MarketFn = (q: number, m: V2MarketConditions) => V2MarketConditions;
const clamp0 = (x: number) => Math.max(0, x);
export const SCENARIOS: { id: string; label: string; description: string; fn?: MarketFn }[] = [
  { id: 'authored', label: 'Authored arc', description: 'The production scenario: AI disruption from Q2, Q5 contract, Q6 recession, Q7 crisis, Q8 final decision.' },
  { id: 'consumer-weak', label: 'Consumer weaker', description: 'Consumer demand ×0.9 and commoditization +0.15 from Q2.', fn: (q, m) => q < 2 ? m : { ...m, consumerDemand: m.consumerDemand * 0.9, consumerCommoditization: m.consumerCommoditization + 0.15 } },
  { id: 'consumer-strong', label: 'Consumer stronger', description: 'Consumer demand ×1.1, commoditization halved and CAC pressure −0.1 from Q2.', fn: (q, m) => q < 2 ? m : { ...m, consumerDemand: m.consumerDemand * 1.1, consumerCommoditization: m.consumerCommoditization * 0.5, consumerCacPressure: Math.max(0.9, m.consumerCacPressure - 0.1) } },
  { id: 'enterprise-boom', label: 'Enterprise boom', description: 'Enterprise demand ×1.2 and enterprise AI demand ×1.15 from Q2.', fn: (q, m) => q < 2 ? m : { ...m, enterpriseDemand: m.enterpriseDemand * 1.2, enterpriseAIDemand: m.enterpriseAIDemand * 1.15 } },
  { id: 'enterprise-slump', label: 'Enterprise slump', description: 'Enterprise demand ×0.85 and enterprise AI demand ×0.9 from Q2.', fn: (q, m) => q < 2 ? m : { ...m, enterpriseDemand: m.enterpriseDemand * 0.85, enterpriseAIDemand: m.enterpriseAIDemand * 0.9 } },
  { id: 'ai-boom', label: 'AI boom', description: 'AI-native demand ×1.3 and enterprise AI demand ×1.1 from Q2.', fn: (q, m) => q < 2 ? m : { ...m, aiNativeDemand: m.aiNativeDemand * 1.3, enterpriseAIDemand: m.enterpriseAIDemand * 1.1 } },
  { id: 'university-boom', label: 'University boom', description: 'University demand ×1.25 from Q2.', fn: (q, m) => q < 2 ? m : { ...m, universityDemand: m.universityDemand * 1.25 } },
  { id: 'no-disruption', label: 'No AI disruption', description: 'From Q2: consumer demand +0.1 (max 1, the recession dip remains), commoditization 0, CAC pressure 1; AI-native and enterprise AI demand 1 (capacities as authored).', fn: (q, m) => q < 2 ? m : { ...m, consumerDemand: Math.min(1, m.consumerDemand + 0.1), consumerCommoditization: 0, consumerCacPressure: 1, aiNativeDemand: 1, enterpriseAIDemand: 1 } },
  { id: 'severe-recession', label: 'Severe recession', description: 'Macro pressure 1.0 / 0.8 / 0.4 in Q6–Q8 and all segment demand ×0.9 in Q6–Q7.', fn: (q, m) => q < 6 ? m : { ...m, macroPressure: q === 6 ? 1 : q === 7 ? 0.8 : 0.4, ...(q <= 7 ? { consumerDemand: m.consumerDemand * 0.9, enterpriseDemand: m.enterpriseDemand * 0.9, universityDemand: m.universityDemand * 0.9, aiNativeDemand: m.aiNativeDemand * 0.9 } : {}) } },
  { id: 'no-recession', label: 'No recession', description: 'Q6–Q8 macro pressure 0.1 and demand held at Q5 levels (the Q6 response decision still occurs).', fn: (q, m) => q < 6 ? m : { ...m, macroPressure: 0.1, consumerDemand: 0.98, enterpriseDemand: 1.12, enterpriseAIDemand: 1.45, universityDemand: 1.02, aiNativeDemand: 1.4 } },
];
void clamp0;

// ───────────────────────────── summaries ─────────────────────────────

export interface Summary {
  id: string; label: string; family: string; mix: string; scenario: string; destination: string | null;
  rev2: number; rev4: number; rev8: number; op8: number; cumOP: number; cash8: number; debt8: number; netCash8: number; price2: number; price4: number; price8: number;
  terminal: number; tFin: number; tStr: number; tOrg: number; band: string; execTeam: number | null; exec: Record<string, number> | null;
  culture8: number; org8: number; capGain: number; consumerCap: number; enterpriseCap: number; aiCap: number; credentialCap: number; talentCap: number;
  everInsolvent: boolean; distressedQ: number; minCash: number; financingRaised: number; equity: number; ownership: number;
  finalOption: string | null; contract: boolean | null; recession: string; crisis: string | null; priceFromOwnStart: number; gates: string;
  seg8: { consumer: number; enterprise: number; university: number; aiNative: number };
}

export function summarize(r: RunResult): Summary {
  const Q = (n: number) => r.quarters[n - 1];
  const f = r.final; const l = Q(r.quarters.length);
  return {
    id: r.id, label: r.label, family: r.family, mix: r.mix, scenario: r.scenario, destination: r.destination,
    rev2: Q(2).revenue, rev4: Q(4).revenue, rev8: Q(8).revenue, op8: Q(8).operatingProfit, cumOP: r.quarters.slice(0, 8).reduce((t, x) => t + x.operatingProfit, 0),
    cash8: Q(8).cash, debt8: Q(8).debt, netCash8: Q(8).cash - Q(8).debt, price2: Q(2).price, price4: Q(4).price, price8: Q(8).price,
    terminal: f.terminal, tFin: f.terminalFinancial, tStr: f.terminalStrategic, tOrg: f.terminalOrganizational, band: f.band, execTeam: f.execTeam, exec: f.exec,
    culture8: Q(8).culture, org8: Q(8).orgCapacity, capGain: f.capabilityGain, consumerCap: l.cap.consumer, enterpriseCap: l.cap.enterprise, aiCap: l.cap.ai, credentialCap: l.cap.credential, talentCap: l.cap.talent,
    everInsolvent: f.everInsolvent, distressedQ: f.distressedQuarters, minCash: f.minCash, financingRaised: f.financingRaised, equity: f.equityRaised, ownership: f.ownership,
    finalOption: f.finalOption, contract: f.contractAccepted, recession: f.recessionActions, crisis: f.crisisResponse, priceFromOwnStart: f.priceFromOwnStart, gates: f.gates,
    seg8: { consumer: Q(8).consumer, enterprise: Q(8).enterprise, university: Q(8).university, aiNative: Q(8).aiNative },
  };
}

const ALL = (): LabStrategy[] => [...LAB_STRATEGIES, ...EXTRA_STRATEGIES];

// ───────────────────────────── E1 core + E2 destination sweep ─────────────────────────────

export function coreRuns(): RunResult[] {
  return ALL().map(s => labRun({ id: s.strategy.id, strategy: s.strategy, family: s.family }));
}

export function destinationSweep(): Summary[] {
  const out: Summary[] = [];
  for (const s of ALL()) for (const d of V2_DESTINATION_IDS) out.push(summarize(labRun({ id: s.strategy.id, strategy: s.strategy, family: s.family, destination: d, withExec: true })));
  return out;
}

// ───────────────────────────── E3 allocation grid ─────────────────────────────

const BUCKETS = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials', 'cashReserve'] as const;
export type GridAlloc = Record<(typeof BUCKETS)[number], number>;

export function allocationGrid(step = 5, total = 30): GridAlloc[] {
  const n = total / step; const out: GridAlloc[] = [];
  const rec = (i: number, left: number, cur: number[]) => {
    if (i === BUCKETS.length - 1) { out.push(Object.fromEntries(BUCKETS.map((b, j) => [b, (j === i ? left : cur[j]) * step])) as GridAlloc); return; }
    for (let x = 0; x <= left; x++) rec(i + 1, left - x, [...cur, x]);
  };
  rec(0, n, []);
  return out;
}

export interface GridRow { alloc: GridAlloc; destination: V2DestinationId; rev2: number; rev4: number; rev8: number; cumOP: number; netCash8: number; price4: number; price8: number; terminal: number; insolvent: boolean; financing: number; culture8: number }

export function gridRuns(): GridRow[] {
  const rows: GridRow[] = [];
  for (const g of allocationGrid()) {
    const strategy: V2ArcStrategy = { id: 'grid', name: 'grid', description: '', allocate: () => a(g) };
    for (const d of V2_DESTINATION_IDS) {
      const r = labRun({ id: 'grid', strategy: { ...strategy, destination: () => d }, withExec: false });
      const s = summarize(r);
      rows.push({ alloc: g, destination: d, rev2: s.rev2, rev4: s.rev4, rev8: s.rev8, cumOP: s.cumOP, netCash8: s.netCash8, price4: s.price4, price8: s.price8, terminal: s.terminal, insolvent: s.everInsolvent, financing: s.financingRaised, culture8: s.culture8 });
    }
  }
  return rows;
}

// ───────────────────────────── E4 marginal returns by bucket ─────────────────────────────

export const MARGINAL_BASE = { consumer: 3, enterprise: 3, aiProduct: 3, people: 3, universityCredentials: 3, cashReserve: 15 };
export const MARGINAL_BUCKETS = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const;

export interface MarginalRow { mix: string; bucket: string; destination: string; quarters: number; dRev2: number; dRev4: number; dRev8: number; dRevLast: number; dCumOP8: number; dCumOPLast: number; dNetCash8: number; dPrice4: number; dPrice8: number; dTerminal: number; dSegment8: Record<string, number> }

export function marginalReturns(): MarginalRow[] {
  const out: MarginalRow[] = [];
  const variants: { mix: keyof typeof MIXES; mode: MixMode }[] = [
    { mix: 'baseline', mode: 'production' }, { mix: 'altA', mode: 'rebased' }, { mix: 'altB', mode: 'rebased' }, { mix: 'altA', mode: 'rebased-aifixed' }, { mix: 'altB', mode: 'rebased-aifixed' },
  ];
  for (const v of variants) for (const dest of ['balanced-marketplace'] as V2DestinationId[]) {
    const mk = (alloc: typeof MARGINAL_BASE): RunResult => labRun({ id: 'm', strategy: { id: 'm', name: 'm', description: '', allocate: () => a(alloc), destination: () => dest }, mix: v.mix, mixMode: v.mode, quarters: 12, withExec: false, policy: { opportunity: () => false } });
    const base = mk(MARGINAL_BASE);
    for (const b of MARGINAL_BUCKETS) {
      const alt = mk({ ...MARGINAL_BASE, [b]: MARGINAL_BASE[b] + 10, cashReserve: MARGINAL_BASE.cashReserve - 10 });
      const d = (f: (r: RunResult) => number) => f(alt) - f(base);
      const cum = (r: RunResult, n: number) => r.quarters.slice(0, n).reduce((t, x) => t + x.operatingProfit, 0);
      out.push({
        mix: `${v.mix}${v.mode === 'production' ? '' : ':' + v.mode}`, bucket: b, destination: dest, quarters: 12,
        dRev2: d(r => r.quarters[1].revenue), dRev4: d(r => r.quarters[3].revenue), dRev8: d(r => r.quarters[7].revenue), dRevLast: d(r => r.quarters[11].revenue),
        dCumOP8: d(r => cum(r, 8)), dCumOPLast: d(r => cum(r, 12)), dNetCash8: d(r => r.quarters[7].cash - r.quarters[7].debt),
        dPrice4: d(r => r.quarters[3].price), dPrice8: d(r => r.quarters[7].price), dTerminal: 0,
        dSegment8: Object.fromEntries((['consumer', 'enterprise', 'university', 'aiNative'] as const).map(k => [k, alt.quarters[7][k] - base.quarters[7][k]])),
      });
    }
  }
  return out;
}

// ───────────────────────────── E5 starting revenue mixes ─────────────────────────────

export function mixRuns(): Summary[] {
  const out: Summary[] = [];
  for (const s of LAB_STRATEGIES) {
    out.push(summarize(labRun({ id: s.strategy.id, strategy: s.strategy, family: s.family, withExec: true })));
    for (const mix of ['altA', 'altB'] as const) for (const mode of ['naive', 'rebased', 'rebased-aifixed'] as const) {
      out.push(summarize(labRun({ id: s.strategy.id, strategy: s.strategy, family: s.family, mix, mixMode: mode, withExec: false })));
    }
  }
  return out;
}

/** Steady-state check: no investment, neutral market (Q1 conditions) for four quarters. A valid opening is a fixed point. */
export function steadyStateCheck(): { mix: string; segment: string; q0: number; q4: number; drift: number }[] {
  const out: { mix: string; segment: string; q0: number; q4: number; drift: number }[] = [];
  const hold: V2ArcStrategy = { id: 'hold', name: 'hold', description: '', allocate: () => a({ cashReserve: 30 }), destination: () => 'balanced-marketplace' };
  const variants: { mix: keyof typeof MIXES; mode: MixMode }[] = [{ mix: 'baseline', mode: 'production' }, { mix: 'altA', mode: 'naive' }, { mix: 'altA', mode: 'rebased' }, { mix: 'altA', mode: 'rebased-aifixed' }, { mix: 'altB', mode: 'naive' }, { mix: 'altB', mode: 'rebased' }, { mix: 'altB', mode: 'rebased-aifixed' }];
  for (const v of variants) {
    const rebase = v.mode === 'rebased' || v.mode === 'rebased-aifixed' ? MIXES[v.mix] : null;
    const cap = capacityScaler(rebase);
    const run = withCalibration(rebase, () => {
      const opening = openingFor(MIXES[v.mix], v.mode);
      const neutral = (q: number, m: V2MarketConditions) => { const n = { ...m, consumerDemand: 1, consumerCommoditization: 0, consumerCacPressure: 1, enterpriseDemand: 1, enterpriseAIDemand: 1, universityDemand: 1, aiNativeDemand: 1, macroPressure: 0, segmentCapacity: { consumer: 300, enterprise: 120, university: 40, aiNative: 80 } }; return cap ? cap(q, n) : n; };
      return { opening, r: runArc({ ...hold, opening: () => structuredClone(opening) }, 3, { marketOverride: neutral }) };
    }, v.mode === 'rebased-aifixed');
    const s0 = run.opening; const s3 = run.r.finalState;
    for (const seg of ['consumer', 'enterprise', 'university', 'aiNative'] as const) out.push({ mix: `${v.mix}${v.mode === 'production' ? '' : ':' + v.mode}`, segment: seg, q0: s0.segmentRevenue[seg], q4: s3.segmentRevenue[seg], drift: s3.segmentRevenue[seg] - s0.segmentRevenue[seg] });
    out.push({ mix: `${v.mix}${v.mode === 'production' ? '' : ':' + v.mode}`, segment: 'operating profit', q0: s0.operatingProfit, q4: s3.ledgerHistory[2].operatingProfit, drift: s3.ledgerHistory[2].operatingProfit - s0.operatingProfit });
  }
  return out;
}

// ───────────────────────────── E6 sensitivity ─────────────────────────────

export function sensitivityRuns(): Summary[] {
  const out: Summary[] = [];
  for (const sc of SCENARIOS) for (const s of LAB_STRATEGIES) {
    out.push(summarize(labRun({ id: s.strategy.id, strategy: s.strategy, family: s.family, scenario: sc.id, market: sc.fn, withExec: true })));
  }
  return out;
}

// ───────────────────────────── E7 contract, financing and recession audit ─────────────────────────────

export interface ContractRow { id: string; label: string; choice: 'accept' | 'decline'; q5Investment: number; q5Envelope: number; q5EventCosts: number; q5Cash: number; deliveryCommitment: number; q5LoadRatio: number; rev8: number; ent8: number; cumOP: number; netCash8: number; price8: number; terminal: number; financing: number; insolvent: boolean }

export function contractAudit(): ContractRow[] {
  const out: ContractRow[] = [];
  for (const s of LAB_STRATEGIES) for (const choice of ['accept', 'decline'] as const) {
    const r = labRun({ id: s.strategy.id, strategy: s.strategy, policy: { opportunity: () => choice === 'accept' }, withExec: false });
    const q5 = r.run.quarters[4].record; const L = q5.consequence.ledger;
    const deliv = q5.ending.costs.commitments.filter(c => c.source === 'decision').reduce((t, c) => t + c.quarterlyCost, 0);
    const sm = summarize(r);
    out.push({ id: s.strategy.id, label: s.strategy.name, choice, q5Investment: L.strategicInvestment, q5Envelope: L.strategicEnvelope, q5EventCosts: L.eventCosts, q5Cash: q5.ending.cash, deliveryCommitment: deliv, q5LoadRatio: r.quarters[4].loadRatio, rev8: sm.rev8, ent8: sm.seg8.enterprise, cumOP: sm.cumOP, netCash8: sm.netCash8, price8: sm.price8, terminal: sm.terminal, financing: sm.financingRaised, insolvent: sm.everInsolvent });
  }
  return out;
}

export interface FinancingRow { id: string; label: string; policy: string; rev8: number; cash8: number; minCash: number; debt8: number; equity: number; ownership: number; price8: number; terminal: number; insolvent: boolean; insolventQ: number; distressedQ: number }

export function financingAudit(): FinancingRow[] {
  const out: FinancingRow[] = [];
  const policies: { id: string; p: Parameters<typeof labRun>[0]['policy'] }[] = [
    { id: 'debt-first (default)', p: undefined },
    { id: 'refuse all financing', p: { liquidity: () => ({ actions: [] }) } },
  ];
  const strategies = [...LAB_STRATEGIES, { family: 'Diversified', allocationText: '$10M Consumer + $10M Enterprise + $10M AI; accepts contract; no recession action', strategy: { id: 'all-in-contract', name: 'All-in + contract', description: '$10M C/E/AI, accepts contract, no recession action', allocate: () => a({ consumer: 10, enterprise: 10, aiProduct: 10 }), destination: () => 'enterprise-ai', policy: { opportunity: () => true, recession: () => ({ actions: {} }) } } as V2ArcStrategy } as LabStrategy];
  for (const s of strategies) for (const pol of policies) {
    const r = labRun({ id: s.strategy.id, strategy: s.strategy, policy: pol.p, withExec: false });
    const fs = r.run.finalState; const sm = summarize(r);
    out.push({ id: s.strategy.id, label: s.strategy.name, policy: pol.id, rev8: sm.rev8, cash8: sm.cash8, minCash: sm.minCash, debt8: sm.debt8, equity: sm.equity, ownership: sm.ownership, price8: sm.price8, terminal: sm.terminal, insolvent: sm.everInsolvent, insolventQ: fs.solvency.insolventQuarters, distressedQ: sm.distressedQ });
  }
  return out;
}

export interface RecessionRow { id: string; label: string; response: string; feasible: boolean; reason: string; finalOption?: string | null; crisis?: string | null; q6Savings?: number; cash8?: number; rev8?: number; cumOP?: number; price8?: number; terminal?: number; culture8?: number; talent8?: number }

export function recessionAudit(): RecessionRow[] {
  const out: RecessionRow[] = [];
  const responses: { id: string; actions: Record<string, unknown>; slow?: number }[] = [
    { id: 'no action', actions: {} },
    { id: 'hiring freeze', actions: { hiringFreeze: true } },
    { id: 'targeted reduction (protect R&D)', actions: { workforceReduction: { depth: 'targeted', protectRnD: true } } },
    { id: 'deep reduction', actions: { workforceReduction: { depth: 'deep' } } },
    { id: 'marketing 0.7 + freeze', actions: { marketingLevel: 0.7, hiringFreeze: true } },
    { id: 'slow investment by $10M', actions: {}, slow: 10 },
  ];
  for (const s of LAB_STRATEGIES) for (const resp of responses) {
    try {
      const r = labRun({ id: s.strategy.id, strategy: s.strategy, withExec: false, policy: { recession: (_c, planned) => ({ actions: resp.actions as never, allocation: resp.slow ? (() => { const inv = planned.consumer + planned.enterprise + planned.aiProduct + planned.people + planned.universityCredentials; const cut = Math.min(resp.slow!, inv); const f = inv > 0 ? 1 - cut / inv : 1; return { consumer: planned.consumer * f, enterprise: planned.enterprise * f, aiProduct: planned.aiProduct * f, people: planned.people * f, universityCredentials: planned.universityCredentials * f, cashReserve: planned.cashReserve + cut }; })() : undefined }) } });
      const sm = summarize(r); const q6 = r.run.quarters[5].record.consequence.ledger;
      out.push({ id: s.strategy.id, label: s.strategy.name, response: resp.id, feasible: true, reason: '', finalOption: sm.finalOption, crisis: sm.crisis, q6Savings: q6.operatingProfit, cash8: sm.cash8, rev8: sm.rev8, cumOP: sm.cumOP, price8: sm.price8, terminal: sm.terminal, culture8: sm.culture8, talent8: sm.talentCap });
    } catch (e) {
      out.push({ id: s.strategy.id, label: s.strategy.name, response: resp.id, feasible: false, reason: (e as Error).message });
    }
  }
  return out;
}

/** Direct engine checks: the envelope caps spending regardless of cash or financing. */
export function envelopeChecks(): { check: string; result: string }[] {
  const res: { check: string; result: string }[] = [];
  const tryV = (label: string, alloc: Parameters<typeof validateV2Allocation>[0], env: number) => {
    try { validateV2Allocation(alloc, env); res.push({ check: label, result: 'accepted' }); } catch (e) { res.push({ check: label, result: `rejected: ${(e as Error).message}` }); }
  };
  tryV('$30M invested within the $30M envelope', a({ consumer: 30 }), 30);
  tryV('$40M invested within the $30M envelope (e.g. after borrowing $20M)', a({ consumer: 40 }), 30);
  tryV('$20M invested + $10M reserve within $30M', a({ consumer: 20, cashReserve: 10 }), 30);
  tryV('$45M invested within the Q8 scale-independently envelope ($45M)', a({ consumer: 15, enterprise: 15, aiProduct: 15 }), 45);
  void getV2Baseline;
  return res;
}

// ───────────────────────────── E8 horizon extension ─────────────────────────────

export function horizonRuns(): { id: string; label: string; rev4: number; rev8: number; rev12: number; cumOP8: number; cumOP12: number; cash12: number; price8: number; price12: number; growth8to12: number }[] {
  return LAB_STRATEGIES.map(s => {
    const r = labRun({ id: s.strategy.id, strategy: s.strategy, quarters: 12, withExec: false });
    const Q = (n: number) => r.quarters[n - 1];
    const cum = (n: number) => r.quarters.slice(0, n).reduce((t, x) => t + x.operatingProfit, 0);
    return { id: s.strategy.id, label: s.strategy.name, rev4: Q(4).revenue, rev8: Q(8).revenue, rev12: Q(12).revenue, cumOP8: cum(8), cumOP12: cum(12), cash12: Q(12).cash, price8: Q(8).price, price12: Q(12).price, growth8to12: Q(12).revenue / Q(8).revenue - 1 };
  });
}
