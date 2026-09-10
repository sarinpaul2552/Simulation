import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent } from '../../simulation/engine';

export default function BeliefScreen() {
  const game = useGame();
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  
  if (!quarterContent) {
    return <div className="error">Quarter {game.currentQuarter} not yet implemented</div>;
  }
  
  const [selected, setSelected] = useState<string | null>(null);

  const handleProceed = () => {
    if (selected) {
      game.setCurrentBelief(selected);
      game.setQuarterPhase('risk');
    }
  };

  return (
    <div className="quarter-screen belief-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Strategy Belief</h2>
        <p>{quarterContent.belief.prompt}</p>

        <div className="belief-options">
          {quarterContent.belief.options.map((option: any) => (
            <div
              key={option.value}
              className={`belief-option ${selected === option.value ? 'selected' : ''}`}
              onClick={() => setSelected(option.value)}
            >
              <input
                type="radio"
                name="belief"
                value={option.value}
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
              />
              <label>{option.label}</label>
            </div>
          ))}
        </div>

        <button onClick={handleProceed} disabled={!selected} className="btn-primary">
          Belief Confirmed → Next
        </button>
      </div>
    </div>
  );
}
