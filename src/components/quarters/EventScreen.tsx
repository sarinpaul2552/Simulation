import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';
import { getQuarterContent } from '../../simulation/engine';

export default function EventScreen() {
  const game = useGame();
  
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  if (!quarterContent) {
    return <div className="error">Quarter {game.currentQuarter} not yet implemented</div>;
  }

  const handleProceed = () => {
    game.setQuarterPhase('bet');
  };

  return (
    <div className="quarter-screen event-screen">
      <div className="card">
        <h2>{quarterContent.event_title}</h2>
        <div className="event-narrative">
          <p>{quarterContent.event_description}</p>
        </div>
        <div className="capital-available">
          <p><strong>Capital Available: ${quarterContent.available_capital}M</strong></p>
        </div>
        <button onClick={handleProceed} className="btn-primary">
          Proceed to Allocation
        </button>
      </div>
    </div>
  );
}
