/**
 * PHASE 1B DIAGNOSTIC SUITE RUNNER
 * 
 * Executes existing presets using production engine and captures authoritative
 * runtime values for terminal scoring, execution alignment, and cash accounting.
 * 
 * NO LOGIC CHANGES — Only observability. Uses production engine exactly as-is.
 */

import { runFullStrategyTest, StrategyTestRun } from './quarterRunner';
import { allocationStrategies, behaviorStrategies } from './testPresets';

export interface DiagnosticResult {
  strategyId: string;
  strategyName: string;
  
  // Q8 Terminal Values (authoritative from engine)
  q8Revenue: number;
  q8Cash: number;
  q8EBITDA: number;
  q8EBITDAMargin: number;
  
  // Terminal Scores (from terminalResult)
  financialScore: number;
  strategicScore: number;
  organizationalScore: number;
  totalScore: number;
  verdict: 'WINNER' | 'SURVIVOR' | 'STRUGGLING' | 'FAILURE';
  
  // Q8 Financial Score Components (extracted from diagnostics)
  financialRevenuePoints: number;
  financialEbitdaPoints: number;
  financialCashPoints: number;
  financialOtherPoints: number;
  
  // Execution Trace (Q1-Q8)
  executionTrace: Array<{
    quarter: number;
    startingExecution: number;
    roleVotesType: string;
    roleVotesValue: string;
    alignmentDelta: number;
    endingExecution: number;
  }>;
  
  // Cash Ledger (if Balanced or Cash 100%)
  cashLedger?: Array<{
    quarter: number;
    openingCash: number;
    operatingProfit: number;
    strategicSpend: number;
    financing: number;
    otherAdjustment: number;
    closingCash: number;
    reconciliation: number; // Should be ~0
  }>;
  
  // Raw test run for reference
  testRun: StrategyTestRun;
}

export interface DiagnosticSuiteResults {
  timestamp: string;
  strategies: DiagnosticResult[];
  summaryTable: string;
  financialBreakdown: string;
  executionTraces: string;
  cashLedgers: string;
  consoleExport: string;
}

/**
 * Extract execution trace from quarter results
 */
function extractExecutionTrace(testRun: StrategyTestRun): DiagnosticResult['executionTrace'] {
  const trace: DiagnosticResult['executionTrace'] = [];
  
  for (let q = 1; q <= 8; q++) {
    const quarterResult = testRun.quarters[q - 1];
    if (!quarterResult) continue;
    
    const startingExecution = quarterResult.startingState.capabilities.execution;
    const endingExecution = quarterResult.endingState.capabilities.execution;
    const delta = endingExecution - startingExecution;
    
    // roleVotes from test run
    const roleVotes = quarterResult.roleVotes;
    const roleVotesType = roleVotes === null ? 'null' : typeof roleVotes;
    const roleVotesValue = roleVotes === null ? 'null' : JSON.stringify(roleVotes);
    
    trace.push({
      quarter: q,
      startingExecution,
      roleVotesType,
      roleVotesValue,
      alignmentDelta: delta,
      endingExecution,
    });
  }
  
  return trace;
}

/**
 * Extract cash ledger from quarter results
 */
function extractCashLedger(testRun: StrategyTestRun): DiagnosticResult['cashLedger'] {
  const ledger: DiagnosticResult['cashLedger'] = [];
  
  for (let q = 1; q <= 8; q++) {
    const quarterResult = testRun.quarters[q - 1];
    if (!quarterResult) continue;
    
    // Extract authoritative values from diagnostic ledger in consequence
    const diagnosticLedger = (quarterResult.consequence as any).__diagnostic__cashLedger;
    
    if (diagnosticLedger) {
      const openingCash = diagnosticLedger.openingCash;
      const operatingProfit = diagnosticLedger.operatingProfit;
      const strategicSpend = diagnosticLedger.strategicSpend;
      const financing = diagnosticLedger.financing;
      const otherAdjustment = diagnosticLedger.otherAdjustment;
      const closingCash = diagnosticLedger.closingCash;
      
      // Reconciliation: Opening + Profit − Spend + Financing ± Other = Closing
      const reconciliation = openingCash + operatingProfit - strategicSpend + financing + otherAdjustment - closingCash;
      
      ledger.push({
        quarter: q,
        openingCash,
        operatingProfit,
        strategicSpend,
        financing,
        otherAdjustment,
        closingCash,
        reconciliation,
      });
    }
  }
  
  return ledger;
}

/**
 * Run diagnostic suite on a single strategy
 */
async function runDiagnosticStrategy(
  strategyId: string,
  strategyName: string,
  allocId: string,
  behavId: string
): Promise<DiagnosticResult> {
  const allocStrategy = allocationStrategies[allocId];
  const behavStrategy = behaviorStrategies[behavId];
  
  if (!allocStrategy || !behavStrategy) {
    throw new Error(`Strategy components not found: ${allocId}/${behavId}`);
  }
  
  const testRun = await runFullStrategyTest(strategyId, strategyName, allocStrategy, behavStrategy);
  const q8Quarter = testRun.quarters[7];
  
  if (!q8Quarter || !q8Quarter.consequence.terminalResult) {
    throw new Error(`Q8 terminal result not found for ${strategyId}`);
  }
  
  const tr = q8Quarter.consequence.terminalResult;
  
  // Extract financial score components from diagnostic data in terminalResult
  const diagnosticFinancialComponents = (tr as any).__diagnostic__financialComponents;
  const financialRevenuePoints = diagnosticFinancialComponents?.revenueComponent || 0;
  const financialEbitdaPoints = diagnosticFinancialComponents?.ebitdaComponent || 0;
  const financialCashPoints = diagnosticFinancialComponents?.cashComponent || 0;
  const financialOtherPoints = diagnosticFinancialComponents?.otherComponent || 0;
  
  const result: DiagnosticResult = {
    strategyId,
    strategyName,
    q8Revenue: tr.revenue,
    q8Cash: tr.cash,
    q8EBITDA: tr.ebitda,
    q8EBITDAMargin: tr.ebitdaMargin,
    financialScore: tr.financialScore,
    strategicScore: tr.strategicScore,
    organizationalScore: tr.organizationalScore,
    totalScore: tr.totalScore,
    verdict: tr.verdict,
    financialRevenuePoints,
    financialEbitdaPoints,
    financialCashPoints,
    financialOtherPoints,
    executionTrace: extractExecutionTrace(testRun),
    testRun,
  };
  
  // Only include cash ledger for specific strategies
  if (strategyId.includes('balanced') || strategyId.includes('cash')) {
    result.cashLedger = extractCashLedger(testRun);
  }
  
  return result;
}

/**
 * Run complete diagnostic suite
 */
export async function runDiagnosticSuite(): Promise<DiagnosticSuiteResults> {
  const strategies = [
    { id: 'balanced-aligned', name: 'Balanced + Leadership Aligned', alloc: 'balanced', behav: 'leadership-aligned' },
    { id: 'enterprise-100-every-q', name: 'Enterprise 100% Every Q', alloc: 'enterprise-100', behav: 'stay-course' },
    { id: 'ai-100-every-q', name: 'AI 100% Every Q', alloc: 'ai-100', behav: 'stay-course' },
    { id: 'people-100-every-q', name: 'People 100% Every Q', alloc: 'people-100', behav: 'stay-course' },
    { id: 'cash-100-every-q', name: 'Cash 100% Every Q (No Investment)', alloc: 'cash-100', behav: 'stay-course' },
  ]; // Observational suite — no expected verdicts
  
  const results: DiagnosticResult[] = [];
  
  console.log('\n' + '='.repeat(100));
  console.log('PHASE 1B DIAGNOSTIC SUITE RUNNER');
  console.log('='.repeat(100));
  
  for (const strategy of strategies) {
    try {
      console.log(`\nRunning: ${strategy.name}...`);
      const result = await runDiagnosticStrategy(strategy.id, strategy.name, strategy.alloc, strategy.behav);
      results.push(result);
      console.log(`✓ Complete: Score ${result.totalScore}, Verdict ${result.verdict}`);
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
    }
  }
  
  // Format results
  const summaryTable = formatSummaryTable(results);
  const financialBreakdown = formatFinancialBreakdown(results);
  const executionTraces = formatExecutionTraces(results);
  const cashLedgers = formatCashLedgers(results);
  const consoleExport = generateConsoleExport(results);
  
  const suiteResults: DiagnosticSuiteResults = {
    timestamp: new Date().toISOString(),
    strategies: results,
    summaryTable,
    financialBreakdown,
    executionTraces,
    cashLedgers,
    consoleExport,
  };
  
  return suiteResults;
}

/**
 * Format summary table
 */
function formatSummaryTable(results: DiagnosticResult[]): string {
  let table = 'SUMMARY TABLE\n';
  table += '─'.repeat(130) + '\n';
  table += 'Strategy | Q8 Revenue | Q8 Cash | EBITDA | EBITDA% | Fin | Strat | Org | Total | Verdict | Final Exec\n';
  table += '─'.repeat(130) + '\n';
  
  for (const r of results) {
    const name = r.strategyName.substring(0, 25).padEnd(25);
    const revenue = `$${r.q8Revenue.toFixed(0)}M`.padEnd(10);
    const cash = `$${r.q8Cash.toFixed(0)}M`.padEnd(8);
    const ebitda = `$${r.q8EBITDA.toFixed(0)}M`.padEnd(7);
    const margin = `${(r.q8EBITDAMargin * 100).toFixed(1)}%`.padEnd(7);
    const fin = `${r.financialScore}/33`.padEnd(5);
    const strat = `${r.strategicScore}/33`.padEnd(6);
    const org = `${r.organizationalScore}/34`.padEnd(5);
    const total = `${r.totalScore}`.padEnd(6);
    const verdict = r.verdict.padEnd(10);
    const exec = `${r.executionTrace[7]?.endingExecution.toFixed(0) || '?'}`;
    
    table += `${name} │ ${revenue} │ ${cash} │ ${ebitda} │ ${margin} │ ${fin} │ ${strat} │ ${org} │ ${total} │ ${verdict} │ ${exec}\n`;
  }
  
  table += '─'.repeat(130) + '\n';
  return table;
}

/**
 * Format financial score breakdown
 */
function formatFinancialBreakdown(results: DiagnosticResult[]): string {
  let table = '\nFINANCIAL SCORE BREAKDOWN\n';
  table += '─'.repeat(130) + '\n';
  table += 'Strategy | Revenue Pts | EBITDA Pts | Cash Pts | Other | Raw Subtotal | Final Score\n';
  table += '─'.repeat(130) + '\n';
  
  for (const r of results) {
    const name = r.strategyName.substring(0, 25).padEnd(25);
    const revPts = `${r.financialRevenuePoints}`.padEnd(11);
    const ebitdaPts = `${r.financialEbitdaPoints}`.padEnd(10);
    const cashPts = `${r.financialCashPoints}`.padEnd(8);
    const other = `${r.financialOtherPoints}`.padEnd(5);
    const raw = `${r.financialRevenuePoints + r.financialEbitdaPoints + r.financialCashPoints}`.padEnd(12);
    const final = `${r.financialScore}/33`;
    
    table += `${name} │ ${revPts} │ ${ebitdaPts} │ ${cashPts} │ ${other} │ ${raw} │ ${final}\n`;
  }
  
  table += '─'.repeat(130) + '\n';
  return table;
}

/**
 * Format execution traces
 */
function formatExecutionTraces(results: DiagnosticResult[]): string {
  let output = '\nEXECUTION TRACE (Quarterly)\n';
  
  for (const r of results) {
    output += `\n${r.strategyName}:\n`;
    output += '─'.repeat(100) + '\n';
    output += 'Q | Starting | roleVotes Type | Delta | Ending\n';
    output += '─'.repeat(100) + '\n';
    
    for (const trace of r.executionTrace) {
      const roleVotesDisplayType = trace.roleVotesType === 'null' ? 'null' : 'object';
      output += `${trace.quarter} │ ${trace.startingExecution.toFixed(0).padEnd(8)} │ ${roleVotesDisplayType.padEnd(14)} │ ${trace.alignmentDelta.toFixed(1).padStart(4)} │ ${trace.endingExecution.toFixed(0)}\n`;
    }
  }
  
  return output;
}

/**
 * Format cash ledgers for Balanced and Cash 100%
 */
function formatCashLedgers(results: DiagnosticResult[]): string {
  let output = '\nCASH LEDGER (Opening + Profit − Spend + Financing ± Other = Closing)\n';
  
  for (const r of results) {
    if (!r.cashLedger) continue;
    
    output += `\n${r.strategyName}:\n`;
    output += '─'.repeat(130) + '\n';
    output += 'Q | Opening | Profit | Spend | Financing | Other | Closing | Reconciliation\n';
    output += '─'.repeat(130) + '\n';
    
    for (const ledger of r.cashLedger) {
      const opening = `$${ledger.openingCash.toFixed(1)}M`.padEnd(10);
      const profit = `$${ledger.operatingProfit.toFixed(1)}M`.padEnd(8);
      const spend = `$${ledger.strategicSpend.toFixed(1)}M`.padEnd(7);
      const financing = `$${ledger.financing.toFixed(1)}M`.padEnd(10);
      const other = `$${ledger.otherAdjustment.toFixed(1)}M`.padEnd(7);
      const closing = `$${ledger.closingCash.toFixed(1)}M`.padEnd(9);
      const reconcile = `${ledger.reconciliation.toFixed(3)}`.padEnd(8);
      
      output += `${ledger.quarter} │ ${opening} │ ${profit} │ ${spend} │ ${financing} │ ${other} │ ${closing} │ ${reconcile}\n`;
    }
  }
  
  return output;
}

/**
 * Generate console-exportable structured data
 */
function generateConsoleExport(results: DiagnosticResult[]): string {
  const export_data = {
    timestamp: new Date().toISOString(),
    phase: '1B Diagnostic Suite',
    strategies: results.map(r => ({
      id: r.strategyId,
      name: r.strategyName,
      q8: {
        revenue: r.q8Revenue,
        cash: r.q8Cash,
        ebitda: r.q8EBITDA,
        ebitdaMargin: r.q8EBITDAMargin,
      },
      scores: {
        financial: r.financialScore,
        strategic: r.strategicScore,
        organizational: r.organizationalScore,
        total: r.totalScore,
        verdict: r.verdict,
      },
      financialComponents: {
        revenue: r.financialRevenuePoints,
        ebitda: r.financialEbitdaPoints,
        cash: r.financialCashPoints,
        other: r.financialOtherPoints,
      },
      executionQ8: r.executionTrace[7]?.endingExecution || null,
      cashLedger: r.cashLedger || null,
    })),
  };
  
  let output = '\n// CONSOLE EXPORT — Copy this entire block\n';
  output += 'const DIAGNOSTIC_RESULTS = ' + JSON.stringify(export_data, null, 2) + ';\n';
  output += 'console.table(DIAGNOSTIC_RESULTS.strategies);\n';
  output += '// END EXPORT\n';
  
  return output;
}
