import { describe, it, expect } from 'vitest';
import { PrivacyConsentService } from './privacyConsentService';

describe('PrivacyConsentService', () => {
  it('generates secure default consent settings', () => {
    const consent = PrivacyConsentService.getDefaultConsent('student-1');
    expect(consent.studentId).toBe('student-1');
    expect(consent.shareWithSchool).toBe(false); // Privacy by default
    expect(consent.parentVisibility).toBe('summary_only'); // Protect raw journal
    expect(consent.allowAiAnalysis).toBe(true);
    expect(consent.anonymizeResearchData).toBe(true);
  });

  it('compiles a complete GDPR/FERPA export payload', () => {
    const student = { id: 's1', name: 'Aarav', age: 15, grade: '10', riskLevel: 'low' };
    const assessments = [{ id: 'a1', timestamp: '2026-10-10', scores: { mood: 4 }, totalScore: 20 }];
    const selfChecks = [{ id: 'sc1', timestamp: '2026-10-10', mood: 4, tags: ['calm'] }];
    const auditLogs = [
      PrivacyConsentService.createAuditLog('s1', 'parent-1', 'parent', 'view_summary', 'Viewed report')
    ];

    const exportData = PrivacyConsentService.generateDataExport(student, assessments, selfChecks, auditLogs);

    expect(exportData.meta.studentId).toBe('s1');
    expect(exportData.profile.name).toBe('Aarav');
    expect(exportData.assessments.length).toBe(1);
    expect(exportData.selfChecks.length).toBe(1);
    expect(exportData.auditLogs.length).toBe(1);
  });

  it('creates immutable audit logs with timestamp and actor context', () => {
    const log = PrivacyConsentService.createAuditLog(
      'student-1',
      'counselor-1',
      'counselor',
      'view_assessment',
      'Clinical intake review'
    );

    expect(log.id).toBeDefined();
    expect(log.studentId).toBe('student-1');
    expect(log.actorRole).toBe('counselor');
    expect(log.action).toBe('view_assessment');
    expect(log.timestamp).toBeDefined();
  });
});
