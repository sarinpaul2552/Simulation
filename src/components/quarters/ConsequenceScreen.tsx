import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { supabase } from '../../services/supabase';

export default function ConsequenceScreen() {
  const game = useGame();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Apply consequences to team state
    if (game.lastConsequence && game.currentTeam && game.teamCode) {
      const updates = {
        revenue: game.currentTeam.revenue + game.lastConsequence.revenueChange,
        cash: game.currentTeam.cash + game.lastConsequence.cashChange,
        stock_price: game.currentTeam.stock_price + game.lastConsequence.stockPriceChange,
        product_quality: Math.max(0, Math.min(100, game.currentTeam.product_quality + (game.lastConsequence.productQualityChange || 0))),
        culture: Math.max(0, Math.min(100, game.currentTeam.culture + (game.lastConsequence.cultureChange || 0))),
        trust: Math.max(0, Math.min(100, game.currentTeam.trust + (game.lastConsequence.trustChange || 0))),
        capability_consumer: Math.max(0, Math.min(100, game.currentTeam.capability_consumer + (game.lastConsequence.capabilityChanges.consumer || 0))),
        capability_enterprise: Math.max(0, Math.min(100, game.currentTeam.capability_enterprise + (game.lastConsequence.capabilityChanges.enterprise || 0))),
        capability_ai: Math.max(0, Math.min(100, game.currentTeam.capability_ai + (game.lastConsequence.capabilityChanges.ai || 0))),
        capability_talent: Math.max(0, Math.min(100, game.currentTeam.capability_talent + (game.lastConsequence.capabilityChanges.talent || 0))),
        capability_execution: Math.max(0, Math.min(100, game.currentTeam.capability_execution + (game.lastConsequence.capabilityChanges.execution || 0))),
      };

      // Update team state via RPC
      supabase.rpc('update_team_state', {
        p_team_code: game.teamCode,
        p_updates: updates
      }).then(({ error }) => {
        if (error) console.error('Error updating team state:', error);
      });
      
      game.updateTeam(game.currentTeam.id, updates);
    }

    const timer = setTimeout(() => setShown(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleProceed = () => {
    game.setQuarterPhase('reflect');
  };

  return (
    <div className="quarter-screen consequence-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Results</h2>

        {game.lastConsequence && (
          <>
            <div className={`narrative ${shown ? 'shown' : ''}`}>
              <p>{game.lastConsequence.narrative}</p>
            </div>

            <div className={`consequence-details ${shown ? 'shown' : ''}`}>
              <div className="financial-changes">
                <h3>Financial Impact</h3>
                <div className="change-item">
                  <span>Revenue</span>
                  <span className={game.lastConsequence.revenueChange > 0 ? 'positive' : 'negative'}>
                    {game.lastConsequence.revenueChange > 0 ? '+' : ''}{game.lastConsequence.revenueChange.toFixed(1)}M
                  </span>
                </div>
                <div className="change-item">
                  <span>Cash</span>
                  <span className={game.lastConsequence.cashChange > 0 ? 'positive' : 'negative'}>
                    {game.lastConsequence.cashChange > 0 ? '+' : ''}{game.lastConsequence.cashChange.toFixed(1)}M
                  </span>
                </div>
                <div className="change-item">
                  <span>Stock Price</span>
                  <span className={game.lastConsequence.stockPriceChange > 0 ? 'positive' : 'negative'}>
                    {game.lastConsequence.stockPriceChange > 0 ? '+' : ''}{game.lastConsequence.stockPriceChange.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="quality-changes">
                <h3>Quality & Culture Metrics</h3>
                {game.lastConsequence.productQualityChange ? (
                  <div className="change-item">
                    <span>Product Quality</span>
                    <span className={game.lastConsequence.productQualityChange > 0 ? 'positive' : 'negative'}>
                      {game.lastConsequence.productQualityChange > 0 ? '+' : ''}{game.lastConsequence.productQualityChange.toFixed(1)}
                    </span>
                  </div>
                ) : null}
                {game.lastConsequence.cultureChange ? (
                  <div className="change-item">
                    <span>Culture</span>
                    <span className={game.lastConsequence.cultureChange > 0 ? 'positive' : 'negative'}>
                      {game.lastConsequence.cultureChange > 0 ? '+' : ''}{game.lastConsequence.cultureChange.toFixed(1)}
                    </span>
                  </div>
                ) : null}
                {game.lastConsequence.trustChange ? (
                  <div className="change-item">
                    <span>Trust</span>
                    <span className={game.lastConsequence.trustChange > 0 ? 'positive' : 'negative'}>
                      {game.lastConsequence.trustChange > 0 ? '+' : ''}{game.lastConsequence.trustChange.toFixed(1)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="capability-changes">
                <h3>Capability Development</h3>
                {game.lastConsequence.thresholdsCrossed.map((threshold, i) => (
                  <p key={i} className="threshold">✓ {threshold}</p>
                ))}
              </div>

              <div className="callbacks">
                <h3>Decision Callbacks</h3>
                {game.currentRisks && game.currentRisks.length > 0 && (
                  <div className="callback-section">
                    <p className="callback-label">Identified Risks:</p>
                    {game.currentRisks.map((risk, i) => (
                      <p key={i} className="callback-risk">• {risk.identified} (Severity: {risk.severity}/5)</p>
                    ))}
                    <p className="callback-note">These risks were monitored. No materialization in Q1, but watch for Q2+.</p>
                  </div>
                )}

                {game.currentBelief && (
                  <div className="callback-section">
                    <p className="callback-label">Your Q1 Belief:</p>
                    <p className="callback-belief">"{game.currentBelief}"</p>
                    <p className="callback-note">Outcomes so far are consistent with your belief.</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleProceed} className="btn-primary">
              Review Results → Next
            </button>
          </>
        )}
      </div>
    </div>
  );
}
