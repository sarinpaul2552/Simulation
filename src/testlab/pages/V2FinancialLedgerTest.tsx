import React, { useState } from 'react';
import { allocationStrategies } from '../utils/testPresets';
import {
  runAllV2Scenarios,
  runV2Strategy,
  V2QuarterRecord,
  V2ScenarioResult,
  V2StrategyRun,
  V2OperatingMode,
  V2_OPERATING_MODES,
} from '../utils/v2Diagnostics';
import '../testlab.css';

const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toFixed(1)}M`;

const cashStyle = (n: number): React.CSSProperties =>
  n < 0 ? { color: '#c62828', fontWeight: 700 } : {};

/** Per-quarter ledger table: every component separately auditable + identity check. */
const LedgerTable: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Q</th>
          <th>Opening Cash</th>
          <th>Revenue</th>
          <th>Operating Cost</th>
          <th>Operating Profit</th>
          <th>− Strategic Investment</th>
          <th>(Reserve memo)</th>
          <th>− Event Costs</th>
          <th>+ Financing</th>
          <th>= Closing Cash</th>
          <th>Identity</th>
          <th>Flags</th>
        </tr>
      </thead>
      <tbody>
        {quarters.map(rec => {
          const L = rec.consequence.ledger;
          const failed = rec.checks.filter(c => !c.passed);
          return (
            <tr key={rec.quarter} style={L.closingCash < 0 ? { background: '#fff3f3' } : undefined}>
              <td>Q{L.quarter}</td>
              <td style={cashStyle(L.openingCash)}>{money(L.openingCash)}</td>
              <td>
                {money(L.revenue)}
                {L.operatingInputsSource === 'injected' && <span title="Injected test input"> ⓘ</span>}
              </td>
              <td>{money(L.operatingCost)}</td>
              <td style={cashStyle(L.operatingProfit)}>{money(L.operatingProfit)}</td>
              <td title={Object.entries(L.strategicInvestmentByBucket).map(([k, v]) => `${k}: ${v.toFixed(1)}`).join('\n')}>
                {money(L.strategicInvestment)}
              </td>
              <td style={{ color: '#777' }}>{money(L.cashReserveRetained)}</td>
              <td title={L.eventCostItems.map(e => `${e.id}: ${e.amount}`).join('\n')}>{money(L.eventCosts)}</td>
              <td>{money(L.financing)}</td>
              <td style={cashStyle(L.closingCash)}>{money(L.closingCash)}</td>
              <td title={failed.map(c => `${c.id}: ${c.details}`).join('\n')}>
                {rec.passed ? '✅' : `🚨 ${failed.length}`}
              </td>
              <td style={{ fontSize: '11px' }}>{rec.consequence.flags.join(', ')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const QuarterCheckDetails: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: '8px' }}>
      <button className="btn btn-secondary" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} per-quarter ledger checks
      </button>
      {open && quarters.map(rec => (
        <div key={rec.quarter} className="audit-section">
          <h4>Q{rec.quarter} ledger checks</h4>
          <ul>
            {rec.checks.map(c => (
              <li key={c.id}>
                {c.passed ? '✅' : '🚨'} <strong>{c.message}</strong>
                {c.details && <div className="audit-details-text">{c.details}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export const V2FinancialLedgerTest: React.FC = () => {
  const [scenarioResults, setScenarioResults] = useState<V2ScenarioResult[] | null>(null);
  const [strategyId, setStrategyId] = useState('balanced');
  const [opMode, setOpMode] = useState<V2OperatingMode>('carried-forward');
  const [run, setRun] = useState<V2StrategyRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScenarios = () => {
    try {
      setError(null);
      setScenarioResults(runAllV2Scenarios());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runStrategy = () => {
    try {
      setError(null);
      setRun(runV2Strategy(allocationStrategies[strategyId], opMode));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const allPassed = scenarioResults?.every(r => r.passed);

  return (
    <div className="testlab-form">
      <h2>Mode 5: V2 Financial Ledger (Phase 2A)</h2>
      <p>
        V2 accounting core, running in parallel to the frozen V1 engine. Every quarter exposes its full ledger and
        re-checks the identity:
      </p>
      <pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
{`Operating Profit = Revenue − Operating Costs
Closing Cash     = Opening Cash + Operating Profit − Strategic Investment − Event Costs + Financing`}
      </pre>
      <div className="testlab-warning">
        <strong>Phase 2A scope:</strong> ledger and state only. Revenue/opex are carried forward (or injected by a
        test). There are no capability or revenue effects, no financing choices (financing = $0), no Q1–Q8 event
        rebalance, no scoring and no Q4 destination effects. Negative cash is shown in red and is never floored.
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      <h3 style={{ marginTop: '24px' }}>A. Deterministic accounting scenarios</h3>
      <div className="button-group">
        <button className="btn btn-primary" onClick={runScenarios}>Run all scenarios</button>
      </div>
      {scenarioResults && (
        <>
          <div className={allPassed ? 'success-message' : 'error-message'}>
            {allPassed ? '✅' : '🚨'} {scenarioResults.filter(r => r.passed).length}/{scenarioResults.length} scenarios passed
          </div>
          {scenarioResults.map(r => (
            <div key={r.scenario.id} className="audit-card" style={{ padding: '12px' }}>
              <h4>{r.passed ? '✅' : '🚨'} {r.scenario.name}</h4>
              <p style={{ fontSize: '13px' }}>{r.scenario.description}</p>
              <LedgerTable quarters={r.quarters} />
              {r.expectationChecks.flat().filter(c => !c.passed).map((c, i) => (
                <div key={i} className="error-message">{c.message}: {c.details}</div>
              ))}
              <QuarterCheckDetails quarters={r.quarters} />
            </div>
          ))}
        </>
      )}

      <h3 style={{ marginTop: '30px' }}>B. Q1→Q8 strategy run on the V2 ledger</h3>
      <div className="form-group">
        <label>Allocation preset (mapped to the six V2 buckets)</label>
        <select value={strategyId} onChange={e => setStrategyId(e.target.value)}>
          {Object.values(allocationStrategies).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Operating inputs</label>
        <select value={opMode} onChange={e => setOpMode(e.target.value as V2OperatingMode)}>
          {(Object.keys(V2_OPERATING_MODES) as V2OperatingMode[]).map(m => (
            <option key={m} value={m}>{V2_OPERATING_MODES[m].label}</option>
          ))}
        </select>
      </div>
      <div className="button-group">
        <button className="btn btn-primary" onClick={runStrategy}>Run Q1→Q8</button>
      </div>
      {run && (
        <div style={{ marginTop: '16px' }}>
          <div className={run.passed ? 'success-message' : 'error-message'}>
            {run.passed ? '✅ Accounting identity held in all 8 quarters' : '🚨 Ledger check failures, see table'}
            {' · '}Final cash: <span style={cashStyle(run.finalState.cash)}>{money(run.finalState.cash)}</span>
          </div>
          {run.notes.length > 0 && (
            <div className="testlab-warning">
              <strong>Preset note:</strong>
              <ul>{run.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
          <LedgerTable quarters={run.quarters} />
          <QuarterCheckDetails quarters={run.quarters} />
        </div>
      )}
    </div>
  );
};

export default V2FinancialLedgerTest;
