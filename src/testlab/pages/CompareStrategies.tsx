import React, { useState } from 'react';
import { useEngineTest } from '../hooks/useEngineTest';
import { ComparisonTable } from '../components/ComparisonTable';
import { presetCombinations } from '../utils/testPresets';
import { StrategyTestRun } from '../utils/quarterRunner';
import '../testlab.css';

export const CompareStrategies: React.FC = () => {
  const { testState, testCompareStrategies } = useEngineTest();
  const [selectedPresets, setSelectedPresets] = useState<string[]>([
    'balanced-aligned',
    'consumer-60-aligned',
    'enterprise-60-aligned',
  ]);
  const [results, setResults] = useState<StrategyTestRun[] | null>(null);

  const handleTogglePreset = (presetId: string) => {
    setSelectedPresets((prev) => {
      if (prev.includes(presetId)) {
        return prev.filter((p) => p !== presetId);
      } else {
        return [...prev, presetId];
      }
    });
  };

  const handleRun = async () => {
    // Baseline is always Balanced
    const baselineId = 'balanced-aligned';
    const idsToRun = selectedPresets.includes(baselineId)
      ? selectedPresets
      : [baselineId, ...selectedPresets];

    const res = await testCompareStrategies(idsToRun);
    if (res && res.length > 0) {
      setResults(res);
    }
  };

  const allPresets = [...presetCombinations.normal, ...presetCombinations.pathological];
  const baseline = results?.find((r) => r.strategyId === 'balanced-aligned');
  const competitors = results?.filter((r) => r.strategyId !== 'balanced-aligned') || [];

  return (
    <div className="testlab-form">
      <h2>Mode 3: Compare Strategies</h2>
      <p>Run multiple strategies from identical starting state and compare terminal outcomes.</p>

      <div className="testlab-warning">
        <strong>⚠️  Design Gap:</strong> All strategies tested with generic Q4 consequence (destination not parametrized in engine).
      </div>

      <div className="form-group">
        <label>Select Strategies to Compare (Balanced always included as baseline)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px', marginTop: '10px' }}>
          {allPresets.map((preset) => (
            <label key={preset.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={selectedPresets.includes(preset.id)}
                onChange={() => handleTogglePreset(preset.id)}
                disabled={preset.id === 'balanced-aligned'}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '13px' }}>
                <strong>{preset.name}</strong>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleRun}
          disabled={testState.isRunning || selectedPresets.length === 0}
        >
          {testState.isRunning ? 'Running...' : `Compare ${selectedPresets.length + 1} Strategies`}
        </button>
      </div>

      {testState.progress > 0 && testState.progress < 100 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${testState.progress}%` }}></div>
        </div>
      )}

      {testState.error && (
        <div className="error-message">⚠️  {testState.error}</div>
      )}

      {results && baseline && (
        <div style={{ marginTop: '30px' }}>
          <ComparisonTable baseline={baseline} competitors={competitors} />

          {/* Warnings */}
          <div style={{ marginTop: '20px', padding: '12px', background: '#fff8e1', borderRadius: '4px' }}>
            <strong>⚠️  Notes:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px' }}>
              <li>Comparison shows "baseline + delta" for each competitor relative to Balanced</li>
              <li>Negative cash flagged but not failed (insolvency mechanics not yet implemented)</li>
              <li>Any invariant failures in the strategies shown in their full test runs</li>
              <li>Verdict assessment uses terminalResult from Q8 consequence (no recalculation)</li>
            </ul>
          </div>

          {/* Invariant Summary */}
          <div style={{ marginTop: '20px' }}>
            <h4>Invariant Status</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {results.map((run) => {
                const failedChecks = run.quarters.reduce(
                  (sum, q) => sum + q.invariants.checks.filter((c) => !c.passed && c.severity === 'error').length,
                  0
                );
                return (
                  <div
                    key={run.strategyId}
                    style={{
                      padding: '12px',
                      background: failedChecks > 0 ? '#fee' : '#efe',
                      border: `1px solid ${failedChecks > 0 ? '#fcc' : '#cfc'}`,
                      borderRadius: '4px',
                    }}
                  >
                    <strong>{run.strategyName}</strong>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {failedChecks === 0 ? '✅ All checks passed' : `🚨 ${failedChecks} errors across 8 quarters`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
