import { useMemo } from 'react';
import type { V2TeamController } from '../useV2Team';
import type { V2PresentationMode } from '../../content/modes';
import { buildLearningReport, Finding } from '../../insights/report';
import { gameHistory } from '../../insights/history';
import { trendSeries, fmtM } from '../../insights/dashboard';
import { V2_DESTINATIONS } from '../../../../simulation/engineV2Destination';
import { AGREEMENTS } from './CommitStage';
import { FINAL_LABELS } from '../format';
import { Icon, LineChart, Meter, Section } from '../ds/components';

const GATE_TEXT: Record<string, string> = {
  'terminal-insolvency': 'The company ended the game insolvent, which caps the overall score.',
  'rescued-insolvency': 'The company was insolvent at some point and had to be rescued, which caps the overall score.',
  'organizational-collapse': 'Trust, culture or talent collapsed, which caps the overall score.',
};
const lvl = (x: number): 'Strong' | 'Fair' | 'Weak' => (x >= 67 ? 'Strong' : x >= 40 ? 'Fair' : 'Weak');

/** Q8 Final Learning Report: frozen terminal score + an interpretation of the team's own eight quarters. */
export function FinalStage({ ctl, mode }: { ctl: V2TeamController; mode: V2PresentationMode }) {
  const game = ctl.game!;
  const report = useMemo(() => buildLearningReport(game.snapshot, mode), [game.snapshot, mode]);
  const trend = useMemo(() => trendSeries(gameHistory(game.snapshot)), [game.snapshot]);
  const s = game.snapshot.state;
  const sc = report.score;
  const gates = sc.gates.filter(g => g.triggered);
  const agreementOf = (q: number) => game.resolutions.find(r => r.quarter === q)?.agreement;
  return (
    <div className="ds-stack-lg" data-testid="v2-phase-final">
      <section className="ds-verdict ds-enter" data-testid="v2-final">
        <span className="ds-verdict-kicker">Final learning report · after eight quarters</span>
        <div className="ds-grid ds-grid-main" style={{ alignItems: 'end', marginTop: 8 }}>
          <div>
            <h1 className="ds-verdict-text" style={{ maxWidth: 'none' }}>{game.teamName}</h1>
            <p style={{ color: 'var(--ds-board-muted)', margin: '10px 0 0' }}>Strategy: <b style={{ color: 'var(--ds-board-ink)' }}>{s.destination ? V2_DESTINATIONS[s.destination.id].name : '—'}</b> · Final decision: <b style={{ color: 'var(--ds-board-ink)' }} data-testid="v2-final-option">{s.final.record ? FINAL_LABELS[s.final.record.option] : '—'}</b></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="ds-fig-label" style={{ color: 'var(--ds-board-muted)' }}>Overall score</div>
            <div className="ds-score-big" data-testid="v2-final-overall">{sc.overall.toFixed(1)}</div>
            <div className="ds-small" style={{ color: 'var(--ds-board-muted)' }}>out of 100</div>
          </div>
        </div>
        <div className="ds-figures" style={{ marginTop: 22 }} data-testid="v2-final-dimensions">
          {report.dimensions.map(d => (
            <div className="ds-figure" key={d.id}>
              <span className="ds-fig-label">{d.label}</span>
              <span className="ds-fig-value" data-testid={`v2-final-${d.id}`}>{d.score.toFixed(1)}</span>
              <div className="ds-fig-sub">{lvl(d.score)} · {d.measures}</div>
            </div>
          ))}
        </div>
      </section>
      {gates.length > 0 && <div className="ds-error"><Icon name="alert" />{gates.map(g => GATE_TEXT[g.id] ?? g.id).join(' ')}</div>}

      <Section eyebrow="Executive conclusion" title="What kind of company did your team build?" testId="v2-conclusion">
        <p className="ds-conclusion">{report.conclusion}</p>
        <p className="ds-muted" style={{ marginTop: 10 }}>The score measures the company you built — its finances, strategic position and organization — not the strategy you picked.</p>
        {mode === 'mba' && (
          <div className="ds-grid ds-grid-3" style={{ marginTop: 14 }}>
            {report.dimensions.map(d => (
              <details key={d.id} className="ds-small"><summary><b>{d.label}</b> components</summary>
                <div style={{ marginTop: 6 }}>{d.components.map(c => <Meter key={c.label} label={c.label} score={c.score} levelText={lvl(c.score)} />)}</div>
              </details>
            ))}
          </div>
        )}
      </Section>

      <Section eyebrow="Interpretation" title="Strengths, struggles and what is exposed" testId="v2-interpretation">
        <div className="ds-grid ds-grid-2" style={{ gap: 28 }}>
          <FindingList testId="v2-strengths" title="What you did well" items={report.strengths} empty="No standout strength in the data — look at the journey for partial successes." tone="good" />
          <FindingList testId="v2-struggles" title="Where you struggled" items={report.struggles} empty="No major weakness stands out in the data." tone="bad" />
          <FindingList testId="v2-vulnerabilities" title="Strategic vulnerabilities" items={report.vulnerabilities} empty="No significant exposure is visible in the final company." tone="caution" />
          <FindingList testId="v2-not-pursued" title="Opportunities you did not pursue" items={report.notPursued} empty="You funded every area and took the options in front of you." tone="neutral" />
        </div>
      </Section>

      <Section eyebrow="Your eight-quarter journey" testId="v2-journey">
        <div className="ds-grid ds-grid-3" style={{ marginBottom: 18 }}>
          <div><p className="ds-h4">Revenue</p><LineChart label="Revenue" points={trend.map(t => ({ x: t.quarter, y: t.revenue }))} format={v => `$${v.toFixed(0)}M`} zeroLine={false} /></div>
          <div><p className="ds-h4">Operating profit</p><LineChart label="Operating profit" points={trend.map(t => ({ x: t.quarter, y: t.operatingProfit }))} format={v => `$${v.toFixed(0)}M`} color="var(--ds-s2)" /></div>
          <div><p className="ds-h4">Cash</p><LineChart label="Cash" points={trend.map(t => ({ x: t.quarter, y: t.cash }))} format={v => `$${v.toFixed(0)}M`} color="var(--ds-s4)" /></div>
        </div>
        <div className="ds-timeline">
          {report.timeline.map(t => {
            const ag = agreementOf(t.quarter);
            return (
              <div className="ds-tl-item" key={t.quarter} data-testid={`v2-journey-q${t.quarter}`}>
                <div className="ds-tl-q">Q{t.quarter}</div>
                <div className="ds-tl-body">
                  <div style={{ fontWeight: 700 }}>{t.event}</div>
                  <div className="ds-small"><b>Your decision:</b> {t.decision}{ag ? <span className="ds-muted"> · {AGREEMENTS.find(a => a.id === ag)?.label}</span> : null}</div>
                  <div className="ds-small"><b>Key consequence:</b> {t.consequence}</div>
                  <div className="ds-tl-metrics"><span>Revenue <b>{fmtM(t.revenue)}</b></span><span>Operating profit <b>{fmtM(t.operatingProfit)}</b></span><span>Cash <b>{fmtM(t.cash)}</b></span></div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Decisions that mattered most" testId="v2-pivotal">
        <div className="ds-stack">
          {report.pivotal.map(p => (
            <div key={p.quarter} className="ds-tl-item">
              <div className="ds-tl-q">Q{p.quarter}</div>
              <div className="ds-tl-body">
                <div style={{ fontWeight: 700 }}>{p.decision}</div>
                <div className="ds-small"><b>Immediate consequence:</b> {p.immediate}</div>
                <div className="ds-small"><b>Longer-term effect:</b> {p.longerTerm}</div>
                {p.counterfactual && <div className="ds-small ds-muted" style={{ marginTop: 4 }}><Icon name="bulb" size={12} /> {p.counterfactual}</div>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Trade-offs, not a winning formula" title="What could you do differently?" testId="v2-tradeoffs">
        <ol className="ds-numbered">{report.tradeoffs.slice(0, 3).map(t => <li key={t.title}><b>{t.title}</b><br /><span className="ds-small">{t.text}</span></li>)}</ol>
        {report.tradeoffs.length > 3 && <ol className="ds-numbered" style={{ marginTop: 20 }} start={4}>{report.tradeoffs.slice(3).map(t => <li key={t.title}><b>{t.title}</b><br /><span className="ds-small">{t.text}</span></li>)}</ol>}
      </Section>

      <Section eyebrow="For discussion" title="Questions for your team" testId="v2-questions">
        <ul className="ds-list" style={{ fontSize: '1.05em' }}>{report.questions.map(q => <li key={q}>{q}</li>)}</ul>
      </Section>
    </div>
  );
}

function FindingList({ title, items, empty, tone, testId }: { title: string; items: Finding[]; empty: string; tone: 'good' | 'bad' | 'caution' | 'neutral'; testId: string }) {
  const icon = tone === 'good' ? 'check' : tone === 'neutral' ? 'flag' : 'alert';
  return (
    <div data-testid={testId}>
      <p className={`ds-h4 ds-tone-${tone}`} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Icon name={icon} size={13} />{title}</p>
      {items.length
        ? <div className="ds-stack" style={{ gap: 10 }}>{items.map(f => <div key={f.title} style={{ borderTop: '1px solid var(--ds-line)', paddingTop: 8 }}><b>{f.title}.</b> <span className="ds-muted">{f.evidence}</span></div>)}</div>
        : <p className="ds-muted">{empty}</p>}
    </div>
  );
}
