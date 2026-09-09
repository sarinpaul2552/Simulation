import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { createSession, getSession, createTeam } from '../services/supabase';

interface SetupScreenProps {
  isStudent?: boolean;
  onSessionCreated: (sessionCode: string) => void;
  onCancel: () => void;
}

export default function SetupScreen({ isStudent = false, onSessionCreated, onCancel }: SetupScreenProps) {
  const game = useGame();
  const [step, setStep] = useState<'input' | 'teams' | 'joining'>('input');
  const [email, setEmail] = useState('');
  const [teamCount, setTeamCount] = useState(2);
  const [teamNames, setTeamNames] = useState<string[]>(['Team A', 'Team B']);
  const [joinSessionCode, setJoinSessionCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await getSession(joinSessionCode);
      game.setSessionCode(session.session_code);
      game.setSessionId(session.id);
      game.setTeamCount(session.team_count);
      
      // Create team for this session
      const team = await createTeam(session.id, teamName);
      game.setCurrentTeamId(team.id);
      
      onSessionCreated(session.session_code);
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToTeamNaming = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create the session in Supabase
      const session = await createSession(email, teamCount);
      
      // Store session in game context
      game.setFacilitatorEmail(email);
      game.setSessionCode(session.session_code);
      game.setSessionId(session.id);
      game.setTeamCount(teamCount);
      
      // Move to team naming step
      setStep('teams');
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!game.sessionId) throw new Error('No session ID');

      for (const name of teamNames) {
        const team = await createTeam(game.sessionId, name);
        game.updateTeam(team.id, team);
      }

      game.setGamePhase('q1-q8');
      game.setCurrentQuarter(1);
      game.setQuarterPhase('event');
      
      setStep('input');
      onSessionCreated(game.sessionCode!);
    } catch (err: any) {
      setError(err.message || 'Failed to create teams');
    } finally {
      setLoading(false);
    }
  };

  if (isStudent) {
    return (
      <div className="setup-screen">
        <div className="card">
          <h2>Join a Simulation</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleStudentJoin(); }}>
            <div className="form-group">
              <label>Session Code:</label>
              <input
                type="text"
                value={joinSessionCode}
                onChange={(e) => setJoinSessionCode(e.target.value.toUpperCase())}
                placeholder="e.g., ISB-ABC123"
                required
              />
            </div>

            <div className="form-group">
              <label>Your Team Name:</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Team A"
                required
              />
            </div>

            {error && <div className="error">{error}</div>}

            <div className="button-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Joining...' : 'Join Session'}
              </button>
              <button type="button" onClick={onCancel} className="btn-secondary">
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-screen">
      <div className="card">
        {step === 'input' && (
          <>
            <h2>Create a New Simulation Session</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleProceedToTeamNaming(); }}>
              <div className="form-group">
                <label>Your Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="facilitator@university.edu"
                  required
                />
              </div>

              <div className="form-group">
                <label>Number of Teams:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={teamCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    setTeamCount(count);
                    setTeamNames(Array.from({ length: count }, (_, i) => `Team ${String.fromCharCode(65 + i)}`));
                  }}
                  required
                />
              </div>

              {error && <div className="error">{error}</div>}

              <div className="button-group">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating Session...' : 'Next: Name Teams'}
                </button>
                <button type="button" onClick={onCancel} className="btn-secondary">
                  Back
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'teams' && (
          <>
            <h2>Name Your Teams</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTeams(); }}>
              {teamNames.map((name, i) => (
                <div key={i} className="form-group">
                  <label>Team {i + 1}:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...teamNames];
                      newNames[i] = e.target.value;
                      setTeamNames(newNames);
                    }}
                    required
                  />
                </div>
              ))}

              {error && <div className="error">{error}</div>}

              <div className="button-group">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
                <button type="button" onClick={() => setStep('input')} className="btn-secondary">
                  Back
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
