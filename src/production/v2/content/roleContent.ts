/**
 * PRIVATE ROLE BRIEFINGS (Batch 8 · Stage 1 — rewritten without recommendations)
 *
 * Batch 8 · Stage 2 layout (a 60–90 second read): your mandate · your current position (three priority KPIs, full
 * table expandable) · confidential intelligence · what concerns you · questions for your colleagues. Nothing tells a
 * role which choice is best.
 *
 * Data sources:
 *  - current business position = the KPIs that role owns, exactly as adapter.getRoleBrief reports them, with the
 *    value at the starting position (Q4 2022) and last quarter from replaying the team's own committed inputs;
 *  - evidence = the role's private scenario signals (adapter.getRoleBrief) plus written readings that present
 *    competing interpretations (content/briefings.ts);
 *  - hidden market truth is never used.
 */
import type { V2Role } from '../../../simulation/engineV2Scenario';
import { getRoleBrief, workingQuarter, initializeGame, replayInputs } from '../adapter';
import type { V2GameSnapshot } from '../snapshot';
import type { V2Signal } from '../types';
import { V2PresentationMode, ModeText, mt, pick } from './modes';
import { evidenceKind, EvidenceKind, SIGNAL_PLAIN } from './scenarioContent';
import { QUARTER_BRIEFS, ROLE_OBJECTIVES } from './briefings';

export interface RoleKnowledge { id: string; evidence: EvidenceKind; text: string; value?: string }
export interface PositionRow { id: string; label: string; glossary?: string; value: string; start?: string; previous?: string; change?: { text: string; direction: 'up' | 'down' | 'flat' } }
export interface RoleBriefing {
  role: V2Role;
  title: string;
  perspective: string;
  responsibility: string;
  /** Full KPI table (shown in an expandable section). */
  position: PositionRow[];
  /** The three priority KPIs shown first. */
  priority: PositionRow[];
  evidence: RoleKnowledge[];
  suggests: string[];
  uncertain: string[];
  objectives: string[];
  discuss: { with: V2Role; ask: string }[];
}

export const ROLE_TITLES: Record<V2Role, string> = {
  CEO: 'Chief Executive Officer', CFO: 'Chief Financial Officer', Product: 'Chief Product Officer',
  People: 'Chief People Officer', Growth: 'Chief Growth Officer',
};
const PERSPECTIVE: Record<V2Role, string> = {
  CEO: 'Strategy and board expectations', CFO: 'Profitability, liquidity and financing',
  Product: 'Product quality, innovation and trust', People: 'Talent, culture and execution capacity',
  Growth: 'Revenue, customers and pipeline',
};
const RESPONSIBILITY: Record<V2Role, ModeText> = {
  CEO: mt('You are accountable for the company’s overall performance and direction, and you answer to the board.', 'You own overall business performance, the strategic direction and the board relationship.'),
  CFO: mt('You are accountable for profits, cash and the company’s ability to survive bad news.', 'You own profitability, liquidity, financial resilience and financing decisions.'),
  Product: mt('You are accountable for how good the product is, how it improves, and whether customers can trust it.', 'You own product quality, innovation, technical delivery and the trust customers place in the product.'),
  People: mt('You are accountable for the people: their skills, their culture, and how much change they can deliver.', 'You own talent, culture and organizational execution capacity.'),
  Growth: mt('You are accountable for revenue: winning customers, keeping them, and building future deals.', 'You own revenue growth, acquisition, retention and the enterprise pipeline.'),
};

/** KPIs shown in undergraduate mode (MBA shows all the role's KPIs). */
const UG_KPIS: Record<V2Role, string[]> = {
  CEO: ['ceo-revenue', 'ceo-trust', 'ceo-pricing'],
  CFO: ['cfo-cash', 'cfo-op', 'cfo-margin', 'cfo-debt'],
  Product: ['product-pq', 'product-ai', 'product-ai-readiness'],
  People: ['people-talent', 'people-culture', 'people-capacity', 'people-load'],
  Growth: ['growth-consumer-revenue', 'growth-retention', 'growth-cac', 'growth-pipeline'],
};
/** The three KPIs each role sees first (the full table is one click away). */
export const PRIORITY_KPIS: Record<V2Role, string[]> = {
  CEO: ['ceo-revenue', 'ceo-pricing', 'ceo-trust'],
  CFO: ['cfo-cash', 'cfo-op', 'cfo-margin'],
  Product: ['product-pq', 'product-ai', 'product-ai-readiness'],
  People: ['people-culture', 'people-talent', 'people-load'],
  Growth: ['growth-consumer-revenue', 'growth-retention', 'growth-pipeline'],
};
/** Glossary entry for a KPI id (shown as a tappable definition). */
const KPI_GLOSSARY: Record<string, string> = {
  'ceo-pricing': 'pricing-power', 'ceo-university-renewal': 'renewal', 'ceo-credential-network': 'credential-network', 'ceo-trust': 'trust',
  'cfo-op': 'operating-profit', 'cfo-margin': 'operating-margin', 'cfo-solvency': 'liquidity',
  'product-ai-readiness': 'strategic-readiness',
  'people-capacity': 'execution-capacity', 'people-load': 'org-load',
  'growth-retention': 'retention', 'growth-cac': 'cac', 'growth-pipeline': 'pipeline', 'growth-win-rate': 'win-rate',
};

const fmtVal = (s: V2Signal): string => {
  if (s.id === 'cfo-runway') return s.value === undefined || s.value === null ? 'self-funding' : s.value > 8 ? '> 8 qtrs' : `${s.value.toFixed(1)} qtrs`;
  if (s.value === undefined || s.value === null) return s.label.includes(':') ? s.label.split(':').slice(1).join(':').trim() : '—';
  if (s.unit === '$M') return `${s.value < 0 ? '−' : ''}$${Math.abs(s.value).toFixed(1)}M`;
  if (s.unit === '%') return `${s.value.toFixed(1)}%`;
  if (s.unit === 'quarters') return `${s.value.toFixed(1)} qtrs`;
  return s.value.toFixed(0);
};
const labelOf = (s: V2Signal) => {
  if (s.id === 'cfo-runway') return 'Runway at last quarter’s burn';
  const l = (s.value === undefined || s.value === null) && s.label.includes(':') ? s.label.split(':')[0] : s.label;
  return l.replace(/\s*\(last quarter\)/, ''); // the column headers carry the quarter
};

function changeOf(cur: V2Signal, prev: V2Signal | undefined): PositionRow['change'] {
  if (cur.id === 'cfo-runway') return undefined;
  if (!prev || cur.value === undefined || prev.value === undefined || cur.value === null || prev.value === null) return undefined;
  const d = cur.value - prev.value;
  const eps = cur.unit === '$M' ? 0.05 : 0.5;
  if (Math.abs(d) < eps) return { text: 'no change', direction: 'flat' };
  const t = cur.unit === '$M' ? `$${Math.abs(d).toFixed(1)}M` : cur.unit === '%' ? `${Math.abs(d).toFixed(1)} pts` : `${Math.abs(d).toFixed(0)}`;
  return { text: `${d > 0 ? '+' : '−'}${t}`, direction: d > 0 ? 'up' : 'down' };
}

const startCache = new Map<V2Role, V2Signal[]>();
function startSignals(role: V2Role): V2Signal[] {
  if (!startCache.has(role)) startCache.set(role, getRoleBrief(initializeGame(), role).signals);
  return startCache.get(role)!;
}

function priorityRows(role: V2Role, position: PositionRow[]): PositionRow[] {
  const picked = PRIORITY_KPIS[role].map(id => position.find(p => p.id === id)).filter((p): p is PositionRow => !!p);
  for (const p of position) if (picked.length < 3 && !picked.includes(p)) picked.push(p);
  return picked.slice(0, 3);
}

/** Words a student reads in the default (collapsed) briefing view. */
export function briefingWords(b: RoleBriefing): number {
  const parts = [b.responsibility, ...b.priority.map(p => `${p.label} ${p.value}`), ...b.evidence.map(e => e.text), ...b.suggests, ...b.uncertain, ...b.discuss.map(d => d.ask)];
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

export function buildRoleBriefing(snap: V2GameSnapshot, role: V2Role, mode: V2PresentationMode): RoleBriefing {
  const q = workingQuarter(snap) ?? snap.completedQuarter;
  const brief = getRoleBrief(snap, role);
  const prevSnap = snap.inputs.length > 0 ? replayInputs(snap.inputs.slice(0, -1)) : null;
  const prevSignals = prevSnap ? getRoleBrief(prevSnap, role).signals : null;
  const start = startSignals(role);
  let measured = brief.signals.filter(x => x.kind === 'measured');
  if (mode === 'undergraduate') measured = measured.filter(m => UG_KPIS[role].includes(m.id) || m.id.startsWith('ceo-readiness-') || m.id === 'ceo-destination-readiness');
  const position: PositionRow[] = measured.map(m => {
    const st = start.find(x => x.id === m.id);
    const pv = prevSignals?.find(x => x.id === m.id);
    return {
      id: m.id, label: labelOf(m), glossary: KPI_GLOSSARY[m.id], value: fmtVal(m),
      start: st ? fmtVal(st) : undefined,
      previous: pv ? fmtVal(pv) : undefined,
      change: changeOf(m, pv ?? st),
    };
  });
  const scenario = brief.signals.filter(x => x.kind !== 'measured');
  const evidence: RoleKnowledge[] = scenario.map(s => ({ id: s.id, evidence: evidenceKind(s.kind as 'headline' | 'estimate' | 'lagging'), text: mode === 'undergraduate' && SIGNAL_PLAIN[s.id] ? SIGNAL_PLAIN[s.id] : s.label }));
  const qb = QUARTER_BRIEFS[q]?.[role];
  return {
    role, title: ROLE_TITLES[role], perspective: PERSPECTIVE[role], responsibility: pick(mode, RESPONSIBILITY[role]),
    position, priority: priorityRows(role, position), evidence,
    suggests: (qb?.suggests ?? []).map(t => pick(mode, t)),
    uncertain: (qb?.uncertain ?? []).map(t => pick(mode, t)),
    objectives: ROLE_OBJECTIVES[role].map(t => pick(mode, t)),
    discuss: (qb?.discuss ?? []).map(d => ({ with: d.with, ask: pick(mode, d.ask) })),
  };
}
