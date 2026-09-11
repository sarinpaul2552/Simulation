import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabase';
import { loadSessionState, clearSessionState, StoredSessionState } from '../services/sessionPersistence';

export interface SessionRestoreResult {
  status: 'idle' | 'checking' | 'restored' | 'invalid' | 'error';
  error?: string;
  restoredState?: StoredSessionState;
}

/**
 * Hook to automatically restore game session on app load.
 * 
 * Flow:
 * 1. Check if stored session exists in sessionStorage
 * 2. If yes, validate credentials through Supabase RPC (get_team_state)
 * 3. If valid, restore all GameContext state and return status='restored'
 * 4. If invalid/error, clear storage and return appropriate error status
 * 
 * Usage in App.tsx:
 *   const restore = useSessionRestore();
 *   if (restore.status === 'restored') {
 *     // Show GameScreen
 *   } else if (restore.status === 'invalid') {
 *     // Show error message: restore.error
 *   }
 */
export function useSessionRestore(): SessionRestoreResult {
  const game = useGame();
  const [result, setResult] = useState<SessionRestoreResult>({ status: 'idle' });

  useEffect(() => {
    const restore = async () => {
      // Check for stored session
      const storedState = loadSessionState();
      if (!storedState) {
        // No stored session - this is normal on first visit
        setResult({ status: 'idle' });
        return;
      }

      // Stored session exists - validate it through Supabase
      setResult({ status: 'checking' });

      try {
        // Validate team code through RPC
        const { data: teamData, error } = await supabase.rpc('get_team_state', {
          p_team_code: storedState.teamCode,
        });

        if (error || !teamData) {
          // Validation failed - team code is invalid or session expired
          clearSessionState();
          setResult({
            status: 'invalid',
            error: 'Session expired or team code invalid. Please join again.',
          });
          return;
        }

        // Validation succeeded - restore GameContext state
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

        setResult({ status: 'restored', restoredState: storedState });
      } catch (err: any) {
        console.error('Session restoration error:', err);
        clearSessionState();
        setResult({
          status: 'error',
          error: `Failed to restore session: ${err?.message || 'Unknown error'}`,
        });
      }
    };

    restore();
  }, [game]);

  return result;
}
