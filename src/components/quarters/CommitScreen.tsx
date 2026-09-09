import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { supabase } from '../../services/supabase';
import { calculateQ1Consequence } from '../../simulation/engine';

export default function CommitScreen() {
  const game = useGame();
  const [loading, setLoading] = useState(false);

  const handleCommit = async () => {
    if (!game.teamCode || !game.currentAllocation) return;

    setLoading(true);
    try {
      // Submit allocation via RPC
      const { error: submitError } = await supabase.rpc('submit_allocation', {
        p_team_code: game.teamCode,
        p_quarter: game.currentQuarter,
        p_allocation_json: game.currentAllocation,
        p_belief_response: game.currentBelief,
        p_risks_json: game.currentRisks
      });

      if (submitError) throw submitError;

      game.setCurrentAllocation(game.currentAllocation); // Store in context

      // Calculate Q1 consequences using the simulation engine
      if (game.currentQuarter === 1 && game.currentTeam && game.currentRoleVotes) {
        // Extract just the vote values from the role votes object
        const roleVotes = Object.entries(game.currentRoleVotes).reduce(
          (acc, [role, vote]) => ({
            ...acc,
            [role]: vote.vote,
          }),
          {} as Record<string, 'yes' | 'no' | 'abstain'>
        );
        
        const consequence = calculateQ1Consequence(
          game.currentAllocation,
          roleVotes,
          game.currentTeamCheckOverride,
          game.currentTeamCheckDissentingRoles,
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

        game.setLastConsequence(consequence);
      }

      game.setQuarterPhase('consequence');
    } catch (err: any) {
      console.error('Commit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quarter-screen commit-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Final Commitment</h2>

        <div className="commitment-review">
          <div className="section">
            <h3>Allocation Summary</h3>
            {game.currentAllocation && (
              <table className="allocation-table">
                <tbody>
                  {Object.entries(game.currentAllocation).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key.replace(/([A-Z])/g, ' $1')}</td>
                      <td>${value.toFixed(1)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="section">
            <h3>Team Alignment</h3>
            <p><strong>Alignment:</strong> {game.currentTeamCheckAlignment}</p>
            {game.currentTeamCheckOverride && (
              <p><strong>Override:</strong> CEO overrode {game.currentTeamCheckDissentingRoles.join(', ')}</p>
            )}
          </div>

          <div className="section">
            <h3>Strategic Beliefs</h3>
            <p><strong>Market Belief:</strong> {game.currentBelief}</p>
            <p><strong>Identified Risks:</strong> {game.currentRisks?.length || 0}</p>
          </div>
        </div>

        <div className="commitment-warning">
          <p><strong>⚠️ Important:</strong> Once you commit, this decision cannot be changed for this quarter. Results will be calculated and revealed.</p>
        </div>

        <button onClick={handleCommit} disabled={loading} className="btn-primary">
          {loading ? 'Calculating Results...' : 'Confirm Commitment & Calculate Results'}
        </button>
      </div>
    </div>
  );
}
