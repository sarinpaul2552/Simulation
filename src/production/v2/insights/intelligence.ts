/**
 * EXECUTIVE INTELLIGENCE DASHBOARD DATA (Batch 8 · Stage 2)
 *
 * Metric catalogue and series for the dashboard sections. Every value is a recorded engine value (or the simulated
 * share price from valuation.ts) for Q4 2022 through the last completed quarter — never a future value and never an
 * external benchmark.
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { startingCompany, type QuarterRecord } from './history';
import { healthIndicators, type HealthIndicator } from './dashboard';
import { valuationSeries } from './valuation';

export type DashSection = 'overview' | 'financial' | 'commercial' | 'product' | 'organization';
export type MetricFormat = '$M' | 'pct' | '%' | 'idx' | '$';

export interface DashMetric {
  id: string;
  section: Exclude<DashSection, 'overview'>;
  label: string;
  glossary?: string;
  format: MetricFormat;
  better: 'higher' | 'lower' | 'context';
  explain: string;
  value: (s: V2TeamState, q: number, price: (q: number) => number) => number;
}

const margin = (s: V2TeamState) => (s.revenue > 0 ? s.operatingProfit / s.revenue : 0);

export const DASH_METRICS: DashMetric[] = [
  { id: 'revenue', section: 'financial', label: 'Revenue', format: '$M', better: 'higher', explain: 'Money earned from customers in the quarter.', value: s => s.revenue },
  { id: 'operatingProfit', section: 'financial', label: 'Operating profit', glossary: 'operating-profit', format: '$M', better: 'higher', explain: 'Revenue less the cost of running the business, before strategic investment.', value: s => s.operatingProfit },
  { id: 'margin', section: 'financial', label: 'Operating margin', glossary: 'operating-margin', format: 'pct', better: 'higher', explain: 'Operating profit as a share of revenue.', value: s => margin(s) },
  { id: 'cash', section: 'financial', label: 'Cash', glossary: 'liquidity', format: '$M', better: 'context', explain: 'Cash at the end of the quarter. Below $15M the company cannot operate; above $40M is comfortable.', value: s => s.cash },
  { id: 'debt', section: 'financial', label: 'Debt', format: '$M', better: 'lower', explain: 'Borrowing outstanding. Debt funds the present and must be serviced from future profit.', value: s => s.financing.debt },
  { id: 'ownership', section: 'financial', label: 'Original shareholders’ ownership', format: 'pct', better: 'higher', explain: 'Share of the company still owned by the original shareholders after any share sales.', value: s => s.financing.ownership },
  { id: 'sharePrice', section: 'financial', label: 'Share price (simulated)', format: '$', better: 'higher', explain: 'The simulated NXLN share price; see the valuation bridge for what moved it.', value: (_s, q, price) => price(q) },
  { id: 'consumerRevenue', section: 'commercial', label: 'Consumer revenue', format: '$M', better: 'higher', explain: 'Quarterly revenue from individual subscribers.', value: s => s.segmentRevenue.consumer },
  { id: 'consumerRetention', section: 'commercial', label: 'Consumer retention', glossary: 'retention', format: '%', better: 'higher', explain: 'Share of paying consumers who stay each quarter.', value: s => s.commercial.consumerRetention },
  { id: 'cac', section: 'commercial', label: 'Cost to win a customer (index)', glossary: 'cac', format: 'idx', better: 'lower', explain: '100 = the starting cost; higher means each new customer costs more.', value: s => s.commercial.consumerCacIndex },
  { id: 'pricingPower', section: 'commercial', label: 'Pricing power', glossary: 'pricing-power', format: 'idx', better: 'higher', explain: 'Ability to hold or raise prices without losing customers.', value: s => s.commercial.pricingPower },
  { id: 'pipeline', section: 'commercial', label: 'Enterprise pipeline', glossary: 'pipeline', format: '$M', better: 'higher', explain: 'Value of qualified enterprise deals in progress (not revenue).', value: s => s.commercial.enterprisePipeline },
  { id: 'winRate', section: 'commercial', label: 'Enterprise win rate', glossary: 'win-rate', format: '%', better: 'higher', explain: 'Share of resolved enterprise deals that were won.', value: s => s.commercial.enterpriseWinRate },
  { id: 'enterpriseRevenue', section: 'commercial', label: 'Enterprise revenue', format: '$M', better: 'higher', explain: 'Quarterly revenue from company clients.', value: s => s.segmentRevenue.enterprise },
  { id: 'universityRevenue', section: 'commercial', label: 'University revenue', format: '$M', better: 'higher', explain: 'Quarterly revenue from university partners.', value: s => s.segmentRevenue.university },
  { id: 'universityRenewal', section: 'commercial', label: 'University renewals', glossary: 'renewal', format: '%', better: 'higher', explain: 'Share of university contracts renewed.', value: s => s.commercial.universityRenewalRate },
  { id: 'aiRevenue', section: 'commercial', label: 'AI-native revenue', format: '$M', better: 'higher', explain: 'Quarterly revenue from AI-native products.', value: s => s.segmentRevenue.aiNative },
  { id: 'productQuality', section: 'product', label: 'Product quality', format: 'idx', better: 'higher', explain: 'How good the core product is (0–100).', value: s => s.productQuality },
  { id: 'aiReadiness', section: 'product', label: 'AI commercial readiness', glossary: 'strategic-readiness', format: 'idx', better: 'higher', explain: 'Whether AI products are good enough to sell (0–100).', value: s => s.commercial.aiCommercialReadiness },
  { id: 'aiCapability', section: 'product', label: 'AI and product capability', format: 'idx', better: 'higher', explain: 'Accumulated AI and product engineering capability (0–100).', value: s => s.capabilities.ai },
  { id: 'aiAdoption', section: 'product', label: 'AI product adoption', format: 'idx', better: 'higher', explain: 'How widely customers use the AI products (0–100); lags readiness.', value: s => s.commercial.aiAdoptionIndex },
  { id: 'trust', section: 'product', label: 'Customer trust', glossary: 'trust', format: 'idx', better: 'higher', explain: 'How far customers and institutions trust the product and the company.', value: s => s.trust },
  { id: 'credential', section: 'product', label: 'Credential capability', glossary: 'credential-network', format: 'idx', better: 'higher', explain: 'Accredited credentials and university relationships (0–100).', value: s => s.capabilities.credential },
  { id: 'culture', section: 'organization', label: 'Culture', format: 'idx', better: 'higher', explain: 'Health of the organization’s culture (0–100); low culture reduces capacity.', value: s => s.culture },
  { id: 'talent', section: 'organization', label: 'Talent', format: 'idx', better: 'higher', explain: 'Strength of the company’s people (0–100).', value: s => s.capabilities.talent },
  { id: 'execution', section: 'organization', label: 'Execution capability', format: 'idx', better: 'higher', explain: 'How reliably the company delivers what it decides (0–100).', value: s => s.capabilities.execution },
  { id: 'capacity', section: 'organization', label: 'Organizational capacity', glossary: 'execution-capacity', format: 'idx', better: 'higher', explain: 'How much change the company can absorb (0–100).', value: s => s.organizationalCapacity },
  { id: 'load', section: 'organization', label: 'Change load vs capacity', glossary: 'org-load', format: 'pct', better: 'context', explain: 'Change workload as a share of capacity. Above 100% investments are partly lost.', value: s => (s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0) },
];

export const SECTION_LABEL: Record<DashSection, string> = {
  overview: 'Executive overview', financial: 'Financial', commercial: 'Commercial', product: 'Product and capability', organization: 'Organization',
};

export function formatMetricValue(f: MetricFormat, v: number): string {
  switch (f) {
    case '$M': return `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(1)}M`;
    case 'pct': return `${(v * 100).toFixed(1)}%`;
    case '%': return `${v.toFixed(1)}%`;
    case '$': return `$${v.toFixed(2)}`;
    default: return v.toFixed(0);
  }
}
export function formatMetricDelta(f: MetricFormat, d: number): string {
  const s = d > 0 ? '+' : d < 0 ? '−' : '±';
  const a = Math.abs(d);
  switch (f) {
    case '$M': return a < 0.05 ? '±$0.0M' : `${s}$${a.toFixed(1)}M`;
    case 'pct': return a < 0.0005 ? '±0.0 pts' : `${s}${(a * 100).toFixed(1)} pts`;
    case '%': return a < 0.05 ? '±0.0 pts' : `${s}${a.toFixed(1)} pts`;
    case '$': return a < 0.005 ? '±$0.00' : `${s}$${a.toFixed(2)}`;
    default: return a < 0.5 ? '±0' : `${s}${a.toFixed(0)}`;
  }
}
/** Tone of a movement: favourable / unfavourable / neutral (context metrics are never judged by sign). */
export function movementTone(better: DashMetric['better'], d: number, eps: number): 'good' | 'bad' | 'neutral' {
  if (Math.abs(d) < eps || better === 'context') return 'neutral';
  return (d > 0) === (better === 'higher') ? 'good' : 'bad';
}
export const epsFor = (f: MetricFormat) => (f === 'pct' ? 0.0005 : f === '$' ? 0.005 : f === 'idx' ? 0.5 : 0.05);

export interface DashboardData {
  quarter: number;
  states: V2TeamState[];
  prices: number[];
  series: (id: string) => { quarter: number; value: number }[];
}

/** States and prices from Q4 2022 (index 0) to the completed quarter. */
export function dashboardData(history: QuarterRecord[], quarter = history.length): DashboardData {
  const states = [startingCompany(), ...history.slice(0, quarter).map(h => h.after)];
  const prices = valuationSeries(history.slice(0, quarter)).points.map(p => p.price);
  const price = (q: number) => prices[q];
  return {
    quarter, states, prices,
    series: id => {
      const m = DASH_METRICS.find(x => x.id === id)!;
      return states.map((s, q) => ({ quarter: q, value: m.value(s, q, price) }));
    },
  };
}

export interface HealthRow {
  id: HealthIndicator['id'];
  label: string;
  current: number;
  level: HealthIndicator['level'];
  deltaPrevious: number | null;
  deltaStart: number;
  summary: string;
  formula: string;
  drivers: { label: string; current: string; previous: string | null; start: string }[];
}

/** Health indicators with movement vs the previous quarter and vs Q4 2022 (dashboard interpretation, not a score). */
export function healthMovements(history: QuarterRecord[], quarter = history.length): HealthRow[] {
  const now = healthIndicators(history[quarter - 1].after);
  const prev = quarter > 1 ? healthIndicators(history[quarter - 2].after) : healthIndicators(startingCompany());
  const start = healthIndicators(startingCompany());
  return now.map(h => {
    const p = prev.find(x => x.id === h.id)!, s0 = start.find(x => x.id === h.id)!;
    return {
      id: h.id, label: h.label, current: h.score, level: h.level,
      deltaPrevious: h.score - p.score, deltaStart: h.score - s0.score,
      summary: h.summary, formula: h.formula,
      drivers: h.drivers.map((d, i) => ({ label: d.label, current: d.value, previous: p.drivers[i]?.label === d.label ? p.drivers[i].value : null, start: s0.drivers[i]?.label === d.label ? s0.drivers[i].value : '—' })),
    };
  });
}

export interface KpiDashboardRow {
  id: string; section: Exclude<DashSection, 'overview'>; label: string; glossary?: string;
  start: string; end: string; change: string; pct: string; tone: 'good' | 'bad' | 'neutral'; direction: 'up' | 'down' | 'flat'; interpretation: string;
}

/** Complete KPI dashboard for the board report: start (Q4 2022), end, absolute and % change, interpretation. */
export function kpiDashboard(history: QuarterRecord[], quarter = history.length): KpiDashboardRow[] {
  const d = dashboardData(history, quarter);
  return DASH_METRICS.map(m => {
    const ser = d.series(m.id);
    const a = ser[0].value, b = ser[quarter].value, diff = b - a;
    const eps = epsFor(m.format);
    const tone = movementTone(m.better, diff, eps);
    const direction = Math.abs(diff) < eps ? 'flat' : diff > 0 ? 'up' : 'down';
    const pct = Math.abs(a) > 1e-9 && m.format !== 'pct' && m.format !== '%' ? `${diff >= 0 ? '+' : '−'}${Math.abs((diff / Math.abs(a)) * 100).toFixed(1)}%` : '—';
    let interpretation: string;
    if (m.id === 'cash') interpretation = b < 15 ? 'Below the minimum needed to operate.' : b < 40 ? 'Below the comfortable level.' : 'Comfortable; cash above this level earns nothing on its own.';
    else if (m.id === 'load') interpretation = b > 1 ? 'Teams overloaded: part of new investment is lost.' : b > 0.8 ? 'Stretched.' : b < 0.3 ? 'Little change under way.' : 'Within capacity.';
    else interpretation = direction === 'flat' ? 'Unchanged from the start.' : tone === 'good' ? 'Improved on the starting position.' : tone === 'bad' ? 'Deteriorated from the starting position.' : 'Changed — read in context.';
    return { id: m.id, section: m.section, label: m.label, glossary: m.glossary, start: formatMetricValue(m.format, a), end: formatMetricValue(m.format, b), change: formatMetricDelta(m.format, diff), pct, tone, direction, interpretation };
  });
}
