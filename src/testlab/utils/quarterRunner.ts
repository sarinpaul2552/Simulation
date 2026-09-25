import {
  calculateQuarterConsequence,
  getQ1Baseline,
  Allocation,
  Consequence,
  TeamState,
} from '../../simulation/engine';
import { weightsToAllocation, AllocationStrategy, BehaviorStrategy } from './testPresets';
import { applyConsequence, clampState } from './stateBuilder';
import { generateInvariantReport, InvariantReport } from './invariantChecker';
import gameplayContent from '../../content/gameplay.json';

/**
 * QUARTER RUNNER
 * 
 * Orchestrates automated test runs across Q1→Q8 using allocation + behavior strategies
 */

export interface QuarterResult {
  quarter: number;
  startingState: TeamState;
  allocation: Allocation;
  availableCapital: number;
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null;
  consequence: Consequence;
  endingState: TeamState;
  invariants: InvariantReport;
}

export interface StrategyTestRun {
  strategyId: string;
  strategyName: string;
  allocStrategy: AllocationStrategy;
  behavStrategy: BehaviorStrategy;
  quarters: QuarterResult[];
  finalState: TeamState;
  passed: boolean;
}

/**
 * DIAGNOSTIC: Deep copy for mutation detection
 */
function deepCopyState(state: TeamState): TeamState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * DIAGNOSTIC: Format capabilities for comparison
 */
function formatCapabilities(caps: any, label: string): string {
  return `${label}: {consumer: ${caps.consumer?.toFixed?.(1) || caps.consumer}, enterprise: ${caps.enterprise?.toFixed?.(1) || caps.enterprise}, ai: ${caps.ai?.toFixed?.(1) || caps.ai}, talent: ${caps.talent?.toFixed?.(1) || caps.talent}, credential: ${caps.credential?.toFixed?.(1) || caps.credential}, customerSuccess: ${caps.customerSuccess?.toFixed?.(1) || caps.customerSuccess}, growth: ${caps.growth?.toFixed?.(1) || caps.growth}, execution: ${caps.execution?.toFixed?.(1) || caps.execution}}`;
}

/**
 * DIAGNOSTIC: Format allocation for inspection
 */
function formatAllocation(alloc: Allocation): string {
  return `{consumer: ${alloc.consumerGrowth?.toFixed?.(2) || alloc.consumerGrowth}, enterprise: ${alloc.enterpriseSales?.toFixed?.(2) || alloc.enterpriseSales}, ai: ${alloc.aiProduct?.toFixed?.(2) || alloc.aiProduct}, people: ${alloc.instructorPeople?.toFixed?.(2) || alloc.instructorPeople}, cred: ${alloc.universityCredential?.toFixed?.(2) || alloc.universityCredential}, cash: ${alloc.cash?.toFixed?.(2) || alloc.cash}}`;
}

/**
 * Run a single quarter with given allocation and behavior
 */
export async function runSingleQuarter(
  quarter: number,
  allocation: Allocation,
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  startingState: TeamState,
  availableCapital: number
): Promise<QuarterResult> {
  // DIAGNOSTIC: Snapshot starting state for mutation detection
  const startingStateSnapshot = deepCopyState(startingState);
  
  // DIAGNOSTIC: Log inputs
  if (quarter === 1) {
    console.log('\n' + '='.repeat(80));
    console.log(`Q${quarter} DIAGNOSTIC TRACE - Balanced + Leadership Aligned`);
    console.log('='.repeat(80));
    console.log(`Available Capital: ${availableCapital}M`);
    console.log(`Allocation weights: {consumer: 1/6, enterprise: 1/6, ai: 1/6, people: 1/6, cred: 1/6, cash: 1/6}`);
    console.log(`Allocation actual: ${formatAllocation(allocation)}`);
    console.log(`Role Votes: ${roleVotes ? JSON.stringify(roleVotes) : 'null (neutral/leadership-aligned)'}`);
    
    // Calculate and log effective investments
    console.log(`\nEFFECTIVE INVESTMENTS (diminishing returns):`);
    const effectiveMap: Record<string, number> = {};
    const allocationEntries = [
      ['consumerGrowth', allocation.consumerGrowth],
      ['enterpriseSales', allocation.enterpriseSales],
      ['aiProduct', allocation.aiProduct],
      ['instructorPeople', allocation.instructorPeople],
      ['universityCredential', allocation.universityCredential],
    ];
    
    // Simple effective investment calculation (matching engine)
    const calculateEffective = (amount: number): number => {
      if (amount <= 5) return amount * 1.0;
      if (amount <= 10) return 5 * 1.0 + (amount - 5) * 0.8;
      if (amount <= 15) return 5 * 1.0 + 5 * 0.8 + (amount - 10) * 0.6;
      return 5 * 1.0 + 5 * 0.8 + 5 * 0.6 + (amount - 15) * 0.4;
    };
    
    allocationEntries.forEach(([key, amount]) => {
      const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      const eff = calculateEffective(numAmount);
      effectiveMap[key] = eff;
      console.log(`  ${key}: ${numAmount.toFixed(2)}M → effective: ${eff.toFixed(2)}`);
    });
  }
  
  // DIAGNOSTIC: Log starting capabilities BEFORE engine call
  if (quarter === 1) {
    console.log(`\nSTARTING STATE (before engine call):`);
    console.log(formatCapabilities(startingState.capabilities, 'capabilities'));
  }
  
  // Call production consequence engine
  const consequenceOrNull = calculateQuarterConsequence(
    quarter,
    allocation,
    roleVotes,
    false, // no CEO override
    [], // no dissenting roles
    startingState
  );

  if (!consequenceOrNull) {
    throw new Error(`Engine returned null consequence for Q${quarter}`);
  }

  const consequence = consequenceOrNull;
  
  // DIAGNOSTIC: Check if startingState was mutated
  if (quarter === 1) {
    const wasStartingStateMutated = 
      startingState.capabilities.consumer !== startingStateSnapshot.capabilities.consumer ||
      startingState.capabilities.enterprise !== startingStateSnapshot.capabilities.enterprise ||
      startingState.capabilities.ai !== startingStateSnapshot.capabilities.ai ||
      startingState.capabilities.talent !== startingStateSnapshot.capabilities.talent ||
      startingState.capabilities.credential !== startingStateSnapshot.capabilities.credential ||
      startingState.capabilities.execution !== startingStateSnapshot.capabilities.execution;
    
    console.log(`\nAFTER ENGINE CALL:`);
    console.log(formatCapabilities(startingState.capabilities, 'startingState.capabilities'));
    console.log(`StartingState mutated by engine: ${wasStartingStateMutated}`);
    
    console.log(`\nCONSEQUENCE DELTAS:`);
    console.log(`capabilityChanges: {`);
    console.log(`  consumer: ${consequence.capabilityChanges.consumer?.toFixed(1) || 'undefined'},`);
    console.log(`  enterprise: ${consequence.capabilityChanges.enterprise?.toFixed(1) || 'undefined'},`);
    console.log(`  ai: ${consequence.capabilityChanges.ai?.toFixed(1) || 'undefined'},`);
    console.log(`  talent: ${consequence.capabilityChanges.talent?.toFixed(1) || 'undefined'},`);
    console.log(`  credential: ${consequence.capabilityChanges.credential?.toFixed(1) || 'undefined'},`);
    console.log(`  customerSuccess: ${consequence.capabilityChanges.customerSuccess?.toFixed(1) || 'undefined'},`);
    console.log(`  growth: ${consequence.capabilityChanges.growth?.toFixed(1) || 'undefined'},`);
    console.log(`  execution: ${consequence.capabilityChanges.execution?.toFixed(1) || 'undefined'}`);
    console.log(`}`);
  }

  // Apply consequence to state
  const endingState = applyConsequence(startingState, consequence);
  
  // DIAGNOSTIC: Log after applyConsequence (before clamp)
  if (quarter === 1) {
    console.log(`\nAFTER applyConsequence (UNCLAMPED):`);
    console.log(formatCapabilities(endingState.capabilities, 'endingState.capabilities'));
  }

  // Clamp to valid ranges
  const clampedEndingState = clampState(endingState);
  
  // DIAGNOSTIC: Log after clampState
  if (quarter === 1) {
    console.log(`\nAFTER clampState (CLAMPED):`);
    console.log(formatCapabilities(clampedEndingState.capabilities, 'clampedEndingState.capabilities'));
  }

  // Generate invariant report
  const invariants = generateInvariantReport(
    quarter,
    allocation,
    availableCapital,
    startingState,
    consequence,
    clampedEndingState
  );
  
  // DIAGNOSTIC: Log invariant evaluation for Q1
  if (quarter === 1) {
    console.log(`\nINVARIANT CHECKS:`);
    invariants.checks.forEach(check => {
      if (check.id.includes('consumer') || check.id.includes('state')) {
        console.log(`  ${check.id}: ${check.passed ? 'PASS' : 'FAIL'} - ${check.details}`);
      }
    });
    
    // Summary
    console.log(`\n` + '='.repeat(80));
    console.log(`SUMMARY`);
    console.log('='.repeat(80));
    console.log(`All Q1 invariants passed: ${invariants.passed}`);
    console.log(`Failed checks: ${invariants.checks.filter(c => !c.passed && c.severity === 'error').length}`);
    invariants.checks.filter(c => !c.passed && c.severity === 'error').forEach(check => {
      console.log(`  - ${check.message}: ${check.details}`);
    });
    console.log('='.repeat(80) + '\n');
  }

  return {
    quarter,
    startingState,
    allocation,
    availableCapital,
    roleVotes,
    consequence,
    endingState: clampedEndingState,
    invariants,
  };
}

/**
 * Run full Q1→Q8 strategy test
 */
export async function runFullStrategyTest(
  strategyId: string,
  strategyName: string,
  allocStrategy: AllocationStrategy,
  behavStrategy: BehaviorStrategy
): Promise<StrategyTestRun> {
  const quarters: QuarterResult[] = [];
  let currentState = getQ1Baseline();

  for (let q = 1; q <= 8; q++) {
    // Get quarter content for available capital
    const qContent = gameplayContent[`q${q}` as keyof typeof gameplayContent] as any;
    const availableCapital = qContent?.available_capital || 30;

    // Generate allocation from strategy
    const allocation = weightsToAllocation(allocStrategy, availableCapital, q);

    // Generate role votes from behavior strategy
    const roleVotes = behavStrategy.getRoleVotes(q);

    // Run quarter
    const quarterResult = await runSingleQuarter(
      q,
      allocation,
      roleVotes,
      currentState,
      availableCapital
    );

    quarters.push(quarterResult);
    currentState = quarterResult.endingState;
  }

  // Check if all invariants passed
  const passed = quarters.every(qr => qr.invariants.passed);

  return {
    strategyId,
    strategyName,
    allocStrategy,
    behavStrategy,
    quarters,
    finalState: currentState,
    passed,
  };
}

/**
 * Compare multiple strategy runs
 */
export interface StrategyComparison {
  baseline: StrategyTestRun;
  competitors: StrategyTestRun[];
}

export async function compareStrategies(
  baselineRun: StrategyTestRun,
  competitorRuns: StrategyTestRun[]
): Promise<StrategyComparison> {
  return {
    baseline: baselineRun,
    competitors: competitorRuns,
  };
}

/**
 * DIAGNOSTIC: Export structured trace for Q1 analysis
 */
export interface Q1DiagnosticTrace {
  availableCapital: number;
  allocation: Allocation;
  startingCapabilities: any;
  consequenceDelta: any;
  unclamped: any;
  clamped: any;
  invariantInputs: {
    startingValue: number;
    consequenceDelta: number;
    expectedValue: number;
    actualValue: number;
    passed: boolean;
  };
}

export function extractQ1Trace(quarterResult: QuarterResult): Q1DiagnosticTrace {
  return {
    availableCapital: quarterResult.availableCapital,
    allocation: quarterResult.allocation,
    startingCapabilities: quarterResult.startingState.capabilities,
    consequenceDelta: quarterResult.consequence.capabilityChanges,
    unclamped: quarterResult.endingState.capabilities, // Note: already clamped in current code
    clamped: quarterResult.endingState.capabilities,
    invariantInputs: {
      startingValue: quarterResult.startingState.capabilities.consumer,
      consequenceDelta: quarterResult.consequence.capabilityChanges.consumer || 0,
      expectedValue: (quarterResult.startingState.capabilities.consumer) + (quarterResult.consequence.capabilityChanges.consumer || 0),
      actualValue: quarterResult.endingState.capabilities.consumer,
      passed: quarterResult.invariants.passed,
    },
  };
}

/**
 * Format a full strategy test run as displayable data
 */
export function formatStrategyRun(run: StrategyTestRun): {
  rows: Array<Record<string, string | number>>;
  summary: Record<string, string | number>;
  warnings: string[];
} {
  const rows = run.quarters.map((qr, idx) => ({
    Q: idx + 1,
    Revenue: `$${qr.endingState.revenue.toFixed(1)}M`,
    Cash: `$${qr.endingState.cash.toFixed(1)}M`,
    Stock: `$${qr.endingState.stockPrice.toFixed(2)}`,
    PQ: qr.endingState.productQuality.toFixed(0),
    Culture: qr.endingState.culture.toFixed(0),
    Trust: qr.endingState.trust.toFixed(0),
    Consumer: qr.endingState.capabilities.consumer.toFixed(0),
    Enterprise: qr.endingState.capabilities.enterprise.toFixed(0),
    AI: qr.endingState.capabilities.ai.toFixed(0),
    Talent: qr.endingState.capabilities.talent.toFixed(0),
    Exec: qr.endingState.capabilities.execution.toFixed(0),
  }));

  const finalQ = run.quarters[run.quarters.length - 1];
  const terminalResult = finalQ.consequence.terminalResult;

  const summary: Record<string, string | number> = {
    Strategy: run.strategyName,
    'Q8 Revenue': `$${run.finalState.revenue.toFixed(1)}M`,
    'Q8 Cash': `$${run.finalState.cash.toFixed(1)}M`,
    'Q8 Stock': `$${run.finalState.stockPrice.toFixed(2)}`,
    'Q8 Quality': run.finalState.productQuality.toFixed(0),
    'Q8 Culture': run.finalState.culture.toFixed(0),
    'Q8 Trust': run.finalState.trust.toFixed(0),
    'Consumer Cap': run.finalState.capabilities.consumer.toFixed(0),
    'Enterprise Cap': run.finalState.capabilities.enterprise.toFixed(0),
    'AI Cap': run.finalState.capabilities.ai.toFixed(0),
    'Talent Cap': run.finalState.capabilities.talent.toFixed(0),
  };

  if (terminalResult) {
    summary['Financial Score'] = `${terminalResult.financialScore.toFixed(1)}/33`;
    summary['Strategic Score'] = `${terminalResult.strategicScore.toFixed(1)}/33`;
    summary['Organizational Score'] = `${terminalResult.organizationalScore.toFixed(1)}/34`;
    summary['Total Score'] = `${terminalResult.totalScore.toFixed(1)}/100`;
    summary['Verdict'] = terminalResult.verdict;
  }

  // Collect warnings from all quarters
  const warnings: string[] = [];
  run.quarters.forEach((qr, idx) => {
    const failedChecks = qr.invariants.checks.filter(c => !c.passed && c.severity === 'error');
    if (failedChecks.length > 0) {
      failedChecks.forEach(check => {
        warnings.push(`Q${idx + 1}: ${check.message} - ${check.details}`);
      });
    }
  });

  // Flag Q4 destination gap
  if (run.quarters.length >= 4) {
    warnings.push('⚠️  Q4 destination selected in gameplay but not received by engine consequence (design gap)');
  }

  return { rows, summary, warnings };
}
