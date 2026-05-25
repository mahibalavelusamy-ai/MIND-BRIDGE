/**
 * AI Risk Engine
 * Generates normalized risk scores (0.0 to 1.0) based on processed trends.
 * 0.0 = emotionally stable
 * 1.0 = critical concern
 * 
 * IMPORTANT: This system does NOT make medical claims, it only estimates
 * behavioral and emotional concern levels.
 */

export const RiskScoringEngine = {
  calculateEmotionalRisk(trends: any): number {
    // Inverse of mood average (example logic)
    // Average 5 (best) -> 0 risk
    // Average 1 (worst) -> 1.0 risk
    if (trends.averageMood === undefined) return 0.5;
    
    let risk = (5 - trends.averageMood) / 4;
    
    // Add volatility factor (high fluctuations increase risk)
    if (trends.volatility > 0.5) risk += 0.2;
    
    return Math.max(0, Math.min(1, risk)); 
  },
  
  calculateBurnoutRisk(overloadData: any, emotionalRisk: number): number {
    if (!overloadData) return emotionalRisk;
    
    // Burnout is a combination of academic overload and high emotional risk
    const baseRisk = overloadData.overloadScore;
    const combinedRisk = (baseRisk * 0.6) + (emotionalRisk * 0.4);
    
    return Math.max(0, Math.min(1, combinedRisk));
  },
  
  calculateDisengagementProbability(activityData: any): number {
    if (!activityData) return 0;
    
    // If activity has dropped significantly, disengagement risk goes up
    return activityData.activityDropPercent || 0;
  },

  generateRiskProfile(processedData: any) {
    const emotionalRisk = this.calculateEmotionalRisk(processedData.trends);
    const overloadRisk = processedData.overload ? processedData.overload.overloadScore : 0;
    const burnoutRisk = this.calculateBurnoutRisk(processedData.overload, emotionalRisk);
    const disengagementRisk = this.calculateDisengagementProbability(processedData.activity);
    
    return {
      emotionalRisk,
      overloadRisk,
      burnoutRisk,
      disengagementRisk,
      lastUpdated: new Date().toISOString()
    };
  }
};
