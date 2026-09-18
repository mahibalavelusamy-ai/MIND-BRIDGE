import { PredictiveRisk } from "../types";
import { safeJsonParse } from "./aiUtils";

/**
 * Predictive Mental Health Risk Forecaster
 * Evaluates historical assessment trajectory and upcoming academic calendar events
 * to forecast risk levels (low, medium, high) and identify specific impending triggers
 * over a 7-day horizon.
 *
 * Prediction Rules Applied:
 * 1. Academic Clustering: 2+ high-difficulty events within 48h increases risk tier.
 * 2. Sleep Debt: 3+ consecutive days of poor sleep predicts irritability and low energy.
 * 3. Mood Volatility: >2 point swings in 3 days triggers emotional dysregulation warnings.
 * 4. Positive Buffering: High social engagement and restorative sleep offset academic pressure.
 *
 * @param {string} childId - The unique identifier of the target student.
 * @param {any[]} historicalAssessments - Trailing 7-day assessment records with dimension scores.
 * @param {any[]} upcomingSchedule - Forward-looking 7-day school schedule and examination events.
 * @returns {Promise<PredictiveRisk | null>} Predictive risk assessment object with triggers, preemptive actions, and evidence, or null on failure.
 *
 * @sideeffects Initiates an HTTP POST request to `/api/gemini/predict`. Handles 429 quota exhaustion gracefully.
 */
export async function predictFutureRisk(
  childId: string,
  historicalAssessments: any[],
  upcomingSchedule: any[]
): Promise<PredictiveRisk | null> {
  const prompt = `
    As a child mental health predictive model, analyze the following data to predict risk for the next 7 days.
    
    CHILD DATA:
    - Historical Assessments (Last 7 days): ${JSON.stringify(historicalAssessments)}
    - Upcoming School Schedule (Next 7 days): ${JSON.stringify(upcomingSchedule)}
    
    PREDICTION LOGIC RULES:
    1. ACADEMIC CLUSTERING: If 2+ high-difficulty events (exams/deadlines) occur within 48 hours, increase risk level by 1.
    2. SLEEP DEBT: If sleep scores have been poor (4+) for 3 consecutive days, predict high risk for irritability and low energy.
    3. MOOD VOLATILITY: If mood scores fluctuate by >2 points in 3 days, predict medium risk for emotional dysregulation.
    4. POSITIVE BUFFER: If social engagement is high (1-2) and sleep is good (1-2), maintain low risk even with academic pressure.

    TASK:
    1. Apply the rules above to the provided data.
    2. Predict the risk level (low, medium, high) for the upcoming week.
    3. Identify specific predicted triggers.
    4. Suggest 2-3 preemptive actions for the parent.
    5. Provide "evidence" points explaining which rules were triggered.
    
    Return the analysis in the specified JSON format.
  `;

  try {
    const response = await fetch('/api/gemini/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result) return null;
    
    return {
      childId,
      ...result,
      horizonDays: 7,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || error?.status === 429 || error?.status === 'RESOURCE_EXHAUSTED') {
      console.warn("AI Quota Exceeded for Predictive Modeling.");
    } else {
      console.error("Predictive model error:", error);
    }
    return null;
  }
}
