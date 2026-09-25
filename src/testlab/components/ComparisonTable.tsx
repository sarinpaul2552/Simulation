import React from 'react';
import { StrategyTestRun } from '../utils/quarterRunner';
import '../testlab.css';

interface ComparisonTableProps {
  baseline: StrategyTestRun;
  competitors: StrategyTestRun[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ baseline, competitors }) => {
  const metrics = [
    { key: 'revenue', label: 'Q8 Revenue', format: (s: StrategyTestRun) => `$${s.finalState.revenue.toFixed(1)}M` },
    { key: 'cash', label: 'Q8 Cash', format: (s: StrategyTestRun) => `$${s.finalState.cash.toFixed(1)}M` },
    { key: 'stock', label: 'Q8 Stock', format: (s: StrategyTestRun) => `$${s.finalState.stockPrice.toFixed(2)}` },
    { key: 'quality', label: 'Product Quality', format: (s: StrategyTestRun) => s.finalState.productQuality.toFixed(0) },
    { key: 'culture', label: 'Culture', format: (s: StrategyTestRun) => s.finalState.culture.toFixed(0) },
    { key: 'trust', label: 'Trust', format: (s: StrategyTestRun) => s.finalState.trust.toFixed(0) },
    { key: 'exec', label: 'Execution', format: (s: StrategyTestRun) => s.finalState.capabilities.execution.toFixed(0) },
    { key: 'consumer', label: 'Consumer Cap', format: (s: StrategyTestRun) => s.finalState.capabilities.consumer.toFixed(0) },
    { key: 'enterprise', label: 'Enterprise Cap', format: (s: StrategyTestRun) => s.finalState.capabilities.enterprise.toFixed(0) },
    { key: 'ai', label: 'AI Cap', format: (s: StrategyTestRun) => s.finalState.capabilities.ai.toFixed(0) },
    { key: 'talent', label: 'Talent Cap', format: (s: StrategyTestRun) => s.finalState.capabilities.talent.toFixed(0) },
  ];

  const terminalMetrics = [
    { key: 'financial', label: 'Financial Score', format: (s: StrategyTestRun) => {
      const tr = s.quarters[7]?.consequence.terminalResult;
      return tr ? `${tr.financialScore.toFixed(1)}/33` : 'N/A';
    }},
    { key: 'strategic', label: 'Strategic Score', format: (s: StrategyTestRun) => {
      const tr = s.quarters[7]?.consequence.terminalResult;
      return tr ? `${tr.strategicScore.toFixed(1)}/33` : 'N/A';
    }},
    { key: 'org', label: 'Organizational Score', format: (s: StrategyTestRun) => {
      const tr = s.quarters[7]?.consequence.terminalResult;
      return tr ? `${tr.organizationalScore.toFixed(1)}/34` : 'N/A';
    }},
    { key: 'total', label: 'TOTAL SCORE', format: (s: StrategyTestRun) => {
      const tr = s.quarters[7]?.consequence.terminalResult;
      return tr ? `${tr.totalScore.toFixed(1)}/100` : 'N/A';
    }},
    { key: 'verdict', label: 'Verdict', format: (s: StrategyTestRun) => {
      const tr = s.quarters[7]?.consequence.terminalResult;
      return tr ? tr.verdict : 'N/A';
    }},
  ];

  // Helper to compute numeric value for delta calculation
  const getNumericValue = (s: StrategyTestRun, key: string): number => {
    switch (key) {
      case 'revenue': return s.finalState.revenue;
      case 'cash': return s.finalState.cash;
      case 'stock': return s.finalState.stockPrice;
      case 'quality': return s.finalState.productQuality;
      case 'culture': return s.finalState.culture;
      case 'trust': return s.finalState.trust;
      case 'exec': return s.finalState.capabilities.execution;
      case 'consumer': return s.finalState.capabilities.consumer;
      case 'enterprise': return s.finalState.capabilities.enterprise;
      case 'ai': return s.finalState.capabilities.ai;
      case 'talent': return s.finalState.capabilities.talent;
      case 'financial': return s.quarters[7]?.consequence.terminalResult?.financialScore || 0;
      case 'strategic': return s.quarters[7]?.consequence.terminalResult?.strategicScore || 0;
      case 'org': return s.quarters[7]?.consequence.terminalResult?.organizationalScore || 0;
      case 'total': return s.quarters[7]?.consequence.terminalResult?.totalScore || 0;
      default: return 0;
    }
  };

  const computeDelta = (key: string, competitor: StrategyTestRun): string => {
    const baseVal = getNumericValue(baseline, key);
    const compVal = getNumericValue(competitor, key);
    const delta = compVal - baseVal;

    if (delta === 0) return '—';
    if (key === 'verdict') return '—'; // Don't compute delta for verdict
    
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}`;
  };

  return (
    <div className="comparison-container">
      <h3>Strategy Comparison (vs. Balanced Baseline)</h3>
      
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th className="baseline-col">{baseline.strategyName}</th>
            {competitors.map((comp) => (
              <th key={comp.strategyId} className="competitor-col">
                {comp.strategyName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Standard Metrics */}
          {metrics.map((metric) => (
            <tr key={metric.key}>
              <td className="metric-label">{metric.label}</td>
              <td className="baseline-col">{metric.format(baseline)}</td>
              {competitors.map((comp) => (
                <td key={comp.strategyId} className="competitor-col">
                  <span className="metric-value">{metric.format(comp)}</span>
                  <span className="metric-delta">
                    {computeDelta(metric.key, comp)}
                  </span>
                </td>
              ))}
            </tr>
          ))}

          {/* Terminal Metrics (Q8 only) */}
          <tr className="section-divider">
            <td colSpan={2 + competitors.length}>Terminal Outcome (Q8)</td>
          </tr>
          {terminalMetrics.map((metric) => (
            <tr key={metric.key}>
              <td className="metric-label">{metric.label}</td>
              <td className="baseline-col">{metric.format(baseline)}</td>
              {competitors.map((comp) => (
                <td key={comp.strategyId} className="competitor-col">
                  <span className="metric-value">{metric.format(comp)}</span>
                  {metric.key !== 'verdict' && (
                    <span className="metric-delta">
                      {computeDelta(metric.key, comp)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Warnings */}
      <div className="comparison-warnings">
        <h4>⚠️  Known Limitations</h4>
        <ul>
          <li>Q4 destination selected in gameplay but not received by engine (design gap)</li>
          <li>Comparison assumes identical starting state (Q1 baseline) for all strategies</li>
          <li>Negative cash flagged but not failed (insolvency mechanics not yet implemented)</li>
        </ul>
      </div>
    </div>
  );
};
