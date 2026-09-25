import { Allocation, Consequence, TeamState, TerminalResult } from '../../simulation/engine';

/**
 * INVARIANT CHECKS
 * 
 * Validates Test Lab runs for:
 * - Allocation sanity (no overflow)
 * - No NaN/Infinity
 * - Capability bounds
 * - Terminal score bounds (Q8 only)
 * - State consistency
 * 
 * Does NOT recalculate formulas. Uses what engine exposes.
 */

export interface InvariantCheck {
  id: string;
  category: 'allocation' | 'numeric' | 'capability' | 'terminal' | 'state';
  severity: 'error' | 'warning';
  message: string;
  passed: boolean;
  details?: string;
}

export interface InvariantReport {
  quarter: number;
  checks: InvariantCheck[];
  passed: boolean;
  errorCount: number;
  warningCount: number;
}

/**
 * Validate allocation against available capital
 */
export function checkAllocation(
  allocation: Allocation,
  availableCapital: number,
  _quarter: number
): InvariantCheck[] {
  const checks: InvariantCheck[] = [];

  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  const tolerance = 0.01;

  checks.push({
    id: 'alloc_total',
    category: 'allocation',
    severity: 'error',
    message: `Allocation total ($${total.toFixed(1)}M) matches available capital ($${availableCapital}M)`,
    passed: Math.abs(total - availableCapital) < tolerance,
    details: `Difference: $${(total - availableCapital).toFixed(3)}M (tolerance: $${tolerance}M)`,
  });

  Object.entries(allocation).forEach(([key, amount]) => {
    checks.push({
      id: `alloc_${key}_positive`,
      category: 'allocation',
      severity: 'error',
      message: `${key} allocation ($${amount.toFixed(1)}M) is non-negative`,
      passed: amount >= 0,
      details: key,
    });

    checks.push({
      id: `alloc_${key}_under_budget`,
      category: 'allocation',
      severity: 'error',
      message: `${key} allocation ($${amount.toFixed(1)}M) does not exceed available capital ($${availableCapital}M)`,
      passed: amount <= availableCapital * 1.01, // small tolerance for fp
      details: key,
    });
  });

  return checks;
}

/**
 * Validate consequence for NaN, Infinity, and basic sanity
 */
export function checkConsequence(
  consequence: Consequence,
  _quarter: number
): InvariantCheck[] {
  const checks: InvariantCheck[] = [];

  // Revenue change
  checks.push({
    id: 'cons_revenue_finite',
    category: 'numeric',
    severity: 'error',
    message: 'Revenue change is finite',
    passed: isFinite(consequence.revenueChange),
    details: `Revenue change: ${consequence.revenueChange}`,
  });

  // Cash change
  checks.push({
    id: 'cons_cash_finite',
    category: 'numeric',
    severity: 'error',
    message: 'Cash change is finite',
    passed: isFinite(consequence.cashChange),
    details: `Cash change: ${consequence.cashChange}`,
  });

  // Stock change
  checks.push({
    id: 'cons_stock_finite',
    category: 'numeric',
    severity: 'error',
    message: 'Stock price change is finite',
    passed: isFinite(consequence.stockPriceChange),
    details: `Stock change: ${consequence.stockPriceChange}`,
  });

  // Capability changes
  if (consequence.capabilityChanges) {
    Object.entries(consequence.capabilityChanges).forEach(([cap, delta]) => {
      checks.push({
        id: `cons_cap_${cap}_finite`,
        category: 'numeric',
        severity: 'error',
        message: `${cap} capability change is finite`,
        passed: isFinite(delta),
        details: `${cap} delta: ${delta}`,
      });
    });
  }

  // Quality/culture/trust changes
  if (consequence.productQualityChange !== undefined) {
    checks.push({
      id: 'cons_quality_finite',
      category: 'numeric',
      severity: 'error',
      message: 'Product quality change is finite',
      passed: isFinite(consequence.productQualityChange),
      details: `Quality change: ${consequence.productQualityChange}`,
    });
  }

  if (consequence.cultureChange !== undefined) {
    checks.push({
      id: 'cons_culture_finite',
      category: 'numeric',
      severity: 'error',
      message: 'Culture change is finite',
      passed: isFinite(consequence.cultureChange),
      details: `Culture change: ${consequence.cultureChange}`,
    });
  }

  if (consequence.trustChange !== undefined) {
    checks.push({
      id: 'cons_trust_finite',
      category: 'numeric',
      severity: 'error',
      message: 'Trust change is finite',
      passed: isFinite(consequence.trustChange),
      details: `Trust change: ${consequence.trustChange}`,
    });
  }

  return checks;
}

/**
 * Validate ending state after applying consequence
 */
export function checkEndingState(
  startingState: TeamState,
  consequence: Consequence,
  endingState: TeamState,
  quarter?: number
): InvariantCheck[] {
  const checks: InvariantCheck[] = [];

  // Revenue
  const expectedRevenue = startingState.revenue + consequence.revenueChange;
  checks.push({
    id: 'state_revenue_consistent',
    category: 'state',
    severity: 'error',
    message: 'Revenue after consequence matches starting + delta',
    passed: Math.abs(endingState.revenue - expectedRevenue) < 0.1,
    details: `Expected: $${expectedRevenue.toFixed(1)}M, Got: $${endingState.revenue.toFixed(1)}M`,
  });

  // Cash
  const expectedCash = startingState.cash + consequence.cashChange;
  checks.push({
    id: 'state_cash_consistent',
    category: 'state',
    severity: 'error',
    message: 'Cash after consequence matches starting + delta',
    passed: Math.abs(endingState.cash - expectedCash) < 0.1,
    details: `Expected: $${expectedCash.toFixed(1)}M, Got: $${endingState.cash.toFixed(1)}M`,
  });

  // Stock
  const expectedStock = startingState.stockPrice + consequence.stockPriceChange;
  checks.push({
    id: 'state_stock_consistent',
    category: 'state',
    severity: 'error',
    message: 'Stock price after consequence matches starting + delta',
    passed: Math.abs(endingState.stockPrice - expectedStock) < 0.1,
    details: `Expected: $${expectedStock.toFixed(2)}, Got: $${endingState.stockPrice.toFixed(2)}`,
  });

  // Capabilities (check a few key ones)
  if (consequence.capabilityChanges?.consumer !== undefined) {
    const expectedCap = startingState.capabilities.consumer + consequence.capabilityChanges.consumer;
    const passed = Math.abs(endingState.capabilities.consumer - expectedCap) < 0.1;
    
    // DIAGNOSTIC: Log invariant inputs for Q1
    if (quarter === 1) {
      console.log(`\nINVARIANT DETAILED EVALUATION (consumer):`);
      console.log(`  startingState.capabilities.consumer: ${startingState.capabilities.consumer.toFixed(1)}`);
      console.log(`  consequence.capabilityChanges.consumer: ${consequence.capabilityChanges.consumer.toFixed(1)}`);
      console.log(`  expectedCap (starting + delta): ${expectedCap.toFixed(1)}`);
      console.log(`  endingState.capabilities.consumer: ${endingState.capabilities.consumer.toFixed(1)}`);
      console.log(`  Difference (expected - actual): ${(expectedCap - endingState.capabilities.consumer).toFixed(1)}`);
      console.log(`  PASS/FAIL: ${passed ? 'PASS' : 'FAIL'}`);
    }
    
    checks.push({
      id: 'state_consumer_cap_consistent',
      category: 'state',
      severity: 'error',
      message: 'Consumer capability after consequence matches starting + delta',
      passed: passed,
      details: `Expected: ${expectedCap.toFixed(1)}, Got: ${endingState.capabilities.consumer.toFixed(1)}`,
    });
  }

  // DIAGNOSTIC: All capability deltas for Q1
  if (quarter === 1) {
    console.log(`\nALL CAPABILITY DELTAS:`);
    const capabilityKeys = ['consumer', 'enterprise', 'ai', 'talent', 'credential', 'customerSuccess', 'growth', 'execution'];
    capabilityKeys.forEach(cap => {
      const starting = (startingState.capabilities as any)[cap];
      const delta = (consequence.capabilityChanges as any)?.[cap];
      const ending = (endingState.capabilities as any)[cap];
      const expected = starting + (delta || 0);
      const match = delta !== undefined ? Math.abs(ending - expected) < 0.1 : 'N/A (no delta)';
      console.log(`  ${cap}: starting=${starting?.toFixed(1) || 'undefined'}, delta=${delta?.toFixed(1) || 'undefined'}, expected=${expected?.toFixed(1) || 'undefined'}, actual=${ending?.toFixed(1) || 'undefined'}, match=${match}`);
    });
  }

  // All capabilities must be within bounds
  Object.entries(endingState.capabilities).forEach(([cap, value]) => {
    checks.push({
      id: `state_${cap}_bounds`,
      category: 'capability',
      severity: 'error',
      message: `${cap} capability is within bounds [0, 120]`,
      passed: value >= 0 && value <= 120,
      details: `${cap}: ${value}`,
    });
  });

  return checks;
}

/**
 * Validate Q8 terminal result (only called for Q8)
 */
export function checkTerminalResult(
  terminalResult: TerminalResult | undefined,
  quarter: number
): InvariantCheck[] {
  const checks: InvariantCheck[] = [];

  if (quarter !== 8) {
    return checks; // No checks for non-Q8
  }

  if (!terminalResult) {
    checks.push({
      id: 'term_exists',
      category: 'terminal',
      severity: 'error',
      message: 'Q8 consequence includes terminalResult',
      passed: false,
      details: 'terminalResult is undefined',
    });
    return checks;
  }

  // Component scores
  checks.push({
    id: 'term_financial_score_bounds',
    category: 'terminal',
    severity: 'error',
    message: 'Financial score is in range [0, 33]',
    passed: terminalResult.financialScore >= 0 && terminalResult.financialScore <= 33,
    details: `Financial: ${terminalResult.financialScore}`,
  });

  checks.push({
    id: 'term_strategic_score_bounds',
    category: 'terminal',
    severity: 'error',
    message: 'Strategic score is in range [0, 33]',
    passed: terminalResult.strategicScore >= 0 && terminalResult.strategicScore <= 33,
    details: `Strategic: ${terminalResult.strategicScore}`,
  });

  checks.push({
    id: 'term_org_score_bounds',
    category: 'terminal',
    severity: 'error',
    message: 'Organizational score is in range [0, 34]',
    passed: terminalResult.organizationalScore >= 0 && terminalResult.organizationalScore <= 34,
    details: `Organizational: ${terminalResult.organizationalScore}`,
  });

  // Total score
  checks.push({
    id: 'term_total_score_bounds',
    category: 'terminal',
    severity: 'error',
    message: 'Total score is in range [0, 100]',
    passed: terminalResult.totalScore >= 0 && terminalResult.totalScore <= 100,
    details: `Total: ${terminalResult.totalScore}`,
  });

  checks.push({
    id: 'term_total_score_finite',
    category: 'terminal',
    severity: 'error',
    message: 'Total score is finite',
    passed: isFinite(terminalResult.totalScore),
    details: `Total: ${terminalResult.totalScore}`,
  });

  // Verdict
  const validVerdicts = ['WINNER', 'SURVIVOR', 'STRUGGLING', 'FAILURE'];
  checks.push({
    id: 'term_verdict_valid',
    category: 'terminal',
    severity: 'error',
    message: 'Verdict is one of [WINNER, SURVIVOR, STRUGGLING, FAILURE]',
    passed: validVerdicts.includes(terminalResult.verdict),
    details: `Verdict: ${terminalResult.verdict}`,
  });

  return checks;
}

/**
 * Generate full invariant report for a quarter
 */
export function generateInvariantReport(
  quarter: number,
  allocation: Allocation,
  availableCapital: number,
  startingState: TeamState,
  consequence: Consequence,
  endingState: TeamState
): InvariantReport {
  const checks: InvariantCheck[] = [];

  checks.push(...checkAllocation(allocation, availableCapital, quarter));
  checks.push(...checkConsequence(consequence, quarter));
  checks.push(...checkEndingState(startingState, consequence, endingState, quarter));
  checks.push(...checkTerminalResult(consequence.terminalResult, quarter));

  const errorCount = checks.filter(c => c.severity === 'error' && !c.passed).length;
  const warningCount = checks.filter(c => c.severity === 'warning' && !c.passed).length;

  return {
    quarter,
    checks,
    passed: errorCount === 0,
    errorCount,
    warningCount,
  };
}
