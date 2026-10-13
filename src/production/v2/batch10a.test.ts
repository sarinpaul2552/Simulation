/**
 * Batch 10A — student learning experience and decision rationale.
 * Presentation-layer only: none of these tests touches the engine, and the engine-freeze test elsewhere still applies.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ARC_STRATEGIES, runArc, V2ArcRun } from '../../testlab/utils/v2ScenarioArc';
import { getScenarioQuarter } from '../../simulation/engineV2Scenario';
import { initializeGame, resolveQuarter, envelopeFor } from './adapter';
import type { V2Deliberation, V2PlayerQuarterInput } from './types';
import { DECISION_FRAMING, rationaleMissing } from './content/decisionFraming';
import { LEARNING_OPTIONS, encodeReflection, decodeReflection, RISKS, BELIEFS } from './content/deliberationContent';
import { Q3_SIGNAL_ASSESSMENTS } from './content/signalAssessments';
import { gameHistory } from './insights/history';
import { buildSignalReveal, signalRevealAvailable } from './insights/signalReveal';
import { accountabilityRows, NOT_RECORDED, ACCOUNTABILITY_CAVEAT } from './insights/accountability';
import { canPrefill, prefillAllocation, investedTotal } from './insights/prefill';
import type { V2GameSnapshot } from './snapshot';

function inputsOf(run: V2ArcRun): V2PlayerQuarterInput[] {
  return run.quarters.map(h => {
    const d = h.decisions ?? {};
    const inp: V2PlayerQuarterInput = { quarter: h.quarter, allocation: { ...h.allocation } };
    if (h.quarter === 4 && h.record.ending.destination) inp.destination = h.record.ending.destination.id;
    if (d.opportunity) inp.opportunity = { ...d.opportunity };
    if (d.management) inp.management = d.management;
    if (d.crisisResponse) inp.crisisResponse = d.crisisResponse;
    if (d.finalOption) inp.finalOption = d.finalOption;
    if (d.financing) inp.financing = d.financing;
    return inp;
  });
}
const play = (inputs: V2PlayerQuarterInput[], n = inputs.length): V2GameSnapshot => { let s = initializeGame(); for (const i of inputs.slice(0, n)) s = resolveQuarter(s, i).snapshot; return s; };
const games = ARC_STRATEGIES.map(st => ({ id: st.id, inputs: inputsOf(runArc(st, 8)) }));
const CAUSAL = /\b(because|caused|led to|paid for|resulted in|due to|thanks to|so that|therefore)\b/i;
const VERDICT_WORDS = /\b(correct|right answer|best|recommended|wrong)\b/i;

describe('Batch 10A · quarter framing (Q1–Q3 distinct, Q4–Q8 major)', () => {
  it('Q1, Q2 and Q3 have distinct headings, prompts and priority sets; Q4–Q8 are major quarters', () => {
    const h = [1, 2, 3].map(q => DECISION_FRAMING[q].heading);
    expect(new Set(h).size).toBe(3);
    expect(h[0]).toBe('Where should we place our initial bets?');
    expect(h[2]).toBe('Which evidence do we trust?');
    for (const q of [1, 2, 3]) expect(DECISION_FRAMING[q].pace).toBe('fast');
    for (const q of [4, 5, 6, 7, 8]) { expect(DECISION_FRAMING[q].pace).toBe('major'); expect(DECISION_FRAMING[q].heading).toBeUndefined(); }
    const ids = [1, 2, 3].map(q => DECISION_FRAMING[q].priorities.map(p => p.id).join());
    expect(new Set(ids).size).toBe(3);
  });

  it('Q2 is a stance (accelerate / maintain / reconsider) and no option is presented as correct', () => {
    expect(DECISION_FRAMING[2].priorities.map(p => p.id)).toEqual(['q2-accelerate', 'q2-maintain', 'q2-reconsider']);
    for (let q = 1; q <= 8; q++) {
      const f = DECISION_FRAMING[q];
      for (const p of [...f.priorities, ...(f.evidence ?? [])]) { expect(p.label.ug).not.toMatch(VERDICT_WORDS); expect(p.label.mba).not.toMatch(VERDICT_WORDS); }
      expect(f.prompt.ug).not.toMatch(/\bAI is (the )?(answer|right|correct)/i);
    }
    expect(DECISION_FRAMING[2].prompt.ug).toMatch(/no single correct answer/);
  });

  it('Q3 evidence options are exactly the authored Q3 signals, named by source only (no figures, no truth)', () => {
    const scenarioIds = (getScenarioQuarter(3)?.signals ?? []).map(s => s.id).sort();
    expect(DECISION_FRAMING[3].evidence!.map(e => e.id).sort()).toEqual(scenarioIds);
    for (const e of DECISION_FRAMING[3].evidence!) {
      expect(e.label.ug).not.toMatch(/\d/);
      expect(e.label.ug).not.toMatch(/reliable|misleading|overstat|true|truth/i);
    }
    for (const q of [1, 2, 4, 5, 6, 7, 8]) expect(DECISION_FRAMING[q].evidence).toBeUndefined();
  });
});

describe('Batch 10A · rationale validation and backward compatibility', () => {
  it('requires priority, evidence belief, confidence and one risk; Q3 also requires one or two signals', () => {
    expect(rationaleMissing(1, {})).toHaveLength(4);
    const ok = { priorityId: 'q1-grow-now', beliefId: BELIEFS[1][0].id, confidence: 3, riskIds: [RISKS[1][0].id] };
    expect(rationaleMissing(1, ok)).toEqual([]);
    expect(rationaleMissing(2, { ...ok, priorityId: undefined })).toEqual(['Choose your stance']);
    expect(rationaleMissing(3, ok)).toEqual(['Choose the one or two signals that influenced you most']);
    expect(rationaleMissing(3, { ...ok, evidenceIds: ['q3-ai-wtp'] })).toEqual([]);
    expect(rationaleMissing(3, { ...ok, evidenceIds: ['q3-ai-wtp', 'q3-university'] })).toEqual([]);
    expect(rationaleMissing(3, { ...ok, evidenceIds: ['q3-ai-wtp', 'q3-university', 'q3-competition'] })).toHaveLength(1);
    expect(rationaleMissing(5, ok)).toEqual([]);
  });

  it('an older two-risk deliberation (pre-10A) still validates once a priority is chosen', () => {
    expect(rationaleMissing(4, { priorityId: 'growth', beliefId: 'q4-fit-capabilities', confidence: 3, riskIds: ['cash', 'competition'] })).toEqual([]);
  });

  it('accountability rows render old records (no priority, two risks) and missing records without errors', () => {
    const input: V2PlayerQuarterInput = { quarter: 2, allocation: { consumer: 10, enterprise: 0, aiProduct: 10, people: 0, universityCredentials: 0, cashReserve: 10 } };
    const old = accountabilityRows(2, { beliefId: 'q2-hedge', confidence: 3, riskIds: ['cash', 'cac'] }, input, 'undergraduate');
    expect(old.find(r => r.id === 'priority')!.text).toBe(NOT_RECORDED);
    expect(old.find(r => r.id === 'risk')!.label).toBe('Risks we named');
    expect(old.find(r => r.id === 'risk')!.text.split(' · ')).toHaveLength(2);
    const none = accountabilityRows(2, null, input, 'mba');
    expect(none.find(r => r.id === 'evidence')!.text).toBe(NOT_RECORDED);
    expect(none.find(r => r.id === 'decided')!.text).toMatch(/^Invested mostly in/);
    const neu: V2Deliberation = { priorityId: 'q2-reconsider', beliefId: 'q2-hedge', confidence: 5, riskIds: ['cash'] };
    const rows = accountabilityRows(2, neu, input, 'undergraduate');
    expect(rows.find(r => r.id === 'priority')!.label).toBe('Our stance');
    expect(rows.find(r => r.id === 'risk')!.label).toBe('Our biggest risk');
  });

  it('accountability wording makes no causal claim, for every strategy and quarter', () => {
    expect(ACCOUNTABILITY_CAVEAT).not.toMatch(CAUSAL);
    for (const g of games) {
      g.inputs.forEach((inp, i) => {
        const q = i + 1;
        const d: V2Deliberation = { priorityId: DECISION_FRAMING[q].priorities[0].id, beliefId: BELIEFS[q][0].id, confidence: 3, riskIds: [RISKS[q][0].id], evidenceIds: q === 3 ? ['q3-ai-wtp'] : undefined };
        for (const r of accountabilityRows(q, d, inp, 'undergraduate')) { expect(r.text, `${g.id} Q${q} ${r.id}`).not.toMatch(CAUSAL); expect(r.text).not.toMatch(/undefined|NaN/); }
      });
    }
  });
});

describe('Batch 10A · "Looking back: which signals mattered?"', () => {
  const g = games[0];
  const full = gameHistory(play(g.inputs));

  it('the gate opens only after Q4 is completed', () => {
    for (const q of [0, 1, 2, 3]) expect(signalRevealAvailable(q)).toBe(false);
    for (const q of [4, 5, 6, 7, 8]) expect(signalRevealAvailable(q)).toBe(true);
    expect(signalRevealAvailable(Number.NaN)).toBe(false);
  });

  it('cannot be built early, even when later records are present in component state', () => {
    for (const q of [0, 1, 2, 3]) expect(buildSignalReveal(full, q)).toBeNull();
    expect(buildSignalReveal(gameHistory(play(g.inputs, 3)), 4)).toBeNull(); // Q4 record missing
    expect(buildSignalReveal(full, 4)).not.toBeNull();
  });

  it('covers every authored Q3 signal and restates only authored truth notes', () => {
    const rows = buildSignalReveal(full, 4)!;
    const signals = getScenarioQuarter(3)!.signals;
    expect(rows.map(r => r.id).sort()).toEqual(signals.map(s => s.id).sort());
    expect(Q3_SIGNAL_ASSESSMENTS.map(a => a.id).sort()).toEqual(signals.map(s => s.id).sort());
    for (const r of rows) {
      const s = signals.find(x => x.id === r.id)!;
      expect(r.headline).toBe(s.headline);
      expect(r.basis).toBe(s.truthReference?.note ?? null);
      // No invented figure: every number in the assessment appears in the signal's headline or its authored note.
      const allowed = new Set(`${s.headline} ${s.truthReference?.note ?? ''} ${s.shownRange?.join(' ') ?? ''}`.match(/\d+(\.\d+)?/g) ?? []);
      for (const n of `${r.showed} ${r.lesson}`.replace(/\bQ\d\b/g, "").match(/\d+(\.\d+)?/g) ?? []) expect(allowed.has(n), `${r.id}: ${n}`).toBe(true);
    }
    const people = rows.find(r => r.id === 'q3-people-strain')!;
    expect(people.verdict).toBe('not-assessed');
    expect(people.basis).toBeNull();
    // Graded, not simply right/wrong
    expect(new Set(rows.map(r => r.verdict))).toEqual(new Set(['reliable', 'overstated', 'misleading', 'partly-supported', 'incomplete', 'not-assessed']));
  });

  it('uses only Q3–Q4 records (no information from later quarters) and marks the signals the team cited', () => {
    const at4 = buildSignalReveal(gameHistory(play(g.inputs, 4)), 4, ['q3-ai-engagement']);
    const at8 = buildSignalReveal(full, 8, ['q3-ai-engagement']);
    expect(at8).toEqual(at4);
    expect(at4!.filter(r => r.cited).map(r => r.id)).toEqual(['q3-ai-engagement']);
  });
});

describe('Batch 10A · optional allocation prefill', () => {
  const prev = { consumer: 12, enterprise: 6, aiProduct: 9, people: 3, universityCredentials: 0, cashReserve: 0 };
  const empty = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 30 };

  it('is offered only when a previous allocation exists and nothing is invested yet (never overwrites a draft)', () => {
    expect(canPrefill(empty, prev)).toBe(true);
    expect(canPrefill(empty, undefined)).toBe(false);
    expect(canPrefill(empty, { ...empty })).toBe(false);
    expect(canPrefill({ ...empty, aiProduct: 0.5 }, prev)).toBe(false);
  });

  it('copies buckets, fits the envelope in $0.5M steps and keeps the rest as cash', () => {
    for (const env of [30, 25, 20, 12, 7.5]) {
      const a = prefillAllocation(prev, env);
      expect(investedTotal(a)).toBeLessThanOrEqual(env + 1e-9);
      expect(a.cashReserve).toBeCloseTo(env - investedTotal(a), 6);
      for (const b of ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const) { expect((a[b] * 2) % 1).toBe(0); expect(a[b]).toBeLessThanOrEqual(prev[b]); }
    }
    expect(prefillAllocation(prev, 30)).toEqual({ ...prev, cashReserve: 0 });
    expect(Object.keys(prefillAllocation(prev, 30)).sort()).toEqual(['aiProduct', 'cashReserve', 'consumer', 'enterprise', 'people', 'universityCredentials']);
  });

  it('a prefilled Q2 decision for every strategy is a valid, unchanged engine input (no economics touched)', () => {
    for (const g of games) {
      const s1 = play(g.inputs, 1);
      const alloc = prefillAllocation(g.inputs[0].allocation, envelopeFor(2));
      const out = resolveQuarter(s1, { quarter: 2, allocation: alloc });
      expect(out.snapshot.state.quarter).toBe(2);
    }
  });
});

describe('Batch 10A · reflection', () => {
  it('offers the counterfactual chip and round-trips through the existing reflection column', () => {
    expect(LEARNING_OPTIONS.map(o => o.id)).toContain('different');
    const text = encodeReflection({ v: 1, learning: ['different', 'market'], note: 'Weight paid cohorts over usage.' });
    expect(decodeReflection(text)).toEqual({ v: 1, learning: ['different', 'market'], note: 'Weight paid cohorts over usage.' });
    expect(decodeReflection('legacy free text')).toEqual({ v: 1, learning: [], note: 'legacy free text' });
  });
});

describe('Batch 10A · misleading-message guard (presentation layer)', () => {
  let files: { path: string; text: string }[] = [];
  beforeAll(async () => {
    const fsName = 'node:fs', pathName = 'node:path';
    const fs = (await import(/* @vite-ignore */ fsName)) as { readFileSync: (p: string, e: string) => string; readdirSync: (p: string, o: { recursive: boolean }) => string[] };
    const path = (await import(/* @vite-ignore */ pathName)) as { join: (...p: string[]) => string };
    for (const dir of ['ui', 'insights', 'content']) {
      const root = new URL(`./${dir}`, import.meta.url).pathname;
      for (const f of fs.readdirSync(root, { recursive: true })) {
        if (!/\.(ts|tsx)$/.test(f) || /\.test\./.test(f)) continue;
        files.push({ path: `${dir}/${f}`, text: fs.readFileSync(path.join(root, f), 'utf8') });
      }
    }
  });

  it('no UI, insight or content module renders the engine adapter’s result.explanation (it contains a false culture claim)', () => {
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) expect(f.text, f.path).not.toMatch(/\.explanation\b/);
  });

  it('the corrected overload and culture texts no longer claim effects the engine does not have', () => {
    for (const f of files) expect(f.text, f.path).not.toMatch(/matured more slowly|mature more slowly|slow everything down|Culture reflects workload|Culture paid for it/);
  });
});
