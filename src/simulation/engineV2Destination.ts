/**
 * V2 Simulation Engine — Batch 2 · Q4: Strategic Destinations
 *
 * A destination is a real economic commitment, never metadata and never a revenue bonus.
 * It changes only:
 *   1. organizational focus  — aligned buckets carry less Transformation Load and aligned
 *                              initiatives share one coordination slot;
 *   2. specialization ceiling — aligned capabilities may exceed the generic 100 ceiling;
 *   3. accessible market      — focused go-to-market widens the reachable share of the focus
 *                              segment(s) (a headroom effect: it only matters as revenue grows);
 *   4. transition             — committing creates organizational transition load, larger when
 *                              the company is unprepared, and benefits phase in with readiness.
 *
 * Readiness is measured from the capabilities the company actually built in Q1–Q3.
 * The state supports later switching (history + transition), but switching is not yet enabled.
 *
 * Imports only V2 modules; never the frozen V1 engine.
 */

import type { V2CapabilityBucket, V2CapabilityTarget, V2Capabilities } from './engineV2Capabilities';
import type { V2SegmentCapacity } from './engineV2Commercial';

export type V2DestinationId =
  | 'consumer-ai'
  | 'enterprise-ai'
  | 'premium-human-ai'
  | 'university-infrastructure'
  | 'balanced-marketplace';

export type V2ReadinessDriver = V2CapabilityTarget | 'execution';

export interface V2DestinationDefinition {
  id: V2DestinationId;
  name: string;
  personality: string;
  exposures: string[];
  /** Buckets whose initiatives are "on strategy" (focus effects). */
  alignedBuckets: V2CapabilityBucket[];
  /** Readiness: weighted ramps of the capabilities the destination depends on (weights sum to 1). */
  readiness: { driver: V2ReadinessDriver; lo: number; hi: number; weight: number }[];
  /** Capabilities allowed to exceed the generic ceiling as specialization matures. */
  ceilingTargets: V2CapabilityTarget[];
  /** Accessible-market uplift by segment at full strength (fraction of structural capacity). */
  accessUplift: Partial<V2SegmentCapacity>;
  /** Commercial groups whose positive capability-driven terms are amplified (better commercialization). */
  commercialization: ('consumer' | 'enterprise' | 'university' | 'premium')[];
}

export const V2_DESTINATION_CALIBRATION = {
  genericCeiling: 100,
  /** Maximum specialization ceiling for aligned capabilities at full strength. */
  specializationCeiling: 120,
  /** Aligned bucket load multiplier at full strength (1 − 0.2). */
  alignedLoadReductionAtFullStrength: 0.2,
  /** Transition load at zero readiness, per quarter, for `transitionQuarters` quarters from commitment. */
  maxTransitionLoad: 15,
  transitionQuarters: 3,
  /** Strength ramps from readiness toward 1 by this much per quarter after commitment. */
  strengthRampPerQuarter: 0.25,
  /** Commercialization multiplier on the focus segment's positive capability terms at full strength (1 + 0.5). */
  commercializationAtFullStrength: 0.5,
} as const;

export const V2_DESTINATIONS: Record<V2DestinationId, V2DestinationDefinition> = {
  'consumer-ai': {
    id: 'consumer-ai',
    name: 'Consumer AI Learning Platform',
    personality: 'Consumer + AI/Product; large franchise, faster commercialization.',
    exposures: ['churn', 'brand', 'commoditization'],
    alignedBuckets: ['consumer', 'aiProduct'],
    readiness: [
      { driver: 'consumer', lo: 55, hi: 85, weight: 0.4 },
      { driver: 'ai', lo: 10, hi: 45, weight: 0.35 },
      { driver: 'productQuality', lo: 65, hi: 85, weight: 0.25 },
    ],
    ceilingTargets: ['consumer', 'ai'],
    accessUplift: { consumer: 0.1, aiNative: 0.2 },
    commercialization: ['consumer'],
  },
  'enterprise-ai': {
    id: 'enterprise-ai',
    name: 'AI-powered Enterprise Learning Company',
    personality: 'Enterprise + AI + Customer Success/Trust; slower build, high-value recurring potential.',
    exposures: ['implementation burden', 'customer concentration'],
    alignedBuckets: ['enterprise', 'aiProduct'],
    readiness: [
      { driver: 'enterprise', lo: 30, hi: 70, weight: 0.35 },
      { driver: 'ai', lo: 10, hi: 45, weight: 0.25 },
      { driver: 'customerSuccess', lo: 30, hi: 60, weight: 0.25 },
      { driver: 'trust', lo: 65, hi: 85, weight: 0.15 },
    ],
    ceilingTargets: ['enterprise', 'ai', 'customerSuccess'],
    accessUplift: { enterprise: 0.2, aiNative: 0.1 },
    commercialization: ['enterprise'],
  },
  'premium-human-ai': {
    id: 'premium-human-ai',
    name: 'Premium Human + AI',
    personality: 'People + Product + AI + Trust; differentiated premium economics.',
    exposures: ['capacity limits', 'talent dependency', 'carrying cost'],
    alignedBuckets: ['people', 'aiProduct'],
    readiness: [
      { driver: 'talent', lo: 55, hi: 85, weight: 0.35 },
      { driver: 'productQuality', lo: 70, hi: 88, weight: 0.25 },
      { driver: 'ai', lo: 10, hi: 40, weight: 0.2 },
      { driver: 'trust', lo: 70, hi: 85, weight: 0.2 },
    ],
    ceilingTargets: ['talent', 'productQuality', 'trust'],
    accessUplift: { consumer: 0.05, enterprise: 0.05 },
    commercialization: ['premium'],
  },
  'university-infrastructure': {
    id: 'university-infrastructure',
    name: 'University/Credential Infrastructure',
    personality: 'Credential + Trust + Product; slow, sticky, resilient.',
    exposures: ['institutional concentration', 'accreditation'],
    alignedBuckets: ['universityCredentials'],
    readiness: [
      { driver: 'credential', lo: 40, hi: 75, weight: 0.5 },
      { driver: 'trust', lo: 70, hi: 85, weight: 0.3 },
      { driver: 'productQuality', lo: 65, hi: 85, weight: 0.2 },
    ],
    ceilingTargets: ['credential', 'trust'],
    accessUplift: { university: 0.3 },
    commercialization: ['university'],
  },
  'balanced-marketplace': {
    id: 'balanced-marketplace',
    name: 'Balanced Learning Marketplace',
    personality: 'Diversified optionality and resilience; no specialization ceiling; coordination complexity remains.',
    exposures: ['focus', 'coordination complexity'],
    alignedBuckets: [],
    readiness: [
      { driver: 'consumer', lo: 55, hi: 75, weight: 0.25 },
      { driver: 'enterprise', lo: 30, hi: 55, weight: 0.25 },
      { driver: 'ai', lo: 10, hi: 35, weight: 0.25 },
      { driver: 'credential', lo: 40, hi: 60, weight: 0.25 },
    ],
    ceilingTargets: [],
    accessUplift: {},
    commercialization: [],
  },
};

export const V2_DESTINATION_IDS = Object.keys(V2_DESTINATIONS) as V2DestinationId[];

// ============ STATE ============

export interface V2DestinationState {
  id: V2DestinationId;
  committedQuarter: number;
  readinessAtCommit: number;
  readinessBreakdown: { driver: V2ReadinessDriver; value: number; score: number; weight: number }[];
  transition: {
    startQuarter: number;
    endQuarter: number;
    loadPerQuarter: number;
    /** One-off transition cash cost (0 for the initial Q4 commitment; reserved for future switching). */
    cashCost: number;
  };
  /** Full commitment history (supports future switching). */
  history: { id: V2DestinationId; fromQuarter: number; toQuarter: number | null }[];
}

export interface V2DestinationCompanyView {
  capabilities: V2Capabilities;
  productQuality: number;
  trust: number;
  organizationalCapacity: number;
}

function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}

function driverValue(c: V2DestinationCompanyView, d: V2ReadinessDriver): number {
  switch (d) {
    case 'consumer': return c.capabilities.consumer;
    case 'enterprise': return c.capabilities.enterprise;
    case 'customerSuccess': return c.capabilities.customerSuccess;
    case 'ai': return c.capabilities.ai;
    case 'talent': return c.capabilities.talent;
    case 'credential': return c.capabilities.credential;
    case 'execution': return c.capabilities.execution;
    case 'organizationalCapacity': return c.organizationalCapacity;
    case 'productQuality': return c.productQuality;
    case 'trust': return c.trust;
  }
}

export function destinationReadiness(id: V2DestinationId, company: V2DestinationCompanyView) {
  const def = V2_DESTINATIONS[id];
  const breakdown = def.readiness.map(r => {
    const value = driverValue(company, r.driver);
    return { driver: r.driver, value, score: ramp(value, r.lo, r.hi), weight: r.weight };
  });
  return { readiness: breakdown.reduce((s, b) => s + b.score * b.weight, 0), breakdown };
}

export function commitDestination(id: V2DestinationId, company: V2DestinationCompanyView, quarter: number): V2DestinationState {
  if (!(id in V2_DESTINATIONS)) throw new Error(`Unknown destination ${id}`);
  const K = V2_DESTINATION_CALIBRATION;
  const { readiness, breakdown } = destinationReadiness(id, company);
  return {
    id,
    committedQuarter: quarter,
    readinessAtCommit: readiness,
    readinessBreakdown: breakdown,
    transition: {
      startQuarter: quarter,
      endQuarter: quarter + K.transitionQuarters - 1,
      loadPerQuarter: K.maxTransitionLoad * (1 - readiness),
      cashCost: 0,
    },
    history: [{ id, fromQuarter: quarter, toQuarter: null }],
  };
}

// ============ EFFECTS ============

export interface V2DestinationEffects {
  destinationId: V2DestinationId | null;
  /** 0 = no destination benefit, 1 = fully established specialization. */
  strength: number;
  alignedBuckets: V2CapabilityBucket[];
  /** Load multiplier applied to aligned buckets (1 − 0.2 × strength). */
  alignedLoadMultiplier: number;
  /** Weight on the merged coordination count (aligned initiatives count as one), = strength. */
  coordinationMergeWeight: number;
  /** Organizational transition load added this quarter. */
  transitionLoad: number;
  /** Per-target capability ceiling this quarter. */
  ceilings: Partial<Record<V2CapabilityTarget, number>>;
  /** Accessible-market multiplier by segment (1 = structural capacity). */
  accessMultiplier: V2SegmentCapacity;
  /** Commercialization multipliers by group (1 = none). */
  commercialization: { consumer: number; enterprise: number; university: number; premium: number };
}

export const NO_DESTINATION_EFFECTS: V2DestinationEffects = {
  destinationId: null,
  strength: 0,
  alignedBuckets: [],
  alignedLoadMultiplier: 1,
  coordinationMergeWeight: 0,
  transitionLoad: 0,
  ceilings: {},
  accessMultiplier: { consumer: 1, enterprise: 1, university: 1, aiNative: 1 },
  commercialization: { consumer: 1, enterprise: 1, university: 1, premium: 1 },
};

export function destinationStrength(state: V2DestinationState, quarter: number): number {
  if (quarter < state.committedQuarter) return 0;
  return Math.min(1, state.readinessAtCommit + V2_DESTINATION_CALIBRATION.strengthRampPerQuarter * (quarter - state.committedQuarter));
}

export function destinationEffects(state: V2DestinationState | null, quarter: number): V2DestinationEffects {
  if (!state || quarter < state.committedQuarter) return NO_DESTINATION_EFFECTS;
  const K = V2_DESTINATION_CALIBRATION;
  const def = V2_DESTINATIONS[state.id];
  const s = destinationStrength(state, quarter);
  const inTransition = quarter >= state.transition.startQuarter && quarter <= state.transition.endQuarter;
  const ceilings: Partial<Record<V2CapabilityTarget, number>> = {};
  for (const t of def.ceilingTargets) ceilings[t] = K.genericCeiling + (K.specializationCeiling - K.genericCeiling) * s;
  const acc = def.accessUplift;
  return {
    destinationId: state.id,
    strength: s,
    alignedBuckets: [...def.alignedBuckets],
    alignedLoadMultiplier: def.alignedBuckets.length > 0 ? 1 - K.alignedLoadReductionAtFullStrength * s : 1,
    coordinationMergeWeight: def.alignedBuckets.length > 1 ? s : 0,
    transitionLoad: inTransition ? state.transition.loadPerQuarter : 0,
    ceilings,
    commercialization: {
      consumer: def.commercialization.includes('consumer') ? 1 + K.commercializationAtFullStrength * s : 1,
      enterprise: def.commercialization.includes('enterprise') ? 1 + K.commercializationAtFullStrength * s : 1,
      university: def.commercialization.includes('university') ? 1 + K.commercializationAtFullStrength * s : 1,
      premium: def.commercialization.includes('premium') ? 1 + K.commercializationAtFullStrength * s : 1,
    },
    accessMultiplier: {
      consumer: 1 + (acc.consumer ?? 0) * s,
      enterprise: 1 + (acc.enterprise ?? 0) * s,
      university: 1 + (acc.university ?? 0) * s,
      aiNative: 1 + (acc.aiNative ?? 0) * s,
    },
  };
}
