/**
 * V2 Simulation Engine — Batch 3: Quarter Effects Bundle
 *
 * Every Q5–Q8 decision module (opportunity, management actions, financing, crisis, final decision)
 * expresses its consequences ONLY through this bundle, which the orchestrator (engineV2.ts) routes
 * through the existing canonical channels:
 *
 *   state shocks        → capability/operating state before this quarter's pipeline (itemised)
 *   commercial shocks   → opening commercial indicators (then the Phase 2C dynamics run)
 *   extra load / gains  → Phase 2B transformation load and cohort creation
 *   revenue adjustments → explicit, itemised lines inside the Phase 2D segment stocks
 *                         (contracted bookings via backlog, customer losses, price, marketing volume,
 *                         acquired run-rate) — never a free "revenue += X"
 *   cost adjustments    → Phase 3A cost architecture (structural fixed-pool changes, commitments,
 *                         marketing spend, interest as financing cost, partner revenue share)
 *   event costs         → itemised ledger event line
 *   financing items     → itemised ledger financing line (principal / equity / partner cash only)
 *
 * Nothing here is a scenario→revenue or destination→revenue shortcut; every revenue line has a cost
 * and a mechanism, and is reported separately for audit.
 *
 * Imports only V2 types; never the frozen V1 engine.
 */

import type { V2CapabilityBucket, V2CapabilityTarget } from './engineV2Capabilities';

export type V2ShockTarget = V2CapabilityTarget | 'culture' | 'execution';

export interface V2StateShock {
  source: string;
  target: V2ShockTarget;
  delta: number;
}

export type V2CommercialShockIndicator =
  | 'consumerRetention'
  | 'consumerCacIndex'
  | 'enterprisePipeline'
  | 'enterpriseWinRate'
  | 'universityPipeline'
  | 'universityRenewalRate'
  | 'pricingPower'
  | 'aiAdoptionIndex';

export interface V2CommercialShock {
  source: string;
  indicator: V2CommercialShockIndicator;
  delta: number;
}

export type V2SegmentKey = 'consumer' | 'enterprise' | 'university' | 'aiNative';

export interface V2RevenueAdjustments {
  /** Contracted bookings entering the Enterprise backlog (recognized on the normal schedule). */
  enterpriseBookings: { id: string; source: string; acv: number; runRate: number }[];
  /** Explicit customer/contract losses removed from a segment's opening stock this quarter. */
  lostRunRate: { source: string; segment: V2SegmentKey; amount: number }[];
  /** Cancellation of not-yet-live backlog (fraction of a cohort's remaining run-rate). */
  backlogCancellation: { source: string; cohortId: string; fraction: number }[];
  /** Price-level actions on the retained Consumer base (fraction, e.g. +0.04 = +4% price). */
  consumerPriceChange: { source: string; fraction: number }[];
  /** Consumer acquisition volume multiplier from marketing level (1 = normal spend). */
  consumerAcquisitionMultiplier: number;
  /** Run-rate added by an acquisition (bought, with its own cost base). */
  acquiredRunRate: { source: string; segment: V2SegmentKey; amount: number }[];
}

export interface V2CostAdjustments {
  /** Permanent structural change to the fixed/semi-fixed pool AND its floor (negative = saving). */
  fixedPoolDelta: { source: string; amount: number }[];
  /** Hiring freeze: the semi-fixed pool may not ratchet upward this quarter. */
  ratchetFrozen: boolean;
  /** Consumer acquisition/marketing spend multiplier (1 = normal). */
  consumerAcquisitionSpendMultiplier: number;
  /** Additional recurring commitments created this quarter (delivery teams, retention packages). */
  extraCommitments: { source: string; id: string; quarterlyCost: number; lag: number; duration: number }[];
  /** Interest on opening debt (financing cost inside operating cost — the only place interest appears). */
  financingCost: number;
  /** Partner economic sharing: rate × revenue of the listed segments, as a variable cost. */
  revenueShare: { source: string; rate: number; segments: V2SegmentKey[] }[];
}

export interface V2EffectEventCost {
  id: string;
  description: string;
  amount: number;
  category: 'opportunity' | 'management' | 'restructuring' | 'crisis' | 'final' | 'distress' | 'acquisition' | 'contract';
}

export interface V2EffectFinancingItem {
  id: string;
  description: string;
  amount: number;
  kind: 'equity' | 'debt-draw' | 'debt-repay' | 'partner';
}

export interface V2QuarterEffects {
  eventCosts: V2EffectEventCost[];
  financingItems: V2EffectFinancingItem[];
  stateShocks: V2StateShock[];
  commercialShocks: V2CommercialShock[];
  extraLoad: { source: string; load: number }[];
  /** Multiplier on new cohorts' effective gains by bucket (e.g. roadmap diverted to client customization). */
  bucketGainMultiplier: Partial<Record<V2CapabilityBucket, number>>;
  revenue: V2RevenueAdjustments;
  cost: V2CostAdjustments;
  notes: string[];
}

export function emptyEffects(): V2QuarterEffects {
  return {
    eventCosts: [],
    financingItems: [],
    stateShocks: [],
    commercialShocks: [],
    extraLoad: [],
    bucketGainMultiplier: {},
    revenue: {
      enterpriseBookings: [],
      lostRunRate: [],
      backlogCancellation: [],
      consumerPriceChange: [],
      consumerAcquisitionMultiplier: 1,
      acquiredRunRate: [],
    },
    cost: {
      fixedPoolDelta: [],
      ratchetFrozen: false,
      consumerAcquisitionSpendMultiplier: 1,
      extraCommitments: [],
      financingCost: 0,
      revenueShare: [],
    },
    notes: [],
  };
}

/** Combine effect bundles: lists concatenate, multipliers multiply, flags OR, interest adds. */
export function mergeEffects(...parts: V2QuarterEffects[]): V2QuarterEffects {
  const out = emptyEffects();
  for (const p of parts) {
    out.eventCosts.push(...p.eventCosts);
    out.financingItems.push(...p.financingItems);
    out.stateShocks.push(...p.stateShocks);
    out.commercialShocks.push(...p.commercialShocks);
    out.extraLoad.push(...p.extraLoad);
    for (const [b, m] of Object.entries(p.bucketGainMultiplier) as [V2CapabilityBucket, number][]) {
      out.bucketGainMultiplier[b] = (out.bucketGainMultiplier[b] ?? 1) * m;
    }
    out.revenue.enterpriseBookings.push(...p.revenue.enterpriseBookings);
    out.revenue.lostRunRate.push(...p.revenue.lostRunRate);
    out.revenue.backlogCancellation.push(...p.revenue.backlogCancellation);
    out.revenue.consumerPriceChange.push(...p.revenue.consumerPriceChange);
    out.revenue.consumerAcquisitionMultiplier *= p.revenue.consumerAcquisitionMultiplier;
    out.revenue.acquiredRunRate.push(...p.revenue.acquiredRunRate);
    out.cost.fixedPoolDelta.push(...p.cost.fixedPoolDelta);
    out.cost.ratchetFrozen = out.cost.ratchetFrozen || p.cost.ratchetFrozen;
    out.cost.consumerAcquisitionSpendMultiplier *= p.cost.consumerAcquisitionSpendMultiplier;
    out.cost.extraCommitments.push(...p.cost.extraCommitments);
    out.cost.financingCost += p.cost.financingCost;
    out.cost.revenueShare.push(...p.cost.revenueShare);
    out.notes.push(...p.notes);
  }
  return out;
}

/** True when the bundle changes nothing (Q1–Q4 companies with no decisions). */
export function isEmptyEffects(e: V2QuarterEffects): boolean {
  return (
    e.eventCosts.length === 0 && e.financingItems.length === 0 && e.stateShocks.length === 0 &&
    e.commercialShocks.length === 0 && e.extraLoad.length === 0 && Object.keys(e.bucketGainMultiplier).length === 0 &&
    e.revenue.enterpriseBookings.length === 0 && e.revenue.lostRunRate.length === 0 && e.revenue.backlogCancellation.length === 0 &&
    e.revenue.consumerPriceChange.length === 0 && e.revenue.consumerAcquisitionMultiplier === 1 && e.revenue.acquiredRunRate.length === 0 &&
    e.cost.fixedPoolDelta.length === 0 && !e.cost.ratchetFrozen && e.cost.consumerAcquisitionSpendMultiplier === 1 &&
    e.cost.extraCommitments.length === 0 && e.cost.financingCost === 0 && e.cost.revenueShare.length === 0
  );
}

export const sumAmounts = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
