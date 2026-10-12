import { useMemo } from 'react';
import { BACKSTORY, COMPANY, YOUR_ROLE } from '../../content/company';
import { pick, V2PresentationMode } from '../../content/modes';
import { calendarLabel } from '../../content/calendar';
import { CHAPTERS } from '../../content/chapters';
import { startingCompany } from '../../insights/history';
import { Icon, Section } from '../ds/components';
import { Term } from '../ds/glossary';

const m = (x: number) => `$${x.toFixed(0)}M`;

/**
 * The NexLearn introduction (about two minutes). The backstory is labelled fiction; the starting position is read
 * from the engine's real starting state, so the two can never disagree.
 */
export function CompanyIntro({ mode, onBegin, onClose, busy }: { mode: V2PresentationMode; onBegin?: () => void; onClose?: () => void; busy?: boolean }) {
  const s = useMemo(() => startingCompany(), []);
  const seg = s.segmentRevenue;
  const margin = s.operatingProfit / s.revenue;
  return (
    <div className="ds-stack-lg" data-testid="v2-company-intro">
      <section className="ds-chapter ds-enter">
        <span className="ds-chapter-num" aria-hidden="true">{COMPANY.ticker}</span>
        <span className="ds-chapter-kicker">Welcome to {COMPANY.name} · {calendarLabel(0)}</span>
        <h1 className="ds-chapter-title" style={{ maxWidth: '18ch' }}>You are now running {COMPANY.name}.</h1>
        <p className="ds-chapter-sub">{pick(mode, YOUR_ROLE)}</p>
        <div className="ds-chapter-rule" />
        <p className="ds-chapter-body">The simulation runs for eight quarters, from {calendarLabel(1)} to {calendarLabel(8)}: {Object.values(CHAPTERS).map(c => c.title.toLowerCase()).join(' → ')}.</p>
      </section>

      <Section eyebrow="Starting position" title={`${COMPANY.name} at the end of ${calendarLabel(0)}`} testId="v2-intro-position">
        <p className="ds-muted" style={{ marginTop: -6 }}><Icon name="db" size={12} /> Simulation data — this is the company you inherit.</p>
        <div className="ds-figures">
          <div className="ds-figure"><span className="ds-fig-label">Quarterly revenue</span><span className="ds-fig-value" data-testid="v2-intro-revenue">{m(s.revenue)}</span><div className="ds-fig-sub">Operating costs {m(s.operatingCost)}</div></div>
          <div className="ds-figure"><span className="ds-fig-label"><Term id="operating-profit">Operating profit</Term></span><span className="ds-fig-value">{m(s.operatingProfit)}</span><div className="ds-fig-sub"><Term id="operating-margin">Operating margin</Term> {(margin * 100).toFixed(0)}%</div></div>
          <div className="ds-figure"><span className="ds-fig-label">Cash</span><span className="ds-fig-value">{m(s.cash)}</span><div className="ds-fig-sub">Debt {m(s.financing.debt)} · strategic budget $30M per quarter</div></div>
        </div>
        <div style={{ marginTop: 18 }}>
          <p className="ds-h4">Revenue by business (per quarter)</p>
          <div className="ds-alloc-bar" style={{ height: 16 }} aria-hidden>
            <span style={{ flex: `${seg.consumer} 0 0`, background: 'var(--ds-c-consumer)' }} />
            <span style={{ flex: `${seg.enterprise} 0 0`, background: 'var(--ds-c-enterprise)' }} />
            <span style={{ flex: `${seg.university} 0 0`, background: 'var(--ds-c-university)' }} />
            <span style={{ flex: `${seg.aiNative} 0 0`, background: 'var(--ds-c-ai)' }} />
          </div>
          <div className="ds-legend" data-testid="v2-intro-segments">
            <span><i style={{ background: 'var(--ds-c-consumer)' }} />Consumer {m(seg.consumer)}</span>
            <span><i style={{ background: 'var(--ds-c-enterprise)' }} />Enterprise {m(seg.enterprise)}</span>
            <span><i style={{ background: 'var(--ds-c-university)' }} />University {m(seg.university)}</span>
            <span><i style={{ background: 'var(--ds-c-ai)' }} />AI-native {m(seg.aiNative)}</span>
          </div>
          <p className="ds-small" style={{ marginTop: 10 }}>{(seg.consumer / s.revenue * 100).toFixed(0)}% of revenue comes from consumer subscriptions. <Term id="retention">Retention</Term> is {s.commercial.consumerRetention.toFixed(0)}%, the <Term id="pipeline">enterprise pipeline</Term> is {m(s.commercial.enterprisePipeline)} and university <Term id="renewal">renewals</Term> are {s.commercial.universityRenewalRate.toFixed(0)}%.</p>
        </div>
      </Section>

      <Section eyebrow={<span>Company background <span className="ds-fiction" style={{ marginLeft: 8 }}>Fictional</span></span>} title="The story so far" testId="v2-intro-story">
        <div className="ds-intro-grid">
          {BACKSTORY.map(b => <div key={b.id}><h3>{b.title}</h3><p>{pick(mode, b.body)}</p></div>)}
        </div>
      </Section>

      <div className="ds-actions ds-actions-sticky">
        {onClose && <button className="ds-btn ds-btn-secondary" onClick={onClose} data-testid="v2-intro-close">Close</button>}
        {onBegin && <button className="ds-btn ds-btn-chapter ds-btn-lg" disabled={busy} data-testid="v2-intro-begin" onClick={onBegin}>Begin {calendarLabel(1)} <Icon name="arrow" /></button>}
      </div>
    </div>
  );
}
