/**
 * NexLearn V3.1 Stage 1 — financial reporting (presentation only).
 *
 * Restates the engine's own quarterly ledger in standard terms. Nothing here is a new calculation of economics:
 * every figure is a recorded ledger value or a sum/difference of recorded ledger values, and the statement must
 * reconcile exactly with the recorded cash movement. The only split beyond the ledger's own lines is acquisitions,
 * which the ledger identifies explicitly; other accounting classifications are deferred to Stage 3.
 *
 *   Operating profit                 revenue − operating costs (the engine's figure; before strategic investment)
 *   Strategic investment             the quarter's investment programme (the five buckets)
 *   One-off costs                    event costs other than acquisitions: contract set-up, crisis response,
 *                                    severance, deal costs, …
 *   Free cash flow                   operating profit − strategic investment − one-off costs
 *                                    (before acquisitions and financing)
 *   Acquisitions                     consideration paid for an acquired business. Identified reliably: both engines
 *                                    record it as the only event-cost item with id `acquisition-Q<n>`.
 *   Financing                        debt, equity and repayments
 *   Change in cash                   free cash flow − acquisitions + financing  (= closing − opening cash)
 */
import type { QuarterRecord } from './history';

export interface QuarterFinancials {
  quarter: number;
  revenue: number;
  operatingCost: number;
  operatingProfit: number;
  /** Operating profit ÷ revenue (0 when revenue is 0). */
  operatingMargin: number;
  strategicInvestment: number;
  /** Strategic investment ÷ revenue — how much of each revenue dollar went into the investment programme. */
  investmentIntensity: number;
  /** Event costs other than acquisitions. */
  oneOffCosts: number;
  freeCashFlow: number;
  acquisitions: number;
  financing: number;
  openingCash: number;
  closingCash: number;
  cashChange: number;
  /** True when free cash flow − acquisitions + financing equals the recorded cash movement (and closing cash equals the state). */
  reconciles: boolean;
}

/** Acquisition consideration recorded in a ledger (event-cost items with id `acquisition-Q<n>`). */
export const ACQUISITION_ITEM = /^acquisition-Q\d+$/;
export function acquisitionSpend(items: { id: string; amount: number }[]): number {
  return items.filter(i => ACQUISITION_ITEM.test(i.id)).reduce((t, i) => t + i.amount, 0);
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

export function quarterFinancials(rec: QuarterRecord): QuarterFinancials {
  const l = rec.consequence.ledger;
  const acquisitions = acquisitionSpend(l.eventCostItems);
  const oneOffCosts = l.eventCosts - acquisitions;
  const freeCashFlow = l.operatingProfit - l.strategicInvestment - oneOffCosts;
  const cashChange = l.closingCash - l.openingCash;
  return {
    quarter: rec.quarter,
    revenue: l.revenue,
    operatingCost: l.operatingCost,
    operatingProfit: l.operatingProfit,
    operatingMargin: l.revenue > 0 ? l.operatingProfit / l.revenue : 0,
    strategicInvestment: l.strategicInvestment,
    investmentIntensity: l.revenue > 0 ? l.strategicInvestment / l.revenue : 0,
    oneOffCosts,
    freeCashFlow,
    acquisitions,
    financing: l.financing,
    openingCash: l.openingCash,
    closingCash: l.closingCash,
    cashChange,
    reconciles: close(freeCashFlow - acquisitions + l.financing, cashChange) && close(l.closingCash, rec.after.cash),
  };
}

export interface PeriodFinancials {
  quarters: number;
  operatingProfit: number;
  strategicInvestment: number;
  oneOffCosts: number;
  freeCashFlow: number;
  acquisitions: number;
  financing: number;
  openingCash: number;
  closingCash: number;
  cashChange: number;
  reconciles: boolean;
}

/** Totals over the recorded quarters (the board report's cash-flow summary). */
export function periodFinancials(history: QuarterRecord[]): PeriodFinancials {
  const q = history.map(quarterFinancials);
  const sum = (f: (x: QuarterFinancials) => number) => q.reduce((t, x) => t + f(x), 0);
  const openingCash = q.length ? q[0].openingCash : 0;
  const closingCash = q.length ? q[q.length - 1].closingCash : 0;
  const freeCashFlow = sum(x => x.freeCashFlow), financing = sum(x => x.financing), acquisitions = sum(x => x.acquisitions);
  return {
    quarters: q.length,
    operatingProfit: sum(x => x.operatingProfit),
    strategicInvestment: sum(x => x.strategicInvestment),
    oneOffCosts: sum(x => x.oneOffCosts),
    freeCashFlow, acquisitions, financing, openingCash, closingCash,
    cashChange: closingCash - openingCash,
    reconciles: q.every(x => x.reconciles) && close(freeCashFlow - acquisitions + financing, closingCash - openingCash),
  };
}
