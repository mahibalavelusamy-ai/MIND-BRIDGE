import { CategoryScores } from './scoring';
import { RootCauseAnalysis, Child } from '../types';
import { safeJsonParse } from './aiUtils';

/**
 * Mind Bridge Root-Cause Analysis Engine
 * Correlates multi-factor data (scores, trend trajectory, academic events) to identify
 * the underlying drivers of emotional and behavioral changes.
 *
 * Analysis Workflow:
 * 1. Deterministic Rule Correlation: Checks sleep-mood coincidence, academic pressure alignment, and social withdrawal shifts.
 * 2. AI Synthesis: Translates rule-based findings and multi-factor context into empathetic, parent-accessible explanations.
 *
 * @param {Child} child - The student profile record containing id, name, and age.
 * @param {CategoryScores} currentScores - Latest assessment scores across core dimensions.
 * @param {any[]} history - Historical assessment records to measure score deltas.
 * @param {any[]} schedule - School schedule to correlate impending exams and deadlines.
 * @returns {Promise<Partial<RootCauseAnalysis>>} Synthesized root cause analysis containing primary factor, contributing factors, evidence points, and human-readable explanation.
 *
 * @sideeffects Dispatches an HTTP POST request to `/api/gemini/root-cause`. Falls back gracefully on quota or network failures.
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
    const prompt = `
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
      `;

    const response = await fetch('/api/gemini/root-cause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const aiResult = await response.json();

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
