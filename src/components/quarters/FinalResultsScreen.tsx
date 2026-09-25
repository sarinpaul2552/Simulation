import { useGame } from '../../context/GameContext';
import { clearSessionState } from '../../services/sessionPersistence';
import './FinalResultsScreen.css';

export default function FinalResultsScreen() {
  const game = useGame();
  
  // Read AUTHORITATIVE terminal result from Q8 consequence
  const consequence = game.lastConsequence;
  const team = game.currentTeam;

  if (!consequence || !team || !consequence.terminalResult) {
    return <div className="error">Unable to load simulation results.</div>;
  }

  // Use the authoritative terminal result calculated once by calculateQ8Consequence
  const terminalResult = consequence.terminalResult;
  const q8Revenue = terminalResult.revenue;
  const q8Cash = terminalResult.cash;
  const ebitdaMargin = terminalResult.ebitdaMargin;
  const financialScore = terminalResult.financialScore;
  const strategicScore = terminalResult.strategicScore;
  const orgScore = terminalResult.organizationalScore;
  const terminalScore = terminalResult.totalScore;
  const verdict = terminalResult.verdict;
  
  // Infer destination from capabilities (for narrative only)
  const getDestination = () => {
    if (team.capability_enterprise >= 65) return 'Enterprise';
    if (team.capability_ai >= 65) return 'AI-Native';
    if (team.capability_consumer >= 70) return 'Consumer';
    return 'Balanced';
  };

  const destination = getDestination();

  const handleFinish = () => {
    clearSessionState();
    game.setGamePhase('setup');
    game.setCurrentQuarter(0);
    game.setQuarterPhase('event');
  };

  return (
    <div className="quarter-screen final-results-screen">
      <div className="card final-results-card">
        <div className="results-header">
          <h1>Simulation Complete</h1>
          <p className="subtitle">8 Quarters • {game.currentTeam?.team_name}</p>
        </div>

        <div className="results-grid">
          {/* Scores */}
          <div className="results-section scores">
            <div className="score-box financial">
              <h3>Financial Score</h3>
              <p className="score-value">{Math.round(financialScore)}/33</p>
            </div>
            <div className="score-box strategic">
              <h3>Strategic Score</h3>
              <p className="score-value">{Math.round(strategicScore)}/33</p>
            </div>
            <div className="score-box organizational">
              <h3>Organizational Score</h3>
              <p className="score-value">{Math.round(orgScore)}/34</p>
            </div>
            <div className="score-box terminal">
              <h3>Total Score</h3>
              <p className="score-value total">{Math.round(terminalScore)}/100</p>
              <p className="verdict">{verdict}</p>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="results-section financials">
            <h3>Final Financial Position</h3>
            <div className="metric">
              <span>Final Revenue</span>
              <span className="value">${Math.round(q8Revenue)}M</span>
            </div>
            <div className="metric">
              <span>Final Cash</span>
              <span className="value">${Math.round(q8Cash)}M</span>
            </div>
            <div className="metric">
              <span>Stock Price</span>
              <span className="value">${Math.round(terminalResult.stockPrice * 10) / 10}</span>
            </div>
            <div className="metric">
              <span>EBITDA Margin</span>
              <span className="value">{(ebitdaMargin * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Organizational Health */}
          <div className="results-section organizational">
            <h3>Organizational Health</h3>
            <div className="metric">
              <span>Product Quality</span>
              <span className="value">{Math.round(team.product_quality)}/100</span>
            </div>
            <div className="metric">
              <span>Culture</span>
              <span className="value">{Math.round(team.culture)}/100</span>
            </div>
            <div className="metric">
              <span>Trust</span>
              <span className="value">{Math.round(team.trust)}/100</span>
            </div>
          </div>

          {/* Capabilities */}
          <div className="results-section capabilities">
            <h3>Capability Strengths</h3>
            <div className="metric">
              <span>Consumer</span>
              <span className="value">{Math.round(team.capability_consumer)}/100</span>
            </div>
            <div className="metric">
              <span>Enterprise</span>
              <span className="value">{Math.round(team.capability_enterprise)}/100</span>
            </div>
            <div className="metric">
              <span>AI/Product</span>
              <span className="value">{Math.round(team.capability_ai)}/100</span>
            </div>
            <div className="metric">
              <span>Talent</span>
              <span className="value">{Math.round(team.capability_talent)}/100</span>
            </div>
          </div>

          {/* Strategy Journey */}
          <div className="results-section strategy">
            <h3>Strategic Destination (Inferred from Q4-Q8)</h3>
            <p className="destination-choice">{destination}</p>
            <p className="strategy-text">
              Your Q1-Q3 allocation determined your capabilities. Q4 locked your destination. Q5-Q8 execution determined your final standing.
            </p>
          </div>

          {/* Key Takeaway */}
          <div className="results-section takeaway">
            <h3>Learning Takeaway</h3>
            <div className="takeaway-box">
              <p>
                {terminalScore >= 80
                  ? '🏆 Your coherent strategy and focused execution delivered a winning outcome. Leadership alignment and capability investment paid off.'
                  : terminalScore >= 60
                  ? '✓ You survived the 8-quarter journey. Strategic choices led to profitability, though optimization opportunities remain.'
                  : terminalScore >= 40
                  ? '⚠️ Your organization struggled with execution or strategic misalignment. Capability gaps affected competitiveness.'
                  : '⚠️ The path you chose required capabilities you did not develop. Future strategy should match your organizational strengths.'}
              </p>
            </div>
          </div>
        </div>

        <div className="results-actions">
          <button className="btn-secondary">
            View Detailed Results
          </button>
          <button onClick={handleFinish} className="btn-primary">
            Finish Simulation
          </button>
        </div>
      </div>
    </div>
  );
}
