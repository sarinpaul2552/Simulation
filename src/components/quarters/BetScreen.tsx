import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Allocation } from '../../simulation/engine';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent } from '../../simulation/engine';

export default function BetScreen() {
  const game = useGame();
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  
  if (!quarterContent) {
    return <div className="error">Quarter {game.currentQuarter} not yet implemented</div>;
  }
  
  const capitalAvailable = quarterContent.available_capital;

  const [allocation, setAllocation] = useState<Allocation>({
    consumerGrowth: 4,
    enterpriseSales: 4,
    aiProduct: 6,
    instructorPeople: 4,
    universityCredential: 4,
    customerSuccess: 0,  // Q1 only: not available (Q5+ feature)
    marketing: 0,        // Q1 only: not available (Q5+ feature)
    cash: 8,
  });

  // Q1: Only 6 strategic categories (Customer Success and Marketing become available post-Q4)
  const categories = [
    { key: 'consumerGrowth' as const, label: 'Consumer Growth', hint: 'Customer acquisition & retention in mass market' },
    { key: 'enterpriseSales' as const, label: 'Enterprise Sales', hint: 'B2B sales team & account management' },
    { key: 'aiProduct' as const, label: 'AI Product', hint: 'R&D for AI/product modernization' },
    { key: 'instructorPeople' as const, label: 'Instructor/People', hint: 'Talent acquisition & creator partnerships' },
    { key: 'universityCredential' as const, label: 'University/Credential', hint: 'Institutional partnerships & credentialing' },
    { key: 'cash' as const, label: 'Cash Reserve', hint: 'Retain as liquidity' },
  ];

  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  const isValid = Math.abs(total - capitalAvailable) < 0.01;
  const runwayMonths = game.currentTeam ? (game.currentTeam.cash / game.currentTeam.operating_cost) * 3 : 0; // approx quarters

  const handleAllocationChange = (key: keyof Allocation, value: number) => {
    setAllocation(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(capitalAvailable, value)),
    }));
  };

  const handleProceed = () => {
    if (isValid) {
      game.setCurrentAllocation(allocation);
      game.setQuarterPhase('belief');
    }
  };

  return (
    <div className="quarter-screen bet-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Capital Allocation</h2>
        <p>Allocate ${capitalAvailable}M across strategic categories:</p>

        <div className="allocation-form">
          {categories.map(cat => (
            <div key={cat.key} className="allocation-row">
              <div className="allocation-label">
                <label>{cat.label}</label>
                <span className="hint">{cat.hint}</span>
              </div>
              <div className="allocation-input">
                <input
                  type="range"
                  min="0"
                  max={capitalAvailable}
                  step="0.1"
                  value={allocation[cat.key]}
                  onChange={(e) => handleAllocationChange(cat.key, parseFloat(e.target.value))}
                  className="slider"
                />
                <input
                  type="number"
                  min="0"
                  max={capitalAvailable}
                  step="0.1"
                  value={allocation[cat.key].toFixed(1)}
                  onChange={(e) => handleAllocationChange(cat.key, parseFloat(e.target.value))}
                  className="number-input"
                />
                <span className="unit">$M</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`allocation-summary ${isValid ? 'valid' : 'invalid'}`}>
          <p><strong>Total Allocated:</strong> ${total.toFixed(1)}M / ${capitalAvailable}M</p>
          {!isValid && <p className="error">Allocation must total exactly ${capitalAvailable}M</p>}
          <p><strong>Current Cash Runway:</strong> ~{runwayMonths.toFixed(1)} quarters</p>
        </div>

        <button onClick={handleProceed} disabled={!isValid} className="btn-primary">
          Allocation Confirmed → Next
        </button>
      </div>
    </div>
  );
}
