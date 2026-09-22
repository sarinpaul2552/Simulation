import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent } from '../../simulation/engine';
import { QuarterUnavailableScreen } from './QuarterUnavailableScreen';
import FinalResultsScreen from './FinalResultsScreen';

interface ReflectScreenProps {
  assignedRole: string;
}

export default function ReflectScreen({ assignedRole: _assignedRole }: ReflectScreenProps) {
  const game = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [showFinalResults, setShowFinalResults] = useState(false);

  // Load content for current quarter dynamically
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  const eventContent = quarterContent || { reflect: { prompt: '', options: [] } };

  // Check if this is Q8 (terminal quarter)
  const isQ8 = game.currentQuarter === 8;

  // Get next available quarter (only if not Q8)
  const nextAvailableQuarter = !isQ8 ? game.getNextAvailableQuarter(game.currentQuarter) : null;
  const showUnavailableScreen = !isQ8 && nextAvailableQuarter === null;

  // If Q8 and ready to show results, display FinalResultsScreen
  if (isQ8 && showFinalResults) {
    return <FinalResultsScreen />;
  }

  const handleProceed = () => {
    if (selected) {
      if (isQ8) {
        // Q8 is terminal - show final results
        setShowFinalResults(true);
      } else if (nextAvailableQuarter !== null) {
        // Normal progression to next quarter
        game.setQuarterPhase('event');
        game.setCurrentQuarter(nextAvailableQuarter);
        game.resetQuarter();
      }
    }
  };

  // If not Q8 and next quarter is unavailable, show unavailable screen
  if (showUnavailableScreen) {
    return <QuarterUnavailableScreen />;
  }

  return (
    <div className="quarter-screen reflect-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Reflection{isQ8 && ' (Final)'}</h2>
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
          {isQ8 ? (
            <p>Your eight-quarter journey is complete. Final results and leadership scorecard await.</p>
          ) : (
            <p>Your allocation has been locked. Capabilities have developed. You're now ready for Q{nextAvailableQuarter}.</p>
          )}
        </div>

        <button onClick={handleProceed} disabled={!selected} className="btn-primary">
          {isQ8 ? 'View Final Results' : `Reflection Complete → Q${nextAvailableQuarter}`}
        </button>
      </div>
    </div>
  );
}
