import { db, setDoc, doc } from './firebase';

export interface TriggerMapRecord {
  studentId: string;
  triggerName: string;
  effect: string;
  confidence: 'Weak' | 'Moderate' | 'Strong';
  detectedDate: string;
}

export const calculateTriggerMapping = (assessments: any[], sessions: any[], schedules: any[]) => {
  const triggers: { triggerName: string, effect: string, confidence: 'Weak' | 'Moderate' | 'Strong' }[] = [];

  if (assessments.length < 3) {
      return {
          triggers,
          recommendation: "Insufficient data to accurately map behavioral triggers."
      };
  }

  const getScore = (a: any, key: string) => {
     if (key === 'mood') return a.scores?.mood || Number(a.answers?.find((ans: any) => ans.id.includes('mood'))?.value) || 3;
     if (key === 'stress') return a.scores?.academic_stress || Number(a.answers?.find((ans: any) => ans.id.includes('stress'))?.value) || 3;
     if (key === 'sleep') return a.scores?.sleep || Number(a.answers?.find((ans: any) => ans.id.includes('sleep'))?.value) || 3;
     if (key === 'focus') return a.scores?.focus || Number(a.answers?.find((ans: any) => ans.id.includes('focus'))?.value) || 3;
     return 3;
  };

  let lowSleepCount = 0;
  let lowSleepLowFocusCount = 0;

  let examStressCount = 0;
  let totalExams = 0;

  assessments.forEach(a => {
      const sleep = getScore(a, 'sleep');
      const focus = getScore(a, 'focus');
      const stress = getScore(a, 'stress');
      const dateStr = a.timestamp ? new Date(a.timestamp).toISOString().split('T')[0] : '';

      // Check sleep -> focus
      if (sleep <= 2) {
          lowSleepCount++;
          if (focus <= 2) {
              lowSleepLowFocusCount++;
          }
      }

      // Check exam schedule -> stress
      if (dateStr && schedules && schedules.length > 0) {
          const hasExam = schedules.some((s: any) => {
              if (!s.date) return false;
              const sDate = typeof s.date === 'string' ? s.date : new Date(s.date.seconds * 1000).toISOString().split('T')[0];
              return sDate === dateStr && (s.title?.toLowerCase().includes('exam') || s.title?.toLowerCase().includes('test'));
          });

          if (hasExam) {
              totalExams++;
              if (stress >= 4) {
                 examStressCount++;
              }
          }
      }
  });

  if (lowSleepCount >= 2) {
      const ratio = lowSleepLowFocusCount / lowSleepCount;
      if (ratio > 0.7) {
          triggers.push({
              triggerName: 'Late/Poor Sleep',
              effect: 'Focus Reduction',
              confidence: 'Strong'
          });
      } else if (ratio > 0.4) {
          triggers.push({
              triggerName: 'Poor Sleep Patterns',
              effect: 'Mild Focus Reduction',
              confidence: 'Moderate'
          });
      }
  }

  if (totalExams > 0) {
      const ratio = examStressCount / totalExams;
      if (ratio > 0.7) {
          triggers.push({
              triggerName: 'Exam Periods',
              effect: 'High Stress Increase',
              confidence: 'Strong'
          });
      } else if (ratio > 0.4) {
          triggers.push({
              triggerName: 'Upcoming Assessments',
              effect: 'Moderate Stress Increase',
              confidence: 'Moderate'
          });
      }
  }

  // Generic fallback trigger if none found but we have data
  if (triggers.length === 0 && assessments.length >= 5) {
      const recentStress = getScore(assessments[assessments.length - 1], 'stress');
      if (recentStress >= 4) {
          triggers.push({
              triggerName: 'Unidentified Academic Pressure',
              effect: 'Stress Increase',
              confidence: 'Weak'
          });
      }
  }

  let recommendation = "Continue monitoring to establish baseline patterns.";
  if (triggers.some(t => t.triggerName.includes('Sleep') && t.confidence === 'Strong')) {
      recommendation = "Sleep schedule appears to be the strongest factor affecting focus. Prioritize sleep hygiene.";
  } else if (triggers.some(t => t.triggerName.includes('Exam') && t.confidence === 'Strong')) {
      recommendation = "Exam periods consistently trigger high stress. Introduce preemptive stress-management techniques a week prior.";
  } else if (triggers.length > 0) {
      recommendation = "Review identified triggers to help the student anticipate and manage their reactions.";
  }

  return {
      triggers,
      recommendation
  };
};

export const syncTriggerMapping = async (studentId: string, assessments: any[], sessions: any[], schedules: any[]) => {
  const result = calculateTriggerMapping(assessments, sessions, schedules);
  const detectedDate = new Date().toISOString();

  result.triggers.forEach(async (t) => {
      const record: TriggerMapRecord = {
          studentId,
          triggerName: t.triggerName,
          effect: t.effect,
          confidence: t.confidence,
          detectedDate
      };
      
      try {
          // Creating document ID based on student and trigger to update latest
          const docId = `${studentId}_${t.triggerName.replace(/\\s+/g, '_')}`;
          await setDoc(doc(db, 'trigger_map', docId), record);
      } catch (error) {
          console.error("Error saving trigger mapping:", error);
      }
  });

  return result;
};
