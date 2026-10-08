import { useEffect, useMemo, useState } from 'react';
import { V2_TOTAL_QUARTERS } from '../../adapter';
import type { V2TeamController } from '../useV2Team';
import type { V2PresentationMode } from '../../content/modes';
import { pick } from '../../content/modes';
import { gameHistory } from '../../insights/history';
import { financialCards, healthIndicators, trendSeries, benchmarks, fmtM } from '../../insights/dashboard';
import { quarterStory, Impact } from '../../insights/explain';
import { reflectionEvidence } from '../../insights/reflection';
import { BELIEFS, LEARNING_OPTIONS, encodeReflection, decodeReflection } from '../../content/deliberationContent';
import { Card, ChoiceList, Icon, KpiTile, LineChart, Meter, SegmentBars } from '../ds/components';

const KIND_LABEL: Record<Impact['kind'], { title: string; ug: string; icon: string }> = {
  market: { title: 'Market impact', ug: 'What the market did', icon: 'globe' },
  decision: { title: 'Management decision impact', ug: 'What your decisions did', icon: 'flag' },
  investment: { title: 'Delayed investment impact', ug: 'Earlier investments paying off', icon: 'clock' },
};

/** Stage 4 — Results & Learning: business dashboard, causes, and the structured reflection. */
export function ResultsStage({ ctl, mode }: { ctl: V2TeamController; mode: V2PresentationMode }) {
  const game = ctl.game!;
  const q = game.record.completed_quarter;
  const history = useMemo(() => gameHistory(game.snapshot), [game.snapshot]);
  const rec = history[q - 1];
  return (
    <div className="ds-stack" data-testid="v2-phase-results" data-results-quarter={q}>
      <QuarterDashboard history={history} quarter={q} mode={mode} />
      <ReflectionCard ctl={ctl} mode={mode} rec={rec} />
    </div>
  );
}

export function QuarterDashboard({ history, quarter, mode }: { history: ReturnType<typeof gameHistory>; quarter: number; mode: V2PresentationMode }) {
  const rec = history[quarter - 1];
  const cards = financialCards(history, quarter).filter(c => mode === 'mba' || ['revenue', 'operatingProfit', 'cash', 'liquidity'].includes(c.id));
  const story = quarterStory(rec.consequence, rec.after, mode);
  const health = healthIndicators(rec.after);
  const trend = trendSeries(history);
  const bm = benchmarks(history, quarter);
  const byKind = (k: Impact['kind']) => story.impacts.filter(i => i.kind === k).slice(0, mode === 'mba' ? 5 : 2);
  return (
    <div className="ds-stack" data-testid="v2-results">
      <div className="ds-row"><h2 style={{ margin: 0 }}>Q{quarter} results</h2><span className="ds-muted">Compared with {quarter === 1 ? 'the starting company' : `Q${quarter - 1}`}</span></div>
      <div className="ds-grid ds-grid-kpi" data-testid="v2-kpis">
        {cards.map(c => (
          <KpiTile key={c.id} testId={`v2-kpi-${c.id}`} label={c.label} value={c.display} explain={c.explain}
            delta={{ direction: c.direction, tone: c.tone, text: c.id === 'liquidity' ? c.deltaDisplay : `${c.deltaDisplay}${c.pct !== null && Math.abs(c.pct) >= 0.001 ? ` (${(c.pct * 100).toFixed(1)}%)` : ''}` }}
            previous={c.id === 'liquidity' ? `Last quarter: ${c.previousDisplay}` : `Last quarter: ${c.previousDisplay}`} footnote={mode === 'mba' && c.id !== 'liquidity' ? c.vsStart : undefined} />
        ))}
      </div>
      {/* Hidden machine-readable values for tests and assistive tech */}
      <span className="ds-sr" data-testid="v2-res-revenue">{fmtM(rec.after.revenue)}</span>
      <span className="ds-sr" data-testid="v2-res-cash">{fmtM(rec.after.cash)}</span>
      <span className="ds-sr" data-testid="v2-res-solvency">{rec.after.solvency.status}{rec.after.solvency.distressed ? ' · distressed' : ''}</span>

      <div className="ds-grid ds-grid-3" data-testid="v2-explanation">
        <StoryCard kind="challenge" title="Biggest challenge" icon="alert" impact={story.challenge} mode={mode} empty="No significant setback this quarter." />
        <StoryCard kind="opportunity" title="Biggest opportunity" icon="star" impact={story.opportunity} mode={mode} empty="No significant gain this quarter." />
        <div className="ds-story ds-story-watch" data-testid="v2-story-watch">
          <span className="ds-row"><Icon name="eye" /><b>What to watch next</b></span>
          <span>{story.watch ? story.watch.text : 'Nothing unusual is building up — keep an eye on your cash and customers.'}</span>
          {mode === 'mba' && story.watch && <span className="ds-muted">Source: {story.watch.detail}</span>}
        </div>
      </div>

      <div className="ds-grid ds-grid-main">
        <Card title="Trends" sub="Recorded quarters only" icon="chart" testId="v2-charts">
          <div className="ds-grid ds-grid-2">
            <div><p className="ds-h4">Revenue</p><LineChart testId="v2-chart-revenue" label="Revenue by quarter" points={trend.map(t => ({ x: t.quarter, y: t.revenue }))} format={v => `$${v.toFixed(0)}M`} zeroLine={false} /></div>
            <div><p className="ds-h4">Cash</p><LineChart testId="v2-chart-cash" label="Cash by quarter" points={trend.map(t => ({ x: t.quarter, y: t.cash }))} format={v => `$${v.toFixed(0)}M`} color="var(--ds-s3)" /></div>
            {mode === 'mba' && <div><p className="ds-h4">Operating profit</p><LineChart testId="v2-chart-op" label="Operating profit by quarter" points={trend.map(t => ({ x: t.quarter, y: t.operatingProfit }))} format={v => `$${v.toFixed(0)}M`} color="var(--ds-s2)" /></div>}
            {mode === 'mba' && <div><p className="ds-h4">Revenue by business</p><SegmentBars testId="v2-chart-segments" rows={trend.map(t => ({ quarter: t.quarter, values: [
              { key: 'consumer', label: 'Consumer', value: t.segments.consumer }, { key: 'enterprise', label: 'Enterprise', value: t.segments.enterprise },
              { key: 'aiNative', label: 'AI-native', value: t.segments.aiNative }, { key: 'university', label: 'University', value: t.segments.university }] }))} /></div>}
          </div>
        </Card>
        <Card title="Business health" sub="Dashboard interpretation — not your score" icon="target" testId="v2-health">
          <div className="ds-stack" style={{ gap: 4 }}>
            {health.map(h => <Meter key={h.id} testId={`v2-health-${h.id}`} label={h.label} score={h.score} levelText={h.level} sub={mode === 'mba' ? `${h.summary}` : undefined} />)}
          </div>
          {mode === 'mba' && <details className="ds-small" style={{ marginTop: 8 }}><summary>How these are calculated</summary><ul className="ds-list">{health.map(h => <li key={h.id}><b>{h.label}:</b> {h.formula}</li>)}</ul></details>}
        </Card>
      </div>

      <Card title={mode === 'mba' ? 'What drove the quarter' : 'Why it happened'} icon="bulb" testId="v2-impacts">
        <div className="ds-grid ds-grid-3">
          {(['market', 'decision', 'investment'] as const).map(k => (
            <div key={k} data-testid={`v2-impacts-${k}`}>
              <p className="ds-h4 ds-row"><Icon name={KIND_LABEL[k].icon} size={14} />{mode === 'mba' ? KIND_LABEL[k].title : KIND_LABEL[k].ug}</p>
              {byKind(k).length ? <ul className="ds-list ds-small">{byKind(k).map((i, n) => <li key={n} className={i.polarity > 0 ? 'ds-tone-good' : 'ds-tone-bad'}>{i.text}</li>)}</ul> : <p className="ds-muted">Nothing significant.</p>}
            </div>
          ))}
        </div>
      </Card>

      {mode === 'mba' && (
        <Card title="Benchmarks" sub="Starting company, previous quarter and engine thresholds — no invented industry data" icon="flag" testId="v2-benchmarks">
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead><tr><th>Benchmark</th><th>Now</th><th>Reference</th><th /></tr></thead>
              <tbody>{bm.map(b => <tr key={b.label}><td>{b.label}</td><td>{b.current}</td><td>{b.reference}</td><td>{b.met === undefined ? '' : b.met ? <span className="ds-badge ds-badge-good"><Icon name="check" size={12} />met</span> : <span className="ds-badge ds-badge-warn"><Icon name="alert" size={12} />below</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StoryCard({ kind, title, icon, impact, mode, empty }: { kind: 'challenge' | 'opportunity'; title: string; icon: string; impact: Impact | null; mode: V2PresentationMode; empty: string }) {
  return (
    <div className={`ds-story ds-story-${kind}`} data-testid={`v2-story-${kind}`}>
      <span className="ds-row"><Icon name={icon} /><b>{title}</b>{impact && <span className="ds-impact-kind">{mode === 'mba' ? KIND_LABEL[impact.kind].title : KIND_LABEL[impact.kind].ug}</span>}</span>
      <span>{impact ? impact.text : empty}</span>
      {mode === 'mba' && impact?.detail && <span className="ds-muted">Source: {impact.detail}</span>}
    </div>
  );
}

function ReflectionCard({ ctl, mode, rec }: { ctl: V2TeamController; mode: V2PresentationMode; rec: ReturnType<typeof gameHistory>[number] }) {
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
  const delib = saved?.deliberation as { beliefId?: string; confidence?: number } | null | undefined;
  const belief = BELIEFS[q]?.find(b => b.id === delib?.beliefId);
  const evidence = reflectionEvidence(delib?.beliefId, rec.before, rec.after);

  useEffect(() => {
    if (error && /has not been opened/.test(error)) { setError(null); setWaiting(true); }
  }, [error, setError]);
  useEffect(() => {
    if (!waiting) return;
    if (nextOpen) { setWaiting(false); void advance(['results', 'reflect', 'briefing']); return; }
    const t = setInterval(() => void reload(), 4000);
    return () => clearInterval(t);
  }, [waiting, nextOpen, reload, advance]);

  const proceed = () => void advance(['results', 'reflect', last ? 'final' : 'briefing'], { reflection: encodeReflection({ v: 1, learning, note: note.trim() || undefined }) });

  return (
    <Card title="Reflect and learn" sub="Quick — choose what fits" icon="bulb" testId="v2-phase-reflect">
      <div className="ds-grid ds-grid-2">
        <div className="ds-stack">
          <div>
            <p className="ds-h4">You expected</p>
            <p style={{ margin: 0 }} data-testid="v2-expected">{belief ? pick(mode, belief.label) : 'No belief was recorded.'}</p>
          </div>
          <div>
            <p className="ds-h4">What happened</p>
            <table className="ds-table" data-testid="v2-what-happened">
              <tbody>{evidence.map(e => <tr key={e.label}><td>{e.label}</td><td>{e.before}</td><td><Icon name="arrow" size={12} /></td><td><b>{e.after}</b></td></tr>)}</tbody>
            </table>
            <p className="ds-muted" style={{ marginTop: 6 }}>One quarter is rarely enough to prove or disprove a belief. Judge the evidence — and remember that investments take time to pay off.</p>
          </div>
        </div>
        <div className="ds-stack">
          <p className="ds-h4">What did you learn?</p>
          <ChoiceList multi name="learning" testIdPrefix="v2-learn" value={learning} onChange={setLearning} options={LEARNING_OPTIONS.map(o => ({ id: o.id, label: pick(mode, o.label) }))} />
          {showNote
            ? <textarea className="ds-input" data-testid="v2-reflection" maxLength={3000} value={note} onChange={e => setNote(e.target.value)} placeholder={mode === 'mba' ? 'Optional analysis: what would you do differently, and why?' : 'Optional: anything else?'} />
            : <button className="ds-btn ds-btn-ghost" onClick={() => setShowNote(true)}>+ Add a written explanation (optional)</button>}
        </div>
      </div>
      {waiting ? (
        <div className="ds-callout" data-testid="v2-waiting" style={{ marginTop: 12 }}><Icon name="clock" />Reflection saved. Waiting for the facilitator to open Q{q + 1}…</div>
      ) : (
        <div className="ds-actions">
          <button className="ds-btn ds-btn-primary" data-testid="v2-next-quarter" disabled={ctl.busy || learning.length === 0} onClick={proceed}>
            {last ? 'Save and see the final report' : `Save and continue to Q${q + 1}`} <Icon name="arrow" />
          </button>
        </div>
      )}
    </Card>
  );
}
