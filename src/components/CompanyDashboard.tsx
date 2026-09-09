import React from 'react';
import { TeamData } from '../services/supabase';

interface CompanyDashboardProps {
  team: TeamData;
  quarter: number;
}

export default function CompanyDashboard({ team, quarter }: CompanyDashboardProps) {
  const getCapabilityLevel = (value: number): string => {
    if (value <= 24) return 'Weak';
    if (value <= 44) return 'Developing';
    if (value <= 64) return 'Competitive';
    if (value <= 79) return 'Strong';
    return 'Leading';
  };

  const getCapabilityColor = (value: number): string => {
    if (value <= 24) return 'color-weak';
    if (value <= 44) return 'color-developing';
    if (value <= 64) return 'color-competitive';
    if (value <= 79) return 'color-strong';
    return 'color-leading';
  };

  const runwayQuarters = team.operating_cost > 0 ? (team.cash / team.operating_cost) : 0;

  return (
    <div className="company-dashboard">
      <section className="financials">
        <h3>Financials (Q{quarter})</h3>
        <div className="metrics">
          <div className="metric">
            <span className="label">Revenue</span>
            <span className="value">${team.revenue.toFixed(1)}M</span>
          </div>
          <div className="metric">
            <span className="label">Operating Profit</span>
            <span className="value">${team.operating_profit.toFixed(1)}M</span>
          </div>
          <div className="metric">
            <span className="label">Cash</span>
            <span className={`value ${runwayQuarters < 2 ? 'warning' : ''}`}>${team.cash.toFixed(1)}M</span>
          </div>
          <div className="metric">
            <span className="label">Runway</span>
            <span className={`value ${runwayQuarters < 2 ? 'warning' : ''}`}>{runwayQuarters.toFixed(1)}q</span>
          </div>
          <div className="metric">
            <span className="label">Stock Price</span>
            <span className="value">${team.stock_price.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <section className="capabilities">
        <h3>Capabilities</h3>
        <div className="capability-grid">
          <div className={`capability ${getCapabilityColor(team.capability_consumer)}`}>
            <div className="cap-name">Consumer</div>
            <div className="cap-bar" style={{ width: `${team.capability_consumer}%` }}></div>
            <div className="cap-level">{getCapabilityLevel(team.capability_consumer)}</div>
          </div>

          <div className={`capability ${getCapabilityColor(team.capability_enterprise)}`}>
            <div className="cap-name">Enterprise</div>
            <div className="cap-bar" style={{ width: `${team.capability_enterprise}%` }}></div>
            <div className="cap-level">{getCapabilityLevel(team.capability_enterprise)}</div>
          </div>

          <div className={`capability ${getCapabilityColor(team.capability_ai)}`}>
            <div className="cap-name">AI</div>
            <div className="cap-bar" style={{ width: `${team.capability_ai}%` }}></div>
            <div className="cap-level">{getCapabilityLevel(team.capability_ai)}</div>
          </div>

          <div className={`capability ${getCapabilityColor(team.capability_talent)}`}>
            <div className="cap-name">Talent</div>
            <div className="cap-bar" style={{ width: `${team.capability_talent}%` }}></div>
            <div className="cap-level">{getCapabilityLevel(team.capability_talent)}</div>
          </div>
        </div>
      </section>

      <section className="quality">
        <h3>Quality & Culture</h3>
        <div className="quality-metrics">
          <div className="quality-item">
            <span className="label">Product Quality</span>
            <div className="progress-bar" style={{ width: `${team.product_quality}%` }}></div>
            <span className="value">{team.product_quality}/100</span>
          </div>
          <div className="quality-item">
            <span className="label">Culture</span>
            <div className="progress-bar" style={{ width: `${team.culture}%` }}></div>
            <span className="value">{team.culture}/100</span>
          </div>
          <div className="quality-item">
            <span className="label">Trust</span>
            <div className="progress-bar" style={{ width: `${team.trust}%` }}></div>
            <span className="value">{team.trust}/100</span>
          </div>
        </div>
      </section>
    </div>
  );
}
