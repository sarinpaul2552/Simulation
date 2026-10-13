/**
 * MARKET-PATH CONTENT (NexLearn V3 · Batch 10D)
 *
 * Path A (AI Acceleration) is the original arc, so its content is the existing Batch 7–10A content, unchanged. Paths B
 * (Enterprise Transformation) and C (Economic Pressure) override only what differs: chapter subtitles, quarter cards,
 * plain-language signal text, role briefs, the Q3 signal assessments and the reveal summary. Anything a path does not
 * override falls back to path A (Q1 and Q4 are deliberately shared).
 *
 * V2 games have no market path: they always read path A content, exactly as before.
 * Content rules are those of the files it overrides: no hidden truth before Q4 is completed, no recommended answer,
 * ranges kept as ranges, and Q3 assessments restate only the authored truth notes of that path.
 */
import type { V2Role } from '../../../simulation/engineV2Scenario';
import type { V2GameSnapshot } from '../snapshot';
import type { MarketPathId } from '../snapshot';
import { CHAPTERS, type Chapter } from './chapters';
import { QUARTER_CARDS, SIGNAL_PLAIN, type QuarterCard } from './scenarioContent';
import { QUARTER_BRIEFS, type QuarterRoleBrief } from './briefings';
import { Q3_SIGNAL_ASSESSMENTS, SIGNAL_REVEAL_SUMMARY, type SignalAssessment } from './signalAssessments';
import { PATH_B_CONTENT } from './pathB';
import { PATH_C_CONTENT } from './pathC';

export interface PathContent {
  chapters: Partial<Record<number, Chapter>>;
  quarterCards: Partial<Record<number, QuarterCard>>;
  signalPlain: Record<string, string>;
  quarterBriefs: Partial<Record<number, Record<V2Role, QuarterRoleBrief>>>;
  q3Assessments: SignalAssessment[];
  revealSummary: string;
}

export interface PathInfo { id: MarketPathId; name: string; theme: string; facilitatorNote: string }

/** Facilitator-facing description (shown only when creating a session and in facilitator/board views). */
export const PATH_INFO: Record<MarketPathId, PathInfo> = {
  A: {
    id: 'A', name: 'AI Acceleration',
    theme: 'Rapid AI adoption disrupts consumer learning; product transformation and competitive pressure dominate.',
    facilitatorNote: 'The original NexLearn arc. Strongest test of how teams read AI hype versus willingness to pay.',
  },
  B: {
    id: 'B', name: 'Enterprise Transformation',
    theme: 'Employers drive AI reskilling; enterprise demand, contracts, delivery capability and workforce capacity dominate.',
    facilitatorNote: 'Rewards building delivery capability ahead of demand; the Q5 offer is larger and the downturn shallower.',
  },
  C: {
    id: 'C', name: 'Economic Pressure',
    theme: 'Weakening demand and tight finance; cash preservation, workforce decisions and resilience dominate.',
    facilitatorNote: 'The recession arrives early and deep; the Q5 offer is smaller and price-tight; recovery is only partial by Q8.',
  },
};

const A_CONTENT: PathContent = {
  chapters: CHAPTERS, quarterCards: QUARTER_CARDS, signalPlain: SIGNAL_PLAIN, quarterBriefs: QUARTER_BRIEFS,
  q3Assessments: Q3_SIGNAL_ASSESSMENTS, revealSummary: SIGNAL_REVEAL_SUMMARY,
};
const BY_PATH: Record<MarketPathId, PathContent> = { A: A_CONTENT, B: PATH_B_CONTENT, C: PATH_C_CONTENT };

/** The market path of a game: V3 games carry one; V2 games read path A content. */
export const contentPath = (snap: Pick<V2GameSnapshot, 'marketPath'> | null | undefined): MarketPathId => snap?.marketPath ?? 'A';

export const chapterFor = (q: number, path: MarketPathId = 'A'): Chapter => BY_PATH[path].chapters[q] ?? CHAPTERS[q];
export const quarterCardFor = (q: number, path: MarketPathId = 'A'): QuarterCard => BY_PATH[path].quarterCards[q] ?? QUARTER_CARDS[q];
export const signalPlainFor = (id: string, path: MarketPathId = 'A'): string | undefined => BY_PATH[path].signalPlain[id] ?? SIGNAL_PLAIN[id];
export const quarterBriefFor = (q: number, role: V2Role, path: MarketPathId = 'A'): QuarterRoleBrief | undefined => (BY_PATH[path].quarterBriefs[q] ?? QUARTER_BRIEFS[q])?.[role];
export const q3AssessmentsFor = (path: MarketPathId = 'A'): SignalAssessment[] => BY_PATH[path].q3Assessments;
export const revealSummaryFor = (path: MarketPathId = 'A'): string => BY_PATH[path].revealSummary;

/** Short names of the Q5 offers, as students see them in summaries ("the global contract"). */
export const CONTRACT_LABEL: Record<string, { short: string; acv: number }> = {
  'q5-global-enterprise': { short: 'global contract', acv: 48 },
  'q5-enterprise-consortium': { short: 'consortium programme', acv: 64 },
  'q5-vendor-consolidation': { short: 'vendor-consolidation contract', acv: 32 },
};
export const contractShort = (offerId: string | undefined): string => (offerId && CONTRACT_LABEL[offerId]?.short) || 'contract';
