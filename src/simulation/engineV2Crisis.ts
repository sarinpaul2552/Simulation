/**
 * V2 Simulation Engine — Batch 3 · Q7: Strategy-Dependent Crisis
 *
 * The crisis is derived from the company actually built: its type follows the committed destination, and its
 * SEVERITY follows the company's own vulnerabilities (never an identical penalty per destination):
 *
 *   Consumer AI        → AI-quality incident + commoditization price war (PQ, Trust, AI readiness, consumer exposure, retention)
 *   Enterprise AI      → major-client SLA/reliability failure (client concentration, CS, Execution, PQ, AI readiness)
 *   Premium Human + AI → expert-talent drain / service-capacity crunch (Talent, Capacity, Culture, load, AI support)
 *   University         → accreditation / institutional-trust challenge (Credential, Trust, PQ, university exposure)
 *   Balanced           → complexity / coordination breakdown (breadth, Execution, load, Capacity, Culture)
 *
 * Severity = 0.2 + 0.8 × vulnerability (0.2 well-built … 1.0 badly built). Every response trades cash, capability,
 * trust, execution and future economics; impacts flow only through itemised shocks, explicit customer losses,
 * price lines, load and event costs.
 *
 * Imports only V2 modules; never the frozen V1 engine.
 */

import type { V2Capabilities } from './engineV2Capabilities';
import type { V2DestinationId } from './engineV2Destination';
import { V2QuarterEffects, V2StateShock, V2CommercialShock, emptyEffects, availableCut } from './engineV2Effects';

export type V2CrisisType = 'consumer-ai-quality' | 'enterprise-client' | 'premium-talent' | 'university-accreditation' | 'balanced-complexity';
export type V2CrisisResponseId = 'remediate' | 'contain' | 'absorb';

export interface V2CrisisCompanyView {
  capabilities: V2Capabilities;
  productQuality: number;
  trust: number;
  culture: number;
  organizationalCapacity: number;
  aiCommercialReadiness: number;
  consumerRetention: number;
  enterprisePipeline: number;
  universityPipeline: number;
  segmentRevenue: { consumer: number; enterprise: number; university: number; aiNative: number };
  /** Share of Enterprise revenue dependent on strategic contracts. */
  contractConcentration: number;
  lastLoadToCapacity: number;
  lastActiveInitiatives: number;
  fixedSemiFixed: number;
  /** Strategic-contract booking cohorts with scope not yet live (cancelled in proportion if the client walks). */
  contractCohorts: { cohortId: string; remaining: number }[];
}

export interface V2CrisisDriver { label: string; value: number; score: number; weight: number }

export interface V2CrisisResponseOption {
  id: V2CrisisResponseId;
  label: string;
  description: string;
  /** Upfront cash (event cost) at this severity. */
  cash: number;
}

export interface V2CrisisAssessment {
  type: V2CrisisType;
  destinationId: V2DestinationId;
  title: string;
  description: string;
  vulnerability: number;
  severity: number;
  drivers: V2CrisisDriver[];
  responses: V2CrisisResponseOption[];
}

export interface V2CrisisRecord {
  quarter: number;
  assessment: V2CrisisAssessment;
  response: V2CrisisResponseId;
  /** Explicit customer run-rate lost (by segment). */
  lostRunRate: number;
  eventCost: number;
}

export interface V2CrisisState {
  record: V2CrisisRecord | null;
  /** Aftershocks committed for later quarters. */
  pending: { quarter: number; stateShocks: V2StateShock[]; commercialShocks: V2CommercialShock[] }[];
}

export function getCrisisBaseline(): V2CrisisState {
  return { record: null, pending: [] };
}

// ============ CALIBRATION ============

export const V2_CRISIS_CALIBRATION = {
  severity: { base: 0.2, span: 0.8 },
  /** Typical largest-client share of Enterprise revenue without a strategic contract. */
  baselineTopClientShare: 0.12,
} as const;

function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}
const inv = (x: number, lo: number, hi: number) => 1 - ramp(x, lo, hi);

const TYPE_OF: Record<V2DestinationId, V2CrisisType> = {
  'consumer-ai': 'consumer-ai-quality',
  'enterprise-ai': 'enterprise-client',
  'premium-human-ai': 'premium-talent',
  'university-infrastructure': 'university-accreditation',
  'balanced-marketplace': 'balanced-complexity',
};

function drivers(type: V2CrisisType, c: V2CrisisCompanyView): V2CrisisDriver[] {
  const total = c.segmentRevenue.consumer + c.segmentRevenue.enterprise + c.segmentRevenue.university + c.segmentRevenue.aiNative;
  const conc = Math.max(c.contractConcentration, V2_CRISIS_CALIBRATION.baselineTopClientShare);
  const d = (label: string, value: number, score: number, weight: number) => ({ label, value, score, weight });
  switch (type) {
    case 'consumer-ai-quality': return [
      d('Product Quality (65→90)', c.productQuality, inv(c.productQuality, 65, 90), 0.25),
      d('Trust (60→85)', c.trust, inv(c.trust, 60, 85), 0.2),
      d('AI commercial readiness (30→80)', c.aiCommercialReadiness, inv(c.aiCommercialReadiness, 30, 80), 0.25),
      d('Consumer revenue share (50%→80%)', c.segmentRevenue.consumer / total, ramp(c.segmentRevenue.consumer / total, 0.5, 0.8), 0.15),
      d('Consumer retention (80→92)', c.consumerRetention, inv(c.consumerRetention, 80, 92), 0.15),
    ];
    case 'enterprise-client': return [
      d('Largest-client concentration (10%→35%)', conc, ramp(conc, 0.1, 0.35), 0.3),
      d('Customer Success (30→70)', c.capabilities.customerSuccess, inv(c.capabilities.customerSuccess, 30, 70), 0.25),
      d('Execution (50→80)', c.capabilities.execution, inv(c.capabilities.execution, 50, 80), 0.2),
      d('Product Quality (65→85)', c.productQuality, inv(c.productQuality, 65, 85), 0.15),
      d('AI commercial readiness (30→70)', c.aiCommercialReadiness, inv(c.aiCommercialReadiness, 30, 70), 0.1),
    ];
    case 'premium-talent': return [
      d('Talent (55→95)', c.capabilities.talent, inv(c.capabilities.talent, 55, 95), 0.3),
      d('Organizational Capacity (55→90)', c.organizationalCapacity, inv(c.organizationalCapacity, 55, 90), 0.2),
      d('Culture (60→80)', c.culture, inv(c.culture, 60, 80), 0.25),
      d('Load / capacity (0.5→1.1)', c.lastLoadToCapacity, ramp(c.lastLoadToCapacity, 0.5, 1.1), 0.1),
      d('AI support for experts (30→70)', c.aiCommercialReadiness, inv(c.aiCommercialReadiness, 30, 70), 0.15),
    ];
    case 'university-accreditation': return [
      d('Credential capability (50→95)', c.capabilities.credential, inv(c.capabilities.credential, 50, 95), 0.3),
      d('Trust (65→90)', c.trust, inv(c.trust, 65, 90), 0.3),
      d('Product Quality (65→85)', c.productQuality, inv(c.productQuality, 65, 85), 0.2),
      d('University revenue share (5%→20%)', c.segmentRevenue.university / total, ramp(c.segmentRevenue.university / total, 0.05, 0.2), 0.2),
    ];
    case 'balanced-complexity': return [
      d('Initiative breadth (2→5 active)', c.lastActiveInitiatives, ramp(c.lastActiveInitiatives, 2, 5), 0.25),
      d('Execution (50→80)', c.capabilities.execution, inv(c.capabilities.execution, 50, 80), 0.25),
      d('Load / capacity (0.5→1.1)', c.lastLoadToCapacity, ramp(c.lastLoadToCapacity, 0.5, 1.1), 0.2),
      d('Organizational Capacity (55→90)', c.organizationalCapacity, inv(c.organizationalCapacity, 55, 90), 0.15),
      d('Culture (60→80)', c.culture, inv(c.culture, 60, 80), 0.15),
    ];
  }
}

const TEXT: Record<V2CrisisType, { title: string; description: string; responses: Record<V2CrisisResponseId, [string, string]> }> = {
  'consumer-ai-quality': {
    title: 'AI tutor error goes viral as free rivals start a price war',
    description: 'A widely shared AI tutoring mistake questions product quality just as free AI competitors undercut paid plans.',
    responses: {
      remediate: ['Fix quality + free safety tier', 'Pull engineers onto quality, launch a free safety tier, public remediation: costs cash, load and roadmap.'],
      contain: ['Price defense', 'Discount and retention offers: protects part of the base at a lower price.'],
      absorb: ['Ride it out', 'No spend: full churn, CAC and brand damage, lingering next quarter.'],
    },
  },
  'enterprise-client': {
    title: 'Major client SLA failure threatens a key account',
    description: 'A reliability incident breaches SLAs at the largest client; procurement threatens to terminate and references dry up.',
    responses: {
      remediate: ['War room + service credits', 'Senior delivery team, credits instead of penalties: costs cash and load, saves most of the account.'],
      contain: ['Renegotiate to keep', 'Keep the client at a 25% lower price on the at-risk scope; some trust damage.'],
      absorb: ['Let it go', 'No spend: lose much of the at-risk scope, SLA penalties, trust and win-rate damage.'],
    },
  },
  'premium-talent': {
    title: 'Expert talent drain hits premium service capacity',
    description: 'Competitors poach senior experts; demand now exceeds expert capacity and service quality slips.',
    responses: {
      remediate: ['Retention packages + career paths', 'Cash plus a recurring retention commitment: keeps most experts and quality.'],
      contain: ['AI-assisted service model', 'Automate part of the service: cheaper, but load, culture strain and quality risk if AI is not ready.'],
      absorb: ['Accept attrition', 'No spend: lose experts, capacity and quality; more departures follow.'],
    },
  },
  'university-accreditation': {
    title: 'Regulator challenges AI-assisted credentials',
    description: 'An accreditation body questions the integrity of AI-assisted assessment; institutions pause renewals and new programmes.',
    responses: {
      remediate: ['Full compliance programme + independent audit', 'Cash and load now; renewals and credibility largely protected.'],
      contain: ['Partial remediation', 'Limited fixes: moderate cost, moderate damage.'],
      absorb: ['Contest the finding', 'No spend: full renewal and pipeline damage, extra trust loss.'],
    },
  },
  'balanced-complexity': {
    title: 'Coordination breakdown across too many fronts',
    description: 'Competing priorities across segments cause missed launches, service slips and internal friction.',
    responses: {
      remediate: ['Operating-model redesign', 'Cash and load now to simplify governance; execution and capacity recover.'],
      contain: ['Close the weakest offerings', 'Exit the long tail: revenue loss, overhead removed, partial relief.'],
      absorb: ['Push through', 'No spend: execution, capacity and service damage.'],
    },
  },
};

function responseCash(type: V2CrisisType, id: V2CrisisResponseId, s: number): number {
  if (id === 'absorb') return 0;
  const table: Record<V2CrisisType, Record<'remediate' | 'contain', number>> = {
    'consumer-ai-quality': { remediate: 4 + 12 * s, contain: 1 },
    'enterprise-client': { remediate: 4 + 8 * s, contain: 0 },
    'premium-talent': { remediate: 3 + 6 * s, contain: 2 },
    'university-accreditation': { remediate: 3 + 6 * s, contain: 1.5 },
    'balanced-complexity': { remediate: 3 + 5 * s, contain: 3 },
  };
  return table[type][id];
}

export function assessCrisis(destinationId: V2DestinationId, company: V2CrisisCompanyView): V2CrisisAssessment {
  const type = TYPE_OF[destinationId];
  const dr = drivers(type, company);
  const vulnerability = dr.reduce((t, d) => t + d.score * d.weight, 0);
  const severity = V2_CRISIS_CALIBRATION.severity.base + V2_CRISIS_CALIBRATION.severity.span * vulnerability;
  const T = TEXT[type];
  return {
    type, destinationId, title: T.title, description: T.description, vulnerability, severity, drivers: dr,
    responses: (['remediate', 'contain', 'absorb'] as const).map(id => ({ id, label: T.responses[id][0], description: T.responses[id][1], cash: responseCash(type, id, severity) })),
  };
}

// ============ EFFECTS ============

const ss = (source: string, target: V2StateShock['target'], delta: number): V2StateShock => ({ source, target, delta });
const cs = (source: string, indicator: V2CommercialShock['indicator'], delta: number): V2CommercialShock => ({ source, indicator, delta });

/**
 * Effects of the crisis in its quarter plus the aftershocks it commits for the next quarter.
 * `contractLoss` is the part of the lost Enterprise run-rate taken from strategic contracts (for contract bookkeeping).
 */
export function crisisEffects(
  a: V2CrisisAssessment,
  response: V2CrisisResponseId,
  company: V2CrisisCompanyView,
  quarter: number
): { effects: V2QuarterEffects; pending: V2CrisisState['pending']; record: V2CrisisRecord; contractLoss: number } {
  const e = emptyEffects();
  const s = a.severity;
  const src = `Q${quarter} crisis: ${a.title} (${response})`;
  const cash = responseCash(a.type, response, s);
  if (cash > 0) e.eventCosts.push({ id: `crisis-Q${quarter}-${response}`, description: `${src}`, amount: cash, category: 'crisis' });
  const next: V2CrisisState['pending'][number] = { quarter: quarter + 1, stateShocks: [], commercialShocks: [] };
  let lost = 0;
  let contractLoss = 0;

  switch (a.type) {
    case 'consumer-ai-quality': {
      const m = response === 'remediate' ? 0.4 : response === 'contain' ? 0.6 : 1;
      const mt = response === 'remediate' ? 0.4 : response === 'contain' ? 0.8 : 1;
      lost = (0.01 + 0.05 * s) * company.segmentRevenue.consumer * m;
      e.revenue.lostRunRate.push({ source: `${src}: refund and cancellation wave`, segment: 'consumer', amount: lost });
      e.commercialShocks.push(
        cs(src, 'consumerRetention', -(4 + 12 * s) * m),
        cs(src, 'consumerCacIndex', (8 + 25 * s) * m),
        cs(src, 'pricingPower', -(3 + 10 * s) * mt),
      );
      e.stateShocks.push(ss(src, 'trust', -(2 + 8 * s) * mt));
      if (response === 'remediate') {
        e.stateShocks.push(ss(src, 'productQuality', 3));
        e.extraLoad.push({ source: src, load: 8 });
        e.bucketGainMultiplier.aiProduct = 0.8;
      }
      if (response === 'contain') e.revenue.consumerPriceChange.push({ source: src, fraction: -0.02 });
      next.commercialShocks.push(cs(`${src}: lingering`, 'consumerRetention', -4 * s * (response === 'absorb' ? 1.5 : response === 'contain' ? 0.8 : 0.4)));
      break;
    }
    case 'enterprise-client': {
      const conc = Math.max(company.contractConcentration, V2_CRISIS_CALIBRATION.baselineTopClientShare);
      const atRisk = company.segmentRevenue.enterprise * conc;
      const lossShare = 0.35 + 0.55 * s;
      const baseLoss = lossShare * atRisk;
      const lossFrac = response === 'remediate' ? 0.3 : response === 'contain' ? 0.5 : 1;
      // The at-risk client's not-yet-live scope is cancelled in the same proportion
      for (const k of company.contractCohorts) {
        if (k.remaining > 0) e.revenue.backlogCancellation.push({ source: `${src}: rollout scope cancelled`, cohortId: k.cohortId, fraction: lossShare * lossFrac });
      }
      const repriced = response === 'contain' ? 0.25 * (atRisk - baseLoss * lossFrac) : 0;
      lost = baseLoss * lossFrac + repriced;
      if (lost > 0) e.revenue.lostRunRate.push({ source: `${src}: ${response === 'contain' ? 'scope lost + repriced' : 'scope lost'}`, segment: 'enterprise', amount: lost });
      contractLoss = company.contractConcentration > 0 ? lost * Math.min(1, company.contractConcentration / conc) : 0;
      const penalty = 0.6 * atRisk * s * (response === 'remediate' ? 0.5 : response === 'contain' ? 0.3 : 1);
      if (penalty > 0) e.eventCosts.push({ id: `crisis-Q${quarter}-sla`, description: `${src}: SLA penalties / credits`, amount: penalty, category: 'crisis' });
      const mt = response === 'remediate' ? 0.4 : response === 'contain' ? 0.7 : 1;
      const mw = response === 'remediate' ? 0.5 : response === 'contain' ? 0.8 : 1;
      e.stateShocks.push(ss(src, 'trust', -(2 + 8 * s) * mt));
      e.commercialShocks.push(cs(src, 'enterpriseWinRate', -(3 + 8 * s) * mw), cs(src, 'enterprisePipeline', -company.enterprisePipeline * 0.25 * s * mw));
      if (response === 'remediate') { e.extraLoad.push({ source: src, load: 8 }); e.stateShocks.push(ss(src, 'customerSuccess', 3)); }
      next.commercialShocks.push(cs(`${src}: lingering`, 'enterpriseWinRate', -3 * s * mw));
      break;
    }
    case 'premium-talent': {
      const m = response === 'remediate' ? 0.3 : response === 'contain' ? 0.6 : 1;
      const mq = response === 'remediate' ? 0.5 : response === 'contain' ? 0.6 : 1;
      e.stateShocks.push(
        ss(src, 'talent', -(5 + 20 * s) * m),
        ss(src, 'organizationalCapacity', -(3 + 12 * s) * m),
        ss(src, 'culture', -(2 + 6 * s) * m),
        ss(src, 'productQuality', -(2 + 8 * s) * mq),
      );
      e.commercialShocks.push(cs(src, 'consumerRetention', -(2 + 8 * s) * mq), cs(src, 'pricingPower', -(2 + 10 * s) * mq));
      const lc = (0.01 + 0.04 * s) * company.segmentRevenue.consumer * mq;
      const le = (0.02 + 0.06 * s) * company.segmentRevenue.enterprise * mq;
      lost = lc + le;
      e.revenue.lostRunRate.push(
        { source: `${src}: clients leave with their experts`, segment: 'consumer', amount: lc },
        { source: `${src}: clients leave with their experts`, segment: 'enterprise', amount: le },
      );
      if (response === 'remediate') {
        e.cost.extraCommitments.push({ source: `${src}: retention packages`, id: `C-crisis-retention-Q${quarter}`, quarterlyCost: 1.5 + 2 * s, lag: 1, duration: 4 });
      }
      if (response === 'contain') {
        e.extraLoad.push({ source: src, load: 6 });
        e.stateShocks.push(ss(`${src}: automation strain`, 'culture', -2));
        if (company.aiCommercialReadiness < 50) e.stateShocks.push(ss(`${src}: AI not ready for the service model`, 'productQuality', -3));
      }
      if (response !== 'remediate') next.stateShocks.push(ss(`${src}: further departures`, 'talent', -4 * s * (response === 'absorb' ? 1 : 0.5)));
      break;
    }
    case 'university-accreditation': {
      const m = response === 'remediate' ? 0.3 : response === 'contain' ? 0.6 : 1;
      const uLoss = (0.08 + 0.2 * s) * company.segmentRevenue.university * m;
      lost = uLoss;
      if (uLoss > 0) e.revenue.lostRunRate.push({ source: `${src}: institutions pause programmes`, segment: 'university', amount: uLoss });
      e.commercialShocks.push(
        cs(src, 'universityRenewalRate', -(4 + 14 * s) * m),
        cs(src, 'universityPipeline', -company.universityPipeline * (0.15 + 0.45 * s) * m),
      );
      e.stateShocks.push(ss(src, 'trust', -(2 + 8 * s) * m - (response === 'absorb' ? 2 : 0)), ss(src, 'credential', -(2 + 6 * s) * m));
      if (response === 'remediate') { e.extraLoad.push({ source: src, load: 6 }); e.stateShocks.push(ss(src, 'credential', 2)); }
      next.commercialShocks.push(cs(`${src}: lingering`, 'universityRenewalRate', -4 * s * m));
      break;
    }
    case 'balanced-complexity': {
      const m = response === 'remediate' ? 0.3 : response === 'contain' ? 0.5 : 1;
      e.stateShocks.push(
        ss(src, 'execution', -(3 + 12 * s) * m),
        ss(src, 'organizationalCapacity', -(2 + 8 * s) * m),
        ss(src, 'productQuality', -(1 + 4 * s) * m),
        ss(src, 'culture', -(1 + 4 * s) * m),
      );
      e.commercialShocks.push(cs(src, 'consumerRetention', -(1 + 4 * s) * m), cs(src, 'enterpriseWinRate', -(1 + 5 * s) * m));
      const missed = (0.005 + 0.02 * s) * company.segmentRevenue.consumer * m;
      lost = missed;
      e.revenue.lostRunRate.push({ source: `${src}: missed launches and service slips`, segment: 'consumer', amount: missed });
      if (response === 'remediate') { e.extraLoad.push({ source: src, load: 5 }); next.stateShocks.push(ss(`${src}: simpler operating model`, 'organizationalCapacity', 3)); }
      if (response === 'contain') {
        const closed = 0.06 * company.segmentRevenue.consumer;
        lost += closed;
        e.revenue.lostRunRate.push({ source: `${src}: closed weakest offerings`, segment: 'consumer', amount: closed });
        e.cost.fixedPoolDelta.push({ source: `${src}: overhead of closed offerings`, amount: -availableCut(company.fixedSemiFixed, 0.055 * company.fixedSemiFixed) });
      }
      if (response === 'absorb') next.stateShocks.push(ss(`${src}: lingering friction`, 'execution', -3 * s));
      break;
    }
  }

  const eventCost = e.eventCosts.reduce((t, x) => t + x.amount, 0);
  return {
    effects: e,
    pending: next.stateShocks.length || next.commercialShocks.length ? [next] : [],
    record: { quarter, assessment: a, response, lostRunRate: lost, eventCost },
    contractLoss,
  };
}

/** Aftershocks due this quarter. */
export function pendingCrisisEffects(state: V2CrisisState, quarter: number): { effects: V2QuarterEffects; remaining: V2CrisisState['pending'] } {
  const e = emptyEffects();
  for (const p of state.pending.filter(x => x.quarter === quarter)) {
    e.stateShocks.push(...p.stateShocks);
    e.commercialShocks.push(...p.commercialShocks);
  }
  return { effects: e, remaining: state.pending.filter(x => x.quarter > quarter) };
}
