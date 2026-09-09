/**
 * V4 Simulation Engine
 * Core economics, capabilities, consequences calculation
 * Completely independent of Supabase and React
 * Can be tested and extracted independently
 */

export interface Allocation {
  consumerGrowth: number;
  enterpriseSales: number;
  aiProduct: number;
  instructorPeople: number;
  universityCredential: number;
  customerSuccess: number;
  marketing: number;
  cash: number;
}

export interface Capabilities {
  consumer: number;
  enterprise: number;
  ai: number;
  talent: number;
  credential: number;
  customerSuccess: number;
  growth: number;
  execution: number;
}

export interface TeamState {
  // Financial
  revenue: number;
  operatingCost: number;
  operatingProfit: number;
  cash: number;
  stockPrice: number;
  
  // Quality
  productQuality: number;
  culture: number;
  trust: number;
  
  // Capabilities (persistent across quarters)
  capabilities: Capabilities;
  
  // Strategic
  q4Commitment?: string;
}

export interface Consequence {
  revenueChange: number;
  cashChange: number;
  capabilityChanges: Partial<Capabilities>;
  thresholdsCrossed: string[];
  stockPriceChange: number;
  narrative: string;
}

// ============ DIMINISHING RETURNS ============

export function calculateEffectiveInvestment(amountSpent: number): number {
  if (amountSpent <= 5) return amountSpent * 1.0;
  if (amountSpent <= 10) return 5 * 1.0 + (amountSpent - 5) * 0.8;
  if (amountSpent <= 15) return 5 * 1.0 + 5 * 0.8 + (amountSpent - 10) * 0.6;
  // Over 15
  return 5 * 1.0 + 5 * 0.8 + 5 * 0.6 + (amountSpent - 15) * 0.4;
}

// ============ PERSISTENT CAPABILITY CREATION ============

export function createCapabilityFromInvestment(
  category: keyof Allocation,
  effectiveInvestment: number,
  currentCapability: number
): number {
  const gainPerDollar: Record<string, number> = {
    consumerGrowth: 1.0,
    enterpriseSales: 1.2,
    aiProduct: 1.3,
    instructorPeople: 1.0,
    universityCredential: 1.0,
    customerSuccess: 1.2,
    marketing: 0.7,
    cash: 0, // cash doesn't create capability
  };

  const gain = effectiveInvestment * (gainPerDollar[category] || 0);
  const newCapability = Math.min(100, currentCapability + gain);
  
  return newCapability;
}

// ============ CAPABILITY THRESHOLDS ============

export function getCapabilityLevel(value: number): string {
  if (value <= 24) return 'Weak';
  if (value <= 44) return 'Developing';
  if (value <= 64) return 'Competitive';
  if (value <= 79) return 'Strong';
  return 'Leading';
}

// ============ Q1 BASELINE ============

export function getQ1Baseline(): TeamState {
  return {
    revenue: 200,
    operatingCost: 170,
    operatingProfit: 30,
    cash: 60,
    stockPrice: 100,
    productQuality: 70,
    culture: 72,
    trust: 70,
    capabilities: {
      consumer: 55,
      enterprise: 30,
      ai: 10,
      talent: 55,
      credential: 40,
      customerSuccess: 30,
      growth: 55,
      execution: 60,
    },
  };
}

// ============ Q1 ECONOMICS ============

export function calculateQ1Consequence(
  allocation: Allocation,
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'>,
  teamCheckOverride: boolean,
  dissents: string[],
  currentState: TeamState
): Consequence {
  // Validate allocation totals to 30
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 30) > 0.01) {
    throw new Error(`Allocation must total 30, got ${total}`);
  }

  // Q1 ONLY: Enforce locked 6-category design (Customer Success and Marketing become available post-Q4)
  if (Math.abs(allocation.customerSuccess) > 0.01 || Math.abs(allocation.marketing) > 0.01) {
    throw new Error(
      'Q1 does not support customerSuccess or marketing allocation. ' +
      'These strategic categories become available after Q4 destination commitment (Q5+). ' +
      'Locked Q1 categories: consumerGrowth, enterpriseSales, aiProduct, instructorPeople, universityCredential, cash.'
    );
  }

  // Calculate effective investments (diminishing returns)
  const effectiveAllocations: Record<string, number> = {};
  Object.entries(allocation).forEach(([key, amount]) => {
    effectiveAllocations[key] = calculateEffectiveInvestment(amount);
  });

  // Update capabilities
  const newCapabilities: Capabilities = { ...currentState.capabilities };
  
  // Consumer Growth investment -> Consumer capability
  if (allocation.consumerGrowth > 0) {
    newCapabilities.consumer = createCapabilityFromInvestment(
      'consumerGrowth',
      effectiveAllocations.consumerGrowth,
      currentState.capabilities.consumer
    );
  }

  // Enterprise Sales investment -> Enterprise capability
  if (allocation.enterpriseSales > 0) {
    newCapabilities.enterprise = createCapabilityFromInvestment(
      'enterpriseSales',
      effectiveAllocations.enterpriseSales,
      currentState.capabilities.enterprise
    );
  }

  // AI Product investment -> AI capability
  if (allocation.aiProduct > 0) {
    newCapabilities.ai = createCapabilityFromInvestment(
      'aiProduct',
      effectiveAllocations.aiProduct,
      currentState.capabilities.ai
    );
  }

  // Instructor/People investment -> Talent capability & Culture
  if (allocation.instructorPeople > 0) {
    const effectiveInstructor = effectiveAllocations.instructorPeople;
    newCapabilities.talent = createCapabilityFromInvestment(
      'instructorPeople',
      effectiveInstructor,
      currentState.capabilities.talent
    );
    // People investment also boosts culture
    const cultureGain = effectiveInstructor * 0.3;
    newCapabilities.culture = Math.min(100, currentState.culture + cultureGain);
  }

  // University/Credential investment -> Credential capability
  if (allocation.universityCredential > 0) {
    newCapabilities.credential = createCapabilityFromInvestment(
      'universityCredential',
      effectiveAllocations.universityCredential,
      currentState.capabilities.credential
    );
  }

  // Q1: Customer Success capability not available (becomes available Q5+)
  // customerSuccess allocation enforced to be 0 above; no processing needed

  // Calculate Execution Alignment Score (hidden)
  const executionAlignment = calculateExecutionAlignment(allocation, roleVotes, teamCheckOverride, dissents);
  newCapabilities.execution = executionAlignment;

  // Q1 Revenue: Base market tailwind + allocation effects
  const baseMarketTailwind = 1.02; // +2%
  let q1Revenue = currentState.revenue * baseMarketTailwind;
  
  // Consumer allocation creates near-term revenue
  const consumerRevenueLift = (allocation.consumerGrowth / 30) * (newCapabilities.consumer / 100) * 0.05; // small %
  q1Revenue += q1Revenue * consumerRevenueLift;

  // Enterprise has small current-quarter pipeline benefit
  if (allocation.enterpriseSales > 0 && newCapabilities.enterprise >= 45) {
    const enterpriseLift = (allocation.enterpriseSales / 30) * 0.02;
    q1Revenue += q1Revenue * enterpriseLift;
  }

  // Apply alignment multiplier
  const alignmentMultiplier = getAlignmentMultiplier(executionAlignment);
  q1Revenue = q1Revenue * alignmentMultiplier;

  // Operating profit
  const q1OpCost = currentState.operatingCost; // simplified: same as baseline
  const q1OpProfit = q1Revenue - q1OpCost;

  // Closing cash (Q1: only 5 strategic categories spend; CS and marketing enforced to 0)
  const strategicSpend = allocation.consumerGrowth + allocation.enterpriseSales + allocation.aiProduct +
                         allocation.instructorPeople + allocation.universityCredential;
  const retainedCash = allocation.cash;
  const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend + retainedCash;

  // Stock price response
  const growthVsExpectation = (q1Revenue - currentState.revenue) / currentState.revenue; // vs baseline
  const stockChangeFromGrowth = growthVsExpectation * 0.35 * 100;
  const marginChange = (q1OpProfit / q1Revenue) - (currentState.operatingProfit / currentState.revenue);
  const stockChangeFromMargin = marginChange * 0.30 * 100;
  const stockChangeFromAlignment = (executionAlignment - 60) * 0.15;
  
  let stockPriceChange = stockChangeFromGrowth + stockChangeFromMargin + stockChangeFromAlignment;
  stockPriceChange = Math.max(-15, Math.min(15, stockPriceChange)); // Cap at ±15%
  const newStockPrice = Math.max(10, currentState.stockPrice + stockPriceChange);

  // Thresholds crossed
  const thresholdsCrossed: string[] = [];
  if (getCapabilityLevel(currentState.capabilities.ai) !== getCapabilityLevel(newCapabilities.ai)) {
    thresholdsCrossed.push(`AI capability moved to ${getCapabilityLevel(newCapabilities.ai)}`);
  }
  if (getCapabilityLevel(currentState.capabilities.enterprise) !== getCapabilityLevel(newCapabilities.enterprise)) {
    thresholdsCrossed.push(`Enterprise capability moved to ${getCapabilityLevel(newCapabilities.enterprise)}`);
  }
  if (getCapabilityLevel(currentState.capabilities.consumer) !== getCapabilityLevel(newCapabilities.consumer)) {
    thresholdsCrossed.push(`Consumer capability moved to ${getCapabilityLevel(newCapabilities.consumer)}`);
  }

  // Capability changes summary
  const capabilityChanges: Partial<Capabilities> = {
    consumer: newCapabilities.consumer - currentState.capabilities.consumer,
    enterprise: newCapabilities.enterprise - currentState.capabilities.enterprise,
    ai: newCapabilities.ai - currentState.capabilities.ai,
    talent: newCapabilities.talent - currentState.capabilities.talent,
    credential: newCapabilities.credential - currentState.capabilities.credential,
    customerSuccess: newCapabilities.customerSuccess - currentState.capabilities.customerSuccess,
    execution: newCapabilities.execution - currentState.capabilities.execution,
  };

  // Narrative
  const narrative = `Q1 revenue: $${q1Revenue.toFixed(1)}M (market tailwind +2%, allocation effects). Operating profit: $${q1OpProfit.toFixed(1)}M. Closing cash: $${q1ClosingCash.toFixed(1)}M. Stock: ${newStockPrice.toFixed(2)} (${stockPriceChange > 0 ? '+' : ''}${stockPriceChange.toFixed(1)}%).`;

  return {
    revenueChange: q1Revenue - currentState.revenue,
    cashChange: q1ClosingCash - currentState.cash,
    capabilityChanges,
    thresholdsCrossed,
    stockPriceChange,
    narrative,
  };
}

// ============ HELPER FUNCTIONS ============

function calculateExecutionAlignment(
  allocation: Allocation,
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'>,
  override: boolean,
  dissents: string[]
): number {
  // Base execution alignment
  let score = 60;

  // Count unanimous agreement
  const totalVotes = Object.entries(roleVotes).filter(([_, v]) => v !== 'abstain').length;
  const yesVotes = Object.entries(roleVotes).filter(([_, v]) => v === 'yes').length;

  if (yesVotes === totalVotes && totalVotes === 5) {
    score += 15; // Unanimous
  } else if (yesVotes >= 4) {
    score += 8; // Broad alignment
  } else if (yesVotes >= 3) {
    score += 3; // Debate but some agreement
  }

  // Override penalty (but not if all agree with override)
  if (override && dissents.length > 0) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function getAlignmentMultiplier(executionAlignment: number): number {
  if (executionAlignment >= 80) return 1.1;
  if (executionAlignment >= 65) return 1.05;
  if (executionAlignment >= 45) return 1.0;
  if (executionAlignment >= 30) return 0.92;
  return 0.85;
}

// ============ Q2 OPENING STATE (for callback demo) ============

export function getQ2EventContext(): { title: string; description: string } {
  return {
    title: 'ChatGPT Arrives',
    description: 'OpenAI releases ChatGPT. Within weeks, it reaches 100M users. The market wakes up to generative AI as a real force. Consumer willingness to pay begins weakening. Enterprise suddenly sees opportunity in AI-enabled workforce learning.',
  };
}
