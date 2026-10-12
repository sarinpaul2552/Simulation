/**
 * Test and analysis helper: turns Test Lab arc strategies into production input logs (the same inputs a classroom
 * team would commit), so analysis runs through the production replay path. Never imported by the app.
 */
import { runArc, V2ArcRun, V2ArcStrategy } from '../../../testlab/utils/v2ScenarioArc';
import type { V2PlayerQuarterInput } from '../types';

export function inputsOf(run: V2ArcRun): V2PlayerQuarterInput[] {
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

export const arcInputs = (st: V2ArcStrategy, quarters = 8) => inputsOf(runArc(st, quarters));
