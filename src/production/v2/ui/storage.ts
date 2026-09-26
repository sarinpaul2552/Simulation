/** Per-device reconnect hints (codes only; all game state lives on the server). Storage may be unavailable. */
import type { V2Role } from '../types';

const TEAM_KEY = 'v2_team_session';
const FAC_KEY = 'v2_facilitator_session';

export interface StoredTeamSession { sessionCode: string; teamCode: string; role?: V2Role }
export interface StoredFacilitatorSession { sessionCode: string; adminPin: string }

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the player can always rejoin with their codes */
  }
}

export const teamSession = {
  load: () => read<StoredTeamSession>(TEAM_KEY),
  save: (s: StoredTeamSession) => write(TEAM_KEY, s),
  clear: () => write(TEAM_KEY, null),
};

export const facilitatorSession = {
  load: () => read<StoredFacilitatorSession>(FAC_KEY),
  save: (s: StoredFacilitatorSession) => write(FAC_KEY, s),
  clear: () => write(FAC_KEY, null),
};

/** V1 remains available only behind an explicit developer flag. */
export function v1FallbackEnabled(): boolean {
  if (import.meta.env.VITE_ENABLE_V1_FALLBACK === 'true') return true;
  try {
    return window.localStorage.getItem('ENABLE_V1_FALLBACK') === 'true';
  } catch {
    return false;
  }
}
