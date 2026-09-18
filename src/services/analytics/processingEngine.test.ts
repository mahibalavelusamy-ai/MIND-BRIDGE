import { describe, it, expect } from 'vitest';
import { ProcessingEngine } from './processingEngine';

describe('ProcessingEngine', () => {
  describe('calculateTrends', () => {
    it('returns stable trend with 0 volatility for empty or null history', () => {
      expect(ProcessingEngine.calculateTrends([])).toEqual({ trend: 'stable', volatility: 0 });
      expect(ProcessingEngine.calculateTrends(null as any)).toEqual({ trend: 'stable', volatility: 0 });
    });

    it('calculates average mood and identifies positive trend when mood > 4', () => {
      const history = [
        { payload: { moodScore: 5 } },
        { payload: { moodScore: 4.5 } },
        { payload: { moodScore: 4.2 } }
      ];

      const result = ProcessingEngine.calculateTrends(history);
      expect(result.validEntries).toBe(3);
      expect(result.averageMood).toBeCloseTo(4.566, 2);
      expect(result.trend).toBe('positive');
    });

    it('identifies declining trend when average mood < 2.5', () => {
      const history = [
        { payload: { moodScore: 2.0 } },
        { payload: { moodScore: 1.5 } },
        { payload: { moodScore: 2.2 } }
      ];

      const result = ProcessingEngine.calculateTrends(history);
      expect(result.validEntries).toBe(3);
      expect(result.averageMood).toBeCloseTo(1.9, 1);
      expect(result.trend).toBe('declining');
    });

    it('identifies stable trend when average mood is between 2.5 and 4.0', () => {
      const history = [
        { payload: { moodScore: 3.0 } },
        { payload: { moodScore: 3.5 } }
      ];

      const result = ProcessingEngine.calculateTrends(history);
      expect(result.trend).toBe('stable');
    });
  });

  describe('analyzeAcademicOverload', () => {
    it('calculates overload score correctly and flags overloaded state when score > 0.7', () => {
      const plannerHistory = [
        { payload: { overdueTasks: 4, tasksAdded: 5 } } // (4 * 1.5 + 5) / 10 = 11 / 10 -> capped at 1.0
      ];

      const result = ProcessingEngine.analyzeAcademicOverload(plannerHistory);
      expect(result.overloadScore).toBe(1.0);
      expect(result.isOverloaded).toBe(true);
    });

    it('flags not overloaded when assignment density is low', () => {
      const plannerHistory = [
        { payload: { overdueTasks: 1, tasksAdded: 2 } } // (1 * 1.5 + 2) / 10 = 0.35
      ];

      const result = ProcessingEngine.analyzeAcademicOverload(plannerHistory);
      expect(result.overloadScore).toBeCloseTo(0.35, 2);
      expect(result.isOverloaded).toBe(false);
    });
  });
});
