import React, { useState } from 'react';
import { SingleQuarterTest } from './pages/SingleQuarterTest';
import { FullStrategyTest } from './pages/FullStrategyTest';
import { CompareStrategies } from './pages/CompareStrategies';
import './testlab.css';

type TestMode = 'mode-select' | 'single-quarter' | 'full-strategy' | 'compare-strategies';

export const TestLab: React.FC = () => {
  const [mode, setMode] = useState<TestMode>('mode-select');

  const handleModeSelect = (selectedMode: TestMode) => {
    setMode(selectedMode);
  };

  return (
    <div className="testlab-container">
      <div className="testlab-header">
        <h1>🔬 Engine Test Lab</h1>
        <p>Behavioral and economic testing of the simulation engine</p>
        <p style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>
          ⚠️ Developer-only tool. All tests use production engine functions without duplication. No database writes.
        </p>
      </div>

      {mode === 'mode-select' && (
        <div className="mode-selector">
          <div
            className="mode-button"
            onClick={() => handleModeSelect('single-quarter')}
            style={{ cursor: 'pointer' }}
          >
            <h3>📊 Mode 1</h3>
            <p>Single Quarter Test</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Isolate one quarter with custom allocation and behavior
            </p>
          </div>

          <div
            className="mode-button"
            onClick={() => handleModeSelect('full-strategy')}
            style={{ cursor: 'pointer' }}
          >
            <h3>🎮 Mode 2</h3>
            <p>Full Strategy Test</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Run Q1→Q8 automatically with a preset strategy
            </p>
          </div>

          <div
            className="mode-button"
            onClick={() => handleModeSelect('compare-strategies')}
            style={{ cursor: 'pointer' }}
          >
            <h3>📈 Mode 3</h3>
            <p>Compare Strategies</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Run multiple strategies and compare terminal outcomes
            </p>
          </div>
        </div>
      )}

      {mode === 'single-quarter' && (
        <>
          <button className="btn btn-secondary" onClick={() => handleModeSelect('mode-select')}>
            ← Back to Mode Select
          </button>
          <SingleQuarterTest />
        </>
      )}

      {mode === 'full-strategy' && (
        <>
          <button className="btn btn-secondary" onClick={() => handleModeSelect('mode-select')}>
            ← Back to Mode Select
          </button>
          <FullStrategyTest />
        </>
      )}

      {mode === 'compare-strategies' && (
        <>
          <button className="btn btn-secondary" onClick={() => handleModeSelect('mode-select')}>
            ← Back to Mode Select
          </button>
          <CompareStrategies />
        </>
      )}
    </div>
  );
};

export default TestLab;
