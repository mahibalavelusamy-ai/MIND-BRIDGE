import { GoogleGenAI, Type } from "@google/genai";
import { Recommendation, Child } from '../types';
import { safeJsonParse } from './aiUtils';
import { analyzeTextRisk } from './scoring';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Personalized Recommendation Engine
 * Generates context-aware suggestions for parents and children.
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['activity', 'resource', 'strategy'] },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                  context: { type: Type.STRING },
                  actionLabel: { type: Type.STRING },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['type', 'title', 'description', 'priority', 'context', 'actionLabel', 'steps']
              }
            }
          },
          required: ['recommendations']
        }
      }
    });

    const rawText = (response as any).text;
    const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
    const result = safeJsonParse(textStr, { recommendations: [] });

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
    return [];
  }
}
