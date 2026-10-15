import { describe, it, expect } from 'vitest';
import { WeeklyReportService } from './weeklyReportService';
import { Child } from '../../types';

describe('WeeklyReportService', () => {
  const mockStudent: Child = {
    id: 's1',
    name: 'Aarav Sharma',
    age: 15,
    grade: 'Grade 10',
    avatar: '👦',
    riskLevel: 'low',
    lastCheckIn: 'Today',
    moodScore: 8.5,
    stressLevel: 'Low',
    notes: 'Good week',
    streak: 6,
    creditsEarned: 35
  };

  it('compiles a complete 7-day longitudinal report', () => {
    const report = WeeklyReportService.generateWeeklyReport(mockStudent);

    expect(report.reportId).toBeDefined();
    expect(report.reportId.startsWith('REP-')).toBe(true);
    expect(report.student.name).toBe('Aarav Sharma');
    expect(report.summaryMetrics.averageMood).toBe(8.5);
    expect(report.summaryMetrics.streakDays).toBe(6);
    expect(report.dailyTrajectory.length).toBe(7);
    expect(report.academicCorrelations.length).toBeGreaterThanOrEqual(1);
    expect(report.clinicalObservations.length).toBeGreaterThanOrEqual(1);
    expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
  });

  it('calculates wellbeing score properly bounded between 0 and 100', () => {
    const report = WeeklyReportService.generateWeeklyReport(mockStudent);
    expect(report.summaryMetrics.wellbeingScore).toBeGreaterThanOrEqual(0);
    expect(report.summaryMetrics.wellbeingScore).toBeLessThanOrEqual(100);
  });
});
