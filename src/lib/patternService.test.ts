import { describe, it, expect } from 'vitest';
import { detectLocalAnomalies } from './patternService';

describe('Pattern Service - Local Anomaly Detection', () => {
  it('returns an empty array if there are fewer than 5 historical assessments', () => {
    const assessments = [
      { childId: 'c1', timestamp: '2026-09-10', scores: { mood: 2, stress: 2, sleep: 2, energy: 2, social: 2, behavior: 2 } },
      { childId: 'c1', timestamp: '2026-09-09', scores: { mood: 2, stress: 2, sleep: 2, energy: 2, social: 2, behavior: 2 } }
    ];

    expect(detectLocalAnomalies(assessments)).toEqual([]);
  });

  it('detects a statistically significant anomaly in mood deviation', () => {
    const assessments = [
      // Latest entry has extreme spike in stress and drop in mood
      { childId: 'c1', timestamp: '2026-09-15', scores: { mood: 5, stress: 5, sleep: 2, energy: 2, social: 2, behavior: 2 } },
      // Previous 5 baseline entries were all stable at 1
      { childId: 'c1', timestamp: '2026-09-14', scores: { mood: 1, stress: 1, sleep: 2, energy: 2, social: 2, behavior: 2 } },
      { childId: 'c1', timestamp: '2026-09-13', scores: { mood: 1, stress: 1, sleep: 2, energy: 2, social: 2, behavior: 2 } },
      { childId: 'c1', timestamp: '2026-09-12', scores: { mood: 1, stress: 1, sleep: 2, energy: 2, social: 2, behavior: 2 } },
      { childId: 'c1', timestamp: '2026-09-11', scores: { mood: 1, stress: 1, sleep: 2, energy: 2, social: 2, behavior: 2 } },
      { childId: 'c1', timestamp: '2026-09-10', scores: { mood: 1, stress: 1, sleep: 2, energy: 2, social: 2, behavior: 2 } }
    ];

    const anomalies = detectLocalAnomalies(assessments);
    expect(anomalies.length).toBeGreaterThan(0);
    const moodAnomaly = anomalies.find(a => a.metric === 'mood');
    expect(moodAnomaly).toBeDefined();
    expect(moodAnomaly?.severity).toMatch(/medium|high/);
  });
});
