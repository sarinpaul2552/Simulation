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

// ============ Q8 TERMINAL RESULT (Single Source of Truth) ============

export interface TerminalResult {
  // Financial absolutes (post-Q8)
  revenue: number;
  cash: number;
  stockPrice: number;
  ebitda: number;
  ebitdaMargin: number;
  
  // Scores (0-100 scale)
  financialScore: number;      // 0-33
  strategicScore: number;      // 0-33
  organizationalScore: number; // 0-34
  totalScore: number;          // 0-100
  verdict: 'WINNER' | 'SURVIVOR' | 'STRUGGLING' | 'FAILURE';
  
  // DIAGNOSTIC: Financial score component breakdown
  __diagnostic__financialComponents?: {
    revenueComponent: number;
    ebitdaComponent: number;
    cashComponent: number;
    otherComponent: number;
    rawSubtotal: number;
    finalFinancialScore: number;
  };
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
  
  // Q8 terminal result (populated only by calculateQ8Consequence)
  terminalResult?: TerminalResult;
  
  // DIAGNOSTIC: Cash ledger details (all quarters Q1-Q8)
  __diagnostic__cashLedger?: {
    openingCash: number;
    revenue: number;
    operatingCost: number;
    operatingProfit: number;
    strategicSpend: number;
    financing: number;
    otherAdjustment: number;
    closingCash: number;
  };
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

  // DIAGNOSTIC: Cash accounting
  console.log(`\nQ1 CASH ACCOUNTING:`);
  console.log(`  Opening Cash: $${currentState.cash.toFixed(1)}M`);
  console.log(`  Revenue: $${q1Revenue.toFixed(1)}M`);
  console.log(`  Operating Cost: $${currentState.operatingCost}M`);
  console.log(`  Operating Profit: $${q1OpProfit.toFixed(1)}M`);
  console.log(`  Strategic Spend: $${strategicSpend.toFixed(1)}M (Consumer: $${allocation.consumerGrowth}M, Enterprise: $${allocation.enterpriseSales}M, AI: $${allocation.aiProduct}M, People: $${allocation.instructorPeople}M, Credential: $${allocation.universityCredential}M, Cash retained: $${allocation.cash}M)`);
  console.log(`  Cash Change: $${(q1OpProfit - strategicSpend).toFixed(1)}M`);
  console.log(`  Closing Cash: $${q1ClosingCash.toFixed(1)}M`);

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
    // DIAGNOSTIC: Cash ledger details (Q1)
    __diagnostic__cashLedger: {
      openingCash: currentState.cash,
      revenue: q1Revenue,
      operatingCost: currentState.operatingCost,
      operatingProfit: q1OpProfit,
      strategicSpend: strategicSpend,
      financing: 0,
      otherAdjustment: 0,
      closingCash: q1ClosingCash,
    },
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

  // DIAGNOSTIC: Log roleVotes input
  console.log(`  [calculateExecutionAlignment] roleVotes type: ${typeof roleVotes}, value: ${JSON.stringify(roleVotes)}`);

  // Count unanimous agreement
  const totalVotes = Object.entries(roleVotes).filter(([_, v]) => v !== 'abstain').length;
  const yesVotes = Object.entries(roleVotes).filter(([_, v]) => v === 'yes').length;

  console.log(`  [calculateExecutionAlignment] totalVotes: ${totalVotes}, yesVotes: ${yesVotes}`);

  if (yesVotes === totalVotes && totalVotes === 5) {
    score += 15; // Unanimous
    console.log(`  [calculateExecutionAlignment] unanimous → +15`);
  } else if (yesVotes >= 4) {
    score += 8; // Broad alignment
    console.log(`  [calculateExecutionAlignment] broad alignment → +8`);
  } else if (yesVotes >= 3) {
    score += 3; // Debate but some agreement
    console.log(`  [calculateExecutionAlignment] some agreement → +3`);
  }

  // Override penalty (but not if all agree with override)
  if (override && dissents.length > 0) {
    score -= 5;
    console.log(`  [calculateExecutionAlignment] override with dissent → −5`);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  console.log(`  [calculateExecutionAlignment] final score: ${finalScore}`);
  return finalScore;
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
    // DIAGNOSTIC: Cash ledger details (Q2)
    __diagnostic__cashLedger: {
      openingCash: startingState.cash,
      revenue: newRevenue,
      operatingCost: newOpex,
      operatingProfit: newOperatingProfit,
      strategicSpend: 0, // Q2+ no explicit strategic spend allocation
      financing: 0,
      otherAdjustment: 0,
      closingCash: newCash,
    },
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
      return calculateQ3Consequence(allocation, roleVotes, ceoOverride, dissentingRoles, startingState);
    case 4:
      // Q4 requires destination choice from GameContext; handled separately in GameScreen
      return calculateQ4Consequence(allocation, roleVotes, ceoOverride, dissentingRoles, startingState);
    case 5:
      return calculateQ5Consequence(allocation, roleVotes, ceoOverride, dissentingRoles, startingState);
    case 6:
      return calculateQ6Consequence(allocation, roleVotes, ceoOverride, dissentingRoles, startingState);
    case 7:
      return calculateQ7Consequence(allocation, roleVotes, ceoOverride, dissentingRoles, startingState);
    case 8:
      return calculateQ8Consequence(allocation, roleVotes, ceoOverride, dissentingRoles, startingState);
    default:
      return null;
  }
}

// ============ Q3-Q8 CONSEQUENCE ENGINES ============

export function calculateQ3Consequence(
  allocation: Allocation,
  _roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  _ceoOverride: boolean,
  _dissentingRoles: string[],
  startingState: TeamState
): Consequence {
  /**
   * Q3: Market Consolidation
   * Market is consolidating. Weak competitors fade.
   * Q1-Q2 allocation determines capability access and market response.
   */

  const consumerSegmentShare = 0.40;
  const enterpriseSegmentShare = 0.50;
  const aiNativeSegmentShare = 0.10;

  const consumerBaseline = -0.08;
  const enterpriseBaseline = 0.06;
  const aiNativeBaseline = 0.25;

  const consumerCapabilityBonus = Math.max(0, (startingState.capabilities.consumer - 30) * 0.003);
  const enterpriseCapabilityBonus = Math.max(0, (startingState.capabilities.enterprise - 25) * 0.004);
  const aiCapabilityBonus = startingState.capabilities.ai >= 30 ? 0.15 : -0.15;

  const allocationVariance = Math.abs(allocation.consumerGrowth - 5) + Math.abs(allocation.enterpriseSales - 5) + Math.abs(allocation.aiProduct - 5);
  const focusBonus = allocationVariance < 15 ? 0.02 : -0.02;

  const consumerRevenue = startingState.revenue * consumerSegmentShare;
  const enterpriseRevenue = startingState.revenue * enterpriseSegmentShare;
  const aiNativeRevenue = startingState.revenue * aiNativeSegmentShare;

  const newConsumerRevenue = consumerRevenue * (1 + consumerBaseline + consumerCapabilityBonus + focusBonus);
  const newEnterpriseRevenue = enterpriseRevenue * (1 + enterpriseBaseline + enterpriseCapabilityBonus + focusBonus);
  const newAiNativeRevenue = aiNativeRevenue * (1 + aiNativeBaseline + aiCapabilityBonus + focusBonus);

  const newRevenue = newConsumerRevenue + newEnterpriseRevenue + newAiNativeRevenue;
  const revenueChange = newRevenue - startingState.revenue;

  const aiSpecificOpex = allocation.aiProduct > 0 ? allocation.aiProduct * 0.4 : 0;
  const revenueVariableOpex = newRevenue * 0.02;
  const newOpex = startingState.operatingCost + aiSpecificOpex + revenueVariableOpex;
  const newOperatingProfit = newRevenue - newOpex;
  const cashChange = newOperatingProfit - startingState.operatingProfit;

  const newCapabilities: Capabilities = { ...startingState.capabilities };
  newCapabilities.consumer = Math.max(25, startingState.capabilities.consumer - 3 + (allocation.consumerGrowth > 0 ? allocation.consumerGrowth * 0.3 : -5));
  newCapabilities.enterprise = startingState.capabilities.enterprise + 4 + (allocation.enterpriseSales * 0.4);
  if (startingState.capabilities.ai >= 20) {
    newCapabilities.ai = startingState.capabilities.ai + 6 + (allocation.aiProduct * 0.5);
  } else {
    newCapabilities.ai = startingState.capabilities.ai + 2;
  }
  newCapabilities.ai = Math.min(100, newCapabilities.ai);
  newCapabilities.consumer = Math.min(100, newCapabilities.consumer);
  newCapabilities.enterprise = Math.min(100, newCapabilities.enterprise);

  const stockMultiplier = allocationVariance < 15 ? 1.08 : 0.97;
  const cashMultiplier = newRevenue + cashChange < 15 ? 0.95 : 1.0;
  const cultureMultiplier = startingState.culture < 60 ? 0.95 : 1.0;
  const stockPriceChange = startingState.stockPrice * (stockMultiplier * cashMultiplier * cultureMultiplier - 1);

  const thresholdsCrossed: string[] = [];
  if (startingState.capabilities.consumer < 30) {
    thresholdsCrossed.push('⚠️ Consumer capability slipping. Market shift accelerating.');
  }
  if (startingState.capabilities.enterprise >= 50) {
    thresholdsCrossed.push('✓ Enterprise capability solid. Q4 option viable.');
  }
  if (startingState.capabilities.ai >= 35) {
    thresholdsCrossed.push('✓ AI leadership emerging. Q4 pure-play AI is option.');
  }
  if (newRevenue + cashChange < 15) {
    thresholdsCrossed.push('🚨 Cash runway critical. Q4 destination must be profitable-path.');
  }
  if (startingState.culture < 60) {
    thresholdsCrossed.push('⚠️ Team stress from uncertainty. Q4 clarity needed.');
  }

  const narrative = `Q3: Market Consolidation

Your Q1-Q2 choices determine capability access and market response.

${newConsumerRevenue > consumerRevenue * 0.95 ? '• Consumer: Holding share (quality moat working)' : '• Consumer: Pressure mounting (no moat)'}
${newEnterpriseRevenue > enterpriseRevenue * 1.06 ? '• Enterprise: Strong tailwind (opportunity captured)' : '• Enterprise: Under-exploited'}
${startingState.capabilities.ai >= 30 ? '• AI-native: Market access granted' : '• AI-native: Market locked out (need >= 30 capability)'}

${allocationVariance < 15 ? '✓ Allocation focused.' : '⚠️ Allocation scattered.'}
${newRevenue + cashChange >= 15 ? '✓ Cash runway comfortable.' : '🚨 Cash runway tight.'}

Cash impact: ${cashChange > 0 ? '+$' + cashChange.toFixed(1) + 'M' : '−$' + Math.abs(cashChange).toFixed(1) + 'M'}`;

  const newCash = startingState.cash + cashChange;
  
  return {
    narrative,
    revenueChange,
    cashChange,
    stockPriceChange,
    capabilityChanges: {
      consumer: newCapabilities.consumer - startingState.capabilities.consumer,
      enterprise: newCapabilities.enterprise - startingState.capabilities.enterprise,
      ai: newCapabilities.ai - startingState.capabilities.ai,
    },
    thresholdsCrossed,
    // DIAGNOSTIC: Cash ledger details (Q3)
    __diagnostic__cashLedger: {
      openingCash: startingState.cash,
      revenue: newRevenue,
      operatingCost: newOpex,
      operatingProfit: newOperatingProfit,
      strategicSpend: 0, // Q2+ no explicit strategic spend allocation
      financing: 0,
      otherAdjustment: 0,
      closingCash: newCash,
    },
  };
}

export function calculateQ4Consequence(
  _allocation: Allocation,
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  ceoOverride: boolean,
  _dissentingRoles: string[],
  startingState: TeamState
): Consequence {
  /**
   * Q4: Destination Locked
   * Teams explicitly choose destination (consumer/enterprise/ai_native/balanced).
   * Q1-Q3 capabilities determine readiness to execute.
   * Path dependency: Readiness penalty if unprepared.
   */

  // For now, calculate generic Q4 consequence without destination (will be enhanced with destination context in GameScreen)
  const unifiedVotes = roleVotes && Object.values(roleVotes).filter(v => v === 'yes').length >= 4;
  const baseStock = 1.0;
  const clarityBonus = 0.08;
  const alignmentBonus = unifiedVotes ? 0.04 : (ceoOverride ? -0.05 : -0.02);
  
  const stockMultiplier = baseStock + clarityBonus + alignmentBonus;
  const stockPriceChange = startingState.stockPrice * (stockMultiplier - 1);

  let cultureChange = 0;
  if (unifiedVotes) {
    cultureChange = 3;
  } else if (ceoOverride) {
    cultureChange = -6;
  } else {
    cultureChange = -2;
  }

  const narrative = `Q4: Strategic Destination Locked

Your Q1-Q3 choices have set the table. Q4 is your destination choice point.

${unifiedVotes ? '✓ Team unified on direction.' : ceoOverride ? '⚠️ CEO overrode dissent.' : '⚠️ Team divided.'}

This choice is irreversible. Q5-Q8 will test your execution.`;

  return {
    narrative,
    revenueChange: 0,
    cashChange: 0,
    stockPriceChange,
    capabilityChanges: {},
    thresholdsCrossed: [],
    cultureChange,
  };
}

export function calculateQ5Consequence(
  allocation: Allocation,
  _roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  _ceoOverride: boolean,
  _dissentingRoles: string[],
  startingState: TeamState
): Consequence {
  /**
   * Q5: Market Validation
   * Q4 destination choice is tested in market.
   */

  let baselineGrowth = 0.02;
  let thresholdsCrossed: string[] = [];

  if (startingState.capabilities.enterprise >= 50) {
    baselineGrowth = 0.08;
    thresholdsCrossed.push('✓ Enterprise foundation enabling growth.');
  } else if (startingState.capabilities.ai >= 45) {
    baselineGrowth = 0.12;
    thresholdsCrossed.push('✓ AI differentiation visible. Strong traction.');
  } else if (startingState.capabilities.consumer >= 60) {
    baselineGrowth = 0.02;
    thresholdsCrossed.push('✓ Consumer quality moat holding.');
  } else {
    baselineGrowth = -0.02;
    thresholdsCrossed.push('⚠️ Market validation weak. Strategy questioned.');
  }

  const revenueChange = startingState.revenue * baselineGrowth;
  const newRevenue = startingState.revenue + revenueChange;

  const aiSpecificOpex = allocation.aiProduct * 0.4;
  const revenueVariableOpex = newRevenue * 0.02;
  const newOpex = startingState.operatingCost + aiSpecificOpex + revenueVariableOpex;
  const newOperatingProfit = newRevenue - newOpex;
  const cashChange = newOperatingProfit - startingState.operatingProfit;

  const validationBonus = baselineGrowth > 0 ? 1.06 : 0.95;
  const stockPriceChange = startingState.stockPrice * (validationBonus - 1);

  const narrative = `Q5: Market Validation

Your Q4 destination choice meets market test.

Revenue impact: ${revenueChange > 0 ? '+$' + revenueChange.toFixed(1) + 'M' : '−$' + Math.abs(revenueChange).toFixed(1) + 'M'}

${thresholdsCrossed.join('\n')}`;

  const newCash = startingState.cash + cashChange;
  
  return {
    narrative,
    revenueChange,
    cashChange,
    stockPriceChange,
    capabilityChanges: {},
    thresholdsCrossed,
    // DIAGNOSTIC: Cash ledger details (Q5)
    __diagnostic__cashLedger: {
      openingCash: startingState.cash,
      revenue: newRevenue,
      operatingCost: newOpex,
      operatingProfit: newOperatingProfit,
      strategicSpend: 0,
      financing: 0,
      otherAdjustment: 0,
      closingCash: newCash,
    },
  };
}

export function calculateQ6Consequence(
  allocation: Allocation,
  _roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  _ceoOverride: boolean,
  _dissentingRoles: string[],
  startingState: TeamState
): Consequence {
  /**
   * Q6: Competitive Attack
   * Market competitors respond. Moats matter.
   */

  let competitiveAttack = -0.06;
  let moatDefense = 0;
  let thresholdsCrossed: string[] = [];

  if (startingState.capabilities.enterprise >= 65) {
    moatDefense = 0.04;
    thresholdsCrossed.push('✓ Enterprise integration deep. Defending position.');
  } else if (startingState.capabilities.ai >= 65) {
    moatDefense = 0.05;
    thresholdsCrossed.push('✓ AI leadership clear. Innovating faster than competitors.');
  } else if (startingState.capabilities.consumer >= 75) {
    moatDefense = 0.04;
    thresholdsCrossed.push('✓ Consumer quality moat strong.');
  } else {
    moatDefense = -0.04;
    thresholdsCrossed.push('🚨 No defensible moat. Losing share to competitors.');
  }

  const netEffect = competitiveAttack + moatDefense;
  const revenueChange = startingState.revenue * netEffect;
  const newRevenue = startingState.revenue + revenueChange;

  const newOpex = startingState.operatingCost + (allocation.aiProduct * 0.4) + (newRevenue * 0.02);
  const newOperatingProfit = newRevenue - newOpex;
  const cashChange = newOperatingProfit - startingState.operatingProfit;

  const moatBonus = moatDefense > 0 ? 1.05 : 0.90;
  const stockPriceChange = startingState.stockPrice * (moatBonus - 1);

  const narrative = `Q6: Competitive Attack

Competitors respond to your Q4 destination choice.

${moatDefense > 0 ? 'Strong moat. Competitors cannot replicate your position.' : 'Vulnerable to competitive attack.'}

Revenue impact: ${revenueChange < 0 ? '−$' + Math.abs(revenueChange).toFixed(1) + 'M' : '+$' + revenueChange.toFixed(1) + 'M'}

${thresholdsCrossed.join('\n')}`;

  const newCash = startingState.cash + cashChange;
  
  return {
    narrative,
    revenueChange,
    cashChange,
    stockPriceChange,
    capabilityChanges: {},
    thresholdsCrossed,
    // DIAGNOSTIC: Cash ledger details (Q6)
    __diagnostic__cashLedger: {
      openingCash: startingState.cash,
      revenue: newRevenue,
      operatingCost: newOpex,
      operatingProfit: newOperatingProfit,
      strategicSpend: 0,
      financing: 0,
      otherAdjustment: 0,
      closingCash: newCash,
    },
  };
}

export function calculateQ7Consequence(
  allocation: Allocation,
  _roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  _ceoOverride: boolean,
  _dissentingRoles: string[],
  startingState: TeamState
): Consequence {
  /**
   * Q7: Organizational Execution Stress
   * Scaling tests organization. Talent and culture matter.
   */

  let scalingTarget = 0.05;

  if (startingState.capabilities.enterprise >= 50) {
    scalingTarget = 0.08;
  } else if (startingState.capabilities.ai >= 50) {
    scalingTarget = 0.10;
  }

  let talentConstraint = 1.0;
  if (startingState.capabilities.talent < 50) {
    talentConstraint = 0.5;
  }

  let cultureStress = 0;
  if (startingState.culture >= 70) {
    cultureStress = 0;
  } else if (startingState.culture < 55) {
    cultureStress = -4;
  } else {
    cultureStress = -2;
  }

  const actualScaling = scalingTarget * talentConstraint;
  const revenueChange = startingState.revenue * actualScaling;
  const newRevenue = startingState.revenue + revenueChange;

  const newOpex = startingState.operatingCost + (allocation.aiProduct * 0.4) + (newRevenue * 0.02);
  const newOperatingProfit = newRevenue - newOpex;
  const cashChange = newOperatingProfit - startingState.operatingCost;

  const talentBonus = startingState.capabilities.talent >= 65 ? 1.0 : 0.95;
  const cultureBonus = startingState.culture >= 70 ? 1.0 : 0.92;
  const stockMultiplier = talentBonus * cultureBonus;
  const stockPriceChange = startingState.stockPrice * (stockMultiplier - 1);

  const thresholdsCrossed: string[] = [];
  if (startingState.capabilities.talent < 50) {
    thresholdsCrossed.push('🚨 Talent shortage. Scaling bottleneck.');
  }
  if (cultureStress < 0) {
    thresholdsCrossed.push('⚠️ Team stress during scaling.');
  }
  if (newRevenue + cashChange < 10) {
    thresholdsCrossed.push('🚨 Cash runway critical. Q8 must be profitable.');
  }

  const narrative = `Q7: Organizational Execution Stress

Scaling the strategy reveals organizational capacity limits.

Your team's capacity: ${startingState.capabilities.talent >= 65 ? 'Strong' : 'Constrained'}
Your culture resilience: ${startingState.culture >= 70 ? 'High' : 'Weak'}

Revenue scaling: ${actualScaling > 0 ? '+' + (actualScaling * 100).toFixed(1) + '%' : '0%'}

${thresholdsCrossed.join('\n')}`;

  const newCash = startingState.cash + cashChange;
  
  return {
    narrative,
    revenueChange,
    cashChange,
    stockPriceChange,
    capabilityChanges: {},
    thresholdsCrossed,
    cultureChange: cultureStress,
    // DIAGNOSTIC: Cash ledger details (Q7)
    __diagnostic__cashLedger: {
      openingCash: startingState.cash,
      revenue: newRevenue,
      operatingCost: newOpex,
      operatingProfit: newOperatingProfit,
      strategicSpend: 0,
      financing: 0,
      otherAdjustment: 0,
      closingCash: newCash,
    },
  };
}

export function calculateQ8Consequence(
  _allocation: Allocation,
  _roleVotes: Record<string, 'yes' | 'no' | 'abstain'> | null,
  _ceoOverride: boolean,
  _dissentingRoles: string[],
  startingState: TeamState
): Consequence {
  /**
   * Q8: Final Quarter & Terminal Score
   * Multidimensional: Financial + Strategic + Organizational
   */

  let q8RevenueMultiplier = 1.35;

  if (startingState.capabilities.enterprise >= 60) {
    q8RevenueMultiplier = 1.50;
  } else if (startingState.capabilities.ai >= 60) {
    q8RevenueMultiplier = 1.65;
  } else if (startingState.capabilities.consumer >= 70) {
    q8RevenueMultiplier = 1.35;
  }

  const q8Revenue = startingState.revenue * q8RevenueMultiplier;
  const revenueChange = q8Revenue - startingState.revenue;

  let ebitdaMargin = 0.38;
  if (startingState.capabilities.enterprise >= 60) {
    ebitdaMargin = 0.50;
  } else if (startingState.capabilities.ai >= 60) {
    ebitdaMargin = 0.42;
  }

  const q8EBITDA = q8Revenue * ebitdaMargin;
  const cashChange = q8EBITDA - startingState.operatingCost;
  const q8Cash = startingState.cash + cashChange;

  // DIAGNOSTIC LOGGING: Q8 TERMINAL INPUTS
  console.log(`\n=== Q8 TERMINAL SCORE DIAGNOSTIC ===`);
  console.log(`INPUTS:`);
  console.log(`  Revenue: $${q8Revenue.toFixed(1)}M (multiplier: ${q8RevenueMultiplier.toFixed(2)}x)`);
  console.log(`  Operating Cost: $${startingState.operatingCost}M`);
  console.log(`  EBITDA Margin: ${(ebitdaMargin * 100).toFixed(1)}%`);
  console.log(`  EBITDA: $${q8EBITDA.toFixed(1)}M`);
  console.log(`  Starting Cash: $${startingState.cash.toFixed(1)}M`);
  console.log(`  Cash Change: $${cashChange.toFixed(1)}M`);
  console.log(`  Q8 Cash: $${q8Cash.toFixed(1)}M`);
  console.log(`CAPABILITIES AT Q8:`);
  console.log(`  Consumer: ${startingState.capabilities.consumer}`);
  console.log(`  Enterprise: ${startingState.capabilities.enterprise}`);
  console.log(`  AI: ${startingState.capabilities.ai}`);
  console.log(`  Talent: ${startingState.capabilities.talent}`);
  console.log(`CULTURAL STATE:`);
  console.log(`  Culture: ${startingState.culture}`);
  console.log(`  Trust: ${startingState.trust}`);

  // TERMINAL SCORE (0-100)
  let terminalScore = 0;

  // Financial (0-33)
  let financialScore = 0;
  const revenuePct = q8RevenueMultiplier;
  let revenuePtsComponent = 0;
  if (revenuePct >= 1.5) { financialScore += 11; revenuePtsComponent = 11; }
  else if (revenuePct >= 1.35) { financialScore += 8; revenuePtsComponent = 8; }
  else { financialScore += 5; revenuePtsComponent = 5; }

  let ebitdaPtsComponent = 0;
  if (ebitdaMargin > 0.45) { financialScore += 11; ebitdaPtsComponent = 11; }
  else if (ebitdaMargin > 0.35) { financialScore += 8; ebitdaPtsComponent = 8; }
  else { financialScore += 5; ebitdaPtsComponent = 5; }

  let cashPtsComponent = 0;
  if (q8Cash > 80) { financialScore += 11; cashPtsComponent = 11; }
  else if (q8Cash > 50) { financialScore += 8; cashPtsComponent = 8; }
  else { financialScore += 3; cashPtsComponent = 3; }

  console.log(`\nFINANCIAL SCORE COMPONENTS:`);
  console.log(`  Revenue (${revenuePct.toFixed(2)}x): +${revenuePtsComponent}`);
  console.log(`  EBITDA Margin (${(ebitdaMargin * 100).toFixed(1)}%): +${ebitdaPtsComponent}`);
  console.log(`  Cash ($${q8Cash.toFixed(1)}M): +${cashPtsComponent}`);
  console.log(`  Financial Subtotal: ${financialScore}/33`);

  // Strategic (0-33)
  let strategicScore = 0;
  let capabilityPts = 0;
  if (startingState.capabilities.enterprise >= 70 || startingState.capabilities.ai >= 70 || startingState.capabilities.consumer >= 75) {
    strategicScore += 11; capabilityPts = 11;
  } else if (startingState.capabilities.enterprise >= 55 || startingState.capabilities.ai >= 55) {
    strategicScore += 7; capabilityPts = 7;
  } else {
    strategicScore += 4; capabilityPts = 4;
  }

  strategicScore += 8; // Coherence bonus (simplified; would check allocation history)

  strategicScore += 10; // Market position (simplified)

  console.log(`\nSTRATEGIC SCORE COMPONENTS:`);
  console.log(`  Capability strength (E${startingState.capabilities.enterprise}, A${startingState.capabilities.ai}, C${startingState.capabilities.consumer}): +${capabilityPts}`);
  console.log(`  Coherence bonus: +8`);
  console.log(`  Market position: +10`);
  console.log(`  Strategic Subtotal: ${strategicScore}/33`);

  // Organizational (0-34)
  let orgScore = 0;
  let culturePts = 0;
  if (startingState.culture >= 75) { orgScore += 11; culturePts = 11; }
  else if (startingState.culture >= 60) { orgScore += 7; culturePts = 7; }
  else { orgScore += 4; culturePts = 4; }

  let talentPts = 0;
  if (startingState.capabilities.talent >= 70) { orgScore += 11; talentPts = 11; }
  else if (startingState.capabilities.talent >= 55) { orgScore += 7; talentPts = 7; }
  else { orgScore += 4; talentPts = 4; }

  orgScore += 10; // Execution alignment (simplified)

  console.log(`\nORGANIZATIONAL SCORE COMPONENTS:`);
  console.log(`  Culture (${startingState.culture}): +${culturePts}`);
  console.log(`  Talent (${startingState.capabilities.talent}): +${talentPts}`);
  console.log(`  Execution alignment: +10`);
  console.log(`  Organizational Subtotal: ${orgScore}/34`);

  terminalScore = Math.min(100, financialScore + strategicScore + orgScore);
  
  console.log(`\nFINAL SCORE:`);
  console.log(`  Financial: ${financialScore}/33`);
  console.log(`  Strategic: ${strategicScore}/33`);
  console.log(`  Organizational: ${orgScore}/34`);
  console.log(`  Sum before clamp: ${financialScore + strategicScore + orgScore}`);
  console.log(`  Final (capped at 100): ${terminalScore.toFixed(1)}`);
  console.log(`=== END DIAGNOSTIC ===\n`);

  let verdict: 'WINNER' | 'SURVIVOR' | 'STRUGGLING' | 'FAILURE' = 'FAILURE';
  if (terminalScore >= 80) verdict = 'WINNER';
  else if (terminalScore >= 60) verdict = 'SURVIVOR';
  else if (terminalScore >= 40) verdict = 'STRUGGLING';

  const narrative = `Q8: Terminal Outcome

Your eight-quarter journey complete.

FINANCIAL:
Revenue: $${Math.round(q8Revenue)}M (${((q8RevenueMultiplier - 1) * 100).toFixed(0)}% growth)
EBITDA: $${Math.round(q8EBITDA)}M (${(ebitdaMargin * 100).toFixed(0)}% margin)
Cash: $${Math.round(q8Cash)}M

TERMINAL SCORE: ${Math.round(terminalScore)}/100 - ${verdict}

Your strategic choices in Q1-Q3 determined your Q4 options. Q4 destination locked your path. Q5-Q8 execution determined your outcome.

${terminalVerdictNarrative(terminalScore)}`;

  return {
    narrative,
    revenueChange,
    cashChange,
    stockPriceChange: 0,
    capabilityChanges: {},
    thresholdsCrossed: [
      `Terminal Score: ${Math.round(terminalScore)}/100`,
      `Financial: ${financialScore}/33 | Strategic: ${strategicScore}/33 | Organizational: ${orgScore}/34`,
      verdict,
    ],
    // AUTHORITATIVE Q8 TERMINAL STATE (single source of truth)
    terminalResult: {
      revenue: q8Revenue,
      cash: q8Cash,
      stockPrice: startingState.stockPrice, // Q8 doesn't change stock price
      ebitda: q8EBITDA,
      ebitdaMargin,
      financialScore: Math.round(financialScore),
      strategicScore: Math.round(strategicScore),
      organizationalScore: Math.round(orgScore),
      totalScore: Math.round(terminalScore),
      verdict,
      // DIAGNOSTIC: Financial score component breakdown
      __diagnostic__financialComponents: {
        revenueComponent: revenuePtsComponent,
        ebitdaComponent: ebitdaPtsComponent,
        cashComponent: cashPtsComponent,
        otherComponent: 0,
        rawSubtotal: revenuePtsComponent + ebitdaPtsComponent + cashPtsComponent,
        finalFinancialScore: financialScore,
      },
    },
  };
}

function terminalVerdictNarrative(score: number): string {
  if (score >= 80) {
    return 'Congratulations. You are the market leader. Your financial returns justify the bet. Your team is engaged. Your company is sustainable and growable.';
  } else if (score >= 60) {
    return 'You survived. Your position is defensible but not dominant. Your organization held together. You are a valuable acquisition target or sustainable niche player.';
  } else if (score >= 40) {
    return 'You are struggling. Strategy had flaws or execution failed. Fundamental restructuring required. Acquisition or merger likely.';
  } else {
    return 'Your strategy failed. Financial crisis. Organization broken. Bankruptcy or acquisition imminent.';
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
