/**
 * "Looking back: which signals mattered?" (Batch 10A; two-part evidence in V3.1 Stage 1).
 *
 * Gate: available only once the team has completed Q4, read from the server-loaded `completed_quarter`
 * (the stage is derived from the server phase; there is no URL routing or deep link that could open it earlier).
 *
 * Each row separates two things that must not be confused:
 *  - WHAT HAPPENED IN THE MARKET — the authored assessment of the signal (market-level wording only) plus the
 *    scenario's own market measure for Q3, stated as an index against normal and against Q2 (computed from the
 *    scenario data, never typed by hand);
 *  - WHAT HAPPENED TO OUR COMPANY — computed from the team's own records (start of Q3 → end of Q4): direction and
 *    size of each change, how the market reaches that measure, and whether the company moved with or against the
 *    market. Company statements are never authored text.
 */
import { pathArc } from '../../../simulationV3/engineV3Paths';
import { getNeutralMarket } from '../../../simulationV3/engineV3Commercial';
import type { V2TeamState } from '../../../simulation/engineV2';
import { SignalAssessment, VERDICT_LABEL } from '../content/signalAssessments';
import { q3AssessmentsFor } from '../content/paths';
import { calendarLabel } from '../content/calendar';
import type { QuarterRecord } from './history';

export const SIGNAL_REVEAL_QUARTER = 3;
export const SIGNAL_REVEAL_AFTER = 4;

/** Pure gate on the authoritative completed quarter. */
export function signalRevealAvailable(completedQuarter: number): boolean {
  return Number.isFinite(completedQuarter) && completedQuarter >= SIGNAL_REVEAL_AFTER;
}

type MeasureId = SignalAssessment['measures'][number];
const MEASURE: Record<MeasureId, { label: string; get: (s: V2TeamState) => number; fmt: (x: number) => string; unit: 'money' | 'percent' | 'index' }> = {
  consumerRevenue: { label: 'Consumer revenue', get: s => s.segmentRevenue.consumer, fmt: x => `$${x.toFixed(1)}M`, unit: 'money' },
  consumerRetention: { label: 'Consumer retention', get: s => s.commercial.consumerRetention, fmt: x => `${x.toFixed(1)}%`, unit: 'percent' },
  enterpriseRevenue: { label: 'Enterprise revenue', get: s => s.segmentRevenue.enterprise, fmt: x => `$${x.toFixed(1)}M`, unit: 'money' },
  enterprisePipeline: { label: 'Enterprise pipeline', get: s => s.commercial.enterprisePipeline, fmt: x => `$${x.toFixed(1)}M`, unit: 'money' },
  aiRevenue: { label: 'AI-native revenue', get: s => s.segmentRevenue.aiNative, fmt: x => `$${x.toFixed(1)}M`, unit: 'money' },
  aiAdoption: { label: 'AI adoption index', get: s => s.commercial.aiAdoptionIndex, fmt: x => x.toFixed(0), unit: 'index' },
  universityRevenue: { label: 'University revenue', get: s => s.segmentRevenue.university, fmt: x => `$${x.toFixed(1)}M`, unit: 'money' },
  talent: { label: 'Talent', get: s => s.capabilities.talent, fmt: x => x.toFixed(0), unit: 'index' },
};

/** How the market reaches each company measure (describes the engine's mechanism; no figures). */
const TRANSMISSION: Partial<Record<MeasureId, string>> = {
  consumerRevenue: 'Market demand reaches consumer revenue through new sign-ups and the share of subscribers renewing each quarter, so company revenue moves more slowly, and usually by less, than the market measure.',
  consumerRetention: 'Retention adjusts gradually toward a level set by market demand and by your own capabilities, trust and product quality.',
  enterpriseRevenue: 'Enterprise demand first changes the pipeline; revenue follows only as deals are won and go live over several quarters.',
  enterprisePipeline: 'The pipeline responds to market demand and to your enterprise capability relative to competitors.',
  aiRevenue: 'AI-native revenue depends on market demand and on your own AI readiness and adoption.',
  aiAdoption: 'Adoption follows your AI readiness; market demand decides how much of it turns into paying revenue.',
  universityRevenue: 'University revenue moves with renewals, partner wins and go-live dates, so it lags market demand.',
};

/** Plain names of the scenario market measures the assessments refer to. */
const MARKET_LABEL: Record<string, string> = {
  consumerDemand: 'Consumer paying demand',
  enterpriseDemand: 'Enterprise training demand',
  enterpriseAIDemand: 'Enterprise demand for AI-enabled learning',
  aiNativeDemand: 'Paying demand for AI-native products',
  universityDemand: 'University and credential demand',
  'competitorProgress.consumer': 'Pace of consumer competitors',
  'competitorProgress.enterprise': 'Pace of enterprise competitors',
  'competitorProgress.credential': 'Pace of credential competitors',
};

export interface MarketEvidence {
  /** Scenario field (truth reference) and plain label. */
  field: string;
  label: string;
  /** Q3 value, the normal (neutral) level and the Q2 value of the same measure. */
  value: number;
  normal: number;
  previous: number | null;
  /** (value − normal) ÷ normal and (value − previous) ÷ previous. */
  vsNormal: number;
  vsPrevious: number | null;
  /** Computed sentence, e.g. "Consumer paying demand: 10% below normal, and down 3% on Q2." */
  statement: string;
}

export interface CompanyMeasure {
  id: MeasureId;
  label: string;
  start: string;
  end: string;
  startValue: number;
  endValue: number;
  /** endValue − startValue (points for percent and index measures). */
  change: number;
  /** Relative change (null for percent/index measures, where the change in points is reported). */
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
  /** Computed sentence about this team's record. */
  statement: string;
  /** How the market reaches this measure (null when it does not). */
  transmission: string | null;
  /** True when the company moved in the opposite direction to the market measure's level. */
  againstMarket: boolean;
}

export interface RevealRow {
  id: string;
  source: string;
  headline: string;
  verdict: SignalAssessment['verdict'];
  verdictLabel: string;
  /** Authored, market-level: what held in the scenario's market (never a claim about the team's company). */
  showed: string;
  lesson: string;
  /** Authored truth note this assessment restates (null when the scenario has none). */
  basis: string | null;
  cited: boolean;
  /** Computed from the scenario's market data (null for signals with no market outcome). */
  market: MarketEvidence | null;
  /** Computed from the team's own records, start of Q3 → end of Q4. */
  company: CompanyMeasure[];
  /** Backward-compatible view of `company` (label, formatted start and end). */
  recorded: { label: string; start: string; end: string }[];
}

const FLAT = { money: 0.005, percent: 0.1, index: 0.5 } as const;
const pctText = (x: number) => `${Math.abs(x * 100).toFixed(Math.abs(x) < 0.095 ? 1 : 0).replace(/\.0$/, '')}%`;
/** "Consumer revenue" → "consumer revenue"; acronyms (AI-native, AI adoption) keep their capitals. */
const lower = (label: string) => (/^[A-Z]{2}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1));

function marketValue(q: { demand?: Record<string, number>; competitorProgress?: Record<string, number> } | undefined, field: string): number | null {
  if (!q) return null;
  if (field.startsWith('competitorProgress.')) return q.competitorProgress?.[field.split('.')[1]] ?? null;
  return q.demand?.[field] ?? null;
}

function neutralValue(field: string): number | null {
  const n = getNeutralMarket() as unknown as Record<string, unknown>;
  if (field.startsWith('competitorProgress.')) return (n.competitorProgress as Record<string, number>)[field.split('.')[1]] ?? null;
  const v = n[field];
  return typeof v === 'number' ? v : null;
}

/** The scenario's market measure for a Q3 signal, computed from scenario data. */
export function marketEvidence(path: Parameters<typeof pathArc>[0], field: string, value: number): MarketEvidence | null {
  const normal = neutralValue(field);
  if (normal === null || normal === 0) return null;
  const q2 = pathArc(path).find(s => s.quarter === SIGNAL_REVEAL_QUARTER - 1) as unknown as Parameters<typeof marketValue>[0];
  const previous = marketValue(q2, field);
  const vsNormal = (value - normal) / normal;
  const vsPrevious = previous ? (value - previous) / previous : null;
  const label = MARKET_LABEL[field] ?? field;
  const level = Math.abs(vsNormal) < 0.005 ? 'at its normal level' : `${pctText(vsNormal)} ${vsNormal > 0 ? 'above' : 'below'} normal`;
  const trend = vsPrevious === null ? '' : Math.abs(vsPrevious) < 0.005 ? `, unchanged on ${calendarLabel(SIGNAL_REVEAL_QUARTER - 1)}` : `, ${vsPrevious > 0 ? 'up' : 'down'} ${pctText(vsPrevious)} on ${calendarLabel(SIGNAL_REVEAL_QUARTER - 1)}`;
  return { field, label, value, normal, previous, vsNormal, vsPrevious, statement: `${label}: ${level}${trend}.` };
}

/**
 * The market's unambiguous direction: its level against normal, provided the change on the previous quarter does not
 * point the other way (a market below normal but recovering, or above normal but cooling, has no single direction).
 */
export function marketDirection(market: MarketEvidence | null): 'up' | 'down' | null {
  if (!market || Math.abs(market.vsNormal) < 0.005) return null;
  const level = market.vsNormal > 0 ? 'up' : 'down';
  if (market.vsPrevious !== null && Math.abs(market.vsPrevious) >= 0.005 && (market.vsPrevious > 0 ? 'up' : 'down') !== level) return null;
  return level;
}

/** The team's own record for one measure, start of Q3 → end of Q4, with a computed statement. */
export function companyMeasure(id: MeasureId, before: V2TeamState, after: V2TeamState, market: MarketEvidence | null): CompanyMeasure {
  const M = MEASURE[id];
  const a = M.get(before), b = M.get(after);
  const change = b - a;
  const changePct = M.unit === 'money' && a !== 0 ? change / a : null;
  const flat = M.unit === 'money' ? Math.abs(changePct ?? 0) < FLAT.money : Math.abs(change) < FLAT[M.unit];
  const direction = flat ? 'flat' : change > 0 ? 'up' : 'down';
  const size = M.unit === 'money' ? `${change > 0 ? '+' : '−'}$${Math.abs(change).toFixed(1)}M, ${change > 0 ? '+' : '−'}${pctText(changePct ?? 0)}`
    : `${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(1)} points`;
  const statement = direction === 'flat'
    ? `Your ${lower(M.label)} was essentially unchanged (${M.fmt(a)} → ${M.fmt(b)}).`
    : `Your ${lower(M.label)} ${direction === 'up' ? 'rose' : 'fell'} from ${M.fmt(a)} to ${M.fmt(b)} (${size}).`;
  const transmission = market ? TRANSMISSION[id] ?? null : null;
  const marketDir = marketDirection(market);
  const againstMarket = !!(marketDir && direction !== 'flat' && direction !== marketDir && TRANSMISSION[id]);
  return { id, label: M.label, start: M.fmt(a), end: M.fmt(b), startValue: a, endValue: b, change, changePct, direction, statement, transmission, againstMarket };
}

/** Sentence used when the company moved against the market measure (factual: no cause beyond the model's structure). */
export const AGAINST_MARKET_NOTE = 'This moved in the opposite direction to the market measure: over these two quarters your own decisions and capabilities outweighed the market.';

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
    const t = sig.truthReference;
    const market = t && a.verdict !== 'not-assessed' ? marketEvidence(path, t.field, t.value) : null;
    const company = a.measures.map(m => companyMeasure(m, q3.before, q4.after, market));
    return [{
      id: a.id, source: a.source, headline: sig.headline, verdict: a.verdict, verdictLabel: VERDICT_LABEL[a.verdict],
      showed: a.showed, lesson: a.lesson, basis: t?.note ?? null, cited: citedIds.includes(a.id),
      market, company, recorded: company.map(c => ({ label: c.label, start: c.start, end: c.end })),
    }];
  });
}
