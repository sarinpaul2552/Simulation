import { useMemo, useState, Fragment } from 'react';
import { calendarLabel, calendarShort } from '../../content/calendar';
import type { V2TeamController } from '../useV2Team';
import type { V2PresentationMode } from '../../content/modes';
import { buildLearningReport, Finding } from '../../insights/report';
import { gameHistory } from '../../insights/history';
import { configOf } from '../../engine';
import { PATH_INFO } from '../../content/paths';
import { fmtM } from '../../insights/dashboard';
import { kpiDashboard, type KpiDashboardRow } from '../../insights/intelligence';
import { valuationSeries, fmtPrice, fmtPriceDelta, fmtPctDelta, FACTOR_INFO } from '../../insights/valuation';
import { allScorecards, EXECUTIVE_VERSION } from '../../insights/executive';
import { V2_DESTINATIONS } from '../../../../simulation/engineV2Destination';
import { COMPANY } from '../../content/company';
import { AGREEMENTS } from './CommitStage';
import { FINAL_LABELS } from '../format';
import { Icon, LineChart, Meter } from '../ds/components';
import { Term } from '../ds/glossary';
import { ScorecardView } from '../ds/intel';
import { boardVerdict, defensePrompts, type DefensePrompt } from '../../insights/boardVerdict';
import { ownTeam, intentOutcomeRows, rationalePrompts, type RationalePrompt } from '../../insights/intentOutcome';
import type { TimelineRow } from '../../insights/facilitator';

const GATE_TEXT: Record<string, string> = {
  'terminal-insolvency': 'The company ended the game insolvent, which caps the business performance score.',
  'rescued-insolvency': 'The company was insolvent at some point and had to be rescued, which caps the business performance score.',
  'organizational-collapse': 'Trust, culture or talent collapsed, which caps the business performance score.',
};
const lvl = (x: number): 'Strong' | 'Fair' | 'Weak' => (x >= 67 ? 'Strong' : x >= 40 ? 'Fair' : 'Weak');
const fmtS = (x: number) => (Math.abs(x) < 0.05 ? '±$0.0M' : `${x > 0 ? '+' : '−'}$${Math.abs(x).toFixed(1)}M`);

/** Q8 board report: a board paper on eight quarters of leadership, plus the printable board defense. */
export function FinalStage({ ctl, mode }: { ctl: V2TeamController; mode: V2PresentationMode }) {
  const game = ctl.game!;
  const report = useMemo(() => buildLearningReport(game.snapshot, mode), [game.snapshot, mode]);
  const history = useMemo(() => gameHistory(game.snapshot), [game.snapshot]);
  const val = useMemo(() => valuationSeries(history), [history]);
  const kpis = useMemo(() => kpiDashboard(history), [history]);
  const cards = useMemo(() => allScorecards(history), [history]);
  const verdict = useMemo(() => boardVerdict(history), [history]);
  const prompts = useMemo(() => defensePrompts(history), [history]);
  // Batch 10E: the team's own recorded intent next to what it decided, what happened and what it learned.
  const own = useMemo(() => ownTeam(game.teamName, game.resolutions, configOf(game.snapshot)), [game.teamName, game.resolutions, game.snapshot]);
  const intent = useMemo(() => intentOutcomeRows(own, mode), [own, mode]);
  const rationale = useMemo(() => rationalePrompts(own, mode), [own, mode]);
  const s = game.snapshot.state;
  const s0 = val.points[0];
  const end = val.points[val.points.length - 1];
  const sc = report.score;
  const gates = sc.gates.filter(g => g.triggered);
  const agreementOf = (q: number) => game.resolutions.find(r => r.quarter === q)?.agreement;
  const strategy = s.destination ? V2_DESTINATIONS[s.destination.id].name : '—';
  const finalMove = s.final.record ? FINAL_LABELS[s.final.record.option] : '—';
  let n = 0;
  const sec = () => ++n;
  return (
    <div className="ds-stack-lg" data-testid="v2-phase-final">
      <article className="ds-report" data-testid="v2-final">
        <header className="ds-report-head">
          <span className="ds-verdict-kicker">Board report · {COMPANY.name} ({COMPANY.ticker}) · {calendarLabel(0)} – {calendarLabel(8)}</span>
          <h1>{game.teamName}: eight quarters of leadership</h1>
          <div className="ds-report-meta">
            <span>Strategy: <b>{strategy}</b></span>
            <span>Final decision: <b data-testid="v2-final-option">{finalMove}</b></span>
            <span data-testid="v2-final-market">Market: <b>{game.snapshot.marketPath ? PATH_INFO[game.snapshot.marketPath].name : 'Original NexLearn'}</b></span>
            <span>Prepared from recorded simulation results</span>
          </div>
          <div className="ds-actions ds-no-print" style={{ marginTop: 10, justifyContent: 'flex-start' }}>
            <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => window.print()} data-testid="v2-print-report"><Icon name="news" size={14} /> Print or save as PDF</button>
          </div>
        </header>

        <section className="ds-report-section" data-testid="v2-board-verdict">
          <h2>Board verdict: what kind of company did this leadership team build?</h2>
          <p className="ds-conclusion" style={{ marginBottom: 12 }}>{report.conclusion}</p>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead><tr><th>Dimension</th><th>Assessment</th><th>Evidence</th><th className="num">{calendarShort(0)}</th><th className="num">{calendarShort(8)}</th><th>Last two quarters</th></tr></thead>
              <tbody>{verdict.map(d => d.evidence.map((e, i) => (
                <tr key={`${d.id}-${i}`} data-dimension={i === 0 ? d.id : undefined} data-assessment={i === 0 ? d.assessment : undefined}>
                  {i === 0 && <td rowSpan={d.evidence.length} style={{ verticalAlign: 'top' }}><b>{d.label}</b><span className="ds-small" style={{ display: 'block', color: 'var(--ds-ink-2)' }}>{d.summary}</span></td>}
                  {i === 0 && <td rowSpan={d.evidence.length} style={{ verticalAlign: 'top' }} className={d.assessment === 'Strong' ? 'ds-tone-good' : d.assessment === 'Weak' ? 'ds-tone-bad' : 'ds-tone-neutral'}><b>{d.assessment}</b></td>}
                  <td className="ds-small" style={{ paddingLeft: 8 }}>{e.label}</td>
                  <td className="num ds-muted">{e.start}</td>
                  <td className="num"><b>{e.end}</b></td>
                  <td className="ds-small">{e.trend}</td>
                </tr>
              )))}</tbody>
            </table>
          </div>
          <details className="ds-perspectives" style={{ marginTop: 8 }}><summary>How each assessment is decided</summary>
            <ul className="ds-list ds-small" style={{ marginTop: 6 }}>{verdict.map(d => <li key={d.id}><b>{d.label}.</b> {d.rule}</li>)}</ul>
          </details>
        </section>

        <section className="ds-report-section" data-testid="v2-report-summary">
          <h2><span className="ds-sec-n">{sec()}</span>Executive summary</h2>
          <div className="ds-figures" data-testid="v2-report-headline">
            <div className="ds-figure"><span className="ds-fig-label">Share price (simulated)</span><span className="ds-fig-value" data-testid="v2-report-price">{fmtPrice(end.price)}</span><div className="ds-fig-sub">{fmtPctDelta(end.sinceStartPct)} from $100.00</div></div>
            <div className="ds-figure"><span className="ds-fig-label">Quarterly revenue</span><span className="ds-fig-value">{fmtM(s.revenue)}</span><div className="ds-fig-sub">{fmtS(s.revenue - history[0].before.revenue)} vs {calendarShort(0)}</div></div>
            <div className="ds-figure"><span className="ds-fig-label"><Term id="operating-profit">Operating profit</Term></span><span className="ds-fig-value">{fmtM(s.operatingProfit)}</span><div className="ds-fig-sub">{fmtS(s.operatingProfit - history[0].before.operatingProfit)} vs {calendarShort(0)}</div></div>
            <div className="ds-figure"><span className="ds-fig-label">Cash</span><span className="ds-fig-value">{fmtM(s.cash)}</span><div className="ds-fig-sub">Debt {fmtM(s.financing.debt)}</div></div>
          </div>
          <p className="ds-conclusion" style={{ marginTop: 16 }} data-testid="v2-conclusion">{report.conclusion}</p>
          {gates.length > 0 && <div className="ds-notice ds-notice-bad" style={{ marginTop: 12 }}><Icon name="alert" />{gates.map(g => GATE_TEXT[g.id] ?? g.id).join(' ')}</div>}
          <div style={{ marginTop: 16 }}>
            <p className="ds-h4">Four lenses on the same company — reported separately, never combined</p>
            <div className="ds-table-wrap">
            <table className="ds-table ds-table-compact" data-testid="v2-three-measures">
              <tbody>
                <tr><td><b>Terminal simulation score</b><span className="ds-method" style={{ display: 'block' }}>The simulation’s own evaluation of the company built: finances, strategic position and organization.</span></td><td className="num"><span className="ds-score-big" data-testid="v2-final-overall">{sc.overall.toFixed(1)}</span><span className="ds-muted"> / 100</span></td></tr>
                <tr><td><b>Shareholder value</b><span className="ds-method" style={{ display: 'block' }}>The simulated share price, from $100 at {calendarLabel(0)}.</span></td><td className="num"><b>{fmtPrice(end.price)}</b></td></tr>
                <tr><td><b>Executive functional scores</b><span className="ds-method" style={{ display: 'block' }}>How the company performed under each function’s responsibilities (section 8) — not individual students.</span></td><td className="num ds-small ds-wrap">{cards.map(c => `${c.role === 'Product' ? 'CPO' : c.role === 'Growth' ? 'CGO' : c.role === 'People' ? 'CPeO' : c.role} ${c.functional.toFixed(0)}`).join(' · ')}</td></tr>
                <tr><td><b>Board assessment</b><span className="ds-method" style={{ display: 'block' }}>Rule-based reading of the KPI evidence in the board verdict above.</span></td><td className="num ds-small ds-wrap">{verdict.map(d => `${d.label.split(' ')[0]} ${d.assessment.toLowerCase()}`).join(' · ')}</td></tr>
              </tbody>
            </table>
            </div>
          </div>
          <div className="ds-figures" style={{ marginTop: 16 }} data-testid="v2-final-dimensions">
            {report.dimensions.map(d => (
              <div className="ds-figure" key={d.id}>
                <span className="ds-fig-label">{d.label}</span>
                <span className="ds-fig-value" data-testid={`v2-final-${d.id}`}>{d.score.toFixed(1)}</span>
                <div className="ds-fig-sub">{lvl(d.score)} · {d.measures}</div>
              </div>
            ))}
          </div>
          {mode === 'mba' && (
            <div className="ds-grid ds-grid-3" style={{ marginTop: 12 }}>
              {report.dimensions.map(d => (
                <details key={d.id} className="ds-perspectives"><summary>{d.label} components</summary>
                  <div style={{ marginTop: 6 }}>{d.components.map(c => <Meter key={c.label} label={c.label} score={c.score} levelText={lvl(c.score)} />)}</div>
                </details>
              ))}
            </div>
          )}
        </section>

        <section className="ds-report-section" data-testid="v2-report-shareholder">
          <h2><span className="ds-sec-n">{sec()}</span>Shareholder value</h2>
          <div className="ds-grid ds-grid-side">
            <LineChart testId="v2-final-price-chart" label="Simulated share price by quarter" points={val.points.map(p => ({ x: p.quarter, y: p.price }))} format={v => `$${v.toFixed(0)}`} color="var(--nx-forest)" zeroLine={false} reference={{ y: 100, label: '$100 start' }} size="lg" />
            <table className="ds-table ds-table-compact">
              <tbody>
                <tr><td>{calendarLabel(0)}</td><td className="num">{fmtPrice(s0.price)}</td></tr>
                <tr><td>{calendarLabel(8)}</td><td className="num"><b>{fmtPrice(end.price)}</b></td></tr>
                <tr><td>Change</td><td className="num">{fmtPriceDelta(end.sinceStart)} ({fmtPctDelta(end.sinceStartPct)})</td></tr>
                <tr><td>From present performance</td><td className="num">{fmtPriceDelta(end.presentContribution)}</td></tr>
                <tr><td>From future expectations</td><td className="num">{fmtPriceDelta(end.expectationsContribution)}</td></tr>
                {end.ownership < 0.9995 && <tr><td>Ownership retained</td><td className="num">{(end.ownership * 100).toFixed(1)}%</td></tr>}
                {end.distress > 0 && <tr><td>Distress discount</td><td className="num ds-tone-bad">−{(end.distress * 100).toFixed(0)}%</td></tr>}
              </tbody>
            </table>
          </div>
          <table className="ds-table ds-table-compact" style={{ marginTop: 12 }}>
            <thead><tr><th>Valuation factor</th><th className="num">Weight</th><th className="num">{calendarShort(0)}</th><th className="num">{calendarShort(8)}</th></tr></thead>
            <tbody>{val.config.factors.map(k => <tr key={k}><td>{FACTOR_INFO[k].label} <span className="ds-muted">· {FACTOR_INFO[k].horizon === 'expectations' ? 'future expectations' : 'present performance'}</span></td><td className="num">{((val.config.weights[k] ?? 0) * 100).toFixed(0)}%</td><td className="num ds-muted">{(s0.factors[k] * 100).toFixed(0)}</td><td className="num">{(end.factors[k] * 100).toFixed(0)}</td></tr>)}</tbody>
          </table>
          <p className="ds-method">Simulated with a documented, deterministic model ({val.version}); the price does not feed back into the simulation. Present-vs-expectations split is the contribution of each factor group relative to {calendarLabel(0)}, before the distress discount, dilution and quarterly smoothing.</p>
        </section>

        {(['financial', 'commercial', 'product', 'organization'] as const).map(secId => (
          <section className="ds-report-section" key={secId} data-testid={`v2-report-${secId}`}>
            <h2><span className="ds-sec-n">{sec()}</span>{secId === 'financial' ? 'Financial performance' : secId === 'commercial' ? 'Commercial performance' : secId === 'product' ? 'Product and innovation' : 'People and organization'}</h2>
            <KpiTable rows={kpis.filter(k => k.section === secId)} testId={`v2-report-kpis-${secId}`} />
          </section>
        ))}

        <section className="ds-report-section" data-testid="v2-report-decisions">
          <h2><span className="ds-sec-n">{sec()}</span>Strategic decisions</h2>
          <DecisionHistory report={report} agreementOf={agreementOf} prices={val.points.map(p => p.price)} />
        </section>

        <section className="ds-report-section" data-testid="v2-report-intent">
          <h2><span className="ds-sec-n">{sec()}</span>Intent and outcome</h2>
          <IntentOutcome rows={intent} />
        </section>

        <section className="ds-report-section" data-testid="v2-report-scorecards">
          <h2><span className="ds-sec-n">{sec()}</span>Executive scorecards</h2>
          <ScorecardSummary cards={cards} mode={mode} />
        </section>

        <section className="ds-report-section" data-testid="v2-report-lessons">
          <h2><span className="ds-sec-n">{sec()}</span>Leadership lessons</h2>
          <div className="ds-grid ds-grid-2" data-testid="v2-interpretation">
            <FindingList testId="v2-strengths" title="What the team did well" items={report.strengths} empty="No standout strength in the data — look at the decision history for partial successes." />
            <FindingList testId="v2-struggles" title="Where the team struggled" items={report.struggles} empty="No major weakness stands out in the data." />
            <FindingList testId="v2-vulnerabilities" title="Strategic vulnerabilities" items={report.vulnerabilities} empty="No significant exposure is visible in the final company." />
            <FindingList testId="v2-not-pursued" title="Opportunities not pursued" items={report.notPursued} empty="The team funded every area and took the options in front of it." />
          </div>
          <div style={{ marginTop: 18 }} data-testid="v2-pivotal">
            <p className="ds-h4">Decisions that mattered most</p>
            <ul className="ds-list-plain">{report.pivotal.map(p => (
              <li key={p.quarter}><b>{calendarLabel(p.quarter)} — {p.decision}</b>
                <div className="ds-small">Immediately: {p.immediate} Longer term: {p.longerTerm}</div>
                {p.counterfactual && <div className="ds-small ds-muted">{p.counterfactual}</div>}</li>
            ))}</ul>
          </div>
          <div style={{ marginTop: 18 }} data-testid="v2-tradeoffs">
            <p className="ds-h4">Trade-offs, not a winning formula</p>
            <ol className="ds-numbered">{report.tradeoffs.map(t => <li key={t.title}><span><b>{t.title}.</b> <span className="ds-small">{t.text}</span></span></li>)}</ol>
          </div>
          <div style={{ marginTop: 18 }} data-testid="v2-questions">
            <p className="ds-h4">Questions for the team</p>
            <ul className="ds-list">{report.questions.map(q => <li key={q}>{q}</li>)}</ul>
          </div>
        </section>
      </article>

      <BoardDefense teamName={game.teamName} price={end.price} prompts={prompts} rationale={rationale} />
    </div>
  );
}

function KpiTable({ rows, testId }: { rows: KpiDashboardRow[]; testId: string }) {
  return (
    <div className="ds-table-wrap">
      <table className="ds-table" data-testid={testId}>
        <thead><tr><th>KPI</th><th className="num">{calendarShort(0)}</th><th className="num">{calendarShort(8)}</th><th className="num">Change</th><th className="num">%</th><th>Interpretation</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id}>
            <td>{r.glossary ? <Term id={r.glossary}>{r.label}</Term> : r.label}</td>
            <td className="num ds-muted">{r.start}</td>
            <td className="num"><b>{r.end}</b></td>
            <td className="num"><span className={`ds-tone-${r.tone}`}><span aria-hidden>{r.direction === 'up' ? '▲ ' : r.direction === 'down' ? '▼ ' : ''}</span>{r.change}</span></td>
            <td className="num ds-muted">{r.pct}</td>
            <td className="ds-small">{r.interpretation}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function DecisionHistory({ report, agreementOf, prices }: { report: ReturnType<typeof buildLearningReport>; agreementOf: (q: number) => string | null | undefined; prices: number[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="ds-table-wrap" data-testid="v2-decision-history">
      <table className="ds-table">
        <thead><tr><th>Quarter</th><th>Decision</th><th className="num">Revenue</th><th className="num">Op. profit</th><th className="num">Cash</th><th className="num">Share price</th><th className="ds-sr">Detail</th></tr></thead>
        <tbody>{report.timeline.map(t => {
          const ag = agreementOf(t.quarter);
          const isOpen = open === t.quarter;
          return (
            <Fragment key={t.quarter}>
              <tr data-testid={`v2-journey-q${t.quarter}`}>
                <td style={{ whiteSpace: 'nowrap' }}><b>{calendarLabel(t.quarter)}</b></td>
                <td className="ds-small">{t.decision}</td>
                <td className="num">{fmtM(t.revenue)}</td>
                <td className="num">{fmtM(t.operatingProfit)}</td>
                <td className="num">{fmtM(t.cash)}</td>
                <td className="num">{fmtPrice(prices[t.quarter])}</td>
                <td><button className="ds-btn ds-btn-ghost ds-no-print" style={{ fontSize: 'var(--fs-note)' }} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.quarter)}>{isOpen ? 'Hide' : 'More'}</button></td>
              </tr>
              {isOpen && (
                <tr><td colSpan={7} style={{ background: 'var(--ds-surface-2)' }} className="ds-small">
                  <div><b>Situation:</b> {t.event}</div>
                  <div><b>Major consequence:</b> {t.consequence}</div>
                  {ag && <div><b>How the team decided:</b> {AGREEMENTS.find(a => a.id === ag)?.label}</div>}
                </td></tr>
              )}
            </Fragment>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function ScorecardSummary({ cards, mode }: { cards: ReturnType<typeof allScorecards>; mode: V2PresentationMode }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="ds-stack">
      <div className="ds-table-wrap">
      <table className="ds-table" data-testid="v2-scorecard-summary">
        <thead><tr><th>Executive function</th><th className="num">Functional</th><th className="num ds-hide-sm">Company</th><th className="num">Executive score</th><th className="ds-hide-sm">Main challenge</th><th className="ds-sr">Detail</th></tr></thead>
        <tbody>{cards.map(c => (
          <tr key={c.role} data-role={c.role}>
            <td><b>{c.title}</b></td>
            <td className="num">{c.functional.toFixed(0)}</td>
            <td className="num ds-hide-sm">{c.company.toFixed(0)}</td>
            <td className="num"><b>{c.executive.toFixed(0)}</b></td>
            <td className="ds-small ds-hide-sm">{c.challenges[0] ?? <span className="ds-muted">None material</span>}</td>
            <td><button className="ds-btn ds-btn-ghost ds-no-print" style={{ fontSize: 'var(--fs-note)' }} onClick={() => setOpen(open === c.role ? null : c.role)} aria-expanded={open === c.role}>{open === c.role ? 'Hide' : 'Scorecard'}</button></td>
          </tr>
        ))}</tbody>
      </table>
      </div>
      {open && <ScorecardView card={cards.find(c => c.role === open)!} mode={mode} />}
      <p className="ds-method" style={{ margin: 0 }}>Scorecards rate how the team handled each function, not individual students; in a smaller team one person may have held several roles. Model {EXECUTIVE_VERSION}.</p>
    </div>
  );
}

function FindingList({ title, items, empty, testId }: { title: string; items: Finding[]; empty: string; testId: string }) {
  return (
    <div data-testid={testId}>
      <p className="ds-h4">{title}</p>
      {items.length
        ? <ul className="ds-list-plain">{items.map(f => <li key={f.title}><b>{f.title}.</b> <span className="ds-small" style={{ color: 'var(--ds-ink-2)' }}>{f.evidence}</span></li>)}</ul>
        : <p className="ds-muted">{empty}</p>}
    </div>
  );
}

/** Printable board defense: the board's question and a three-minute framework. */
function BoardDefense({ teamName, price, prompts, rationale }: { teamName: string; price: number; prompts: DefensePrompt[]; rationale: RationalePrompt[] }) {
  return (
    <section className="ds-defense" data-testid="v2-board-defense">
      <p className="ds-verdict-kicker">Board defense · {teamName}</p>
      <blockquote>“Your board gave you {COMPANY.name} at $100 per share. You had eight quarters to lead it. What value did you create — and was it sustainable?”</blockquote>
      <p className="ds-small" style={{ marginTop: 0 }}>Closing share price: <b>{fmtPrice(price)}</b>. Prepare a three-minute answer, as a leadership team:</p>
      <ol>
        <li><b>The value created (30 seconds).</b> Where the company stands against {calendarLabel(0)}: share price, revenue, profit and cash. State the number, then what it means.</li>
        <li><b>The strategy and why (45 seconds).</b> The direction you committed to, the evidence you had, and the trade-off you accepted.</li>
        <li><b>The decisive moments (45 seconds).</b> Two decisions that shaped the result — one that worked and one you would revisit — and what drove each outcome.</li>
        <li><b>Is it sustainable? (45 seconds).</b> Capabilities, customers, people and finances: what will carry the company forward, and what is exposed.</li>
        <li><b>What the board should expect next (15 seconds).</b> One commitment and one risk you would put before the board.</li>
      </ol>
      <div style={{ marginTop: 14 }} data-testid="v2-defense-prompts">
        <p className="ds-h4">Questions the board will ask — from your recorded results</p>
        <ul className="ds-list-plain">{prompts.map(p => <li key={p.id} data-prompt={p.id}><b>{p.question}</b><span className="ds-small" style={{ display: 'block', color: 'var(--ds-ink-2)' }}>{p.evidence}</span></li>)}</ul>
      </div>
      {rationale.length > 0 && (
        <div style={{ marginTop: 14 }} data-testid="v2-defense-rationale">
          <p className="ds-h4">Questions from your own recorded reasoning</p>
          <ul className="ds-list-plain">{rationale.map(p => <li key={p.id} data-prompt={p.id}><b>{p.question}</b><span className="ds-small" style={{ display: 'block', color: 'var(--ds-ink-2)' }}>{p.evidence}</span></li>)}</ul>
        </div>
      )}
      <div className="ds-stack" style={{ marginTop: 14, gap: 0 }} aria-hidden>{Array.from({ length: 5 }, (_, i) => <div key={i} className="ds-lines" />)}</div>
      <div className="ds-actions ds-no-print"><button className="ds-btn ds-btn-secondary" onClick={() => window.print()} data-testid="v2-print-defense">Print the board pack</button></div>
    </section>
  );
}

/** Batch 10E: per quarter, what the team intended, decided, saw happen and learned — recorded facts, no grade. */
function IntentOutcome({ rows }: { rows: TimelineRow[] }) {
  return (
    <div className="ds-stack" style={{ gap: 8 }}>
      <div className="ds-table-wrap">
        <table className="ds-table ds-table-compact" data-testid="v2-intent-outcome">
          <thead><tr><th>Quarter</th><th>What we intended</th><th>What we decided</th><th>What happened</th><th>What we learned</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.quarter} data-quarter={r.quarter}>
              <td style={{ whiteSpace: 'nowrap' }}><b>{calendarLabel(r.quarter)}</b></td>
              <td className="ds-small"><b>{r.cols.intended.priority ?? 'Not recorded'}</b>{r.cols.intended.belief && <div>{r.cols.intended.belief}{r.cols.intended.confidence ? ` (${r.cols.intended.confidence.toLowerCase()} confidence)` : ''}</div>}{r.cols.intended.signals.length > 0 && <div>Signals: {r.cols.intended.signals.join(' · ')}</div>}{r.cols.intended.risk && <div>Biggest risk: {r.cols.intended.risk}</div>}</td>
              <td className="ds-small">{r.cols.decided.allocation}{r.cols.decided.event && <div><b>{r.cols.decided.event}</b></div>}{r.pattern === 'adaptation' && <div className="ds-muted">{r.patternText}</div>}</td>
              <td className="ds-small">Revenue {r.cols.happened.revenue}<div>Share price {r.cols.happened.price}</div></td>
              <td className="ds-small">{r.cols.learned.choices.length ? r.cols.learned.choices.join(' · ') : <span className="ds-muted">Not recorded</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="ds-method" style={{ margin: 0 }}>Recorded intentions and results side by side. Results also reflect market conditions and earlier decisions; one quarter rarely proves a call right or wrong.</p>
    </div>
  );
}
