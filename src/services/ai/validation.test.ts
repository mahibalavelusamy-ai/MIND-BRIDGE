import { describe, it, expect } from 'vitest';
import { validateEmotions, validateRisk } from './validation';

describe('AI Validation Service', () => {
  describe('validateEmotions', () => {
    it('applies defaults to invalid or missing emotional fields', () => {
      const invalidData = {};
      const result = validateEmotions(invalidData);

      expect(result.mood).toBe(3);
      expect(result.stressLevel).toBe('Moderate');
      expect(result.concerns).toEqual([]);
      expect(result.supportiveMessage).toBe('Thank you for sharing your thoughts.');
      expect(result.requiresEscalation).toBe(false);
    });

    it('preserves valid emotional data within acceptable bounds', () => {
      const validData = {
        mood: 4,
        stressLevel: 'High',
        concerns: ['Exam anxiety'],
        supportiveMessage: 'Take a deep breath, you can do this.',
        requiresEscalation: true
      };

      const result = validateEmotions(validData);
      expect(result.mood).toBe(4);
      expect(result.stressLevel).toBe('High');
      expect(result.concerns).toEqual(['Exam anxiety']);
      expect(result.requiresEscalation).toBe(true);
    });

    it('clamps mood score to safe range [1, 5]', () => {
      expect(validateEmotions({ mood: 10 }).mood).toBe(5);
      expect(validateEmotions({ mood: -2 }).mood).toBe(1);
    });
  });

  describe('validateRisk', () => {
    it('accepts valid risk levels', () => {
      expect(validateRisk({ riskLevel: 'low' }).riskLevel).toBe('low');
      expect(validateRisk({ riskLevel: 'medium' }).riskLevel).toBe('medium');
      expect(validateRisk({ riskLevel: 'high' }).riskLevel).toBe('high');
    });

    it('defaults invalid or unknown risk levels to low', () => {
      expect(validateRisk({ riskLevel: 'critical' }).riskLevel).toBe('low');
      expect(validateRisk({ riskLevel: null }).riskLevel).toBe('low');
      expect(validateRisk({}).riskLevel).toBe('low');
    });
  });
});
