import type { V2DestinationId } from '../../../simulation/engineV2Destination';
import { V2_DESTINATIONS } from '../../../simulation/engineV2Destination';
import type { V2Signal } from '../types';

export const money = (x: number, d = 1) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(d)}M`;
export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
export const num = (x: number, d = 0) => x.toFixed(d);

export const destinationName = (id: V2DestinationId | null | undefined) => (id ? V2_DESTINATIONS[id].name : 'Not yet committed');

export const BUCKET_LABELS = {
  consumer: 'Consumer growth',
  enterprise: 'Enterprise sales & Customer Success',
  aiProduct: 'AI / Product',
  people: 'People & Talent',
  universityCredentials: 'University & Credentials',
  cashReserve: 'Cash reserve (unspent)',
} as const;

export const FINAL_LABELS: Record<string, string> = {
  'continue': 'Continue on the current course',
  'scale-independently': 'Scale independently',
  'raise-growth-capital': 'Raise growth capital',
  'acquire-consolidate': 'Acquire / consolidate a competitor',
  'strategic-sale': 'Strategic sale of the company',
  'stabilize-restructure': 'Stabilize and restructure',
};

export const SIGNAL_KIND_LABEL: Record<V2Signal['kind'], string> = {
  measured: 'Measured (our own data, last quarter)',
  headline: 'Headline (may overstate)',
  estimate: 'Estimate (range)',
  lagging: 'Lagging indicator',
};

export function signalValue(s: V2Signal): string {
  const unit = s.unit ?? '';
  const fmt = (v: number) => (unit === '$M' ? money(v) : unit === '%' ? `${v.toFixed(1)}%` : `${Number.isInteger(v) ? v : v.toFixed(1)}${unit && unit !== 'index' ? ` ${unit}` : ''}`);
  if (s.range) return `${fmt(s.range[0])} to ${fmt(s.range[1])}`;
  if (s.value !== undefined) return fmt(s.value);
  return '';
}
