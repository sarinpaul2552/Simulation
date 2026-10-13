import { useEffect, useMemo, useState } from 'react';
import { Termed } from '../ds/glossary';
import { calendarLabel } from '../../content/calendar';
import { V2_TOTAL_QUARTERS } from '../../engine';
import type { V2TeamController } from '../useV2Team';
import type { V2PresentationMode } from '../../content/modes';
import { pick } from '../../content/modes';
import { gameHistory, QuarterRecord } from '../../insights/history';
import { financialCards, healthIndicators, trendSeries, benchmarks, fmtM, KpiCard } from '../../insights/dashboard';
import { valuationSeries, fmtPrice, fmtPriceDelta, fmtPctDelta, type PricePoint } from '../../insights/valuation';
import { quarterAttribution, type AttributionRow } from '../../insights/attribution';
import { dashboardData, healthMovements } from '../../insights/intelligence';
import { allScorecards, SCORECARD_ROLES, ROLE_SCORECARD_TITLE } from '../../insights/executive';
import { BUCKETS, BUCKET_INFO } from '../../insights/consequences';
import { AttributionTable, HealthTable, MetricExplorer, Move, ScorecardView, SegmentMix, SharePricePanel, ValuationBridgeView } from '../ds/intel';
import { Term } from '../ds/glossary';
import { calendarShort } from '../../content/calendar';
import type { V2Role } from '../../types';
import { whatToWatch } from '../../insights/explain';
import { cashBridge, decisionConsequences, executiveHeadline, CashBridge, DecisionConsequence } from '../../insights/consequences';
import { reflectionEvidence, segmentReflection } from '../../insights/reflection';
import { materialDevelopments, boardQuestion } from '../../insights/briefing';
import { LEARNING_OPTIONS, encodeReflection, decodeReflection } from '../../content/deliberationContent';
import { AGREEMENTS } from './CommitStage';
import { accountabilityRows, ACCOUNTABILITY_CAVEAT } from '../../insights/accountability';
import { buildSignalReveal, signalRevealAvailable } from '../../insights/signalReveal';
import { SIGNAL_REVEAL_SUMMARY } from '../../content/signalAssessments';
import type { V2Deliberation } from '../../types';
import { Card, ChoiceList, Figure, Icon, KpiTile, LineChart, Section, Segmented } from '../ds/components';


/** Stage 4 — Results & Learning: executive summary → explore the business → deep analysis, then the reflection. */
export function ResultsStage({ ctl, mode }: { ctl: V2TeamController; mode: V2PresentationMode }) {
  const game = ctl.game!;
  const q = game.record.completed_quarter;
  const history = useMemo(() => gameHistory(game.snapshot), [game.snapshot]);
  const rec = history[q - 1];
  return (
    <div className="ds-stack-lg" data-testid="v2-phase-results" data-results-quarter={q}>
      <QuarterDashboard history={history} quarter={q} mode={mode} />
      {signalRevealAvailable(q) && <SignalReveal history={history} quarter={q} cited={(game.resolutions.find(r => r.quarter === 3)?.deliberation as V2Deliberation | null | undefined)?.evidenceIds ?? []} />}
      <ReflectionCard ctl={ctl} mode={mode} rec={rec} history={history} />
    </div>
  );
}

const deltaText = (c: KpiCard) => `${c.deltaDisplay}${c.pct !== null && Math.abs(c.pct) >= 0.001 ? ` (${(c.pct * 100).toFixed(1)}%)` : ''}`;

export function QuarterDashboard({ history, quarter, mode }: { history: QuarterRecord[]; quarter: number; mode: V2PresentationMode }) {
  const rec = history[quarter - 1];
  const cards = financialCards(history, quarter);
  const card = (id: KpiCard['id']) => cards.find(c => c.id === id)!;
  const headline = executiveHeadline(rec, history[quarter - 2]);
  const consequences = decisionConsequences(rec, mode);
  const top = consequences[0];
  const watch = whatToWatch(rec.after, mode);
  const bridge = cashBridge(rec);
  const val = useMemo(() => valuationSeries(history.slice(0, quarter)), [history, quarter]);
  const pp = val.points[quarter];
  const attribution = useMemo(() => quarterAttribution(rec), [rec]);
  const [deepOpen, setDeepOpen] = useState(false);
  return (
    <div className="ds-stack-lg" data-testid="v2-results">
      {/* Level 1 — the board paper headline */}
      <section className="ds-verdict" data-testid="v2-explanation">
        <span className="ds-verdict-kicker">{calendarLabel(quarter)} results · quarterly board paper</span>
        <h1 className="ds-verdict-text" data-testid="v2-headline-verdict" data-tone={headline.tone}>{headline.text}</h1>
        {mode === 'mba' && <div className="ds-verdict-basis">{headline.basis}</div>}
        <div className="ds-figures" data-testid="v2-figures">
          {(['revenue', 'operatingProfit', 'cash'] as const).map(id => {
            const c = card(id);
            return <Figure key={id} testId={`v2-fig-${id}`} label={<Termed label={c.label} />} value={c.display} delta={{ direction: c.direction, tone: c.tone, text: deltaText(c) }} sub={`${calendarLabel(quarter - 1)}: ${c.previousDisplay}`} />;
          })}
          <Figure testId="v2-fig-price" label="Share price (simulated)" value={fmtPrice(pp.price)}
            delta={{ direction: pp.change > 0.005 ? 'up' : pp.change < -0.005 ? 'down' : 'flat', tone: pp.change > 0.005 ? 'good' : pp.change < -0.005 ? 'bad' : 'neutral', text: `${fmtPriceDelta(pp.change)} (${fmtPctDelta(pp.changePct)})` }}
            sub={`${fmtPctDelta(pp.sinceStartPct)} since ${calendarLabel(0)} ($100)`} />
        </div>
      </section>
      <span className="ds-sr" data-testid="v2-res-revenue">{fmtM(rec.after.revenue)}</span>
      <span className="ds-sr" data-testid="v2-res-cash">{fmtM(rec.after.cash)}</span>
      <span className="ds-sr" data-testid="v2-res-solvency">{rec.after.solvency.status}{rec.after.solvency.distressed ? ' · distressed' : ''}</span>

      <QuarterBriefing history={history} rec={rec} quarter={quarter} mode={mode} />

      {/* Level 2 — executive intelligence */}
      <ExecutiveIntelligence history={history} quarter={quarter} mode={mode} />

      {/* Level 3 — deep analysis, on demand */}
      <details className="ds-fold" open={deepOpen} onToggle={e => setDeepOpen((e.target as HTMLDetailsElement).open)} data-testid="v2-deep">
        <summary><span>Deep analysis</span><span className="ds-fold-hint">The quarter in sequence, what moved and why, cash and share-price reconciliation, {mode === 'mba' ? 'diagnostics, benchmarks and formulas' : 'and more detail'}</span></summary>
        <div className="ds-fold-body ds-stack-lg">
          <QuarterSequence rec={rec} quarter={quarter} attribution={attribution} pp={pp} prevPrice={val.points[quarter - 1].price} />
          <div className="ds-grid ds-grid-main">
            <div className="ds-stack-lg">
              {top && <ConsequenceView c={top} />}
              <Section eyebrow="What moved, and why" testId="v2-why">
                <AttributionTable rows={attribution} quarter={quarter} />
              </Section>
            </div>
            <div className="ds-stack-lg">
              <div className="ds-next" data-testid="v2-next">
                <Icon name="eye" size={18} />
                <div><p className="ds-h4" style={{ marginBottom: 2 }}>What to watch next</p>
                  <div>{watch ? watch.text : 'Nothing unusual is building up. Keep an eye on cash and customers.'}</div>
                  <div className="ds-muted" style={{ marginTop: 4 }}>A leading indicator, not a forecast.</div></div>
              </div>
              <BridgeView bridge={bridge} mode={mode} />
              <section>
                <p className="ds-eyebrow">What moved the share price</p>
                <ValuationBridgeView point={pp} previous={val.points[quarter - 1]} mode={mode} />
              </section>
            </div>
          </div>
          <DeepAnalysis history={history} quarter={quarter} mode={mode} consequences={consequences} cards={cards} />
        </div>
      </details>
    </div>
  );
}

/** Level 1: three material developments from recorded results, and the board's question for the next decision. */
function QuarterBriefing({ history, rec, quarter, mode }: { history: QuarterRecord[]; rec: QuarterRecord; quarter: number; mode: V2PresentationMode }) {
  const devs = useMemo(() => materialDevelopments(rec, mode), [rec, mode]);
  const q = useMemo(() => boardQuestion(history, quarter), [history, quarter]);
  const KIND: Record<string, string> = { commercial: 'Commercial and market', decision: 'Management decision', capability: 'Capability and organization' };
  return (
    <section className="ds-grid ds-grid-main" data-testid="v2-briefing-quarter">
      <div data-testid="v2-developments">
        <p className="ds-eyebrow">Three material developments</p>
        <table className="ds-table ds-stack-sm">
          <thead><tr><th>Development</th><th className="num">Movement</th><th>Effect</th><th>Driver</th></tr></thead>
          <tbody>{devs.map(d => (
            <tr key={d.kind} data-kind={d.kind} data-testid={d.kind === 'decision' ? 'v2-consequence' : `v2-dev-${d.kind}`}>
              <td><span className="ds-method" style={{ display: 'block' }}>{KIND[d.kind]}</span>{d.kind === 'decision' ? <b>{d.label}</b> : d.label}{d.kind === 'decision' && <span className="ds-small" style={{ display: 'block', color: 'var(--ds-ink-2)' }}>{d.detail}</span>}</td>
              <td className="num" style={{ whiteSpace: 'nowrap' }}>{d.movement || '—'}</td>
              <td className={d.effect === 'favourable' ? 'ds-tone-good' : d.effect === 'unfavourable' ? 'ds-tone-bad' : 'ds-tone-neutral'}>{d.effect === 'neutral' ? '—' : d.effect === 'favourable' ? 'Favourable' : 'Unfavourable'}</td>
              <td className="ds-small">{d.driver}</td>
            </tr>
          ))}</tbody>
        </table>
        <p className="ds-method" style={{ margin: '6px 0 0' }}>Selected from this quarter’s recorded results. Arrows show direction; whether a movement helps the business is shown separately.</p>
      </div>
      <div className="ds-chapter-question" data-testid="v2-board-question" data-rule={q.rule} style={{ marginTop: 0 }}>
        <Icon name="target" size={18} />
        <div><span className="ds-method" style={{ display: 'block', fontWeight: 500 }}>The board’s question for {quarter < 8 ? calendarLabel(quarter + 1) : 'the final report'}</span>{q.text}</div>
      </div>
    </section>
  );
}

/** Starting position → decision → market movement → business impact → ending position. */
function QuarterSequence({ rec, quarter, attribution, pp, prevPrice }: { rec: QuarterRecord; quarter: number; attribution: AttributionRow[]; pp: PricePoint; prevPrice: number }) {
  const b = rec.before, a = rec.after;
  const inv = BUCKETS.filter(k => (rec.input.allocation[k] ?? 0) > 0).map(k => `${BUCKET_INFO[k].short} ${fmtM(rec.input.allocation[k])}`);
  const kept = rec.input.allocation.cashReserve ?? 0;
  const extra = [rec.input.destination && 'strategic destination committed', rec.input.opportunity && (rec.input.opportunity.accept ? 'contract accepted' : 'contract declined'),
    rec.input.management && Object.keys(rec.input.management).length > 0 && 'recession actions', rec.input.crisisResponse && 'crisis response', rec.input.finalOption && 'final strategic move',
    (rec.input.financing ?? []).length > 0 && 'financing'].filter(Boolean) as string[];
  const market = attribution.filter(r => r.components.some(c => c.kind === 'market' && Math.abs(c.amount) >= 0.05));
  const mUp = market.filter(r => { const m = r.components.find(c => c.kind === 'market')!.amount; return (m > 0) === (r.better === 'higher'); }).length;
  const steps: { id: string; label: string; body: string }[] = [
    { id: 'start', label: `Starting position (${calendarShort(quarter - 1)})`, body: `Revenue ${fmtM(b.revenue)} · operating profit ${fmtM(b.operatingProfit)} · cash ${fmtM(b.cash)} · share price ${fmtPrice(prevPrice)}` },
    { id: 'decision', label: 'Decision', body: `${inv.length ? `Invested ${inv.join(', ')}` : 'No strategic investment'}${kept > 0.005 ? `; kept ${fmtM(kept)} as cash` : ''}${extra.length ? `; ${extra.join(', ')}` : ''}.` },
    { id: 'market', label: 'Market movement', body: market.length ? `Market conditions moved ${market.length} commercial indicator${market.length === 1 ? '' : 's'}: ${mUp} in your favour, ${market.length - mUp} against. The same conditions applied to every team.` : 'Market conditions had no material effect on your indicators this quarter.' },
    { id: 'impact', label: 'Business impact', body: `Revenue ${fmtSigned(a.revenue - b.revenue)}, operating profit ${fmtSigned(a.operatingProfit - b.operatingProfit)}, cash ${fmtSigned(a.cash - b.cash)}; share price ${fmtPriceDelta(pp.price - prevPrice)}.` },
    { id: 'end', label: `Ending position (${calendarShort(quarter)})`, body: `Revenue ${fmtM(a.revenue)} · operating profit ${fmtM(a.operatingProfit)} · cash ${fmtM(a.cash)} · share price ${fmtPrice(pp.price)}` },
  ];
  return (
    <section data-testid="v2-sequence">
      <p className="ds-eyebrow">The quarter in sequence</p>
      <table className="ds-table ds-seq"><tbody>
        {steps.map((st, i) => <tr key={st.id} data-step={st.id}><td><span className="ds-muted" style={{ marginRight: 6 }}>{i + 1}</span><b>{st.label}</b></td><td>{st.body}</td></tr>)}
      </tbody></table>
    </section>
  );
}
const fmtSigned = (x: number) => (Math.abs(x) < 0.05 ? '±$0.0M' : `${x > 0 ? '+' : '−'}$${Math.abs(x).toFixed(1)}M`);

function ConsequenceView({ c }: { c: DecisionConsequence }) {
  return (
    <section className="ds-section ds-consequence" data-testid="v2-consequence-detail" data-consequence={c.id}>
      <p className="ds-eyebrow">Your biggest decision consequence</p>
      <p className="ds-consequence-decision">{c.decision}</p>
      <div className="ds-consequence-rows">
        <div><p className="ds-h4">Immediate consequence</p><div className="ds-small">{c.immediate}</div></div>
        <div><p className="ds-h4">Longer-term</p><div className="ds-small">{c.longerTerm}</div></div>
        <div><p className="ds-h4">Still uncertain</p><div className="ds-small">{c.uncertainty}</div></div>
      </div>
    </section>
  );
}

/** Waterfall from opening to closing cash using the engine's recorded ledger values only. */
export function BridgeView({ bridge, mode }: { bridge: CashBridge; mode: V2PresentationMode }) {
  type Row = { label: string; value: number; kind: 'total' | 'pos' | 'neg'; from: number; to: number; sub?: { label: string; amount: number }[]; testId: string };
  const rows: Row[] = [];
  let run = bridge.opening;
  rows.push({ label: 'Opening cash', value: bridge.opening, kind: 'total', from: 0, to: bridge.opening, testId: 'opening' });
  const step = (label: string, delta: number, testId: string, sub?: Row['sub'], always = true) => {
    if (!always && Math.abs(delta) < 0.005) return;
    rows.push({ label, value: delta, kind: delta >= 0 ? 'pos' : 'neg', from: run, to: run + delta, sub, testId });
    run += delta;
  };
  step('Operating profit', bridge.operatingProfit, 'operating-profit');
  step('Strategic investment', -bridge.investment, 'investment');
  step('Event costs', -bridge.eventCosts, 'event-costs', bridge.eventItems.map(i => ({ label: i.label, amount: -i.amount })), mode === 'mba');
  step('Financing', bridge.financing, 'financing', bridge.financingItems, mode === 'mba');
  rows.push({ label: 'Closing cash', value: bridge.closing, kind: 'total', from: 0, to: bridge.closing, testId: 'closing' });
  const lo = Math.min(0, ...rows.flatMap(r => [r.from, r.to])), hi = Math.max(...rows.flatMap(r => [r.from, r.to]));
  const x = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const signed = (v: number, k: Row['kind']) => k === 'total' ? fmtM(v) : Math.abs(v) < 0.05 ? '$0.0M' : `${v >= 0 ? '+' : '−'}$${Math.abs(v).toFixed(1)}M`;
  return (
    <section className="ds-panel" data-testid="v2-cash-bridge" data-reconciles={bridge.reconciles}>
      <p className="ds-eyebrow">How your cash changed</p>
      <div className="ds-bridge">
        {rows.map(r => (
          <div key={r.testId}>
            <div className={`ds-bridge-row ${r.testId === 'closing' ? 'total' : ''}`} data-testid={`v2-bridge-${r.testId}`} data-value={r.value}>
              <span>{r.label}</span>
              <span className="ds-bridge-track" aria-hidden><span className={`ds-bridge-bar ${r.kind}`} style={{ left: `${x(Math.min(r.from, r.to))}%`, width: `${Math.max(0.6, Math.abs(x(r.to) - x(r.from)))}%` }} /></span>
              <span className="ds-bridge-val">{signed(r.value, r.kind)}</span>
            </div>
            {mode === 'mba' && r.sub && r.sub.length > 0 && r.sub.map((s2, i) => (
              <div key={i} className="ds-bridge-row sub"><span>· {s2.label}</span><span /><span className="ds-bridge-val">{`${s2.amount >= 0 ? '+' : '−'}$${Math.abs(s2.amount).toFixed(1)}M`}</span></div>
            ))}
          </div>
        ))}
      </div>
      <p className="ds-muted" style={{ margin: '10px 0 0' }}>{mode === 'mba'
        ? `Opening + operating profit − strategic investment − event costs + financing = closing (${bridge.reconciles ? 'reconciles with the engine ledger' : 'see ledger'}). Money kept as cash is simply not spent.`
        : 'Money you kept as cash was simply not spent. Event costs and financing appear when they happen.'}</p>
    </section>
  );
}

const TABS = [
  { id: 'overview', label: 'Executive overview' },
  { id: 'financial', label: 'Financial' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'product', label: 'Product and capability' },
  { id: 'organization', label: 'Organization' },
  { id: 'price', label: 'Share price' },
  { id: 'scorecards', label: 'Executive scorecards' },
] as const;

/** Executive intelligence dashboard: overview, four functional sections, share price and scorecards. */
export function ExecutiveIntelligence({ history, quarter, mode }: { history: QuarterRecord[]; quarter: number; mode: V2PresentationMode }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('overview');
  const data = useMemo(() => dashboardData(history, quarter), [history, quarter]);
  const val = useMemo(() => valuationSeries(history.slice(0, quarter)), [history, quarter]);
  const health = useMemo(() => healthMovements(history, quarter), [history, quarter]);
  const [role, setRole] = useState<V2Role>('CEO');
  const cards = useMemo(() => allScorecards(history.slice(0, quarter), quarter), [history, quarter]);
  const s = history[quarter - 1].after;
  const trend = trendSeries(history.slice(0, quarter));
  const margin = s.revenue > 0 ? s.operatingProfit / s.revenue : 0;
  return (
    <Section eyebrow="Executive intelligence" testId="v2-explore">
      <div className="ds-tabs" role="tablist" aria-label="Executive intelligence">
        {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} data-testid={`v2-tab-${t.id}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'overview' && (
        <div className="ds-stack-lg" data-testid="v2-overview">
          <div className="ds-grid ds-grid-kpi" data-testid="v2-overview-kpis">
            {[
              { l: 'Revenue', v: fmtM(s.revenue) }, { l: 'Operating profit', v: fmtM(s.operatingProfit) }, { l: 'Operating margin', v: `${(margin * 100).toFixed(1)}%` },
              { l: 'Cash', v: fmtM(s.cash) }, { l: 'Share price', v: fmtPrice(val.points[quarter].price) },
            ].map(k => <div key={k.l} className="ds-kpi"><span className="ds-kpi-label"><Termed label={k.l} /></span><span className="ds-kpi-value">{k.v}</span></div>)}
          </div>
          <div className="ds-grid ds-grid-3" data-testid="v2-charts">
            <div><p className="ds-h4">Revenue</p><LineChart testId="v2-chart-revenue" label="Revenue by quarter" points={trend.map(t => ({ x: t.quarter, y: t.revenue }))} format={v => `$${v.toFixed(0)}M`} zeroLine={false} color="var(--nx-ink)" reference={{ y: trend[0].revenue, label: calendarShort(0) }} /></div>
            <div><p className="ds-h4"><Term id="operating-profit">Operating profit</Term></p><LineChart testId="v2-chart-op" label="Operating profit by quarter" points={trend.map(t => ({ x: t.quarter, y: t.operatingProfit }))} format={v => `$${v.toFixed(0)}M`} color="var(--nx-ink)" reference={{ y: trend[0].operatingProfit, label: calendarShort(0) }} /></div>
            <div><p className="ds-h4">Share price</p><LineChart testId="v2-chart-price-mini" label="Share price by quarter" points={val.points.map(p => ({ x: p.quarter, y: p.price }))} format={v => `$${v.toFixed(0)}`} zeroLine={false} color="var(--nx-forest)" reference={{ y: 100, label: '$100' }} /></div>
          </div>
          <div>
            <p className="ds-h4">Business health — movement this quarter and since {calendarLabel(0)}</p>
            <HealthTable rows={health} quarter={quarter} mode={mode} />
          </div>
        </div>
      )}
      {tab === 'financial' && (
        <div className="ds-stack-lg">
          <MetricExplorer data={data} section="financial" />
          <div className="ds-table-wrap">
            <table className="ds-table ds-table-compact" data-testid="v2-cash-history">
              <caption>Cash movement by quarter (recorded ledger)</caption>
              <thead><tr><th>Quarter</th><th className="num">Opening</th><th className="num">Operating profit</th><th className="num">Investment</th><th className="num">One-off costs</th><th className="num">Financing</th><th className="num">Closing</th></tr></thead>
              <tbody>{history.slice(0, quarter).map(h => { const b = cashBridge(h); return <tr key={h.quarter}><td>{calendarLabel(h.quarter)}</td><td className="num">{fmtM(b.opening)}</td><td className="num">{fmtSigned(b.operatingProfit)}</td><td className="num">{fmtSigned(-b.investment)}</td><td className="num">{fmtSigned(-b.eventCosts)}</td><td className="num">{fmtSigned(b.financing)}</td><td className="num"><b>{fmtM(b.closing)}</b></td></tr>; })}</tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'commercial' && (
        <div className="ds-stack-lg">
          <MetricExplorer data={data} section="commercial" />
          <div className="ds-grid ds-grid-side">
            <div><p className="ds-h4">Revenue by business</p><SegmentMix data={data} /></div>
            <table className="ds-table ds-table-compact">
              <thead><tr><th>Business</th><th className="num">{calendarShort(0)}</th><th className="num">{calendarShort(quarter)}</th><th className="num">Change</th></tr></thead>
              <tbody>{(['consumer', 'enterprise', 'aiNative', 'university'] as const).map(k => {
                const now = s.segmentRevenue[k], st = data.states[0].segmentRevenue[k];
                return <tr key={k}><td>{{ consumer: 'Consumer', enterprise: 'Enterprise', aiNative: 'AI-native', university: 'University' }[k]}</td><td className="num ds-muted">{fmtM(st)}</td><td className="num">{fmtM(now)}</td><td className="num"><Move d={now - st} eps={0.05} tone={Math.abs(now - st) < 0.05 ? 'neutral' : now > st ? 'good' : 'bad'} text={fmtSigned(now - st)} /></td></tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'product' && <MetricExplorer data={data} section="product" />}
      {tab === 'organization' && <MetricExplorer data={data} section="organization" />}
      {tab === 'price' && <SharePricePanel val={val} quarter={quarter} mode={mode} />}
      {tab === 'scorecards' && (
        <div className="ds-stack" data-testid="v2-scorecards">
          <Segmented testIdPrefix="v2-scorecard-role" value={role} onChange={setRole} options={SCORECARD_ROLES.map(r => ({ id: r, label: ROLE_SCORECARD_TITLE[r] }))} />
          <ScorecardView card={cards.find(c => c.role === role)!} mode={mode} />
        </div>
      )}
    </Section>
  );
}

function DeepAnalysis({ history, quarter, mode, consequences, cards }: { history: QuarterRecord[]; quarter: number; mode: V2PresentationMode; consequences: DecisionConsequence[]; cards: KpiCard[] }) {
  const rec = history[quarter - 1];
  const bm = benchmarks(history, quarter);
  const health = healthIndicators(rec.after);
  return (
    <div className="ds-stack-lg">
      <div>
        <p className="ds-h4">Financial diagnostics</p>
        <div className="ds-grid ds-grid-kpi" data-testid="v2-kpis">
          {cards.map(c => (
            <KpiTile key={c.id} testId={`v2-kpi-${c.id}`} label={<Termed label={c.label} />} value={c.display} explain={c.explain}
              delta={{ direction: c.direction, tone: c.tone, text: c.id === 'liquidity' ? c.deltaDisplay : deltaText(c) }}
              previous={`Last quarter: ${c.previousDisplay}`} footnote={c.id !== 'liquidity' ? c.vsStart : undefined} />
          ))}
        </div>
      </div>
      {consequences.length > 1 && (
        <div data-testid="v2-all-consequences">
          <p className="ds-h4">Every decision this quarter</p>
          <div className="ds-stack">{consequences.map(c => (
            <div key={c.id} className="ds-small" style={{ borderTop: '1px solid var(--ds-line)', paddingTop: 10 }}>
              <b>{c.decision}</b> {c.immediate} {c.longerTerm} <span className="ds-muted">{c.uncertainty}</span>
            </div>
          ))}</div>
        </div>
      )}
      {mode === 'mba' && (
        <div data-testid="v2-benchmarks">
          <p className="ds-h4">Benchmarks <span className="ds-muted" style={{ textTransform: 'none', letterSpacing: 0 }}>— starting company, previous quarter and engine thresholds; no invented industry data</span></p>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead><tr><th>Benchmark</th><th>Now</th><th>Reference</th><th /></tr></thead>
              <tbody>{bm.map(b => <tr key={b.label}><td>{b.label}</td><td>{b.current}</td><td>{b.reference}</td><td>{b.met === undefined ? '' : b.met ? <span className="ds-badge ds-badge-good"><Icon name="check" size={12} />met</span> : <span className="ds-badge ds-badge-warn"><Icon name="alert" size={12} />below</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
      {mode === 'mba' && (
        <div data-testid="v2-formulas">
          <p className="ds-h4">Evidence and formulas</p>
          <ul className="ds-list ds-small">{health.map(h => <li key={h.id}><b>{h.label}:</b> {h.formula}</li>)}</ul>
        </div>
      )}
    </div>
  );
}


function ReflectionCard({ ctl, mode, rec, history }: { ctl: V2TeamController; mode: V2PresentationMode; rec: ReturnType<typeof gameHistory>[number]; history: QuarterRecord[] }) {
  const game = ctl.game!;
  const q = game.record.completed_quarter;
  const saved = game.resolutions.find(r => r.quarter === q);
  const prior = decodeReflection(saved?.reflection);
  const [learning, setLearning] = useState<string[]>(prior?.learning ?? []);
  const [note, setNote] = useState(prior?.note ?? '');
  const [showNote, setShowNote] = useState(mode === 'mba' || !!prior?.note);
  const last = q >= V2_TOTAL_QUARTERS;
  const nextOpen = game.session.pacing === 'self' || game.session.open_quarter >= q + 1;
  const [waiting, setWaiting] = useState(!last && !!saved?.reflection && game.record.phase === 'reflect');
  const { reload, advance, error, setError } = ctl;
  const delib = saved?.deliberation as V2Deliberation | null | undefined;
  const evidence = reflectionEvidence(delib?.beliefId, rec.before, rec.after);
  const intent = accountabilityRows(q, delib, rec.input, mode);
  const { persistReflection } = ctl;

  // Batch 10A: save the reflection shortly after each change so a refresh keeps it (existing RPC, no migration).
  const encoded = encodeReflection({ v: 1, learning, note: note.trim() || undefined });
  const savedText = saved?.reflection ?? null;
  useEffect(() => {
    if (learning.length === 0 && !note.trim()) return;
    if (encoded === savedText) return;
    const t = setTimeout(() => void persistReflection(q, encoded), 700);
    return () => clearTimeout(t);
  }, [encoded, savedText, q, learning.length, note, persistReflection]);

  useEffect(() => {
    if (error && /has not been opened/.test(error)) { setError(null); setWaiting(true); }
  }, [error, setError]);
  useEffect(() => {
    if (!waiting) return;
    if (nextOpen) { setWaiting(false); void advance(['results', 'reflect', 'briefing']); return; }
    const t = setInterval(() => void reload(), 4000);
    return () => clearInterval(t);
  }, [waiting, nextOpen, reload, advance]);

  const proceed = () => void advance(['results', 'reflect', last ? 'final' : 'briefing'], { reflection: encoded });

  return (
    <Card title="Reflect and learn" sub="Expected → decided → happened → learned" icon="bulb" testId="v2-phase-reflect">
      <SegmentReflection rec={rec} history={history} quarter={q} />
      <div className="ds-grid ds-grid-2" style={{ marginTop: 18 }}>
        <div className="ds-stack">
          <div data-testid="v2-accountability">
            <p className="ds-h4">What we expected and decided</p>
            <dl className="ds-small" style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 9em) 1fr', gap: '4px 12px' }}>
              {intent.map(r => <div key={r.id} style={{ display: 'contents' }}><dt className="ds-muted">{r.label}</dt><dd style={{ margin: 0 }} data-testid={r.id === 'evidence' ? 'v2-expected' : `v2-acc-${r.id}`}>{r.text}</dd></div>)}
            </dl>
          </div>
          {saved?.agreement && (
            <div data-testid="v2-reflect-agreement">
              <p className="ds-h4">How you decided</p>
              <p style={{ margin: 0 }}>{AGREEMENTS.find(a => a.id === saved.agreement)?.label}</p>
            </div>
          )}
          <div>
            <p className="ds-h4">What happened</p>
            <table className="ds-table" data-testid="v2-what-happened">
              <tbody>{evidence.map(e => <tr key={e.label}><td>{e.label}</td><td>{e.before}</td><td><Icon name="arrow" size={12} /></td><td><b>{e.after}</b></td></tr>)}</tbody>
            </table>
            <p className="ds-muted" style={{ marginTop: 6 }}>{ACCOUNTABILITY_CAVEAT}</p>
          </div>
        </div>
        <div className="ds-stack">
          <p className="ds-h4">Knowing what you know now, what would you do differently?</p>
          <p className="ds-muted" style={{ margin: 0 }}>Choose at least one that fits. A written line is optional.</p>
          <ChoiceList multi name="learning" testIdPrefix="v2-learn" value={learning} onChange={setLearning} options={LEARNING_OPTIONS.map(o => ({ id: o.id, label: pick(mode, o.label) }))} />
          {showNote
            ? <textarea className="ds-input" data-testid="v2-reflection" maxLength={3000} value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={mode === 'mba' ? 'Optional: what would you do differently, and why?' : 'Optional: one thing we would do differently'} />
            : <button className="ds-btn ds-btn-ghost" onClick={() => setShowNote(true)}>+ Add one line (optional)</button>}
        </div>
      </div>
      {waiting ? (
        <div className="ds-callout" data-testid="v2-waiting" style={{ marginTop: 12 }}><Icon name="clock" />Reflection saved. Waiting for the facilitator to open {calendarLabel(q + 1)}…</div>
      ) : (
        <div className="ds-actions">
          <button className="ds-btn ds-btn-primary" data-testid="v2-next-quarter" disabled={ctl.busy || learning.length === 0} onClick={proceed}>
            {last ? 'Save and see the final report' : `Save and continue to ${calendarLabel(q + 1)}`} <Icon name="arrow" />
          </button>
        </div>
      )}
    </Card>
  );
}

/** All four businesses: start, now, this quarter, money allocated, and the capability behind each. */
function SegmentReflection({ history, quarter }: { rec: QuarterRecord; history: QuarterRecord[]; quarter: number }) {
  const rows = segmentReflection(history, quarter);
  const neglected = rows.filter(r => r.neglected);
  return (
    <div data-testid="v2-reflect-segments">
      <p className="ds-h4">All four businesses</p>
      <div className="ds-table-wrap">
        <table className="ds-table ds-table-compact">
          <thead><tr><th>Business</th><th className="num">Revenue {calendarShort(0)}</th><th className="num">Now</th><th className="num">This quarter</th><th className="num">Invested this quarter</th><th className="num">Invested to date</th><th className="num">Capability {calendarShort(0)} → now</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.key} data-segment={r.key}>
              <td>{r.label}</td>
              <td className="num ds-muted">{fmtM(r.start)}</td>
              <td className="num"><b>{fmtM(r.current)}</b></td>
              <td className="num"><Move d={r.quarterMove} eps={0.05} tone={Math.abs(r.quarterMove) < 0.05 ? 'neutral' : r.quarterMove > 0 ? 'good' : 'bad'} text={fmtSigned(r.quarterMove)} /></td>
              <td className="num">{fmtM(r.allocatedThisQuarter)}</td>
              <td className="num">{fmtM(r.allocatedTotal)}</td>
              <td className="num">{r.capabilityStart.toFixed(0)} → {r.capabilityNow.toFixed(0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {neglected.length > 0 && <ul className="ds-list ds-small" data-testid="v2-reflect-neglected" style={{ marginTop: 8 }}>{neglected.map(r => <li key={r.key}>{r.neglected}</li>)}</ul>}
      <p className="ds-method" style={{ margin: '6px 0 0' }}>Recorded values only. Each business also depends on shared capabilities such as talent, trust and product quality, and on market conditions.</p>
    </div>
  );
}

/** Batch 10A: "Looking back: which signals mattered?" — shown only once Q4 is completed (gate in insights/signalReveal.ts). */
function SignalReveal({ history, quarter, cited }: { history: QuarterRecord[]; quarter: number; cited: string[] }) {
  const rows = useMemo(() => buildSignalReveal(history, quarter, cited), [history, quarter, cited]);
  const [open, setOpen] = useState(quarter === 4);
  if (!rows) return null;
  return (
    <details className="ds-fold" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)} data-testid="v2-signal-reveal">
      <summary><span>Looking back: which signals mattered?</span><span className="ds-fold-hint">The {calendarLabel(3)} evidence, compared with what the market did</span></summary>
      <div className="ds-fold-body ds-stack">
        <p style={{ margin: 0 }}>{SIGNAL_REVEAL_SUMMARY}</p>
        <div data-testid="v2-reveal-rows">{rows.map(r => (
          <div className="ds-reveal-row" key={r.id} data-signal={r.id} data-verdict={r.verdict}>
            <div><span className="ds-muted ds-small" style={{ display: 'block' }}>{r.source}{r.cited ? ' · you cited this' : ''}</span>{r.headline}</div>
            <div><b>{r.verdictLabel}.</b> {r.showed}<span className="ds-muted" style={{ display: 'block', marginTop: 2 }}>{r.lesson}</span></div>
            <div className="ds-small"><span className="ds-muted" style={{ display: 'block' }}>Your records, start of {calendarShort(3)} → end of {calendarShort(4)}</span>{r.recorded.map(m => <span key={m.label} style={{ display: 'block' }}>{m.label}: {m.start} → {m.end}</span>)}</div>
          </div>
        ))}</div>
        <p className="ds-method" style={{ margin: 0 }}>Assessments describe the scenario’s market in {calendarLabel(3)} only. Your records also reflect your own decisions, so they are shown, not interpreted.</p>
      </div>
    </details>
  );
}
