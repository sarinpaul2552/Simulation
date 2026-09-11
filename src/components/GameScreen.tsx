import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabase';
import { saveSessionState } from '../services/sessionPersistence';
import BetScreen from './quarters/BetScreen';
import BeliefScreen from './quarters/BeliefScreen';
import RiskScreen from './quarters/RiskScreen';
import RoleVoteScreen from './quarters/RoleVoteScreen';
import TeamCheckScreen from './quarters/TeamCheckScreen';
import CommitScreen from './quarters/CommitScreen';
import ConsequenceScreen from './quarters/ConsequenceScreen';
import ReflectScreen from './quarters/ReflectScreen';
import EventScreen from './quarters/EventScreen';
import CompanyDashboard from './CompanyDashboard';
import gameplayContent from '../content/gameplay.json';

interface GameScreenProps {
  sessionCode: string;
  onExit: () => void;
}

export default function GameScreen({ sessionCode, onExit }: GameScreenProps) {
  const game = useGame();
  const [assignedRole, setAssignedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Load quarter configuration from gameplay.json
        if (gameplayContent.quarterMetadata) {
          game.setQuarterMetadata(gameplayContent.quarterMetadata);
        }

        if (!game.sessionCode) {
          game.setSessionCode(sessionCode);
        }
        if (!game.teamCode) {
          throw new Error('No team code. Please join from setup screen.');
        }

        const { data: teamData, error } = await supabase.rpc('get_team_state', {
          p_team_code: game.teamCode
        });

        if (error) throw error;

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
          session_id: game.sessionId,
        } as any;

        game.setTeams([team]);
        game.setCurrentTeamId(team.id);

        // Assign random role to this browser session
        const roles = ['CEO', 'CFO', 'Product', 'People', 'Growth'];
        const role = roles[Math.floor(Math.random() * roles.length)];
        setAssignedRole(role);

        game.setGamePhase('q1-q8');
        game.setCurrentQuarter(1);
        game.setQuarterPhase('event');
        
        // Save initial session state for refresh recovery
        saveSessionState({
          sessionCode: game.sessionCode || sessionCode,
          sessionId: game.sessionId || '',
          teamCode: game.teamCode,
          teamId: team.id,
          facilitatorEmail: game.facilitatorEmail,
          currentQuarter: 1,
          quarterPhase: 'event',
          participationMode: game.participationMode,
          storedAt: Date.now(),
        });
        
        setLoading(false);
      } catch (err: any) {
        console.error('Game initialization error:', err);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Save session state whenever key game state changes (for refresh recovery)
  useEffect(() => {
    if (game.currentTeam && game.sessionCode && game.teamCode) {
      saveSessionState({
        sessionCode: game.sessionCode,
        sessionId: game.sessionId || '',
        teamCode: game.teamCode,
        teamId: game.currentTeam.id,
        facilitatorEmail: game.facilitatorEmail,
        currentQuarter: game.currentQuarter,
        quarterPhase: game.quarterPhase,
        participationMode: game.participationMode,
        storedAt: Date.now(),
      });
    }
  }, [
    game.currentTeam,
    game.sessionCode,
    game.teamCode,
    game.sessionId,
    game.facilitatorEmail,
    game.currentQuarter,
    game.quarterPhase,
    game.participationMode,
  ]);

  if (loading) {
    return <div className="loading">Loading game...</div>;
  }

  if (!game.currentTeam || !assignedRole) {
    return <div className="error">Failed to initialize game</div>;
  }

  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>{game.currentTeam.team_name}</h1>
        <div className="role-badge">{assignedRole}</div>
        <button onClick={onExit} className="btn-exit">Exit</button>
      </header>

      <CompanyDashboard team={game.currentTeam} quarter={game.currentQuarter} />

      <main className="game-main">
        {game.quarterPhase === 'event' && <EventScreen />}
        {game.quarterPhase === 'bet' && <BetScreen />}
        {game.quarterPhase === 'belief' && <BeliefScreen />}
        {game.quarterPhase === 'risk' && <RiskScreen />}
        {game.quarterPhase === 'role-vote' && <RoleVoteScreen assignedRole={assignedRole} />}
        {game.quarterPhase === 'team-check' && <TeamCheckScreen />}
        {game.quarterPhase === 'commit' && <CommitScreen />}
        {game.quarterPhase === 'consequence' && <ConsequenceScreen />}
        {game.quarterPhase === 'reflect' && <ReflectScreen assignedRole={assignedRole} />}
      </main>
    </div>
  );
}
