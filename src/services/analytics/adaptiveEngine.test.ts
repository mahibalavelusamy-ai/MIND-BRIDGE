import { describe, it, expect } from 'vitest';
import { AdaptiveAssessmentEngine, AdaptiveQuestion } from './adaptiveEngine';

describe('AdaptiveAssessmentEngine', () => {
  describe('initializeSession', () => {
    it('initializes 4 core assessment questions across key categories', () => {
      const sessionQuestions = AdaptiveAssessmentEngine.initializeSession(15);
      expect(sessionQuestions.length).toBe(4);
      const categories = sessionQuestions.map(q => q.category);
      expect(categories).toContain('emotional_wellbeing');
      expect(categories).toContain('academic_stress');
    });
  });

  describe('evaluateFollowUps', () => {
    it('appends a follow-up question when an option with followUpCategory is selected', () => {
      const currentQuestions: AdaptiveQuestion[] = [
        {
          id: 'ew_1',
          category: 'emotional_wellbeing',
          text: 'How have you been feeling overall?',
          options: [
            { label: 'Great', value: 5 },
            { label: 'Exhausted', value: 1, followUpCategory: 'burnout_tendency' }
          ]
        }
      ];

      // Selecting value 1 should trigger follow-up category 'burnout_tendency'
      const followUps = AdaptiveAssessmentEngine.evaluateFollowUps(currentQuestions, { ew_1: 1 });
      expect(followUps.length).toBe(2);
      expect(followUps.some(q => q.category === 'burnout_tendency')).toBe(true);
    });

    it('returns empty array when no follow-ups are needed', () => {
      const currentQuestions: AdaptiveQuestion[] = [
        {
          id: 'ew_1',
          category: 'emotional_wellbeing',
          text: 'How have you been feeling overall?',
          options: [{ label: 'Great', value: 5 }]
        }
      ];

      const followUps = AdaptiveAssessmentEngine.evaluateFollowUps(currentQuestions, { ew_1: 5 });
      expect(followUps).toEqual([]);
    });
  });

  describe('generateAssessmentOutcome', () => {
    it('calculates averageScore, normalized riskLevel, and burnout flag', () => {
      const questions: AdaptiveQuestion[] = [
        { id: 'q1', category: 'emotional_wellbeing', text: 'Q1', options: [] },
        { id: 'q2', category: 'academic_stress', text: 'Q2', options: [] }
      ];

      const outcome = AdaptiveAssessmentEngine.generateAssessmentOutcome(
        { q1: 1, q2: 2 },
        questions
      );

      expect(outcome.averageScore).toBe(1.5);
      expect(outcome.riskLevel).toBe('high');
      expect(outcome.riskScore).toBeGreaterThan(0.7);
      expect(outcome.isBurnoutRisk).toBe(true);
    });
  });
});
