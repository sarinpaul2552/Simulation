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
  productQualityChange?: number;  // Added: Product quality change from people investment
  cultureChange?: number;          // Added: Culture change from people investment
  trustChange?: number;            // Added: Trust change from university investment
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

  // Instructor/People investment -> Talent capability, Culture, & Product Quality
  let productQualityGain = 0;
  let cultureGain = 0;
  if (allocation.instructorPeople > 0) {
    const effectiveInstructor = effectiveAllocations.instructorPeople;
    newCapabilities.talent = createCapabilityFromInvestment(
      'instructorPeople',
      effectiveInstructor,
      currentState.capabilities.talent
    );
    // People investment boosts culture (+0.30 per effective $1M)
    cultureGain = effectiveInstructor * 0.3;
    
    // People investment boosts product quality (+0.30 per effective $1M per locked spec)
    productQualityGain = effectiveInstructor * 0.30;
  }

  // University/Credential investment -> Credential capability & Trust
  let trustGain = 0;
  if (allocation.universityCredential > 0) {
    newCapabilities.credential = createCapabilityFromInvestment(
      'universityCredential',
      effectiveAllocations.universityCredential,
      currentState.capabilities.credential
    );
    
    // University/Credential investment boosts trust (+0.25 per effective $1M per locked spec)
    trustGain = effectiveAllocations.universityCredential * 0.25;
  }

  // Q1: Customer Success capability not available (becomes available Q5+)
  // customerSuccess allocation enforced to be 0 above; no processing needed

  // Calculate Execution Alignment Score (hidden)
  const executionAlignment = calculateExecutionAlignment(allocation, roleVotes, teamCheckOverride, dissents);
  newCapabilities.execution = executionAlignment;

  // Q1 Revenue: Base market tailwind + Enterprise incremental Q1 revenue
  // Per locked spec: Consumer & University investments mature Q2, not Q1
  // Enterprise: "+0.15% current Enterprise revenue per effective $1M" (small pipeline benefit)
  // AI has no Q1 commercial benefit
  const baseMarketTailwind = 1.02; // +2%
  let q1Revenue = currentState.revenue * baseMarketTailwind;
  
  // Q1: Enterprise has small current-quarter pipeline benefit
  // Per locked spec: +0.15% current Enterprise revenue per effective $1M
  let strategicRevenueInQ1 = 0;
  if (allocation.enterpriseSales > 0) {
    const currentEnterpriseRevenue = currentState.revenue * 0.20; // Enterprise is 20% of baseline $200M
    strategicRevenueInQ1 = currentEnterpriseRevenue * (0.0015 * effectiveAllocations.enterpriseSales);
  }
  
  // Q1: Consumer allocation matures Q2, not Q1 (locked spec)
  // No consumer revenue lift applied in Q1
  
  // Q1: Alignment multiplier applies only to incremental strategy-generated revenue
  // Apply multiplier only to strategic revenue, not to base
  const alignmentMultiplier = getAlignmentMultiplier(executionAlignment);
  const alignedStrategicRevenue = strategicRevenueInQ1 * alignmentMultiplier;
  const alignmentBoostOnStrategic = alignedStrategicRevenue - strategicRevenueInQ1;
  
  q1Revenue = q1Revenue + strategicRevenueInQ1 + alignmentBoostOnStrategic;

  // Operating profit
  const q1OpCost = currentState.operatingCost; // simplified: same as baseline
  const q1OpProfit = q1Revenue - q1OpCost;

  // Closing cash (Q1: only 5 strategic categories spend; CS and marketing enforced to 0)
  // Strategic spend includes only the 5 invested categories; allocation.cash is retained by definition
  // Do NOT add retainedCash separately—it's already excluded from strategicSpend
  const strategicSpend = allocation.consumerGrowth + allocation.enterpriseSales + allocation.aiProduct +
                         allocation.instructorPeople + allocation.universityCredential;
  const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend;

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
  const narrative = `Q1 revenue: $${q1Revenue.toFixed(1)}M (market tailwind +2%, enterprise +${strategicRevenueInQ1.toFixed(2)}M allocation effects). Operating profit: $${q1OpProfit.toFixed(1)}M. Closing cash: $${q1ClosingCash.toFixed(1)}M. Stock: ${newStockPrice.toFixed(2)} (${stockPriceChange > 0 ? '+' : ''}${stockPriceChange.toFixed(1)}%).`;

  return {
    revenueChange: q1Revenue - currentState.revenue,
    cashChange: q1ClosingCash - currentState.cash,
    capabilityChanges,
    thresholdsCrossed,
    stockPriceChange,
    narrative,
    productQualityChange: productQualityGain,
    cultureChange: cultureGain,
    trustChange: trustGain,
  };
}

// ============ HELPER FUNCTIONS ============

function calculateExecutionAlignment(
  _allocation: Allocation,
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

export function calculateQ2Consequence(
  allocation: Allocation,
  _roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  ceoOverride: boolean,
  _dissentingRoles: string[],
  startingState: TeamState
): Consequence {
  // Q2 Disruption Economics: ChatGPT Arrives
  // Locked baseline market segment effects:
  // - Consumer: -6% (market shift uncertainty)
  // - Enterprise: +2% (new AI opportunity)
  // - University: 0% (neutral)
  // - AI-native: +20% (from very small base)

  const consumerSegmentShare = 0.40; // Coursera's consumer revenue ~40%
  const enterpriseSegmentShare = 0.50; // Enterprise portion ~50%
  const aiNativeSegmentShare = 0.10; // AI-native portion ~10% (small base)

  // Baseline market effects
  const consumerBaseline = -0.06; // -6%
  const enterpriseBaseline = 0.02; // +2%
  const aiNativeBaseline = 0.20; // +20%

  // Apply AI protection threshold: if AI capability >= 30, reduce consumer downside by 40%
  const aiCapability = startingState.capabilities.ai;
  const aiProtection = aiCapability >= 30 ? 0.4 : 0; // Reduces downside by 40% if threshold met

  // Adjusted consumer effect with AI protection
  const consumerEffect = consumerBaseline * (1 - aiProtection * 0.5); // 50% of protection benefit
  const enterpriseEffect = enterpriseBaseline;
  const aiNativeEffect = aiNativeBaseline;

  // Revenue by segment (starting from Q1 baseline of $200M)
  const consumerRevenue = startingState.revenue * consumerSegmentShare;
  const enterpriseRevenue = startingState.revenue * enterpriseSegmentShare;
  const aiNativeRevenue = startingState.revenue * aiNativeSegmentShare;

  // Apply allocation effects on top of baseline segment effects
  const consumerAllocation = allocation.consumerGrowth || 0;
  const enterpriseAllocation = allocation.enterpriseSales || 0;
  const aiAllocation = allocation.aiProduct || 0;

  // Allocation multiplier: $1M allocation = 0.1% revenue improvement (diminishing returns applied)
  const consumerAllocBoost = Math.min(0.04, consumerAllocation * 0.004); // Caps at 4%
  const enterpriseAllocBoost = Math.min(0.05, enterpriseAllocation * 0.005); // Caps at 5%
  const aiAllocBoost = Math.min(0.08, aiAllocation * 0.012); // Caps at 8%

  // Calculate new revenues
  const newConsumerRevenue = consumerRevenue * (1 + consumerEffect + consumerAllocBoost);
  const newEnterpriseRevenue = enterpriseRevenue * (1 + enterpriseEffect + enterpriseAllocBoost);
  const newAiNativeRevenue = aiNativeRevenue * (1 + aiNativeEffect + aiAllocBoost);

  const newRevenue = newConsumerRevenue + newEnterpriseRevenue + newAiNativeRevenue;
  const revenueChange = newRevenue - startingState.revenue;

  // Operating costs: fixed + variable on revenue
  // AI investments increase opex ($0.3M per $1M invested)
  const additionalAIOpex = aiAllocation * 0.3;
  const revenueVariableOpex = newRevenue * 0.02; // 2% of revenue as variable opex
  const newOpex = startingState.operatingCost + additionalAIOpex + revenueVariableOpex;
  const newOperatingProfit = newRevenue - newOpex;

  // Cash impact
  const cashChange = newOperatingProfit - startingState.operatingProfit;
  const newCash = Math.max(5, startingState.cash + cashChange); // Floor at $5M

  // Stock price: market rewards enterprise focus and AI, penalizes consumer-only
  const enterpriseFocusBoost = enterpriseAllocation > 8 ? 1.08 : 1.0;
  const aiInvestmentBoost = aiAllocation > 5 ? 1.12 : 1.0;
  const consumerOverhang = consumerAllocation > 18 ? 0.92 : 1.0;
  const stockMultiplier = enterpriseFocusBoost * aiInvestmentBoost * consumerOverhang;
  const stockPriceChange = startingState.stockPrice * (stockMultiplier - 1);

  // Capability changes
  // AI capability gains from investment, capped at +15 per quarter
  const aiCapabilityGain = Math.min(15, aiAllocation * 1.2);
  // Consumer capability loss from disruption, mitigated by allocation
  const consumerCapabilityChange = -8 + (consumerAllocation * 0.3);
  // Enterprise capability gains from market opportunity and allocation
  const enterpriseCapabilityGain = 4 + (enterpriseAllocation * 0.5);
  // Execution alignment effect
  const executionChange = ceoOverride ? -3 : 2;

  // Thresholds crossed
  const thresholdsCrossed: string[] = [];
  if (aiCapabilityGain >= 10) {
    thresholdsCrossed.push('🤖 AI capability advanced (+' + aiCapabilityGain.toFixed(0) + ')');
  }
  if (aiCapability >= 30 && consumerAllocation > 0) {
    thresholdsCrossed.push('🛡️ AI protection engaged: consumer downside reduced');
  }
  if (newCash < startingState.cash * 0.6) {
    thresholdsCrossed.push('⚠️ Cash runway tightening—6 month window');
  }
  if (enterpriseRevenue * (1 + enterpriseEffect + enterpriseAllocBoost) > enterpriseRevenue * 1.05) {
    thresholdsCrossed.push('📈 Enterprise segment capturing disruption opportunity (+' + ((enterpriseEffect + enterpriseAllocBoost) * 100).toFixed(1) + '%)');
  }

  const narrative = `Q2: ChatGPT disrupts the market.
Consumer willingness to pay weakens (-6% baseline), but enterprise sees AI-augmented workforce learning as strategic.

Your allocation strategy reveals your conviction:
${consumerAllocation > 18 ? '• Heavy consumer spend ($' + consumerAllocation.toFixed(1) + 'M): Betting disruption is temporary' : consumerAllocation > 8 ? '• Moderate consumer ($' + consumerAllocation.toFixed(1) + 'M): Balanced exposure' : '• Light consumer ($' + consumerAllocation.toFixed(1) + 'M): Conceding market shift'}
${enterpriseAllocation > 8 ? '• Strong enterprise focus ($' + enterpriseAllocation.toFixed(1) + 'M): Pursuing new market' : '• Modest enterprise ($' + enterpriseAllocation.toFixed(1) + 'M): Cautious on new market'}
${aiAllocation > 5 ? '• AI investment ($' + aiAllocation.toFixed(1) + 'M): Building competitive moat' : '• Limited AI spend ($' + aiAllocation.toFixed(1) + 'M): Managed risk'}

Revenue result: ${revenueChange > 0 ? '+$' + revenueChange.toFixed(1) + 'M despite market disruption' : '−$' + Math.abs(revenueChange).toFixed(1) + 'M—market uncertainty took hold'}
${aiCapability >= 30 && consumerAllocation > 0 ? 'Your AI capability shielded consumer revenue from the worst of the downturn.' : 'No AI shield available—consumer segment fully exposed.'}`;

  return {
    narrative,
    revenueChange,
    cashChange,
    stockPriceChange,
    productQualityChange: aiCapabilityGain - 2,
    cultureChange: ceoOverride ? -5 : 1,
    trustChange: (enterpriseAllocation > 8 ? 3 : -2),
    capabilityChanges: {
      consumer: Math.max(-20, consumerCapabilityChange),
      enterprise: Math.min(20, enterpriseCapabilityGain),
      ai: aiCapabilityGain,
      talent: ceoOverride ? -1 : 1,
      credential: -1,
      customerSuccess: Math.max(0, enterpriseAllocation * 0.2),
      growth: Math.min(15, (enterpriseAllocation + aiAllocation) * 0.4),
      execution: executionChange,
    },
    thresholdsCrossed,
  };
}

// ============ Q2 OPENING STATE ============

export function getQ2EventContext(): { title: string; description: string } {
  return {
    title: 'ChatGPT Arrives',
    description: 'OpenAI releases ChatGPT. Within weeks, it reaches 100M users. The market wakes up to generative AI as a real force. Consumer willingness to pay begins weakening. Enterprise suddenly sees opportunity in AI-enabled workforce learning.',
  };
}

// ============ GENERIC QUARTER CONSEQUENCE CALCULATOR ============

/**
 * Quarter consequence engines registry.
 * Map quarters to their corresponding consequence calculation functions.
 * To add a new quarter: add a new case below, implement calculateQxConsequence, and update gameplay.json quarterMetadata.
 * 
 * @param quarter - Quarter number (1-8)
 * @param allocation - Capital allocation decisions
 * @param roleVotes - Votes from team members (null if voting_disabled mode)
 * @param ceoOverride - Whether CEO exercised override power
 * @param dissentingRoles - Roles that dissented if CEO overrode
 * @param startingState - Team state at start of quarter
 * @returns Consequence object or null if quarter not yet available
 */
export function calculateQuarterConsequence(
  quarter: number,
  allocation: Allocation,
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  ceoOverride: boolean,
  dissentingRoles: string[],
  startingState: TeamState
): Consequence | null {
  switch (quarter) {
    case 1:
      return calculateQ1Consequence(allocation, roleVotes || {}, ceoOverride, dissentingRoles, startingState);
    case 2:
      return calculateQ2Consequence(allocation, roleVotes, ceoOverride, dissentingRoles, startingState);
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
      // Quarters 3-8: Not yet implemented. Add calculateQxConsequence function and case here.
      return null;
    default:
      return null;
  }
}

// ============ GENERIC QUARTER CONTENT LOOKUP ============

export function getQuarterContent(
  quarter: number,
  gameplayContent: Record<string, any>
): Record<string, any> | null {
  const key = 'q' + quarter;
  return gameplayContent[key] || null;
}
