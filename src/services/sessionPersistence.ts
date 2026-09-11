/**
 * Session Persistence Service
 * 
 * Handles saving and restoring game session state from browser sessionStorage.
 * Uses sessionStorage (not localStorage) to ensure data is cleared when browser tab closes.
 * Stores only identifiers and UI state, not sensitive data.
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
 * Save session state to browser sessionStorage.
 * Called after successful session initialization or state changes.
 */
export function saveSessionState(state: StoredSessionState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save session state:', err);
    // Don't throw - graceful degradation if storage fails
  }
}

/**
 * Load session state from browser sessionStorage.
 * Returns null if no stored state or if parsing fails.
 */
export function loadSessionState(): StoredSessionState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const state = JSON.parse(stored) as StoredSessionState;
    
    // Validate required fields exist
    if (!state.sessionCode || !state.teamCode || !state.teamId) {
      return null;
    }
    
    return state;
  } catch (err) {
    console.error('Failed to load session state:', err);
    return null;
  }
}

/**
 * Clear session state from browser sessionStorage.
 * Called on logout or validation failure.
 */
export function clearSessionState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session state:', err);
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
