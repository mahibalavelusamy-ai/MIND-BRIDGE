import { describe, it, expect } from 'vitest';
import { TriageService } from './triageService';

describe('TriageService', () => {
  it('creates an intake case in status new', () => {
    const newCase = TriageService.createCase(
      's1',
      'Ananya Sharma',
      'Exam stress clustering detected',
      'high'
    );

    expect(newCase.id).toBeDefined();
    expect(newCase.studentName).toBe('Ananya Sharma');
    expect(newCase.status).toBe('new');
    expect(newCase.severity).toBe('high');
    expect(newCase.notes.length).toBe(1);
  });

  it('transitions status and appends counselor clinical notes', () => {
    const initialCase = TriageService.createCase('s1', 'Ananya Sharma', 'Test cluster', 'medium');
    const updated = TriageService.updateCaseStatus(
      initialCase,
      'in_progress',
      'Completed introductory check-in; recommended 4-7-8 breathing.'
    );

    expect(updated.status).toBe('in_progress');
    expect(updated.notes.length).toBe(2);
    expect(updated.notes[1]).toContain('[IN_PROGRESS]');
    expect(updated.notes[1]).toContain('4-7-8 breathing');
  });

  it('sets a follow-up appointment date on the case', () => {
    const initialCase = TriageService.createCase('s1', 'Ananya Sharma', 'Test cluster');
    const updated = TriageService.setFollowUp(initialCase, '2026-10-20', 'Follow up after math exam');

    expect(updated.followUpDate).toBe('2026-10-20');
    expect(updated.notes.some(n => n.includes('2026-10-20'))).toBe(true);
  });

  it('accurately calculates triage queue metrics', () => {
    const cases = [
      TriageService.createCase('s1', 'Student A', 'Reason 1', 'critical'),
      TriageService.createCase('s2', 'Student B', 'Reason 2', 'medium'),
      TriageService.updateCaseStatus(TriageService.createCase('s3', 'Student C', 'Reason 3'), 'in_progress'),
      TriageService.updateCaseStatus(TriageService.createCase('s4', 'Student D', 'Reason 4'), 'resolved')
    ];

    const metrics = TriageService.calculateMetrics(cases);
    expect(metrics.total).toBe(4);
    expect(metrics.newCount).toBe(2);
    expect(metrics.inProgressCount).toBe(1);
    expect(metrics.resolvedCount).toBe(1);
    expect(metrics.criticalCount).toBe(1);
  });
});
