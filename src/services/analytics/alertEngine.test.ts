import { describe, it, expect } from 'vitest';
import { AlertEngine } from './alertEngine';

describe('AlertEngine', () => {
  it('triggers a high-priority stress_spike alert when emotional risk jumps from <0.5 to >0.8', () => {
    const alerts = AlertEngine.evaluateRiskProfile(
      'student-1',
      { emotionalRisk: 0.85, overloadRisk: 0.2, disengagementRisk: 0.1 },
      { emotionalRisk: 0.4 }
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('stress_spike');
    expect(alerts[0].level).toBe('high');
    expect(alerts[0].status).toBe('active');
  });

  it('triggers a critical overload alert when overloadRisk exceeds 0.9', () => {
    const alerts = AlertEngine.evaluateRiskProfile(
      'student-1',
      { emotionalRisk: 0.3, overloadRisk: 0.95, disengagementRisk: 0.1 },
      null
    );

    expect(alerts.some(a => a.type === 'overload' && a.level === 'critical')).toBe(true);
  });

  it('triggers a medium engagement_decline alert when disengagementRisk exceeds 0.7', () => {
    const alerts = AlertEngine.evaluateRiskProfile(
      'student-1',
      { emotionalRisk: 0.2, overloadRisk: 0.1, disengagementRisk: 0.75 },
      null
    );

    expect(alerts.some(a => a.type === 'engagement_decline' && a.level === 'medium')).toBe(true);
  });

  it('produces no alerts for stable, baseline student metrics', () => {
    const alerts = AlertEngine.evaluateRiskProfile(
      'student-1',
      { emotionalRisk: 0.3, overloadRisk: 0.2, disengagementRisk: 0.1 },
      { emotionalRisk: 0.3 }
    );

    expect(alerts.length).toBe(0);
  });
});
