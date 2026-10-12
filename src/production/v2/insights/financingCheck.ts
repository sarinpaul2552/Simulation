/**
 * Financing plan validation (Batch 8 · Stage 2). Checks a CFO plan against the terms the frozen engine offers this
 * quarter (V2FinancingOptions) and states the consequences with the engine's own formulas — the engine would reject
 * a plan that exceeds these limits. Parameters are read, never changed.
 */
import type { V2FinancingAction, V2FinancingOptions } from '../../../simulation/engineV2Financing';

export interface FinancingCheck {
  errors: string[];
  notes: string[];
  /** Upper bound: options.debtRate is the rate at full capacity. */
  interestPerQuarter: number;
  dilution: number;
  ownershipAfter: number;
}

const m = (x: number) => `$${x.toFixed(1)}M`;

export function checkFinancing(options: V2FinancingOptions, actions: V2FinancingAction[], debt: number, ownership: number): FinancingCheck {
  const sum = (k: string) => actions.filter(a => a.kind === k).reduce((t, a) => t + ('amount' in a ? a.amount : 0), 0);
  const d = sum('debt'), e = sum('equity'), r = sum('repay');
  const errors: string[] = [];
  const notes: string[] = [];
  if (d > options.debtCapacity + 1e-9) errors.push(`Borrowing ${m(d)} exceeds the ${m(options.debtCapacity)} lenders will offer this quarter.`);
  if (e > 0 && !(options.valuation.preMoney > 0)) errors.push('Investors will not buy shares while the company’s equity value is not positive.');
  else if (e > options.maxEquity + 1e-9) errors.push(`Selling ${m(e)} of shares exceeds the ${m(options.maxEquity)} investors will take this quarter.`);
  if (r > debt + 1e-9) errors.push(`Repaying ${m(r)} is more than the ${m(debt)} outstanding.`);
  if (actions.some(a => a.kind === 'partner') && !options.partner.available) errors.push(`A strategic partner is not available: ${options.partner.reason}.`);
  const interestPerQuarter = d * options.debtRate;
  const dilution = e > 0 && options.valuation.preMoney > 0 ? e / (options.valuation.preMoney + e) : 0;
  const ownershipAfter = ownership * (1 - dilution);
  if (d > 0) notes.push(`New borrowing adds at most ${m(interestPerQuarter)} of interest per quarter (up to ${(options.debtRate * 100).toFixed(1)}% a quarter — the rate at full borrowing capacity; a smaller loan can cost less).`);
  if (e > 0 && dilution > 0) notes.push(`Selling shares dilutes existing shareholders by ${(dilution * 100).toFixed(1)}%: they would own ${(ownershipAfter * 100).toFixed(1)}% of the company.`);
  return { errors, notes, interestPerQuarter, dilution, ownershipAfter };
}
