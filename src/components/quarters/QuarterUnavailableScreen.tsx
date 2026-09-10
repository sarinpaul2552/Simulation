import { useGame } from '../../context/GameContext';

export const QuarterUnavailableScreen: React.FC = () => {
  const game = useGame();
  const maxQuarter = Math.max(...(game.getAvailableQuarters() || [1, 2]));

  return (
    <div className="quarter-screen quarter-unavailable">
      <div className="card">
        <h1>Q{game.currentQuarter + 1} Not Yet Available</h1>
        <p className="text-lg">
          The simulation currently ends after Q{maxQuarter}. 
          Future quarters will be added in upcoming releases.
        </p>
        
        <div className="info-box">
          <p className="font-semibold">Available Quarters:</p>
          <ul className="mt-2">
            {(game.getAvailableQuarters() || []).map(q => (
              <li key={q}>Q{q}</li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-sm text-slate-600">
          Use the <strong>Exit</strong> button in the header to return to the setup screen.
        </p>
      </div>
    </div>
  );
};
