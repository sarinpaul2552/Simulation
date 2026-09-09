import React from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';

export default function EventScreen() {
  const game = useGame();

  const eventContent = game.currentQuarter === 1 
    ? gameplayContent.q1 
    : gameplayContent.q2;

  const handleProceed = () => {
    game.setQuarterPhase('bet');
  };

  return (
    <div className="quarter-screen event-screen">
      <div className="card">
        <h2>{eventContent.event_title}</h2>
        <div className="event-narrative">
          <p>{eventContent.event_description}</p>
        </div>
        <div className="capital-available">
          <p><strong>Capital Available: ${eventContent.available_capital}M</strong></p>
        </div>
        <button onClick={handleProceed} className="btn-primary">
          Proceed to Allocation
        </button>
      </div>
    </div>
  );
}
