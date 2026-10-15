import { create } from 'zustand';
import { Child, Alert } from '../types';
import { CrisisIncident, CrisisEscalationService } from '../services/crisis/crisisEscalationService';
import { StudentConsentSettings, AccessAuditLog, PrivacyConsentService } from '../services/privacy/privacyConsentService';
import { TriageCase, TriageService } from '../services/counselor/triageService';
import { NotificationPreferences, NotificationPreferencesService } from '../services/notifications/notificationPreferencesService';
import { WeeklyWellbeingReportData, WeeklyReportService } from '../services/reports/weeklyReportService';
import { SeedDataService, UserRole } from '../services/demo/seedDataService';

interface AppState {
  // Core user & student state
  user: any | null;
  children: Child[];
  alerts: Alert[];
  selectedChild: Child | null;
  setUser: (user: any | null) => void;
  setChildren: (children: Child[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setSelectedChild: (child: Child | null) => void;

  // Feature 1: Crisis Escalation Slice
  activeCrisis: CrisisIncident | null;
  triggerCrisis: (incident: CrisisIncident) => void;
  dismissCrisis: () => void;

  // Feature 2: Privacy, Consent & Audit Log Slice
  consentSettings: StudentConsentSettings | null;
  auditLogs: AccessAuditLog[];
  setConsentSettings: (settings: StudentConsentSettings) => void;
  logAccess: (actorId: string, actorRole: AccessAuditLog['actorRole'], action: AccessAuditLog['action'], details: string) => void;
  deleteStudentData: (studentId: string) => void;

  // Feature 3: Counselor Triage Queue Slice
  triageCases: TriageCase[];
  setTriageCases: (cases: TriageCase[]) => void;
  addTriageCase: (triageCase: TriageCase) => void;
  updateTriageCase: (triageCase: TriageCase) => void;

  // Feature 4: Notification Preferences & Quiet Hours Slice
  notificationPreferences: NotificationPreferences | null;
  setNotificationPreferences: (prefs: NotificationPreferences) => void;

  // Feature 5: Weekly Wellbeing Report Slice
  weeklyReport: WeeklyWellbeingReportData | null;
  generateWeeklyReport: (student: Child) => void;

  // Feature 7: Demo / Role Simulation Slice
  isDemoMode: boolean;
  activeDemoRole: UserRole | null;
  switchDemoRole: (role: UserRole) => void;

  // State reset
  clearState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Core initial state
  user: null,
  children: [],
  alerts: [],
  selectedChild: null,

  setUser: (user) => set({ user }),
  setChildren: (children) => set({ children }),
  setAlerts: (alerts) => set({ alerts }),
  setSelectedChild: (selectedChild) => set({ selectedChild }),

  // Crisis Escalation
  activeCrisis: null,
  triggerCrisis: (incident) => set({ activeCrisis: incident }),
  dismissCrisis: () => set({ activeCrisis: null }),

  // Privacy & Consent
  consentSettings: PrivacyConsentService.getDefaultConsent('default-student'),
  auditLogs: [],
  setConsentSettings: (consentSettings) => set({ consentSettings }),
  logAccess: (actorId, actorRole, action, details) => {
    const studentId = get().selectedChild?.id || 'all';
    const log = PrivacyConsentService.createAuditLog(studentId, actorId, actorRole, action, details);
    set((state) => ({ auditLogs: [log, ...state.auditLogs] }));
  },
  deleteStudentData: (studentId: string) => {
    set((state) => ({
      children: state.children.filter((c) => c.id !== studentId),
      selectedChild: state.selectedChild?.id === studentId ? null : state.selectedChild,
      alerts: state.alerts.filter((a) => a.childId !== studentId),
      triageCases: state.triageCases.filter((tc) => tc.studentId !== studentId),
      auditLogs: state.auditLogs.filter((log) => log.studentId !== studentId)
    }));
  },

  // Counselor Triage Queue
  triageCases: [],
  setTriageCases: (triageCases) => set({ triageCases }),
  addTriageCase: (newCase) => set((state) => ({ triageCases: [newCase, ...state.triageCases] })),
  updateTriageCase: (updatedCase) =>
    set((state) => ({
      triageCases: state.triageCases.map((c) => (c.id === updatedCase.id ? updatedCase : c))
    })),

  // Notification Preferences
  notificationPreferences: NotificationPreferencesService.getDefaultPreferences('current-user'),
  setNotificationPreferences: (notificationPreferences) => set({ notificationPreferences }),

  // Weekly Wellbeing Report
  weeklyReport: null,
  generateWeeklyReport: (student) => {
    const report = WeeklyReportService.generateWeeklyReport(student);
    set({ weeklyReport: report });
  },

  // Demo / Role Simulation
  isDemoMode: false,
  activeDemoRole: null,
  switchDemoRole: (role: UserRole) => {
    const seed = SeedDataService.getSeedDataForRole(role);
    set({
      isDemoMode: true,
      activeDemoRole: role,
      user: seed.user,
      children: seed.children,
      alerts: seed.alerts,
      selectedChild: seed.children[0] || null,
      triageCases: seed.triageCases || [],
      auditLogs: seed.auditLogs || []
    });
  },

  // Clear all session state
  clearState: () =>
    set({
      user: null,
      children: [],
      alerts: [],
      selectedChild: null,
      activeCrisis: null,
      triageCases: [],
      auditLogs: [],
      isDemoMode: false,
      activeDemoRole: null,
      weeklyReport: null
    })
}));
