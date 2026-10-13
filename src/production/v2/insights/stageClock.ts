/**
 * Facilitator stage clock (Batch 10E) — a plain countdown in the facilitator's browser only.
 *
 * It is guidance, not control: it has no access to the API, never opens, advances or locks a quarter, and is not
 * shown on student devices. Reaching zero only changes the text to "Time".
 */
export interface ClockState { durationMs: number; startedAt: number | null; elapsedMs: number }
export type ClockAction = { type: 'set'; minutes: number } | { type: 'start'; now: number } | { type: 'pause'; now: number } | { type: 'reset' };

export const CLOCK_PRESETS = [
  { minutes: 6, label: 'Fast quarter 6:00' },
  { minutes: 9, label: 'Major quarter 9:00' },
  { minutes: 20, label: 'Final debrief 20:00' },
] as const;

export const initialClock = (minutes = 6): ClockState => ({ durationMs: minutes * 60_000, startedAt: null, elapsedMs: 0 });

export function clockReducer(s: ClockState, a: ClockAction): ClockState {
  switch (a.type) {
    case 'set': return initialClock(a.minutes);
    case 'start': return s.startedAt !== null ? s : { ...s, startedAt: a.now };
    case 'pause': return s.startedAt === null ? s : { ...s, startedAt: null, elapsedMs: s.elapsedMs + Math.max(0, a.now - s.startedAt) };
    case 'reset': return { ...s, startedAt: null, elapsedMs: 0 };
  }
}

export function clockRemainingMs(s: ClockState, now: number): number {
  const elapsed = s.elapsedMs + (s.startedAt !== null ? Math.max(0, now - s.startedAt) : 0);
  return Math.max(0, s.durationMs - elapsed);
}

export function clockText(s: ClockState, now: number): string {
  const ms = clockRemainingMs(s, now);
  if (ms <= 0) return 'Time';
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
