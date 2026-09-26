/**
 * V2 Simulation Engine — Batch 3 · Q8: Final Strategic Decision
 *
 * Q8 is still a played quarter (allocation, market, economics) plus one strategic decision whose AVAILABILITY
 * emerges from the company built. Options:
 *
 *   continue               always: execute the current plan
 *   scale-independently    financial strength + execution/capacity: self-funded Q8 envelope up to $45M
 *   raise-growth-capital   growth/AI/specialization momentum, not insolvent, no partner ROFR: equity raise (dilution),
 *                          envelope up to $60M
 *   acquire-consolidate    financial + organizational strength: buy a business in the focus segment (consideration is an
 *                          event line; acquired run-rate arrives with its own cost base; integration load, culture strain)
 *   strategic-sale         strategically valuable: an offer priced from the company's own valuation × strategic premium;
 *                          closes at the end of Q8 (terminal realized value); deal costs and distraction load now
 *   stabilize-restructure  distressed / thin margin: coherent recovery plan (structural saving with less damage than an
 *                          emergency restructuring), investment capped, lender standstill (lower rate)
 *
 * The decision influences terminal economics without erasing Q1–Q7: every price and effect is computed from the state.
 * Imports only V2 modules; never the frozen V1 engine.
 */

import type { V2DestinationId } from './engineV2Destination';
import { V2QuarterEffects, V2SegmentKey, emptyEffects, availableCut } from './engineV2Effects';

export type V2FinalOptionId =
  | 'continue'
  | 'scale-independently'
  | 'raise-growth-capital'
  | 'acquire-consolidate'
  | 'strategic-sale'
  | 'stabilize-restructure';

export const V2_FINAL_OPTION_IDS: V2FinalOptionId[] = [
  'continue', 'scale-independently', 'raise-growth-capital', 'acquire-consolidate', 'strategic-sale', 'stabilize-restructure',
];

export const V2_FINAL_CALIBRATION = {
  scale: { minCash: 40, minMargin: 0.1, minExecution: 55, minCapacity: 55, envelope: 45 },
  // Calibration (Q8 checkpoint): growth AND (AI or specialization) momentum — "growth OR…" admitted almost every company.
  raise: { minGrowth: 0.04, minAiReadiness: 40, minDestinationStrength: 0.8, amount: 60, envelope: 60 },
  acquire: {
    // Calibration (Q8 checkpoint): 60/60 → 55/55 (a hiring freeze's −1 capacity blocked even cash-rich companies).
    minExecution: 55, minCapacity: 55, minCulture: 60,
    /** Target run-rate ($M/qtr) and price as a multiple of the target's annual revenue. */
    targetRunRate: 7, priceMultiple: 1.8,
    /** Acquired overhead as a share of acquired run-rate, reduced by integration synergy (execution 60→85). */
    overheadShare: 0.55, synergy: 0.2,
    integrationLoad: [12, 8],
    cultureShock: -3,
  },
  // Offer = standalone equity value × (0.95 + 0.45 × strategic value) × 0.85 if distressed (control premium grows with value).
  sale: { minStrategicValue: 0.4, premiumBase: 0.95, premiumPerValue: 0.45, distressedFactor: 0.85, dealCost: 3, distractionLoad: 5 },
  stabilize: { maxMargin: 0.06, poolCut: 0.1, costMultiple: 1.5, shocks: { culture: -4, execution: -2 }, investmentCap: 10, rateRelief: 0.005 },
  defaultEnvelope: 30,
} as const;

export interface V2FinalView {
  cash: number;
  debt: number;
  revenue: number;
  operatingProfit: number;
  growth: number;
  execution: number;
  organizationalCapacity: number;
  culture: number;
  aiCommercialReadiness: number;
  destinationStrength: number;
  destinationId: V2DestinationId | null;
  distressed: boolean;
  insolvent: boolean;
  covenantBreach: boolean;
  strategicValue: number;
  /** Equity value before distress discount (EV + cash − debt). */
  standaloneEquityValue: number;
  debtCapacity: number;
  partnerROFR: boolean;
  fixedSemiFixed: number;
}

export interface V2FinalOptionAvailability {
  id: V2FinalOptionId;
  available: boolean;
  reasons: string[];
  /** Headline terms for the player (price, amount, envelope). */
  terms: Record<string, number>;
}

function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}

export function focusSegment(d: V2DestinationId | null): V2SegmentKey {
  switch (d) {
    case 'enterprise-ai': return 'enterprise';
    case 'university-infrastructure': return 'university';
    case 'premium-human-ai': return 'enterprise';
    case 'consumer-ai':
    case 'balanced-marketplace':
    default: return 'consumer';
  }
}

export function acquisitionPrice(): number {
  const A = V2_FINAL_CALIBRATION.acquire;
  return A.targetRunRate * 4 * A.priceMultiple;
}

export function saleOffer(v: V2FinalView): number {
  const S = V2_FINAL_CALIBRATION.sale;
  return Math.max(0, v.standaloneEquityValue) * (S.premiumBase + S.premiumPerValue * v.strategicValue) * (v.distressed ? S.distressedFactor : 1);
}

export function finalOptions(v: V2FinalView): V2FinalOptionAvailability[] {
  const K = V2_FINAL_CALIBRATION;
  const margin = v.revenue > 0 ? v.operatingProfit / v.revenue : 0;
  const opt = (id: V2FinalOptionId, checks: [boolean, string][], terms: Record<string, number> = {}): V2FinalOptionAvailability => ({
    id, available: checks.every(([ok]) => ok), reasons: checks.filter(([ok]) => !ok).map(([, r]) => r), terms,
  });
  const price = acquisitionPrice();
  return [
    opt('continue', [], { envelope: K.defaultEnvelope }),
    opt('scale-independently', [
      [!v.distressed, 'distressed'],
      [v.cash >= K.scale.minCash, `cash below $${K.scale.minCash}M`],
      [margin >= K.scale.minMargin, `operating margin below ${K.scale.minMargin * 100}%`],
      [v.execution >= K.scale.minExecution, `Execution below ${K.scale.minExecution}`],
      [v.organizationalCapacity >= K.scale.minCapacity, `Organizational Capacity below ${K.scale.minCapacity}`],
    ], { envelope: K.scale.envelope }),
    opt('raise-growth-capital', [
      [!v.insolvent, 'insolvent'],
      [!v.partnerROFR, 'strategic partner holds a right of first refusal'],
      [v.growth >= K.raise.minGrowth, `annual revenue growth below ${K.raise.minGrowth * 100}%`],
      [v.aiCommercialReadiness >= K.raise.minAiReadiness || v.destinationStrength >= K.raise.minDestinationStrength,
        'no AI or specialization story for growth investors'],
    ], { amount: K.raise.amount, envelope: K.raise.envelope }),
    opt('acquire-consolidate', [
      [!v.distressed, 'distressed'],
      [v.cash + v.debtCapacity >= price, `cash + debt capacity below the $${price.toFixed(0)}M price`],
      [v.execution >= K.acquire.minExecution, `Execution below ${K.acquire.minExecution}`],
      [v.organizationalCapacity >= K.acquire.minCapacity, `Organizational Capacity below ${K.acquire.minCapacity}`],
      [v.culture >= K.acquire.minCulture, `Culture below ${K.acquire.minCulture}`],
    ], { price, targetRunRate: K.acquire.targetRunRate }),
    opt('strategic-sale', [
      [v.strategicValue >= K.sale.minStrategicValue, `strategic value ${v.strategicValue.toFixed(2)} below ${K.sale.minStrategicValue}`],
      [v.standaloneEquityValue > 0, 'no positive equity value'],
    ], { offer: saleOffer(v) }),
    opt('stabilize-restructure', [
      [v.distressed || v.insolvent || v.covenantBreach || margin < K.stabilize.maxMargin, 'not distressed and margin healthy'],
    ], { investmentCap: K.stabilize.investmentCap }),
  ];
}

export interface V2FinalDecisionRecord {
  quarter: number;
  option: V2FinalOptionId;
  availability: V2FinalOptionAvailability[];
  saleOffer: number | null;
  acquisition: { segment: V2SegmentKey; runRate: number; price: number; overhead: number } | null;
  equityRaised: number;
}

/** Maximum Q8 strategic envelope under an option. */
export function maxEnvelope(option: V2FinalOptionId): number {
  const K = V2_FINAL_CALIBRATION;
  return option === 'scale-independently' ? K.scale.envelope : option === 'raise-growth-capital' ? K.raise.envelope : option === 'stabilize-restructure' ? K.defaultEnvelope : K.defaultEnvelope;
}

export function finalDecisionEffects(
  option: V2FinalOptionId,
  v: V2FinalView,
  quarter: number,
  invested: number
): { effects: V2QuarterEffects; record: V2FinalDecisionRecord; equityAction: number; rateRelief: number; pendingLoad: { quarter: number; load: number }[] } {
  const K = V2_FINAL_CALIBRATION;
  const availability = finalOptions(v);
  const chosen = availability.find(o => o.id === option);
  if (!chosen) throw new Error(`Unknown final option ${option}`);
  if (!chosen.available) throw new Error(`Final option ${option} is not available: ${chosen.reasons.join('; ')}`);
  const e = emptyEffects();
  const src = `Q${quarter} final decision: ${option}`;
  let equityAction = 0;
  let rateRelief = 0;
  let acquisition: V2FinalDecisionRecord['acquisition'] = null;
  let offer: number | null = null;
  const pendingLoad: { quarter: number; load: number }[] = [];

  switch (option) {
    case 'raise-growth-capital':
      equityAction = K.raise.amount;
      break;
    case 'acquire-consolidate': {
      const A = K.acquire;
      const price = acquisitionPrice();
      const segment = focusSegment(v.destinationId);
      const overhead = A.targetRunRate * (A.overheadShare - A.synergy * ramp(v.execution, 60, 85));
      e.eventCosts.push({ id: `acquisition-Q${quarter}`, description: `${src}: consideration for a ${segment} business ($${A.targetRunRate}M/qtr run-rate)`, amount: price, category: 'acquisition' });
      e.revenue.acquiredRunRate.push({ source: src, segment, amount: A.targetRunRate });
      e.cost.fixedPoolDelta.push({ source: `${src}: acquired overhead`, amount: overhead });
      e.extraLoad.push({ source: `${src}: integration`, load: A.integrationLoad[0] });
      pendingLoad.push({ quarter: quarter + 1, load: A.integrationLoad[1] });
      e.stateShocks.push({ source: `${src}: integration`, target: 'culture', delta: A.cultureShock });
      e.stateShocks.push({ source: `${src}: integration`, target: 'execution', delta: -2 * (1 - ramp(v.execution, 60, 80)) });
      acquisition = { segment, runRate: A.targetRunRate, price, overhead };
      break;
    }
    case 'strategic-sale': {
      offer = saleOffer(v);
      e.eventCosts.push({ id: `sale-Q${quarter}`, description: `${src}: advisers and deal costs`, amount: K.sale.dealCost, category: 'final' });
      e.extraLoad.push({ source: `${src}: management distraction`, load: K.sale.distractionLoad });
      break;
    }
    case 'stabilize-restructure': {
      if (invested > K.stabilize.investmentCap + 1e-9) throw new Error(`Stabilize/restructure caps Q${quarter} strategic investment at $${K.stabilize.investmentCap}M (planned $${invested.toFixed(1)}M)`);
      const S = K.stabilize;
      const cut = availableCut(v.fixedSemiFixed, v.fixedSemiFixed * S.poolCut);
      e.cost.fixedPoolDelta.push({ source: `${src}: recovery plan`, amount: -cut });
      e.eventCosts.push({ id: `stabilize-Q${quarter}`, description: `${src}: recovery plan costs`, amount: S.costMultiple * cut, category: 'final' });
      for (const [t, d] of Object.entries(S.shocks)) e.stateShocks.push({ source: `${src}: recovery plan`, target: t as 'culture' | 'execution', delta: d });
      rateRelief = S.rateRelief;
      break;
    }
    default:
      break;
  }
  return {
    effects: e,
    record: { quarter, option, availability, saleOffer: offer, acquisition, equityRaised: equityAction },
    equityAction,
    rateRelief,
    pendingLoad,
  };
}
