import React, { useState } from 'react';
import { useEngineTest } from '../hooks/useEngineTest';
import { EngineAuditCard } from '../components/EngineAuditCard';
import { presetCombinations } from '../utils/testPresets';
import { StrategyTestRun } from '../utils/quarterRunner';
import '../testlab.css';

export const FullStrategyTest: React.FC = () => {
  const { testState, testFullStrategy } = useEngineTest();
  const [selectedPreset, setSelectedPreset] = useState(presetCombinations.normal[0].id);
  const [result, setResult] = useState<StrategyTestRun | null>(null);

  const handleRun = async () => {
    const res = await testFullStrategy(selectedPreset);
    if (res) {
      setResult(res);
    }
  };

  return (
    <div className="testlab-form">
      <h2>Mode 2: Full Strategy Test (Q1→Q8)</h2>
      <p>Run an automated full-game scenario Q1 through Q8 using a preset strategy.</p>

      <div className="testlab-warning">
        <strong>⚠️  Design Gap:</strong> Q4 destination selected in gameplay but not received by engine consequence. Q5–Q8 results do not vary by Q4 destination.
      </div>

      <div className="form-group">
        <label>Strategy Preset</label>
        <select value={selectedPreset} onChange={(e) => setSelectedPreset(e.target.value)}>
          <optgroup label="Normal Presets (60% focused)">
            {presetCombinations.normal.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Pathological Tests (100% concentrated)">
            {presetCombinations.pathological.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleRun}
          disabled={testState.isRunning}
        >
          {testState.isRunning ? 'Running...' : 'Run Full Test'}
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
          <h3>Strategy: {result.strategyName}</h3>
          {!result.passed && (
            <div className="error-message">
              🚨 This strategy failed invariant checks. See details below.
            </div>
          )}

          {/* Summary Stats */}
          <div className="testlab-form" style={{ marginTop: '20px' }}>
            <h4>Final State Summary (Q8)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div>
                <strong>Revenue:</strong>
                <div>${result.finalState.revenue.toFixed(1)}M</div>
              </div>
              <div>
                <strong>Cash:</strong>
                <div>${result.finalState.cash.toFixed(1)}M</div>
              </div>
              <div>
                <strong>Stock:</strong>
                <div>${result.finalState.stockPrice.toFixed(2)}</div>
              </div>
              <div>
                <strong>Product Quality:</strong>
                <div>{result.finalState.productQuality.toFixed(0)}</div>
              </div>
              <div>
                <strong>Culture:</strong>
                <div>{result.finalState.culture.toFixed(0)}</div>
              </div>
              <div>
                <strong>Trust:</strong>
                <div>{result.finalState.trust.toFixed(0)}</div>
              </div>
              <div>
                <strong>Consumer Cap:</strong>
                <div>{result.finalState.capabilities.consumer.toFixed(0)}</div>
              </div>
              <div>
                <strong>Enterprise Cap:</strong>
                <div>{result.finalState.capabilities.enterprise.toFixed(0)}</div>
              </div>
              <div>
                <strong>AI Cap:</strong>
                <div>{result.finalState.capabilities.ai.toFixed(0)}</div>
              </div>
              <div>
                <strong>Talent Cap:</strong>
                <div>{result.finalState.capabilities.talent.toFixed(0)}</div>
              </div>
            </div>

            {result.quarters[7]?.consequence.terminalResult && (
              <div style={{ marginTop: '20px', padding: '12px', background: '#f0f7ff', borderRadius: '4px' }}>
                <strong>Terminal Outcome:</strong>
                <div>
                  Financial: {result.quarters[7].consequence.terminalResult.financialScore.toFixed(1)}/33
                </div>
                <div>
                  Strategic: {result.quarters[7].consequence.terminalResult.strategicScore.toFixed(1)}/33
                </div>
                <div>
                  Organizational: {result.quarters[7].consequence.terminalResult.organizationalScore.toFixed(1)}/34
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}>
                  TOTAL: {result.quarters[7].consequence.terminalResult.totalScore.toFixed(1)}/100
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#667eea' }}>
                  Verdict: {result.quarters[7].consequence.terminalResult.verdict}
                </div>
              </div>
            )}
          </div>

          {/* Quarter-by-quarter audit trail */}
          <div style={{ marginTop: '30px' }}>
            <h4>Quarter-by-Quarter Audit Trail</h4>
            {result.quarters.map((qr) => (
              <EngineAuditCard key={qr.quarter} quarterResult={qr} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
