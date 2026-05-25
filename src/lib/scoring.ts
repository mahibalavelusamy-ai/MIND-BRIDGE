/**
 * Mind Bridge Scoring System Utility
 * Implements a weighted scoring system for child mental health assessments.
 */

export interface CategoryScores {
  mood: number;     // 1-5
  stress: number;   // 1-5
  sleep: number;    // 1-5
  behavior: number; // 1-5
  social: number;   // 1-5
  [key: string]: number;
}

export const CATEGORY_WEIGHTS = {
  mood: 0.30,
  stress: 0.25,
  sleep: 0.15,
  behavior: 0.15,
  social: 0.15
};

export type RiskLevel = 'low' | 'medium' | 'high';

export interface AssessmentResult {
  weightedScore: number;
  riskLevel: RiskLevel;
  categoryBreakdown: Record<string, number>;
}

/**
 * Calculates the weighted score and risk level based on category scores.
 * @param scores - Object containing scores (1-5) for each category.
 * @returns AssessmentResult object.
 */
export function calculateAssessmentResult(scores: CategoryScores, textNotes?: string): AssessmentResult {
  let weightedScore = 0;
  
  // Calculate weighted sum
  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const score = scores[category as keyof CategoryScores] || 3; // Default to neutral if missing
    weightedScore += score * weight;
  }

  // Apply NLP Sentiment / Weightage Matrix Modifier
  if (textNotes) {
    const modifier = analyzeTextRisk(textNotes);
    weightedScore += modifier;
    // ensure score stays within 1-5 boundary
    weightedScore = Math.max(1, Math.min(5, weightedScore));
  }

  // Round to 2 decimal places
  weightedScore = Math.round(weightedScore * 100) / 100;

  // Determine Risk Level
  let riskLevel: RiskLevel = 'low';
  if (weightedScore >= 3.8) {
    riskLevel = 'high';
  } else if (weightedScore >= 2.6) {
    riskLevel = 'medium';
  }

  return {
    weightedScore,
    riskLevel,
    categoryBreakdown: scores
  };
}

/**
 * Sentiment & Risk Rectification Weightage Matrix
 * Calculates a risk modifier from text (e.g. notes or intake text) based on predefined keyword weightages.
 */
export function analyzeTextRisk(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let riskModifier = 0;
  
  // Direct Self-Harm Keywords: Weight = +1.0
  const severeKeywords = ['self-harm', 'suicide', 'kill', 'die', 'hurt myself', 'end it', 'worthless'];
  // Isolation/Sleep Keywords: Weight = +0.6
  const elevatedKeywords = ['isolate', 'isolation', 'alone', 'lonely', 'sleep', 'insomnia', 'tired', 'exhausted', 'withdrawn'];
  // Positive Growth Keywords: Weight = -0.2
  const positiveKeywords = ['growth', 'better', 'improve', 'happy', 'positive', 'good', 'healing', 'progress', 'calm'];

  if (severeKeywords.some(kw => lower.includes(kw))) riskModifier += 1.0;
  if (elevatedKeywords.some(kw => lower.includes(kw))) riskModifier += 0.6;
  if (positiveKeywords.some(kw => lower.includes(kw))) riskModifier -= 0.2;

  // Cap risk modifier
  return Math.max(-1, Math.min(riskModifier, 2.0));
}

export function generateAlerts(childId: string, scores: CategoryScores, childName: string, textNotes?: string) {
  const alerts = [];
  const timestamp = new Date().toISOString();

  if (textNotes) {
    const lower = textNotes.toLowerCase();
    const severeKeywords = ['self-harm', 'suicide', 'kill', 'die', 'hurt myself', 'end it', 'worthless'];
    const elevatedKeywords = ['isolate', 'isolation', 'alone', 'lonely', 'sleep', 'insomnia', 'tired', 'exhausted', 'withdrawn'];
    
    if (severeKeywords.some(kw => lower.includes(kw))) {
      alerts.push({
        childId,
        type: 'critical' as const,
        title: `CRITICAL ALARM — ${childName}`,
        description: `Severe risk keywords detected in notes. Immediate intervention required.`,
        timestamp,
        status: 'active'
      });
    } else if (elevatedKeywords.some(kw => lower.includes(kw))) {
      alerts.push({
        childId,
        type: 'warning' as const,
        title: `Isolation/Anxiety detected — ${childName}`,
        description: `Elevated risk keywords detected in notes. Consider checking in.`,
        timestamp,
        status: 'active'
      });
    }
  }

  if (scores.stress >= 4) {
    alerts.push({
      childId,
      type: scores.stress === 5 ? 'critical' as const : 'warning' as const,
      title: `High stress detected — ${childName}`,
      description: `Stress score of ${scores.stress}/5 is significantly high. Immediate attention recommended.`,
      timestamp,
      status: 'active'
    });
  }

  if (scores.mood >= 4) {
    alerts.push({
      childId,
      type: scores.mood === 5 ? 'critical' as const : 'warning' as const,
      title: `Low mood detected — ${childName}`,
      description: `Mood distress score is ${scores.mood}/5. Monitor closely for persistent patterns.`,
      timestamp,
      status: 'active'
    });
  }

  if (scores.sleep >= 4) {
    alerts.push({
      childId,
      type: scores.sleep === 5 ? 'warning' as const : 'info' as const,
      title: `Sleep disruption — ${childName}`,
      description: `Poor sleep quality reported (${scores.sleep}/5). This may impact emotional regulation.`,
      timestamp,
      status: 'active'
    });
  }

  return alerts;
}

/**
 * Example Usage:
 * const result = calculateAssessmentResult({
 *   mood: 4,
 *   stress: 5,
 *   sleep: 3,
 *   behavior: 2,
 *   social: 3
 * });
 * console.log(result.riskLevel); // 'medium'
 */
