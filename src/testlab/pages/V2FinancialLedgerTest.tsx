import React, { useState } from 'react';
import { allocationStrategies } from '../utils/testPresets';
import {
  runAllV2Scenarios,
  runAllV2CapabilityScenarios,
  V2CapabilityScenarioResult,
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

// ============ PHASE 2B: CAPABILITY PIPELINE ============

const n2 = (n: number) => (Math.abs(n) < 1e-9 ? '0' : n.toFixed(2));
const BUCKET_LABEL: Record<string, string> = {
  consumer: 'Consumer', enterprise: 'Enterprise', aiProduct: 'AI & Product', people: 'People', universityCredentials: 'University & Cred.',
};
const TARGET_LABEL: Record<string, string> = {
  consumer: 'Consumer Cap', enterprise: 'Enterprise Cap', ai: 'AI Cap', talent: 'Talent', credential: 'Credential Cap',
  organizationalCapacity: 'Org Capacity', productQuality: 'Product Quality', trust: 'Trust',
};

/** Cross-quarter overview: load → capacity → absorption → closing capabilities. */
const CapabilityOverview: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => (
  <div style={{ overflowX: 'auto', marginTop: '12px' }}>
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Q</th><th>Active initiatives</th><th>Bucket load</th><th>Coordination load</th><th>Total load</th><th>Opening Org Cap</th><th>Load / Cap</th><th>Absorption</th>
          <th>Consumer</th><th>Enterprise</th><th>AI</th><th>Talent</th><th>Credential</th><th>Org Cap</th><th>PQ</th><th>Trust</th>
          <th>Pending cohorts</th><th>Cap. checks</th>
        </tr>
      </thead>
      <tbody>
        {quarters.map(rec => {
          const C = rec.consequence.capability;
          const e = rec.ending;
          const capFailed = rec.checks.filter(c => c.id.startsWith('cap_') && !c.passed);
          return (
            <tr key={rec.quarter} style={C.absorptionFactor < 1 ? { background: '#fff8e1' } : undefined}>
              <td>Q{rec.quarter}</td>
              <td>{C.activeInitiatives.length}</td>
              <td>{n2(C.bucketLoad)}</td>
              <td>{n2(C.coordinationLoad)}</td>
              <td><strong>{n2(C.transformationLoad)}</strong></td>
              <td>{n2(C.openingOrganizationalCapacity)}</td>
              <td>{(C.loadToCapacityRatio * 100).toFixed(1)}%</td>
              <td style={C.absorptionFactor < 1 ? { color: '#b26a00', fontWeight: 700 } : {}}>{(C.absorptionFactor * 100).toFixed(1)}%</td>
              <td>{n2(e.capabilities.consumer)}</td><td>{n2(e.capabilities.enterprise)}</td><td>{n2(e.capabilities.ai)}</td>
              <td>{n2(e.capabilities.talent)}</td><td>{n2(e.capabilities.credential)}</td><td>{n2(e.organizationalCapacity)}</td>
              <td>{n2(e.productQuality)}</td><td>{n2(e.trust)}</td>
              <td>{e.pendingCohorts.length}</td>
              <td title={capFailed.map(c => `${c.id}: ${c.details}`).join('\n')}>{capFailed.length === 0 ? '✅' : `🚨 ${capFailed.length}`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

/** Per-quarter detail: allocation → nominal → load → capacity → absorption → effective → matured → pending → closing. */
const CapabilityQuarterDetail: React.FC<{ rec: V2QuarterRecord }> = ({ rec }) => {
  const C = rec.consequence.capability;
  return (
    <div className="audit-section">
      <h4>
        Q{rec.quarter} capability pipeline · Load {n2(C.bucketLoad)} bucket + {n2(C.coordinationLoad)} coordination ({C.activeInitiatives.length} active)
        {' '}= {n2(C.transformationLoad)} ÷ Org Capacity {n2(C.openingOrganizationalCapacity)} ={' '}
        {(C.loadToCapacityRatio * 100).toFixed(1)}% → absorption {(C.absorptionFactor * 100).toFixed(2)}%
        {rec.consequence.capabilityFlags.length > 0 && <span style={{ fontSize: '11px' }}> · {rec.consequence.capabilityFlags.join(', ')}</span>}
      </h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="comparison-table">
          <thead><tr><th>Bucket</th><th>Allocation</th><th>Active initiative (≥$2M)</th><th>Bucket load</th><th>Nominal capability gain (uncapped)</th></tr></thead>
          <tbody>
            {C.buckets.map(b => (
              <tr key={b.bucket}>
                <td>{BUCKET_LABEL[b.bucket]}</td>
                <td>{money(b.amount)}</td>
                <td>{C.activeInitiatives.includes(b.bucket) ? 'yes' : 'no'}</td>
                <td>{n2(b.transformationLoad)}</td>
                <td>{b.nominalGains.map(g => `${TARGET_LABEL[g.target]} +${n2(g.nominalGain)}`).join(' · ')}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3}><em>Coordination load ({C.activeInitiatives.length} active initiatives)</em></td>
              <td>{n2(C.coordinationLoad)}</td><td>—</td>
            </tr>
            <tr>
              <td>Cash Reserve</td><td>{money(rec.allocation.cashReserve)}</td><td>never</td><td>0</td><td>none (unspent liquidity)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ overflowX: 'auto', marginTop: '8px' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Target</th><th>Opening</th><th>Nominal new</th><th>Effective new</th><th>Absorption loss</th>
              <th>Matured this Q</th><th>Realized</th><th>Wasted (cap 100)</th><th>Pending after</th><th>Closing</th>
            </tr>
          </thead>
          <tbody>
            {C.targets.map(t => (
              <tr key={t.target}>
                <td>{TARGET_LABEL[t.target]}</td>
                <td>{n2(t.opening)}</td>
                <td>{n2(t.nominalNew)}</td>
                <td>{n2(t.effectiveNew)}</td>
                <td style={t.absorptionLoss > 1e-9 ? { color: '#b26a00' } : {}}>{n2(t.absorptionLoss)}</td>
                <td>{n2(t.maturedThisQuarter)}</td>
                <td>{n2(t.realized)}</td>
                <td style={t.wastedSaturation > 1e-9 ? { color: '#c62828', fontWeight: 700 } : {}}>{n2(t.wastedSaturation)}</td>
                <td>{n2(t.pendingAfter)}</td>
                <td><strong>{n2(t.closing)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(C.pendingCohortsAfter.length > 0 || C.completedCohorts.length > 0) && (
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table className="comparison-table">
            <thead>
              <tr><th>Cohort</th><th>Invested</th><th>Amount</th><th>Absorption</th><th>Schedule</th><th>Gains: matured this Q / to date / remaining (of effective)</th><th>Status</th></tr>
            </thead>
            <tbody>
              {[...C.completedCohorts.map(c => ({ c, done: true })), ...C.pendingCohortsAfter.map(c => ({ c, done: false }))].map(({ c, done }) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>Q{c.quarterInvested}</td>
                  <td>{money(c.amount)}</td>
                  <td>{(c.absorptionFactor * 100).toFixed(1)}%</td>
                  <td>{c.maturationSchedule.map(x => `${Math.round(x * 100)}%`).join(' / ')}</td>
                  <td style={{ fontSize: '12px' }}>
                    {c.gains.map(g => `${TARGET_LABEL[g.target]}: ${n2(g.maturedThisQuarter)} / ${n2(g.maturedToDate)} / ${n2(g.remaining)} (of ${n2(g.effectiveGain)})`).join(' · ')}
                  </td>
                  <td>{done ? 'fully matured' : 'maturing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const CapabilityPipeline: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: '12px' }}>
      <h4 style={{ marginBottom: 0 }}>Capability consequence (Phase 2B)</h4>
      <CapabilityOverview quarters={quarters} />
      <button className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} per-quarter capability pipeline
      </button>
      {open && quarters.map(rec => <CapabilityQuarterDetail key={rec.quarter} rec={rec} />)}
    </div>
  );
};

export const V2FinancialLedgerTest: React.FC = () => {
  const [scenarioResults, setScenarioResults] = useState<V2ScenarioResult[] | null>(null);
  const [strategyId, setStrategyId] = useState('balanced');
  const [opMode, setOpMode] = useState<V2OperatingMode>('carried-forward');
  const [run, setRun] = useState<V2StrategyRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capResults, setCapResults] = useState<V2CapabilityScenarioResult[] | null>(null);

  const runCapabilityScenarios = () => {
    try {
      setError(null);
      setCapResults(runAllV2CapabilityScenarios());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

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
      <h2>Mode 5: V2 Engine: Financial Ledger (2A) + Capability Pipeline (2B)</h2>
      <p>
        V2 accounting core, running in parallel to the frozen V1 engine. Every quarter exposes its full ledger and
        re-checks the identity:
      </p>
      <pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
{`Operating Profit = Revenue − Operating Costs
Closing Cash     = Opening Cash + Operating Profit − Strategic Investment − Event Costs + Financing`}
      </pre>
      <div className="testlab-warning">
        <strong>Scope (Phase 2A + 2B):</strong> financial ledger plus the capability and investment pipeline. Revenue and
        operating cost are still carried forward (or injected by a test): capability gains have <em>no</em> revenue
        effect yet. There are no financing choices (financing = $0), no Q1–Q8 event rebalance, no scoring and no Q4
        destination effects. Negative cash is shown in red and is never floored.
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
            {run.passed ? '✅ Accounting identity and capability checks held in all 8 quarters' : '🚨 Check failures, see tables'}
            {' · '}Final cash: <span style={cashStyle(run.finalState.cash)}>{money(run.finalState.cash)}</span>
          </div>
          {run.notes.length > 0 && (
            <div className="testlab-warning">
              <strong>Preset note:</strong>
              <ul>{run.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
          <h4 style={{ marginBottom: 0 }}>Financial consequence (Phase 2A)</h4>
          <LedgerTable quarters={run.quarters} />
          <CapabilityPipeline quarters={run.quarters} />
          <QuarterCheckDetails quarters={run.quarters} />
        </div>
      )}

      <h3 style={{ marginTop: '30px' }}>C. Capability pipeline scenarios (Phase 2B)</h3>
      <p style={{ fontSize: '13px' }}>
        Maturation, Org Capacity growth, absorption under legal $30M allocations (initiative breadth vs Org Capacity 60/75) and saturation at 100.
        No revenue effects exist yet: capability gains do not change revenue, costs or cash.
      </p>
      <div className="button-group">
        <button className="btn btn-primary" onClick={runCapabilityScenarios}>Run capability scenarios</button>
      </div>
      {capResults && capResults.map(r => (
        <div key={r.scenario.id} className="audit-card" style={{ padding: '12px' }}>
          <h4>{r.passed ? '✅' : '🚨'} {r.scenario.name}</h4>
          <p style={{ fontSize: '13px' }}>{r.scenario.description}</p>
          <CapabilityPipeline quarters={r.quarters} />
          <QuarterCheckDetails quarters={r.quarters} />
        </div>
      ))}
    </div>
  );
};

export default V2FinancialLedgerTest;
