import { describe, it, expect } from 'vitest';
import { CrisisEscalationService, INDIAN_HELPLINES } from './crisisEscalationService';

describe('CrisisEscalationService', () => {
  it('provides official Indian national crisis helplines including Tele-MANAS 14416', () => {
    const helplines = CrisisEscalationService.getHelplines();
    expect(helplines.length).toBeGreaterThanOrEqual(4);
    
    const teleManas = helplines.find(h => h.number === '14416');
    expect(teleManas).toBeDefined();
    expect(teleManas?.name).toContain('Tele-MANAS');
    expect(teleManas?.isPrimary).toBe(true);

    const vandrevala = helplines.find(h => h.name.includes('Vandrevala'));
    expect(vandrevala).toBeDefined();
  });

  describe('detectCrisisKeywords', () => {
    it('detects crisis keywords reliably', () => {
      expect(CrisisEscalationService.detectCrisisKeywords('I feel like I want to die')).toBe(true);
      expect(CrisisEscalationService.detectCrisisKeywords('sometimes I think about suicide')).toBe(true);
      expect(CrisisEscalationService.detectCrisisKeywords('i want to harm myself')).toBe(true);
    });

    it('returns false for normal academic fatigue text', () => {
      expect(CrisisEscalationService.detectCrisisKeywords('I am tired after study sessions')).toBe(false);
      expect(CrisisEscalationService.detectCrisisKeywords('The math test was tough today')).toBe(false);
    });

    it('handles empty or malformed input safely', () => {
      expect(CrisisEscalationService.detectCrisisKeywords('')).toBe(false);
      expect(CrisisEscalationService.detectCrisisKeywords(null as any)).toBe(false);
    });
  });

  describe('generateRedactedSummary', () => {
    it('STRICT PRIVACY: sanitizes raw text into high-level non-revealing clinical summary', () => {
      const privateJournal = 'I fought with my friend at school and feel terrible';
      const summary = CrisisEscalationService.generateRedactedSummary(privateJournal, 'critical');

      // Invariant: The raw journal details must NEVER be present in the summary
      expect(summary).not.toContain('fought');
      expect(summary).not.toContain('friend');
      expect(summary).toContain('Tele-MANAS crisis protocol activated');
    });
  });

  describe('createEscalationIncident', () => {
    it('constructs a structured incident with privacy guarantees', () => {
      const incident = CrisisEscalationService.createEscalationIncident(
        'student-1',
        'Aarav Sharma',
        'self_harm_risk',
        'Sensitive private journal entry'
      );

      expect(incident.studentId).toBe('student-1');
      expect(incident.studentName).toBe('Aarav Sharma');
      expect(incident.severity).toBe('critical');
      expect(incident.redactedSummary).toBeDefined();
      expect(incident.redactedSummary).not.toContain('Sensitive private journal entry');
      expect(incident.resolved).toBe(false);
    });
  });
});
