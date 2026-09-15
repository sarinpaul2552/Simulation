import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { supabase } from '../../services/supabase';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent, calculateQuarterConsequence } from '../../simulation/engine';

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
  assignedRole?: string;
}

export default function RoleVoteScreen({}: RoleVoteScreenProps) {
  const game = useGame();
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  const [loading, setLoading] = useState(false);

  if (!quarterContent) {
    return <div className="error">Quarter {game.currentQuarter} not yet implemented</div>;
  }

  const roles: (keyof RoleVotes)[] = ['CEO', 'CFO', 'Product', 'People', 'Growth'];
  
  // Team-device mode: sequential voting with hidden votes
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [votes, setVotes] = useState<RoleVotes>({
    CEO: { vote: 'abstain', confidence: 3, rationale: '' },
    CFO: { vote: 'abstain', confidence: 3, rationale: '' },
    Product: { vote: 'abstain', confidence: 3, rationale: '' },
    People: { vote: 'abstain', confidence: 3, rationale: '' },
    Growth: { vote: 'abstain', confidence: 3, rationale: '' },
  });
  const [allVoted, setAllVoted] = useState(false);

  const currentRole = roles[currentRoleIndex];
  const isTeamDevice = game.participationMode === 'team_device';

  const handleVote = (voteType: 'yes' | 'no' | 'abstain') => {
    const updatedVotes = {
      ...votes,
      [currentRole]: {
        ...votes[currentRole],
        vote: voteType,
      },
    };
    setVotes(updatedVotes);

    // Move to next role or mark as done
    if (currentRoleIndex < roles.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
    } else {
      setAllVoted(true);
    }
  };

  const handleProceed = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const roleVotesMap: Record<string, RoleVote> = {};
      roles.forEach((role) => {
        roleVotesMap[role] = votes[role];
      });
      game.setBulkRoleVotes(roleVotesMap);

      // Submit allocation via RPC
      if (game.teamCode && game.currentAllocation) {
        const { error: submitError } = await supabase.rpc('submit_allocation', {
          p_team_code: game.teamCode,
          p_quarter: game.currentQuarter,
          p_allocation_json: game.currentAllocation,
          p_belief_response: game.currentBelief,
          p_risks_json: game.currentRisks
        });

        if (submitError) throw submitError;
      }

      // Calculate consequences
      if (game.currentTeam && game.currentAllocation) {
        const roleVotesForEngine = Object.entries(roleVotesMap).reduce(
          (acc, [role, voteData]) => ({
            ...acc,
            [role]: voteData.vote,
          }),
          {} as Record<string, 'yes' | 'no' | 'abstain'>
        );

        const consequence = calculateQuarterConsequence(
          game.currentQuarter,
          game.currentAllocation,
          roleVotesForEngine,
          false, // ceoOverride (not used in new flow)
          [],    // dissentingRoles (not used in new flow)
          {
            revenue: game.currentTeam.revenue,
            operatingCost: game.currentTeam.operating_cost,
            operatingProfit: game.currentTeam.operating_profit,
            cash: game.currentTeam.cash,
            stockPrice: game.currentTeam.stock_price,
            productQuality: game.currentTeam.product_quality,
            culture: game.currentTeam.culture,
            trust: game.currentTeam.trust,
            capabilities: {
              consumer: game.currentTeam.capability_consumer,
              enterprise: game.currentTeam.capability_enterprise,
              ai: game.currentTeam.capability_ai,
              talent: game.currentTeam.capability_talent,
              credential: game.currentTeam.capability_credential,
              customerSuccess: game.currentTeam.capability_customer_success,
              growth: game.currentTeam.capability_growth,
              execution: game.currentTeam.capability_execution,
            },
          }
        );

        if (consequence) {
          game.setLastConsequence(consequence);
        }
      }

      // Transition to consequence phase
      game.setQuarterPhase('consequence');
    } catch (err: any) {
      console.error('Error proceeding:', err);
      setLoading(false);
    }
  };

  // Team-device sequential voting UI
  if (isTeamDevice) {
    return (
      <div className="quarter-screen role-vote-screen">
        <div className="card">
          <h2>Q{game.currentQuarter} Leadership Vote (Sequential)</h2>
          <p className="voting-mode-note">One device • Votes revealed after all roles decide</p>

          {!allVoted ? (
            <div className="sequential-vote">
              <div className="current-role-prompt">
                <h3>{currentRole}</h3>
                <p>{quarterContent.roleVote?.[currentRole.toLowerCase() as keyof typeof quarterContent.roleVote]?.prompt || 
                   `What is your position on this allocation, ${currentRole}?`}</p>
              </div>

              <div className="vote-options">
                <button
                  className="vote-btn support"
                  onClick={() => handleVote('yes')}
                >
                  👍 Support
                </button>
                <button
                  className="vote-btn concern"
                  onClick={() => handleVote('abstain')}
                >
                  ⚠️ Concern
                </button>
                <button
                  className="vote-btn oppose"
                  onClick={() => handleVote('no')}
                >
                  👎 Oppose
                </button>
              </div>

              <div className="voting-progress">
                <p>Role {currentRoleIndex + 1} of 5</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((currentRoleIndex + 1) / 5) * 100}%` }}
                  />
                </div>
                <div className="role-indicators">
                  {roles.map((role, idx) => (
                    <div
                      key={role}
                      className={`role-badge ${idx < currentRoleIndex ? 'completed' : idx === currentRoleIndex ? 'current' : 'pending'}`}
                    >
                      {role[0]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Automatically show results after all votes are in (merged reveal)
            <div className="votes-revealed">
              <h3>Leadership Positions Revealed</h3>
              <div className="vote-summary">
                {roles.map((role) => (
                  <div key={role} className={`vote-item vote-${votes[role].vote}`}>
                    <span className="role-name">{role}</span>
                    <span className="vote-badge">
                      {votes[role].vote === 'yes' ? '👍 Support' : votes[role].vote === 'no' ? '👎 Oppose' : '⚠️ Concern'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="vote-summary-stats">
                <p>
                  Support: {Object.values(votes).filter(v => v.vote === 'yes').length}/5 |
                  Oppose: {Object.values(votes).filter(v => v.vote === 'no').length}/5 |
                  Concern: {Object.values(votes).filter(v => v.vote === 'abstain').length}/5
                </p>
              </div>

              <div className="discussion-prompt">
                <h3>Team Discussion Summary</h3>
                <p>All leadership positions are now visible. Your allocation reflects the team's consensus and concerns.</p>
              </div>

              <button onClick={handleProceed} disabled={loading} className="btn-primary">
                {loading ? 'Calculating Results...' : 'Continue to Results'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback for other modes (should not happen in current pass)
  return (
    <div className="quarter-screen role-vote-screen">
      <div className="card">
        <div className="error">Role voting not available in this mode</div>
        <button onClick={handleProceed} disabled={loading} className="btn-primary">
          {loading ? 'Calculating Results...' : 'Continue to Results'}
        </button>
      </div>
    </div>
  );
}
