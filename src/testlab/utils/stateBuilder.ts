import { TeamState, Consequence, getQ1Baseline } from '../../simulation/engine';

/**
 * STATE BUILDER
 * 
 * Constructs TeamState objects and applies consequence deltas
 * without duplicating engine logic.
 */

/**
 * Get Q1 starting state (delegates to engine)
 */
export function getStartingState(): TeamState {
  return getQ1Baseline();
}

/**
 * Apply a consequence to a TeamState, returning new state
 * Mutation-free: returns new object
 */
export function applyConsequence(
  state: TeamState,
  consequence: Consequence
): TeamState {
  const newState = { ...state };

  // Apply all deltas
  newState.revenue += consequence.revenueChange;
  newState.cash += consequence.cashChange;
  newState.stockPrice += consequence.stockPriceChange;

  // Apply operating profit (assume operatingCost stays same, so profit = revenue - operatingCost)
  // This is an assumption; adjust if engine calculates differently
  newState.operatingProfit = newState.revenue - newState.operatingCost;

  // Apply capability changes
  if (consequence.capabilityChanges) {
    if (consequence.capabilityChanges.consumer !== undefined) {
      newState.capabilities.consumer += consequence.capabilityChanges.consumer;
    }
    if (consequence.capabilityChanges.enterprise !== undefined) {
      newState.capabilities.enterprise += consequence.capabilityChanges.enterprise;
    }
    if (consequence.capabilityChanges.ai !== undefined) {
      newState.capabilities.ai += consequence.capabilityChanges.ai;
    }
    if (consequence.capabilityChanges.talent !== undefined) {
      newState.capabilities.talent += consequence.capabilityChanges.talent;
    }
    if (consequence.capabilityChanges.credential !== undefined) {
      newState.capabilities.credential += consequence.capabilityChanges.credential;
    }
    if (consequence.capabilityChanges.customerSuccess !== undefined) {
      newState.capabilities.customerSuccess += consequence.capabilityChanges.customerSuccess;
    }
    if (consequence.capabilityChanges.growth !== undefined) {
      newState.capabilities.growth += consequence.capabilityChanges.growth;
    }
    if (consequence.capabilityChanges.execution !== undefined) {
      newState.capabilities.execution += consequence.capabilityChanges.execution;
    }
  }

  // Apply quality/culture/trust/execution changes
  if (consequence.productQualityChange !== undefined) {
    newState.productQuality += consequence.productQualityChange;
  }
  if (consequence.cultureChange !== undefined) {
    newState.culture += consequence.cultureChange;
  }
  if (consequence.trustChange !== undefined) {
    newState.trust += consequence.trustChange;
  }
  // Note: execution is captured in capabilityChanges.execution

  return newState;
}

/**
 * Clamp capability values to valid bounds [0, 120]
 */
export function clampCapabilities(state: TeamState): TeamState {
  const clamped = { ...state };
  clamped.capabilities = {
    consumer: Math.max(0, Math.min(120, state.capabilities.consumer)),
    enterprise: Math.max(0, Math.min(120, state.capabilities.enterprise)),
    ai: Math.max(0, Math.min(120, state.capabilities.ai)),
    talent: Math.max(0, Math.min(120, state.capabilities.talent)),
    credential: Math.max(0, Math.min(120, state.capabilities.credential)),
    customerSuccess: Math.max(0, Math.min(120, state.capabilities.customerSuccess)),
    growth: Math.max(0, Math.min(120, state.capabilities.growth)),
    execution: Math.max(0, Math.min(120, state.capabilities.execution)),
  };
  return clamped;
}

/**
 * Clamp all metrics to valid ranges
 */
export function clampState(state: TeamState): TeamState {
  const clamped = { ...state };
  clamped.productQuality = Math.max(0, Math.min(100, state.productQuality));
  clamped.culture = Math.max(0, Math.min(100, state.culture));
  clamped.trust = Math.max(0, Math.min(100, state.trust));
  clamped.capabilities = {
    consumer: Math.max(0, Math.min(120, state.capabilities.consumer)),
    enterprise: Math.max(0, Math.min(120, state.capabilities.enterprise)),
    ai: Math.max(0, Math.min(120, state.capabilities.ai)),
    talent: Math.max(0, Math.min(120, state.capabilities.talent)),
    credential: Math.max(0, Math.min(120, state.capabilities.credential)),
    customerSuccess: Math.max(0, Math.min(120, state.capabilities.customerSuccess)),
    growth: Math.max(0, Math.min(120, state.capabilities.growth)),
    execution: Math.max(0, Math.min(120, state.capabilities.execution)),
  };
  return clamped;
}

/**
 * Format a TeamState for display
 */
export function formatState(state: TeamState, label?: string): string {
  const lines = label ? [`📊 ${label}`] : [];
  lines.push(`Revenue: $${state.revenue.toFixed(1)}M`);
  lines.push(`Cash: $${state.cash.toFixed(1)}M`);
  lines.push(`Operating Profit: $${state.operatingProfit.toFixed(1)}M`);
  lines.push(`Stock: $${state.stockPrice.toFixed(2)}`);
  lines.push(`Quality: ${state.productQuality.toFixed(0)}`);
  lines.push(`Culture: ${state.culture.toFixed(0)}`);
  lines.push(`Trust: ${state.trust.toFixed(0)}`);
  lines.push(`Capabilities: C=${state.capabilities.consumer.toFixed(0)} E=${state.capabilities.enterprise.toFixed(0)} AI=${state.capabilities.ai.toFixed(0)} T=${state.capabilities.talent.toFixed(0)} Cred=${state.capabilities.credential.toFixed(0)} CS=${state.capabilities.customerSuccess.toFixed(0)} Exec=${state.capabilities.execution.toFixed(0)}`);
  return lines.join('\n');
}
