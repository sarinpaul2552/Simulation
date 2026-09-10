import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent } from '../../simulation/engine';
import { QuarterUnavailableScreen } from './QuarterUnavailableScreen';

interface ReflectScreenProps {
  assignedRole: string;
}

export default function ReflectScreen({ assignedRole: _assignedRole }: ReflectScreenProps) {
  const game = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  // Load content for current quarter dynamically
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  const eventContent = quarterContent || { reflect: { prompt: '', options: [] } };

  // Get next available quarter
  const nextAvailableQuarter = game.getNextAvailableQuarter(game.currentQuarter);
  const showUnavailableScreen = nextAvailableQuarter === null;

  const handleProceed = () => {
    if (selected && nextAvailableQuarter !== null) {
      game.setQuarterPhase('event');
      game.setCurrentQuarter(nextAvailableQuarter); // Advance to next available quarter
      game.resetQuarter();
    }
  };

  // If next quarter is unavailable, show the unavailable screen
  if (showUnavailableScreen) {
    return <QuarterUnavailableScreen />;
  }

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
          <p>Your allocation has been locked. Capabilities have developed. You're now ready for Q{nextAvailableQuarter}.</p>
        </div>

        <button onClick={handleProceed} disabled={!selected} className="btn-primary">
          Reflection Complete → Q{nextAvailableQuarter}
        </button>
      </div>
    </div>
  );
}
