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
 * Run a single quarter with given allocation and behavior
 */
export async function runSingleQuarter(
  quarter: number,
  allocation: Allocation,
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  startingState: TeamState,
  availableCapital: number
): Promise<QuarterResult> {
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

  // Apply consequence to state
  const endingState = applyConsequence(startingState, consequence);

  // Clamp to valid ranges
  const clampedEndingState = clampState(endingState);

  // Generate invariant report
  const invariants = generateInvariantReport(
    quarter,
    allocation,
    availableCapital,
    startingState,
    consequence,
    clampedEndingState
  );

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
