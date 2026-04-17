import { GoogleGenAI, Type } from "@google/genai";
import { Recommendation, Child } from '../types';
import { safeJsonParse } from './aiUtils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Personalized Recommendation Engine
 * Generates context-aware suggestions for parents and children.
 */
export async function generateRecommendations(
  child: Child,
  assessments: any[],
  schedule: any[]
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

  try {
    const latest = assessments[0];
    const prompt = `
      You are a child mental health coach. Generate 3 personalized, actionable recommendations for ${child.name} (Age: ${child.age}).
      
      CURRENT STATE:
      - Latest Scores (1-5, 5 is worst): ${JSON.stringify(latest.scores)}
      - School Schedule: ${JSON.stringify(schedule)}
      
      RECOMMENDATION RULES:
      1. CONTEXT-AWARE: If an exam is coming up, suggest a study-break or relaxation technique.
      2. DATA-DRIVEN: If sleep is poor, suggest a "Wind-down Routine".
      3. ADAPTIVE: If mood is improving, suggest a "Celebration Activity" to reinforce positive behavior.
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
                  actionLabel: { type: Type.STRING }
                },
                required: ['type', 'title', 'description', 'priority', 'context', 'actionLabel']
              }
            }
          },
          required: ['recommendations']
        }
      }
    });

    const result = safeJsonParse(response.text || "{}", { recommendations: [] });

    return (result.recommendations || []).map((r: any, i: number) => ({
      id: `rec-${Date.now()}-${i}`,
      childId: child.id,
      timestamp: new Date().toISOString(),
      ...r
    }));

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
