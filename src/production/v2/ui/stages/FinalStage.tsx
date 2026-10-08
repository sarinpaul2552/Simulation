import { useMemo } from 'react';
import type { V2TeamController } from '../useV2Team';
import type { V2PresentationMode } from '../../content/modes';
import { buildLearningReport } from '../../insights/report';
import { gameHistory } from '../../insights/history';
import { trendSeries, fmtM } from '../../insights/dashboard';
import { V2_DESTINATIONS } from '../../../../simulation/engineV2Destination';
import { FINAL_LABELS } from '../format';
import { Card, Icon, LineChart, Meter } from '../ds/components';

const GATE_TEXT: Record<string, string> = {
  'terminal-insolvency': 'The company ended the game insolvent, which caps the overall score.',
  'rescued-insolvency': 'The company was insolvent at some point and had to be rescued, which caps the overall score.',
  'organizational-collapse': 'Trust, culture or talent collapsed, which caps the overall score.',
};
const lvl = (x: number): 'Strong' | 'Fair' | 'Weak' => (x >= 67 ? 'Strong' : x >= 40 ? 'Fair' : 'Weak');

/** Q8 Final Learning Report: frozen terminal score + an explanation of the team's own eight quarters. */
export function FinalStage({ ctl, mode }: { ctl: V2TeamController; mode: V2PresentationMode }) {
  const game = ctl.game!;
  const report = useMemo(() => buildLearningReport(game.snapshot, mode), [game.snapshot, mode]);
  const trend = useMemo(() => trendSeries(gameHistory(game.snapshot)), [game.snapshot]);
  const s = game.snapshot.state;
  const sc = report.score;
  const gates = sc.gates.filter(g => g.triggered);
  return (
    <div className="ds-stack" data-testid="v2-phase-final">
      <section className="ds-card ds-hero" data-testid="v2-final">
        <span className="ds-kicker">Final learning report · after Q8</span>
        <div className="ds-grid ds-grid-main" style={{ alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{game.teamName}</h1>
            <p>Strategy: <b style={{ color: '#fff' }}>{s.destination ? V2_DESTINATIONS[s.destination.id].name : '—'}</b> · Final decision: <b style={{ color: '#fff' }} data-testid="v2-final-option">{s.final.record ? FINAL_LABELS[s.final.record.option] : '—'}</b></p>
            <p className="ds-small" style={{ marginTop: 8 }}>The score measures the company you built — its finances, strategic position and organization — not the strategy you picked.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="ds-small" style={{ color: '#cbd5e1' }}>Overall score</div>
            <div className="ds-score-big" data-testid="v2-final-overall">{sc.overall.toFixed(1)}</div>
            <div className="ds-small" style={{ color: '#cbd5e1' }}>out of 100</div>
          </div>
        </div>
      </section>

      <div className="ds-grid ds-grid-3" data-testid="v2-final-dimensions">
        {report.dimensions.map(d => (
          <Card key={d.id} title={d.label} icon={d.id === 'financial' ? 'cash' : d.id === 'strategic' ? 'target' : 'users'}>
            <div className="ds-kpi-value" data-testid={`v2-final-${d.id}`}>{d.score.toFixed(1)}</div>
            <Meter label="" score={d.score} levelText={lvl(d.score)} />
            <p className="ds-small" style={{ margin: '6px 0 0' }}>{d.measures}</p>
            {mode === 'mba' && <details className="ds-small"><summary>Components</summary><ul className="ds-list">{d.components.map(c => <li key={c.label}>{c.label}: {c.score.toFixed(0)}/100</li>)}</ul></details>}
          </Card>
        ))}
      </div>
      {gates.length > 0 && <div className="ds-error"><Icon name="alert" />{gates.map(g => GATE_TEXT[g.id] ?? g.id).join(' ')}</div>}

      <Card title="Your eight-quarter journey" icon="clock" testId="v2-journey">
        <div className="ds-grid ds-grid-3" style={{ marginBottom: 12 }}>
          <div><p className="ds-h4">Revenue</p><LineChart label="Revenue" points={trend.map(t => ({ x: t.quarter, y: t.revenue }))} format={v => `$${v.toFixed(0)}M`} zeroLine={false} /></div>
          <div><p className="ds-h4">Operating profit</p><LineChart label="Operating profit" points={trend.map(t => ({ x: t.quarter, y: t.operatingProfit }))} format={v => `$${v.toFixed(0)}M`} color="var(--ds-s2)" /></div>
          <div><p className="ds-h4">Cash</p><LineChart label="Cash" points={trend.map(t => ({ x: t.quarter, y: t.cash }))} format={v => `$${v.toFixed(0)}M`} color="var(--ds-s3)" /></div>
        </div>
        <div className="ds-timeline">
          {report.timeline.map(t => (
            <div className="ds-tl-item" key={t.quarter} data-testid={`v2-journey-q${t.quarter}`}>
              <div className="ds-tl-q">Q{t.quarter}</div>
              <div className="ds-tl-body">
                <div style={{ fontWeight: 700 }}>{t.event}</div>
                <div className="ds-small"><b>Your decision:</b> {t.decision}</div>
                <div className="ds-small"><b>Key consequence:</b> {t.consequence}</div>
                <div className="ds-tl-metrics"><span>Revenue <b>{fmtM(t.revenue)}</b></span><span>Operating profit <b>{fmtM(t.operatingProfit)}</b></span><span>Cash <b>{fmtM(t.cash)}</b></span></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="ds-grid ds-grid-2">
        <Card title="What you did well" icon="star" testId="v2-strengths">
          {report.strengths.length ? <ul className="ds-list">{report.strengths.map(f => <li key={f.title}><b>{f.title}.</b> <span className="ds-muted">{f.evidence}</span></li>)}</ul> : <p className="ds-muted">No standout strengths in the data — look at the journey for partial successes.</p>}
        </Card>
        <Card title="Where you struggled" icon="alert" testId="v2-struggles">
          {report.struggles.length ? <ul className="ds-list">{report.struggles.map(f => <li key={f.title}><b>{f.title}.</b> <span className="ds-muted">{f.evidence}</span></li>)}</ul> : <p className="ds-muted">No major weaknesses stand out in the data.</p>}
        </Card>
      </div>

      <Card title="Decisions that mattered most" icon="flag" testId="v2-pivotal">
        <div className="ds-stack">
          {report.pivotal.map(p => (
            <div key={p.quarter} className="ds-tl-body">
              <div className="ds-row"><span className="ds-badge ds-badge-accent">Q{p.quarter}</span><b>{p.decision}</b></div>
              <div className="ds-small"><b>Immediate consequence:</b> {p.immediate}</div>
              <div className="ds-small"><b>Longer-term effect:</b> {p.longerTerm}</div>
              {p.counterfactual && <div className="ds-small ds-muted"><Icon name="bulb" size={12} /> {p.counterfactual}</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="What could you do differently?" sub="Trade-offs, not a winning formula" icon="bulb" testId="v2-tradeoffs">
        <div className="ds-grid ds-grid-2">
          {report.tradeoffs.map(t => <div key={t.title} className="ds-implication"><span><b>{t.title}</b><br /><span className="ds-small">{t.text}</span></span></div>)}
        </div>
      </Card>
    </div>
  );
}
