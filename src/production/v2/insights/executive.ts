/**
 * EXECUTIVE SCORECARDS AND AWARDS (Batch 8 · Stage 2) — model NXLN-EXEC-1.0
 *
 * A presentation-layer evaluation of each executive FUNCTION, built only from recorded V2 engine state and the
 * simulated share price (valuation.ts). It never feeds the engine and is not the terminal score (engineV2Scoring).
 * It scores the team's handling of a function — never an individual student's contribution.
 *
 *   executive score = 60% functional + 40% company
 *   company component  = shareholder value: share price $0 → 0, $100 → 50, $200 → 100 (same for every role)
 *   functional component = weighted average of the role's metric scores (0–100)
 *
 * Normalisation (documented per metric in EXECUTIVE_METRICS):
 *   change — 50 = the Q4 2022 starting position; ±range from the start maps to 100 / 0. Lower-is-better metrics are
 *            inverted. The score uses the SUSTAINED value (average of this and the previous quarter), so a one-quarter
 *            spike earns half credit and sustained improvement earns full credit.
 *   band   — absolute thresholds (e.g. cash $15M → $40M). Nothing above the top of the band earns more, so unused
 *            cash and unused capacity are not rewarded.
 * Every underlying metric appears in exactly one functional scorecard (no double counting across roles); the shared
 * company component is a single outcome measure. Spending is never scored — only what it produced.
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import type { V2Role } from '../types';
import { V2_FINANCING_CALIBRATION } from '../../../simulation/engineV2Financing';
import { startingCompany, type QuarterRecord } from './history';
import { alignedCapability, strategicFit, valuationSeries, type ValuationSeries } from './valuation';

export const EXECUTIVE_VERSION = 'NXLN-EXEC-1.0' as const;
export const EXECUTIVE_WEIGHTS = { functional: 0.6, company: 0.4 } as const;

/** '%' = a percentage value (85 = 85%); 'frac' = a fraction shown as a percentage (0.15 = 15%). */
export type MetricUnit = '$M' | '%' | 'frac' | 'idx' | 'ratio' | 'share';
export type Normalisation = { kind: 'change'; range: number } | { kind: 'band'; lo: number; hi: number }
  /** Full credit inside [lo, hi]; falls linearly to `under` at 0 and to 0 at `max` (idle capacity is not rewarded). */
  | { kind: 'target'; lo: number; hi: number; max: number; under: number };

export interface MetricContext {
  /** States from Q4 2022 (index 0) to the evaluated quarter (index t). */
  states: V2TeamState[];
  records: QuarterRecord[];
  t: number;
}

export interface MetricDef {
  id: string;
  role: V2Role;
  area: string;
  label: string;
  glossary?: string;
  unit: MetricUnit;
  better: 'higher' | 'lower';
  weight: number;
  norm: Normalisation;
  /** Value at quarter index `i` of ctx.states (null when not measurable). */
  value: (ctx: MetricContext, i: number) => number | null;
  /** Commercial indicator id, for cumulative market-movement context. */
  marketIndicator?: string;
}

const margin = (s: V2TeamState) => (s.revenue > 0 ? s.operatingProfit / s.revenue : 0);
const st = (ctx: MetricContext, i: number) => ctx.states[i];
const loadRatio = (s: V2TeamState) => (s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0);

export const EXECUTIVE_METRICS: MetricDef[] = [
  // CEO — enterprise leadership
  { id: 'ceo-op', role: 'CEO', area: 'Financial performance', label: 'Operating profit', glossary: 'operating-profit', unit: '$M', better: 'higher', weight: 0.3, norm: { kind: 'change', range: 20 }, value: (c, i) => st(c, i).operatingProfit },
  { id: 'ceo-fit', role: 'CEO', area: 'Strategic alignment', label: 'Capabilities behind the strategy', glossary: 'strategic-readiness', unit: 'idx', better: 'higher', weight: 0.3, norm: { kind: 'change', range: 30 }, value: (c, i) => { const d = st(c, c.t).destination?.id; return 100 * (d ? alignedCapability(st(c, i), d) : strategicFit(st(c, i))); } },
  { id: 'ceo-pricing', role: 'CEO', area: 'Strategic position', label: 'Pricing power', glossary: 'pricing-power', unit: 'idx', better: 'higher', weight: 0.15, norm: { kind: 'change', range: 15 }, value: (c, i) => st(c, i).commercial.pricingPower, marketIndicator: 'pricingPower' },
  { id: 'ceo-sustain', role: 'CEO', area: 'Organizational sustainability', label: 'Average change load vs capacity', glossary: 'org-load', unit: 'frac', better: 'lower', weight: 0.25, norm: { kind: 'target', lo: 0.6, hi: 0.95, max: 1.3, under: 40 },
    value: (c, i) => (i === 0 ? null : c.states.slice(1, i + 1).reduce((a, s) => a + loadRatio(s), 0) / i) },
  // CFO
  { id: 'cfo-margin', role: 'CFO', area: 'Operating profitability', label: 'Operating margin', glossary: 'operating-margin', unit: 'frac', better: 'higher', weight: 0.35, norm: { kind: 'change', range: 0.10 }, value: (c, i) => margin(st(c, i)) },
  { id: 'cfo-liquidity', role: 'CFO', area: 'Liquidity', label: 'Cash (credit up to the $40M comfort level)', glossary: 'liquidity', unit: '$M', better: 'higher', weight: 0.15, norm: { kind: 'band', lo: V2_FINANCING_CALIBRATION.liquidity.minimumOperatingCash, hi: V2_FINANCING_CALIBRATION.liquidity.comfortableCash }, value: (c, i) => st(c, i).cash },
  { id: 'cfo-efficiency', role: 'CFO', area: 'Capital efficiency', label: 'Annualised revenue gained per $ of capital deployed', unit: 'ratio', better: 'higher', weight: 0.3, norm: { kind: 'band', lo: -0.5, hi: 1.0 },
    value: (c, i) => {
      if (i === 0) return null;
      // capital deployed = the strategic envelope each quarter, invested OR held in reserve (held cash earns no return)
      const deployed = c.records.slice(0, i).reduce((a, r) => a + r.consequence.ledger.strategicInvestment + (r.consequence.ledger.cashReserveRetained ?? 0), 0);
      return deployed > 0 ? ((st(c, i).revenue - c.states[0].revenue) * 4) / deployed : null;
    } },
  { id: 'cfo-debt', role: 'CFO', area: 'Financing risk', label: 'Debt', unit: '$M', better: 'lower', weight: 0.07, norm: { kind: 'band', lo: 0, hi: 100 }, value: (c, i) => st(c, i).financing.debt },
  { id: 'cfo-ownership', role: 'CFO', area: 'Financing risk', label: 'Ownership retained by original shareholders', unit: 'share', better: 'higher', weight: 0.06, norm: { kind: 'band', lo: 0.7, hi: 1 }, value: (c, i) => st(c, i).financing.ownership },
  { id: 'cfo-distress', role: 'CFO', area: 'Financing risk', label: 'Quarters in liquidity warning or worse', unit: 'share', better: 'lower', weight: 0.07, norm: { kind: 'band', lo: 0, hi: 0.5 },
    value: (c, i) => (i === 0 ? 0 : c.states.slice(1, i + 1).filter(s => s.solvency.status === 'warning' || s.solvency.status === 'insolvent' || s.solvency.distressed).length / i) },
  // CPO — Product
  { id: 'cpo-quality', role: 'Product', area: 'Product quality', label: 'Product quality', unit: 'idx', better: 'higher', weight: 0.3, norm: { kind: 'change', range: 20 }, value: (c, i) => st(c, i).productQuality },
  { id: 'cpo-readiness', role: 'Product', area: 'Innovation readiness', label: 'AI commercial readiness', unit: 'idx', better: 'higher', weight: 0.2, norm: { kind: 'change', range: 40 }, value: (c, i) => st(c, i).commercial.aiCommercialReadiness },
  { id: 'cpo-capability', role: 'Product', area: 'Capability', label: 'AI and product capability', unit: 'idx', better: 'higher', weight: 0.2, norm: { kind: 'change', range: 40 }, value: (c, i) => st(c, i).capabilities.ai },
  { id: 'cpo-trust', role: 'Product', area: 'Trust and resilience', label: 'Customer trust', glossary: 'trust', unit: 'idx', better: 'higher', weight: 0.3, norm: { kind: 'change', range: 20 }, value: (c, i) => st(c, i).trust },
  // CGO — Growth
  { id: 'cgo-revenue', role: 'Growth', area: 'Revenue', label: 'Revenue', unit: '$M', better: 'higher', weight: 0.3, norm: { kind: 'change', range: 50 }, value: (c, i) => st(c, i).revenue },
  { id: 'cgo-retention', role: 'Growth', area: 'Retention', label: 'Consumer retention', glossary: 'retention', unit: '%', better: 'higher', weight: 0.2, norm: { kind: 'change', range: 8 }, value: (c, i) => st(c, i).commercial.consumerRetention, marketIndicator: 'consumerRetention' },
  { id: 'cgo-cac', role: 'Growth', area: 'Acquisition efficiency', label: 'Cost to win a customer (index)', glossary: 'cac', unit: 'idx', better: 'lower', weight: 0.15, norm: { kind: 'change', range: 30 }, value: (c, i) => st(c, i).commercial.consumerCacIndex, marketIndicator: 'consumerCacIndex' },
  { id: 'cgo-pipeline', role: 'Growth', area: 'Pipeline and conversion', label: 'Enterprise pipeline', glossary: 'pipeline', unit: '$M', better: 'higher', weight: 0.15, norm: { kind: 'change', range: 80 }, value: (c, i) => st(c, i).commercial.enterprisePipeline, marketIndicator: 'enterprisePipeline' },
  { id: 'cgo-winrate', role: 'Growth', area: 'Pipeline and conversion', label: 'Enterprise win rate', glossary: 'win-rate', unit: '%', better: 'higher', weight: 0.1, norm: { kind: 'change', range: 10 }, value: (c, i) => st(c, i).commercial.enterpriseWinRate, marketIndicator: 'enterpriseWinRate' },
  { id: 'cgo-renewal', role: 'Growth', area: 'Retention', label: 'University renewals', glossary: 'renewal', unit: '%', better: 'higher', weight: 0.1, norm: { kind: 'change', range: 8 }, value: (c, i) => st(c, i).commercial.universityRenewalRate, marketIndicator: 'universityRenewalRate' },
  // CPeO — People
  { id: 'cpeo-culture', role: 'People', area: 'Culture', label: 'Culture', unit: 'idx', better: 'higher', weight: 0.25, norm: { kind: 'change', range: 15 }, value: (c, i) => st(c, i).culture },
  { id: 'cpeo-talent', role: 'People', area: 'Talent', label: 'Talent', unit: 'idx', better: 'higher', weight: 0.25, norm: { kind: 'change', range: 25 }, value: (c, i) => st(c, i).capabilities.talent },
  { id: 'cpeo-execution', role: 'People', area: 'Execution capacity', label: 'Execution capability', unit: 'idx', better: 'higher', weight: 0.15, norm: { kind: 'change', range: 20 }, value: (c, i) => st(c, i).capabilities.execution },
  { id: 'cpeo-capacity', role: 'People', area: 'Execution capacity', label: 'Organizational capacity', glossary: 'execution-capacity', unit: 'idx', better: 'higher', weight: 0.15, norm: { kind: 'change', range: 20 }, value: (c, i) => st(c, i).organizationalCapacity },
  { id: 'cpeo-load', role: 'People', area: 'Organizational load', label: 'Change load vs capacity (this quarter)', glossary: 'org-load', unit: 'frac', better: 'lower', weight: 0.2, norm: { kind: 'target', lo: 0.6, hi: 0.95, max: 1.3, under: 40 }, value: (c, i) => (i === 0 ? null : loadRatio(st(c, i))) },
];

export const ROLE_SCORECARD_TITLE: Record<V2Role, string> = {
  CEO: 'Enterprise leadership', CFO: 'Chief Financial Officer', Product: 'Chief Product Officer', Growth: 'Chief Growth Officer', People: 'Chief People Officer',
};
export const SCORECARD_ROLES: V2Role[] = ['CEO', 'CFO', 'Product', 'Growth', 'People'];

const clamp100 = (x: number) => Math.max(0, Math.min(100, x));

/** Normalised 0–100 score for a metric at quarter index t (null when not yet measurable). */
export function metricScore(def: MetricDef, ctx: MetricContext, t = ctx.t): number | null {
  const sign = def.better === 'higher' ? 1 : -1;
  if (def.norm.kind === 'target') {
    const v = def.value(ctx, t);
    if (v === null) return null;
    const { lo, hi, max, under } = def.norm;
    if (v >= lo && v <= hi) return 100;
    if (v > hi) return clamp100(100 * (1 - (v - hi) / (max - hi)));
    return clamp100(under + (100 - under) * (v / lo));
  }
  if (def.norm.kind === 'band') {
    const v = def.value(ctx, t);
    if (v === null) return null;
    const { lo, hi } = def.norm;
    const r = (v - lo) / (hi - lo);
    return clamp100(100 * (sign > 0 ? r : 1 - r));
  }
  const v0 = def.value(ctx, 0);
  const vt = def.value(ctx, t);
  if (v0 === null || vt === null) return null;
  const vp = t >= 2 ? def.value(ctx, t - 1) : null;
  const sustained = vp === null ? vt : (vt + vp) / 2;
  return clamp100(50 + (50 * sign * (sustained - v0)) / def.norm.range);
}

export function formatMetric(unit: MetricUnit, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  switch (unit) {
    case '$M': return `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(1)}M`;
    case '%': return `${v.toFixed(1)}%`;
    case 'frac': return `${(v * 100).toFixed(1)}%`;
    case 'share': return `${(v * 100).toFixed(0)}%`;
    case 'ratio': return `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`;
    default: return v.toFixed(0);
  }
}
function formatChange(unit: MetricUnit, d: number | null): string {
  if (d === null || !Number.isFinite(d)) return '—';
  const s = d > 0 ? '+' : d < 0 ? '−' : '±';
  const a = Math.abs(d);
  switch (unit) {
    case '$M': return a < 0.05 ? 'no change' : `${s}$${a.toFixed(1)}M`;
    case '%': return a < 0.05 ? 'no change' : `${s}${a.toFixed(1)} pts`;
    case 'frac': return a < 0.0005 ? 'no change' : `${s}${(a * 100).toFixed(1)} pts`;
    case 'share': return a < 0.005 ? 'no change' : `${s}${(a * 100).toFixed(0)} pts`;
    case 'ratio': return a < 0.005 ? 'no change' : `${s}$${a.toFixed(2)}`;
    default: return a < 0.5 ? 'no change' : `${s}${a.toFixed(0)}`;
  }
}

export interface ScorecardRow {
  id: string; area: string; label: string; glossary?: string; unit: MetricUnit; better: 'higher' | 'lower'; weight: number;
  start: string; previous: string; current: string; change: string; direction: 'up' | 'down' | 'flat';
  favourable: boolean | null; score: number | null; interpretation: string; marketContext: string | null; normalisation: string;
}
export interface Scorecard {
  role: V2Role; title: string; quarter: number; rows: ScorecardRow[];
  functional: number; company: number; executive: number;
  challenges: string[]; strengths: string[];
}

function normText(def: MetricDef): string {
  if (def.norm.kind === 'target') return `Full credit between ${formatMetric(def.unit, def.norm.lo)} and ${formatMetric(def.unit, def.norm.hi)}; falls to 0 at ${formatMetric(def.unit, def.norm.max)} and to ${def.norm.under} when no change is attempted (idle capacity is not rewarded).`;
  if (def.norm.kind === 'band') return `Absolute band ${formatMetric(def.unit, def.norm.lo)} → ${formatMetric(def.unit, def.norm.hi)} (${def.better === 'higher' ? 'higher' : 'lower'} is better; nothing extra beyond the band).`;
  const r = def.unit === 'frac' ? `${(def.norm.range * 100).toFixed(0)} pts` : def.unit === '%' ? `${def.norm.range} pts` : formatMetric(def.unit, def.norm.range);
  return `50 = the Q4 2022 position; a change of ${r} ${def.better === 'higher' ? 'up' : 'down'} scores 100 (and the same the other way scores 0). Scored on the average of this and the previous quarter.`;
}

/** Cumulative market contribution to a commercial indicator up to quarter t (engine diagnostics). */
function marketMovement(records: QuarterRecord[], t: number, indicator: string): number {
  let m = 0;
  for (const r of records.slice(0, t)) for (const ind of r.consequence.commercial.indicators) if (ind.indicator === indicator) m += ind.marketContribution;
  return m;
}

/** Company component: shareholder value from the simulated share price ($0 → 0, $100 → 50, $200 → 100). */
export const companyComponent = (price: number) => clamp100(50 + (price - 100) / 2);

export function buildScorecard(records: QuarterRecord[], role: V2Role, t = records.length, valuation?: ValuationSeries): Scorecard {
  const states = [startingCompany(), ...records.map(r => r.after)];
  const ctx: MetricContext = { states, records, t };
  const val = valuation ?? valuationSeries(records);
  const rows: ScorecardRow[] = EXECUTIVE_METRICS.filter(m => m.role === role).map(def => {
    const v0 = def.value(ctx, 0), vt = def.value(ctx, t), vp = t >= 1 ? def.value(ctx, t - 1) : null;
    const base0 = v0 ?? (t >= 1 ? def.value(ctx, 1) : null);
    const d = vt !== null && base0 !== null ? vt - base0 : null;
    const eps = def.unit === '$M' || def.unit === '%' ? 0.05 : def.unit === 'frac' || def.unit === 'share' ? 0.0005 : def.unit === 'ratio' ? 0.005 : 0.5;
    const ref = def.norm.kind === 'band' ? vp : v0;
    const move = vt !== null && ref !== null ? vt - ref : null;
    const direction = move === null || Math.abs(move) < eps ? 'flat' : move > 0 ? 'up' : 'down';
    const favourable = direction === 'flat' ? null : (direction === 'up') === (def.better === 'higher');
    const score = metricScore(def, ctx);
    const mm = def.marketIndicator ? marketMovement(records, t, def.marketIndicator) : null;
    let interp: string;
    if (score === null) interp = 'Not yet measurable.';
    else if (def.norm.kind === 'target') interp = score >= 99.5 ? 'Within the sustainable range.' : (vt ?? 0) > def.norm.hi ? (score <= 30 ? 'Teams are badly overloaded.' : 'Above the sustainable range — teams are stretched.') : 'Below the range — capacity is going unused.';
    else if (def.norm.kind === 'band') interp = score >= 99.5 ? 'At or beyond the healthy threshold — no further credit.' : score <= 0.5 ? 'Outside the acceptable range.' : score >= 67 ? 'Healthy.' : score >= 33 ? 'Moderate.' : 'Weak.';
    else interp = Math.abs(score - 50) < 3 ? 'Held close to the starting position.' : score > 50 ? `Better than the starting position${score >= 90 ? ', strongly' : ''}.` : `Worse than the starting position${score <= 10 ? ', materially' : ''}.`;
    return {
      id: def.id, area: def.area, label: def.label, glossary: def.glossary, unit: def.unit, better: def.better, weight: def.weight,
      start: formatMetric(def.unit, v0), previous: t >= 1 ? formatMetric(def.unit, vp) : '—', current: formatMetric(def.unit, vt),
      change: formatChange(def.unit, d), direction, favourable, score, interpretation: interp,
      marketContext: mm !== null && Math.abs(mm) >= 0.05 ? `Market conditions moved this indicator by ${mm > 0 ? '+' : '−'}${Math.abs(mm).toFixed(1)} over the period; every team faced the same conditions.` : null,
      normalisation: normText(def),
    };
  });
  const scored = rows.filter(r => r.score !== null);
  const wsum = scored.reduce((a, r) => a + r.weight, 0);
  const functional = wsum > 0 ? scored.reduce((a, r) => a + r.weight * (r.score as number), 0) / wsum : 50;
  const company = companyComponent(val.points[t].price);
  return {
    role, title: ROLE_SCORECARD_TITLE[role], quarter: t, rows, functional, company,
    executive: EXECUTIVE_WEIGHTS.functional * functional + EXECUTIVE_WEIGHTS.company * company,
    challenges: rows.filter(r => r.score !== null && r.score < 40).map(r => `${r.label}: ${r.interpretation.toLowerCase().replace(/\.$/, '')} (${r.current}).`),
    strengths: rows.filter(r => r.score !== null && r.score >= 65 && !/no further credit/.test(r.interpretation)).map(r => `${r.label} (${r.current}).`),
  };
}

export function allScorecards(records: QuarterRecord[], t = records.length): Scorecard[] {
  const val = valuationSeries(records);
  return SCORECARD_ROLES.map(r => buildScorecard(records, r, t, val));
}

// ───────────────────────────── awards ─────────────────────────────

export const AWARD_RULES = {
  minTeams: 3,
  minQuarter: 4,
  /** A lead smaller than this is a shared award. */
  shareWithin: 1.0,
} as const;

export type AwardId = 'CEO' | 'CFO' | 'Product' | 'Growth' | 'People' | 'team';
export const AWARD_LABEL: Record<AwardId, string> = {
  CEO: 'Best CEO (enterprise leadership)', CFO: 'Best CFO', Product: 'Best Product Leadership', Growth: 'Best Growth Leadership', People: 'Best People Leadership', team: 'Best Overall Leadership Team',
};

export interface AwardTeam { teamId: string; teamName: string; records: QuarterRecord[] }
export interface AwardResult {
  available: boolean;
  reason: string | null;
  quarter: number;
  eligibleTeams: string[];
  excluded: { teamName: string; reason: string }[];
  awards: { id: AwardId; label: string; winners: string[]; score: number; runnerUp: number | null; basis: string }[];
  table: { teamName: string; scores: Record<AwardId, number>; price: number }[];
}

/**
 * Cross-team awards. Awards belong to the team's functional role (e.g. "Team Alpha — CFO role"), never to a named
 * student: the platform does not observe who did what, and one student may hold several roles.
 */
export function computeAwards(teams: AwardTeam[], rules = AWARD_RULES): AwardResult {
  const quarter = teams.length ? Math.min(...teams.map(t => t.records.length)) : 0;
  const base: AwardResult = { available: false, reason: null, quarter, eligibleTeams: [], excluded: [], awards: [], table: [] };
  if (teams.length < rules.minTeams) return { ...base, reason: `Awards need at least ${rules.minTeams} teams to compare.` };
  if (quarter < rules.minQuarter) return { ...base, reason: `Awards are shown once every team has completed at least ${rules.minQuarter} quarters (the earliest team has completed ${quarter}).` };
  const rows = teams.map(team => {
    const recs = team.records.slice(0, quarter);
    const cards = allScorecards(recs, quarter);
    const scores = Object.fromEntries(cards.map(c => [c.role, c.executive])) as Record<AwardId, number>;
    scores.team = cards.reduce((a, c) => a + c.executive, 0) / cards.length;
    const s = recs[recs.length - 1].after;
    return { team, scores, price: valuationSeries(recs).points[quarter].price, insolvent: s.solvency.everInsolvent };
  });
  const excluded = rows.filter(r => r.insolvent).map(r => ({ teamName: r.team.teamName, reason: 'became insolvent — not eligible for awards' }));
  const eligible = rows.filter(r => !r.insolvent);
  if (eligible.length < rules.minTeams) return { ...base, excluded, reason: `Fewer than ${rules.minTeams} eligible teams.` };
  const awards = (['CEO', 'CFO', 'Product', 'Growth', 'People', 'team'] as AwardId[]).map(id => {
    const sorted = [...eligible].sort((a, b) => b.scores[id] - a.scores[id]);
    const top = sorted[0].scores[id];
    const winners = sorted.filter(r => top - r.scores[id] < rules.shareWithin).map(r => r.team.teamName);
    const next = sorted.find(r => top - r.scores[id] >= rules.shareWithin);
    return {
      id, label: AWARD_LABEL[id], winners, score: top, runnerUp: next ? next.scores[id] : null,
      basis: id === 'team' ? 'Average of the five executive scores.' : `Executive score for the ${ROLE_SCORECARD_TITLE[id as V2Role]} scorecard (60% functional, 40% company).`,
    };
  });
  return {
    available: true, reason: null, quarter, eligibleTeams: eligible.map(r => r.team.teamName), excluded, awards,
    table: rows.map(r => ({ teamName: r.team.teamName, scores: r.scores, price: r.price })),
  };
}
