import { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabase';
import { loadSessionState, clearSessionState, StoredSessionState } from '../services/sessionPersistence';

export interface SessionRestoreResult {
  status: 'idle' | 'checking' | 'restored' | 'invalid' | 'error';
  error?: string;
  restoredState?: StoredSessionState;
}

/**
 * Hook to automatically restore game session on app load ONCE.
 * 
 * Restoration lifecycle: not_started → restoring → restored
 * 
 * After reaching 'restored' state, this hook will NOT run restore again
 * unless there is an explicit reconnect/logout action.
 * 
 * This is a one-shot bootstrap operation only.
 * Ordinary gameplay state changes (quarter, phase, etc.) MUST NOT trigger restore.
 */
export function useSessionRestore(): SessionRestoreResult {
  const game = useGame();
  const [result, setResult] = useState<SessionRestoreResult>({ status: 'idle' });
  
  // Track restoration state to prevent re-running after bootstrap
  const restoreStateRef = useRef<'not_started' | 'restoring' | 'restored'>('not_started');
  const restoreInProgressRef = useRef<boolean>(false);

  // Run ONLY once at app bootstrap, when component first mounts
  // Empty dependency array = run only on initial mount, never again
  useEffect(() => {
    // If already restored or restore is in progress, don't run again
    if (restoreStateRef.current !== 'not_started' || restoreInProgressRef.current) {
      console.log('[useSessionRestore] Already in progress or completed, skipping');
      return;
    }

    const restore = async () => {
      // Prevent concurrent restore attempts
      if (restoreInProgressRef.current) {
        console.log('[useSessionRestore] Restore already in progress, ignoring duplicate request');
        return;
      }

      restoreInProgressRef.current = true;
      restoreStateRef.current = 'restoring';
      console.log('[useSessionRestore] Bootstrap: Starting one-shot restore');

      try {
        // Check for stored session
        const storedState = loadSessionState();
        if (!storedState) {
          // No stored session - this is normal on first visit
          console.log('[useSessionRestore] Bootstrap: No stored state, starting fresh');
          restoreStateRef.current = 'restored';
          setResult({ status: 'idle' });
          return;
        }

        // Stored session exists - validate it through Supabase
        console.log('[useSessionRestore] Bootstrap: Validating stored session');
        setResult({ status: 'checking' });

        // Validate team code through RPC
        const { data: teamData, error } = await supabase.rpc('get_team_state', {
          p_team_code: storedState.teamCode,
        });

        if (error || !teamData) {
          // Validation failed
          console.warn('[useSessionRestore] Bootstrap: Validation failed, clearing storage');
          clearSessionState();
          restoreStateRef.current = 'restored';
          setResult({
            status: 'invalid',
            error: 'Session expired or team code invalid. Please join again.',
          });
          return;
        }

        // Validation succeeded - restore GameContext state
        console.log('[useSessionRestore] Bootstrap: Restoration validated, restoring GameContext');
        
        game.setSessionCode(storedState.sessionCode);
        game.setSessionId(storedState.sessionId);
        game.setTeamCode(storedState.teamCode);
        game.setCurrentTeamId(storedState.teamId);
        if (storedState.facilitatorEmail) {
          game.setFacilitatorEmail(storedState.facilitatorEmail);
        }

        // Restore game phase and quarter state
        game.setGamePhase('q1-q8');
        game.setCurrentQuarter(storedState.currentQuarter);
        game.setQuarterPhase(storedState.quarterPhase);
        game.setParticipationMode(storedState.participationMode);

        // Load team data from RPC response
        const team = {
          id: teamData.team_id,
          team_name: teamData.team_name,
          revenue: teamData.revenue,
          operating_cost: teamData.operating_cost,
          operating_profit: teamData.operating_profit,
          cash: teamData.cash,
          stock_price: teamData.stock_price,
          product_quality: teamData.product_quality,
          culture: teamData.culture,
          trust: teamData.trust,
          capability_consumer: teamData.capabilities.consumer,
          capability_enterprise: teamData.capabilities.enterprise,
          capability_ai: teamData.capabilities.ai,
          capability_talent: teamData.capabilities.talent,
          capability_credential: teamData.capabilities.credential,
          capability_customer_success: teamData.capabilities.customerSuccess,
          capability_growth: teamData.capabilities.growth,
          capability_execution: teamData.capabilities.execution,
          session_id: storedState.sessionId,
        } as any;

        game.setTeams([team]);
        game.setCurrentTeamId(team.id);

        console.log('[useSessionRestore] Bootstrap: Restoration complete');
        restoreStateRef.current = 'restored';
        setResult({ status: 'restored', restoredState: storedState });
      } catch (err: any) {
        console.error('[useSessionRestore] Bootstrap: Restoration error:', err);
        clearSessionState();
        restoreStateRef.current = 'restored';
        setResult({
          status: 'error',
          error: `Failed to restore session: ${err?.message || 'Unknown error'}`,
        });
      } finally {
        restoreInProgressRef.current = false;
      }
    };

    restore();
  }, []); // ← EMPTY dependency array: runs only once on mount, never again

  return result;
}
