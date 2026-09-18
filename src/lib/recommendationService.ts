import { Recommendation, Child } from '../types';
import { safeJsonParse } from './aiUtils';
import { analyzeTextRisk } from './scoring';

/**
 * Personalized Recommendation Engine
 * Generates actionable, context-aware suggestions tailored for parents, teachers, and students.
 * Combines deterministic clinical safety injections (immediate counselor referral or breathing exercise)
 * with structured AI-generated action plans based on assessment scores, schedule, and focus sessions.
 *
 * @param {Child} child - The student profile record containing id, name, and age.
 * @param {any[]} assessments - Chronological assessments list; returns onboarding recommendation if empty.
 * @param {any[]} schedule - Upcoming academic schedule and examination commitments.
 * @param {any[]} [sessions=[]] - Historical focus/mindfulness sessions logged by the student.
 * @returns {Promise<Recommendation[]>} Array of prioritized recommendations with step-by-step action plans.
 *
 * @sideeffects
 * - Evaluates NLP sentiment risk via `analyzeTextRisk`.
 * - Dispatches HTTP POST request to `/api/gemini/recommend`.
 * - Falls back to deterministic safe interventions if remote API fails or quota is exhausted.
 */
export async function generateRecommendations(
  child: Child,
  assessments: any[],
  schedule: any[],
  sessions: any[] = []
): Promise<Recommendation[]> {
  
  if (assessments.length === 0) {
    return [
      {
        id: 'rec-initial',
        childId: child.id,
        timestamp: new Date().toISOString(),
        type: 'activity',
        title: 'Complete First Check-in',
        description: 'Complete your first weekly assessment to unlock personalized insights.',
        priority: 'high',
        context: 'Onboarding',
        actionLabel: 'Start Check-in'
      }
    ];
  }

  let textNotes = assessments[0]?.notes || '';
  const textRiskScore = analyzeTextRisk(textNotes);

  const injectedRec: Recommendation = { 
     id: textRiskScore > 0.7 ? 'rec-counselor' : 'rec-breathe',
     childId: child.id,
     timestamp: new Date().toISOString(),
     type: textRiskScore > 0.7 ? 'resource' : 'strategy',
     title: textRiskScore > 0.7 ? '[COUNSELOR]' : '[BREATHE]',
     description: textRiskScore > 0.7 
       ? 'Immediate access to the school counselor. Schedule an urgent check-in based on high-risk indicators.'
       : 'A 3-minute guided breathing exercise to stabilize heart rate based on current assessment.',
     priority: textRiskScore > 0.7 ? 'high' : 'low',
     context: textRiskScore > 0.7 ? 'Clinical' : 'Wellness',
     actionLabel: textRiskScore > 0.7 ? 'Request Callback' : 'Start Now'
  };

  try {
    const latest = assessments[0];
    const prompt = `
      You are a child mental health coach. Generate 2 personalized, actionable, and structured action plans for ${child.name} (Age: ${child.age}).
      
      CURRENT STATE:
      - Latest Scores (scale 1-5, higher is higher risk): ${JSON.stringify(latest.scores)}
      - School Schedule: ${JSON.stringify(schedule?.slice(0,5))}
      - Focus Sessions: ${JSON.stringify(sessions?.slice(0,5))}
      
      RECOMMENDATION RULES:
      1. REPLACE GENERIC ADVICE: Generate step-by-step Structured Action Plans.
      2. DATA-DRIVEN: Use the assessment history, sleep trends, focus sessions, and stress trends.
      3. FORMAT: Each recommendation MUST include a "steps" array with 3 actionable, measurable steps.
      (e.g., Step 1: Sleep before 10:30 PM, Step 2: Avoid screens 30 mins prior, Step 3: Track for 7 days)
      4. AGE-APPROPRIATE: Ensure suggestions are suitable for a ${child.age}-year-old.

      Format your response as a JSON object. Do not include markdown code blocks.
    `;

    const response = await fetch('/api/gemini/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    return [
      injectedRec,
      ...(result.recommendations || []).map((r: any, i: number) => ({
        id: `rec-${Date.now()}-${i}`,
        childId: child.id,
        timestamp: new Date().toISOString(),
        ...r
      }))
    ];
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || error?.status === 429 || error?.status === 'RESOURCE_EXHAUSTED') {
      console.warn("AI Quota Exceeded for Recommendations.");
    } else {
      console.error("Recommendation generation failed:", error);
    }
    return [injectedRec];
  }
}
