import { useState } from 'react';
import { useGame } from '../context/GameContext';
import gameplayContent from '../content/gameplay.json';
import { getQuarterContent } from '../simulation/engine';
import './ScenarioContextPanel.css';

export default function ScenarioContextPanel() {
  const game = useGame();
  const [isExpanded, setIsExpanded] = useState(true);

  // Load content for current quarter
  const quarterContent = getQuarterContent(game.currentQuarter, gameplayContent);
  
  if (!quarterContent) {
    return null;
  }

  return (
    <div className={`scenario-context-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="panel-title">
          <span className="quarter-label">Q{game.currentQuarter}</span>
          <span className="scenario-title">{quarterContent.event_title}</span>
        </div>
        <button className="toggle-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="panel-content">
          <p className="scenario-summary">{quarterContent.event_description}</p>
        </div>
      )}
    </div>
  );
}
