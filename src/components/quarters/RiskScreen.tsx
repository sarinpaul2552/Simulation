import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent } from '../../simulation/engine';

interface SelectedRisk {
  identified: string;
  severity: number;
}

export default function RiskScreen() {
  const game = useGame();
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  
  if (!quarterContent) {
    return <div className="error">Quarter {game.currentQuarter} not yet implemented</div>;
  }
  
  const [selectedRisks, setSelectedRisks] = useState<SelectedRisk[]>([]);

  const toggleRisk = (riskId: string) => {
    const isSelected = selectedRisks.some(r => r.identified === riskId);
    if (isSelected) {
      setSelectedRisks(prev => prev.filter(r => r.identified !== riskId));
    } else {
      if (selectedRisks.length < 3) {
        setSelectedRisks(prev => [...prev, { identified: riskId, severity: 3 }]);
      }
    }
  };

  const setSeverity = (riskId: string, severity: number) => {
    setSelectedRisks(prev =>
      prev.map(r => r.identified === riskId ? { ...r, severity } : r)
    );
  };

  const handleProceed = () => {
    if (selectedRisks.length > 0) {
      game.setCurrentRisks(selectedRisks);
      // Skip role-vote if voting is disabled
      const nextPhase = game.participationMode === 'voting_disabled' ? 'team-check' : 'role-vote';
      game.setQuarterPhase(nextPhase);
    }
  };

  return (
    <div className="quarter-screen risk-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Risk Identification</h2>
        <p>{quarterContent.risks.prompt}</p>
        <p className="hint">(Select up to 3 risks)</p>

        <div className="risk-options">
          {quarterContent.risks.options.map((option: any) => {
            const isSelected = selectedRisks.some(r => r.identified === option.value);
            const risk = selectedRisks.find(r => r.identified === option.value);
            return (
              <div key={option.value} className={`risk-option ${isSelected ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRisk(option.value)}
                  disabled={!isSelected && selectedRisks.length >= 3}
                />
                <div className="risk-content">
                  <label>{option.label}</label>
                  <p className="risk-description">{option.description}</p>
                </div>
                {isSelected && (
                  <div className="severity-control">
                    <label>Severity:</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={risk?.severity || 3}
                      onChange={(e) => setSeverity(option.value, parseInt(e.target.value))}
                    />
                    <span>{risk?.severity}/5</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="selected-risks">
          <p><strong>Selected Risks ({selectedRisks.length}/3):</strong></p>
          {selectedRisks.map(r => {
            const label = quarterContent.risks.options.find((o: any) => o.value === r.identified)?.label;
            return <p key={r.identified}>{label} (Severity: {r.severity}/5)</p>;
          })}
        </div>

        <button onClick={handleProceed} disabled={selectedRisks.length === 0} className="btn-primary">
          Risks Identified → Next
        </button>
      </div>
    </div>
  );
}
