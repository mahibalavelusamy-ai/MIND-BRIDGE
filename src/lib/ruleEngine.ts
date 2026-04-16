/**
 * MindBridge Rule-Based Insight Engine
 * Provides deterministic insights based on specific data patterns.
 */

import { CategoryScores, RiskLevel } from './scoring';

export interface RuleInsight {
  type: 'success' | 'warning' | 'critical' | 'info';
  message: string;
  recommendation: string;
}

export function generateRuleInsights(scores: CategoryScores, riskLevel: RiskLevel): RuleInsight[] {
  const insights: RuleInsight[] = [];

  // Rule: High Stress + Low Sleep
  if (scores.stress >= 4 && scores.sleep >= 4) {
    insights.push({
      type: 'critical',
      message: "High stress is coinciding with poor sleep quality.",
      recommendation: "Prioritize a calming bedtime routine and consider reducing evening screen time."
    });
  }

  // Rule: Social Withdrawal
  if (scores.social >= 4) {
    insights.push({
      type: 'warning',
      message: "Increased social withdrawal detected.",
      recommendation: "Encourage low-pressure social activities or a one-on-one 'special time' with a parent."
    });
  }

  // Rule: Positive Trend (Low scores in distress categories)
  if (scores.mood <= 2 && scores.stress <= 2 && riskLevel === 'low') {
    insights.push({
      type: 'success',
      message: "Excellent emotional stability this week!",
      recommendation: "Keep up the current routines; they seem to be working well for your child."
    });
  }

  // Rule: High Behavior Score
  if (scores.behavior >= 4) {
    insights.push({
      type: 'warning',
      message: "Behavioral challenges are more frequent.",
      recommendation: "Look for environmental triggers and ensure consistent positive reinforcement."
    });
  }

  return insights;
}
