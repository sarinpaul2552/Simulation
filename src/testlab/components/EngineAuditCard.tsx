import React, { useState } from 'react';
import { QuarterResult } from '../utils/quarterRunner';
import { calculateEffectiveInvestment } from '../../simulation/engine';
import '../testlab.css';

interface EngineAuditCardProps {
  quarterResult: QuarterResult;
}

export const EngineAuditCard: React.FC<EngineAuditCardProps> = ({ quarterResult }) => {
  const [expanded, setExpanded] = useState(false);
  const qr = quarterResult;
  const consequence = qr.consequence;

  // Calculate effective investment for display
  const effectiveByCategory: Record<string, number> = {};
  Object.entries(qr.allocation).forEach(([category, amount]) => {
    if (amount > 0) {
      effectiveByCategory[category] = calculateEffectiveInvestment(amount);
    }
  });

  const invariantErrors = qr.invariants.checks.filter(c => !c.passed && c.severity === 'error');
  const invariantWarnings = qr.invariants.checks.filter(c => !c.passed && c.severity === 'warning');

  return (
    <div className="audit-card">
      <div className="audit-header" onClick={() => setExpanded(!expanded)}>
        <span className="audit-quarter">Q{qr.quarter}</span>
        <span className="audit-summary">
          Revenue: ${qr.startingState.revenue.toFixed(0)}M → ${qr.endingState.revenue.toFixed(0)}M
          ({consequence.revenueChange > 0 ? '+' : ''}${consequence.revenueChange.toFixed(1)}M)
        </span>
        {invariantErrors.length > 0 && <span className="audit-error">🚨 {invariantErrors.length} errors</span>}
        {invariantWarnings.length > 0 && <span className="audit-warning">⚠️  {invariantWarnings.length} warnings</span>}
        <span className="audit-toggle">{expanded ? '−' : '+'}</span>
      </div>

      {expanded && (
        <div className="audit-details">
          {/* Starting State */}
          <div className="audit-section">
            <h4>📍 STARTING STATE</h4>
            <div className="audit-grid">
              <div>Revenue: ${qr.startingState.revenue.toFixed(1)}M</div>
              <div>Cash: ${qr.startingState.cash.toFixed(1)}M</div>
              <div>Stock: ${qr.startingState.stockPrice.toFixed(2)}</div>
              <div>Quality: {qr.startingState.productQuality.toFixed(0)}</div>
              <div>Culture: {qr.startingState.culture.toFixed(0)}</div>
              <div>Trust: {qr.startingState.trust.toFixed(0)}</div>
            </div>
            <div className="audit-grid">
              <div>Consumer: {qr.startingState.capabilities.consumer.toFixed(0)}</div>
              <div>Enterprise: {qr.startingState.capabilities.enterprise.toFixed(0)}</div>
              <div>AI: {qr.startingState.capabilities.ai.toFixed(0)}</div>
              <div>Talent: {qr.startingState.capabilities.talent.toFixed(0)}</div>
            </div>
          </div>

          {/* Inputs */}
          <div className="audit-section">
            <h4>📌 INPUTS</h4>
            <div>Available Capital: ${qr.availableCapital}M</div>
            <div className="audit-subheader">Allocation:</div>
            <div className="audit-grid">
              {Object.entries(qr.allocation).map(([cat, amount]) => (
                <div key={cat}>
                  {cat}: ${amount.toFixed(1)}M
                  {amount > 0 && ` (${(amount / qr.availableCapital * 100).toFixed(0)}%)`}
                </div>
              ))}
            </div>
            <div className="audit-subheader">Behavior:</div>
            <div>Role Votes: {qr.roleVotes ? Object.entries(qr.roleVotes).map(([r, v]) => `${r}=${v}`).join(', ') : 'Abstain (null)'}</div>
          </div>

          {/* Effective Investment */}
          <div className="audit-section">
            <h4>⚡ EFFECTIVE INVESTMENT (after diminishing returns)</h4>
            <div className="audit-grid">
              {Object.entries(effectiveByCategory).map(([cat, eff]) => {
                const allocated = qr.allocation[cat as keyof typeof qr.allocation] || 0;
                const diminished = allocated - eff;
                return (
                  <div key={cat}>
                    {cat}: ${allocated.toFixed(1)}M → ${eff.toFixed(1)}M effective
                    {diminished > 0.01 && ` (−${diminished.toFixed(1)}M diminished)`}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consequence Deltas */}
          <div className="audit-section">
            <h4>🎯 CONSEQUENCE DELTAS</h4>
            <div>
              Revenue: {consequence.revenueChange > 0 ? '+' : ''}${consequence.revenueChange.toFixed(1)}M
            </div>
            <div>
              Cash: {consequence.cashChange > 0 ? '+' : ''}${consequence.cashChange.toFixed(1)}M
            </div>
            <div>
              Stock: {consequence.stockPriceChange > 0 ? '+' : ''}${consequence.stockPriceChange.toFixed(2)}
            </div>

            {consequence.productQualityChange !== undefined && (
              <div>Quality: {consequence.productQualityChange > 0 ? '+' : ''}{consequence.productQualityChange.toFixed(1)}</div>
            )}
            {consequence.cultureChange !== undefined && (
              <div>Culture: {consequence.cultureChange > 0 ? '+' : ''}{consequence.cultureChange.toFixed(1)}</div>
            )}
            {consequence.trustChange !== undefined && (
              <div>Trust: {consequence.trustChange > 0 ? '+' : ''}{consequence.trustChange.toFixed(1)}</div>
            )}

            {consequence.capabilityChanges && (
              <>
                <div className="audit-subheader">Capability Changes:</div>
                <div className="audit-grid">
                  {Object.entries(consequence.capabilityChanges).map(([cap, delta]) => (
                    <div key={cap}>
                      {cap}: {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thresholds */}
          {consequence.thresholdsCrossed && consequence.thresholdsCrossed.length > 0 && (
            <div className="audit-section">
              <h4>⚠️  THRESHOLDS CROSSED</h4>
              <ul>
                {consequence.thresholdsCrossed.map((threshold, idx) => (
                  <li key={idx}>{threshold}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Terminal Result (Q8 only) */}
          {consequence.terminalResult && (
            <div className="audit-section">
              <h4>🏆 TERMINAL RESULT (Q8)</h4>
              <div className="audit-grid">
                <div>Financial Score: {consequence.terminalResult.financialScore.toFixed(1)}/33</div>
                <div>Strategic Score: {consequence.terminalResult.strategicScore.toFixed(1)}/33</div>
                <div>Organizational Score: {consequence.terminalResult.organizationalScore.toFixed(1)}/34</div>
                <div><strong>TOTAL: {consequence.terminalResult.totalScore.toFixed(1)}/100</strong></div>
              </div>
              <div className="audit-verdict">
                Verdict: <strong>{consequence.terminalResult.verdict}</strong>
              </div>
            </div>
          )}

          {/* Ending State */}
          <div className="audit-section">
            <h4>📊 ENDING STATE</h4>
            <div className="audit-grid">
              <div>Revenue: ${qr.endingState.revenue.toFixed(1)}M</div>
              <div>Cash: ${qr.endingState.cash.toFixed(1)}M</div>
              <div>Stock: ${qr.endingState.stockPrice.toFixed(2)}</div>
              <div>Quality: {qr.endingState.productQuality.toFixed(0)}</div>
              <div>Culture: {qr.endingState.culture.toFixed(0)}</div>
              <div>Trust: {qr.endingState.trust.toFixed(0)}</div>
            </div>
            <div className="audit-grid">
              <div>Consumer: {qr.endingState.capabilities.consumer.toFixed(0)}</div>
              <div>Enterprise: {qr.endingState.capabilities.enterprise.toFixed(0)}</div>
              <div>AI: {qr.endingState.capabilities.ai.toFixed(0)}</div>
              <div>Talent: {qr.endingState.capabilities.talent.toFixed(0)}</div>
            </div>
          </div>

          {/* Invariant Results */}
          {invariantErrors.length > 0 && (
            <div className="audit-section audit-error-section">
              <h4>🚨 INVARIANT ERRORS ({invariantErrors.length})</h4>
              <ul>
                {invariantErrors.map((check, idx) => (
                  <li key={idx}>
                    <strong>{check.id}:</strong> {check.message}
                    {check.details && <div className="audit-details-text">{check.details}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {invariantWarnings.length > 0 && (
            <div className="audit-section audit-warning-section">
              <h4>⚠️  INVARIANT WARNINGS ({invariantWarnings.length})</h4>
              <ul>
                {invariantWarnings.map((check, idx) => (
                  <li key={idx}>
                    <strong>{check.id}:</strong> {check.message}
                    {check.details && <div className="audit-details-text">{check.details}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
