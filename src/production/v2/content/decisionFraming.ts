/**
 * DECISION FRAMING (Batch 10A)
 *
 * Quarter-specific headings, prompts, strategic-priority options and (Q3 only) evidence options for the decision
 * screen. Presentation only: none of these values reaches the engine. Priority and evidence are stored as additive
 * keys in the existing deliberation JSONB (`priorityId`, `evidenceIds`).
 *
 * Rules:
 * - No option is labelled or implied to be correct (in particular the Q2 stance is neutral about AI).
 * - Q3 evidence labels name the source only, in words that fit all three V3 market paths (the eight Q3 signal ids are
 *   shared by every path). They carry no figures and no hint about which signal is reliable;
 *   the assessment is shown only after Q4 is completed (see insights/signalReveal.ts).
 */
import { mt, ModeText } from './modes';
import type { Choice } from './deliberationContent';

export type QuarterPace = 'fast' | 'major';

export interface DecisionFraming {
  pace: QuarterPace;
  /** Suggested time for the whole quarter, all four stages (minutes; 90-minute session plan; guidance only, not measured). */
  minutes: number;
  /** Heading for quarters without an event card (Q1–Q3). Event quarters keep their event heading. */
  heading?: string;
  prompt: ModeText;
  priorityQuestion: string;
  priorities: Choice[];
  /** Q3 only: evidence the team can cite (ids equal the scenario's Q3 signal ids). */
  evidence?: Choice[];
  evidenceQuestion?: string;
}

const GENERIC_PRIORITIES: Choice[] = [
  { id: 'growth', label: mt('Grow revenue', 'Revenue growth') },
  { id: 'resilience', label: mt('Protect cash and resilience', 'Liquidity and resilience') },
  { id: 'capability', label: mt('Build capability for later quarters', 'Capability for future quarters') },
  { id: 'organization', label: mt('Protect our people and organization', 'Organizational health and capacity') },
];

const MAJOR = (prompt: ModeText): DecisionFraming => ({ pace: 'major', minutes: 9, prompt, priorityQuestion: 'What matters most this quarter?', priorities: GENERIC_PRIORITIES });

export const DECISION_FRAMING: Record<number, DecisionFraming> = {
  1: {
    pace: 'fast', minutes: 6,
    heading: 'Where should we place our initial bets?',
    prompt: mt('You cannot fund everything. Agree what matters most first, then size the bets.', 'Capital is constrained. Agree the objective first, then allocate against it.'),
    priorityQuestion: 'Our strategic priority',
    priorities: [
      { id: 'q1-grow-now', label: mt('Grow the businesses that earn money today', 'Grow the established revenue base') },
      { id: 'q1-build-future', label: mt('Build capability for where learning is heading', 'Build capability for the next few years') },
      { id: 'q1-strengthen-org', label: mt('Strengthen our people and capacity first', 'Strengthen organizational capacity first') },
      { id: 'q1-stay-flexible', label: mt('Keep flexibility and cash until the picture is clearer', 'Preserve optionality and liquidity') },
    ],
  },
  2: {
    pace: 'fast', minutes: 6,
    heading: 'Accelerate, maintain or reconsider?',
    prompt: mt('The market is changing fast. Agree your stance first. There is no single correct answer — defend yours with evidence.', 'Take a position on the disruption and defend it with evidence. No stance is correct by default.'),
    priorityQuestion: 'Our stance on the disruption',
    priorities: [
      { id: 'q2-accelerate', label: mt('Accelerate: move faster in the direction we are taking', 'Accelerate the current direction') },
      { id: 'q2-maintain', label: mt('Maintain: keep our direction and pace', 'Maintain direction and pace') },
      { id: 'q2-reconsider', label: mt('Reconsider: slow down and re-examine our direction', 'Reconsider the direction before committing more') },
    ],
  },
  3: {
    pace: 'fast', minutes: 6,
    heading: 'Which evidence do we trust?',
    prompt: mt('Your briefs disagree. Name the one or two signals that most shape your decision, then fund it.', 'The signals conflict. Identify the evidence you weight most heavily, then allocate.'),
    priorityQuestion: 'Our strategic priority',
    priorities: [
      { id: 'q3-ready-likely', label: mt('Get ready for the direction we think is most likely', 'Build readiness for the most likely direction') },
      { id: 'q3-keep-options', label: mt('Keep several options open', 'Preserve strategic options') },
      { id: 'q3-protect-revenue', label: mt('Protect the revenue we have', 'Protect current revenue') },
      { id: 'q3-test-small', label: mt('Test the emerging opportunity on a small scale', 'Stage a small test of the emerging opportunity') },
    ],
    evidenceQuestion: 'The evidence that influenced us most (choose one or two)',
    evidence: [
      { id: 'q3-consumer-usage', label: mt('Consumer usage trend (Growth brief)') },
      { id: 'q3-consumer-paid-cohorts', label: mt('Paying-subscriber cohort analysis (CFO brief)') },
      { id: 'q3-enterprise-rfps', label: mt('Enterprise requests for proposals (shared)') },
      { id: 'q3-ai-engagement', label: mt('AI product engagement (Product brief)') },
      { id: 'q3-ai-wtp', label: mt('AI pilot-to-paid conversion estimates (shared)') },
      { id: 'q3-university', label: mt('University partners (CEO brief)') },
      { id: 'q3-competition', label: mt('Competitor moves (shared)') },
      { id: 'q3-people-strain', label: mt('Staff attrition and morale (People brief)') },
    ],
  },
  4: MAJOR(mt('This commitment shapes the rest of the game. Agree what matters most, then choose and fund it.', 'An irreversible commitment: align on the objective before choosing.')),
  5: MAJOR(mt('A large offer is on the table. Agree what matters most before you decide.', 'Weigh the offer against your stated objective.')),
  6: MAJOR(mt('Demand is falling. Agree what you will protect first.', 'Decide what to protect through the downturn.')),
  7: MAJOR(mt('A crisis needs a response. Agree what matters most, then respond.', 'Set the priority, then choose the response.')),
  8: MAJOR(mt('This is the final move. Agree what matters most for the company’s future.', 'Final quarter: align on the objective for the end state.')),
};

export const framingFor = (q: number): DecisionFraming | undefined => DECISION_FRAMING[q];
export const priorityLabel = (q: number, id?: string) => DECISION_FRAMING[q]?.priorities.find(p => p.id === id)?.label;
export const evidenceLabel = (q: number, id: string) => DECISION_FRAMING[q]?.evidence?.find(e => e.id === id)?.label;

/** Rationale completeness for the decision screen. Older drafts (two risks, no priority) remain readable. */
export function rationaleMissing(q: number, d: { priorityId?: string; beliefId?: string; confidence?: number; riskIds?: string[]; evidenceIds?: string[] }): string[] {
  const f = DECISION_FRAMING[q];
  const out: string[] = [];
  if (f && !d.priorityId) out.push(q === 2 ? 'Choose your stance' : 'Choose your strategic priority');
  if (f?.evidence) {
    const n = (d.evidenceIds ?? []).length;
    if (n < 1 || n > 2) out.push('Choose the one or two signals that influenced you most');
  }
  if (!d.beliefId) out.push('Choose what your strategy is based on');
  if (!d.confidence) out.push('Choose your confidence');
  if ((d.riskIds ?? []).length < 1) out.push('Choose your biggest risk');
  return out;
}
