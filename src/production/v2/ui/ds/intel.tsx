/**
 * Executive intelligence components (Batch 8 · Stages 2 & 3): quarter selector, metric explorer, health movements,
 * attribution, executive scorecards, valuation bridge and share-price chart. Presentation only — every number comes
 * from insights/* modules that read recorded engine state.
 */
import { useState } from 'react';
import { calendarLabel, calendarShort } from '../../content/calendar';
import type { V2PresentationMode } from '../../content/modes';
import { Term } from './glossary';
import { LineChart, SegmentBars } from './components';
import {
  DASH_METRICS, DashSection, DashboardData, formatMetricValue, formatMetricDelta, movementTone, epsFor, HealthRow,
} from '../../insights/intelligence';
import { AttributionRow, DRIVER_LABEL, formatAttr } from '../../insights/attribution';
import type { Scorecard } from '../../insights/executive';
import { EXECUTIVE_WEIGHTS, EXECUTIVE_VERSION } from '../../insights/executive';
import { FACTOR_IDS, FACTOR_INFO, PricePoint, ValuationSeries, fmtPrice, fmtPriceDelta, fmtPctDelta, roundedBridge, VALUATION_VERSION } from '../../insights/valuation';

const arrow = (d: number, eps: number) => (Math.abs(d) < eps ? '■' : d > 0 ? '▲' : '▼');
const TONE_CLASS = { good: 'ds-tone-good', bad: 'ds-tone-bad', neutral: 'ds-tone-neutral' } as const;

/** Quarter selector: Q4 2022 through the last completed quarter; later quarters are shown but disabled. */
export function QuarterSelector({ max, value, onChange, testId = 'v2-qsel', includeStart = true }: { max: number; value: number; onChange: (q: number) => void; testId?: string; includeStart?: boolean }) {
  return (
    <div className="ds-qsel" role="group" aria-label="Choose a quarter" data-testid={testId}>
      {Array.from({ length: 9 }, (_, q) => q).filter(q => includeStart || q > 0).map(q => (
        <button key={q} type="button" aria-pressed={value === q} disabled={q > max} onClick={() => onChange(q)} data-testid={`${testId}-${q}`} title={calendarLabel(q)}>{calendarShort(q)}</button>
      ))}
    </div>
  );
}

/** Signed movement with an arrow, a number and the tone in words for screen readers (never colour alone). */
export function Move({ d, text, tone, eps }: { d: number; text: string; tone: 'good' | 'bad' | 'neutral'; eps: number }) {
  return (
    <span className={`ds-num ${TONE_CLASS[tone]}`} style={{ whiteSpace: 'nowrap' }}>
      <span aria-hidden>{arrow(d, eps)} </span>{text}
      <span className="ds-sr">{tone === 'good' ? ' (favourable)' : tone === 'bad' ? ' (unfavourable)' : ''}</span>
    </span>
  );
}

/** One dashboard section: pick a metric and a quarter, inspect the recorded values and compare. */
export function MetricExplorer({ data, section, initialMetric, testId }: { data: DashboardData; section: Exclude<DashSection, 'overview'>; initialMetric?: string; testId?: string }) {
  const metrics = DASH_METRICS.filter(m => m.section === section);
  const [metricId, setMetricId] = useState(initialMetric ?? metrics[0].id);
  const [q, setQ] = useState(data.quarter);
  const m = metrics.find(x => x.id === metricId) ?? metrics[0];
  const series = data.series(m.id);
  const v = series[q].value, prev = q > 0 ? series[q - 1].value : null, start = series[0].value;
  const eps = epsFor(m.format);
  return (
    <div className="ds-stack" data-testid={testId ?? `v2-explorer-${section}`} data-metric={m.id} data-quarter={q}>
      <div className="ds-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <label className="ds-small ds-row" style={{ gap: 6 }}>Metric
          <select className="ds-input" value={m.id} onChange={e => setMetricId(e.target.value)} data-testid={`v2-metric-${section}`}>
            {metrics.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <QuarterSelector max={data.quarter} value={q} onChange={setQ} testId={`v2-qsel-${section}`} />
      </div>
      <div className="ds-grid ds-grid-side">
        <div>
          <LineChart testId={`v2-chart-${m.id}`} label={`${m.label} by quarter`} points={series.map(p => ({ x: p.quarter, y: p.value }))} format={x => formatMetricValue(m.format, x)}
            zeroLine={m.format === '$M' && Math.min(...series.map(p => p.value)) < 0} color="var(--nx-ink)" reference={{ y: start, label: `${calendarShort(0)} level` }} selected={q} onSelect={setQ} size="lg" />
          <p className="ds-method" style={{ margin: '4px 0 0' }}>Recorded values only, {calendarLabel(0)} to {calendarLabel(data.quarter)}. Dashed line: the {calendarLabel(0)} level. Select a point or a quarter to inspect it.</p>
        </div>
        <div>
          <table className="ds-table ds-table-compact" data-testid={`v2-explorer-table-${section}`}>
            <caption>{m.glossary ? <Term id={m.glossary}>{m.label}</Term> : m.label}</caption>
            <tbody>
              <tr><td>{calendarLabel(q)}</td><td className="num"><b>{formatMetricValue(m.format, v)}</b></td></tr>
              <tr><td>vs {q > 0 ? calendarLabel(q - 1) : 'previous'}</td><td className="num">{prev === null ? '—' : <Move d={v - prev} eps={eps} tone={movementTone(m.better, v - prev, eps)} text={formatMetricDelta(m.format, v - prev)} />}</td></tr>
              <tr><td>vs {calendarLabel(0)} ({formatMetricValue(m.format, start)})</td><td className="num"><Move d={v - start} eps={eps} tone={movementTone(m.better, v - start, eps)} text={formatMetricDelta(m.format, v - start)} /></td></tr>
            </tbody>
          </table>
          <p className="ds-small" style={{ margin: '8px 0 0', color: 'var(--ds-ink-2)' }}>{m.explain}</p>
        </div>
      </div>
    </div>
  );
}

export function SegmentMix({ data }: { data: DashboardData }) {
  return (
    <SegmentBars testId="v2-chart-segments" rows={data.states.map((s, q) => ({ quarter: q, values: [
      { key: 'consumer', label: 'Consumer', value: s.segmentRevenue.consumer }, { key: 'enterprise', label: 'Enterprise', value: s.segmentRevenue.enterprise },
      { key: 'aiNative', label: 'AI-native', value: s.segmentRevenue.aiNative }, { key: 'university', label: 'University', value: s.segmentRevenue.university }] }))} />
  );
}

/** Health indicators: current, movement vs previous quarter and vs start, level in words, contributing KPIs. */
export function HealthTable({ rows, quarter, mode }: { rows: HealthRow[]; quarter: number; mode: V2PresentationMode }) {
  return (
    <div className="ds-table-wrap" data-testid="v2-health">
      <table className="ds-table">
        <thead><tr><th>Indicator</th><th className="num">Current</th><th className="num">Δ {quarter > 1 ? calendarShort(quarter - 1) : calendarShort(0)}</th><th className="num">Δ {calendarShort(0)}</th><th>Level</th><th>Contributing KPIs</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id} data-testid={`v2-health-${r.id}`}>
            <td><b>{r.id === 'strategy' ? <Term id="strategic-readiness">{r.label}</Term> : r.label}</b></td>
            <td className="num">{r.current.toFixed(0)}</td>
            <td className="num">{r.deltaPrevious === null ? '—' : <Move d={r.deltaPrevious} eps={0.5} tone={Math.abs(r.deltaPrevious) < 0.5 ? 'neutral' : r.deltaPrevious > 0 ? 'good' : 'bad'} text={`${r.deltaPrevious >= 0.5 ? '+' : r.deltaPrevious <= -0.5 ? '−' : '±'}${Math.abs(r.deltaPrevious).toFixed(0)}`} />}</td>
            <td className="num"><Move d={r.deltaStart} eps={0.5} tone={Math.abs(r.deltaStart) < 0.5 ? 'neutral' : r.deltaStart > 0 ? 'good' : 'bad'} text={`${r.deltaStart >= 0.5 ? '+' : r.deltaStart <= -0.5 ? '−' : '±'}${Math.abs(r.deltaStart).toFixed(0)}`} /></td>
            <td>{r.level}</td>
            <td className="ds-small">{r.drivers.map((d, i) => <span key={i} style={{ display: 'block' }}>{d.label}: <b>{d.current}</b>{d.previous !== null && d.previous !== d.current ? <span className="ds-muted"> (was {d.previous})</span> : null}</span>)}</td>
          </tr>
        ))}</tbody>
      </table>
      <p className="ds-method" style={{ margin: '6px 0 0' }}>0–100 dashboard interpretations of recorded values — orientation, not scoring. {mode === 'mba' ? 'Formulas are listed under Deep analysis.' : ''}</p>
    </div>
  );
}

/** Indicator | Opening | Closing | Movement | Main driver, with the full recorded split on demand. */
export function AttributionTable({ rows, quarter }: { rows: AttributionRow[]; quarter: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const shown = rows.filter(r => Math.abs(r.movement) >= 0.05 || r.components.some(c => Math.abs(c.amount) >= 0.05));
  return (
    <div className="ds-table-wrap" data-testid="v2-attribution">
      <table className="ds-table">
        <thead><tr><th>Indicator</th><th className="num ds-hide-sm">{calendarShort(quarter - 1)}</th><th className="num ds-hide-sm">{calendarShort(quarter)}</th><th className="num">Movement</th><th>Main driver</th><th className="ds-sr">Detail</th></tr></thead>
        <tbody>{shown.map(r => {
          const eps = r.unit === '$M' || r.unit === '%' ? 0.05 : 0.05;
          const tone = Math.abs(r.movement) < eps ? 'neutral' : (r.movement > 0) === (r.better === 'higher') ? 'good' : 'bad';
          const isOpen = open === r.id;
          return [
            <tr key={r.id} data-testid={`v2-attr-${r.id}`} data-driver={r.driver ?? 'none'}>
              <td>{r.glossary ? <Term id={r.glossary}>{r.label}</Term> : r.label}</td>
              <td className="num ds-muted ds-hide-sm">{formatAttr(r.unit, r.opening)}</td>
              <td className="num ds-hide-sm">{formatAttr(r.unit, r.closing)}</td>
              <td className="num"><Move d={r.movement} eps={eps} tone={tone} text={formatAttr(r.unit, r.movement, true)} /></td>
              <td>{r.driver ? <span className={`ds-driver ds-driver-${r.driver === 'reversion' || r.driver === 'other' ? 'market' : r.driver}`}>{DRIVER_LABEL[r.driver]}</span> : <span className="ds-muted">—</span>}</td>
              <td><button className="ds-btn ds-btn-ghost" style={{ fontSize: 'var(--fs-note)' }} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)} data-testid={`v2-attr-detail-${r.id}`}>{isOpen ? 'Hide' : 'Detail'}</button></td>
            </tr>,
            isOpen && (
              <tr key={`${r.id}-d`}><td colSpan={6} style={{ background: 'var(--ds-surface-2)' }}>
                <table className="ds-table ds-table-compact"><tbody>
                  {r.components.filter(c => Math.abs(c.amount) >= 0.005).map((c, i) => <tr key={i}><td>{DRIVER_LABEL[c.kind]}</td><td className="ds-muted ds-small">{c.detail}</td><td className="num">{formatAttr(r.unit, c.amount, true)}</td></tr>)}
                  <tr className="ds-row-total"><td>Recorded movement</td><td /><td className="num">{formatAttr(r.unit, r.movement, true)}</td></tr>
                </tbody></table>
              </td></tr>
            ),
          ];
        })}</tbody>
      </table>
      <p className="ds-method" style={{ margin: '6px 0 0' }}>Each movement is split into the components the simulation recorded; they add up exactly. Market effects were the same for every team. No alternative outcomes are estimated.</p>
    </div>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="ds-muted">—</span>;
  return (
    <span className="ds-score" title="50 = starting position">
      <span className="ds-num" style={{ textAlign: 'right' }}>{score.toFixed(0)}</span>
      <span className="ds-score-bar" aria-hidden><span style={{ width: `${score}%` }} /></span>
    </span>
  );
}

/** An executive scorecard: Metric | Starting | Previous | Current | Change | Interpretation (+ normalised score). */
export function ScorecardView({ card, mode, testId }: { card: Scorecard; mode: V2PresentationMode; testId?: string }) {
  const q = card.quarter;
  return (
    <div className="ds-stack" data-testid={testId ?? `v2-scorecard-${card.role}`} data-executive={card.executive.toFixed(1)}>
      <div className="ds-figures">
        <div className="ds-figure"><span className="ds-fig-label">Executive score</span><span className="ds-fig-value">{card.executive.toFixed(0)}</span><div className="ds-fig-sub">{EXECUTIVE_WEIGHTS.functional * 100}% functional + {EXECUTIVE_WEIGHTS.company * 100}% company</div></div>
        <div className="ds-figure"><span className="ds-fig-label">Functional</span><span className="ds-fig-value">{card.functional.toFixed(0)}</span><div className="ds-fig-sub">this scorecard’s metrics</div></div>
        <div className="ds-figure"><span className="ds-fig-label">Company (shareholder value)</span><span className="ds-fig-value">{card.company.toFixed(0)}</span><div className="ds-fig-sub">from the share price; same for every role</div></div>
      </div>
      <div className="ds-table-wrap">
        <table className="ds-table" data-testid="v2-scorecard-table">
          <thead><tr><th>Metric</th><th className="num">{calendarShort(0)}</th><th className="num">{q > 1 ? calendarShort(q - 1) : 'Previous'}</th><th className="num">{calendarShort(q)}</th><th className="num">Change</th><th>Interpretation</th><th className="num">Score</th></tr></thead>
          <tbody>{card.rows.map((r, i) => {
            const newArea = i === 0 || card.rows[i - 1].area !== r.area;
            return [
              newArea && <tr key={`${r.id}-g`} className="ds-row-group"><td colSpan={7}>{r.area}</td></tr>,
              <tr key={r.id} data-metric={r.id}>
                <td>{r.glossary ? <Term id={r.glossary}>{r.label}</Term> : r.label}{mode === 'mba' && <span className="ds-method" style={{ display: 'block' }}>{r.normalisation}</span>}</td>
                <td className="num ds-muted">{r.start}</td>
                <td className="num ds-muted">{r.previous}</td>
                <td className="num"><b>{r.current}</b></td>
                <td className="num"><span className={r.favourable === null ? 'ds-tone-neutral' : r.favourable ? 'ds-tone-good' : 'ds-tone-bad'}><span aria-hidden>{r.direction === 'up' ? '▲ ' : r.direction === 'down' ? '▼ ' : ''}</span>{r.change}</span></td>
                <td className="ds-small">{r.interpretation}{r.marketContext && <span className="ds-muted" style={{ display: 'block' }}>{r.marketContext}</span>}</td>
                <td className="num"><ScoreCell score={r.score} /></td>
              </tr>,
            ];
          })}</tbody>
        </table>
      </div>
      <div className="ds-grid ds-grid-2">
        <div data-testid="v2-scorecard-challenges"><p className="ds-h4">Challenges</p>{card.challenges.length ? <ul className="ds-list ds-small">{card.challenges.map(c => <li key={c}>{c}</li>)}</ul> : <p className="ds-small ds-muted" style={{ margin: 0 }}>No metric is materially below its starting position.</p>}</div>
        <div><p className="ds-h4">Strengths</p>{card.strengths.length ? <ul className="ds-list ds-small">{card.strengths.map(c => <li key={c}>{c}</li>)}</ul> : <p className="ds-small ds-muted" style={{ margin: 0 }}>No metric is clearly above its starting position yet.</p>}</div>
      </div>
      <p className="ds-method" style={{ margin: 0 }}>Scorecards evaluate how the team handled each executive function, not any individual. Score: 50 = the {calendarLabel(0)} position, sustained improvement scores higher; thresholds give no extra credit for unused cash or idle capacity. Model {EXECUTIVE_VERSION}. Not part of the simulation’s final score.</p>
    </div>
  );
}

/** Valuation bridge: previous price → each calculated contribution → this quarter's price (reconciles exactly). */
export function ValuationBridgeView({ point, previous, mode }: { point: PricePoint; previous: PricePoint; mode: V2PresentationMode }) {
  const r = roundedBridge(point);
  const lines = r.lines.filter(l => Math.abs(l.shown) >= 0.005 || FACTOR_IDS.includes(l.id as never));
  let run = previous.price;
  const rows = lines.map(l => { const from = run; run += l.shown; return { ...l, from, to: run }; });
  const lo = Math.min(previous.price, point.price, ...rows.flatMap(x => [x.from, x.to])) * 0.98, hi = Math.max(previous.price, point.price, ...rows.flatMap(x => [x.from, x.to])) * 1.01;
  const x = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  return (
    <section data-testid="v2-valuation-bridge" data-reconciles={Math.abs(r.lines.reduce((t, l) => t + l.shown, 0) - r.total) < 0.005}>
      <div className="ds-bridge">
        <div className="ds-bridge-row total"><span>{calendarLabel(previous.quarter)} share price</span><span className="ds-bridge-track" aria-hidden><span className="ds-bridge-bar total" style={{ left: 0, width: `${x(previous.price)}%` }} /></span><span className="ds-bridge-val">{fmtPrice(previous.price)}</span></div>
        {rows.map(l => (
          <div key={l.id} className="ds-bridge-row" data-testid={`v2-vb-${l.id}`} data-value={l.shown}>
            <span>{l.label}{mode === 'mba' && FACTOR_IDS.includes(l.id as never) && <span className="ds-method" style={{ display: 'block' }}>{FACTOR_INFO[l.id as keyof typeof FACTOR_INFO].horizon === 'expectations' ? 'Future expectations' : 'Present performance'}</span>}</span>
            <span className="ds-bridge-track" aria-hidden>{Math.abs(l.shown) >= 0.005 && <span className={`ds-bridge-bar ${l.shown >= 0 ? 'pos' : 'neg'}`} style={{ left: `${x(Math.min(l.from, l.to))}%`, width: `${Math.max(0.6, Math.abs(x(l.to) - x(l.from)))}%` }} />}</span>
            <span className="ds-bridge-val">{fmtPriceDelta(l.shown)}</span>
          </div>
        ))}
        <div className="ds-bridge-row total"><span>{calendarLabel(point.quarter)} share price</span><span className="ds-bridge-track" aria-hidden><span className="ds-bridge-bar total" style={{ left: 0, width: `${x(point.price)}%` }} /></span><span className="ds-bridge-val" data-testid="v2-vb-closing">{fmtPrice(point.price)}</span></div>
      </div>
      <p className="ds-method" style={{ margin: '8px 0 0' }}>Contributions are calculated from recorded results and add up exactly to the change ({fmtPriceDelta(r.total)}). The price is simulated by a documented model ({VALUATION_VERSION}) — it is not a forecast, and it does not affect the simulation.</p>
    </section>
  );
}

/** Share price over time with the $100 starting line, plus the factor breakdown for the selected quarter. */
export function SharePricePanel({ val, quarter, mode }: { val: ValuationSeries; quarter: number; mode: V2PresentationMode }) {
  const [q, setQ] = useState(quarter);
  const p = val.points[q];
  return (
    <div className="ds-stack" data-testid="v2-share-price-panel">
      <div className="ds-row" style={{ justifyContent: 'space-between' }}>
        <div><span className="ds-fig-label">NXLN share price · {calendarLabel(q)}</span><div className="ds-fig-value" data-testid="v2-price-selected">{fmtPrice(p.price)}</div>
          <div className="ds-small">{q > 0 && <><Move d={p.change} eps={0.005} tone={p.change > 0.005 ? 'good' : p.change < -0.005 ? 'bad' : 'neutral'} text={`${fmtPriceDelta(p.change)} (${fmtPctDelta(p.changePct)}) on the quarter`} /> · </>}<Move d={p.sinceStart} eps={0.005} tone={p.sinceStart > 0.005 ? 'good' : p.sinceStart < -0.005 ? 'bad' : 'neutral'} text={`${fmtPctDelta(p.sinceStartPct)} since ${calendarLabel(0)}`} /></div></div>
        <QuarterSelector max={quarter} value={q} onChange={setQ} testId="v2-qsel-price" />
      </div>
      <div className="ds-grid ds-grid-side">
        <div>
          <LineChart testId="v2-chart-price" label="Simulated share price by quarter" points={val.points.map(x => ({ x: x.quarter, y: x.price }))} format={v => `$${v.toFixed(0)}`} color="var(--nx-forest)" zeroLine={false} reference={{ y: 100, label: '$100 start' }} selected={q} onSelect={setQ} size="lg" />
        </div>
        <div>
          <table className="ds-table ds-table-compact" data-testid="v2-price-factors">
            <caption>What investors are pricing ({calendarLabel(q)})</caption>
            <thead><tr><th>Factor</th><th className="num">Weight</th><th className="num">Score</th></tr></thead>
            <tbody>
              {FACTOR_IDS.map(k => <tr key={k}><td>{FACTOR_INFO[k].label}<span className="ds-method" style={{ display: 'block' }}>{FACTOR_INFO[k].horizon === 'expectations' ? 'Future expectations' : 'Present performance'}</span></td><td className="num">{(val.config.weights[k] * 100).toFixed(0)}%</td><td className="num">{(p.factors[k] * 100).toFixed(0)}</td></tr>)}
              {p.distress > 0 && <tr><td>Distress discount</td><td /><td className="num ds-tone-bad">−{(p.distress * 100).toFixed(0)}%</td></tr>}
              {p.ownership < 0.9995 && <tr><td>Ownership retained</td><td /><td className="num">{(p.ownership * 100).toFixed(1)}%</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {q > 0 && <ValuationBridgeView point={p} previous={val.points[q - 1]} mode={mode} />}
    </div>
  );
}
