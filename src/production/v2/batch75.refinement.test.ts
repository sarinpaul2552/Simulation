import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, V2ArcRun } from '../../testlab/utils/v2ScenarioArc';
import { scoreV2Company } from '../../simulation/engineV2Scoring';
import { replayInputs } from './adapter';
import type { V2PlayerQuarterInput } from './types';
import { gameHistory } from './insights/history';
import { cashBridge, decisionConsequences, executiveHeadline, capacityEstimate, nominalGain, timeToImpact, BUCKETS } from './insights/consequences';
import { buildLearningReport } from './insights/report';
import { buildTeamDebrief } from './insights/debrief';
import { healthIndicators } from './insights/dashboard';
import { CHAPTERS } from './content/chapters';
import { commitmentModeOf } from './api';
import { V2_PRESENTATION_MODES, pick } from './content/modes';
import { getV2Baseline } from '../../simulation/engineV2';

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
const BAD = /undefined|NaN|\[object|Infinity/;
const TRUTH = /truthReference|designNotes|macroPressure|\b(consumerDemand|enterpriseDemand|aiNativeDemand|universityDemand)\b/;

describe('Batch 7.5 · cash bridge reconciles exactly with the frozen engine', () => {
  for (const g of games) {
    it(`${g.id}: every quarter`, () => {
      const h = gameHistory(replayInputs(g.inputs));
      for (const r of h) {
        const b = cashBridge(r);
        expect(b.reconciles, `Q${r.quarter}`).toBe(true);
        expect(b.closing).toBe(r.after.cash);
        expect(b.opening).toBe(r.before.cash);
        const items = b.eventItems.reduce((t, i) => t + i.amount, 0);
        expect(Math.abs(items - b.eventCosts)).toBeLessThan(1e-9);
        const fin = b.financingItems.reduce((t, i) => t + i.amount, 0);
        expect(Math.abs(fin - b.financing)).toBeLessThan(1e-9);
      }
    });
  }
});

describe('Batch 7.5 · decision consequences acknowledge the actual decision', () => {
  it('holding the full envelope produces the retained-cash consequence (no invented revenue)', () => {
    const h = gameHistory(replayInputs(games.find(g => g.id === 'cash100')!.inputs));
    const c = decisionConsequences(h[0], 'mba');
    const held = c.find(x => x.id === 'held-cash')!;
    expect(held.decision).toMatch(/retained the full \$30M/);
    expect(held.immediate).toMatch(/preserved cash/);
    expect(held.longerTerm).toMatch(/No new capability investment/);
    expect(held.uncertainty).toMatch(/may|could/);
  });
  it('concentrated, paired and diversified allocations are recognised', () => {
    const at = (id: string, q = 1) => decisionConsequences(gameHistory(replayInputs(games.find(g => g.id === id)!.inputs))[q - 1], 'mba').map(x => x.id);
    expect(at('consumer100')).toContain('concentrated');
    expect(at('consumer-ai')).toContain('paired');
    expect(at('balanced')).toContain('diversified');
  });
  it('event decisions (Q4 destination, Q5 contract, Q6 recession, Q7 crisis, Q8 option) lead their quarter', () => {
    const h = gameHistory(replayInputs(games.find(g => g.id === 'balanced')!.inputs));
    expect(decisionConsequences(h[3], 'mba')[0].id).toBe('destination');
    expect(decisionConsequences(h[4], 'mba')[0].id).toBe('opportunity');
    expect(decisionConsequences(h[6], 'mba')[0].id).toBe('crisis');
    expect(decisionConsequences(h[7], 'mba')[0].id).toBe('final');
  });
  it('financing decisions describe debt, interest and dilution from recorded state', () => {
    const withDebt = games.flatMap(g => gameHistory(replayInputs(g.inputs))).find(r => r.input.financing?.some(f => f.kind === 'debt'));
    expect(withDebt).toBeDefined();
    const c = decisionConsequences(withDebt!, 'mba').find(x => x.id === 'debt')!;
    expect(c.longerTerm).toContain(`$${withDebt!.after.financing.debt.toFixed(1)}M`);
  });
  for (const g of games) {
    it(`${g.id}: every consequence and headline is well-formed in both modes`, () => {
      const h = gameHistory(replayInputs(g.inputs));
      for (const r of h) {
        for (const mode of V2_PRESENTATION_MODES) {
          const cs = decisionConsequences(r, mode);
          expect(cs.length).toBeGreaterThan(0);
          for (const c of cs) for (const t of [c.decision, c.immediate, c.longerTerm, c.uncertainty]) { expect(t.length).toBeGreaterThan(5); expect(t).not.toMatch(BAD); expect(t).not.toMatch(TRUTH); }
        }
        const hl = executiveHeadline(r, h[r.quarter - 2]);
        expect(hl.text).not.toMatch(BAD);
        // Headline direction never contradicts the recorded numbers
        const prevRev = r.quarter > 1 ? h[r.quarter - 2].after.revenue : r.before.revenue;
        if (/growing|pay off/i.test(hl.text)) expect(r.after.revenue).toBeGreaterThan(prevRev);
        if (/falling|slipped/i.test(hl.text)) expect(r.after.revenue).toBeLessThan(prevRev);
        if (/cash is tightening/i.test(hl.text)) expect(r.after.cash).toBeLessThan(r.before.cash);
      }
    });
  }
});

describe('Batch 7.5 · allocation workspace guidance uses engine mechanics', () => {
  it('time to impact follows the maturation schedule', () => {
    expect(timeToImpact('consumer').schedule[0]).toBe(0.5);
    expect(timeToImpact('aiProduct').schedule[0]).toBe(0.2);
  });
  it('nominal gain shows diminishing returns and clamps to the calibrated range', () => {
    for (const b of BUCKETS) {
      expect(nominalGain(b, 10)).toBeGreaterThan(nominalGain(b, 5));
      expect(nominalGain(b, 20) - nominalGain(b, 10)).toBeLessThan(nominalGain(b, 10) + 1e-9);
      expect(nominalGain(b, 45)).toBe(nominalGain(b, 30));
    }
  });
  it('capacity estimate rises with breadth and size', () => {
    const s = getV2Baseline();
    const z = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 30 };
    const one = capacityEstimate(s, { ...z, aiProduct: 10, cashReserve: 20 });
    const five = capacityEstimate(s, { ...z, consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6, cashReserve: 0 });
    const heavy = capacityEstimate(s, { ...z, aiProduct: 30, cashReserve: 0 });
    expect(five.coordination).toBeGreaterThan(one.coordination);
    expect(heavy.ratio).toBeGreaterThan(one.ratio);
    expect(capacityEstimate(s, z).ratio).toBe(0);
  });
});

describe('Batch 7.5 · final report interpretation', () => {
  for (const g of games) {
    it(`${g.id}: vulnerabilities, alternatives, conclusion and questions are data-backed`, () => {
      const snap = replayInputs(g.inputs);
      for (const mode of V2_PRESENTATION_MODES) {
        const r = buildLearningReport(snap, mode);
        expect(r.score).toEqual(scoreV2Company(snap.state));
        expect(r.conclusion).toMatch(/^You built a /);
        expect(r.conclusion).toContain(`$${snap.state.revenue.toFixed(1)}M`);
        expect(r.questions.length).toBeGreaterThanOrEqual(3);
        expect(r.vulnerabilities.length).toBeLessThanOrEqual(3);
        for (const f of [...r.vulnerabilities, ...r.notPursued]) { expect(f.evidence.length).toBeGreaterThan(10); expect(f.evidence).not.toMatch(BAD); }
        expect(JSON.stringify(r)).not.toMatch(TRUTH);
      }
    });
  }
  it('a declined Q5 contract is listed as an alternative not pursued, never valued', () => {
    const g = games.find(x => { const s = replayInputs(x.inputs); return s.inputs[4]?.opportunity?.accept === false; })!;
    const r = buildLearningReport(replayInputs(g.inputs), 'mba');
    const f = r.notPursued.find(x => /Declined/.test(x.title))!;
    expect(f).toBeDefined();
    expect(f.evidence).not.toMatch(/would have (earned|made|generated)/);
  });
  it('high performers still get discussion questions', () => {
    const best = games.map(g => ({ g, s: scoreV2Company(replayInputs(g.inputs).state).overall })).sort((a, b) => b.s - a.s)[0];
    expect(buildLearningReport(replayInputs(best.g.inputs), 'mba').questions.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Batch 7.5 · team commitment in the debrief', () => {
  const g = games.find(x => x.id === 'balanced')!;
  it('agreement statements are reported as team commitments, never as individual votes', () => {
    const d = buildTeamDebrief({ team_id: 't', team_name: 'T', inputs: g.inputs, agreements: { 1: { agreement: 'agreed', committed_by: null }, 2: { agreement: 'discussed', committed_by: 'CEO' } } });
    expect(d.commitments[0]).toMatchObject({ quarter: 1, kind: 'agreement' });
    expect(d.commitments[1].text).toMatch(/different opinions.*CEO/);
    expect(d.commitments[2].kind).toBe('none');
    expect(d.disagreements).toHaveLength(0); // no votes were fabricated
    expect(d.questions.join(' ')).toMatch(/Q2 the team reported different opinions/);
  });
  it('private votes stay distinguishable from agreements', () => {
    const d = buildTeamDebrief({ team_id: 't', team_name: 'T', inputs: g.inputs.slice(0, 2), votes: { 1: { CEO: 'support', CFO: 'oppose', People: 'oppose', Product: 'support', Growth: 'support' } }, agreements: { 2: { agreement: 'leader', committed_by: null } } });
    expect(d.commitments.map(c => c.kind)).toEqual(['votes', 'agreement']);
    expect(d.disagreements.map(x => x.quarter)).toEqual([1]);
  });
});

describe('Batch 7.5 · commitment mode compatibility and narrative content', () => {
  it('sessions without the migration keep their original voting behaviour', () => {
    expect(commitmentModeOf({ participation_mode: 'team_device' })).toBe('private_vote');
    expect(commitmentModeOf({ participation_mode: 'individual_device' })).toBe('private_vote');
    expect(commitmentModeOf({ participation_mode: 'voting_disabled' })).toBe('none');
    expect(commitmentModeOf({ participation_mode: 'team_device', commitment_mode: 'team_commitment' })).toBe('team_commitment');
  });
  it('every quarter has a chapter in both modes, with no hidden truth', () => {
    for (let q = 1; q <= 8; q++) {
      expect(CHAPTERS[q].title.length).toBeGreaterThan(3);
      for (const m of V2_PRESENTATION_MODES) expect(pick(m, CHAPTERS[q].sub).length).toBeGreaterThan(20);
    }
    expect(JSON.stringify(CHAPTERS)).not.toMatch(TRUTH);
  });
  it('strategic readiness after Q4 reflects the capabilities the strategy relies on (not time alone)', () => {
    const cash = replayInputs(games.find(g => g.id === 'cash100')!.inputs).state;
    const strong = replayInputs(games.find(g => g.id === 'consumer-ai')!.inputs).state;
    const s = (st: typeof cash) => healthIndicators(st).find(h => h.id === 'strategy')!.score;
    expect(s(strong)).toBeGreaterThan(s(cash));
    expect(s(cash)).toBeLessThan(100);
  });
});
