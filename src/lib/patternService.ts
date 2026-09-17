import { BehavioralPattern, Anomaly, Child } from '../types';
import { safeJsonParse } from './aiUtils';

/**
 * Behavioral Pattern Detection System
 * Analyzes historical data to find cyclical patterns and statistical anomalies.
 */
export async function detectBehavioralPatterns(
  child: Child,
  assessments: any[]
): Promise<{ patterns: BehavioralPattern[], anomalies: Anomaly[] }> {
  
  if (assessments.length < 3) {
    return { patterns: [], anomalies: [] };
  }

  try {
    const prompt = `
        You are a behavioral data scientist specializing in pediatric mental health.
        Analyze the following assessment history for ${child.name} (Age: ${child.age}):
        
        DATA:
        ${JSON.stringify(assessments.map(a => ({
          date: a.timestamp,
          scores: a.scores,
          total: a.totalScore
        })))}
        
        TASK:
        1. Detect repeating patterns (e.g., "Sunday Night Stress", "Mid-week Energy Dip").
        2. Identify statistical anomalies (e.g., "Unexpected Mood Spike on [Date]").
        3. Analyze long-term trends (e.g., "Gradual improvement in sleep over 4 weeks").
        
        Format your response as a JSON object. Do not include markdown code blocks.
      `;

    const response = await fetch('/api/gemini/pattern', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      patterns: (result.patterns || []).map((p: any, i: number) => ({
        id: `pattern-${i}`,
        childId: child.id,
        ...p
      })),
      anomalies: (result.anomalies || []).map((a: any, i: number) => ({
        id: `anomaly-${i}`,
        childId: child.id,
        ...a
      }))
    };
  } catch (error) {
    console.error("Pattern detection failed:", error);
    return { patterns: [], anomalies: [] };
  }
}

/**
 * Pseudocode for local statistical anomaly detection (fallback)
 */
export function detectLocalAnomalies(assessments: any[]): Anomaly[] {
  if (assessments.length < 5) return [];

  const anomalies: Anomaly[] = [];
  const metrics = ['mood', 'stress', 'sleep', 'energy', 'social', 'behavior'];

  metrics.forEach(metric => {
    const values = assessments.map(a => a.scores[metric]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length);

    const latest = values[0];
    const deviation = Math.abs(latest - mean);

    if (deviation > 2 * stdDev && stdDev > 0) {
      anomalies.push({
        id: `local-${metric}-${Date.now()}`,
        childId: assessments[0].childId,
        timestamp: assessments[0].timestamp,
        metric,
        deviation: Number(deviation.toFixed(2)),
        description: `Significant deviation in ${metric} compared to the 30-day average.`,
        severity: deviation > 3 * stdDev ? 'high' : 'medium'
      });
    }
  });

  return anomalies;
}
