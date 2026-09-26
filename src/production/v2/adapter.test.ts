import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, liquidityPolicy, V2ArcRun, a } from '../../testlab/utils/v2ScenarioArc';
import { getV2Baseline } from '../../simulation/engineV2';
import { scoreV2Company } from '../../simulation/engineV2Scoring';
import { V2_SCENARIO_ARC } from '../../simulation/engineV2Scenario';
import {
  initializeGame, resolveQuarter, validateQuarterInput, verifySnapshot, replayInputs, resultForQuarter, getRoleBrief,
  getQuarterBriefing, getDecisionSpec, forecastQuarter, getFinalOutcome, headlineOf, canonical, workingQuarter, V2_ROLES,
} from './adapter';
import { toStorable, fromStorable, firstDifference, encodeLossless, decodeLossless, V2GameSnapshot } from './snapshot';
import type { V2PlayerQuarterInput } from './types';

/** Inputs a production team would have committed to reproduce a Test Lab arc run exactly. */
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

/** Simulate a Postgres jsonb round trip: keys re-ordered (length, then code point) and JSON text re-parsed. */
function viaDatabase(snap: V2GameSnapshot): V2GameSnapshot {
  return fromStorable(JSON.parse(JSON.stringify(canonical(toStorable(snap)))));
}

function playProduction(inputs: V2PlayerQuarterInput[]): V2GameSnapshot {
  let snap = viaDatabase(initializeGame());
  for (const inp of inputs) {
    const stored = JSON.parse(JSON.stringify(canonical(inp))) as V2PlayerQuarterInput; // input also persisted as jsonb
    snap = viaDatabase(resolveQuarter(snap, stored).snapshot);
  }
  return snap;
}

/**
 * The only permitted difference: the audit-log TEXT of a management decision is written with canonical (jsonb) key
 * order in production, so it is identical before and after a database round trip. Economics are compared exactly.
 */
function normalizeLog<T extends { decisionLog: { kind: string; decision: string }[] }>(s: T): T {
  return { ...s, decisionLog: s.decisionLog.map(e => e.kind === 'management' ? { ...e, decision: JSON.stringify(canonical(JSON.parse(e.decision))) } : e) };
}

const thinPeople = () => ({ ...ARC_STRATEGIES.find(s => s.id === 'people100')!, id: 'people100-thin-cash', opening: () => ({ ...getV2Baseline(), cash: 30 }) });

describe('Batch 5 · 5A snapshot contract', () => {
  it('lossless codec: Infinity, -0 and NaN survive; plain JSON would not', () => {
    const v = { a: Infinity, b: -Infinity, c: -0, d: NaN, e: [1, -0, { f: Infinity }], g: 'x' };
    const back = decodeLossless<typeof v>(encodeLossless(v));
    expect(firstDifference(v, back)).toBeNull();
    expect(firstDifference(v, JSON.parse(JSON.stringify(v)))).not.toBeNull();
  });

  it('a full Q8 V2TeamState round-trips exactly through the stored (jsonb) form', () => {
    for (const st of ARC_STRATEGIES) {
      const state = runArc(st, 8).finalState;
      const snap: V2GameSnapshot = { ...initializeGame(), completedQuarter: 8, state, inputs: inputsOf(runArc(st, 8)) };
      expect(firstDifference(state, viaDatabase(snap).state)).toBeNull();
    }
  });

  it('rejects snapshots with a wrong schema, version, engine or inconsistent input log', () => {
    const good = toStorable(initializeGame()) as Record<string, unknown>;
    expect(() => fromStorable({ ...good, schemaVersion: 2 })).toThrow(/version/);
    expect(() => fromStorable({ ...good, schema: 'other' })).toThrow(/schema/);
    expect(() => fromStorable({ ...good, engineVersion: 'v1' })).toThrow(/engine/);
    expect(() => fromStorable({ ...good, completedQuarter: 1 })).toThrow();
  });
});

describe('Batch 5 · 5A parity: production adapter ≡ Test Lab economics for identical inputs', () => {
  const cases: { id: string; run: () => V2ArcRun }[] = [
    ...ARC_STRATEGIES.map(st => ({ id: st.id, run: () => runArc(st, 8) })),
    ...['consumer-ai', 'enterprise-ai', 'balanced'].map(id => ({ id: `${id}→aligned-premium`, run: () => runArc(ARC_STRATEGIES.find(s => s.id === id)!, 8, { destination: 'premium-human-ai', postQ4Allocation: 'aligned' }) })),
    { id: 'thin-cash debt-first', run: () => runArc(thinPeople(), 8) },
    { id: 'thin-cash equity-first', run: () => runArc(thinPeople(), 8, { policy: { liquidity: liquidityPolicy('equity-first') } }) },
    { id: 'thin-cash restructure-first', run: () => runArc(thinPeople(), 8, { policy: { liquidity: liquidityPolicy('restructure-first') } }) },
    { id: 'thin-cash partner-first', run: () => runArc(thinPeople(), 8, { policy: { liquidity: liquidityPolicy('partner-first') } }) },
    { id: 'thin-cash refuse (insolvent)', run: () => runArc(thinPeople(), 8, { policy: { liquidity: liquidityPolicy('refuse') } }) },
    { id: 'consumer-ai strategic sale', run: () => runArc(ARC_STRATEGIES.find(s => s.id === 'consumer-ai')!, 8, { policy: { final: () => 'strategic-sale' } }) },
  ];

  for (const c of cases) {
    it(`${c.id}: every quarter's ledger, the final state and the terminal score are identical`, () => {
      const run = c.run();
      // The thin-cash cases start from a non-baseline opening, which production never uses; compare those from Q1 inputs
      // only when the opening is the production baseline.
      const baselineOpening = firstDifference(run.quarters[0].record.opening, getV2Baseline()) === null;
      if (!baselineOpening) {
        // Production always opens at the baseline: verify the resolver itself on the same opening instead.
        let snap: V2GameSnapshot = { ...initializeGame(), state: run.quarters[0].record.opening };
        for (const inp of inputsOf(run)) snap = resolveQuarter(snap, inp).snapshot;
        expect(firstDifference(snap.state, normalizeLog(run.finalState))).toBeNull();
        return;
      }
      const snap = playProduction(inputsOf(run));
      expect(snap.completedQuarter).toBe(8);
      for (let q = 0; q < 8; q++) expect(firstDifference(snap.state.ledgerHistory[q], run.quarters[q].record.consequence.ledger)).toBeNull();
      expect(firstDifference(snap.state, normalizeLog(run.finalState))).toBeNull();
      expect(scoreV2Company(snap.state)).toEqual(scoreV2Company(run.finalState));
      expect(verifySnapshot(snap).ok).toBe(true);
    });
  }
});

describe('Batch 5 · 5A determinism, idempotency and replay', () => {
  const run = runArc(ARC_STRATEGIES.find(s => s.id === 'evidence-responsive')!, 8);
  const inputs = inputsOf(run);

  it('resolving the same snapshot with the same input twice gives the same next snapshot; the input snapshot is not mutated', () => {
    const s0 = initializeGame();
    const before = encodeLossless(s0);
    const r1 = resolveQuarter(s0, inputs[0]);
    const r2 = resolveQuarter(s0, inputs[0]);
    expect(encodeLossless(s0)).toBe(before);
    expect(firstDifference(r1.snapshot, r2.snapshot)).toBeNull();
    expect(r1.result).toEqual(r2.result);
  });

  it('a resolved quarter cannot be resolved again (the working quarter moves on)', () => {
    const s1 = resolveQuarter(initializeGame(), inputs[0]).snapshot;
    expect(validateQuarterInput(s1, inputs[0])).toEqual(['Expected a decision for Q2, got Q1']);
    expect(() => resolveQuarter(s1, inputs[0])).toThrow(/Invalid Q1/);
  });

  it('replay from the input log reproduces the snapshot; tampering is detected', () => {
    const snap = replayInputs(inputs);
    expect(verifySnapshot(snap).ok).toBe(true);
    const tampered: V2GameSnapshot = { ...snap, state: { ...snap.state, cash: snap.state.cash + 50 } };
    expect(verifySnapshot(tampered).ok).toBe(false);
    const forged: V2GameSnapshot = { ...snap, inputs: snap.inputs.map((i, k) => k === 0 ? { ...i, allocation: a({ consumer: 30 }) } : i) };
    expect(verifySnapshot(forged).ok).toBe(false);
  });

  it('results for any quarter are recomputed from the log and match the live resolution', () => {
    let snap = initializeGame();
    const live = [];
    for (const inp of inputs) { const r = resolveQuarter(snap, inp); live.push(r.result); snap = r.snapshot; }
    for (let q = 1; q <= 8; q++) expect(resultForQuarter(snap, q)).toEqual(live[q - 1]);
  });

  it('deliberation fields (belief, votes, reflection) are dropped and cannot change economics', () => {
    const s0 = initializeGame();
    const noisy = { ...inputs[0], belief: 'AI will win', votes: { CEO: 'oppose' }, risks: ['x'] } as unknown as V2PlayerQuarterInput;
    expect(firstDifference(resolveQuarter(s0, noisy).snapshot, resolveQuarter(s0, inputs[0]).snapshot)).toBeNull();
    expect(Object.keys(resolveQuarter(s0, noisy).snapshot.inputs[0]).sort()).toEqual(['allocation', 'quarter']);
  });
});

describe('Batch 5 · 5A validation (the engine enforces availability; the UI adapts)', () => {
  const run = runArc(ARC_STRATEGIES.find(s => s.id === 'enterprise-ai')!, 8);
  const inputs = inputsOf(run);
  const at = (q: number) => replayInputs(inputs.slice(0, q - 1));

  it('allocation must total the envelope with non-negative buckets', () => {
    expect(validateQuarterInput(at(1), { quarter: 1, allocation: a({ consumer: 20 }) }).join()).toMatch(/total/);
    expect(validateQuarterInput(at(1), { quarter: 1, allocation: a({ consumer: 40, enterprise: -10 }) }).join()).toMatch(/non-negative/);
    expect(validateQuarterInput(at(1), { quarter: 1, allocation: a({ consumer: 30 }) })).toEqual([]);
  });

  it('Q4 requires a destination; other quarters reject one', () => {
    expect(validateQuarterInput(at(4), { quarter: 4, allocation: a({ consumer: 30 }) }).join()).toMatch(/destination/);
    expect(validateQuarterInput(at(3), { quarter: 3, allocation: a({ consumer: 30 }), destination: 'consumer-ai' }).join()).toMatch(/Q4/);
  });

  it('Q5 requires accept/decline; Q7 requires a crisis response; Q8 requires an earned option', () => {
    expect(validateQuarterInput(at(5), { ...inputs[4], opportunity: undefined }).join()).toMatch(/opportunity/);
    expect(validateQuarterInput(at(7), { ...inputs[6], crisisResponse: undefined }).join()).toMatch(/crisis/);
    expect(validateQuarterInput(at(6), { ...inputs[5], crisisResponse: 'remediate' }).join()).toMatch(/crisis/);
    const q8 = at(8);
    const spec = getDecisionSpec(q8)!;
    const locked = spec.final!.options.find(o => !o.available);
    if (locked) expect(validateQuarterInput(q8, { ...inputs[7], finalOption: locked.id }).length).toBeGreaterThan(0);
    expect(validateQuarterInput(q8, { ...inputs[7], finalOption: undefined }).join()).toMatch(/final/);
  });

  it('financing beyond the terms on offer is rejected by the engine', () => {
    const q1 = at(1);
    const f = forecastQuarter(q1, inputs[0]);
    expect(validateQuarterInput(q1, { ...inputs[0], financing: [{ kind: 'debt', amount: f.options.debtCapacity + 50 }] }).join()).toMatch(/exceeds capacity/);
  });

  it('Q8 envelope follows the option (scale 45 / raise 60)', () => {
    const q8 = at(8);
    const opt = getDecisionSpec(q8)!.final!.options;
    if (opt.find(o => o.id === 'scale-independently')?.available) {
      expect(validateQuarterInput(q8, { quarter: 8, finalOption: 'scale-independently', allocation: a({ enterprise: 30, aiProduct: 15 }) })).toEqual([]);
      expect(validateQuarterInput(q8, { quarter: 8, finalOption: 'continue', allocation: a({ enterprise: 30, aiProduct: 15 }) }).join()).toMatch(/total/);
    }
  });
});

describe('Batch 5 · 5A scenario and role-private information', () => {
  it('shared briefing contains only audience-all signals; no truth references anywhere', () => {
    for (const sq of V2_SCENARIO_ARC) {
      const b = getQuarterBriefing(sq.quarter);
      const ids = new Set(sq.signals.filter(s => s.audience === 'all').map(s => s.id));
      expect(b.signals.every(s => ids.has(s.id))).toBe(true);
      expect(JSON.stringify(b)).not.toMatch(/truthReference|designNotes|consumerDemand|macroPressure/);
    }
  });

  it('each role sees its own private signals and none of another role\'s', () => {
    let snap = initializeGame();
    const inputs = inputsOf(runArc(ARC_STRATEGIES.find(s => s.id === 'balanced')!, 8));
    for (const inp of inputs) {
      const q = workingQuarter(snap)!;
      const sq = V2_SCENARIO_ARC.find(s => s.quarter === q)!;
      for (const role of V2_ROLES) {
        const brief = getRoleBrief(snap, role);
        const mine = sq.signals.filter(s => s.audience === role).map(s => s.id);
        const others = sq.signals.filter(s => s.audience !== role && s.audience !== 'all').map(s => s.id);
        for (const id of mine) expect(brief.signals.some(s => s.id === id)).toBe(true);
        for (const id of others) expect(brief.signals.some(s => s.id === id)).toBe(false);
        expect(JSON.stringify(brief)).not.toMatch(/truthReference/);
      }
      snap = resolveQuarter(snap, inp).snapshot;
    }
  });

  it('decision spec exposes the Q4 destinations, Q5 terms, Q6 menu, Q7 crisis and Q8 earned options at the right time', () => {
    const inputs = inputsOf(runArc(ARC_STRATEGIES.find(s => s.id === 'balanced')!, 8));
    const at = (q: number) => getDecisionSpec(replayInputs(inputs.slice(0, q - 1)))!;
    expect(at(1).destination).toBeUndefined();
    expect(at(4).destination!.options).toHaveLength(5);
    expect(at(5).opportunity!.acv).toBe(48);
    expect(at(6).management!.options.length).toBeGreaterThan(5);
    expect(at(7).crisis!.responses.map(r => r.id).sort()).toEqual(['absorb', 'contain', 'remediate']);
    expect(at(8).final!.options.find(o => o.id === 'continue')!.available).toBe(true);
    expect(getDecisionSpec(replayInputs(inputs))).toBeNull();
  });

  it('final outcome uses the frozen terminal score and the earned Q8 option', () => {
    const run = runArc(ARC_STRATEGIES.find(s => s.id === 'consumer-ai')!, 8);
    const snap = replayInputs(inputsOf(run));
    const out = getFinalOutcome(snap);
    expect(out.score).toEqual(scoreV2Company(run.finalState));
    expect(out.option).toBe(run.finalState.final.record!.option);
    expect(out.earnedOptions).toContain(out.option);
    expect(headlineOf(snap).final!.overall).toBe(out.score.overall);
    expect(() => getFinalOutcome(replayInputs(inputsOf(run).slice(0, 7)))).toThrow();
  });

  it('results carry plain-language explanations (no diagnostics dump)', () => {
    const run = runArc(ARC_STRATEGIES.find(s => s.id === 'enterprise100')!, 8);
    const snap = replayInputs(inputsOf(run));
    for (let q = 1; q <= 8; q++) {
      const r = resultForQuarter(snap, q);
      expect(r.explanation.length).toBeGreaterThan(1);
      for (const l of r.explanation) { expect(l.text.length).toBeLessThan(320); expect(l.text).not.toMatch(/undefined|NaN|\[object/); }
    }
  });
});
