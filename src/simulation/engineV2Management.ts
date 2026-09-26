/**
 * V2 Simulation Engine — Batch 3 · Q6: Management Actions (recession / resource constraint responses)
 *
 * Every action has first-order economics AND second-order consequences, routed through the canonical channels:
 *
 *   workforce reduction  → fixed/semi-fixed pool AND floor fall (cost architecture); severance is an event cost;
 *                          Talent, Culture, Org Capacity, Execution, Customer Success (and AI/Product unless R&D is
 *                          protected) fall now, and survivor attrition continues for two quarters (aftershocks).
 *                          Lower capacity/culture reduce the absorption of every future investment.
 *   marketing level      → consumer acquisition spend × level (cost) and acquisition volume × level^0.7 (revenue):
 *                          cash now, fewer customers compounding later. Persists until changed.
 *   hiring freeze        → semi-fixed pool may not ratchet up, attrition not backfilled (−1.5% pool); People
 *                          investment not allowed; Talent/Culture/Org Capacity erode while frozen.
 *   pricing action       → explicit price change on the retained Consumer base, with retention/CAC response
 *                          scaled by Pricing Power (a raise is safer for a company with pricing power).
 *   close weak offerings → exit the long tail of the Consumer catalogue: revenue loss, overhead removed, wind-down
 *                          cost, capacity/execution freed (focus), small Trust cost.
 *   slow investment / protect AI / continue investing → expressed through the allocation itself (Cash Reserve).
 *
 * No action creates free savings: each saving is paid for in capability, capacity or future revenue.
 * Imports only V2 modules; never the frozen V1 engine.
 */

import { V2QuarterEffects, V2StateShock, emptyEffects, availableCut } from './engineV2Effects';

export const V2_MANAGEMENT_CALIBRATION = {
  workforce: {
    targeted: {
      poolCut: 0.06,
      shocks: { talent: -5, culture: -7, organizationalCapacity: -6, execution: -3, customerSuccess: -3, ai: -2, productQuality: -1.5 },
      aftershock: { talent: -1.5, culture: -1 },
    },
    deep: {
      poolCut: 0.14,
      shocks: { talent: -11, culture: -15, organizationalCapacity: -12, execution: -7, customerSuccess: -6, ai: -6, productQuality: -4 },
      aftershock: { talent: -3, culture: -2.5 },
    },
    /** Severance and exit costs = × one quarter of the savings. */
    severanceMultiple: 1.25,
    aftershockQuarters: 2,
    /** Protecting R&D: savings × 0.75; AI/Product/PQ untouched; commercial teams take more (CS, Consumer ×1.5). */
    protectRnDSavings: 0.75,
    protectRnDCommercialMultiplier: 1.5,
    protectRnDConsumerShock: { targeted: -2, deep: -5 },
  },
  marketing: {
    minLevel: 0.3,
    maxLevel: 1.3,
    /** Acquisition volume ∝ spend^elasticity (cuts remove the least efficient spend first). */
    volumeElasticity: 0.7,
  },
  hiringFreeze: {
    poolCut: 0.015,
    shocks: { talent: -1.5, culture: -1.5, organizationalCapacity: -1 },
  },
  /**
   * Price actions on the retained Consumer base. The volume response scales with Pricing Power (pp):
   *   raise:    retention −5 × (2 − 2·pp/100), CAC +6 × same scale  (pp 50 ≈ break-even-to-negative; pp 80 clearly positive)
   *   discount: retention +4.5 × (1.5 − pp/100), CAC −10             (helps weak-pricing-power companies protect volume)
   * Calibrated at the Q6 checkpoint: a flat −2.5 retention made a recession price rise a near-free win.
   */
  pricing: {
    raise: { price: 0.03, retention: -5, cac: 6 },
    discount: { price: -0.04, retention: 4.5, cac: -10 },
  },
  closeWeakOfferings: {
    consumerRevenueShare: 0.06,
    poolCut: 0.055,
    windDownCost: 3,
    shocks: { organizationalCapacity: 4, execution: 2, trust: -1 },
  },
} as const;

export interface V2ManagementActions {
  workforceReduction?: { depth: 'targeted' | 'deep'; protectRnD?: boolean };
  /** Consumer marketing level (1 = normal). Persists until changed. */
  marketingLevel?: number;
  hiringFreeze?: boolean;
  pricing?: 'raise' | 'discount';
  closeWeakOfferings?: boolean;
}

export interface V2ScheduledShock extends V2StateShock {
  quarter: number;
}

export interface V2ManagementState {
  marketingLevel: number;
  /** Future shocks already committed (e.g. survivor attrition after layoffs). */
  scheduledShocks: V2ScheduledShock[];
  history: { quarter: number; actions: V2ManagementActions; savingsPerQuarter: number; oneOffCost: number }[];
}

export function getManagementBaseline(): V2ManagementState {
  return { marketingLevel: 1, scheduledShocks: [], history: [] };
}

export interface V2ManagementView {
  fixedSemiFixed: number;
  consumerRevenue: number;
  pricingPower: number;
  peopleInvestment: number;
}

function shocksFrom(source: string, map: Record<string, number>, scale = 1): V2StateShock[] {
  return Object.entries(map).map(([target, delta]) => ({ source, target: target as V2StateShock['target'], delta: delta * scale }));
}

export function managementEffects(
  state: V2ManagementState,
  view: V2ManagementView,
  actions: V2ManagementActions | undefined,
  quarter: number
): { effects: V2QuarterEffects; state: V2ManagementState; savingsPerQuarter: number; oneOffCost: number } {
  const K = V2_MANAGEMENT_CALIBRATION;
  const e = emptyEffects();
  let savings = 0;
  let oneOff = 0;
  const scheduled = state.scheduledShocks.filter(s => s.quarter > quarter);
  // Previously committed aftershocks land now
  for (const s of state.scheduledShocks.filter(x => x.quarter === quarter)) e.stateShocks.push({ source: s.source, target: s.target, delta: s.delta });

  const a = actions ?? {};
  let pool = view.fixedSemiFixed;
  /** Apply a structural cut, never below the structural minimum pool. */
  const takeCut = (requested: number) => { const c = availableCut(pool, requested); pool -= c; return c; };

  if (a.workforceReduction) {
    const d = a.workforceReduction.depth;
    const cfg = K.workforce[d];
    const protect = a.workforceReduction.protectRnD === true;
    const cut = takeCut(view.fixedSemiFixed * cfg.poolCut * (protect ? K.workforce.protectRnDSavings : 1));
    savings += cut;
    const severance = K.workforce.severanceMultiple * cut;
    oneOff += severance;
    const src = `workforce reduction (${d}${protect ? ', R&D protected' : ''})`;
    e.cost.fixedPoolDelta.push({ source: src, amount: -cut });
    e.eventCosts.push({ id: `mgmt-severance-Q${quarter}`, description: `${src}: severance and exit costs`, amount: severance, category: 'management' });
    for (const sh of shocksFrom(src, cfg.shocks)) {
      if (protect && (sh.target === 'ai' || sh.target === 'productQuality')) continue;
      if (protect && sh.target === 'customerSuccess') sh.delta *= K.workforce.protectRnDCommercialMultiplier;
      e.stateShocks.push(sh);
    }
    if (protect) e.stateShocks.push({ source: src, target: 'consumer', delta: K.workforce.protectRnDConsumerShock[d] });
    for (let k = 1; k <= K.workforce.aftershockQuarters; k++) {
      for (const sh of shocksFrom(`${src}: survivor attrition`, cfg.aftershock)) scheduled.push({ ...sh, quarter: quarter + k });
    }
  }

  let marketingLevel = state.marketingLevel;
  if (a.marketingLevel !== undefined) {
    if (!(a.marketingLevel >= K.marketing.minLevel && a.marketingLevel <= K.marketing.maxLevel)) {
      throw new Error(`Marketing level must be within ${K.marketing.minLevel}–${K.marketing.maxLevel}, got ${a.marketingLevel}`);
    }
    marketingLevel = a.marketingLevel;
  }
  if (marketingLevel !== 1) {
    e.cost.consumerAcquisitionSpendMultiplier = marketingLevel;
    e.revenue.consumerAcquisitionMultiplier = Math.pow(marketingLevel, K.marketing.volumeElasticity);
  }

  if (a.hiringFreeze) {
    if (view.peopleInvestment > 0) throw new Error('A hiring freeze cannot be combined with People investment in the same quarter');
    const cut = takeCut(view.fixedSemiFixed * K.hiringFreeze.poolCut);
    savings += cut;
    e.cost.ratchetFrozen = true;
    e.cost.fixedPoolDelta.push({ source: 'hiring freeze (attrition not backfilled)', amount: -cut });
    e.stateShocks.push(...shocksFrom('hiring freeze', K.hiringFreeze.shocks));
  }

  if (a.pricing) {
    const p = K.pricing[a.pricing];
    // Pricing power softens the volume response to a raise; weak pricing power makes a discount protect more volume.
    const ppScale = a.pricing === 'raise' ? Math.max(0, 2 - 2 * view.pricingPower / 100) : Math.max(0, 1.5 - view.pricingPower / 100);
    e.revenue.consumerPriceChange.push({ source: `pricing: ${a.pricing}`, fraction: p.price });
    e.commercialShocks.push(
      { source: `pricing: ${a.pricing}`, indicator: 'consumerRetention', delta: p.retention * ppScale },
      { source: `pricing: ${a.pricing}`, indicator: 'consumerCacIndex', delta: a.pricing === 'raise' ? p.cac * ppScale : p.cac },
    );
  }

  if (a.closeWeakOfferings) {
    const c = K.closeWeakOfferings;
    const lost = view.consumerRevenue * c.consumerRevenueShare;
    const cut = takeCut(view.fixedSemiFixed * c.poolCut);
    savings += cut;
    oneOff += c.windDownCost;
    e.revenue.lostRunRate.push({ source: 'closed weak consumer offerings', segment: 'consumer', amount: lost });
    e.cost.fixedPoolDelta.push({ source: 'closed weak consumer offerings: overhead removed', amount: -cut });
    e.eventCosts.push({ id: `mgmt-winddown-Q${quarter}`, description: 'Closed weak offerings: wind-down', amount: c.windDownCost, category: 'management' });
    e.stateShocks.push(...shocksFrom('closed weak offerings (focus)', c.shocks));
  }

  const acted = Object.keys(a).length > 0;
  return {
    effects: e,
    state: {
      marketingLevel,
      scheduledShocks: scheduled,
      history: acted ? [...state.history, { quarter, actions: { ...a }, savingsPerQuarter: savings, oneOffCost: oneOff }] : state.history,
    },
    savingsPerQuarter: savings,
    oneOffCost: oneOff,
  };
}
