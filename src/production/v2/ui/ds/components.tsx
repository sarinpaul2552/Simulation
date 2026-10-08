/**
 * V2 DESIGN SYSTEM COMPONENTS (Batch 7). Small, dependency-free React components. Charts are inline SVG with a
 * hover tooltip, a single y-axis, recorded points only (no interpolation beyond drawing a line between real values).
 */
import { ReactNode, useState } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import './ds.css';
import type { EvidenceKind } from '../../content/scenarioContent';
import { EVIDENCE_LABEL } from '../../content/scenarioContent';
import type { Tone, Direction } from '../../insights/dashboard';

const PATHS: Record<string, string> = {
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  flat: 'M5 12h14',
  cash: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  chart: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
  alert: 'M12 3l9 16H3zM12 10v4M12 17h.01',
  check: 'M5 13l4 4L19 7',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  users: 'M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  db: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};
export function Icon({ name, size = 16, title }: { name: keyof typeof PATHS | string; size?: number; title?: string }) {
  return (
    <svg className="ds-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={PATHS[name] ?? PATHS.flat} />
    </svg>
  );
}

export function Card({ title, sub, icon, children, className = '', testId, action }: { title?: ReactNode; sub?: ReactNode; icon?: string; children: ReactNode; className?: string; testId?: string; action?: ReactNode }) {
  return (
    <section className={`ds-card ${className}`} data-testid={testId}>
      {(title || action) && (
        <div className="ds-card-h">
          {icon && <Icon name={icon} />}
          {title && <h3>{title}</h3>}
          {sub && <span className="ds-sub">{sub}</span>}
          <span className="ds-spacer" />
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EvidenceTag({ kind }: { kind: EvidenceKind }) {
  const icon = kind === 'company-data' ? 'db' : kind === 'industry-estimate' ? 'chart' : 'news';
  return <span className={`ds-ev-tag ds-ev-${kind}`} title={EVIDENCE_LABEL[kind].meaning}><Icon name={icon} size={12} />{EVIDENCE_LABEL[kind].title}</span>;
}

export function EvidenceList({ items, testId }: { items: { id: string; evidence: EvidenceKind; text: string; value?: string }[]; testId?: string }) {
  if (!items.length) return <p className="ds-muted">No signals this quarter.</p>;
  return (
    <div className="ds-evidence" data-testid={testId}>
      {items.map(i => (
        <div className="ds-ev" key={i.id} data-signal-id={i.id} data-evidence={i.evidence}>
          <EvidenceTag kind={i.evidence} />
          <span>{i.text}</span>
          {i.value && <span className="ds-ev-value">{i.value}</span>}
        </div>
      ))}
    </div>
  );
}

const TONE_ICON: Record<Tone, string> = { good: 'check', bad: 'alert', caution: 'alert', neutral: 'flat' };
export function Delta({ direction, tone, text }: { direction: Direction; tone: Tone; text: string }) {
  return (
    <span className={`ds-kpi-delta ds-tone-${tone}`}>
      <Icon name={direction} size={14} title={direction === 'up' ? 'increase' : direction === 'down' ? 'decrease' : 'no change'} />
      {text}
    </span>
  );
}

export function KpiTile({ label, value, delta, previous, explain, testId, footnote }: { label: string; value: string; delta?: { direction: Direction; tone: Tone; text: string }; previous?: string; explain?: string; testId?: string; footnote?: string }) {
  return (
    <div className="ds-card ds-kpi" data-testid={testId} title={explain}>
      <span className="ds-kpi-label">{label}</span>
      <span className="ds-kpi-value">{value}</span>
      {delta && <Delta {...delta} />}
      {previous && <span className="ds-kpi-prev">{previous}</span>}
      {footnote && <span className="ds-kpi-prev">{footnote}</span>}
    </div>
  );
}

const LEVEL_TONE: Record<string, Tone> = { Strong: 'good', Fair: 'caution', Weak: 'bad' };
export function Meter({ label, score, levelText, sub, testId }: { label: string; score: number; levelText: 'Strong' | 'Fair' | 'Weak'; sub?: string; testId?: string }) {
  const tone = LEVEL_TONE[levelText];
  return (
    <div data-testid={testId}>
      <div className="ds-meter">
        <span className="ds-small" style={{ fontWeight: 600 }}>{label}</span>
        <div className="ds-meter-track" role="meter" aria-valuenow={Math.round(score)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className="ds-meter-fill" style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
        </div>
        <span className={`ds-meter-level ds-tone-${tone}`}><Icon name={TONE_ICON[tone]} size={12} />{levelText}</span>
      </div>
      {sub && <div className="ds-muted" style={{ marginTop: -2 }}>{sub}</div>}
    </div>
  );
}

export function Stepper({ stages, current }: { stages: string[]; current: number }) {
  return (
    <ol className="ds-stepper" data-testid="ds-stepper" data-stage={current}>
      {stages.map((s, i) => (
        <li key={s} className={`ds-step ${i === current ? 'current' : i < current ? 'done' : ''}`} aria-current={i === current ? 'step' : undefined}>
          <span className="ds-step-n">{i < current ? <Icon name="check" size={12} /> : i + 1}</span>
          <span className="ds-step-label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function ChoiceList<T extends string>({ options, value, onChange, name, testIdPrefix, multi, max }: {
  options: { id: T; label: ReactNode; detail?: ReactNode; disabled?: boolean }[]; value: T[]; onChange: (v: T[]) => void; name: string; testIdPrefix: string; multi?: boolean; max?: number;
}) {
  return (
    <div className="ds-choices" role={multi ? 'group' : 'radiogroup'} aria-label={name}>
      {options.map(o => {
        const selected = value.includes(o.id);
        const blocked = o.disabled || (multi && !selected && max !== undefined && value.length >= max);
        return (
          <label key={o.id} className={`ds-choice ${selected ? 'selected' : ''} ${o.disabled ? 'disabled' : ''}`} data-testid={`${testIdPrefix}-${o.id}`}>
            <input type={multi ? 'checkbox' : 'radio'} name={name} checked={selected} disabled={!!blocked} aria-disabled={!!blocked}
              onChange={() => onChange(multi ? (selected ? value.filter(v => v !== o.id) : [...value, o.id]) : [o.id])} />
            <span><span className="ds-choice-title">{o.label}</span>{o.detail && <span className="ds-muted" style={{ display: 'block' }}>{o.detail}</span>}</span>
          </label>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, testIdPrefix }: { options: { id: T; label: string }[]; value: T | undefined; onChange: (v: T) => void; testIdPrefix: string }) {
  return (
    <div className="ds-segmented" role="radiogroup">
      {options.map(o => (
        <button key={String(o.id)} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'selected' : ''} data-testid={`${testIdPrefix}-${o.id}`} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Charts */

export interface SeriesPoint { x: number; y: number }
const W = 320, H = 150, PAD = { l: 44, r: 10, t: 12, b: 24 };

function niceTicks(min: number, max: number, n = 4): number[] {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, raw = span / n, mag = 10 ** Math.floor(Math.log10(raw)), norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.5; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** Single-series line chart over quarters (Q0 = starting company). Recorded points only. */
export function LineChart({ points, label, format, color = 'var(--ds-s1)', testId, zeroLine = true, maxQuarter = 8 }: { points: SeriesPoint[]; label: string; format: (v: number) => string; color?: string; testId?: string; zeroLine?: boolean; maxQuarter?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const ys = points.map(p => p.y);
  const lo = Math.min(...ys, zeroLine && Math.min(...ys) < 0 ? 0 : Math.min(...ys)), hi = Math.max(...ys);
  // Minimum visible span (10% of the largest magnitude, at least 5 units) so a −0.5% move does not look like a crash.
  const minSpan = Math.max(Math.max(...ys.map(Math.abs)) * 0.1, 5);
  const pad = Math.max((minSpan - (hi - lo)) / 2, 0);
  const ticks = niceTicks(lo - pad - (hi - lo) * 0.1, hi + pad + (hi - lo) * 0.1);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const sx = (x: number) => PAD.l + (x / maxQuarter) * (W - PAD.l - PAD.r);
  const sy = (y: number) => PAD.t + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const hp = hover !== null ? points[hover] : null;
  return (
    <figure className="ds-chart-wrap" style={{ margin: 0 }} data-testid={testId} data-points={points.length}>
      <figcaption className="ds-sr">{label}: {points.map(p => `Q${p.x} ${format(p.y)}`).join(', ')}</figcaption>
      <svg className="ds-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line className={t === 0 ? 'ds-zero-line' : 'ds-grid-line'} x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} />
            <text x={PAD.l - 6} y={sy(t) + 3} textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {Array.from({ length: maxQuarter + 1 }, (_, q) => <text key={q} x={sx(q)} y={H - 6} textAnchor="middle">{q === 0 ? 'Start' : `Q${q}`}</text>)}
        {points.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
        {points.map((p, i) => (
          <g key={p.x}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={hover === i ? 5 : 4} fill={color} stroke="#fff" strokeWidth={2} />
            <rect x={sx(p.x) - 14} y={PAD.t} width={28} height={H - PAD.t - PAD.b} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
          </g>
        ))}
        {hp && <line x1={sx(hp.x)} x2={sx(hp.x)} y1={PAD.t} y2={H - PAD.b} stroke="#c3c2b7" strokeDasharray="3 3" />}
      </svg>
      {hp && <div className="ds-tooltip" style={{ left: `${(sx(hp.x) / W) * 100}%`, top: `${(sy(hp.y) / H) * 100}%` }}>{hp.x === 0 ? 'Start' : `Q${hp.x}`}: {format(hp.y)}</div>}
    </figure>
  );
}

/** Stacked bars of segment revenue per quarter (4 series, validated categorical order, 2px gaps, legend + table). */
export function SegmentBars({ rows, testId }: { rows: { quarter: number; values: { key: string; label: string; value: number }[] }[]; testId?: string }) {
  const [hover, setHover] = useState<{ q: number; key: string } | null>(null);
  const KEY_COLOR: Record<string, string> = { consumer: 'var(--ds-c-consumer)', enterprise: 'var(--ds-c-enterprise)', aiNative: 'var(--ds-c-ai)', university: 'var(--ds-c-university)' };
  const fallback = ['var(--ds-s1)', 'var(--ds-s2)', 'var(--ds-s3)', 'var(--ds-s4)'];
  const colorOf = (key: string, i: number) => KEY_COLOR[key] ?? fallback[i % 4];
  const max = Math.max(...rows.map(r => r.values.reduce((t, v) => t + v.value, 0)));
  const ticks = niceTicks(0, max);
  const yMax = ticks[ticks.length - 1];
  const n = 9, bw = (W - PAD.l - PAD.r) / n;
  const sy = (y: number) => PAD.t + (1 - y / yMax) * (H - PAD.t - PAD.b);
  const keys = rows[0]?.values ?? [];
  const hv = hover ? rows.find(r => r.quarter === hover.q)?.values.find(v => v.key === hover.key) : null;
  return (
    <figure className="ds-chart-wrap" style={{ margin: 0 }} data-testid={testId}>
      <svg className="ds-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue by business segment per quarter" onMouseLeave={() => setHover(null)}>
        {ticks.map(t => (
          <g key={t}><line className="ds-grid-line" x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} /><text x={PAD.l - 6} y={sy(t) + 3} textAnchor="end">${t}M</text></g>
        ))}
        {rows.map(r => {
          let acc = 0;
          const x = PAD.l + r.quarter * bw + bw * 0.2;
          return (
            <g key={r.quarter}>
              {r.values.map((v, i) => {
                const y0 = sy(acc), y1 = sy(acc + v.value);
                acc += v.value;
                const h = Math.max(0, y0 - y1 - 2);
                return <rect key={v.key} x={x} y={y1} width={bw * 0.6} height={h} rx={i === r.values.length - 1 ? 3 : 0} fill={colorOf(v.key, i)} onMouseEnter={() => setHover({ q: r.quarter, key: v.key })} />;
              })}
              <text x={x + bw * 0.3} y={H - 6} textAnchor="middle">{r.quarter === 0 ? 'Start' : `Q${r.quarter}`}</text>
            </g>
          );
        })}
      </svg>
      {hover && hv && <div className="ds-tooltip" style={{ left: `${((PAD.l + hover.q * bw + bw * 0.5) / W) * 100}%`, top: '10%' }}>{hover.q === 0 ? 'Start' : `Q${hover.q}`} · {hv.label}: ${hv.value.toFixed(1)}M</div>}
      <div className="ds-legend">{keys.map((k, i) => <span key={k.key}><i style={{ background: colorOf(k.key, i) }} />{k.label}</span>)}</div>
    </figure>
  );
}

export function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="ds-error" role="alert" data-testid="v2-error"><Icon name="alert" />{error}</div>;
}

/** Collapsible section (native details/summary: keyboard accessible, no JS state). */
export function Fold({ title, hint, children, open, testId }: { title: ReactNode; hint?: ReactNode; children: ReactNode; open?: boolean; testId?: string }) {
  return (
    <details className="ds-fold" open={open} data-testid={testId}>
      <summary>{title}{hint && <span className="ds-fold-hint">{hint}</span>}</summary>
      <div className="ds-fold-body">{children}</div>
    </details>
  );
}

/** Unboxed section with an eyebrow label and a display title. */
export function Section({ eyebrow, title, children, testId, className = '', action }: { eyebrow?: ReactNode; title?: ReactNode; children: ReactNode; testId?: string; className?: string; action?: ReactNode }) {
  return (
    <section className={`ds-section ${className}`} data-testid={testId}>
      {(eyebrow || action) && <div className="ds-row" style={{ justifyContent: 'space-between' }}>{eyebrow ? <p className="ds-eyebrow">{eyebrow}</p> : <span />}{action}</div>}
      {title && <h2 className="ds-title">{title}</h2>}
      {children}
    </section>
  );
}

/** Modal confirmation (not a browser dialog). Escape and the backdrop cancel. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, busy, testId }: { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy?: boolean; testId?: string }) {
  return (
    <div className="ds-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel(); }} onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}>
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="ds-dialog-title" data-testid={testId}>
        <h2 id="ds-dialog-title">{title}</h2>
        <div className="ds-small" style={{ color: 'var(--ds-ink-2)' }}>{children}</div>
        <div className="ds-actions">
          <button className="ds-btn ds-btn-secondary" onClick={onCancel} data-testid={testId ? `${testId}-cancel` : undefined} autoFocus>Go back</button>
          <button className="ds-btn ds-btn-chapter" onClick={onConfirm} disabled={busy} data-testid={testId ? `${testId}-confirm` : undefined}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/** Big figure with label, value, delta and a short note. */
export function Figure({ label, value, delta, sub, testId }: { label: string; value: string; delta?: { direction: Direction; tone: Tone; text: string }; sub?: string; testId?: string }) {
  return (
    <div className="ds-figure" data-testid={testId}>
      <span className="ds-fig-label">{label}</span>
      <span className="ds-fig-value">{value}</span>
      {delta && <Delta {...delta} />}
      {sub && <div className="ds-fig-sub">{sub}</div>}
    </div>
  );
}
