import React, { useState } from 'react';
import { useEngineTest } from '../hooks/useEngineTest';
import { EngineAuditCard } from '../components/EngineAuditCard';
import { allocationStrategies, behaviorStrategies } from '../utils/testPresets';
import { QuarterResult } from '../utils/quarterRunner';
import '../testlab.css';

export const SingleQuarterTest: React.FC = () => {
  const { testState, testSingleQuarter } = useEngineTest();
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [selectedAllocation, setSelectedAllocation] = useState('balanced');
  const [selectedBehavior, setSelectedBehavior] = useState('stay-course');
  const [result, setResult] = useState<QuarterResult | null>(null);

  const handleRun = async () => {
    const res = await testSingleQuarter(selectedQuarter, selectedAllocation, selectedBehavior);
    if (res) {
      setResult(res);
    }
  };

  const allocStrats = Object.values(allocationStrategies);
  const behavStrats = Object.values(behaviorStrategies);

  return (
    <div className="testlab-form">
      <h2>Mode 1: Single Quarter Test</h2>
      <p>Test a single quarter in isolation with your choice of allocation and behavioral strategy.</p>

      <div className="form-group">
        <label>Quarter</label>
        <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((q) => (
            <option key={q} value={q}>
              Q{q}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Allocation Strategy</label>
        <select value={selectedAllocation} onChange={(e) => setSelectedAllocation(e.target.value)}>
          {allocStrats.map((strat) => (
            <option key={strat.id} value={strat.id}>
              {strat.name} — {strat.description}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Behavior Strategy</label>
        <select value={selectedBehavior} onChange={(e) => setSelectedBehavior(e.target.value)}>
          {behavStrats.map((strat) => (
            <option key={strat.id} value={strat.id}>
              {strat.name} — {strat.description}
            </option>
          ))}
        </select>
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleRun}
          disabled={testState.isRunning}
        >
          {testState.isRunning ? 'Running...' : 'Run Consequence'}
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

      {result && (
        <div style={{ marginTop: '30px' }}>
          <h3>Audit Trail</h3>
          <EngineAuditCard quarterResult={result} />
        </div>
      )}
    </div>
  );
};
