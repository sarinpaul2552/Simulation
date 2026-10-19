import { useMemo } from 'react';
import { BACKSTORY, COMPANY, YOUR_ROLE } from '../../content/company';
import { pick, V2PresentationMode } from '../../content/modes';
import { calendarLabel } from '../../content/calendar';
import { startingCompany } from '../../insights/history';
import { BUSINESS_PARTS, EXAMPLES_DISCLAIMER, type BusinessPart } from '../../content/stage4Content';
import { Icon } from '../ds/components';
import { Term } from '../ds/glossary';

const m = (x: number) => `$${x.toFixed(0)}M`;
const COLOR: Record<BusinessPart['id'], string> = {
  consumer: 'var(--ds-c-consumer)', enterprise: 'var(--ds-c-enterprise)', university: 'var(--ds-c-university)', ai: 'var(--ds-c-ai)', people: 'var(--ds-c-people)',
};

/**
 * Stage 4B (v3-econ-1.1): "Meet Your Company" — a shared vocabulary before Q1. The starting figures come from the
 * engine's starting state; the real-world examples are labelled as illustrative comparisons only.
 */
export function MeetYourCompany({ mode, onBegin, onClose, busy }: { mode: V2PresentationMode; onBegin?: () => void; onClose?: () => void; busy?: boolean }) {
  const s = useMemo(() => startingCompany(), []);
  const seg = s.segmentRevenue;
  const share = (x: number) => `${((x / s.revenue) * 100).toFixed(0)}% of revenue`;
  const fact: Record<BusinessPart['id'], string> = {
    consumer: `${m(seg.consumer)} a quarter · ${share(seg.consumer)}`,
    enterprise: `${m(seg.enterprise)} a quarter · ${share(seg.enterprise)}`,
    university: `${m(seg.university)} a quarter · ${share(seg.university)}`,
    ai: `${m(seg.aiNative)} a quarter · ${share(seg.aiNative)}`,
    people: `Talent ${s.capabilities.talent.toFixed(0)} · culture ${s.culture.toFixed(0)} (of 100)`,
  };
  return (
    <div className="ds-stack-lg s4-intro" data-testid="v2-company-intro" data-variant="stage4">
      <header className="s4-head">
        <p className="ds-eyebrow">{COMPANY.name} ({COMPANY.ticker}) · before {calendarLabel(1)}</p>
        <h1 className="ds-title s4-title">Meet your company</h1>
        <p className="s4-lead">{pick(mode, YOUR_ROLE)}</p>
      </header>

      <section className="s4-kpis" data-testid="v2-intro-position" aria-label="Starting position">
        <div className="s4-kpi"><span className="s4-kpi-label">Quarterly revenue</span><span className="s4-kpi-value" data-testid="v2-intro-revenue">{m(s.revenue)}</span></div>
        <div className="s4-kpi"><span className="s4-kpi-label"><Term id="operating-profit">Operating profit</Term></span><span className="s4-kpi-value">{m(s.operatingProfit)}</span><span className="s4-kpi-sub">{((s.operatingProfit / s.revenue) * 100).toFixed(0)}% margin</span></div>
        <div className="s4-kpi"><span className="s4-kpi-label">Cash</span><span className="s4-kpi-value">{m(s.cash)}</span><span className="s4-kpi-sub">Debt {m(s.financing.debt)}</span></div>
        <div className="s4-kpi"><span className="s4-kpi-label">Strategic budget</span><span className="s4-kpi-value">$30M</span><span className="s4-kpi-sub">to invest each quarter</span></div>
      </section>

      <section data-testid="v2-intro-parts">
        <h2 className="s4-h2">Five parts of the business</h2>
        <div className="s4-parts">
          {BUSINESS_PARTS.map(p => (
            <article key={p.id} className="s4-card s4-part" data-part={p.id}>
              <div className="s4-part-head"><span className="s4-swatch" style={{ background: COLOR[p.id] }} aria-hidden /><h3>{p.name}</h3></div>
              <p className="s4-part-fact">{fact[p.id]}</p>
              <p>{p.what}</p>
              <p className="s4-muted"><b>Think of:</b> {p.examples}.</p>
              <p className="s4-muted"><b>Built by investing in:</b> {p.builtBy}.</p>
            </article>
          ))}
        </div>
        <p className="s4-note" data-testid="v2-intro-disclaimer">{EXAMPLES_DISCLAIMER}</p>
      </section>

      <p className="s4-callout" data-testid="v2-intro-horizon"><Icon name="flag" size={16} /> <span>You lead for eight quarters, {calendarLabel(1)} to {calendarLabel(8)}. The board expects a committed strategy at its {calendarLabel(4)} meeting.</span></p>

      <details className="s4-details" data-testid="v2-intro-story">
        <summary>Read the company background <span className="ds-fiction" style={{ marginLeft: 8 }}>Fictional</span></summary>
        <div className="s4-details-body ds-intro-grid">
          {BACKSTORY.map(b => <div key={b.id}><h3>{b.title}</h3><p>{pick(mode, b.body)}</p></div>)}
        </div>
      </details>

      <div className="ds-actions ds-actions-sticky">
        {onClose && <button className="ds-btn ds-btn-secondary" onClick={onClose} data-testid="v2-intro-close">Close</button>}
        {onBegin && <button className="ds-btn ds-btn-chapter ds-btn-lg" disabled={busy} data-testid="v2-intro-begin" onClick={onBegin}>Begin {calendarLabel(1)} <Icon name="arrow" /></button>}
      </div>
    </div>
  );
}
