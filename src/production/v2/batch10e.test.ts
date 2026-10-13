/**
 * Batch 10E — facilitator experience and board report. Pure-module tests; no engine, valuation or scoring change.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ARC_STRATEGIES, runArc, V2ArcRun } from '../../testlab/utils/v2ScenarioArc';
import type { V2DebriefRow } from './api';
import type { V2Deliberation, V2PlayerQuarterInput } from './types';
import { replayInputs } from './adapter';
import { gameHistory } from './insights/history';
import { valuationSeries } from './insights/valuation';
import { encodeReflection, BELIEFS, RISKS } from './content/deliberationContent';
import { DECISION_FRAMING } from './content/decisionFraming';
import {
  buildFacilitatorTeams, teamLabels, visibleNotes, reflectionKey, q3RevealOpen, q3SignalPanel, changeIndicators, teamTimeline,
  teamPathSummary, classPattern, defaultDiscussionQuarter, q3ToQ4, biggestChanges, learningTally, ALIGNMENT_RULES, CHANGE_RULES, fourColumns,
  type FacQuarter,
} from './insights/facilitator';
import { clockReducer, clockRemainingMs, clockText, initialClock, CLOCK_PRESETS } from './insights/stageClock';
import { ownTeam, rationalePrompts, intentOutcomeRows } from './insights/intentOutcome';

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
const delib = (q: number, k = 0): V2Deliberation => ({
  priorityId: DECISION_FRAMING[q].priorities[k % DECISION_FRAMING[q].priorities.length].id,
  beliefId: BELIEFS[q][0].id, confidence: k % 2 ? 5 : 1, riskIds: [RISKS[q][0].id],
  evidenceIds: q === 3 ? [DECISION_FRAMING[3].evidence![k % 8].id, DECISION_FRAMING[3].evidence![(k + 3) % 8].id] : undefined,
});
const row = (id: string, name: string, inputs: V2PlayerQuarterInput[], k = 0, extra: Partial<V2DebriefRow> = {}): V2DebriefRow => ({
  team_id: id, team_name: name, completed_quarter: inputs.length, inputs,
  deliberations: inputs.map((_, i) => delib(i + 1, k + i)),
  reflections: inputs.map((_, i) => encodeReflection({ v: 1, learning: i % 2 ? ['different'] : ['market'], note: `Note from ${name} Q${i + 1}` })),
  votes: {}, ...extra,
});
const strategies = ARC_STRATEGIES.slice(0, 6).map(s => ({ id: s.id, inputs: inputsOf(runArc(s, 8)) }));
const GRADE = /\b(good|bad|poor|excellent|failed|failure|wrong|best|worst|score|grade|rating|winner|loser)\b/i;
const CAUSAL = /\b(because|caused|led to|resulted in|due to|thanks to|therefore)\b/i;

describe('Batch 10E · facilitator model built from the existing debrief rows', () => {
  it('replays each team exactly; prices come from the existing valuation; reflections decode (JSON and legacy text)', () => {
    const r = row('t1', 'Alpha', strategies[0].inputs);
    r.reflections[2] = 'legacy free-text reflection';
    const [t] = buildFacilitatorTeams([r]);
    const h = gameHistory(replayInputs(strategies[0].inputs));
    const prices = valuationSeries(h).points;
    expect(t.quarters).toHaveLength(8);
    t.quarters.forEach((q, i) => { expect(q.record.after.revenue).toBe(h[i].after.revenue); expect(q.price).toBe(prices[i + 1].price); });
    expect(t.quarters[2].reflection).toEqual({ learning: [], note: 'legacy free-text reflection' });
    expect(t.quarters[1].reflection!.learning).toEqual(['different']);
  });

  it('older sessions (no 10A fields, two risks, no reflections) still build without errors', () => {
    const inputs = strategies[1].inputs.slice(0, 5);
    const old: V2DebriefRow = { team_id: 'o', team_name: 'Old', completed_quarter: 5, inputs, deliberations: inputs.map((_, i) => ({ beliefId: BELIEFS[i + 1][0].id, riskIds: [RISKS[i + 1][0].id, RISKS[i + 1][1].id], confidence: 3 })), reflections: inputs.map(() => null), votes: {} };
    const [t] = buildFacilitatorTeams([old]);
    const rows = teamTimeline(t, 'mba');
    expect(rows).toHaveLength(5);
    expect(rows[0].cols.intended.priority).toBeNull();
    expect(rows[0].cols.intended.risk!.split(' · ')).toHaveLength(2);
    for (const r of rows) expect(JSON.stringify(r)).not.toMatch(/undefined|NaN/);
  });

  it('team with no completed quarter is handled', () => {
    const [t] = buildFacilitatorTeams([{ team_id: 'e', team_name: 'Empty', completed_quarter: 0, inputs: [], deliberations: [], reflections: [], votes: {} }]);
    expect(t.quarters).toEqual([]);
    expect(teamPathSummary(teamTimeline(t, 'mba'))).toBe('No quarter completed yet.');
  });
});

describe('Batch 10E · projector privacy', () => {
  const teams = buildFacilitatorTeams([row('a', 'Phoenix', strategies[0].inputs.slice(0, 3)), row('b', 'Orion', strategies[1].inputs.slice(0, 3), 1)]);

  it('projector view uses anonymised, stable labels; normal view uses team names', () => {
    expect(teamLabels(teams, true)).toEqual({ a: 'Team A', b: 'Team B' });
    expect(teamLabels(teams, false)).toEqual({ a: 'Phoenix', b: 'Orion' });
    expect(Object.values(teamLabels(teams, true)).join()).not.toMatch(/Phoenix|Orion/);
    const many = Array.from({ length: 30 }, (_, i) => ({ teamId: `t${i}`, name: `N${i}` }));
    expect(new Set(Object.values(teamLabels(many, true))).size).toBe(30);
  });

  it('free-text reflections: none on the projector until the facilitator selects one; selection is per note', () => {
    expect(visibleNotes(teams, new Set(), true)).toEqual([]);
    expect(visibleNotes(teams, new Set(), false)).toHaveLength(6);
    expect(visibleNotes(teams, new Set(), false).every(n => !n.selected)).toBe(true);
    const sel = new Set([reflectionKey('b', 2)]);
    const shown = visibleNotes(teams, sel, true);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ teamId: 'b', quarter: 2, note: 'Note from Orion Q2' });
    expect(visibleNotes(teams, sel, true, 1)).toEqual([]);
  });
});

describe('Batch 10E · Q3 reveal gate (no override)', () => {
  it('opens only when every participating team has completed Q4', () => {
    expect(q3RevealOpen([])).toBe(false);
    expect(q3RevealOpen([{ started: false, completed_quarter: 0 }])).toBe(false);
    expect(q3RevealOpen([{ started: true, completed_quarter: 4 }, { started: true, completed_quarter: 3 }])).toBe(false);
    expect(q3RevealOpen([{ started: true, completed_quarter: 4 }, { started: true, completed_quarter: 8 }, { started: false, completed_quarter: 0 }])).toBe(true);
  });

  it('assessments are absent from every output while the gate is closed', () => {
    const teams = buildFacilitatorTeams(strategies.slice(0, 3).map((s, i) => row(`t${i}`, `T${i}`, s.inputs.slice(0, 4), i)));
    const closed = q3SignalPanel(teams, false, 'mba');
    expect(closed).toHaveLength(8);
    expect(closed.every(r => r.verdict === null && r.showed === null)).toBe(true);
    expect(q3ToQ4(teams, false, 'mba').every(r => r.verdicts.every(v => v === null))).toBe(true);
    const open = q3SignalPanel(teams, true, 'mba');
    expect(open.every(r => r.verdict !== null)).toBe(true);
    // citation counts match the deliberations
    const total = teams.reduce((n, t) => n + (t.quarters[2].deliberation?.evidenceIds?.length ?? 0), 0);
    expect(open.reduce((n, r) => n + r.citedBy.length, 0)).toBe(total);
  });
});

describe('Batch 10E · change-of-direction indicators', () => {
  const base = buildFacilitatorTeams([row('x', 'X', strategies[0].inputs)])[0];
  const withAlloc = (q: FacQuarter, a: Partial<V2PlayerQuarterInput['allocation']>, extra: Partial<FacQuarter> = {}): FacQuarter => {
    const alloc = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...a } as V2PlayerQuarterInput['allocation'];
    alloc.cashReserve = (extra.envelope ?? 30) - (alloc.consumer + alloc.enterprise + alloc.aiProduct + alloc.people + alloc.universityCredentials);
    return { ...q, envelope: 30, cap: null, ...extra, input: { ...q.input, allocation: alloc } };
  };
  const p = withAlloc(base.quarters[3], { consumer: 10, enterprise: 10, aiProduct: 10 });

  it('flags a move of $5M (not $4.5M) at the same budget', () => {
    expect(changeIndicators(p, withAlloc(base.quarters[4], { consumer: 10, enterprise: 10, aiProduct: 5.5, people: 4.5 })).changes.filter(c => c.kind === 'allocation').map(c => c.text.split(':')[0]))
      .toEqual(['AI & product', 'People']); // −4.5 / +4.5 = 15 points of the $30M budget → flagged by share, not by dollars
    expect(changeIndicators(p, withAlloc(base.quarters[4], { consumer: 10, enterprise: 10, aiProduct: 6, people: 4 })).changes.filter(c => c.kind === 'allocation')).toEqual([]);
    const five = changeIndicators(p, withAlloc(base.quarters[4], { consumer: 15, enterprise: 10, aiProduct: 5 })).changes.filter(c => c.kind === 'allocation');
    expect(five.map(c => c.text.split(':')[0]).sort()).toEqual(['AI & product', 'Consumer']);
  });

  it('a different budget or an investment cap switches to shares of the money invested and is stated as context', () => {
    const scaled = changeIndicators(p, withAlloc(base.quarters[7], { consumer: 15, enterprise: 15, aiProduct: 15 }, { envelope: 45 }));
    expect(scaled.changes.filter(c => c.kind === 'allocation')).toEqual([]); // same mix, bigger budget → no change
    expect(scaled.context[0].text).toMatch(/Budget changed from \$30.0M to \$45.0M/);
    const capped = changeIndicators(p, withAlloc(base.quarters[7], { consumer: 3.5, enterprise: 3.5, aiProduct: 3 }, { cap: 10 }));
    expect(capped.changes.filter(c => c.kind === 'allocation')).toEqual([]); // forced cut, same mix → not a change of direction
    expect(capped.context.some(c => /capped investment at \$10.0M/.test(c.text))).toBe(true);
  });

  it('priorities are compared only between quarters that ask the same question (Q4–Q8)', () => {
    const t = buildFacilitatorTeams([row('y', 'Y', strategies[0].inputs, 0)])[0];
    expect(changeIndicators(t.quarters[0], t.quarters[1]).changes.some(c => c.kind === 'priority')).toBe(false); // Q1→Q2 different questions
    expect(changeIndicators(t.quarters[4], t.quarters[5]).changes.some(c => c.kind === 'priority')).toBe(true); // Q5→Q6 rotating ids
  });

  it('thresholds are the approved ones and are stated', () => {
    expect(CHANGE_RULES.dollars).toBe(5);
    expect(CHANGE_RULES.sharePoints).toBe(0.15);
    expect(CHANGE_RULES.text).toMatch(/\$5M or 15 percentage points/);
  });
});

describe('Batch 10E · continuity, adaptation and potential misalignment — described, never scored', () => {
  it('flags a stated rule mismatch as a question, and only for priorities that have a rule', () => {
    expect(ALIGNMENT_RULES['q2-accelerate']).toBeUndefined();
    const inputs = strategies[0].inputs.map(i => ({ ...i }));
    const d = inputs.map((_, i) => delib(i + 1));
    d[4] = { ...d[4], priorityId: 'resilience' };
    inputs[4] = { ...inputs[4], allocation: { consumer: 10, enterprise: 10, aiProduct: 10, people: 0, universityCredentials: 0, cashReserve: 0 } };
    const t = buildFacilitatorTeams([{ ...row('m', 'M', inputs), deliberations: d }])[0];
    const r = teamTimeline(t, 'mba');
    expect(r[4].misalignment).toMatch(/^Potential misalignment: the stated priority was “Protect cash and resilience”, and the whole budget was invested/);
    expect(r[4].misalignment).toMatch(/may have had reasons/);
  });

  it('all wording across every strategy and quarter is neutral: no grades, verdicts or causal claims', () => {
    for (const [k, s] of strategies.entries()) {
      const t = buildFacilitatorTeams([row(`s${k}`, s.id, s.inputs, k)])[0];
      const rows = teamTimeline(t, 'undergraduate');
      const texts = [teamPathSummary(rows), ...rows.flatMap(r => [r.patternText, r.misalignment ?? '', ...r.changes.map(c => c.text), ...r.context.map(c => c.text)])];
      for (const x of texts) { expect(x, x).not.toMatch(GRADE); expect(x, x).not.toMatch(CAUSAL); expect(x).not.toMatch(/undefined|NaN/); }
      expect(rows[0].pattern).toBe('starting-position');
      expect(rows.slice(1).every(r => r.pattern === 'continuity' || r.pattern === 'adaptation')).toBe(true);
    }
  });
});

describe('Batch 10E · class comparison and final debrief', () => {
  const teams = buildFacilitatorTeams(strategies.slice(0, 4).map((s, i) => row(`t${i}`, `Team ${i}`, s.inputs.slice(0, i === 3 ? 5 : 8), i)));

  it('defaults to the latest quarter every team has completed; pattern lines count the class', () => {
    expect(defaultDiscussionQuarter(teams)).toBe(5);
    const l2 = classPattern(teams, 2, 'undergraduate');
    expect(l2[0]).toMatch(/^Stances: /);
    expect(l2[0].match(/(\d+) ×/g)!.reduce((n, x) => n + parseInt(x), 0)).toBe(4);
    expect(classPattern(teams, 3, 'undergraduate').some(l => l.startsWith('Signals cited: '))).toBe(true);
    expect(classPattern(teams, 4, 'undergraduate').some(l => l.startsWith('Decisions: '))).toBe(true);
    expect(classPattern(teams, 8, 'mba').find(l => l.startsWith('Largest'))!.match(/(\d+) ×/g)!.reduce((n, x) => n + parseInt(x), 0)).toBe(3);
  });

  it('four columns are filled for every team and quarter', () => {
    for (const t of teams) for (const q of t.quarters) {
      const c = fourColumns(q, 'mba');
      expect(c.intended.priority).toBeTruthy();
      expect(c.decided.allocation).toBeTruthy();
      expect(c.happened.revenue).toMatch(/^\$[\d.]+M → \$[\d.]+M \([+−]\$[\d.]+M\)$/);
      expect(c.learned.choices.length).toBeGreaterThan(0);
      if (q.quarter === 3) expect(c.intended.signals).toHaveLength(2);
    }
  });

  it('final debrief pieces: Q3→Q4 table, largest changes (ordering only) and learning counts', () => {
    expect(q3ToQ4(teams, true, 'mba')).toHaveLength(4);
    const big = biggestChanges(teams, 3);
    expect(big.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < big.length; i++) expect(big[i - 1].size).toBeGreaterThanOrEqual(big[i].size);
    expect(new Set(big.map(g => `${g.teamId}:${g.quarter}`)).size).toBe(big.length); // one entry per team and quarter
    for (const g of big) for (const x of g.items) { expect(x).not.toMatch(GRADE); expect(x).not.toMatch(CAUSAL); }
    expect(learningTally(teams, 2, 'undergraduate')).toBe('4 × We would make a different call now');
  });
});

describe('Batch 10E · facilitator stage clock (never advances or locks anything)', () => {
  it('counts down, pauses, resets and stops at "Time"', () => {
    let s = initialClock(6);
    expect(clockText(s, 0)).toBe('6:00');
    s = clockReducer(s, { type: 'start', now: 1_000 });
    expect(clockText(s, 61_000)).toBe('5:00');
    s = clockReducer(s, { type: 'pause', now: 61_000 });
    expect(clockRemainingMs(s, 999_999)).toBe(300_000);
    s = clockReducer(s, { type: 'start', now: 100_000 });
    expect(clockText(s, 100_000 + 300_000)).toBe('Time');
    expect(clockRemainingMs(s, 10 ** 9)).toBe(0);
    s = clockReducer(s, { type: 'reset' });
    expect(clockText(s, 10 ** 9)).toBe('6:00');
    expect(clockText(clockReducer(s, { type: 'set', minutes: 9 }), 0)).toBe('9:00');
    expect(CLOCK_PRESETS.map(p => p.minutes)).toEqual([6, 9, 20]);
  });

  let src = '';
  beforeAll(async () => {
    const fsName = 'node:fs';
    const fs = (await import(/* @vite-ignore */ fsName)) as { readFileSync: (p: string, e: string) => string };
    src = fs.readFileSync(new URL('./insights/stageClock.ts', import.meta.url).pathname, 'utf8');
  });
  it('has no access to the API or the game (no imports at all)', () => {
    expect(src).not.toMatch(/^import /m);
    expect(src).not.toMatch(/fetch\(|setOpenQuarter|setPhase|api\./);
  });
});

describe('Batch 10E · board report: intent and outcome', () => {
  it('uses the same facts as the facilitator view, and prompts quote only the team’s own recorded rationale', () => {
    const inputs = strategies[2].inputs;
    const r = row('own', 'Ours', inputs, 2);
    const t = ownTeam('Ours', inputs.map((input, i) => ({ quarter: i + 1, input, deliberation: r.deliberations[i], reflection: r.reflections[i] })));
    const fac = buildFacilitatorTeams([r])[0];
    expect(intentOutcomeRows(t, 'mba').map(x => x.cols)).toEqual(teamTimeline(fac, 'mba').map(x => x.cols));
    const prompts = rationalePrompts(t, 'mba');
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.length).toBeLessThanOrEqual(3);
    const q3 = prompts.find(p => p.id === 'q3-evidence')!;
    const cited = (r.deliberations[2]!.evidenceIds ?? []).map(id => DECISION_FRAMING[3].evidence!.find(e => e.id === id)!.label.mba);
    for (const c of cited) expect(q3.question).toContain(c);
    for (const p of prompts) { expect(p.question).not.toMatch(GRADE); expect(p.question).not.toMatch(CAUSAL); }
  });
});
