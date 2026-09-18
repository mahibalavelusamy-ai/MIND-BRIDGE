import { describe, it, expect } from 'vitest';
import { calculateAssessmentResult, analyzeTextRisk } from './scoring';

describe('Scoring Utility', () => {
  describe('calculateAssessmentResult', () => {
    it('calculates low risk for healthy category scores', () => {
      const scores = {
        mood: 1,
        stress: 1,
        sleep: 1,
        behavior: 1,
        social: 1
      };

      const result = calculateAssessmentResult(scores);
      expect(result.weightedScore).toBe(1);
      expect(result.riskLevel).toBe('low');
    });

    it('calculates high risk for elevated distress scores', () => {
      const scores = {
        mood: 5,
        stress: 5,
        sleep: 4,
        behavior: 4,
        social: 4
      };

      const result = calculateAssessmentResult(scores);
      expect(result.weightedScore).toBeGreaterThanOrEqual(3.8);
      expect(result.riskLevel).toBe('high');
    });

    it('calculates medium risk for intermediate scores', () => {
      const scores = {
        mood: 3,
        stress: 3,
        sleep: 3,
        behavior: 3,
        social: 3
      };

      const result = calculateAssessmentResult(scores);
      expect(result.weightedScore).toBe(3);
      expect(result.riskLevel).toBe('medium');
    });

    it('increases risk when clinical text keywords are detected in notes', () => {
      const baseScores = {
        mood: 2,
        stress: 2,
        sleep: 2,
        behavior: 2,
        social: 2
      };

      const cleanResult = calculateAssessmentResult(baseScores, "Normal day at school.");
      const urgentResult = calculateAssessmentResult(baseScores, "Feeling exhausted and alone.");

      expect(urgentResult.weightedScore).toBeGreaterThan(cleanResult.weightedScore);
    });
  });

  describe('analyzeTextRisk', () => {
    it('returns 0 for neutral or empty text', () => {
      expect(analyzeTextRisk('')).toBe(0);
      expect(analyzeTextRisk('Normal routine at school.')).toBe(0);
    });

    it('detects moderate distress phrases', () => {
      const score = analyzeTextRisk('Feeling lonely and exhausted today');
      expect(score).toBeGreaterThan(0);
    });

    it('detects high-risk urgency phrases and scores higher', () => {
      const score = analyzeTextRisk('I want to hurt myself');
      expect(score).toBeGreaterThanOrEqual(1.0);
    });
  });
});
