/**
 * Mind Bridge Crisis Escalation Service
 *
 * Core Philosophy:
 * Immediate, compassionate safety escalation without clinical intimidation.
 * Default national helplines for India (Tele-MANAS 14416, Vandrevala Foundation, KIRAN, Childline).
 *
 * Strict Privacy Mandate:
 * Parents, educators, and counselors receive high-level clinical summaries only.
 * Raw student journal reflections and personal diary entries are NEVER exposed.
 */

export interface HelplineResource {
  name: string;
  number: string;
  description: string;
  hours: string;
  isPrimary?: boolean;
}

export interface CrisisIncident {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  severity: 'moderate' | 'high' | 'critical';
  triggerCategory: 'self_harm_risk' | 'severe_overload' | 'acute_distress' | 'manual_panic';
  rawInputSanitizedText?: string;
  redactedSummary: string;
  actionTaken?: string;
  resolved?: boolean;
}

export const INDIAN_HELPLINES: HelplineResource[] = [
  {
    name: 'Tele-MANAS (Govt. of India)',
    number: '14416',
    description: 'National 24/7 toll-free mental health helpline in 20+ languages.',
    hours: '24/7',
    isPrimary: true
  },
  {
    name: 'Tele-MANAS Alternate Toll-Free',
    number: '1800-891-4416',
    description: 'National tele-mental health assistance and counseling network.',
    hours: '24/7'
  },
  {
    name: 'Vandrevala Foundation',
    number: '+91 9999 666 555',
    description: 'Free, professional psychological support and crisis counseling.',
    hours: '24/7'
  },
  {
    name: 'KIRAN Helpline',
    number: '1800-599-0019',
    description: 'Ministry of Social Justice 24/7 mental health rehabilitation helpline.',
    hours: '24/7'
  },
  {
    name: 'Childline India',
    number: '1098',
    description: 'Emergency assistance for children, adolescents, and students in distress.',
    hours: '24/7'
  },
  {
    name: 'National Emergency Services',
    number: '112',
    description: 'Unified emergency response for medical and life safety crises.',
    hours: '24/7'
  }
];

export const CrisisEscalationService = {
  /**
   * Evaluates text for critical emotional crisis indicators.
   *
   * @param text - Student input or check-in note
   * @returns boolean flag indicating if immediate crisis protocol should trigger
   */
  detectCrisisKeywords(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    const crisisPatterns = [
      'suicide',
      'kill myself',
      'want to die',
      'end my life',
      'harm myself',
      'cut myself',
      'no reason to live',
      'better off dead',
      'can\'t go on'
    ];
    return crisisPatterns.some(pattern => lower.includes(pattern));
  },

  /**
   * Sanitizes and produces a high-level supportive summary suitable for parents and counselors.
   * STRICT PRIVACY INVARIANT: Never leaks verbatim diary or journal contents.
   *
   * @param rawText - The confidential student text
   * @param severity - Severity tier
   * @returns Non-pathologizing, clinical supportive summary
   */
  generateRedactedSummary(rawText: string, severity: 'moderate' | 'high' | 'critical'): string {
    if (severity === 'critical') {
      return 'The student reported acute emotional distress indicating need for immediate supportive check-in. Tele-MANAS crisis protocol activated.';
    }
    if (severity === 'high') {
      return 'Elevated emotional vulnerability detected. Caretaker presence and empathetic listening recommended.';
    }
    return 'Moderate stress fluctuations observed. Routine emotional check-in advised.';
  },

  /**
   * Creates an escalation incident record with privacy boundaries enforced.
   */
  createEscalationIncident(
    studentId: string,
    studentName: string,
    triggerCategory: CrisisIncident['triggerCategory'],
    rawNotes?: string
  ): CrisisIncident {
    const isCritical = triggerCategory === 'self_harm_risk' || triggerCategory === 'manual_panic';
    const severity: CrisisIncident['severity'] = isCritical ? 'critical' : 'high';

    return {
      id: `crisis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId,
      studentName,
      timestamp: new Date().toISOString(),
      severity,
      triggerCategory,
      redactedSummary: this.generateRedactedSummary(rawNotes || '', severity),
      resolved: false
    };
  },

  /**
   * Returns default helpline list for UI rendering.
   */
  getHelplines(): HelplineResource[] {
    return INDIAN_HELPLINES;
  }
};
