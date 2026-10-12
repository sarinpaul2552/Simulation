/**
 * In-place business glossary (Batch 8). <Term id="cac">customer acquisition cost</Term> renders the words as a
 * dotted-underline button; tapping or clicking shows a definition popover (plain English + example, plus technical
 * detail in MBA mode). Escape, the close button or a click elsewhere dismisses it. <GlossaryPanel> lists every term.
 */
import { createContext, ReactNode, useContext, useEffect, useId, useRef, useState, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY, GLOSSARY_BY_ID } from '../../content/glossary';
import type { V2PresentationMode } from '../../content/modes';

export const GlossaryMode = createContext<V2PresentationMode>('mba');

export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const entry = GLOSSARY_BY_ID[id];
  const mode = useContext(GlossaryMode);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const ref = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const popId = useId();
  // Fixed position from the term's on-screen box, so scrolling containers and tables never clip the popover.
  const place = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const w = Math.min(320, window.innerWidth - 24);
    const below = r.bottom + 220 < window.innerHeight;
    setPos({ position: 'fixed', left: Math.max(12, Math.min(r.left, window.innerWidth - w - 12)), width: w, ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) });
  };
  const toggle = () => { if (!open) place(); setOpen(o => !o); };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false); };
    const onScroll = () => place();
    window.addEventListener('scroll', onScroll, true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc); document.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);
  if (!entry) return <>{children}</>;
  return (
    <span className="ds-term-wrap" ref={ref}>
      <button type="button" className="ds-term" aria-expanded={open} aria-controls={popId} data-testid={`v2-term-${id}`} onClick={e => { e.stopPropagation(); toggle(); }}>
        {children ?? entry.term}
      </button>
      {open && createPortal(
        <span className="ds-term-pop ds-root-pop" ref={popRef} style={pos} role="dialog" id={popId} aria-label={entry.term} data-testid={`v2-term-pop-${id}`}>
          <b>{entry.term}</b>
          <span>{entry.plain}</span>
          <span className="ds-muted"><i>Example:</i> {entry.example}</span>
          {mode === 'mba' && entry.mba && <span className="ds-muted">{entry.mba}</span>}
          <button type="button" className="ds-term-close" aria-label="Close definition" onClick={() => setOpen(false)}>×</button>
        </span>, document.querySelector('.ds-root') ?? document.body
      )}
    </span>
  );
}

export function GlossaryPanel({ onClose }: { onClose: () => void }) {
  const mode = useContext(GlossaryMode);
  const [q, setQ] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const items = GLOSSARY.filter(g => !q || `${g.term} ${g.plain}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="ds-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="ds-dialog ds-glossary" role="dialog" aria-modal="true" aria-label="Glossary" data-testid="v2-glossary">
        <div className="ds-row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>Glossary</h2><button className="ds-btn ds-btn-secondary" style={{ minHeight: 36, padding: '4px 12px' }} onClick={onClose}>Close</button></div>
        <input className="ds-input" placeholder="Search terms…" value={q} onChange={e => setQ(e.target.value)} style={{ margin: '12px 0' }} aria-label="Search the glossary" />
        <dl className="ds-glossary-list">
          {items.map(g => (
            <div key={g.id}>
              <dt>{g.term}</dt>
              <dd>{g.plain}<div className="ds-muted" style={{ marginTop: 2 }}><i>Example:</i> {g.example}</div>{mode === 'mba' && g.mba && <div className="ds-muted" style={{ marginTop: 2 }}>{g.mba}</div>}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}

/** Labels that have a glossary entry, wherever they appear in dashboards. */
const LABEL_TERM: Record<string, string> = {
  'Operating profit': 'operating-profit', 'Operating margin': 'operating-margin', 'Liquidity': 'liquidity',
  'Consumer retention': 'retention', 'Cost to win a customer (index)': 'cac', 'Enterprise pipeline': 'pipeline',
  'University renewals': 'renewal', 'Change load vs capacity': 'org-load', 'Capacity': 'execution-capacity',
  'Strategic readiness': 'strategic-readiness', 'Pricing power': 'pricing-power', 'Trust': 'trust', 'Enterprise win rate': 'win-rate',
};
/** Render a label, as a tappable glossary term when one exists. */
export function Termed({ label }: { label: string }) {
  const id = LABEL_TERM[label];
  return id ? <Term id={id}>{label}</Term> : <>{label}</>;
}
