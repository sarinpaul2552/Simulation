/**
 * QUARTERLY EXECUTIVE BRIEFING (Batch 8.1 · Level 1 of the results page)
 *
 * Three material developments and one board question, selected by documented rules from recorded results only:
 *   commercial — the commercial indicator with the largest MARKET component this quarter (scaled by unit so that
 *                points, index points and $M are comparable: pts ×1, index ×0.5, $M ×0.15);
 *   decision   — the highest-weighted decision consequence (insights/consequences.ts);
 *   capability — the capability or organizational indicator with the largest recorded movement (capabilities from the
 *                attribution, plus culture and change load), with its main recorded driver.
 * The board question follows the first matching rule in BOARD_QUESTION_RULES. Nothing here forecasts the future or
 * names an event the team has not yet been told about.
 */
import type { QuarterRecord } from './history';
import { quarterAttribution, DRIVER_LABEL, type AttributionRow, type DriverKind } from './attribution';
import { decisionConsequences } from './consequences';
import { valuationSeries } from './valuation';
import { calendarLabel } from '../content/calendar';
import type { V2PresentationMode } from '../content/modes';

export interface Development {
  kind: 'commercial' | 'decision' | 'capability';
  label: string;
  /** Compact movement, e.g. "▲ 4.8 index points". Empty for decision developments. */
  movement: string;
  direction: 'up' | 'down' | 'flat';
  /** Business interpretation, separate from direction. */
  effect: 'favourable' | 'unfavourable' | 'neutral';
  driver: string;
  detail: string;
}

const SCALE: Record<AttributionRow['unit'], number> = { '%': 1, idx: 0.5, $M: 0.15 };
const COMMERCIAL_IDS = new Set(['consumerRetention', 'consumerCacIndex', 'enterprisePipeline', 'enterpriseWinRate', 'universityRenewalRate', 'pricingPower', 'aiAdoptionIndex']);

export function movementText(unit: AttributionRow['unit'], v: number): string {
  const a = Math.abs(v);
  const arrow = a < 0.05 ? '■' : v > 0 ? '▲' : '▼';
  if (unit === '$M') return `${arrow} $${a.toFixed(1)}M`;
  if (unit === '%') return `${arrow} ${a.toFixed(1)} pts`;
  return `${arrow} ${a.toFixed(1)} index points`;
}
const effectOf = (r: AttributionRow, amount: number): Development['effect'] => (Math.abs(amount) < 0.05 ? 'neutral' : (amount > 0) === (r.better === 'higher') ? 'favourable' : 'unfavourable');
const dir = (v: number): Development['direction'] => (Math.abs(v) < 0.05 ? 'flat' : v > 0 ? 'up' : 'down');

export function materialDevelopments(rec: QuarterRecord, mode: V2PresentationMode): Development[] {
  const rows = quarterAttribution(rec);
  const out: Development[] = [];
  // 1. commercial / market
  const com = rows.filter(r => COMMERCIAL_IDS.has(r.id)).map(r => ({ r, m: r.components.find(c => c.kind === 'market')?.amount ?? 0 }))
    .sort((a, b) => Math.abs(b.m) * SCALE[b.r.unit] - Math.abs(a.m) * SCALE[a.r.unit])[0];
  if (com && Math.abs(com.m) >= 0.05) {
    out.push({ kind: 'commercial', label: com.r.label, movement: movementText(com.r.unit, com.r.movement), direction: dir(com.r.movement), effect: effectOf(com.r, com.r.movement),
      driver: `Market ${movementText(com.r.unit, com.m).replace(/^[▲▼■] /, com.m >= 0 ? '+' : '−')}`, detail: 'Market conditions this quarter were the same for every team.' });
  } else {
    const top = rows.filter(r => COMMERCIAL_IDS.has(r.id)).sort((a, b) => Math.abs(b.movement) * SCALE[b.unit] - Math.abs(a.movement) * SCALE[a.unit])[0];
    if (top) out.push({ kind: 'commercial', label: top.label, movement: movementText(top.unit, top.movement), direction: dir(top.movement), effect: effectOf(top, top.movement), driver: top.driver ? DRIVER_LABEL[top.driver] : '—', detail: 'Largest commercial movement this quarter.' });
  }
  // 2. management decision
  const c = decisionConsequences(rec, mode)[0];
  if (c) out.push({ kind: 'decision', label: c.decision, movement: '', direction: 'flat', effect: 'neutral', driver: 'Decision', detail: c.immediate });
  // 3. capability / organization
  const caps = rows.filter(r => !COMMERCIAL_IDS.has(r.id));
  const org: AttributionRow[] = [
    ...caps,
    { id: 'culture', label: 'Culture', unit: 'idx', better: 'higher', opening: rec.before.culture, closing: rec.after.culture, movement: rec.after.culture - rec.before.culture, components: [], driver: null },
  ];
  const big = org.sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement))[0];
  if (big && Math.abs(big.movement) >= 0.05) {
    const drv: DriverKind | null = big.driver;
    out.push({ kind: 'capability', label: big.label, movement: movementText(big.unit, big.movement), direction: dir(big.movement), effect: effectOf(big, big.movement),
      driver: drv ? (drv === 'investment' ? 'Earlier investment' : drv === 'decision' ? 'This quarter’s investment or decisions' : DRIVER_LABEL[drv]) : 'Recorded change', detail: big.id === 'culture' ? 'Culture changes with workforce reductions, restructuring, financial distress, crises and some final decisions; workload alone does not move it.' : 'Capability matures from investment over one to three quarters.' });
  } else {
    out.push({ kind: 'capability', label: 'Capabilities', movement: '■ no material change', direction: 'flat', effect: 'neutral', driver: '—', detail: 'No capability moved by more than 0.05 points.' });
  }
  return out;
}

export interface BoardQuestion { rule: string; text: string }

/** The first matching rule wins. Rules use only recorded state and the board's announced Q4 2023 deadline. */
export function boardQuestion(history: QuarterRecord[], quarter: number): BoardQuestion {
  const rec = history[quarter - 1];
  const s = rec.after;
  const load = s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0;
  const v = valuationSeries(history.slice(0, quarter)).points[quarter];
  const pending = s.pendingCohorts.reduce((t, c) => t + c.gains.reduce((u, g) => u + (g.remaining ?? 0), 0), 0);
  const dRev = s.revenue - rec.before.revenue;
  const next = calendarLabel(quarter + 1);
  if (quarter >= 8) return { rule: 'final', text: 'The board will ask what value you created and whether it is sustainable. Which evidence will you lead with?' };
  if (s.solvency.distressed || s.solvency.status === 'insolvent' || s.solvency.status === 'warning')
    return { rule: 'liquidity', text: `Cash is $${s.cash.toFixed(1)}M and liquidity is under strain. How will ${next} be funded without damaging the business you are building?` };
  if (s.cash < 40) return { rule: 'cash', text: `Cash is $${s.cash.toFixed(1)}M, below the $40M comfort level. How much should ${next}’s plan rely on it?` };
  if (load > 0.95) return { rule: 'load', text: `Teams are at ${(load * 100).toFixed(0)}% of capacity. Which initiative should wait so the rest can deliver?` };
  if (quarter === 3) return { rule: 'deadline', text: 'The board expects a committed strategic direction next quarter. Which strategy do your current capabilities actually support?' };
  if (dRev < -0.5) {
    const mkt = quarterAttribution(rec).filter(r => ['consumerRetention', 'consumerCacIndex', 'enterprisePipeline', 'enterpriseWinRate', 'universityRenewalRate'].includes(r.id))
      .reduce((t, r) => t + Math.abs(r.components.find(c => c.kind === 'market')?.amount ?? 0), 0);
    return { rule: 'revenue-down', text: `Revenue fell $${Math.abs(dRev).toFixed(1)}M${mkt > 1 ? ' while market conditions moved against several commercial indicators' : ''}. What should ${next}’s plan protect, and what can wait?` };
  }
  if (pending > 3) return { rule: 'maturing', text: `About ${pending.toFixed(0)} capability points from earlier investment are still maturing. Do you hold course for them to land, or adjust now?` };
  return { rule: 'price', text: `The share price moved ${(v.changePct * 100).toFixed(1)}% this quarter. Which of your results would convince the board the improvement is sustainable?` };
}
