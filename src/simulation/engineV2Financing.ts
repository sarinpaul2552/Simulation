/**
 * V2 Simulation Engine — Batch 3: Financing & Solvency
 *
 * No cash floor. No hidden rescue cash. Every inflow is an explicit management choice with a consequence:
 *
 *   Equity             → cash in (financing line); no interest; dilution stored (ownership retained by original
 *                        shareholders) for terminal economics. Priced from the company's own valuation; distress
 *                        and insolvency force down-rounds.
 *   Debt               → cash in (financing line); debt balance; interest = opening debt × rate charged as the
 *                        cost architecture's financing cost (inside operating cost — the ONLY place interest enters);
 *                        capacity limited by operating profit and revenue; leverage raises the rate; repayment is a
 *                        negative financing line.
 *   Strategic partner  → cash in (financing line); partner stake (dilution) + ongoing revenue share on the partner's
 *                        segments (variable cost) + right of first refusal on a sale (limits Q8 options).
 *   Cost restructuring → fixed/semi-fixed pool AND floor fall; restructuring event cost; Culture/Execution/Capacity
 *                        (and Talent when deep) damaged by magnitude.
 *   Defer investment   → expressed through the allocation (Cash Reserve), sacrificing capability building.
 *
 * Liquidity triggers (explicit): minimum operating cash $15M; comfortable ≥ $40M with ≥ 4 quarters of runway.
 * A quarter whose pre-resolution projection falls below the minimum is a liquidity event; if management takes no
 * resolving action, or its actions do not keep cash ≥ 0, the company is INSOLVENT (stored explicitly). While insolvent,
 * distress damages Trust, Talent, Culture and commercial indicators, and only down-round equity or a partner remain.
 *
 * Imports only V2 modules; never the frozen V1 engine.
 */

import { V2QuarterEffects, emptyEffects, V2SegmentKey, V2StateShock, availableCut } from './engineV2Effects';

// ============ CALIBRATION ============

export const V2_FINANCING_CALIBRATION = {
  liquidity: {
    /** Below this closing cash the company cannot operate normally (payroll/supplier buffer). */
    minimumOperatingCash: 15,
    comfortableCash: 40,
    comfortableRunwayQuarters: 4,
  },
  debt: {
    baseRatePerQuarter: 0.02,
    /** Added per turn of leverage (debt ÷ annualized OP) above 1. */
    leverageSpreadPerTurn: 0.0025,
    distressSpread: 0.015,
    /** Capacity = min(opMultiple × annualized OP, revenueShare × annualized revenue) − existing debt. */
    capacityOpMultiple: 2.5,
    capacityRevenueShare: 0.4,
    /** Covenant: leverage above this (or debt with non-positive OP) = distressed. */
    covenantLeverage: 4,
  },
  valuation: {
    baseMultiple: 1.0,
    growthCoef: 5,
    marginCoef: 3,
    aiCoef: 0.8,
    destinationCoef: 0.5,
    multipleBounds: [0.5, 4] as const,
    distressDiscount: 0.7,
    insolvencyDiscount: 0.4,
    /** A single equity raise may not exceed this share of pre-money value. */
    maxRaiseShareOfPreMoney: 0.5,
  },
  partner: {
    baseCash: 30,
    valueCash: 40,
    stake: 0.06,
    revenueShare: 0.06,
    segments: ['enterprise', 'aiNative'] as V2SegmentKey[],
    minStrategicValue: 0.35,
  },
  restructuring: {
    moderate: { poolCut: 0.08, costMultiple: 2.0, shocks: { culture: -5, execution: -5, organizationalCapacity: -4, talent: -2 } },
    deep: { poolCut: 0.16, costMultiple: 2.0, shocks: { culture: -11, execution: -10, talent: -6, organizationalCapacity: -9 } },
  },
  distress: {
    shocks: { trust: -5, talent: -4, culture: -6 },
    commercial: { consumerRetention: -3, enterpriseWinRate: -3 },
    /** Advisers, supplier deposits, expedited terms while insolvent. */
    eventCost: 2,
  },
} as const;

// ============ TYPES ============

export type V2FinancingAction =
  | { kind: 'equity'; amount: number }
  | { kind: 'debt'; amount: number }
  | { kind: 'repay'; amount: number }
  | { kind: 'partner' }
  | { kind: 'restructure'; depth: 'moderate' | 'deep' };

export interface V2FinancingRound {
  quarter: number;
  kind: 'equity' | 'debt' | 'repay' | 'partner' | 'restructure';
  amount: number;
  preMoney?: number;
  dilution?: number;
  rate?: number;
  downRound?: boolean;
  note: string;
}

export interface V2PartnerAgreement {
  quarter: number;
  cash: number;
  stake: number;
  revenueShare: number;
  segments: V2SegmentKey[];
  /** Constraint: the partner holds a right of first refusal on any sale and blocks third-party growth capital. */
  rightOfFirstRefusal: boolean;
}

export interface V2FinancingState {
  debt: number;
  /** Weighted interest rate per quarter on the outstanding balance. */
  interestRate: number;
  /** Share of the company still owned by the original shareholders (1 = no dilution). */
  ownership: number;
  equityRaised: number;
  cumulativeInterest: number;
  partner: V2PartnerAgreement | null;
  rounds: V2FinancingRound[];
}

export type V2SolvencyStatus = 'healthy' | 'watch' | 'warning' | 'insolvent';

export interface V2SolvencyRecord {
  quarter: number;
  status: V2SolvencyStatus;
  distressed: boolean;
  closingCash: number;
  /** Closing cash had management taken no financing/restructuring action this quarter. */
  projectedWithoutResolution: number;
  liquidityEvent: boolean;
  resolved: boolean;
  unresolved: boolean;
  leverage: number | null;
  covenantBreach: boolean;
  runwayQuarters: number | null;
}

export interface V2SolvencyState {
  status: V2SolvencyStatus;
  distressed: boolean;
  everInsolvent: boolean;
  insolventQuarters: number;
  firstInsolventQuarter: number | null;
  warningQuarters: number;
  liquidityEvents: number;
  history: V2SolvencyRecord[];
}

export function getFinancingBaseline(): V2FinancingState {
  return { debt: 0, interestRate: 0, ownership: 1, equityRaised: 0, cumulativeInterest: 0, partner: null, rounds: [] };
}

export function getSolvencyBaseline(): V2SolvencyState {
  return { status: 'healthy', distressed: false, everInsolvent: false, insolventQuarters: 0, firstInsolventQuarter: null, warningQuarters: 0, liquidityEvents: 0, history: [] };
}

// ============ VALUATION ============

export interface V2ValuationView {
  revenue: number;
  operatingProfit: number;
  cash: number;
  /** Revenue four quarters earlier (or the starting $200M). */
  revenueYearAgo: number;
  aiCommercialReadiness: number;
  destinationStrength: number;
  debt: number;
  status: V2SolvencyStatus;
  distressed: boolean;
}

function ramp(x: number, lo: number, hi: number): number {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}

export interface V2Valuation {
  annualRevenue: number;
  growth: number;
  margin: number;
  multiple: number;
  enterpriseValue: number;
  /** Equity value before any new money = EV + cash − debt, after distress discount. */
  preMoney: number;
  discount: number;
}

export function companyValuation(v: V2ValuationView): V2Valuation {
  const K = V2_FINANCING_CALIBRATION.valuation;
  const annualRevenue = 4 * v.revenue;
  const growth = v.revenueYearAgo > 0 ? v.revenue / v.revenueYearAgo - 1 : 0;
  const margin = v.revenue > 0 ? v.operatingProfit / v.revenue : 0;
  const raw = K.baseMultiple + K.growthCoef * growth + K.marginCoef * margin + K.aiCoef * ramp(v.aiCommercialReadiness, 15, 70) + K.destinationCoef * v.destinationStrength;
  const multiple = Math.min(K.multipleBounds[1], Math.max(K.multipleBounds[0], raw));
  const enterpriseValue = annualRevenue * multiple;
  const discount = v.status === 'insolvent' ? K.insolvencyDiscount : v.distressed ? K.distressDiscount : 1;
  return { annualRevenue, growth, margin, multiple, enterpriseValue, preMoney: (enterpriseValue + v.cash - v.debt) * discount, discount };
}

// ============ TERMS ============

export interface V2FinancingView extends V2ValuationView {
  fixedSemiFixed: number;
  /** 0–1 strategic value (capability peaks + specialization) for a partner. */
  strategicValue: number;
}

export function debtCapacity(v: V2FinancingView, f: V2FinancingState): number {
  if (v.status === 'insolvent') return 0;
  const K = V2_FINANCING_CALIBRATION.debt;
  const cap = Math.min(K.capacityOpMultiple * Math.max(0, 4 * v.operatingProfit), K.capacityRevenueShare * 4 * v.revenue);
  return Math.max(0, cap - f.debt);
}

export function debtRate(v: V2FinancingView, debtAfter: number): number {
  const K = V2_FINANCING_CALIBRATION.debt;
  const annualOP = 4 * v.operatingProfit;
  const leverage = annualOP > 0 ? debtAfter / annualOP : Infinity;
  return K.baseRatePerQuarter + K.leverageSpreadPerTurn * Math.max(0, Math.min(leverage, 10) - 1) + (v.distressed ? K.distressSpread : 0);
}

export function partnerTerms(v: V2FinancingView, f: V2FinancingState): { available: boolean; cash: number; reason: string } {
  const K = V2_FINANCING_CALIBRATION.partner;
  if (f.partner) return { available: false, cash: 0, reason: 'partner already in place' };
  if (v.strategicValue < K.minStrategicValue) return { available: false, cash: 0, reason: `strategic value ${v.strategicValue.toFixed(2)} below ${K.minStrategicValue}` };
  return { available: true, cash: K.baseCash + K.valueCash * v.strategicValue, reason: '' };
}

export interface V2FinancingOptions {
  valuation: V2Valuation;
  debtCapacity: number;
  debtRate: number;
  maxEquity: number;
  partner: ReturnType<typeof partnerTerms>;
  restructuringSavings: { moderate: number; deep: number };
}

export function financingOptions(v: V2FinancingView, f: V2FinancingState): V2FinancingOptions {
  const val = companyValuation(v);
  const cap = debtCapacity(v, f);
  return {
    valuation: val,
    debtCapacity: cap,
    debtRate: debtRate(v, f.debt + cap),
    maxEquity: Math.max(0, val.preMoney * V2_FINANCING_CALIBRATION.valuation.maxRaiseShareOfPreMoney),
    partner: partnerTerms(v, f),
    restructuringSavings: {
      moderate: v.fixedSemiFixed * V2_FINANCING_CALIBRATION.restructuring.moderate.poolCut,
      deep: v.fixedSemiFixed * V2_FINANCING_CALIBRATION.restructuring.deep.poolCut,
    },
  };
}

// ============ QUARTER EFFECTS ============

/**
 * Financing effects for a quarter: interest on the OPENING debt (always), distress costs while insolvent, and the
 * explicit actions management chose. Returns the next financing state (debt drawn now accrues from next quarter).
 */
export function financingEffects(
  f: V2FinancingState,
  solvency: V2SolvencyState,
  view: V2FinancingView,
  actions: V2FinancingAction[] | undefined,
  quarter: number
): { effects: V2QuarterEffects; state: V2FinancingState } {
  const K = V2_FINANCING_CALIBRATION;
  const e = emptyEffects();
  let state: V2FinancingState = { ...f, rounds: [...f.rounds], partner: f.partner ? { ...f.partner, segments: [...f.partner.segments] } : null };

  // Interest on opening debt → operating financing cost (exactly once)
  const interest = f.debt * f.interestRate;
  e.cost.financingCost = interest;
  state.cumulativeInterest += interest;

  // Partner economic sharing persists
  if (f.partner) e.cost.revenueShare.push({ source: 'strategic partner revenue share', rate: f.partner.revenueShare, segments: [...f.partner.segments] });

  // Distress while insolvent (entering the quarter insolvent)
  if (solvency.status === 'insolvent') {
    const d = K.distress;
    for (const [t, delta] of Object.entries(d.shocks)) e.stateShocks.push({ source: 'insolvency distress', target: t as V2StateShock['target'], delta });
    e.commercialShocks.push(
      { source: 'insolvency distress', indicator: 'consumerRetention', delta: d.commercial.consumerRetention },
      { source: 'insolvency distress', indicator: 'enterpriseWinRate', delta: d.commercial.enterpriseWinRate },
    );
    e.eventCosts.push({ id: `distress-Q${quarter}`, description: 'Insolvency distress: advisers, supplier deposits, expedited terms', amount: d.eventCost, category: 'distress' });
  }

  const opts = financingOptions(view, f);
  let n = 0;
  for (const a of actions ?? []) {
    n++;
    switch (a.kind) {
      case 'equity': {
        if (!(a.amount > 0)) throw new Error(`Equity amount must be positive, got ${a.amount}`);
        if (!(opts.valuation.preMoney > 0)) throw new Error('Equity unavailable: pre-money equity value is not positive');
        if (a.amount > opts.maxEquity + 1e-9) throw new Error(`Equity raise $${a.amount}M exceeds ${(K.valuation.maxRaiseShareOfPreMoney * 100).toFixed(0)}% of pre-money ($${opts.maxEquity.toFixed(1)}M)`);
        const preMoney = opts.valuation.preMoney;
        const dilution = a.amount / (preMoney + a.amount);
        state.ownership *= 1 - dilution;
        state.equityRaised += a.amount;
        const downRound = opts.valuation.discount < 1;
        e.financingItems.push({ id: `equity-Q${quarter}-${n}`, description: `Equity raise at $${preMoney.toFixed(0)}M pre-money (dilution ${(dilution * 100).toFixed(1)}%${downRound ? ', down-round' : ''})`, amount: a.amount, kind: 'equity' });
        state.rounds.push({ quarter, kind: 'equity', amount: a.amount, preMoney, dilution, downRound, note: downRound ? 'down-round' : '' });
        break;
      }
      case 'debt': {
        if (!(a.amount > 0)) throw new Error(`Debt amount must be positive, got ${a.amount}`);
        const cap = debtCapacity(view, state);
        if (a.amount > cap + 1e-9) throw new Error(`Debt draw $${a.amount}M exceeds capacity $${cap.toFixed(1)}M`);
        const rate = debtRate(view, state.debt + a.amount);
        state.interestRate = state.debt + a.amount > 0 ? (state.debt * state.interestRate + a.amount * rate) / (state.debt + a.amount) : 0;
        state.debt += a.amount;
        e.financingItems.push({ id: `debt-Q${quarter}-${n}`, description: `Debt drawn at ${(rate * 100).toFixed(2)}%/qtr`, amount: a.amount, kind: 'debt-draw' });
        state.rounds.push({ quarter, kind: 'debt', amount: a.amount, rate, note: '' });
        break;
      }
      case 'repay': {
        if (!(a.amount > 0) || a.amount > state.debt + 1e-9) throw new Error(`Repayment must be within (0, ${state.debt.toFixed(1)}], got ${a.amount}`);
        state.debt -= a.amount;
        if (state.debt <= 1e-9) { state.debt = 0; state.interestRate = 0; }
        e.financingItems.push({ id: `repay-Q${quarter}-${n}`, description: 'Debt repayment', amount: -a.amount, kind: 'debt-repay' });
        state.rounds.push({ quarter, kind: 'repay', amount: a.amount, note: '' });
        break;
      }
      case 'partner': {
        const t = partnerTerms(view, state);
        if (!t.available) throw new Error(`Strategic partner unavailable: ${t.reason}`);
        const P = K.partner;
        state.partner = { quarter, cash: t.cash, stake: P.stake, revenueShare: P.revenueShare, segments: [...P.segments], rightOfFirstRefusal: true };
        state.ownership *= 1 - P.stake;
        e.financingItems.push({ id: `partner-Q${quarter}`, description: `Strategic partner capital (stake ${(P.stake * 100).toFixed(0)}%, ${(P.revenueShare * 100).toFixed(0)}% revenue share on ${P.segments.join('+')}, ROFR)`, amount: t.cash, kind: 'partner' });
        // Revenue share starts this quarter
        e.cost.revenueShare.push({ source: 'strategic partner revenue share', rate: P.revenueShare, segments: [...P.segments] });
        state.rounds.push({ quarter, kind: 'partner', amount: t.cash, dilution: P.stake, note: 'ROFR, revenue share' });
        break;
      }
      case 'restructure': {
        const R = K.restructuring[a.depth];
        const alreadyCut = -e.cost.fixedPoolDelta.reduce((t, d) => t + d.amount, 0);
        const cut = availableCut(view.fixedSemiFixed - alreadyCut, view.fixedSemiFixed * R.poolCut);
        const cost = R.costMultiple * cut;
        e.cost.fixedPoolDelta.push({ source: `cost restructuring (${a.depth})`, amount: -cut });
        e.eventCosts.push({ id: `restructure-Q${quarter}`, description: `Cost restructuring (${a.depth}): facilities, vendor exits, process redesign`, amount: cost, category: 'restructuring' });
        for (const [t, delta] of Object.entries(R.shocks)) e.stateShocks.push({ source: `cost restructuring (${a.depth})`, target: t as V2StateShock['target'], delta });
        state.rounds.push({ quarter, kind: 'restructure', amount: cut, note: `event cost ${cost.toFixed(1)}` });
        break;
      }
    }
  }
  return { effects: e, state };
}

// ============ SOLVENCY ============

export function assessSolvency(
  prev: V2SolvencyState,
  quarter: number,
  closingCash: number,
  projectedWithoutResolution: number,
  netCashFlow: number,
  tookResolvingAction: boolean,
  debt: number,
  operatingProfit: number
): V2SolvencyState {
  const K = V2_FINANCING_CALIBRATION;
  const min = K.liquidity.minimumOperatingCash;
  const liquidityEvent = projectedWithoutResolution < min;
  const annualOP = 4 * operatingProfit;
  const leverage = debt > 0 ? (annualOP > 0 ? debt / annualOP : Infinity) : null;
  const covenantBreach = leverage !== null && leverage > K.debt.covenantLeverage;
  const runwayQuarters = netCashFlow >= 0 ? null : closingCash > 0 ? closingCash / -netCashFlow : 0;
  let status: V2SolvencyStatus;
  if (closingCash < 0) status = 'insolvent';
  else if (closingCash < min) status = 'warning';
  else if (closingCash < K.liquidity.comfortableCash || (runwayQuarters !== null && runwayQuarters < K.liquidity.comfortableRunwayQuarters)) status = 'watch';
  else status = 'healthy';
  const distressed = status === 'insolvent' || status === 'warning' || covenantBreach;
  const unresolved = liquidityEvent && !tookResolvingAction && projectedWithoutResolution < 0;
  const resolved = liquidityEvent && tookResolvingAction && closingCash >= 0;
  const insolvent = status === 'insolvent';
  const record: V2SolvencyRecord = {
    quarter, status, distressed, closingCash, projectedWithoutResolution, liquidityEvent, resolved, unresolved,
    leverage: leverage === Infinity ? null : leverage, covenantBreach, runwayQuarters,
  };
  return {
    status,
    distressed,
    everInsolvent: prev.everInsolvent || insolvent,
    insolventQuarters: prev.insolventQuarters + (insolvent ? 1 : 0),
    firstInsolventQuarter: prev.firstInsolventQuarter ?? (insolvent ? quarter : null),
    warningQuarters: prev.warningQuarters + (status === 'warning' ? 1 : 0),
    liquidityEvents: prev.liquidityEvents + (liquidityEvent ? 1 : 0),
    history: [...prev.history, record],
  };
}

/** 0–1 strategic value: the best capability peak (relative to its start) blended with specialization strength. */
export function strategicValue(c: { consumer: number; enterprise: number; ai: number; credential: number; talent: number }, destinationStrength: number): number {
  const peak = Math.max(ramp(c.consumer, 55, 100), ramp(c.enterprise, 30, 100), ramp(c.ai, 10, 100), ramp(c.credential, 40, 100), ramp(c.talent, 55, 100));
  return 0.7 * peak + 0.3 * destinationStrength;
}
