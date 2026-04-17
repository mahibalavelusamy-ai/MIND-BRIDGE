import { GoogleGenAI, Type } from "@google/genai";
import { CategoryScores } from './scoring';
import { RootCauseAnalysis, Child } from '../types';
import { safeJsonParse } from './aiUtils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * MindBridge Root-Cause Analysis Engine
 * Correlates multi-factor data to identify drivers of emotional changes.
 */
export async function performRootCauseAnalysis(
  child: Child,
  currentScores: CategoryScores,
  history: any[],
  schedule: any[]
): Promise<Partial<RootCauseAnalysis>> {
  
  // 1. Deterministic Rule Correlation
  const evidence: string[] = [];
  const contributingFactors: string[] = [];
  
  // Check for sleep-mood correlation
  if (currentScores.sleep >= 4 && currentScores.mood >= 3.5) {
    evidence.push("Low sleep score (high distress) coincides with lower mood.");
    contributingFactors.push("Sleep Deprivation");
  }

  // Check for school schedule correlation
  const upcomingExams = schedule.filter(s => 
    (s.type === 'exam' || s.difficulty === 'high') && 
    ['Monday', 'Tuesday', 'Wednesday'].includes(s.day) // Assuming analysis happens early week
  );
  
  if (upcomingExams.length > 0 && currentScores.stress >= 3.5) {
    evidence.push(`High stress detected alongside ${upcomingExams.length} challenging school events.`);
    contributingFactors.push("Academic Pressure");
  }

  // Check for social shifts
  const prevSocial = history.length > 0 ? history[0].scores.social : 3;
  if (currentScores.social > prevSocial + 1) {
    evidence.push("Significant increase in social withdrawal compared to last assessment.");
    contributingFactors.push("Social Anxiety/Conflict");
  }

  // 2. AI Synthesis for Human-Readable Explanation
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are a child psychology data analyst. Perform a Root-Cause Analysis for this child:
        Child: ${child.name}, Age: ${child.age}
        
        DATA INPUTS:
        - Current Scores (1-5, 5 is worst): ${JSON.stringify(currentScores)}
        - Historical Trend: ${JSON.stringify(history.slice(0, 3))}
        - School Schedule: ${JSON.stringify(schedule)}
        - Rule-Based Evidence: ${JSON.stringify(evidence)}
        
        TASK:
        1. Identify the 'Primary Factor' (e.g., "Academic Stress", "Physical Fatigue", "Social Transition").
        2. Write a human-readable 'Explanation' (2-3 sentences) that connects the dots for the parent.
        3. Assign a 'Confidence' score (0.0 to 1.0).
        
        Format your response as a JSON object. Do not include markdown code blocks.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryFactor: { type: Type.STRING },
            explanation: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ['primaryFactor', 'explanation', 'confidence']
        }
      }
    });

    const aiResult = safeJsonParse(response.text || "{}", { primaryFactor: "General Adjustment", explanation: "", confidence: 0.7 });

    return {
      childId: child.id,
      timestamp: new Date().toISOString(),
      primaryFactor: aiResult.primaryFactor || "General Adjustment",
      contributingFactors,
      evidence,
      explanation: aiResult.explanation || "We are seeing a shift in patterns that suggests multiple overlapping factors.",
      confidence: aiResult.confidence || 0.7
    };

  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || error?.status === 429 || error?.status === 'RESOURCE_EXHAUSTED') {
      console.warn("AI Quota Exceeded for Root Cause Analysis.");
    } else {
      console.error("Root Cause AI Analysis failed:", error);
    }
    return {
      childId: child.id,
      timestamp: new Date().toISOString(),
      primaryFactor: contributingFactors[0] || "General Pattern Shift",
      contributingFactors,
      evidence,
      explanation: "Based on current data, there is a correlation between recent behavioral shifts and external stressors. Monitor closely for further patterns.",
      confidence: 0.5
    };
  }
}
