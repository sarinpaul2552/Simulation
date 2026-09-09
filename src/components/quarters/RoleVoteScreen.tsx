import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';

interface RoleVote {
  vote: 'yes' | 'no' | 'abstain';
  confidence: number;
  rationale: string;
}

interface RoleVotes {
  CEO: RoleVote;
  CFO: RoleVote;
  Product: RoleVote;
  People: RoleVote;
  Growth: RoleVote;
}

interface RoleVoteScreenProps {
  assignedRole: string;
}

export default function RoleVoteScreen({ assignedRole }: RoleVoteScreenProps) {
  const game = useGame();
  const eventContent = game.currentQuarter === 1 ? gameplayContent.q1 : gameplayContent.q2;
  
  const roles: (keyof RoleVotes)[] = ['CEO', 'CFO', 'Product', 'People', 'Growth'];
  const initialVotes: RoleVotes = {
    CEO: { vote: 'abstain', confidence: 3, rationale: '' },
    CFO: { vote: 'abstain', confidence: 3, rationale: '' },
    Product: { vote: 'abstain', confidence: 3, rationale: '' },
    People: { vote: 'abstain', confidence: 3, rationale: '' },
    Growth: { vote: 'abstain', confidence: 3, rationale: '' },
  };

  const [votes, setVotes] = useState<RoleVotes>(initialVotes);
  const [showAllVotes, setShowAllVotes] = useState(false);

  const hints = eventContent.role_hints;

  const handleVote = (role: keyof RoleVotes, vote: 'yes' | 'no' | 'abstain') => {
    setVotes(prev => ({ ...prev, [role]: { ...prev[role], vote } }));
    game.setCurrentRoleVote(role, vote, votes[role].confidence, votes[role].rationale);
  };

  const handleConfidenceChange = (role: keyof RoleVotes, confidence: number) => {
    setVotes(prev => ({ ...prev, [role]: { ...prev[role], confidence } }));
  };

  const handleRationaleChange = (role: keyof RoleVotes, rationale: string) => {
    setVotes(prev => ({ ...prev, [role]: { ...prev[role], rationale } }));
  };

  const handleProceed = () => {
    // Convert votes to the format game expects
    Object.entries(votes).forEach(([role, vote]) => {
      game.setCurrentRoleVote(role, vote.vote, vote.confidence, vote.rationale);
    });
    game.setQuarterPhase('team-check');
  };

  const isMyRole = (role: keyof RoleVotes) => role === assignedRole;
  const myVote = votes[assignedRole as keyof RoleVotes];

  return (
    <div className="quarter-screen role-vote-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Role Voting</h2>
        <p className="intro">Each executive votes privately on the allocation. You are the <strong>{assignedRole}</strong>.</p>

        {!showAllVotes ? (
          <>
            <div className="role-vote-section">
              <h3>Your Vote: {assignedRole}</h3>
              <div className="role-hint">
                <p><em>{hints[assignedRole.toLowerCase() as keyof typeof hints]}</em></p>
              </div>

              <div className="vote-options">
                <label className={`vote-option ${myVote?.vote === 'yes' ? 'selected yes' : ''}`}>
                  <input
                    type="radio"
                    name="my-vote"
                    value="yes"
                    checked={myVote?.vote === 'yes'}
                    onChange={() => handleVote(assignedRole as keyof RoleVotes, 'yes')}
                  />
                  YES - This allocation is sound
                </label>

                <label className={`vote-option ${myVote?.vote === 'no' ? 'selected no' : ''}`}>
                  <input
                    type="radio"
                    name="my-vote"
                    value="no"
                    checked={myVote?.vote === 'no'}
                    onChange={() => handleVote(assignedRole as keyof RoleVotes, 'no')}
                  />
                  NO - I have concerns
                </label>

                <label className={`vote-option ${myVote?.vote === 'abstain' ? 'selected abstain' : ''}`}>
                  <input
                    type="radio"
                    name="my-vote"
                    value="abstain"
                    checked={myVote?.vote === 'abstain'}
                    onChange={() => handleVote(assignedRole as keyof RoleVotes, 'abstain')}
                  />
                  ABSTAIN - Defer to team
                </label>
              </div>

              <div className="confidence-control">
                <label>Confidence in your vote:</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={myVote?.confidence || 3}
                  onChange={(e) => handleConfidenceChange(assignedRole as keyof RoleVotes, parseInt(e.target.value))}
                />
                <span>{myVote?.confidence}/5</span>
              </div>

              <div className="rationale-input">
                <label>Rationale (optional):</label>
                <textarea
                  value={myVote?.rationale || ''}
                  onChange={(e) => handleRationaleChange(assignedRole as keyof RoleVotes, e.target.value)}
                  placeholder="Why are you voting this way?"
                  rows={3}
                />
              </div>

              <button onClick={() => setShowAllVotes(true)} className="btn-secondary">
                Submit Vote & View Team (Simultaneous Reveal)
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="team-votes">
              <h3>Team Votes (Revealed Simultaneously)</h3>
              {roles.map(role => (
                <div key={role} className={`role-vote-display ${votes[role]?.vote}`}>
                  <div className="role-name">{role}</div>
                  <div className="vote-badge">{votes[role]?.vote?.toUpperCase()}</div>
                  <div className="confidence">Confidence: {votes[role]?.confidence}/5</div>
                  {votes[role]?.rationale && <div className="rationale">{votes[role]?.rationale}</div>}
                </div>
              ))}
            </div>

            <div className="alignment-summary">
              <p>Review alignment. Next step: Team Check discussion or Leadership Override.</p>
            </div>

            <button onClick={handleProceed} className="btn-primary">
              Proceed to Team Check
            </button>
          </>
        )}
      </div>
    </div>
  );
}
