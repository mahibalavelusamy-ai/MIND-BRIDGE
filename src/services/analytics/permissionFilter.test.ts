import { describe, it, expect } from 'vitest';
import { PermissionFilter } from './permissionFilter';

describe('PermissionFilter', () => {
  const sampleInsights = {
    summary: 'Student is steady.',
    rawCheckins: ['I cried during lunch today'],
    privateNotes: ['Argument with friend'],
    clinicalIndicators: ['Elevated PHQ-9 subscore'],
    homeLifeIndicators: ['Parent arguing'],
    emotionalSpecifics: ['Panic episode at 2pm']
  };

  it('preserves full data for the student viewer', () => {
    const filtered = PermissionFilter.filterInsights(sampleInsights, 'student');
    expect(filtered.rawCheckins).toEqual(['I cried during lunch today']);
    expect(filtered.privateNotes).toBeDefined();
    expect(filtered.summary).toBe('Student is steady.');
  });

  it('strips rawCheckins, privateNotes, and clinicalIndicators for parents', () => {
    const filtered = PermissionFilter.filterInsights(sampleInsights, 'parent');
    expect(filtered.rawCheckins).toBeUndefined();
    expect(filtered.privateNotes).toBeUndefined();
    expect(filtered.clinicalIndicators).toBeUndefined();
    expect(filtered.summary).toBe('Student is steady.');
  });

  it('strips private emotional details and home indicators for teachers', () => {
    const filtered = PermissionFilter.filterInsights(sampleInsights, 'teacher');
    expect(filtered.rawCheckins).toBeUndefined();
    expect(filtered.homeLifeIndicators).toBeUndefined();
    expect(filtered.emotionalSpecifics).toBeUndefined();
    expect(filtered.summary).toBe('Student is steady.');
  });

  it('filters alerts by context (classroom vs home)', () => {
    const alerts = [
      { id: '1', type: 'classroom_behavior', title: 'Late to period 3' },
      { id: '2', type: 'home_behavior', title: 'Late bedtime logged' },
      { id: '3', type: 'critical', title: 'Academic clustering warning' }
    ];

    const parentAlerts = PermissionFilter.filterAlerts(alerts, 'parent');
    expect(parentAlerts.some(a => a.type === 'classroom_behavior')).toBe(false);
    expect(parentAlerts.some(a => a.type === 'home_behavior')).toBe(true);

    const teacherAlerts = PermissionFilter.filterAlerts(alerts, 'teacher');
    expect(teacherAlerts.some(a => a.type === 'home_behavior')).toBe(false);
    expect(teacherAlerts.some(a => a.type === 'classroom_behavior')).toBe(true);
  });
});
