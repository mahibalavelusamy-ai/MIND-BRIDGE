import { describe, it, expect } from 'vitest';
import { PermissionEngine, UserContext } from './permissions';

describe('PermissionEngine', () => {
  const studentUser: UserContext = {
    uid: 'student-123',
    role: 'student',
    relationships: { 'student-123': ['self'] }
  };

  const parentUser: UserContext = {
    uid: 'parent-456',
    role: 'parent',
    relationships: { 'student-123': ['parent_of'] }
  };

  const teacherUser: UserContext = {
    uid: 'teacher-789',
    role: 'teacher',
    relationships: { 'student-123': ['teacher_of'] }
  };

  const counselorUser: UserContext = {
    uid: 'counselor-101',
    role: 'counselor',
    relationships: { 'student-123': ['school_monitor'] }
  };

  const strangerUser: UserContext = {
    uid: 'stranger-999',
    role: 'parent',
    relationships: {}
  };

  describe('canViewRawJournal', () => {
    it('allows student to view their own raw journal', () => {
      expect(PermissionEngine.canViewRawJournal(studentUser, 'student-123')).toBe(true);
    });

    it('STRICT PRIVACY: forbids parents from viewing raw personal journal entries', () => {
      expect(PermissionEngine.canViewRawJournal(parentUser, 'student-123')).toBe(false);
    });

    it('STRICT PRIVACY: forbids teachers from viewing raw personal reflections', () => {
      expect(PermissionEngine.canViewRawJournal(teacherUser, 'student-123')).toBe(false);
    });

    it('STRICT PRIVACY: forbids counselors from viewing raw personal reflections', () => {
      expect(PermissionEngine.canViewRawJournal(counselorUser, 'student-123')).toBe(false);
    });

    it('forbids unrelated users from viewing raw journals', () => {
      expect(PermissionEngine.canViewRawJournal(strangerUser, 'student-123')).toBe(false);
    });
  });

  describe('canViewWellnessSummary', () => {
    it('allows student to view their own summary', () => {
      expect(PermissionEngine.canViewWellnessSummary(studentUser, 'student-123')).toBe(true);
    });

    it('allows verified parent to view wellness summary', () => {
      expect(PermissionEngine.canViewWellnessSummary(parentUser, 'student-123')).toBe(true);
    });

    it('allows assigned teacher to view wellness summary', () => {
      expect(PermissionEngine.canViewWellnessSummary(teacherUser, 'student-123')).toBe(true);
    });

    it('allows school monitor/counselor to view wellness summary', () => {
      expect(PermissionEngine.canViewWellnessSummary(counselorUser, 'student-123')).toBe(true);
    });

    it('denies unrelated users from viewing wellness summary', () => {
      expect(PermissionEngine.canViewWellnessSummary(strangerUser, 'student-123')).toBe(false);
    });
  });

  describe('canReceiveAlerts', () => {
    it('allows parent to receive proactive alerts', () => {
      expect(PermissionEngine.canReceiveAlerts(parentUser, 'student-123')).toBe(true);
    });

    it('allows teacher to receive proactive alerts for assigned students', () => {
      expect(PermissionEngine.canReceiveAlerts(teacherUser, 'student-123')).toBe(true);
    });

    it('allows counselor to receive proactive alerts', () => {
      expect(PermissionEngine.canReceiveAlerts(counselorUser, 'student-123')).toBe(true);
    });

    it('denies stranger from receiving alerts', () => {
      expect(PermissionEngine.canReceiveAlerts(strangerUser, 'student-123')).toBe(false);
    });
  });
});
