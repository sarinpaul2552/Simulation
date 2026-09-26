/**
 * V2 PRODUCTION ADAPTER (Batch 5 · 5A)
 *
 * The single, clean API between the classroom UI / persistence layer and the FROZEN V2 economic engine.
 *
 *   initializeGame → getQuarterBriefing / getRoleBrief / getDecisionSpec → forecastQuarter → validateQuarterInput
 *   → resolveQuarter (pure, deterministic) → resultForQuarter / headlineOf → getFinalOutcome
 *
 * Every economic call goes through the same engine functions and the same quarter-input construction as the Test Lab
 * arc runner (market = scenario truth for the quarter, integrated segment/modelled mode, Q4 destination, Q5–Q8 events),
 * so identical decisions produce identical economics (proven by the parity test). The adapter never modifies the
 * engine; the UI adapts to it. Deliberation (belief, risks, votes, reflection) never reaches this module's resolver.
 */
import {
  V2TeamState, V2QuarterInput, V2Consequence, V2Allocation, V2_INTEGRATED_MODE, V2_INVESTMENT_BUCKETS,
  getV2Baseline, calculateV2QuarterConsequence, applyV2Consequence, assessLiquidity, crisisView, finalView,
  validateV2Allocation, summarizeV2Financials,
} from '../../simulation/engineV2';
import { getScenarioMarket, getScenarioQuarter, lastAuthoredQuarter, V2Role, V2_ROLES } from '../../simulation/engineV2Scenario';
import { V2_DESTINATIONS, V2_DESTINATION_IDS, V2DestinationId, destinationReadiness } from '../../simulation/engineV2Destination';
import { opportunityTerms, V2_OPPORTUNITIES, V2OpportunityTerms } from '../../simulation/engineV2Opportunity';
import { assessCrisis, V2CrisisAssessment, V2CrisisResponseId } from '../../simulation/engineV2Crisis';
import { finalOptions, maxEnvelope, V2FinalOptionAvailability, V2FinalOptionId, V2_FINAL_CALIBRATION, V2_FINAL_OPTION_IDS } from '../../simulation/engineV2Final';
import { V2_MANAGEMENT_CALIBRATION } from '../../simulation/engineV2Management';
import type { V2FinancingAction, V2FinancingOptions } from '../../simulation/engineV2Financing';
import { scoreV2Company, V2TerminalScore } from '../../simulation/engineV2Scoring';
import {
  V2GameSnapshot, V2_SNAPSHOT_SCHEMA, V2_SNAPSHOT_SCHEMA_VERSION, V2_ENGINE_VERSION, firstDifference, assertSnapshotContract,
} from './snapshot';
import type {
  V2PlayerQuarterInput, V2RoleBrief, V2Signal, V2QuarterResult, V2ExplanationLine, V2Headline, V2SeverityBand,
} from './types';

export const V2_TOTAL_QUARTERS = lastAuthoredQuarter();
export const V2_BASE_ENVELOPE = V2_FINAL_CALIBRATION.defaultEnvelope;
export { V2_ROLES };

// ============ LIFECYCLE ============

export function initializeGame(): V2GameSnapshot {
  return {
    schema: V2_SNAPSHOT_SCHEMA,
    schemaVersion: V2_SNAPSHOT_SCHEMA_VERSION,
    engineVersion: V2_ENGINE_VERSION,
    completedQuarter: 0,
    state: getV2Baseline(),
    inputs: [],
  };
}

/** The quarter the team is working on, or null when Q8 has been resolved. */
export function workingQuarter(snap: V2GameSnapshot): number | null {
  return snap.completedQuarter < V2_TOTAL_QUARTERS ? snap.completedQuarter + 1 : null;
}

export function isComplete(snap: V2GameSnapshot): boolean {
  return snap.completedQuarter >= V2_TOTAL_QUARTERS;
}

// ============ SCENARIO (public) ============

export interface V2QuarterBriefing {
  quarter: number;
  title: string;
  briefing: string;
  /** Shared signals (audience 'all'); truth references are never included. */
  signals: V2Signal[];
  events: { opportunity: boolean; recession: boolean; crisis: boolean; finalDecision: boolean; destination: boolean };
}

export function getQuarterBriefing(quarter: number): V2QuarterBriefing {
  const sq = getScenarioQuarter(quarter);
  if (!sq) throw new Error(`No scenario authored for Q${quarter}`);
  return {
    quarter,
    title: sq.title,
    briefing: sq.briefing,
    signals: sq.signals.filter(s => s.audience === 'all').map(s => ({
      id: s.id, kind: s.reliability === 'measured' ? 'measured' : s.reliability, label: s.headline, value: s.shownValue, range: s.shownRange, unit: s.unit,
    })),
    events: {
      opportunity: (sq.events?.opportunities?.length ?? 0) > 0,
      recession: sq.events?.recessionResponse === true,
      crisis: sq.events?.crisis === true,
      finalDecision: sq.events?.finalDecision === true,
      destination: quarter === 4,
    },
  };
}

// ============ ROLE-PRIVATE BRIEFS ============

const ROLE_FOCUS: Record<V2Role, string> = {
  CEO: 'Board and strategic context: where the company is heading and what the board expects.',
  CFO: 'Runway, margin, financing and financial risk.',
  Product: 'Product Quality, technical constraints and AI readiness.',
  People: 'Talent, Culture, organizational load and capacity.',
  Growth: 'Customer acquisition cost, retention, pipeline and demand.',
};

const m = (id: string, label: string, value: number, unit: string): V2Signal => ({ id, kind: 'measured', label, value, unit });

/**
 * Role-private brief for the working quarter: the scenario's signals addressed to this role (headline / estimate /
 * lagging — possibly noisy) plus measured KPIs the role owns, taken from the company's own last-quarter state.
 * Hidden market truth (demand indices, competitor pace, crisis drivers) is never included.
 */
export function getRoleBrief(snap: V2GameSnapshot, role: V2Role): V2RoleBrief {
  const q = workingQuarter(snap) ?? snap.completedQuarter;
  const s = snap.state;
  const sq = getScenarioQuarter(q);
  const scenario: V2Signal[] = (sq?.signals ?? []).filter(x => x.audience === role).map(x => ({
    id: x.id, kind: x.reliability === 'measured' ? 'measured' : x.reliability, label: x.headline, value: x.shownValue, range: x.shownRange, unit: x.unit,
  }));
  const c = s.commercial;
  const last = s.ledgerHistory[s.ledgerHistory.length - 1];
  const measured: V2Signal[] = [];
  switch (role) {
    case 'CEO': {
      measured.push(m('ceo-revenue', 'Quarterly revenue (last quarter)', s.revenue, '$M'));
      measured.push(m('ceo-pricing', 'Pricing power', c.pricingPower, 'index'));
      measured.push(m('ceo-university-renewal', 'University renewal rate', c.universityRenewalRate, '%'));
      measured.push(m('ceo-credential-network', 'Credential network value', c.credentialNetwork, 'index'));
      measured.push(m('ceo-trust', 'Trust', s.trust, 'index'));
      if (s.destination) measured.push(m('ceo-destination-readiness', `Readiness when we committed to ${V2_DESTINATIONS[s.destination.id].name}`, s.destination.readinessAtCommit * 100, '%'));
      if (q === 4 && !s.destination) {
        for (const id of V2_DESTINATION_IDS) {
          const r = destinationReadiness(id, s);
          measured.push(m(`ceo-readiness-${id}`, `Board readiness assessment: ${V2_DESTINATIONS[id].name}`, r.readiness * 100, '%'));
        }
      }
      break;
    }
    case 'CFO': {
      measured.push(m('cfo-cash', 'Cash balance', s.cash, '$M'));
      measured.push(m('cfo-op', 'Operating profit (last quarter)', s.operatingProfit, '$M'));
      measured.push(m('cfo-margin', 'Operating margin (last quarter)', s.revenue > 0 ? (s.operatingProfit / s.revenue) * 100 : 0, '%'));
      if (last) {
        const f = summarizeV2Financials(last);
        const runway = f.runway.quarters;
        measured.push({ id: 'cfo-runway', kind: 'measured', label: runway === null ? 'Runway: self-funding at last quarter\'s burn' : 'Runway at last quarter\'s burn', value: runway ?? undefined, unit: runway === null ? undefined : 'quarters' });
      }
      measured.push(m('cfo-debt', 'Debt outstanding', s.financing.debt, '$M'));
      measured.push(m('cfo-ownership', 'Original shareholders\' ownership', s.financing.ownership * 100, '%'));
      measured.push({ id: 'cfo-solvency', kind: 'measured', label: `Liquidity status: ${s.solvency.status}${s.solvency.distressed ? ' (distressed)' : ''}` });
      break;
    }
    case 'Product': {
      measured.push(m('product-pq', 'Product Quality', s.productQuality, 'index'));
      measured.push(m('product-ai', 'AI capability', s.capabilities.ai, 'index'));
      measured.push(m('product-ai-readiness', 'AI commercial readiness', c.aiCommercialReadiness, 'index'));
      measured.push(m('product-ai-adoption', 'AI product adoption index', c.aiAdoptionIndex, 'index'));
      measured.push(m('product-ai-revenue', 'AI-native revenue', s.segmentRevenue.aiNative, '$M'));
      measured.push(m('product-tech-debt', 'Technical debt', s.technicalDebt, 'index'));
      measured.push(m('product-execution', 'Execution', s.capabilities.execution, 'index'));
      break;
    }
    case 'People': {
      measured.push(m('people-talent', 'Talent', s.capabilities.talent, 'index'));
      measured.push(m('people-culture', 'Culture', s.culture, 'index'));
      measured.push(m('people-capacity', 'Organizational capacity', s.organizationalCapacity, 'index'));
      measured.push(m('people-load', 'Transformation load (last quarter)', s.transformationLoad, 'index'));
      measured.push(m('people-execution', 'Execution', s.capabilities.execution, 'index'));
      measured.push(m('people-premium', 'Premium value proposition', c.premiumValue, 'index'));
      break;
    }
    case 'Growth': {
      measured.push(m('growth-consumer-revenue', 'Consumer revenue', s.segmentRevenue.consumer, '$M'));
      measured.push(m('growth-retention', 'Consumer paid retention', c.consumerRetention, '%'));
      measured.push(m('growth-cac', 'Consumer CAC index (100 = start)', c.consumerCacIndex, 'index'));
      measured.push(m('growth-pipeline', 'Enterprise qualified pipeline', c.enterprisePipeline, '$M'));
      measured.push(m('growth-win-rate', 'Enterprise win rate', c.enterpriseWinRate, '%'));
      measured.push(m('growth-cs', 'Customer Success capability', s.capabilities.customerSuccess, 'index'));
      measured.push(m('growth-enterprise-revenue', 'Enterprise revenue', s.segmentRevenue.enterprise, '$M'));
      break;
    }
  }
  return { role, focus: ROLE_FOCUS[role], signals: [...scenario, ...measured] };
}

// ============ DECISION SPEC ============

export interface V2DecisionSpec {
  quarter: number;
  baseEnvelope: number;
  destination?: { options: { id: V2DestinationId; name: string; personality: string; exposures: string[]; alignedBuckets: string[] }[] };
  opportunity?: {
    offerId: string; name: string; description: string; acv: number; upfrontCash: number; deliveryCostPerQuarter: number;
    orgLoadPerQuarter: number; loadQuarters: number; roadmapDiversion: number; aligned: boolean; focusDilution: number; deliveryFit: number;
  };
  management?: { marketingLevelRange: [number, number]; options: { id: string; label: string; description: string }[] };
  crisis?: { title: string; description: string; severity: number; band: V2SeverityBand; responses: { id: V2CrisisResponseId; label: string; description: string; cash: number }[] };
  final?: { options: V2FinalOptionAvailability[] };
}

export function severityBand(severity: number): V2SeverityBand {
  return severity >= 0.45 ? 'serious' : severity >= 0.3 ? 'moderate' : 'minor';
}

export function getDecisionSpec(snap: V2GameSnapshot): V2DecisionSpec | null {
  const q = workingQuarter(snap);
  if (q === null) return null;
  const s = snap.state;
  const sq = getScenarioQuarter(q);
  const spec: V2DecisionSpec = { quarter: q, baseEnvelope: V2_BASE_ENVELOPE };
  if (q === 4 && !s.destination) {
    spec.destination = {
      options: V2_DESTINATION_IDS.map(id => ({
        id, name: V2_DESTINATIONS[id].name, personality: V2_DESTINATIONS[id].personality,
        exposures: [...V2_DESTINATIONS[id].exposures], alignedBuckets: [...V2_DESTINATIONS[id].alignedBuckets],
      })),
    };
  }
  const offerId = sq?.events?.opportunities?.[0];
  if (offerId) {
    const t = currentTerms(s, offerId);
    const def = V2_OPPORTUNITIES[offerId];
    spec.opportunity = {
      offerId, name: t.name, description: def.description, acv: t.acv, upfrontCash: t.upfrontCash, deliveryCostPerQuarter: t.deliveryTeam.quarterlyCost,
      orgLoadPerQuarter: t.orgLoadPerQuarter, loadQuarters: t.loadQuarters, roadmapDiversion: t.roadmapDiversion, aligned: t.aligned,
      focusDilution: t.focusDilution, deliveryFit: t.fit.fit,
    };
  }
  if (sq?.events?.recessionResponse) {
    const K = V2_MANAGEMENT_CALIBRATION;
    spec.management = {
      marketingLevelRange: [K.marketing.minLevel, K.marketing.maxLevel],
      options: [
        { id: 'workforce-targeted', label: 'Targeted workforce reduction', description: `Cuts ~${K.workforce.targeted.poolCut * 100}% of fixed costs; severance now; hurts Talent, Culture and capacity, with aftershocks for two quarters.` },
        { id: 'workforce-deep', label: 'Deep workforce reduction', description: `Cuts ~${K.workforce.deep.poolCut * 100}% of fixed costs; larger severance and much larger damage to Talent, Culture and capacity.` },
        { id: 'protect-rnd', label: 'Protect R&D in any reduction', description: 'Spares AI/Product and Product Quality; savings are smaller and commercial teams take more of the cut.' },
        { id: 'hiring-freeze', label: 'Hiring freeze', description: 'Small cost saving; mild Talent/Culture/capacity cost. Cannot be combined with People investment.' },
        { id: 'pricing-raise', label: 'Raise consumer prices', description: 'Works only with strong pricing power; otherwise retention falls and acquisition gets harder.' },
        { id: 'pricing-discount', label: 'Discount consumer prices', description: 'Protects volume for weak-pricing-power companies at the cost of price.' },
        { id: 'close-weak', label: 'Close weak offerings', description: `Removes ~${K.closeWeakOfferings.consumerRevenueShare * 100}% of consumer revenue and some fixed cost; one-off wind-down cost; frees capacity.` },
        { id: 'marketing', label: 'Consumer marketing level', description: 'Scale consumer acquisition spend (1 = normal). Persists until changed.' },
      ],
    };
  }
  if (sq?.events?.crisis && !s.crisis.record) {
    const a = currentCrisis(s);
    spec.crisis = {
      title: a.title, description: a.description, severity: a.severity, band: severityBand(a.severity),
      responses: a.responses.map(r => ({ id: r.id, label: r.label, description: r.description, cash: r.cash })),
    };
  }
  if (sq?.events?.finalDecision && !s.final.record) spec.final = { options: finalOptions(finalView(s, q)) };
  return spec;
}

function currentTerms(s: V2TeamState, offerId: string): V2OpportunityTerms {
  return opportunityTerms(offerId, { capabilities: s.capabilities, productQuality: s.productQuality, trust: s.trust, aiCommercialReadiness: s.commercial.aiCommercialReadiness }, s.destination?.id ?? null);
}

function currentCrisis(s: V2TeamState): V2CrisisAssessment {
  return assessCrisis(s.destination?.id ?? 'balanced-marketplace', crisisView(s));
}

/** Strategic envelope for a quarter: $30M, or the Q8 option's envelope. */
export function envelopeFor(quarter: number, finalOption?: V2FinalOptionId): number {
  const sq = getScenarioQuarter(quarter);
  if (sq?.events?.finalDecision) return maxEnvelope(finalOption ?? 'continue');
  return V2_BASE_ENVELOPE;
}

// ============ ENGINE INPUT (identical construction to the Test Lab arc runner) ============

/**
 * Canonical key order (by key length, then code point) — the order Postgres jsonb stores keys in. Decision objects
 * therefore stringify identically before and after a database round trip (the engine logs JSON.stringify(decision)).
 */
export function canonical<T>(v: T): T {
  if (Array.isArray(v)) return v.map(x => canonical(x)) as unknown as T;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).filter(k => o[k] !== undefined).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = canonical(o[k]);
    return out as T;
  }
  return v;
}

export function toEngineInput(_snap: V2GameSnapshot, input: V2PlayerQuarterInput): V2QuarterInput {
  const q = input.quarter;
  const sq = getScenarioQuarter(q);
  const decisions: V2QuarterInput['decisions'] = {};
  const offerId = sq?.events?.opportunities?.[0];
  if (offerId && input.opportunity) decisions.opportunity = { offerId: input.opportunity.offerId, accept: input.opportunity.accept };
  if (sq?.events?.recessionResponse && input.management) decisions.management = canonical(input.management);
  if (sq?.events?.crisis && input.crisisResponse) decisions.crisisResponse = input.crisisResponse;
  if (sq?.events?.finalDecision && input.finalOption) decisions.finalOption = input.finalOption;
  if (input.financing && input.financing.length > 0) decisions.financing = canonical(input.financing);
  const allocation: V2Allocation = {
    consumer: input.allocation.consumer, enterprise: input.allocation.enterprise, aiProduct: input.allocation.aiProduct,
    people: input.allocation.people, universityCredentials: input.allocation.universityCredentials, cashReserve: input.allocation.cashReserve,
  };
  return {
    quarter: q,
    allocation,
    strategicEnvelope: envelopeFor(q, input.finalOption),
    market: getScenarioMarket(q),
    revenueSource: V2_INTEGRATED_MODE.revenueSource,
    costSource: V2_INTEGRATED_MODE.costSource,
    destination: q === 4 ? input.destination : undefined,
    decisions,
    crisis: sq?.events?.crisis === true,
    finalDecision: sq?.events?.finalDecision === true,
  };
}

// ============ VALIDATION / FORECAST ============

const FIN_KINDS = ['equity', 'debt', 'repay', 'partner', 'restructure'];

/** Structural checks, then a dry run of the frozen engine (which enforces availability rules). [] = valid. */
export function validateQuarterInput(snap: V2GameSnapshot, input: V2PlayerQuarterInput): string[] {
  const errors: string[] = [];
  const q = workingQuarter(snap);
  if (q === null) return ['The game is complete'];
  if (input.quarter !== q) return [`Expected a decision for Q${q}, got Q${input.quarter}`];
  const sq = getScenarioQuarter(q)!;
  const al = input.allocation as unknown as Record<string, unknown>;
  for (const b of [...V2_INVESTMENT_BUCKETS, 'cashReserve']) {
    if (typeof al?.[b] !== 'number' || !Number.isFinite(al[b] as number) || (al[b] as number) < 0) errors.push(`Allocation ${b} must be a non-negative number`);
  }
  if (q === 4) {
    if (!input.destination || !V2_DESTINATION_IDS.includes(input.destination)) errors.push('Choose a strategic destination');
  } else if (input.destination) errors.push('A destination can only be chosen in Q4');
  const offerId = sq.events?.opportunities?.[0];
  if (offerId) {
    if (!input.opportunity || input.opportunity.offerId !== offerId || typeof input.opportunity.accept !== 'boolean') errors.push('Accept or decline the opportunity');
  } else if (input.opportunity) errors.push('No opportunity is offered this quarter');
  if (!sq.events?.recessionResponse && input.management && Object.keys(input.management).length > 0) errors.push('Recession responses are only available in Q6');
  if (sq.events?.crisis) {
    if (!input.crisisResponse || !['remediate', 'contain', 'absorb'].includes(input.crisisResponse)) errors.push('Choose a crisis response');
  } else if (input.crisisResponse) errors.push('No crisis this quarter');
  if (sq.events?.finalDecision) {
    if (!input.finalOption || !V2_FINAL_OPTION_IDS.includes(input.finalOption)) errors.push('Choose a final strategic option');
  } else if (input.finalOption) errors.push('The final decision is only taken in Q8');
  for (const f of input.financing ?? []) if (!f || !FIN_KINDS.includes(f.kind)) errors.push('Unknown financing action');
  if (errors.length) return errors;
  const engineInput = toEngineInput(snap, input);
  try {
    validateV2Allocation(engineInput.allocation, engineInput.strategicEnvelope);
    calculateV2QuarterConsequence(snap.state, engineInput);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  return errors;
}

export interface V2Forecast {
  projectedClosingCash: number;
  minimumOperatingCash: number;
  gap: number;
  options: V2FinancingOptions;
}

/** CFO forecast: the quarter as planned WITHOUT financing actions, plus the financing terms on offer (same as the Test Lab). */
export function forecastQuarter(snap: V2GameSnapshot, input: V2PlayerQuarterInput): V2Forecast {
  const f = assessLiquidity(snap.state, toEngineInput(snap, input));
  return { projectedClosingCash: f.projectedClosingCash, minimumOperatingCash: f.minimumOperatingCash, gap: f.gap, options: f.options };
}

// ============ RESOLUTION ============

export interface V2Resolution {
  snapshot: V2GameSnapshot;
  result: V2QuarterResult;
  consequence: V2Consequence;
}

/** Resolve the working quarter. Pure and deterministic: same snapshot + same input → same next snapshot. */
export function resolveQuarter(snap: V2GameSnapshot, input: V2PlayerQuarterInput): V2Resolution {
  assertSnapshotContract(snap);
  const errors = validateQuarterInput(snap, input);
  if (errors.length) throw new Error(`Invalid Q${input.quarter} decision: ${errors.join('; ')}`);
  const stored = storedInput(input);
  const consequence = calculateV2QuarterConsequence(snap.state, toEngineInput(snap, stored));
  const next = applyV2Consequence(snap.state, consequence);
  const snapshot: V2GameSnapshot = { ...snap, completedQuarter: next.quarter, state: next, inputs: [...snap.inputs, stored] };
  return { snapshot, consequence, result: buildResult(snap.state, next, consequence, stored) };
}

/** Normalized form of an input as it is logged (only the fields relevant to its quarter, canonical key order). */
export function storedInput(input: V2PlayerQuarterInput): V2PlayerQuarterInput {
  const sq = getScenarioQuarter(input.quarter);
  const z = (x: number) => x + 0; // −0 → 0 so the logged input is identical in JSON and jsonb
  const al = input.allocation;
  const out: V2PlayerQuarterInput = {
    quarter: input.quarter,
    allocation: {
      consumer: z(al.consumer), enterprise: z(al.enterprise), aiProduct: z(al.aiProduct),
      people: z(al.people), universityCredentials: z(al.universityCredentials), cashReserve: z(al.cashReserve),
    },
  };
  if (input.quarter === 4 && input.destination) out.destination = input.destination;
  if (sq?.events?.opportunities?.length && input.opportunity) out.opportunity = { offerId: input.opportunity.offerId, accept: input.opportunity.accept };
  if (sq?.events?.recessionResponse && input.management && Object.keys(input.management).length > 0) out.management = input.management;
  if (sq?.events?.crisis && input.crisisResponse) out.crisisResponse = input.crisisResponse;
  if (sq?.events?.finalDecision && input.finalOption) out.finalOption = input.finalOption;
  if (input.financing && input.financing.length > 0) out.financing = input.financing.map(f => ('amount' in f ? { ...f, amount: z(f.amount) } : { ...f }));
  return canonical(out);
}

/** Rebuild a game from its input log (the replayable source of truth). */
export function replayInputs(inputs: V2PlayerQuarterInput[]): V2GameSnapshot {
  let snap = initializeGame();
  for (const inp of inputs) snap = resolveQuarter(snap, inp).snapshot;
  return snap;
}

/** A snapshot is trustworthy only if replaying its input log reproduces it exactly. */
export function verifySnapshot(snap: V2GameSnapshot): { ok: boolean; difference: string | null } {
  try {
    assertSnapshotContract(snap);
    const replayed = replayInputs(snap.inputs);
    const difference = firstDifference(replayed.state, snap.state);
    return { ok: difference === null, difference };
  } catch (e) {
    return { ok: false, difference: e instanceof Error ? e.message : String(e) };
  }
}

/** The result screen for any resolved quarter, recomputed from the input log (never trusted from storage). */
export function resultForQuarter(snap: V2GameSnapshot, quarter: number): V2QuarterResult {
  if (quarter < 1 || quarter > snap.completedQuarter) throw new Error(`Q${quarter} has not been resolved`);
  const before = replayInputs(snap.inputs.slice(0, quarter - 1));
  return resolveQuarter(before, snap.inputs[quarter - 1]).result;
}

// ============ RESULTS / EXPLANATION ============

function buildResult(before: V2TeamState, after: V2TeamState, c: V2Consequence, input: V2PlayerQuarterInput): V2QuarterResult {
  const L = c.ledger;
  return {
    quarter: L.quarter,
    revenue: L.revenue,
    revenueChange: L.revenue - before.revenue,
    operatingProfit: L.operatingProfit,
    operatingMargin: L.revenue > 0 ? L.operatingProfit / L.revenue : 0,
    closingCash: L.closingCash,
    cashChange: L.closingCash - L.openingCash,
    debt: after.financing.debt,
    ownership: after.financing.ownership,
    solvency: after.solvency.status,
    distressed: after.solvency.distressed,
    destination: after.destination?.id ?? null,
    segments: { ...after.segmentRevenue },
    explanation: explainQuarter(before, after, c, input),
  };
}

const fmt = (x: number, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d);
const money = (x: number) => `$${fmt(Math.abs(x))}M`;
const SEGMENT_LABEL = { consumer: 'Consumer', enterprise: 'Enterprise', university: 'University', aiNative: 'AI-native' } as const;
const CAP_LABEL: Record<string, string> = {
  consumer: 'Consumer', enterprise: 'Enterprise', customerSuccess: 'Customer Success', ai: 'AI/Product', talent: 'Talent',
  credential: 'Credential', execution: 'Execution', growth: 'Growth',
};

/**
 * Plain-language causal explanation of a resolved quarter, derived only from the engine's own consequence
 * (no new economics). Players see causes, not diagnostics dumps.
 */
export function explainQuarter(before: V2TeamState, after: V2TeamState, c: V2Consequence, input: V2PlayerQuarterInput): V2ExplanationLine[] {
  const out: V2ExplanationLine[] = [];
  const push = (area: V2ExplanationLine['area'], tone: V2ExplanationLine['tone'], text: string) => out.push({ area, tone, text });
  const L = c.ledger;

  // Decisions taken
  if (input.destination) {
    const d = after.destination!;
    const r = d.readinessAtCommit;
    push('decision', r >= 0.6 ? 'positive' : r >= 0.35 ? 'neutral' : 'negative',
      `You committed to ${V2_DESTINATIONS[d.id].name}. Your Q1–Q3 capabilities made you ${r >= 0.6 ? 'well prepared' : r >= 0.35 ? 'partly prepared' : 'poorly prepared'} for it, so the transition adds ${r >= 0.6 ? 'little' : 'significant'} organizational load for the next quarters.`);
  }
  if (input.opportunity) {
    const t = c.opportunityTerms;
    if (input.opportunity.accept) push('decision', 'neutral', `You accepted the ${t?.name ?? 'contract'}: ${money(t?.upfrontCash ?? 0)} upfront now, a dedicated delivery team, and heavy change load for about ${t?.loadQuarters ?? 3} quarters, in exchange for contracted Enterprise revenue that goes live over time.`);
    else push('decision', 'neutral', 'You declined the contract, keeping cash, people and roadmap focused on your own strategy.');
  }
  if (input.management && Object.keys(input.management).length > 0) {
    const s = c.managementSummary;
    push('decision', 'neutral',
      `Your recession response saves ${money(s.savingsPerQuarter)} per quarter${s.oneOffCost > 0 ? ` after a one-off cost of ${money(s.oneOffCost)}` : ''}.`);
    if (input.management.workforceReduction) push('organization', 'negative', 'The workforce reduction hurt Talent, Culture and capacity, and survivors will keep leaving for the next two quarters.');
  }
  if (c.crisisAssessment) {
    const a = c.crisisAssessment;
    const band = severityBand(a.severity);
    push('risk', band === 'minor' ? 'neutral' : 'negative', `${a.title}: the crisis hit ${band === 'serious' ? 'hard' : band === 'moderate' ? 'moderately' : 'lightly'} because of the company you built. You chose to ${input.crisisResponse ?? 'absorb'} it.`);
  }
  if (input.finalOption && after.final.record) {
    const label: Record<V2FinalOptionId, string> = {
      'continue': 'continue on your current course', 'scale-independently': 'scale independently', 'raise-growth-capital': 'raise growth capital',
      'acquire-consolidate': 'acquire a weakened competitor', 'strategic-sale': 'sell the company to a strategic buyer', 'stabilize-restructure': 'stabilize and restructure',
    };
    push('decision', 'neutral', `Final decision: you chose to ${label[input.finalOption]}.`);
  }

  // Revenue and its drivers
  const dRev = L.revenue - before.revenue;
  const segs = (Object.keys(SEGMENT_LABEL) as (keyof typeof SEGMENT_LABEL)[])
    .map(k => ({ k, d: after.segmentRevenue[k] - before.segmentRevenue[k] }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const moved = segs.filter(x => Math.abs(x.d) >= 0.5).slice(0, 2).map(x => `${SEGMENT_LABEL[x.k]} ${x.d >= 0 ? 'up' : 'down'} ${money(x.d)}`);
  push('revenue', dRev >= 0.5 ? 'positive' : dRev <= -0.5 ? 'negative' : 'neutral',
    `Revenue ${dRev >= 0.5 ? 'grew to' : dRev <= -0.5 ? 'fell to' : 'held roughly flat at'} ${money(L.revenue)} this quarter${moved.length ? ` (${moved.join('; ')})` : ''}.`);

  // Customer indicators with their main cause
  const ind = (id: string) => c.commercial.indicators.find(i => i.indicator === id);
  const pipe = ind('enterprisePipeline');
  const win = ind('enterpriseWinRate');
  if (pipe && win) {
    const dp = pipe.closing - pipe.opening;
    const csLimited = after.capabilities.customerSuccess < 55 && after.capabilities.enterprise > after.capabilities.customerSuccess + 15;
    if (dp > 2 && csLimited) push('customers', 'negative', 'Your Enterprise pipeline increased, but weak Customer Success limited how much of it you could convert and keep.');
    else if (dp > 2) push('customers', 'positive', `Your Enterprise pipeline grew by ${money(dp)} as your Enterprise capability improved relative to competitors.`);
    else if (dp < -2) push('customers', 'negative', `Your Enterprise pipeline shrank by ${money(dp)}: more deals closed or expired than new qualified demand came in.`);
  }
  const ret = ind('consumerRetention');
  if (ret) {
    const dr = ret.closing - ret.opening;
    if (dr <= -1) push('customers', 'negative', `Consumer retention fell to ${fmt(ret.closing)}%${before.capabilities.consumer < c.commercial.competitorBenchmarks.consumer ? ' as competitors moved ahead of your Consumer product' : ''}.`);
    else if (dr >= 1) push('customers', 'positive', `Consumer retention improved to ${fmt(ret.closing)}%.`);
  }
  const adopt = ind('aiAdoptionIndex');
  if (adopt && adopt.closing - adopt.opening >= 3) push('customers', 'positive', `AI product adoption rose to ${fmt(adopt.closing, 0)} as AI readiness reached ${fmt(after.commercial.aiCommercialReadiness, 0)}.`);
  const pp = after.commercial.pricingPower - before.commercial.pricingPower;
  if (Math.abs(pp) >= 1.5) push('customers', pp > 0 ? 'positive' : 'negative', `Pricing power ${pp > 0 ? 'strengthened' : 'weakened'} to ${fmt(after.commercial.pricingPower, 0)}.`);

  // Organization: load vs capacity
  const cap = c.capability;
  if (cap.loadToCapacityRatio > 1) push('organization', 'negative', `Your organization was overloaded: change load ${fmt(cap.transformationLoad, 0)} against capacity ${fmt(cap.effectiveCapacity, 0)}. Investments matured more slowly and Culture paid for it.`);
  else if (cap.loadToCapacityRatio < 0.6 && cap.transformationLoad > 0) push('organization', 'positive', 'The organization absorbed this quarter\'s change comfortably, so investments matured at full effect.');
  const dCulture = after.culture - before.culture;
  if (Math.abs(dCulture) >= 2) push('organization', dCulture > 0 ? 'positive' : 'negative', `Culture ${dCulture > 0 ? 'rose' : 'fell'} to ${fmt(after.culture, 0)}.`);
  const dTrust = after.trust - before.trust;
  if (Math.abs(dTrust) >= 2) push('organization', dTrust > 0 ? 'positive' : 'negative', `Trust ${dTrust > 0 ? 'rose' : 'fell'} to ${fmt(after.trust, 0)}.`);

  // Capabilities that moved most
  const capMoves = Object.keys(CAP_LABEL)
    .map(k => ({ k, d: (after.capabilities as unknown as Record<string, number>)[k] - (before.capabilities as unknown as Record<string, number>)[k] }))
    .filter(x => Math.abs(x.d) >= 2).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3);
  if (capMoves.length) push('capabilities', capMoves[0].d > 0 ? 'positive' : 'negative', `Capabilities moved: ${capMoves.map(x => `${CAP_LABEL[x.k]} ${x.d > 0 ? '+' : '−'}${fmt(Math.abs(x.d), 0)}`).join(', ')}. Investment keeps maturing over the next quarters.`);
  const dPq = after.productQuality - before.productQuality;
  if (Math.abs(dPq) >= 1.5) push('capabilities', dPq > 0 ? 'positive' : 'negative', `Product Quality ${dPq > 0 ? 'improved' : 'slipped'} to ${fmt(after.productQuality, 0)}.`);

  // Cash
  const fin = L.financing;
  push('cash', L.closingCash >= L.openingCash ? 'positive' : L.closingCash < 15 ? 'negative' : 'neutral',
    `Cash ${L.closingCash >= L.openingCash ? 'rose' : 'fell'} to ${money(L.closingCash)}: operating profit ${L.operatingProfit >= 0 ? '' : '−'}${money(L.operatingProfit)}, strategic investment ${money(L.strategicInvestment)}${L.eventCosts > 0 ? `, one-off costs ${money(L.eventCosts)}` : ''}${Math.abs(fin) >= 0.05 ? `, financing ${fin >= 0 ? '+' : '−'}${money(fin)}` : ''}.`);
  if (after.solvency.status === 'insolvent') push('risk', 'negative', 'The company ended the quarter below minimum operating cash: it is insolvent and distress costs, lost trust and talent attrition follow until liquidity is restored.');
  else if (after.solvency.distressed) push('risk', 'negative', 'Lenders now consider the company distressed: financing is more expensive and some strategic options are closed.');
  else if (after.solvency.status === 'warning') push('risk', 'negative', 'Liquidity is thin: the CFO should plan financing or slower investment next quarter.');
  return out;
}

// ============ FACILITATOR HEADLINE / FINAL OUTCOME ============

export function headlineOf(snap: V2GameSnapshot): V2Headline {
  const s = snap.state;
  const score = isComplete(snap) ? scoreV2Company(s) : null;
  return {
    completedQuarter: snap.completedQuarter,
    revenue: s.revenue,
    operatingProfit: s.operatingProfit,
    cash: s.cash,
    debt: s.financing.debt,
    culture: s.culture,
    trust: s.trust,
    destination: s.destination?.id ?? null,
    solvency: s.solvency.status,
    distressed: s.solvency.distressed,
    everInsolvent: s.solvency.everInsolvent,
    financingRounds: s.financing.rounds.length,
    finalOption: s.final.record?.option ?? null,
    final: score ? { overall: score.overall, financial: score.financial, strategic: score.strategic, organizational: score.organizational } : null,
  };
}

export interface V2FinalOutcome {
  score: V2TerminalScore;
  option: V2FinalOptionId | null;
  earnedOptions: V2FinalOptionId[];
  destination: V2DestinationId | null;
  headline: V2Headline;
}

/** Terminal outcome after Q8: the frozen V2 terminal score plus the Q8 option the company earned and chose. */
export function getFinalOutcome(snap: V2GameSnapshot): V2FinalOutcome {
  if (!isComplete(snap)) throw new Error('The final outcome is available after Q8 is resolved');
  const s = snap.state;
  return {
    score: scoreV2Company(s),
    option: s.final.record?.option ?? null,
    earnedOptions: (s.final.record?.availability ?? []).filter(o => o.available).map(o => o.id),
    destination: s.destination?.id ?? null,
    headline: headlineOf(snap),
  };
}

export type { V2FinancingAction };
