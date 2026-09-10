import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabase';

interface SetupScreenProps {
  isStudent?: boolean;
  onSessionCreated: (sessionCode: string, adminPin?: string) => void;
  onCancel: () => void;
}

export default function SetupScreen({ isStudent = false, onSessionCreated, onCancel }: SetupScreenProps) {
  const game = useGame();
  const [step, setStep] = useState<'input' | 'teams' | 'joining'>('input');
  const [email, setEmail] = useState('');
  const [teamCount, setTeamCount] = useState(2);
  const [participationMode, setParticipationModeLocal] = useState<'team_device' | 'individual_device' | 'voting_disabled'>('team_device');
  const [teamNames, setTeamNames] = useState<string[]>(['Team A', 'Team B']);
  const [adminPin, setAdminPin] = useState('');
  const [joinSessionCode, setJoinSessionCode] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============ FACILITATOR: Proceed to Team Naming (Create Session) ============
  const handleProceedToTeamNaming = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_session', {
        p_facilitator_email: email,
        p_team_count: teamCount
      });

      if (rpcError) throw rpcError;

      game.setFacilitatorEmail(email);
      game.setSessionCode(data.session_code);
      game.setSessionId(data.session_id);
      game.setTeamCount(teamCount);
      game.setParticipationMode(participationMode);
      
      // Store admin_pin locally for subsequent facilitator RPCs
      setAdminPin(data.admin_pin);

      setStep('teams');
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  // ============ FACILITATOR: Create Teams (with auto-generated codes) ============
  const handleCreateTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionCode = game.sessionCode;
      if (!sessionCode || !adminPin) throw new Error('No session code or admin PIN');

      const teamPromises = teamNames.map(name =>
        supabase.rpc('create_team_with_code', {
          p_session_code: sessionCode,
          p_admin_pin: adminPin,
          p_team_name: name
        })
      );

      const results = await Promise.all(teamPromises);

      results.forEach(result => {
        if (result.error) throw result.error;
      });

      const teamCodes = results.map((result, _index) => ({
        team_id: result.data.team_id,
        team_name: result.data.team_name,
        team_code: result.data.team_code
      }));

      teamCodes.forEach(team => {
        game.updateTeam(team.team_id, {
          id: team.team_id,
          team_name: team.team_name,
          team_code: team.team_code
        } as any);
      });

      game.setGamePhase('q1-q8');
      game.setCurrentQuarter(1);
      game.setQuarterPhase('event');

      onSessionCreated(sessionCode, adminPin);
    } catch (err: any) {
      setError(err.message || 'Failed to create teams');
    } finally {
      setLoading(false);
    }
  };

  // ============ STUDENT: Join Session (via RPC) ============
  const handleStudentJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('join_session', {
        p_session_code: joinSessionCode,
        p_team_code: teamCode
      });

      if (rpcError) throw rpcError;

      game.setSessionCode(data.session_code);
      game.setSessionId(data.session_id);
      game.setCurrentTeamId(data.team_id);
      game.setTeamCode(data.team_code);

      onSessionCreated(data.session_code);
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
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
              <label>Your Team Code:</label>
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="e.g., TEAM-XYZ789"
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

              <div className="form-group">
                <label>Participation Mode:</label>
                <div className="radio-group">
                  <div className="radio-option">
                    <input
                      type="radio"
                      name="participation"
                      value="team_device"
                      checked={participationMode === 'team_device'}
                      onChange={(e) => setParticipationModeLocal(e.target.value as any)}
                      id="team_device"
                    />
                    <label htmlFor="team_device">
                      <strong>One Device Per Team</strong> (Recommended)
                      <br />
                      <small>Sequential voting, all votes revealed together</small>
                    </label>
                  </div>
                  <div className="radio-option">
                    <input
                      type="radio"
                      name="participation"
                      value="voting_disabled"
                      checked={participationMode === 'voting_disabled'}
                      onChange={(e) => setParticipationModeLocal(e.target.value as any)}
                      id="voting_disabled"
                    />
                    <label htmlFor="voting_disabled">
                      <strong>No Role Voting</strong>
                      <br />
                      <small>Team proceeds directly to commit without voting</small>
                    </label>
                  </div>
                  <div className="radio-option disabled">
                    <input
                      type="radio"
                      name="participation"
                      value="individual_device"
                      disabled
                      id="individual_device"
                    />
                    <label htmlFor="individual_device">
                      <strong>Individual Devices</strong> (Coming Later)
                      <br />
                      <small>One phone per role, concurrent voting</small>
                    </label>
                  </div>
                </div>
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
                  {loading ? 'Creating Teams...' : 'Create Session & Teams'}
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
