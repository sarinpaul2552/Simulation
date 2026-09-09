import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSession, getTeam, updateDecision, createDecision } from '../services/supabase';
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
        if (!game.sessionCode) {
          game.setSessionCode(sessionCode);
        }
        if (!game.currentTeamId) {
          throw new Error('No team selected. Please join from setup screen.');
        }

        const team = await getTeam(game.currentTeamId);
        game.setTeams([team]);
        game.setCurrentTeamId(team.id);

        // Assign random role to this browser session
        const roles = ['CEO', 'CFO', 'Product', 'People', 'Growth'];
        const role = roles[Math.floor(Math.random() * roles.length)];
        setAssignedRole(role);

        game.setGamePhase('q1-q8');
        game.setCurrentQuarter(1);
        game.setQuarterPhase('event');
        setLoading(false);
      } catch (err: any) {
        console.error('Game initialization error:', err);
        setLoading(false);
      }
    };

    initialize();
  }, []);

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
