import { Child, Alert } from '../../types';
import { TriageCase } from '../counselor/triageService';
import { AccessAuditLog } from '../privacy/privacyConsentService';

export type UserRole = 'student' | 'parent' | 'teacher' | 'school_admin' | 'counselor';

export interface RoleSeedData {
  user: {
    uid: string;
    name: string;
    email: string;
    role: UserRole;
    avatar: string;
    organization: string;
  };
  children: Child[];
  alerts: Alert[];
  triageCases?: TriageCase[];
  auditLogs?: AccessAuditLog[];
}

export const SeedDataService = {
  /**
   * Generates comprehensive demo data tailored for each role.
   */
  getSeedDataForRole(role: UserRole): RoleSeedData {
    const studentAarav: Child = {
      id: 'student-demo-aarav',
      parentId: 'parent-demo-priya',
      name: 'Aarav Sharma',
      age: 15,
      grade: 'Grade 10-A',
      school: 'Delhi Public School',
      avatar: '👦',
      gender: 'male',
      riskLevel: 'low',
      lastCheckIn: 'Today at 09:30 AM',
      moodScore: 8.2,
      stressLevel: 'Low',
      notes: 'Feeling confident after finishing my science presentation.',
      gems: 120,
      creditsEarned: 45,
      credits: 45,
      streak: 7,
      level: 3,
      assessmentCount: 8,
      wellnessProfile: 'Thriving Learner',
      consentToSchoolSharing: true,
      pinSet: true,
      privacyLevel: 'summary'
    };

    const studentAnanya: Child = {
      id: 'student-demo-ananya',
      parentId: 'parent-demo-priya',
      name: 'Ananya Sharma',
      age: 12,
      grade: 'Grade 7-B',
      school: 'Delhi Public School',
      avatar: '👧',
      gender: 'female',
      riskLevel: 'medium',
      lastCheckIn: 'Yesterday',
      moodScore: 5.8,
      stressLevel: 'Moderate',
      notes: 'Upcoming math test is feeling a bit overwhelming.',
      gems: 40,
      creditsEarned: 20,
      credits: 20,
      streak: 3,
      level: 1,
      assessmentCount: 4,
      wellnessProfile: 'Exam-Stressed Student',
      consentToSchoolSharing: false,
      pinSet: false,
      privacyLevel: 'summary'
    };

    const sampleAlerts: Alert[] = [
      {
        id: 'alert-1',
        childId: studentAnanya.id,
        parentId: 'parent-demo-priya',
        type: 'warning',
        title: 'Mild Academic Stress Clustering',
        description: 'Ananya has 2 upcoming assessments scheduled within 48 hours. Supportive check-in recommended.',
        timestamp: '10 mins ago',
        read: false
      },
      {
        id: 'alert-2',
        childId: studentAarav.id,
        parentId: 'parent-demo-priya',
        type: 'info',
        title: '7-Day Check-in Streak Achieved! 🎉',
        description: 'Aarav unlocked the "Resilience Champion" badge and earned 15 credits.',
        timestamp: '2 hours ago',
        read: true
      }
    ];

    const sampleTriageCases: TriageCase[] = [
      {
        id: 'case-demo-1',
        studentId: studentAnanya.id,
        studentName: 'Ananya Sharma',
        status: 'new',
        severity: 'medium',
        triggerReason: 'Consecutive moderate anxiety scores prior to mid-term math test',
        notes: ['System triggered triage: Academic pressure threshold reached.'],
        followUpDate: '2026-10-18',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'case-demo-2',
        studentId: 'student-demo-rohan',
        studentName: 'Rohan Gupta',
        status: 'in_progress',
        severity: 'high',
        assignedCounselorId: 'counselor-demo-neha',
        assignedCounselorName: 'Dr. Neha Sen',
        triggerReason: 'Social withdrawal markers and sleep deficit over 4 days',
        notes: [
          '[NEW] Initial alert flagged by homeroom teacher.',
          '[IN_PROGRESS] First counseling check-in conducted. Student responded warmly to mindfulness reset.'
        ],
        followUpDate: '2026-10-16',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const sampleAuditLogs: AccessAuditLog[] = [
      {
        id: 'log-1',
        studentId: studentAarav.id,
        actorId: 'parent-demo-priya',
        actorRole: 'parent',
        action: 'view_summary',
        timestamp: '1 hour ago',
        details: 'Viewed weekly wellbeing summary dashboard'
      },
      {
        id: 'log-2',
        studentId: studentAarav.id,
        actorId: studentAarav.id,
        actorRole: 'student',
        action: 'consent_change',
        timestamp: '1 day ago',
        details: 'Updated school sharing consent to TRUE'
      }
    ];

    switch (role) {
      case 'student':
        return {
          user: {
            uid: studentAarav.id,
            name: studentAarav.name,
            email: 'aarav.sharma@mindbridge.edu',
            role: 'student',
            avatar: '👦',
            organization: 'Delhi Public School'
          },
          children: [studentAarav],
          alerts: sampleAlerts.filter(a => a.childId === studentAarav.id),
          auditLogs: sampleAuditLogs
        };

      case 'parent':
        return {
          user: {
            uid: 'parent-demo-priya',
            name: 'Dr. Priya Sharma',
            email: 'priya.sharma@example.com',
            role: 'parent',
            avatar: '👩‍⚕️',
            organization: 'Mind Bridge Family Care'
          },
          children: [studentAarav, studentAnanya],
          alerts: sampleAlerts,
          auditLogs: sampleAuditLogs
        };

      case 'teacher':
        return {
          user: {
            uid: 'teacher-demo-vikram',
            name: 'Prof. Vikram Patel',
            email: 'vikram.patel@mindbridge.edu',
            role: 'teacher',
            avatar: '👨‍🏫',
            organization: 'Department of Mathematics, DPS'
          },
          children: [studentAarav, studentAnanya],
          alerts: sampleAlerts,
          auditLogs: sampleAuditLogs
        };

      case 'counselor':
        return {
          user: {
            uid: 'counselor-demo-neha',
            name: 'Dr. Neha Sen',
            email: 'neha.sen@mindbridge.edu',
            role: 'counselor',
            avatar: '👩‍⚕️',
            organization: 'Student Support Services, DPS'
          },
          children: [studentAarav, studentAnanya],
          alerts: sampleAlerts,
          triageCases: sampleTriageCases,
          auditLogs: sampleAuditLogs
        };

      case 'school_admin':
      default:
        return {
          user: {
            uid: 'admin-demo-sunita',
            name: 'Principal Sunita Rao',
            email: 'sunita.rao@mindbridge.edu',
            role: 'school_admin',
            avatar: '🏛️',
            organization: 'Delhi Public School Central Administration'
          },
          children: [studentAarav, studentAnanya],
          alerts: sampleAlerts,
          triageCases: sampleTriageCases,
          auditLogs: sampleAuditLogs
        };
    }
  }
};
