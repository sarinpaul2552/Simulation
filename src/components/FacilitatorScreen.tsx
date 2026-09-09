import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { getSession, getTeamsBySession, advanceQuarter, subscribeToTeamUpdates } from '../services/supabase';
import { TeamData } from '../services/supabase';
import { getQ2EventContext } from '../simulation/engine';
import gameplayContent from '../content/gameplay.json';

interface FacilitatorScreenProps {
  sessionCode: string;
  onExit: () => void;
}

export default function FacilitatorScreen({ sessionCode, onExit }: FacilitatorScreenProps) {
  const game = useGame();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [showEvent, setShowEvent] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const session = await getSession(sessionCode);
        game.setSessionCode(session.session_code);
        game.setSessionId(session.id);
        game.setTeamCount(session.team_count);
        game.setCurrentQuarter(session.current_quarter || 1);
        game.setGamePhase('q1-q8');

        const sessionTeams = await getTeamsBySession(session.id);
        game.setTeams(sessionTeams);
        setTeams(sessionTeams);

        // Subscribe to real-time team updates
        const unsubscribe = subscribeToTeamUpdates(session.id, (updated) => {
          setTeams(updated);
          game.setTeams(updated);
        });

        setLoading(false);
        return () => unsubscribe();
      } catch (err: any) {
        console.error('Facilitator initialization error:', err);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleAdvanceQuarter = async () => {
    if (!game.sessionId) return;

    try {
      await advanceQuarter(game.sessionId);
      game.setCurrentQuarter(game.currentQuarter + 1);
      setShowEvent(false);
    } catch (err: any) {
      console.error('Error advancing quarter:', err);
    }
  };

  const handleShowEvent = () => {
    setShowEvent(true);
  };

  if (loading) {
    return <div className="loading">Loading facilitator view...</div>;
  }

  const eventContent = game.currentQuarter === 1 
    ? gameplayContent.q1 
    : gameplayContent.q2;

  return (
    <div className="facilitator-screen">
      <header className="facilitator-header">
        <h1>Facilitator Control</h1>
        <div className="session-info">
          <span>Session: {game.sessionCode}</span>
          <span>Q{game.currentQuarter}</span>
        </div>
        <button onClick={onExit} className="btn-exit">Exit</button>
      </header>

      <section className="quarter-control">
        <div className="card">
          <h2>{eventContent.event_title}</h2>
          {showEvent ? (
            <>
              <p className="event-description">{eventContent.event_description}</p>
              <button onClick={handleAdvanceQuarter} className="btn-primary">
                Teams Ready → Advance to Betting Phase
              </button>
            </>
          ) : (
            <button onClick={handleShowEvent} className="btn-primary">
              Show Event to Teams
            </button>
          )}
        </div>
      </section>

      <section className="leaderboard">
        <h2>Team Leaderboard</h2>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Revenue</th>
              <th>Cash</th>
              <th>Stock Price</th>
              <th>Culture</th>
              <th>AI Capability</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team.id}>
                <td>{team.team_name}</td>
                <td>${team.revenue.toFixed(1)}M</td>
                <td>${team.cash.toFixed(1)}M</td>
                <td>${team.stock_price.toFixed(2)}</td>
                <td>{team.culture}</td>
                <td>{team.capability_ai}</td>
                <td>Active</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="facilitator-notes">
        <h3>Facilitator Notes</h3>
        <div className="notes-content">
          <p><strong>Q{game.currentQuarter} Focus:</strong></p>
          {game.currentQuarter === 1 && (
            <>
              <p>Teams should establish their initial strategy and allocate $30M capital.</p>
              <p>Watch for: Role disagreements, risk misidentification, unrealistic allocations.</p>
            </>
          )}
          {game.currentQuarter === 2 && (
            <>
              <p>ChatGPT disruption event. Teams will see how their Q1 decisions respond to market shock.</p>
              <p>Watch for: Panic vs. pragmatism, evidence-based adaptation vs. whipsaw.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
