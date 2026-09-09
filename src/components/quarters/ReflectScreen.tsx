import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import gameplayContent from '../../content/gameplay.json';

interface ReflectScreenProps {
  assignedRole: string;
}

export default function ReflectScreen({ assignedRole }: ReflectScreenProps) {
  const game = useGame();
  const eventContent = gameplayContent.q1; // Q1 is showing, so reflect on Q1
  const [selected, setSelected] = useState<string | null>(null);

  const handleProceed = () => {
    if (selected) {
      game.setQuarterPhase('event');
      game.setCurrentQuarter(2);
      game.resetQuarter();
    }
  };

  return (
    <div className="quarter-screen reflect-screen">
      <div className="card">
        <h2>Q{game.currentQuarter} Reflection</h2>
        <p>{eventContent.reflect.prompt}</p>

        <div className="reflect-options">
          {eventContent.reflect.options.map(option => (
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
          <h3>Q1 Summary</h3>
          <p>Your allocation has been locked. Capabilities have developed. You're now ready for Q2 and the market disruption ahead.</p>
        </div>

        <button onClick={handleProceed} disabled={!selected} className="btn-primary">
          Reflection Complete → Q2
        </button>
      </div>
    </div>
  );
}
