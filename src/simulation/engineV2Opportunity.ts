/**
 * V2 Simulation Engine — Batch 3 · Q5: Major Growth Opportunity / Opportunity Cost
 *
 * A global enterprise contract is NOT "take contract = get revenue". Accepting it:
 *   - books contracted run-rate into the Enterprise backlog (recognized on the normal go-live schedule);
 *   - costs real cash now (implementation + product customization, larger when the product is not ready);
 *   - creates a recurring delivery-team commitment (Phase 3A cost architecture);
 *   - adds organizational transformation load for three quarters (less for a focused Enterprise AI company);
 *   - diverts part of the AI/Product roadmap to client customization (unless Enterprise AI is the destination);
 *   - dilutes the chosen destination's focus when the contract is off-strategy;
 *   - exposes the company to SLA penalties, Trust damage and termination while delivery capability is short.
 * Declining preserves capacity and focus.
 *
 * Delivery health is re-measured every quarter from the company's CURRENT capabilities, so the value of
 * the contract depends on the company built in Q1–Q4 and on what it does next.
 *
 * Imports only V2 modules; never the frozen V1 engine.
 */

import type { V2Capabilities } from './engineV2Capabilities';
import type { V2DestinationId } from './engineV2Destination';
import { V2QuarterEffects, emptyEffects } from './engineV2Effects';

// ============ CALIBRATION ============

export const V2_OPPORTUNITY_CALIBRATION = {
  /** Fit: weighted ramps of the capabilities that determine delivery (weights sum to 1). */
  fit: [
    { driver: 'enterprise', lo: 30, hi: 75, weight: 0.25 },
    { driver: 'customerSuccess', lo: 30, hi: 65, weight: 0.25 },
    { driver: 'aiReadiness', lo: 20, hi: 60, weight: 0.15 },
    { driver: 'productQuality', lo: 65, hi: 85, weight: 0.15 },
    { driver: 'trust', lo: 65, hi: 85, weight: 0.1 },
    { driver: 'execution', lo: 50, hi: 75, weight: 0.1 },
  ] as const,
  /** Delivery health below this starts SLA exposure (shortfall = (threshold − health)/threshold). */
  slaThreshold: 0.6,
  /** SLA penalty per quarter = rate × live run-rate × shortfall (event cost). */
  slaPenaltyRate: 0.5,
  /** Trust damage per quarter live × shortfall. */
  trustPerShortfall: 3,
  /** Termination: share of live run-rate lost per quarter = rate × max(0, threshold − health)/threshold. */
  terminationThreshold: 0.45,
  terminationRate: 0.4,
  /** Capability learned by delivering (per quarter live/implementing, × health). */
  learning: { enterprise: 1.5, customerSuccess: 2 },
  /** Reference-account effect on Enterprise pipeline at acceptance (× fit). */
  referencePipeline: 8,
} as const;

export interface V2OpportunityDefinition {
  id: string;
  quarter: number;
  name: string;
  description: string;
  /** Annual contract value ($M). */
  acv: number;
  /** Upfront implementation cost ($M, event cost at acceptance). */
  implementationCost: number;
  /** Additional customization cost × (1 − product readiness) ($M, event cost at acceptance). */
  customizationCost: number;
  /** Dedicated delivery team: recurring commitment. */
  deliveryTeam: { quarterlyCost: number; lag: number; duration: number };
  /** Transformation load per quarter at zero fit (× (1 − 0.5 fit)); × alignedLoadFactor when on strategy. */
  orgLoad: number;
  loadQuarters: number;
  alignedLoadFactor: number;
  /** Share of AI/Product cohort gains diverted to client customization while the roadmap is committed. */
  roadmapDiversion: number;
  roadmapQuarters: number;
  /** Destination strength lost when the contract is off-strategy (focused non-Enterprise destinations). */
  focusDilution: number;
  /** Destinations for which the contract is on strategy. */
  alignedDestinations: V2DestinationId[];
}

export const V2_OPPORTUNITIES: Record<string, V2OpportunityDefinition> = {
  'q5-global-enterprise': {
    id: 'q5-global-enterprise',
    quarter: 5,
    name: 'Global enterprise AI-learning contract',
    description:
      'A Fortune-100 client wants an AI-enabled learning platform across 40 countries within three quarters: $48M ACV, ' +
      'strict SLAs, localisation and product customization, a dedicated delivery team and roadmap commitments.',
    acv: 48,
    implementationCost: 6,
    customizationCost: 5,
    deliveryTeam: { quarterlyCost: 1.5, lag: 1, duration: 6 },
    orgLoad: 14,
    loadQuarters: 3,
    alignedLoadFactor: 0.6,
    roadmapDiversion: 0.3,
    roadmapQuarters: 3,
    focusDilution: 0.25,
    alignedDestinations: ['enterprise-ai'],
  },
};

// ============ TYPES ============

export interface V2OpportunityCompanyView {
  capabilities: V2Capabilities;
  productQuality: number;
  trust: number;
  aiCommercialReadiness: number;
}

export interface V2OpportunityFit {
  fit: number;
  productReadiness: number;
  breakdown: { driver: string; value: number; score: number; weight: number }[];
}

export interface V2OpportunityTerms {
  offerId: string;
  name: string;
  quarter: number;
  acv: number;
  runRate: number;
  fit: V2OpportunityFit;
  aligned: boolean;
  upfrontCash: number;
  deliveryTeam: V2OpportunityDefinition['deliveryTeam'];
  orgLoadPerQuarter: number;
  loadQuarters: number;
  roadmapDiversion: number;
  focusDilution: number;
}

export interface V2StrategicContract {
  id: string;
  offerId: string;
  name: string;
  acceptedQuarter: number;
  acv: number;
  /** Booked run-rate after any cancellations. */
  bookedRunRate: number;
  cohortId: string;
  fitAtAcceptance: number;
  aligned: boolean;
  orgLoadPerQuarter: number;
  loadEndQuarter: number;
  roadmapDiversion: number;
  roadmapEndQuarter: number;
  /** Run-rate currently live and retained. */
  live: number;
  /** Run-rate recognized from the backlog to date. */
  recognizedToDate: number;
  lostToDate: number;
  status: 'implementing' | 'live' | 'terminated';
  history: { quarter: number; health: number; shortfall: number; slaPenalty: number; lost: number; live: number }[];
}

// ============ FIT ============

function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}

function fitDriver(c: V2OpportunityCompanyView, d: string): number {
  switch (d) {
    case 'enterprise': return c.capabilities.enterprise;
    case 'customerSuccess': return c.capabilities.customerSuccess;
    case 'aiReadiness': return c.aiCommercialReadiness;
    case 'productQuality': return c.productQuality;
    case 'trust': return c.trust;
    case 'execution': return c.capabilities.execution;
    default: throw new Error(`Unknown fit driver ${d}`);
  }
}

/** Delivery fit (0–1) of the company as it stands. Re-measured each quarter as delivery health. */
export function opportunityFit(company: V2OpportunityCompanyView): V2OpportunityFit {
  const breakdown = V2_OPPORTUNITY_CALIBRATION.fit.map(f => {
    const value = fitDriver(company, f.driver);
    return { driver: f.driver, value, score: ramp(value, f.lo, f.hi), weight: f.weight };
  });
  const productReadiness = 0.5 * ramp(company.aiCommercialReadiness, 20, 60) + 0.5 * ramp(company.productQuality, 65, 85);
  return { fit: breakdown.reduce((s, b) => s + b.score * b.weight, 0), productReadiness, breakdown };
}

/** Company-specific terms of an offer (what the player sees before deciding). */
export function opportunityTerms(offerId: string, company: V2OpportunityCompanyView, destination: V2DestinationId | null): V2OpportunityTerms {
  const def = V2_OPPORTUNITIES[offerId];
  if (!def) throw new Error(`Unknown opportunity ${offerId}`);
  const fit = opportunityFit(company);
  const aligned = destination !== null && def.alignedDestinations.includes(destination);
  const focused = destination !== null && destination !== 'balanced-marketplace';
  return {
    offerId,
    name: def.name,
    quarter: def.quarter,
    acv: def.acv,
    runRate: def.acv / 4,
    fit,
    aligned,
    upfrontCash: def.implementationCost + def.customizationCost * (1 - fit.productReadiness),
    deliveryTeam: { ...def.deliveryTeam },
    orgLoadPerQuarter: def.orgLoad * (1 - 0.5 * fit.fit) * (aligned ? def.alignedLoadFactor : 1),
    loadQuarters: def.loadQuarters,
    roadmapDiversion: aligned ? 0 : def.roadmapDiversion,
    focusDilution: aligned || !focused ? 0 : def.focusDilution,
  };
}

// ============ ACCEPTANCE ============

export function acceptOpportunity(
  offerId: string,
  company: V2OpportunityCompanyView,
  destination: V2DestinationId | null,
  quarter: number
): { contract: V2StrategicContract; effects: V2QuarterEffects; terms: V2OpportunityTerms } {
  const def = V2_OPPORTUNITIES[offerId];
  if (!def) throw new Error(`Unknown opportunity ${offerId}`);
  if (def.quarter !== quarter) throw new Error(`Opportunity ${offerId} is offered in Q${def.quarter}, not Q${quarter}`);
  const terms = opportunityTerms(offerId, company, destination);
  const cohortId = `E-Q${quarter}-${offerId}`;
  const e = emptyEffects();
  e.eventCosts.push(
    { id: `${offerId}-implementation`, description: `${def.name}: implementation programme`, amount: def.implementationCost, category: 'opportunity' },
    { id: `${offerId}-customization`, description: `${def.name}: product customization (× (1 − product readiness ${terms.fit.productReadiness.toFixed(2)}))`, amount: def.customizationCost * (1 - terms.fit.productReadiness), category: 'opportunity' },
  );
  e.revenue.enterpriseBookings.push({ id: cohortId, source: offerId, acv: def.acv, runRate: terms.runRate });
  e.cost.extraCommitments.push({
    source: `${def.name}: dedicated delivery team`, id: `C-contract-${offerId}`,
    quarterlyCost: def.deliveryTeam.quarterlyCost, lag: def.deliveryTeam.lag, duration: def.deliveryTeam.duration,
  });
  e.extraLoad.push({ source: `${offerId}: delivery programme`, load: terms.orgLoadPerQuarter });
  if (terms.roadmapDiversion > 0) e.bucketGainMultiplier.aiProduct = 1 - terms.roadmapDiversion;
  e.commercialShocks.push({ source: `${offerId}: reference account`, indicator: 'enterprisePipeline', delta: V2_OPPORTUNITY_CALIBRATION.referencePipeline * terms.fit.fit });
  e.notes.push(`Accepted ${def.name} (fit ${terms.fit.fit.toFixed(2)}, ${terms.aligned ? 'on strategy' : 'off strategy'})`);
  const contract: V2StrategicContract = {
    id: `K-${offerId}`,
    offerId,
    name: def.name,
    acceptedQuarter: quarter,
    acv: def.acv,
    bookedRunRate: terms.runRate,
    cohortId,
    fitAtAcceptance: terms.fit.fit,
    aligned: terms.aligned,
    orgLoadPerQuarter: terms.orgLoadPerQuarter,
    loadEndQuarter: quarter + def.loadQuarters - 1,
    roadmapDiversion: terms.roadmapDiversion,
    roadmapEndQuarter: quarter + def.roadmapQuarters - 1,
    live: 0,
    recognizedToDate: 0,
    lostToDate: 0,
    status: 'implementing',
    history: [],
  };
  return { contract, effects: e, terms };
}

// ============ ONGOING DELIVERY ============

/**
 * Quarterly effects of an accepted contract, from the OPENING state (lagged: this quarter's delivery is
 * judged on the capabilities the company brings into the quarter).
 */
export function contractEffects(
  contract: V2StrategicContract,
  company: V2OpportunityCompanyView,
  quarter: number
): { effects: V2QuarterEffects; health: number; shortfall: number; slaPenalty: number; lostLive: number; cancelFraction: number } {
  const K = V2_OPPORTUNITY_CALIBRATION;
  const e = emptyEffects();
  if (contract.status === 'terminated' || quarter <= contract.acceptedQuarter) {
    return { effects: e, health: 0, shortfall: 0, slaPenalty: 0, lostLive: 0, cancelFraction: 0 };
  }
  const health = opportunityFit(company).fit;
  const shortfall = Math.max(0, K.slaThreshold - health) / K.slaThreshold;
  if (quarter <= contract.loadEndQuarter) e.extraLoad.push({ source: `${contract.offerId}: delivery programme`, load: contract.orgLoadPerQuarter });
  if (quarter <= contract.roadmapEndQuarter && contract.roadmapDiversion > 0) e.bucketGainMultiplier.aiProduct = 1 - contract.roadmapDiversion;
  const slaPenalty = K.slaPenaltyRate * contract.live * shortfall;
  if (slaPenalty > 0) e.eventCosts.push({ id: `${contract.offerId}-sla-Q${quarter}`, description: `${contract.name}: SLA penalties (shortfall ${shortfall.toFixed(2)})`, amount: slaPenalty, category: 'contract' });
  if (contract.live > 0 && shortfall > 0) e.stateShocks.push({ source: `${contract.offerId}: delivery failures`, target: 'trust', delta: -K.trustPerShortfall * shortfall });
  const termination = K.terminationRate * Math.max(0, K.terminationThreshold - health) / K.terminationThreshold;
  const lostLive = contract.live * termination;
  if (lostLive > 0) e.revenue.lostRunRate.push({ source: `${contract.offerId}: scope terminated for poor delivery`, segment: 'enterprise', amount: lostLive });
  if (termination > 0) e.revenue.backlogCancellation.push({ source: `${contract.offerId}: go-live scope cancelled`, cohortId: contract.cohortId, fraction: termination });
  // Learning by delivering (capability built through the programme)
  e.stateShocks.push(
    { source: `${contract.offerId}: delivery learning`, target: 'enterprise', delta: K.learning.enterprise * health },
    { source: `${contract.offerId}: delivery learning`, target: 'customerSuccess', delta: K.learning.customerSuccess * health },
  );
  return { effects: e, health, shortfall, slaPenalty, lostLive, cancelFraction: termination };
}

/** Advance contract bookkeeping after the quarter's revenue consequence. */
export function updateContract(
  contract: V2StrategicContract,
  quarter: number,
  outcome: { health: number; shortfall: number; slaPenalty: number; lostLive: number; cancelFraction: number },
  closingCohort: { runRate: number; remaining: number } | undefined,
  cancelledRunRate: number
): V2StrategicContract {
  if (contract.status === 'terminated') return contract;
  const bookedRunRate = contract.bookedRunRate - cancelledRunRate;
  const recognizedToDate = closingCohort ? closingCohort.runRate - closingCohort.remaining : bookedRunRate;
  const newlyLive = Math.max(0, recognizedToDate - contract.recognizedToDate);
  const live = Math.max(0, contract.live - outcome.lostLive + newlyLive);
  const lostToDate = contract.lostToDate + outcome.lostLive + cancelledRunRate;
  const status: V2StrategicContract['status'] = bookedRunRate <= 1e-9 && live <= 1e-9 ? 'terminated' : closingCohort ? 'implementing' : 'live';
  return {
    ...contract,
    bookedRunRate,
    recognizedToDate,
    live,
    lostToDate,
    status,
    history: quarter > contract.acceptedQuarter
      ? [...contract.history, { quarter, health: outcome.health, shortfall: outcome.shortfall, slaPenalty: outcome.slaPenalty, lost: outcome.lostLive + cancelledRunRate, live }]
      : [...contract.history, { quarter, health: contract.fitAtAcceptance, shortfall: 0, slaPenalty: 0, lost: 0, live }],
  };
}

/**
 * Share of contracted Enterprise run-rate that depends on strategic contracts (concentration). Contracted run-rate
 * = live revenue + booked scope not yet live: a client whose programme is mid-rollout is already a concentration risk.
 */
export function contractConcentration(contracts: V2StrategicContract[], enterpriseRevenue: number): number {
  const active = contracts.filter(c => c.status !== 'terminated');
  const live = active.reduce((s, c) => s + c.live, 0);
  const pending = active.reduce((s, c) => s + Math.max(0, c.bookedRunRate - c.recognizedToDate), 0);
  const base = enterpriseRevenue + pending;
  return base > 0 ? Math.min(1, (live + pending) / base) : 0;
}
