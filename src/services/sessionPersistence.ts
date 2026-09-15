/**
 * Session Persistence Service
 * 
 * Handles saving and restoring game session state from browser storage.
 * Uses localStorage (not sessionStorage) because:
 * - sessionStorage doesn't persist in Edge InPrivate/browser private mode
 * - localStorage survives F5/reload reliably across all browser modes
 * - Session is validated through Supabase RPC before restoration (security)
 * - localStorage persists across tab close/reopen (useful for reconnect)
 * 
 * Validation of all session credentials happens through Supabase RPCs before restoration.
 */

export interface StoredSessionState {
  // Session identifiers (validated via RPC before restoration)
  sessionCode: string;
  sessionId: string;
  teamCode: string;
  teamId: string;
  facilitatorEmail?: string | null;
  
  // UI state (can be restored directly, represents player choice)
  currentQuarter: number;
  quarterPhase: 'event' | 'bet' | 'belief' | 'risk' | 'role-vote' | 'team-check' | 'commit' | 'consequence' | 'reflect';
  participationMode: 'team_device' | 'individual_device' | 'voting_disabled';
  
  // Timestamp for safety (optional, for future session expiration)
  storedAt: number;
}

const STORAGE_KEY = 'coursera_sim_session';

/**
 * Save session state to browser localStorage.
 * Called after successful session initialization or state changes.
 */
export function saveSessionState(state: StoredSessionState): void {
  try {
    const stateStr = JSON.stringify(state);
    console.log(`[SessionPersistence] SAVE: Q${state.currentQuarter} phase=${state.quarterPhase}`, state);
    localStorage.setItem(STORAGE_KEY, stateStr);
  } catch (err) {
    console.error('[SessionPersistence] Failed to save session state:', err);
    // Don't throw - graceful degradation if storage fails
  }
}

/**
 * Load session state from browser localStorage.
 * Returns null if no stored state or if parsing fails.
 */
export function loadSessionState(): StoredSessionState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('[SessionPersistence] LOAD: No stored state found');
      return null;
    }
    
    const state = JSON.parse(stored) as StoredSessionState;
    console.log(`[SessionPersistence] LOAD: Q${state.currentQuarter} phase=${state.quarterPhase}`, state);
    
    // Validate required fields exist
    if (!state.sessionCode || !state.teamCode || !state.teamId) {
      console.warn('[SessionPersistence] LOAD: Missing required fields', state);
      return null;
    }
    
    return state;
  } catch (err) {
    console.error('[SessionPersistence] Failed to load session state:', err);
    return null;
  }
}

/**
 * Clear session state from browser localStorage.
 * Called on logout or validation failure.
 */
export function clearSessionState(): void {
  try {
    console.log('[SessionPersistence] CLEAR: Removing stored session');
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[SessionPersistence] Failed to clear session state:', err);
  }
}

/**
 * Check if a stored session appears valid (has required fields).
 * Does NOT validate credentials - that happens through Supabase RPC.
 */
export function hasStoredSession(): boolean {
  const state = loadSessionState();
  return state !== null;
}
