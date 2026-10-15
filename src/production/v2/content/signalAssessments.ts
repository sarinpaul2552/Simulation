/**
 * Q3 SIGNAL ASSESSMENTS (Batch 10A) — "Looking back: which signals mattered?"
 *
 * Each assessment restates, in student language, the authored `truthReference` note and the scenario design note
 * for the Q3 signals in `src/simulation/engineV2Scenario.ts` (read-only; the engine is not changed). Nothing here
 * adds information beyond the authored scenario, and no figure is invented: the only numbers quoted are the
 * signal's own shown values and the authored truth notes.
 *
 * Verdicts are deliberately graded rather than right/wrong: "partly supported" and "incomplete" are used where the
 * authored truth supports a signal's direction but not its strength or completeness.
 *
 * Shown only after Q4 is completed (see insights/signalReveal.ts). The scenario data itself already ships in the
 * client bundle (pre-existing; see docs/BATCH10A_IMPLEMENTATION_INVENTORY.md §3).
 */
export type SignalVerdict = 'reliable' | 'overstated' | 'misleading' | 'partly-supported' | 'incomplete' | 'not-assessed';

export const VERDICT_LABEL: Record<SignalVerdict, string> = {
  reliable: 'Reliable',
  overstated: 'Direction right, size overstated',
  misleading: 'Misleading on its own',
  'partly-supported': 'Partly supported',
  incomplete: 'Incomplete',
  'not-assessed': 'No authored outcome',
};

export interface SignalAssessment {
  id: string;
  source: string;
  verdict: SignalVerdict;
  /** What the authored scenario says actually held in Q3. */
  showed: string;
  /** Why it matters for an executive reading evidence. */
  lesson: string;
  /** Recorded company measures to show alongside (the team's own Q3 → Q4 records). */
  measures: ('consumerRevenue' | 'consumerRetention' | 'enterpriseRevenue' | 'enterprisePipeline' | 'aiRevenue' | 'aiAdoption' | 'universityRevenue' | 'talent')[];
}

export const Q3_SIGNAL_ASSESSMENTS: SignalAssessment[] = [
  {
    id: 'q3-consumer-usage', source: 'Growth brief', verdict: 'overstated',
    showed: 'Usage fell sharply, but paying demand fell only about 5%. Free and casual users left first.',
    lesson: 'Usage is not revenue. A drop in activity can overstate the loss of paying customers.',
    measures: ['consumerRevenue', 'consumerRetention'],
  },
  {
    id: 'q3-consumer-paid-cohorts', source: 'CFO brief', verdict: 'reliable',
    showed: 'The estimated 2%–5% fall was consistent with the market’s fall in paying consumer demand.',
    lesson: 'Evidence closest to what customers pay for was the better guide to consumer revenue.',
    measures: ['consumerRevenue', 'consumerRetention'],
  },
  {
    id: 'q3-enterprise-rfps', source: 'Shared brief', verdict: 'reliable',
    showed: 'Enterprise demand was genuinely strengthening. As the signal said, procurement cycles are long, so revenue follows slowly.',
    lesson: 'A real signal can still take quarters to show up in revenue.',
    measures: ['enterprisePipeline', 'enterpriseRevenue'],
  },
  {
    id: 'q3-ai-engagement', source: 'Product brief', verdict: 'misleading',
    showed: 'Engagement rose strongly. Paying demand for AI-native products stayed well above normal but fell from its Q2 level, so rising engagement did not mean rising paying demand.',
    lesson: 'Engagement is not willingness to pay. Enthusiasm can grow much faster than paying demand.',
    measures: ['aiAdoption', 'aiRevenue'],
  },
  {
    id: 'q3-ai-wtp', source: 'Shared brief', verdict: 'reliable',
    showed: 'The truth sat in the lower-middle of the 5%–20% conversion range.',
    lesson: 'A wide range was honest about uncertainty. Planning for the middle or low end was more prudent than the top.',
    measures: ['aiRevenue'],
  },
  {
    id: 'q3-university', source: 'CEO brief', verdict: 'partly-supported',
    showed: 'University demand was mildly positive: the direction was right, the strength less than "strong" suggested.',
    lesson: 'Positive anecdotes can be right in direction and still overstate size.',
    measures: ['universityRevenue'],
  },
  {
    id: 'q3-competition', source: 'Shared brief', verdict: 'incomplete',
    showed: 'New consumer AI launches did slow compared with Q2, but competitors were still moving faster than normal.',
    lesson: '"Slowing down" is not the same as "back to normal". Compare with a baseline, not only with last quarter.',
    measures: ['consumerRevenue'],
  },
  {
    id: 'q3-people-strain', source: 'People brief', verdict: 'not-assessed',
    showed: 'The scenario records no market outcome for this signal, so it is not assessed here. Your own talent record is shown instead.',
    lesson: 'Some signals describe pressure inside the company. Your own records are the evidence.',
    measures: ['talent'],
  },
];

export const SIGNAL_REVEAL_SUMMARY =
  'In Q3, measures of attention (usage, engagement) pointed one way while measures of payment (paid cohorts, conversion estimates) pointed another. The market in this scenario followed payment more closely. Signals were not simply right or wrong: some had the right direction but the wrong size, and some were incomplete.';
