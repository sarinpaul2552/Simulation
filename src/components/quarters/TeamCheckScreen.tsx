import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';

export default function TeamCheckScreen() {
  const game = useGame();
  const [action, setAction] = useState<'review' | 'revote' | 'override' | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const rolesList = ['CEO', 'CFO', 'Product', 'People', 'Growth'];

  const alignment = useMemo(() => {
    if (!game.currentRoleVotes) return 'unknown';
    
    const votes = Object.values(game.currentRoleVotes).map(v => v.vote);
    const yesCount = votes.filter(v => v === 'yes').length;
    const noCount = votes.filter(v => v === 'no').length;
    const abstainCount = votes.filter(v => v === 'abstain').length;
    
    if (yesCount === 5) return 'unanimous';
    if (yesCount >= 4) return 'broad';
    if (yesCount >= 3) return 'debate';
    return 'split';
  }, [game.currentRoleVotes]);

  const dissents = useMemo(() => {
    if (!game.currentRoleVotes) return [];
    return rolesList.filter(role => game.currentRoleVotes?.[role]?.vote === 'no');
  }, [game.currentRoleVotes]);

  const getAlignmentMessage = () => {
    switch (alignment) {
      case 'unanimous':
        return 'Perfect Alignment - All executives agree.';
      case 'broad':
        return 'Broad Alignment - Most executives agree.';
      case 'debate':
        return 'Debate - Mixed opinions. Team discussion recommended.';
      case 'split':
        return 'Split - Significant disagreement.';
      default:
        return 'Unknown';
    }
  };

  const handleProceed = () => {
    if (action === 'override') {
      game.setCurrentTeamCheckAlignment(alignment);
      game.setCurrentTeamCheckOverride(true, dissents);
      game.setQuarterPhase('commit');
    } else if (action === 'review') {
      game.setCurrentTeamCheckAlignment(alignment);
      game.setCurrentTeamCheckOverride(false, []);
      game.setQuarterPhase('commit');
    } else if (action === 'revote') {
      game.setQuarterPhase('role-vote');
    }
  };

  return (
    <div className="quarter-screen team-check-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Team Check</h2>

        <div className={`alignment-result ${alignment}`}>
          <h3>{getAlignmentMessage()}</h3>
          <div className="votes-summary">
            {game.currentRoleVotes && rolesList.map(role => (
              <div key={role} className={`vote-summary ${game.currentRoleVotes?.[role]?.vote}`}>
                <span className="role">{role}</span>
                <span className="vote">{game.currentRoleVotes?.[role]?.vote?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {dissents.length > 0 && (
          <div className="dissent-section">
            <h4>Dissenting Voices</h4>
            <p>{dissents.join(', ')} expressed concerns about this allocation.</p>
          </div>
        )}

        <div className="action-options">
          <div className={`action-card ${action === 'review' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="action"
              value="review"
              checked={action === 'review'}
              onChange={() => setAction('review')}
            />
            <label>
              <h4>Proceed Without Override</h4>
              <p>Accept the team's alignment as-is and move forward.</p>
            </label>
          </div>

          <div className={`action-card ${action === 'revote' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="action"
              value="revote"
              checked={action === 'revote'}
              onChange={() => setAction('revote')}
            />
            <label>
              <h4>Call for Revote</h4>
              <p>Go back to role voting and discuss further.</p>
            </label>
          </div>

          {dissents.length > 0 && (
            <div className={`action-card ${action === 'override' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="action"
                value="override"
                checked={action === 'override'}
                onChange={() => setAction('override')}
              />
              <label>
                <h4>Leadership Override</h4>
                <p>CEO overrides dissent. Document the reason.</p>
                {action === 'override' && (
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="CEO explains the override decision..."
                    rows={3}
                  />
                )}
              </label>
            </div>
          )}
        </div>

        <button onClick={handleProceed} disabled={!action} className="btn-primary">
          Confirm → Proceed to Commit
        </button>
      </div>
    </div>
  );
}
