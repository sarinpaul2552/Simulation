/**
 * "Looking back: which signals mattered?" (Batch 10A).
 *
 * Gate: available only once the team has completed Q4, read from the server-loaded `completed_quarter`
 * (the stage is derived from the server phase; there is no URL routing or deep link that could open it earlier).
 *
 * Content: the Q3 signals as authored in the scenario, the authored assessment (content/signalAssessments.ts) and
 * the team's own recorded values at the start of Q3 and the end of Q4. Recorded values are reported, not
 * interpreted: the team's own decisions also moved them.
 */
import { pathArc } from '../../../simulationV3/engineV3Paths';
import type { V2TeamState } from '../../../simulation/engineV2';
import { SignalAssessment, VERDICT_LABEL } from '../content/signalAssessments';
import { q3AssessmentsFor } from '../content/paths';
import type { QuarterRecord } from './history';

export const SIGNAL_REVEAL_QUARTER = 3;
export const SIGNAL_REVEAL_AFTER = 4;

/** Pure gate on the authoritative completed quarter. */
export function signalRevealAvailable(completedQuarter: number): boolean {
  return Number.isFinite(completedQuarter) && completedQuarter >= SIGNAL_REVEAL_AFTER;
}

const MEASURE: Record<SignalAssessment['measures'][number], { label: string; get: (s: V2TeamState) => number; fmt: (x: number) => string }> = {
  consumerRevenue: { label: 'Consumer revenue', get: s => s.segmentRevenue.consumer, fmt: x => `$${x.toFixed(1)}M` },
  consumerRetention: { label: 'Consumer retention', get: s => s.commercial.consumerRetention, fmt: x => `${x.toFixed(1)}%` },
  enterpriseRevenue: { label: 'Enterprise revenue', get: s => s.segmentRevenue.enterprise, fmt: x => `$${x.toFixed(1)}M` },
  enterprisePipeline: { label: 'Enterprise pipeline', get: s => s.commercial.enterprisePipeline, fmt: x => `$${x.toFixed(1)}M` },
  aiRevenue: { label: 'AI-native revenue', get: s => s.segmentRevenue.aiNative, fmt: x => `$${x.toFixed(1)}M` },
  aiAdoption: { label: 'AI adoption index', get: s => s.commercial.aiAdoptionIndex, fmt: x => x.toFixed(0) },
  universityRevenue: { label: 'University revenue', get: s => s.segmentRevenue.university, fmt: x => `$${x.toFixed(1)}M` },
  talent: { label: 'Talent', get: s => s.capabilities.talent, fmt: x => x.toFixed(0) },
};

export interface RevealRow {
  id: string;
  source: string;
  headline: string;
  verdict: SignalAssessment['verdict'];
  verdictLabel: string;
  showed: string;
  lesson: string;
  /** Authored truth note this assessment restates (null when the scenario has none). */
  basis: string | null;
  cited: boolean;
  recorded: { label: string; start: string; end: string }[];
}

/**
 * Build the reveal. Returns null unless the gate is open and the Q3 and Q4 records exist, so a caller can never
 * render it early even if it is mounted.
 */
export function buildSignalReveal(history: QuarterRecord[], completedQuarter: number, citedIds: string[] = []): RevealRow[] | null {
  if (!signalRevealAvailable(completedQuarter)) return null;
  const q3 = history[SIGNAL_REVEAL_QUARTER - 1], q4 = history[SIGNAL_REVEAL_AFTER - 1];
  if (!q3 || !q4) return null;
  // The game's own market path (V2 games: the original arc, identical to path A).
  const path = q3.path ?? 'A';
  const signals = pathArc(path).find(s => s.quarter === SIGNAL_REVEAL_QUARTER)?.signals ?? [];
  return q3AssessmentsFor(path).flatMap(a => {
    const sig = signals.find(s => s.id === a.id);
    if (!sig) return [];
    return [{
      id: a.id, source: a.source, headline: sig.headline, verdict: a.verdict, verdictLabel: VERDICT_LABEL[a.verdict],
      showed: a.showed, lesson: a.lesson, basis: sig.truthReference?.note ?? null, cited: citedIds.includes(a.id),
      recorded: a.measures.map(m => ({ label: MEASURE[m].label, start: MEASURE[m].fmt(MEASURE[m].get(q3.before)), end: MEASURE[m].fmt(MEASURE[m].get(q4.after)) })),
    }];
  });
}
