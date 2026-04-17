import { GoogleGenAI, Type } from "@google/genai";
import { PredictiveRisk } from "../types";
import { safeJsonParse } from "./aiUtils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function predictFutureRisk(
  childId: string,
  historicalAssessments: any[],
  upcomingSchedule: any[]
): Promise<PredictiveRisk | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found. Predictive modeling disabled.");
    return null;
  }

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedRisk: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0-100" },
            predictedTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
            preemptiveActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            evidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Logic points explaining the prediction" }
          },
          required: ['predictedRisk', 'confidence', 'predictedTriggers', 'preemptiveActions', 'evidence']
        }
      }
    });

    const result = safeJsonParse(response.text || "{}", null);
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
