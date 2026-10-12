import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, V2ArcRun } from '../../testlab/utils/v2ScenarioArc';
import { V2_SCENARIO_ARC } from '../../simulation/engineV2Scenario';
import { scoreV2Company } from '../../simulation/engineV2Scoring';
import { initializeGame, resolveQuarter, replayInputs, getRoleBrief, workingQuarter, V2_ROLES, canonical } from './adapter';
import type { V2PlayerQuarterInput } from './types';
import { QUARTER_CARDS, SIGNAL_PLAIN, evidenceKind, EVIDENCE_LABEL } from './content/scenarioContent';
import { BELIEFS, RISKS, LEARNING_OPTIONS, BELIEF_TOPICS, CONFIDENCE_LEVELS, encodeReflection, decodeReflection } from './content/deliberationContent';
import { buildRoleBriefing } from './content/roleContent';
import { normalizeMode, pick, V2_PRESENTATION_MODES } from './content/modes';
import { gameHistory } from './insights/history';
import { financialCards, healthIndicators, trendSeries, benchmarks } from './insights/dashboard';
import { quarterStory } from './insights/explain';
import { reflectionEvidence } from './insights/reflection';
import { buildLearningReport } from './insights/report';
import { buildTeamDebrief } from './insights/debrief';
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
const games = ARC_STRATEGIES.map(st => ({ id: st.id, inputs: inputsOf(runArc(st, 8)) }));
const TRUTH = /truthReference|designNotes|macroPressure|\b(consumerDemand|enterpriseDemand|aiNativeDemand|universityDemand)\b|Engine diagnostic/;
const BAD_TEXT = /undefined|NaN|\[object|Infinity/;

describe('Batch 7 · 7A scenario content', () => {
  it('every quarter has a complete card in both modes, with no hidden truth', () => {
    for (let q = 1; q <= 8; q++) {
      const c = QUARTER_CARDS[q];
      expect(c, `Q${q}`).toBeDefined();
      for (const m of V2_PRESENTATION_MODES) {
        expect(pick(m, c.headline).length).toBeGreaterThan(5);
        expect(pick(m, c.whatHappened).length).toBeGreaterThan(20);
        expect(pick(m, c.challenge)).toMatch(/\?$/);
        expect(c.whyItMatters).toHaveLength(3);
      }
      expect(JSON.stringify(c)).not.toMatch(TRUTH);
    }
  });
  it('every scenario signal has a plain-language rewrite and an evidence label', () => {
    for (const sq of V2_SCENARIO_ARC) for (const s of sq.signals) {
      expect(SIGNAL_PLAIN[s.id], s.id).toBeTruthy();
      expect(EVIDENCE_LABEL[evidenceKind(s.reliability)]).toBeDefined();
    }
    expect(evidenceKind('measured')).toBe('company-data');
  });
  it('beliefs (4–5), risks (6) and learning options exist for every quarter; topics mapped', () => {
    for (let q = 1; q <= 8; q++) {
      expect(BELIEFS[q].length).toBeGreaterThanOrEqual(4);
      expect(BELIEFS[q].length).toBeLessThanOrEqual(5);
      expect(RISKS[q]).toHaveLength(6);
      for (const b of BELIEFS[q]) expect(BELIEF_TOPICS[b.id], b.id).toBeDefined();
    }
    expect(LEARNING_OPTIONS.length).toBeGreaterThanOrEqual(5);
    expect(CONFIDENCE_LEVELS.map(c => c.value)).toEqual([1, 3, 5]);
  });
  it('structured reflection round-trips; legacy free text is kept as a note', () => {
    const r = { v: 1 as const, learning: ['evidence', 'timing'], note: 'We moved late' };
    expect(decodeReflection(encodeReflection(r))).toEqual(r);
    expect(decodeReflection('plain old text')).toEqual({ v: 1, learning: [], note: 'plain old text' });
    expect(decodeReflection(null)).toBeNull();
  });
  it('mode normalisation falls back to MBA', () => {
    expect(normalizeMode('undergraduate')).toBe('undergraduate');
    expect(normalizeMode(undefined)).toBe('mba');
    expect(normalizeMode('nonsense')).toBe('mba');
  });
});

describe('Batch 8 · role briefings: six parts, role-visible information only, no recommendations', () => {
  const inputs = games.find(g => g.id === 'balanced')!.inputs;
  const DIRECTIVE = /\b(you should|(?<!whether )we should|we must invest|the best (choice|option|strategy)|recommend(ed|ation)?|suggested by your data|your data points here)\b/i;
  it('each role gets all six parts every quarter, built only from its own signals', () => {
    let snap = initializeGame();
    for (const inp of inputs) {
      const q = workingQuarter(snap)!;
      const sq = V2_SCENARIO_ARC.find(s => s.quarter === q)!;
      for (const role of V2_ROLES) for (const mode of V2_PRESENTATION_MODES) {
        const b = buildRoleBriefing(snap, role, mode);
        expect(b.responsibility.length).toBeGreaterThan(10);
        expect(b.position.length).toBeGreaterThan(0);
        expect(b.suggests.length).toBeGreaterThanOrEqual(2);
        expect(b.uncertain.length).toBeGreaterThanOrEqual(1);
        expect(b.objectives.length).toBeGreaterThanOrEqual(3);
        expect(b.discuss.length).toBeGreaterThanOrEqual(2);
        for (const d of b.discuss) expect(d.with).not.toBe(role);
        const allowed = new Set(getRoleBrief(snap, role).signals.map(s => s.id));
        for (const k of [...b.evidence, ...b.position]) expect(allowed.has(k.id), `${role} Q${q} ${k.id}`).toBe(true);
        const others = sq.signals.filter(s => s.audience !== role && s.audience !== 'all').map(s => s.id);
        for (const id of others) expect(b.evidence.some(k => k.id === id)).toBe(false);
        expect(b).not.toHaveProperty('recommendations');
        expect(b).not.toHaveProperty('suggested');
        const txt = JSON.stringify(b);
        expect(txt).not.toMatch(DIRECTIVE);
        expect(txt).not.toMatch(TRUTH);
        expect(txt).not.toMatch(BAD_TEXT);
      }
      snap = resolveQuarter(snap, inp).snapshot;
    }
  });
  it('current business position shows the starting value and the change from last quarter', () => {
    const snap = replayInputs(inputs.slice(0, 3));
    const cfo = buildRoleBriefing(snap, 'CFO', 'mba');
    const cash = cfo.position.find(p => p.id === 'cfo-cash')!;
    expect(cash.start).toBe('$60.0M');
    expect(cash.value).toBe(`$${snap.state.cash.toFixed(1)}M`);
    expect(cash.previous).toBe(`$${replayInputs(inputs.slice(0, 2)).state.cash.toFixed(1)}M`);
    expect(cash.change).toBeDefined();
  });
  it('undergraduate mode shows no more KPIs than MBA mode', () => {
    const snap = replayInputs(inputs.slice(0, 2));
    for (const role of V2_ROLES) {
      expect(buildRoleBriefing(snap, role, 'undergraduate').position.length).toBeLessThanOrEqual(buildRoleBriefing(snap, role, 'mba').position.length);
    }
  });
});

describe('Batch 7 · 7B dashboard (recorded history only)', () => {
  for (const g of games) {
    it(`${g.id}: cards, health, trends, benchmarks and stories are deterministic and well-formed`, () => {
      const snap = replayInputs(g.inputs);
      const h = gameHistory(snap);
      expect(h).toHaveLength(8);
      const tr = trendSeries(h);
      expect(tr).toHaveLength(9);
      expect(tr[0].quarter).toBe(0);
      for (let q = 1; q <= 8; q++) {
        const rec = h[q - 1];
        expect(tr[q].revenue).toBe(rec.after.revenue);
        expect(tr[q].cash).toBe(rec.after.cash);
        const cards = financialCards(h, q);
        expect(cards.map(c => c.id)).toEqual(expect.arrayContaining(['revenue', 'operatingProfit', 'margin', 'cash', 'debt', 'liquidity']));
        expect(cards.find(c => c.id === 'revenue')!.value).toBe(rec.after.revenue);
        expect(JSON.stringify(cards)).not.toMatch(BAD_TEXT);
        const health = healthIndicators(rec.after);
        expect(health).toHaveLength(5);
        for (const i of health) { expect(i.score).toBeGreaterThanOrEqual(0); expect(i.score).toBeLessThanOrEqual(100); }
        expect(healthIndicators(rec.after)).toEqual(health);
        for (const mode of V2_PRESENTATION_MODES) {
          const st = quarterStory(rec.consequence, rec.after, mode);
          expect(JSON.stringify(st)).not.toMatch(BAD_TEXT);
          expect(JSON.stringify(st)).not.toMatch(TRUTH);
        }
        expect(JSON.stringify(benchmarks(h, q))).not.toMatch(BAD_TEXT);
        for (const b of BELIEFS[q]) expect(JSON.stringify(reflectionEvidence(b.id, rec.before, rec.after))).not.toMatch(BAD_TEXT);
      }
      // determinism: a fresh replay gives identical dashboards
      const h2 = gameHistory(replayInputs(g.inputs));
      expect(financialCards(h2, 8)).toEqual(financialCards(h, 8));
    });
  }
  it('benchmarks only use the start, the previous quarter and documented targets', () => {
    const h = gameHistory(replayInputs(games[0].inputs));
    for (const b of benchmarks(h, 5)) expect(['start', 'previous', 'target']).toContain(b.source);
  });
});

describe('Batch 7 · 7C final report and facilitator debrief', () => {
  for (const g of games) {
    it(`${g.id}: report uses the frozen terminal score and only data-backed findings`, () => {
      const snap = replayInputs(g.inputs);
      for (const mode of V2_PRESENTATION_MODES) {
        const r = buildLearningReport(snap, mode);
        expect(r.score).toEqual(scoreV2Company(snap.state));
        expect(r.dimensions.map(d => d.score)).toEqual([r.score.financial, r.score.strategic, r.score.organizational]);
        expect(r.timeline).toHaveLength(8);
        expect(r.pivotal.length).toBeLessThanOrEqual(3);
        for (const f of [...r.strengths, ...r.struggles]) expect(f.evidence.length).toBeGreaterThan(5);
        expect(r.tradeoffs.length).toBeGreaterThan(0);
        const txt = JSON.stringify(r);
        expect(txt).not.toMatch(BAD_TEXT);
        expect(txt).not.toMatch(TRUTH);
        expect(txt.toLowerCase()).not.toMatch(/winning formula is|the correct answer|you should have/);
      }
    });
  }
  it('counterfactuals never throw, even for truncated or unusual games', () => {
    for (const g of games) for (let n = 1; n <= 8; n++) {
      const snap = replayInputs(g.inputs.slice(0, n));
      if (n === 8) expect(() => buildLearningReport(snap, 'mba')).not.toThrow();
      expect(() => gameHistory(snap)).not.toThrow();
    }
  });
  it('debrief reports disagreements from revealed votes and never uses private briefings', () => {
    const g = games.find(x => x.id === 'balanced')!;
    const d = buildTeamDebrief({
      team_id: 't1', team_name: 'Alpha', inputs: g.inputs,
      deliberations: g.inputs.map((_, i) => ({ beliefId: BELIEFS[i + 1][0].id, riskIds: [RISKS[i + 1][0].id], confidence: 3 })),
      votes: { 2: { CEO: 'support', CFO: 'oppose', People: 'concern', Product: 'support', Growth: 'support' }, 3: { CEO: 'support', CFO: 'support' } },
    });
    expect(d.completed).toBe(8);
    expect(d.decisions).toHaveLength(8);
    expect(d.disagreements.map(x => x.quarter)).toEqual([2]);
    expect(d.disagreements[0].text).toMatch(/CFO/);
    expect(d.final!.overall).toBe(scoreV2Company(replayInputs(g.inputs).state).overall);
    expect(d.questions.length).toBeGreaterThan(2);
    expect(JSON.stringify(d)).not.toMatch(TRUTH);
    expect(JSON.stringify(d)).not.toMatch(/briefing|perspective/i);
  });
  it('debrief handles an in-progress team (no final score yet)', () => {
    const d = buildTeamDebrief({ team_id: 't2', team_name: 'Beta', inputs: games[0].inputs.slice(0, 3) });
    expect(d.completed).toBe(3);
    expect(d.final).toBeNull();
  });
});

describe('Batch 7 · presentation-mode economic parity', () => {
  it('identical inputs give byte-identical snapshots and scores regardless of mode (mode never reaches the engine)', () => {
    for (const g of games) {
      const run = (): V2GameSnapshot => { let s = initializeGame(); for (const i of g.inputs) s = resolveQuarter(s, i).snapshot; return s; };
      const a = run(), b = run();
      expect(JSON.stringify(canonical(a.state))).toBe(JSON.stringify(canonical(b.state)));
      const ug = buildLearningReport(a, 'undergraduate'), mba = buildLearningReport(b, 'mba');
      expect(ug.score).toEqual(mba.score);
      expect(ug.timeline.map(t => [t.revenue, t.operatingProfit, t.cash])).toEqual(mba.timeline.map(t => [t.revenue, t.operatingProfit, t.cash]));
    }
  });
  it('the engine input type has no presentation field and the UI-only deliberation stays outside it', () => {
    const inp = games[0].inputs[0] as unknown as Record<string, unknown>;
    expect(Object.keys(inp)).not.toContain('presentation_mode');
    expect(Object.keys(inp)).not.toContain('deliberation');
  });
});
