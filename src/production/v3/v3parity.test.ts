/**
 * V3 fork integrity: with every V3 mechanism switched off, the V3 engine on market path A reproduces the frozen V2
 * engine exactly (same states, same ledgers) for every Test Lab arc strategy. This proves the fork itself introduces no
 * change, so every V2→V3 difference reported by the laboratory comes from a named mechanism.
 */
import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, type V2ArcRun } from '../../testlab/utils/v2ScenarioArc';
import * as V2 from '../v2/adapter';
import * as V3 from './adapter';
import type { V2PlayerQuarterInput } from '../v2/types';
import { withV3Economics, ALL_MECHANISMS_OFF } from '../../simulationV3/engineV3Config';
import { firstDifference } from '../v2/snapshot';

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

describe('V3 fork parity (all V3 mechanisms off, path A)', () => {
  it('reproduces the frozen V2 engine exactly for every arc strategy', () => {
    withV3Economics({ mechanisms: ALL_MECHANISMS_OFF }, () => {
      for (const st of ARC_STRATEGIES) {
        const inputs = inputsOf(runArc(st, 8));
        const v2 = V2.replayInputs(inputs);
        const v3 = V3.replayInputs(inputs, 'A');
        expect(firstDifference(v3.state, v2.state), st.id).toBeNull();
        expect(v3.engineVersion).toBe('v3-econ-1.0');
        expect(v3.marketPath).toBe('A');
      }
    });
  });
});
