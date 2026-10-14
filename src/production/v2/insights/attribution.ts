/**
 * QUARTER ATTRIBUTION (Batch 8 · Stage 2)
 *
 * Splits each indicator's movement in a quarter into the components the frozen engine itself recorded — nothing is
 * estimated and nothing is counterfactual. Components always sum to the recorded movement (a residual line is shown
 * only if the engine applied an effect this module does not itemise, and it is labelled as such).
 *
 *   Commercial indicators (V2IndicatorDiagnostic):
 *     decision / event   applied commercial shocks (management actions, contracts, crisis) — before the pipeline
 *     market             indicator.marketContribution (the scenario's market conditions; the same for every team)
 *     capabilities       capabilityContribution + dependencyContribution (capability levels built by earlier
 *                        investment — the delayed effect of investment)
 *     reversion          decayOrAttrition (drift toward the starting anchor / pipeline resolution) + clipping
 *   Capabilities (V2TargetSummary + maturation entries):
 *     decision           capability matured from THIS quarter's investment, and applied state shocks
 *     delayed investment capability matured from investment made in EARLIER quarters
 *     other              any remaining recorded change (e.g. saturation at the ceiling)
 */
import type { QuarterRecord } from './history';

export type DriverKind = 'market' | 'decision' | 'investment' | 'reversion' | 'other';
export const DRIVER_LABEL: Record<DriverKind, string> = {
  market: 'Market', decision: 'Decision or event', investment: 'Delayed investment', reversion: 'Natural drift', other: 'Other recorded effects',
};

export interface AttributionRow {
  id: string;
  label: string;
  glossary?: string;
  unit: '%' | '$M' | 'idx';
  better: 'higher' | 'lower';
  opening: number;
  closing: number;
  movement: number;
  components: { kind: DriverKind; amount: number; detail: string }[];
  driver: DriverKind | null;
}

const COMMERCIAL: { id: string; label: string; glossary?: string; unit: AttributionRow['unit']; better: 'higher' | 'lower' }[] = [
  { id: 'consumerRetention', label: 'Consumer retention', glossary: 'retention', unit: '%', better: 'higher' },
  { id: 'consumerCacIndex', label: 'Cost to win a customer (index)', glossary: 'cac', unit: 'idx', better: 'lower' },
  { id: 'enterprisePipeline', label: 'Enterprise pipeline', glossary: 'pipeline', unit: '$M', better: 'higher' },
  { id: 'enterpriseWinRate', label: 'Enterprise win rate', glossary: 'win-rate', unit: '%', better: 'higher' },
  { id: 'universityRenewalRate', label: 'University renewals', glossary: 'renewal', unit: '%', better: 'higher' },
  { id: 'pricingPower', label: 'Pricing power', glossary: 'pricing-power', unit: 'idx', better: 'higher' },
  { id: 'aiAdoptionIndex', label: 'AI product adoption', unit: 'idx', better: 'higher' },
];
const CAPS: { id: string; label: string }[] = [
  { id: 'productQuality', label: 'Product quality' }, { id: 'trust', label: 'Customer trust' }, { id: 'ai', label: 'AI and product capability' },
  { id: 'consumer', label: 'Consumer capability' }, { id: 'enterprise', label: 'Enterprise capability' }, { id: 'credential', label: 'Credential capability' },
  { id: 'talent', label: 'Talent' }, { id: 'customerSuccess', label: 'Customer success' },
];

type Num = Record<string, number>;
const capValue = (s: QuarterRecord['after'], id: string): number => {
  if (id === 'productQuality') return s.productQuality;
  if (id === 'trust') return s.trust;
  return (s.capabilities as unknown as Num)[id];
};

function finish(row: Omit<AttributionRow, 'driver' | 'movement'>): AttributionRow {
  const movement = row.closing - row.opening;
  const sum = row.components.reduce((t, c) => t + c.amount, 0);
  const resid = movement - sum;
  const components = [...row.components];
  if (Math.abs(resid) > 1e-6) components.push({ kind: 'other', amount: resid, detail: 'Other recorded engine effects this quarter' });
  const shown = components.filter(c => Math.abs(c.amount) >= 0.05);
  const top = [...shown].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  return { ...row, movement, components, driver: Math.abs(movement) < 0.05 && !top ? null : top?.kind ?? null };
}

export function quarterAttribution(rec: QuarterRecord): AttributionRow[] {
  const c = rec.consequence;
  const rows: AttributionRow[] = [];
  for (const meta of COMMERCIAL) {
    const ind = c.commercial.indicators.find(i => i.indicator === meta.id);
    if (!ind) continue;
    const before = (rec.before.commercial as unknown as Num)[meta.id];
    const shocks = c.appliedCommercialShocks.filter(s => s.indicator === meta.id);
    const shock = shocks.reduce((t, s) => t + (s.after - s.before), 0);
    rows.push(finish({
      id: meta.id, label: meta.label, glossary: meta.glossary, unit: meta.unit, better: meta.better,
      opening: before, closing: (rec.after.commercial as unknown as Num)[meta.id],
      components: [
        { kind: 'decision', amount: shock, detail: shocks.length ? `Decisions and events: ${[...new Set(shocks.map(s => s.source))].join(', ')}` : 'No decision or event effect' },
        { kind: 'market', amount: ind.marketContribution, detail: 'Market conditions this quarter (the same for every team)' },
        { kind: 'investment', amount: ind.capabilityContribution + ind.dependencyContribution, detail: 'Capability levels built by earlier investment' },
        { kind: 'reversion', amount: ind.decayOrAttrition + ind.clipAmount + (ind.baseInflow ?? 0), detail: ind.kind === 'stock' ? 'New base inflow less deals resolved (won or lost) this quarter' : 'Natural drift back toward the long-run level' },
      ],
    }));
  }
  const cap = c.capability;
  for (const meta of CAPS) {
    const opening = capValue(rec.before, meta.id), closing = capValue(rec.after, meta.id);
    if (opening === undefined || closing === undefined) continue;
    const mat = cap.maturation.filter(m => m.target === meta.id);
    const now = mat.filter(m => m.offset === 0).reduce((t, m) => t + m.matured, 0);
    const earlier = mat.filter(m => m.offset > 0).reduce((t, m) => t + m.matured, 0);
    const t = cap.targets.find(x => x.target === meta.id);
    const realized = t ? t.realized : now + earlier;
    const gross = now + earlier;
    const scale = gross > 0 ? realized / gross : 1; // saturation at the ceiling reduces both proportionally
    const shocks = c.appliedShocks.filter(s => (s.target as string) === meta.id);
    const shock = shocks.reduce((tt, s) => tt + (s.after - s.before), 0);
    const org = (cap as { organization?: { customerSuccessLoss: number; talentLoss: number } }).organization;
    const strain = org ? (meta.id === 'customerSuccess' ? org.customerSuccessLoss : meta.id === 'talent' ? org.talentLoss : 0) : 0;
    rows.push(finish({
      id: meta.id, label: meta.label, unit: 'idx', better: 'higher', opening, closing,
      components: [
        ...(strain > 0 ? [{ kind: 'other' as const, amount: -strain, detail: 'Strain from culture below its starting level' }] : []),
        { kind: 'decision', amount: now * scale + shock, detail: shocks.length ? `This quarter’s investment, plus decisions and events: ${[...new Set(shocks.map(s => s.source))].join(', ')}` : 'Capability from this quarter’s investment' },
        { kind: 'investment', amount: earlier * scale, detail: 'Capability maturing from investment in earlier quarters' },
      ],
    }));
  }
  return rows;
}

export function formatAttr(unit: AttributionRow['unit'], v: number, signed = false): string {
  const sgn = signed ? (v > 0.0499 ? '+' : v < -0.0499 ? '−' : '±') : v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (unit === '$M') return `${sgn}$${a.toFixed(1)}M`;
  if (unit === '%') return `${sgn}${a.toFixed(1)}${signed ? ' pts' : '%'}`;
  return signed ? `${sgn}${a.toFixed(1)} index pts` : `${sgn}${a.toFixed(1)}`;
}
