/**
 * E8 · CAPABILITY SATURATION WARNING (NexLearn V3; shown in V2 and V3 games — it reads state only).
 *
 * A capability cannot exceed its ceiling (100, or a destination's specialised ceiling); gains that mature beyond it
 * are wasted. A bucket is "close to what the organization can use" when its main capability plus the gains still
 * maturing from earlier investment is within `MARGIN` points of the ceiling that will apply next quarter.
 * Qualitative only: no formula is shown to students.
 */
import type { V2TeamState } from '../../../simulation/engineV2';
import { destinationEffects } from '../../../simulation/engineV2Destination';
import type { Bucket } from './consequences';

export const SATURATION_MARGIN = 5;
const PRIMARY: Record<Bucket, 'consumer' | 'enterprise' | 'ai' | 'talent' | 'credential'> = {
  consumer: 'consumer', enterprise: 'enterprise', aiProduct: 'ai', people: 'talent', universityCredentials: 'credential',
};

export interface SaturationStatus {
  bucket: Bucket;
  capability: string;
  current: number;
  /** Gains from earlier investment that have not yet matured. */
  pending: number;
  ceiling: number;
  /** Room left before the ceiling once pending gains land (may be negative). */
  room: number;
  near: boolean;
}

export function saturationStatus(state: V2TeamState, bucket: Bucket): SaturationStatus {
  const target = PRIMARY[bucket];
  const current = state.capabilities[target];
  const pending = state.pendingCohorts.reduce((t, c) => t + c.gains.filter(g => g.target === target).reduce((u, g) => u + g.remaining, 0), 0);
  const ceiling = destinationEffects(state.destination, state.quarter + 1).ceilings[target] ?? 100;
  const room = ceiling - current - pending;
  return { bucket, capability: target, current, pending, ceiling, room, near: room <= SATURATION_MARGIN };
}
