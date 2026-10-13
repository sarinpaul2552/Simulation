/**
 * Batch 9 — candidate calibration changes, evaluated IN MEMORY ONLY (no engine source change). Each candidate is a list
 * of constant overrides applied for the duration of a run and restored afterwards. Every candidate preserves the
 * starting fixed point (it acts only through capability gains, commitments or recognition timing), which the
 * verification test checks.
 */
import { V2_COMMERCIAL_CALIBRATION } from '../../../src/simulation/engineV2Commercial';
import { V2_REVENUE_CALIBRATION } from '../../../src/simulation/engineV2Revenue';
import { V2_COST_CALIBRATION } from '../../../src/simulation/engineV2Costs';
import { a, type V2ArcStrategy } from '../../../src/testlab/utils/v2ScenarioArc';
import { V2_DESTINATION_IDS } from '../../../src/simulation/engineV2Destination';
import { labRun } from './runner';
import { LAB_STRATEGIES } from './strategies';
import { summarize, allocationGrid, SCENARIOS, type Summary } from './experiments';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;
export interface Override { target: string; obj: Obj; key: string; value: unknown }
export interface Candidate { id: string; label: string; rationale: string; overrides: () => Override[] }

const E = V2_COMMERCIAL_CALIBRATION.enterprise as unknown as Obj;
const U = V2_COMMERCIAL_CALIBRATION.university as unknown as Obj;
const RE = V2_REVENUE_CALIBRATION.enterprise as unknown as Obj;
const RU = V2_REVENUE_CALIBRATION.university as unknown as Obj;
const RA = V2_REVENUE_CALIBRATION.aiNative as unknown as Obj;
const CE = V2_COST_CALIBRATION.commitments.enterprise as unknown as Obj;

export const CANDIDATES: Candidate[] = [
  { id: 'none', label: 'Current calibration', rationale: 'Reference.', overrides: () => [] },
  { id: 'ai-reward', label: 'Moderate the AI adoption reward', rationale: 'AI-native new monetization above the starting adoption level: $0.08M → $0.05M per adoption point per quarter. AI-native revenue currently compounds by $6–8M a quarter once adoption passes ~70, the largest growth flow in the model.', overrides: () => [{ target: 'revenue.aiNative.monetizationPerPointAbove', obj: RA, key: 'monetizationPerPointAbove', value: 0.05 }] },
  { id: 'ent-convert', label: 'Enterprise capability converts to bookings', rationale: 'Enterprise win rate per point of relative capability 0.08 → 0.30 and pipeline inflow amplitude 1.2 → 3.0. Enterprise capability 30 → 120 currently lifts the win rate ~4 points and Enterprise revenue only $40M → $46M by Q8.', overrides: () => [{ target: 'commercial.enterprise.winPerRelCapability', obj: E, key: 'winPerRelCapability', value: 0.3 }, { target: 'commercial.enterprise.inflowCapabilityAmplitude', obj: E, key: 'inflowCapabilityAmplitude', value: 3 }] },
  { id: 'ent-golive', label: 'Enterprise bookings go live faster', rationale: 'Recognition 25/50/25% over Q+1..Q+3 → 50/50% over Q+1..Q+2.', overrides: () => [{ target: 'revenue.enterprise.recognition', obj: RE, key: 'recognition', value: [[1, 0.5], [2, 0.5]] }] },
  { id: 'ent-commit', label: 'Lower Enterprise run-cost commitment', rationale: 'Delivery/CS commitment 4% → 2% of investment per quarter for 6 quarters.', overrides: () => [{ target: 'costs.commitments.enterprise.perDollar', obj: CE, key: 'perDollar', value: 0.02 }] },
  { id: 'uni-convert', label: 'University pipeline responds to Credential', rationale: 'University pipeline inflow amplitude 0.8 → 4.0 and resolution 0.2 → 0.4. Credential 40 → 120 currently grows the pipeline 24 → 42 and University revenue not at all within eight quarters.', overrides: () => [{ target: 'commercial.university.inflowCapabilityAmplitude', obj: U, key: 'inflowCapabilityAmplitude', value: 4 }, { target: 'commercial.university.resolutionRate', obj: U, key: 'resolutionRate', value: 0.4 }] },
  { id: 'uni-golive', label: 'University wins go live sooner', rationale: 'Recognition 10/30/30/30% over Q+2..Q+5 → 30/40/30% over Q+1..Q+3.', overrides: () => [{ target: 'revenue.university.recognition', obj: RU, key: 'recognition', value: [[1, 0.3], [2, 0.4], [3, 0.3]] }] },
];

/** Packages = candidate combinations (the "smallest set" search). */
export const PACKAGES: { id: string; label: string; parts: string[] }[] = [
  { id: 'P0', label: 'Current calibration', parts: ['none'] },
  { id: 'P1', label: 'AI moderation only', parts: ['ai-reward'] },
  { id: 'P2', label: 'Enterprise conversion only', parts: ['ent-convert', 'ent-golive'] },
  { id: 'P3', label: 'AI moderation + Enterprise conversion', parts: ['ai-reward', 'ent-convert', 'ent-golive'] },
  { id: 'P4', label: 'P3 + University conversion', parts: ['ai-reward', 'ent-convert', 'ent-golive', 'uni-convert', 'uni-golive'] },
  { id: 'P5', label: 'P4 + lower Enterprise commitment', parts: ['ai-reward', 'ent-convert', 'ent-golive', 'uni-convert', 'uni-golive', 'ent-commit'] },
  { id: 'PR', label: 'Recommended minimal set (P5 without University go-live, which adds nothing)', parts: ['ai-reward', 'ent-convert', 'ent-golive', 'ent-commit', 'uni-convert'] },
];

export function withOverrides<T>(ids: string[], fn: () => T): T {
  const ov = ids.flatMap(id => CANDIDATES.find(c => c.id === id)!.overrides());
  const saved = ov.map(o => ({ o, v: o.obj[o.key] }));
  try { for (const o of ov) o.obj[o.key] = o.value; return fn(); }
  finally { for (const s of saved.reverse()) s.o.obj[s.o.key] = s.v; }
}

export interface PackageResult { pkg: string; scenario: string; rows: Summary[] }

export function evaluatePackages(scenarios = ['authored', 'consumer-weak', 'enterprise-boom', 'no-disruption']): PackageResult[] {
  const out: PackageResult[] = [];
  for (const p of [...PACKAGES, ...CANDIDATES.filter(c => c.id !== 'none').map(c => ({ id: c.id, label: c.label, parts: [c.id] }))]) for (const sc of scenarios) {
    const fn = SCENARIOS.find(s => s.id === sc)!.fn;
    const rows = withOverrides(p.parts, () => LAB_STRATEGIES.map(s => summarize(labRun({ id: s.strategy.id, strategy: s.strategy, family: s.family, scenario: sc, market: fn, withExec: true }))));
    out.push({ pkg: p.id, scenario: sc, rows });
  }
  return out;
}

export interface GridMetrics {
  topShare: Record<string, number>; pct: Record<string, number>;
  byDestination: Record<string, { best: number; bestAlloc: Record<string, number>; bestTerminal: number; bestNoAI: number; bestNoAIAlloc: Record<string, number>; ownBucketInBest: number }>;
  overallBest: number; spreadBestDest: number;
}

const OWN_BUCKET: Record<string, string> = { 'consumer-ai': 'consumer', 'enterprise-ai': 'enterprise', 'premium-human-ai': 'people', 'university-infrastructure': 'universityCredentials', 'balanced-marketplace': 'consumer' };

/** Grid metrics under a package (every $5M allocation × every destination; best destination per allocation by price). */
export function gridUnder(parts: string[]): GridMetrics {
  return withOverrides(parts, () => {
    const all: { alloc: Record<string, number>; destination: string; price8: number; terminal: number }[] = [];
    for (const g of allocationGrid()) for (const d of V2_DESTINATION_IDS) {
      const st: V2ArcStrategy = { id: 'g', name: 'g', description: '', allocate: () => a(g), destination: () => d };
      const s = summarize(labRun({ id: 'g', strategy: st, withExec: false }));
      all.push({ alloc: g, destination: d, price8: s.price8, terminal: s.terminal });
    }
    const key = (x: Record<string, number>) => JSON.stringify(x);
    const bestMap = new Map<string, (typeof all)[number]>();
    for (const r of all) { const k = key(r.alloc); const b = bestMap.get(k); if (!b || r.price8 > b.price8) bestMap.set(k, r); }
    const best = [...bestMap.values()].sort((x, y) => y.price8 - x.price8);
    const top = best.slice(0, Math.ceil(best.length / 20));
    const buckets = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials', 'cashReserve'];
    const topShare = Object.fromEntries(buckets.map(k => [k, top.reduce((t, r) => t + r.alloc[k], 0) / top.length]));
    const rank = (k: string) => { const r = best.find(x => x.alloc[k] === 30)!; return 100 * best.filter(x => x.price8 < r.price8).length / best.length; };
    const pct = Object.fromEntries(buckets.map(k => [k, rank(k)]));
    const byDestination: GridMetrics['byDestination'] = {};
    for (const d of V2_DESTINATION_IDS) {
      const rows = all.filter(r => r.destination === d).sort((x, y) => y.price8 - x.price8);
      const noAI = rows.filter(r => r.alloc.aiProduct === 0);
      byDestination[d] = { best: rows[0].price8, bestAlloc: rows[0].alloc, bestTerminal: Math.max(...rows.map(r => r.terminal)), bestNoAI: noAI[0].price8, bestNoAIAlloc: noAI[0].alloc, ownBucketInBest: rows[0].alloc[OWN_BUCKET[d]] };
    }
    const bests = Object.values(byDestination).map(x => x.best);
    return { topShare, pct, byDestination, overallBest: best[0].price8, spreadBestDest: Math.max(...bests) - Math.min(...bests) };
  });
}
