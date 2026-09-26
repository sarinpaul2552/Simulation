import React, { useState } from 'react';
import { allocationStrategies } from '../utils/testPresets';
import { runV2StressAudit, V2StressResult } from '../utils/v2StressAudit';
import { runAllArcStrategies, V2ArcRun } from '../utils/v2ScenarioArc';
import { V2_SCENARIO_ARC, lastAuthoredQuarter } from '../../simulation/engineV2Scenario';
import {
  runAllV2Scenarios,
  runAllV2CapabilityScenarios,
  V2CapabilityScenarioResult,
  runAllV2CommercialScenarios,
  V2CommercialScenarioResult,
  runAllV2RevenueScenarios,
  runAllV2IntegratedScenarios,
  V2RevenueRunResult,
  V2RevenueMarketCase,
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
  consumer: 'Consumer Cap', enterprise: 'Enterprise Cap', customerSuccess: 'Customer Success', ai: 'AI Cap', talent: 'Talent', credential: 'Credential Cap',
  organizationalCapacity: 'Org Capacity', productQuality: 'Product Quality', trust: 'Trust',
};

/** Cross-quarter overview: load → capacity → absorption → closing capabilities. */
const CapabilityOverview: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => (
  <div style={{ overflowX: 'auto', marginTop: '12px' }}>
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Q</th><th>Active initiatives</th><th>Bucket load</th><th>Coordination load</th><th>Total load</th><th>Opening Org Cap</th><th>Load / Cap</th><th>Absorption</th>
          <th>Consumer</th><th>Enterprise</th><th>CS</th><th>AI</th><th>Talent</th><th>Credential</th><th>Org Cap</th><th>PQ</th><th>Trust</th>
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
              <td>{n2(e.capabilities.consumer)}</td><td>{n2(e.capabilities.enterprise)}</td><td>{n2(e.capabilities.customerSuccess)}</td><td>{n2(e.capabilities.ai)}</td>
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

// ============ PHASE 2C: COMMERCIAL INDICATORS ============

const IND_LABEL: Record<string, string> = {
  consumerRetention: 'Consumer Retention %', consumerCacIndex: 'Consumer CAC Index', enterprisePipeline: 'Enterprise Pipeline $M',
  enterpriseWinRate: 'Enterprise Win Rate %', aiCommercialReadiness: 'AI Commercial Readiness', aiAdoptionIndex: 'AI Adoption Index',
  universityPipeline: 'University Pipeline $M', universityRenewalRate: 'University Renewal %', pricingPower: 'Pricing Power',
};
const sgn = (n: number) => (Math.abs(n) < 5e-4 ? '0' : `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(3)}`);
const bnd = (b: readonly [number, number]) => `${b[0]}–${Number.isFinite(b[1]) ? b[1] : '∞'}`;

const CommercialOverview: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => (
  <div style={{ overflowX: 'auto', marginTop: '12px' }}>
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Q</th><th>Retention %</th><th>CAC</th><th>Ent. Pipeline</th><th>Win %</th><th>AI Readiness</th>
          <th>AI Adoption</th><th>Univ. Pipeline</th><th>Renewal %</th><th>Pricing</th><th>Clipped</th><th>Comm. checks</th>
        </tr>
      </thead>
      <tbody>
        {quarters.map(rec => {
          const c = rec.ending.commercial;
          const M = rec.consequence.commercial;
          const failed = rec.checks.filter(x => x.id.startsWith('com_') && !x.passed);
          return (
            <tr key={rec.quarter}>
              <td>Q{rec.quarter}</td>
              <td>{c.consumerRetention.toFixed(2)}</td>
              <td>{c.consumerCacIndex.toFixed(1)}</td>
              <td>{money(c.enterprisePipeline)}</td>
              <td>{c.enterpriseWinRate.toFixed(2)}</td>
              <td title={M.aiReadiness.band}>{c.aiCommercialReadiness.toFixed(1)} <span style={{ fontSize: '10px', color: '#777' }}>({M.aiReadiness.band})</span></td>
              <td>{c.aiAdoptionIndex.toFixed(1)}</td>
              <td>{money(c.universityPipeline)}</td>
              <td>{c.universityRenewalRate.toFixed(2)}</td>
              <td>{c.pricingPower.toFixed(1)}</td>
              <td style={{ fontSize: '11px', color: rec.consequence.commercialFlags.length ? '#c62828' : undefined }}>
                {rec.consequence.commercialFlags.map(f => f.replace('CLIPPED_', '')).join(', ') || '—'}
              </td>
              <td title={failed.map(x => `${x.id}: ${x.details}`).join('\n')}>{failed.length === 0 ? '✅' : `🚨 ${failed.length}`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const CommercialQuarterDetail: React.FC<{ rec: V2QuarterRecord }> = ({ rec }) => {
  const M = rec.consequence.commercial;
  const r = M.aiReadiness;
  return (
    <div className="audit-section">
      <h4>Q{rec.quarter} commercial indicators: why each metric moved</h4>
      <div style={{ fontSize: '12px', marginBottom: '6px' }}>
        Relative capability vs competitor benchmark: Consumer {sgn(M.relativeCapability.consumer)} · Enterprise{' '}
        {sgn(M.relativeCapability.enterprise)} · Credential {sgn(M.relativeCapability.credential)} &nbsp;|&nbsp; AI readiness:{' '}
        AI {r.aiCapability.toFixed(1)} ({r.band}) → capability-only {r.capabilityOnlyScore.toFixed(1)} × support{' '}
        {r.supportMultiplier.toFixed(3)} (PQ {r.productQualitySupport.toFixed(2)}, Talent {r.talentSupport.toFixed(2)}, Exec{' '}
        {r.executionSupport.toFixed(2)}) = {r.readiness.toFixed(2)}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Indicator</th><th>Opening</th><th>Base inflow</th><th>Market</th><th>Capability</th><th>Dependency / support</th>
              <th>Decay / attrition</th><th>Unclipped</th><th>Closing</th><th>Bounds</th><th>Target / steady state</th><th>Drivers</th>
            </tr>
          </thead>
          <tbody>
            {M.indicators.map(i => (
              <tr key={i.indicator} style={i.clipped ? { background: '#fff3f3' } : undefined}>
                <td>{IND_LABEL[i.indicator]}</td>
                <td>{i.opening.toFixed(3)}</td>
                <td>{i.kind === 'stock' ? i.baseInflow.toFixed(3) : '—'}</td>
                <td>{sgn(i.marketContribution)}</td>
                <td>{sgn(i.capabilityContribution)}</td>
                <td>{sgn(i.dependencyContribution)}</td>
                <td>{sgn(i.decayOrAttrition)}</td>
                <td>{i.unclipped.toFixed(3)}</td>
                <td><strong>{i.closing.toFixed(3)}</strong>{i.clipped && <span style={{ color: '#c62828' }}> (clipped {sgn(i.clipAmount)})</span>}</td>
                <td>{bnd(i.bounds)}</td>
                <td>{i.target.toFixed(2)}</td>
                <td style={{ fontSize: '11px' }}>{i.drivers.map(d => `${d.label}: ${d.value.toFixed(3)}`).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CommercialPanel: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: '12px' }}>
      <h4 style={{ marginBottom: 0 }}>Commercial consequence (Phase 2C): leading indicators, not revenue</h4>
      <CommercialOverview quarters={quarters} />
      <button className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} per-quarter indicator diagnostics
      </button>
      {open && quarters.map(rec => <CommercialQuarterDetail key={rec.quarter} rec={rec} />)}
    </div>
  );
};

// ============ PHASE 2D: SEGMENT REVENUE ============

const m1 = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toFixed(2)}M`;

const RevenueQuarterDetail: React.FC<{ rec: V2QuarterRecord }> = ({ rec }) => {
  const R = rec.consequence.revenue;
  const c = R.consumer, e = R.enterprise, u = R.university, a = R.aiNative;
  const row = (label: string, cells: [string, string][]) => (
    <tr>
      <td><strong>{label}</strong></td>
      <td style={{ fontSize: '12px' }}>{cells.map(([k, v]) => `${k}: ${v}`).join(' · ')}</td>
    </tr>
  );
  return (
    <div className="audit-section">
      <h4>Q{rec.quarter} segment revenue: how each business moved</h4>
      <table className="comparison-table">
        <tbody>
          {row('Consumer', [['opening', m1(c.opening)], ['exposed base (30%)', m1(c.exposedBase)], ['retention', `${(c.retention * 100).toFixed(2)}%`],
            ['churn', `−${m1(c.churn)}`], ['retained', m1(c.retained)], ['CAC index', c.cacIndex.toFixed(1)], ['acquisition/replacement', `+${m1(c.acquisition)}`],
            ['ΔPricing Power', c.pricingPowerChange.toFixed(3)], ['price/mix', m1(c.priceMix)], ['closing', m1(c.closing)]])}
          {row('Enterprise', [['opening base', m1(e.opening)], ['opening pipeline', m1(e.openingPipeline)], ['resolved pipeline', m1(e.resolvedPipeline)],
            ['win rate', `${(e.winRate * 100).toFixed(2)}%`], ['bookings (ACV)', m1(e.bookingsACV)], ['new run-rate booked', m1(e.newRunRateBooked)],
            ['renewal rate', `${(e.renewalRate * 100).toFixed(2)}%`], ['churn', `−${m1(e.churn)}`], ['expansion', `+${m1(e.expansion)}`],
            ['live from this quarter’s bookings', m1(e.liveFromCurrentBookings)], ['live from earlier bookings', `+${m1(e.liveFromEarlierBookings)}`],
            ['closing', m1(e.closing)], ['backlog (not yet live)', `${m1(e.backlogRunRate)}/qtr = ${m1(e.backlogACV)} ACV`]])}
          {row('University', [['opening base', m1(u.opening)], ['renewal', `${(u.renewalRate * 100).toFixed(2)}%`], ['churn', `−${m1(u.churn)}`],
            ['opening pipeline', m1(u.openingPipeline)], ['resolved', m1(u.resolvedPipeline)], ['institutional win rate', `${(u.institutionalWinRate * 100).toFixed(1)}%`],
            ['wins (ACV)', m1(u.winsACV)], ['recognized from earlier wins', `+${m1(u.liveFromEarlierWins)}`], ['closing', m1(u.closing)],
            ['backlog', `${m1(u.backlogRunRate)}/qtr = ${m1(u.backlogACV)} ACV`]])}
          {row('AI-native', [['opening', m1(a.opening)], ['readiness', a.readiness.toFixed(2)], ['adoption', a.adoption.toFixed(2)], ['AI-native demand', a.aiNativeDemand.toFixed(2)],
            ['quality/execution factor', a.qualityExecutionFactor.toFixed(3)], ['retention', `${(a.retentionRate * 100).toFixed(2)}%`],
            ['churn', `−${m1(a.churn)}`], ['retained base', m1(a.retainedBase)], ['new monetization', `+${m1(a.newMonetization)}`], ['closing', m1(a.closing)]])}
        </tbody>
      </table>
    </div>
  );
};

const RevenuePanel: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: '12px' }}>
      <h4 style={{ marginBottom: 0 }}>Segment revenue (Phase 2D)</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="comparison-table">
          <thead>
            <tr><th>Q</th><th>Consumer</th><th>Enterprise</th><th>University</th><th>AI-native</th><th>Total revenue</th>
              <th>Op. profit*</th><th>Closing cash*</th><th>Ent. bookings ACV</th><th>Ent. backlog ACV</th><th>Univ. backlog ACV</th><th>AI adoption</th><th>Rev. checks</th></tr>
          </thead>
          <tbody>
            {quarters.map(rec => {
              const R = rec.consequence.revenue;
              const L = rec.consequence.ledger;
              const s = R.closing.segments;
              const failed = rec.checks.filter(x => x.id.startsWith('rev_') && !x.passed);
              return (
                <tr key={rec.quarter}>
                  <td>Q{rec.quarter}</td>
                  <td>{money(s.consumer)}</td><td>{money(s.enterprise)}</td><td>{money(s.university)}</td><td>{money(s.aiNative)}</td>
                  <td><strong>{money(R.totalRevenue)}</strong></td>
                  <td style={{ color: '#777' }}>{money(L.operatingProfit)}</td>
                  <td style={{ ...cashStyle(L.closingCash), color: L.closingCash < 0 ? '#c62828' : '#777' }}>{money(L.closingCash)}</td>
                  <td>{money(R.enterprise.bookingsACV)}</td><td>{money(R.enterprise.backlogACV)}</td><td>{money(R.university.backlogACV)}</td>
                  <td>{R.aiNative.adoption.toFixed(1)}</td>
                  <td title={failed.map(x => `${x.id}: ${x.details}`).join('\n')}>{failed.length === 0 ? '✅' : `🚨 ${failed.length}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} per-quarter revenue build-up
      </button>
      {open && quarters.map(rec => <RevenueQuarterDetail key={rec.quarter} rec={rec} />)}
    </div>
  );
};

// ============ PHASE 3A: OPERATING COST ============

const CostPanel: React.FC<{ quarters: V2QuarterRecord[] }> = ({ quarters }) => (
  <div style={{ marginTop: '12px' }}>
    <h4 style={{ marginBottom: 0 }}>Operating cost (Phase 3A): {quarters[0]?.consequence.costSource === 'modelled' ? 'modelled' : 'NOT in ledger (hold mode)'}</h4>
    <div style={{ overflowX: 'auto' }}>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Q</th><th>Opening fixed</th><th>Fixed/semi-fixed</th><th>Consumer servicing</th><th>Consumer acquisition</th>
            <th>Ent. servicing</th><th>Ent. onboarding</th><th>Univ. servicing</th><th>AI serving</th><th>Variable total</th>
            <th>People commit.</th><th>Ent. commit.</th><th>AI commit.</th><th>Financing</th><th>Event (placeholder)</th>
            <th>Total op. cost</th><th>Revenue</th><th>Op. profit</th><th>Margin</th><th>Cost checks</th>
          </tr>
        </thead>
        <tbody>
          {quarters.map(rec => {
            const K = rec.consequence.cost;
            const L = rec.consequence.ledger;
            const rev = rec.consequence.revenue.totalRevenue;
            const op = rev - K.totalOperatingCost;
            const failed = rec.checks.filter(x => x.id.startsWith('cost_') && !x.passed);
            return (
              <tr key={rec.quarter}>
                <td>Q{rec.quarter}</td>
                <td>{K.openingFixedSemiFixed.toFixed(2)}</td><td>{K.fixedSemiFixed.toFixed(2)}</td>
                <td>{K.variable.consumerServicing.toFixed(2)}</td><td>{K.variable.consumerAcquisitionSpend.toFixed(2)}</td>
                <td>{K.variable.enterpriseServicing.toFixed(2)}</td><td>{K.variable.enterpriseOnboarding.toFixed(2)}</td>
                <td>{K.variable.universityServicing.toFixed(2)}</td><td>{K.variable.aiNativeServing.toFixed(2)}</td>
                <td>{K.variable.total.toFixed(2)}</td>
                <td>{K.commitments.bySource.people.toFixed(2)}</td><td>{K.commitments.bySource.enterprise.toFixed(2)}</td><td>{K.commitments.bySource.aiProduct.toFixed(2)}</td>
                <td>{K.financingCost.toFixed(2)}</td><td>{K.eventCostPlaceholder.toFixed(2)}</td>
                <td><strong>{K.totalOperatingCost.toFixed(2)}</strong></td>
                <td>{rev.toFixed(2)}</td>
                <td style={cashStyle(op)}>{op.toFixed(2)}</td>
                <td>{((op / rev) * 100).toFixed(1)}%</td>
                <td title={failed.map(x => `${x.id}: ${x.details}`).join('\n') + (rec.consequence.costSource === 'modelled' ? '' : `\nledger uses ${L.operatingCost.toFixed(1)}`)}>
                  {failed.length === 0 ? '✅' : `🚨 ${failed.length}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// ============ PHASE 3B: INTEGRATED FINANCIALS ============

const runwayText = (r: { status: string; quarters: number | null }) =>
  r.status === 'self-funding' ? 'self-funding' : r.status === 'cash-negative' ? 'cash-negative' : r.quarters! > 40 ? '>40 qtrs (near break-even)' : `${r.quarters!.toFixed(1)} qtrs`;

const IntegratedTable: React.FC<{ results: V2RevenueRunResult[] }> = ({ results }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="comparison-table">
      <thead>
        <tr><th>Strategy</th><th>Q</th><th>Revenue</th><th>Op. cost</th><th>Op. profit</th><th>Margin</th><th>Strategic inv.</th>
          <th>Net cash flow</th><th>Closing cash</th><th>Runway</th></tr>
      </thead>
      <tbody>
        {results.flatMap(r => [1, 4, 8].map(q => {
          const F = r.quarters[q - 1].consequence.financials;
          return (
            <tr key={`${r.scenario.id}-${q}`} style={q === 1 ? { borderTop: '2px solid #667eea' } : undefined}>
              <td>{q === 1 ? `${r.passed ? '✅' : '🚨'} ${r.scenario.name}` : ''}</td>
              <td>Q{q}</td>
              <td>{money(F.revenue)}</td><td>{money(F.operatingCost)}</td>
              <td style={cashStyle(F.operatingProfit)}>{money(F.operatingProfit)}</td>
              <td>{F.operatingMargin === null ? '—' : `${(F.operatingMargin * 100).toFixed(1)}%`}</td>
              <td>{money(F.strategicInvestment)}</td>
              <td style={cashStyle(F.netCashFlow)}>{money(F.netCashFlow)}</td>
              <td style={cashStyle(F.closingCash)}>{money(F.closingCash)}</td>
              <td>{runwayText(F.runway)}</td>
            </tr>
          );
        }))}
      </tbody>
    </table>
  </div>
);

const Q8StateTable: React.FC<{ results: V2RevenueRunResult[] }> = ({ results }) => (
  <div style={{ overflowX: 'auto', marginTop: '12px' }}>
    <table className="comparison-table">
      <thead>
        <tr><th>Strategy (Q8)</th><th>Consumer</th><th>Enterprise</th><th>University</th><th>AI-native</th>
          <th>Cons. cap</th><th>Ent. cap</th><th>CS</th><th>AI cap</th><th>Org cap</th><th>Retention</th><th>Pipeline</th><th>Win %</th><th>AI adoption</th><th>Renewal</th></tr>
      </thead>
      <tbody>
        {results.map(r => {
          const e = r.quarters[r.quarters.length - 1].ending;
          const s = e.segmentRevenue;
          const c = e.commercial;
          return (
            <tr key={r.scenario.id}>
              <td>{r.scenario.name}</td>
              <td>{money(s.consumer)}</td><td>{money(s.enterprise)}</td><td>{money(s.university)}</td><td>{money(s.aiNative)}</td>
              <td>{e.capabilities.consumer.toFixed(0)}</td><td>{e.capabilities.enterprise.toFixed(0)}</td><td>{e.capabilities.customerSuccess.toFixed(0)}</td>
              <td>{e.capabilities.ai.toFixed(0)}</td><td>{e.organizationalCapacity.toFixed(0)}</td>
              <td>{c.consumerRetention.toFixed(1)}</td><td>{money(c.enterprisePipeline)}</td><td>{c.enterpriseWinRate.toFixed(1)}</td>
              <td>{c.aiAdoptionIndex.toFixed(1)}</td><td>{c.universityRenewalRate.toFixed(1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const V2FinancialLedgerTest: React.FC = () => {
  const [scenarioResults, setScenarioResults] = useState<V2ScenarioResult[] | null>(null);
  const [strategyId, setStrategyId] = useState('balanced');
  const [opMode, setOpMode] = useState<V2OperatingMode>('carried-forward');
  const [run, setRun] = useState<V2StrategyRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capResults, setCapResults] = useState<V2CapabilityScenarioResult[] | null>(null);
  const [comResults, setComResults] = useState<V2CommercialScenarioResult[] | null>(null);
  const [revCase, setRevCase] = useState<V2RevenueMarketCase>('competitive');
  const [revResults, setRevResults] = useState<V2RevenueRunResult[] | null>(null);
  const [costMode, setCostMode] = useState<'hold' | 'modelled'>('modelled');
  const [intCase, setIntCase] = useState<V2RevenueMarketCase>('competitive');
  const [intResults, setIntResults] = useState<V2RevenueRunResult[] | null>(null);
  const [stress, setStress] = useState<V2StressResult[] | null>(null);
  const [arc, setArc] = useState<V2ArcRun[] | null>(null);
  const [arcSignalsFor, setArcSignalsFor] = useState<string>('evidence-responsive');
  const runArcStrategies = () => {
    try {
      setError(null);
      setArc(runAllArcStrategies());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const runStress = () => {
    try {
      setError(null);
      setStress(runV2StressAudit());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const runIntegrated = () => {
    try {
      setError(null);
      setIntResults(runAllV2IntegratedScenarios(intCase));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runRevenueScenarios = () => {
    try {
      setError(null);
      setRevResults(costMode === 'modelled' ? runAllV2IntegratedScenarios(revCase) : runAllV2RevenueScenarios(revCase));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runCommercialScenarios = () => {
    try {
      setError(null);
      setComResults(runAllV2CommercialScenarios());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

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
      <h2>Mode 5: V2 Engine: Ledger (2A) · Capabilities (2B) · Commercial (2C) · Revenue (2D) · Costs (3A) · Integrated (3B) · Stress audit (3C) · Scenario arc (Batch 2)</h2>
      <p>
        V2 accounting core, running in parallel to the frozen V1 engine. Every quarter exposes its full ledger and
        re-checks the identity:
      </p>
      <pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
{`Operating Profit = Revenue − Operating Costs
Closing Cash     = Opening Cash + Operating Profit − Strategic Investment − Event Costs + Financing`}
      </pre>
      <div className="testlab-warning">
        <strong>Scope (Phase 2A–2D):</strong> ledger, capability pipeline, leading commercial indicators and segment revenue.
        Sections A–D run in <em>hold</em> revenue mode (revenue carried forward or injected, as before). Section E runs in
        <em>segment</em> mode, where ledger revenue is the sum of the four businesses. Operating cost is an uncalibrated
        $170M placeholder everywhere. There are no financing choices (financing = $0), no Q1–Q8 event rebalance, no scoring and no Q4
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
          <CommercialPanel quarters={run.quarters} />
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

      <h3 style={{ marginTop: '30px' }}>D. Commercial calibration scenarios (Phase 2C)</h3>
      <p style={{ fontSize: '13px' }}>
        Twelve Q1→Q8 strategies under the neutral market, $30M envelope every quarter. The three "weak" scenarios inject the
        weak capability into the opening state. These are leading indicators only; no revenue is calculated.
      </p>
      <div className="button-group">
        <button className="btn btn-primary" onClick={runCommercialScenarios}>Run commercial scenarios</button>
      </div>
      {comResults && (
        <div style={{ overflowX: 'auto' }}>
          <table className="comparison-table">
            <thead>
              <tr><th>Strategy</th><th>Q</th><th>Retention %</th><th>CAC</th><th>Ent. Pipeline</th><th>Win %</th><th>AI Readiness</th><th>AI Adoption</th><th>Univ. Pipeline</th><th>Renewal %</th><th>Pricing</th></tr>
            </thead>
            <tbody>
              {comResults.flatMap(r => [1, 4, 8].map(q => {
                const c = r.quarters[q - 1].ending.commercial;
                return (
                  <tr key={`${r.scenario.id}-${q}`} style={q === 1 ? { borderTop: '2px solid #667eea' } : undefined}>
                    <td>{q === 1 ? `${r.passed ? '✅' : '🚨'} ${r.scenario.name}` : ''}</td>
                    <td>Q{q}</td>
                    <td>{c.consumerRetention.toFixed(1)}</td><td>{c.consumerCacIndex.toFixed(1)}</td>
                    <td>{money(c.enterprisePipeline)}</td><td>{c.enterpriseWinRate.toFixed(1)}</td>
                    <td>{c.aiCommercialReadiness.toFixed(1)}</td><td>{c.aiAdoptionIndex.toFixed(1)}</td>
                    <td>{money(c.universityPipeline)}</td><td>{c.universityRenewalRate.toFixed(1)}</td><td>{c.pricingPower.toFixed(1)}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      )}
      {comResults && comResults.map(r => (
        <div key={r.scenario.id} className="audit-card" style={{ padding: '12px' }}>
          <h4>{r.passed ? '✅' : '🚨'} {r.scenario.name}</h4>
          <p style={{ fontSize: '13px' }}>{r.scenario.description}</p>
          <CommercialPanel quarters={r.quarters} />
          <CapabilityPipeline quarters={r.quarters} />
        </div>
      ))}

      <h3 style={{ marginTop: '30px' }}>E. Segment revenue (2D) + operating cost (3A)</h3>
      <div className="testlab-warning">
        <strong>Revenue mode = segment.</strong> Ledger revenue = Consumer + Enterprise + University + AI-native. Choose the cost
        model: <em>modelled</em> (Phase 3A: fixed/semi-fixed + segment variable + lagged strategic commitments) or the old
        <em> $170M placeholder</em>. No market events, financing or scoring. Negative cash is shown, never floored.
      </div>
      <div className="form-group">
        <label>Operating cost</label>
        <select value={costMode} onChange={e => setCostMode(e.target.value as 'hold' | 'modelled')}>
          <option value="modelled">Modelled operating cost (Phase 3A)</option>
          <option value="hold">$170M placeholder (Phase 2D diagnostic)</option>
        </select>
      </div>
      <div className="form-group">
        <label>Market</label>
        <select value={revCase} onChange={e => setRevCase(e.target.value as V2RevenueMarketCase)}>
          <option value="competitive">Normal competitive market (Phase 2C competitor progression)</option>
          <option value="static-neutral">Static neutral market (zero competitor progress: fixed-point test)</option>
        </select>
      </div>
      <div className="button-group">
        <button className="btn btn-primary" onClick={runRevenueScenarios}>Run revenue scenarios</button>
      </div>
      {revResults && (
        <div style={{ overflowX: 'auto' }}>
          <table className="comparison-table">
            <thead>
              <tr><th>Strategy</th><th>Q</th><th>Consumer</th><th>Enterprise</th><th>University</th><th>AI-native</th><th>Total</th><th>Op. profit*</th><th>Cash*</th><th>Ent. bookings</th><th>Ent. backlog ACV</th><th>AI adoption</th></tr>
            </thead>
            <tbody>
              {revResults.flatMap(r => [1, 4, 8].map(q => {
                const rec = r.quarters[q - 1];
                const R = rec.consequence.revenue;
                const s = R.closing.segments;
                return (
                  <tr key={`${r.scenario.id}-${q}`} style={q === 1 ? { borderTop: '2px solid #667eea' } : undefined}>
                    <td>{q === 1 ? `${r.passed ? '✅' : '🚨'} ${r.scenario.name}` : ''}</td>
                    <td>Q{q}</td>
                    <td>{money(s.consumer)}</td><td>{money(s.enterprise)}</td><td>{money(s.university)}</td><td>{money(s.aiNative)}</td>
                    <td><strong>{money(R.totalRevenue)}</strong></td>
                    <td style={{ color: '#777' }}>{money(rec.consequence.ledger.operatingProfit)}</td>
                    <td style={{ color: rec.consequence.ledger.closingCash < 0 ? '#c62828' : '#777' }}>{money(rec.consequence.ledger.closingCash)}</td>
                    <td>{money(R.enterprise.bookingsACV)}</td><td>{money(R.enterprise.backlogACV)}</td><td>{R.aiNative.adoption.toFixed(1)}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      )}
      {revResults && revResults.map(r => (
        <div key={r.scenario.id} className="audit-card" style={{ padding: '12px' }}>
          <h4>{r.passed ? '✅' : '🚨'} {r.scenario.name} · {r.marketCase}</h4>
          <p style={{ fontSize: '13px' }}>{r.scenario.description}</p>
          <RevenuePanel quarters={r.quarters} />
          <CostPanel quarters={r.quarters} />
          <CommercialPanel quarters={r.quarters} />
          <QuarterCheckDetails quarters={r.quarters} />
        </div>
      ))}

      <h3 style={{ marginTop: '30px' }}>F. Integrated financial model (Phase 3B)</h3>
      <div className="testlab-warning">
        Segment revenue → modelled operating cost → operating profit → strategic investment → cash. Financing = $0, event
        costs = $0, no cash floor. Runway = cash ÷ net cash burn at the current quarter's rate.
      </div>
      <div className="form-group">
        <label>Market</label>
        <select value={intCase} onChange={e => setIntCase(e.target.value as V2RevenueMarketCase)}>
          <option value="competitive">Normal competitive market</option>
          <option value="static-neutral">Static neutral market</option>
        </select>
      </div>
      <div className="button-group">
        <button className="btn btn-primary" onClick={runIntegrated}>Run integrated model</button>
      </div>
      {intResults && <IntegratedTable results={intResults} />}
      {intResults && <Q8StateTable results={intResults} />}

      <h3 style={{ marginTop: '30px' }}>G. Economic stress audit (Phase 3C)</h3>
      <div className="testlab-warning">
        Integrated economy under stress (zero/max investment, concentrated, broad, switching, weak Execution/Trust/Talent/CS,
        saturation, high/low capacity, 16- and 40-quarter runs). Automated detectors: invariants, non-finite values, negative
        revenue/cost, in-quarter expensing of investment, runaway growth, margin band, cost vanishing with revenue, revenue
        without commercial cause, revenue scale. Insolvency is allowed and reported.
      </div>
      <div className="button-group">
        <button className="btn btn-primary" onClick={runStress}>Run stress audit</button>
      </div>
      <h3 style={{ marginTop: '30px' }}>H. Scenario arc Q1–Q{lastAuthoredQuarter()} (Batch 2)</h3>
      <div className="testlab-warning">
        Scenario → market inputs → commercial indicators → segment revenue → costs/profit/cash. Scenarios never touch revenue.
        Players see signals (briefing + measured KPIs); the engine consumes the underlying market truth.
      </div>
      {V2_SCENARIO_ARC.map(sq => (
        <div key={sq.id} className="audit-section">
          <h4>{sq.title}</h4>
          <p style={{ fontSize: '13px' }}>{sq.briefing}</p>
          <div style={{ fontSize: '12px' }}>
            Demand: {Object.entries(sq.demand).map(([k, v]) => `${k} ${v}`).join(' · ')}<br />
            Competitor progress: {Object.entries(sq.competitorProgress).map(([k, v]) => `${k} +${v}/qtr`).join(' · ')}<br />
            Structural changes: {sq.structuralChanges.length ? sq.structuralChanges.map(c => `${c.field} ${c.from}→${c.to} (${c.rationale})`).join(' · ') : 'none'}
          </div>
        </div>
      ))}
      <div className="button-group">
        <button className="btn btn-primary" onClick={runArcStrategies}>Run arc strategies</button>
      </div>
      {arc && (
        <div style={{ overflowX: 'auto' }}>
          <table className="comparison-table">
            <thead><tr><th>Strategy</th><th>Q</th><th>Allocation (C/E/AI/P/U/Cash)</th><th>Revenue</th><th>Cons/Ent/Univ/AI</th><th>Op. profit</th><th>Cash</th><th>Destination</th></tr></thead>
            <tbody>
              {arc.flatMap(r => r.quarters.map(h => {
                const L = h.record.consequence.ledger;
                const sg = h.record.ending.segmentRevenue;
                const al = h.allocation;
                const dest = (h.record.ending as any).destination?.id ?? '—';
                return (
                  <tr key={`${r.strategy.id}-${h.quarter}`} style={h.quarter === 1 ? { borderTop: '2px solid #667eea' } : undefined}>
                    <td>{h.quarter === 1 ? `${r.passed ? '✅' : '🚨'} ${r.strategy.name}` : ''}</td>
                    <td>Q{h.quarter}</td>
                    <td>{`${al.consumer}/${al.enterprise}/${al.aiProduct}/${al.people}/${al.universityCredentials}/${al.cashReserve}`}</td>
                    <td>{money(L.revenue)}</td>
                    <td>{`${sg.consumer.toFixed(1)} / ${sg.enterprise.toFixed(1)} / ${sg.university.toFixed(1)} / ${sg.aiNative.toFixed(1)}`}</td>
                    <td style={cashStyle(L.operatingProfit)}>{money(L.operatingProfit)}</td>
                    <td style={cashStyle(L.closingCash)}>{money(L.closingCash)}</td>
                    <td>{dest}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Signals shown to players (by quarter) for</label>
            <select value={arcSignalsFor} onChange={e => setArcSignalsFor(e.target.value)}>
              {arc.map(r => <option key={r.strategy.id} value={r.strategy.id}>{r.strategy.name}</option>)}
            </select>
          </div>
          {arc.filter(r => r.strategy.id === arcSignalsFor).flatMap(r => r.quarters).map(h => (
            <div key={h.quarter} className="audit-section">
              <h4>Entering Q{h.quarter}</h4>
              <ul style={{ fontSize: '12px' }}>
                {h.signals.map(sg => (
                  <li key={sg.id}>
                    [{sg.audience}] [{sg.reliability}] {sg.label}
                    {sg.shownValue !== undefined ? `: ${sg.shownValue.toFixed(2)}${sg.unit ? ' ' + sg.unit : ''}` : ''}
                    {sg.shownRange ? ` (range ${sg.shownRange[0]} to ${sg.shownRange[1]}${sg.unit ? ' ' + sg.unit : ''})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {stress && (
        <div style={{ overflowX: 'auto' }}>
          <table className="comparison-table">
            <thead>
              <tr><th>Case</th><th>Qs</th><th>Q8 revenue</th><th>Final revenue</th><th>Final Cons/Ent/Univ/AI</th><th>Final OP</th>
                <th>Margin range</th><th>Max qtr growth</th><th>Final cash</th><th>First negative cash</th><th>Detector hits</th></tr>
            </thead>
            <tbody>
              {stress.map(r => {
                const f = r.summary.final;
                const kinds = [...new Set(r.anomalies.map(a => a.detector))];
                return (
                  <tr key={r.stress.id}>
                    <td>{r.stress.name}</td><td>{r.stress.quarters}</td>
                    <td>{r.summary.q8 ? money(r.summary.q8.revenue) : '—'}</td><td>{money(f.revenue)}</td>
                    <td>{`${f.segments.consumer.toFixed(0)} / ${f.segments.enterprise.toFixed(0)} / ${f.segments.university.toFixed(1)} / ${f.segments.aiNative.toFixed(1)}`}</td>
                    <td style={cashStyle(f.operatingProfit)}>{money(f.operatingProfit)}</td>
                    <td>{`${(r.summary.minMargin * 100).toFixed(1)}% – ${(r.summary.maxMargin * 100).toFixed(1)}%`}</td>
                    <td>{(r.summary.maxQuarterlyRevenueGrowth * 100).toFixed(2)}%</td>
                    <td style={cashStyle(f.cash)}>{money(f.cash)}</td>
                    <td>{r.firstNegativeCashQuarter ? `Q${r.firstNegativeCashQuarter}` : '—'}</td>
                    <td style={{ fontSize: '11px' }}>{kinds.map(k => `${k} ×${r.anomalies.filter(a => a.detector === k).length}`).join(', ') || 'none'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default V2FinancialLedgerTest;
