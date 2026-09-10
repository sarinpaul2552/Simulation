import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent } from '../../simulation/engine';

interface ReflectScreenProps {
  assignedRole: string;
}

export default function ReflectScreen({ assignedRole: _assignedRole }: ReflectScreenProps) {
  const game = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  // Load content for current quarter dynamically
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  const eventContent = quarterContent || { reflect: { prompt: '', options: [] } };

  const handleProceed = () => {
    if (selected) {
      game.setQuarterPhase('event');
      game.setCurrentQuarter(game.currentQuarter + 1); // Advance to next quarter
      game.resetQuarter();
    }
  };

  return (
    <div className="quarter-screen reflect-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Reflection</h2>
        <p>{eventContent?.reflect?.prompt || 'What did you learn from this quarter?'}</p>

        <div className="reflect-options">
          {(eventContent?.reflect?.options || []).map((option: any) => (
            <div
              key={option.value}
              className={`reflect-option ${selected === option.value ? 'selected' : ''}`}
              onClick={() => setSelected(option.value)}
            >
              <input
                type="radio"
                name="reflect"
                value={option.value}
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
              />
              <label>{option.label}</label>
            </div>
          ))}
        </div>

        <div className="learning-summary">
          <h3>Q{game.currentQuarter} Summary</h3>
          <p>Your allocation has been locked. Capabilities have developed. You're now ready for Q{game.currentQuarter + 1}.</p>
        </div>

        <button onClick={handleProceed} disabled={!selected} className="btn-primary">
          Reflection Complete → Q{game.currentQuarter + 1}
        </button>
      </div>
    </div>
  );
}
