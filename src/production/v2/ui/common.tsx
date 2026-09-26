import type { ReactNode } from 'react';
import type { V2Signal } from '../types';
import type { V2GameSnapshot } from '../snapshot';
import { SIGNAL_KIND_LABEL, signalValue, money, destinationName } from './format';
import { V2_TOTAL_QUARTERS } from '../adapter';

export function SignalList({ signals, testId }: { signals: V2Signal[]; testId?: string }) {
  if (signals.length === 0) return <p className="v2-muted">No signals.</p>;
  return (
    <ul className="v2-signals" data-testid={testId}>
      {signals.map(s => (
        <li key={s.id} className={`v2-signal v2-signal-${s.kind}`} data-signal-id={s.id}>
          <span className="v2-signal-kind">{SIGNAL_KIND_LABEL[s.kind]}</span>
          <span className="v2-signal-label">{s.label}</span>
          {signalValue(s) && <span className="v2-signal-value">{signalValue(s)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function Panel({ title, children, testId }: { title?: string; children: ReactNode; testId?: string }) {
  return (
    <section className="v2-panel" data-testid={testId}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="v2-error" role="alert" data-testid="v2-error">{error}</div>;
}

/** Shared (non-private) company dashboard. */
export function CompanyStrip({ snapshot, teamName }: { snapshot: V2GameSnapshot; teamName: string }) {
  const s = snapshot.state;
  return (
    <div className="v2-strip" data-testid="v2-company-strip">
      <strong>{teamName}</strong>
      <span>Quarters completed: <b data-testid="v2-completed">{snapshot.completedQuarter}</b> / {V2_TOTAL_QUARTERS}</span>
      <span>Revenue <b>{money(s.revenue)}</b></span>
      <span>Operating profit <b>{money(s.operatingProfit)}</b></span>
      <span>Cash <b data-testid="v2-cash">{money(s.cash)}</b></span>
      <span>Strategy <b data-testid="v2-destination">{destinationName(s.destination?.id)}</b></span>
      {s.solvency.distressed && <span className="v2-badge v2-badge-bad" data-testid="v2-distressed">Distressed</span>}
      {s.solvency.status === 'insolvent' && <span className="v2-badge v2-badge-bad">Insolvent</span>}
    </div>
  );
}

export function Steps({ phase, voting }: { phase: string; voting: boolean }) {
  const steps = ['briefing', 'decide', 'belief', 'risk', ...(voting ? ['vote'] : []), 'commit', 'results', 'reflect'];
  const labels: Record<string, string> = { briefing: 'Scenario', decide: 'Allocate & decide', belief: 'Belief', risk: 'Risks', vote: 'Vote', commit: 'Commit', results: 'Results', reflect: 'Reflect' };
  const idx = steps.indexOf(phase);
  return (
    <ol className="v2-steps" data-testid="v2-steps" data-phase={phase}>
      {steps.map((s, i) => <li key={s} className={i === idx ? 'current' : i < idx ? 'done' : ''}>{labels[s]}</li>)}
    </ol>
  );
}
