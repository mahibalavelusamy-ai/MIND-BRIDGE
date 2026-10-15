import { describe, it, expect } from 'vitest';
import { RiskScoringEngine } from './riskEngine';

describe('RiskScoringEngine', () => {
  describe('calculateEmotionalRisk', () => {
    it('returns 0.5 default when averageMood is missing', () => {
      expect(RiskScoringEngine.calculateEmotionalRisk({})).toBe(0.5);
    });

    it('calculates 0 risk for optimal mood average of 5 with low volatility', () => {
      const risk = RiskScoringEngine.calculateEmotionalRisk({ averageMood: 5, volatility: 0.1 });
      expect(risk).toBe(0);
    });

    it('calculates maximum 1.0 risk for lowest mood average of 1', () => {
      const risk = RiskScoringEngine.calculateEmotionalRisk({ averageMood: 1, volatility: 0.1 });
      expect(risk).toBe(1.0);
    });

    it('penalizes risk score when emotional volatility exceeds 0.5', () => {
      const stable = RiskScoringEngine.calculateEmotionalRisk({ averageMood: 3, volatility: 0.2 });
      const volatile = RiskScoringEngine.calculateEmotionalRisk({ averageMood: 3, volatility: 0.8 });
      expect(volatile).toBeGreaterThan(stable);
    });
  });

  describe('calculateBurnoutRisk', () => {
    it('falls back to emotional risk if overload data is absent', () => {
      expect(RiskScoringEngine.calculateBurnoutRisk(null, 0.4)).toBe(0.4);
    });

    it('synthesizes weighted score: 60% overload + 40% emotional risk', () => {
      const overloadData = { overloadScore: 0.8 };
      const emotionalRisk = 0.5;
      // 0.8 * 0.6 + 0.5 * 0.4 = 0.48 + 0.20 = 0.68
      const burnout = RiskScoringEngine.calculateBurnoutRisk(overloadData, emotionalRisk);
      expect(burnout).toBeCloseTo(0.68, 2);
    });
  });

  describe('generateRiskProfile', () => {
    it('generates a full bounded risk profile object', () => {
      const profile = RiskScoringEngine.generateRiskProfile({
        trends: { averageMood: 4, volatility: 0.2 },
        overload: { overloadScore: 0.3 },
        activity: { activityDropPercent: 0.15 }
      });

      expect(profile.emotionalRisk).toBeGreaterThanOrEqual(0);
      expect(profile.emotionalRisk).toBeLessThanOrEqual(1);
      expect(profile.overloadRisk).toBe(0.3);
      expect(profile.disengagementRisk).toBe(0.15);
      expect(profile.lastUpdated).toBeDefined();
    });
  });
});
