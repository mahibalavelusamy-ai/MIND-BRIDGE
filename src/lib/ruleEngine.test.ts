import { describe, it, expect } from 'vitest';
import { generateRuleInsights } from './ruleEngine';
import { CategoryScores } from './scoring';

describe('ruleEngine: generateRuleInsights', () => {
  it('triggers critical insight when both stress and sleep are high (>=4)', () => {
    const scores: CategoryScores = { mood: 3, stress: 4, sleep: 5, behavior: 2, social: 2 };
    const insights = generateRuleInsights(scores, 'medium');

    expect(insights.some(i => i.type === 'critical' && i.message.includes('sleep quality'))).toBe(true);
  });

  it('triggers warning insight when social withdrawal is elevated (social >= 4)', () => {
    const scores: CategoryScores = { mood: 3, stress: 2, sleep: 2, behavior: 2, social: 4 };
    const insights = generateRuleInsights(scores, 'low');

    expect(insights.some(i => i.type === 'warning' && i.message.includes('social withdrawal'))).toBe(true);
  });

  it('triggers success insight when mood and stress are low (<=2) with low risk', () => {
    const scores: CategoryScores = { mood: 1, stress: 2, sleep: 2, behavior: 1, social: 1 };
    const insights = generateRuleInsights(scores, 'low');

    expect(insights.some(i => i.type === 'success' && i.message.includes('emotional stability'))).toBe(true);
  });

  it('triggers behavioral challenge warning when behavior >= 4', () => {
    const scores: CategoryScores = { mood: 3, stress: 3, sleep: 3, behavior: 4, social: 2 };
    const insights = generateRuleInsights(scores, 'medium');

    expect(insights.some(i => i.type === 'warning' && i.message.includes('Behavioral challenges'))).toBe(true);
  });
});
