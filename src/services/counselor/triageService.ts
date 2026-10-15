/**
 * Counselor Triage Queue Service
 *
 * Provides school psychologists and clinical counselors with an organized workflow
 * for managing elevated student wellness concerns:
 * - Status workflow: 'new' -> 'in_progress' -> 'resolved'
 * - Severity prioritization (low, medium, high, critical)
 * - Clinical observations & confidential counselor notes
 * - Follow-up scheduling
 */

export interface TriageCase {
  id: string;
  studentId: string;
  studentName: string;
  status: 'new' | 'in_progress' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  assignedCounselorId?: string;
  assignedCounselorName?: string;
  triggerReason: string;
  notes: string[];
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export const TriageService = {
  /**
   * Initializes a new triage case when an alert or severe score threshold triggers.
   */
  createCase(
    studentId: string,
    studentName: string,
    triggerReason: string,
    severity: TriageCase['severity'] = 'medium'
  ): TriageCase {
    const now = new Date().toISOString();
    return {
      id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId,
      studentName,
      status: 'new',
      severity,
      triggerReason,
      notes: [`Case automatically generated: ${triggerReason}`],
      createdAt: now,
      updatedAt: now
    };
  },

  /**
   * Transitions case status and optionally appends a counselor note.
   */
  updateCaseStatus(
    triageCase: TriageCase,
    newStatus: TriageCase['status'],
    note?: string
  ): TriageCase {
    const now = new Date().toISOString();
    const updatedNotes = note ? [...triageCase.notes, `[${newStatus.toUpperCase()}] ${note}`] : triageCase.notes;

    return {
      ...triageCase,
      status: newStatus,
      notes: updatedNotes,
      updatedAt: now,
      resolvedAt: newStatus === 'resolved' ? now : triageCase.resolvedAt
    };
  },

  /**
   * Schedules or reschedules a clinical follow-up appointment.
   */
  setFollowUp(triageCase: TriageCase, followUpDate: string, note?: string): TriageCase {
    const now = new Date().toISOString();
    const updatedNotes = note ? [...triageCase.notes, `[Follow-Up Scheduled: ${followUpDate}] ${note}`] : triageCase.notes;

    return {
      ...triageCase,
      followUpDate,
      notes: updatedNotes,
      updatedAt: now
    };
  },

  /**
   * Computes high-level clinical triage queue metrics.
   */
  calculateMetrics(cases: TriageCase[]) {
    return {
      total: cases.length,
      newCount: cases.filter(c => c.status === 'new').length,
      inProgressCount: cases.filter(c => c.status === 'in_progress').length,
      resolvedCount: cases.filter(c => c.status === 'resolved').length,
      criticalCount: cases.filter(c => c.severity === 'critical' && c.status !== 'resolved').length
    };
  }
};
