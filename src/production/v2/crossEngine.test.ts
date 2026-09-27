/**
 * Batch 6 · live finding: JavaScript engines may differ by 1 ULP in transcendental functions (Math.tanh/pow/exp).
 * A game stored by one browser engine replays on another with ~1e-16 relative differences in diagnostic values.
 * Restoration and the facilitator audit must tolerate that (economic figures are otherwise identical), while any
 * material difference (tampering, divergence) must still be rejected.
 */
import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc } from '../../testlab/utils/v2ScenarioArc';
import { replayInputs, verifySnapshot, headlineOf } from './adapter';
import { auditTeam } from './gameService';
import { toStorable, fromStorable, V2GameSnapshot } from './snapshot';
import type { V2PlayerQuarterInput } from './types';

const nextUlp = (x: number) => { const b = new Float64Array([x]); const i = new BigInt64Array(b.buffer); i[0] += 1n; return b[0]; };

function inputsOf(): V2PlayerQuarterInput[] {
  return runArc(ARC_STRATEGIES.find(s => s.id === 'enterprise-ai')!, 8).quarters.map(h => {
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

/** A snapshot "as stored by another engine": the same game with 1-ULP differences in state and diagnostics. */
function otherEngineSnapshot(): V2GameSnapshot {
  const snap = fromStorable(toStorable(replayInputs(inputsOf())));
  const s = snap.state;
  const pv = s.commercialHistory[5].indicators.find(i => i.indicator === 'premiumValue')!;
  pv.target = nextUlp(pv.target);
  s.commercial.premiumValue = nextUlp(s.commercial.premiumValue);
  s.ledgerHistory[6].revenue = nextUlp(s.ledgerHistory[6].revenue);
  s.cash = nextUlp(s.cash);
  return snap;
}

describe('Batch 6 · cross-engine restoration', () => {
  it('a snapshot with 1-ULP engine differences restores and verifies', () => {
    expect(verifySnapshot(otherEngineSnapshot()).ok).toBe(true);
  });

  it('material differences are still rejected (tampering / divergence)', () => {
    const snap = otherEngineSnapshot();
    snap.state.cash += 0.01;
    expect(verifySnapshot(snap).ok).toBe(false);
    const snap2 = otherEngineSnapshot();
    snap2.state.destination = { ...snap2.state.destination!, id: 'consumer-ai' };
    expect(verifySnapshot(snap2).ok).toBe(false);
  });

  it('facilitator audit tolerates 1-ULP headline differences but flags forged figures', () => {
    const inputs = inputsOf();
    const h = JSON.parse(JSON.stringify(headlineOf(replayInputs(inputs))));
    expect(auditTeam({ completed_quarter: 8, headline: { ...h, revenue: nextUlp(h.revenue) }, inputs }).status).toBe('verified');
    expect(auditTeam({ completed_quarter: 8, headline: { ...h, cash: h.cash + 1 }, inputs }).status).toBe('mismatch');
  });
});
