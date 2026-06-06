import { db, setDoc, doc } from './firebase';

export interface InterventionEffectivenessRecord {
  studentId: string;
  interventionId: string;
  beforeScore: number;
  afterScore: number;
  improvement: number;
  effectivenessScore: number;
  status: 'Successful' | 'Partially Successful' | 'No Impact' | 'Needs Adjustment';
  insight: string;
  calculatedDate: string;
}

export const calculateInterventionEffectiveness = (assessments: any[]) => {
  // Mock logic to determine if recommendations actually worked.
  // We look at assessment history. Before half and After half.
  if (assessments.length < 4) {
      return {
          effectivenessScore: 0,
          status: 'No Impact' as const,
          insight: 'Insufficient data to measure intervention effectiveness.',
          beforeScore: 0,
          afterScore: 0,
          improvement: 0
      };
  }

  const getScore = (a: any, key: string) => {
     if (key === 'sleep') return a.scores?.sleep || Number(a.answers?.find((ans: any) => ans.id.includes('sleep'))?.value) || 3;
     if (key === 'focus') return a.scores?.focus || Number(a.answers?.find((ans: any) => ans.id.includes('focus'))?.value) || 3;
     return 3;
  };

  const mid = Math.floor(assessments.length / 2);
  const beforeAssessments = assessments.slice(0, mid);
  const afterAssessments = assessments.slice(mid);

  let beforeSleep = 0;
  beforeAssessments.forEach(a => beforeSleep += getScore(a, 'sleep'));
  beforeSleep = Math.round((beforeSleep / beforeAssessments.length) * 20); // Normalize to 100

  let afterSleep = 0;
  afterAssessments.forEach(a => afterSleep += getScore(a, 'sleep'));
  afterSleep = Math.round((afterSleep / afterAssessments.length) * 20); // Normalize to 100

  const improvement = afterSleep - beforeSleep;
  
  // Calculate effectiveness score (0-100) based on improvement
  let effectivenessScore = 50 + improvement; // Baseline 50, scales up with improvement
  if (effectivenessScore > 100) effectivenessScore = 100;
  if (effectivenessScore < 0) effectivenessScore = 0;

  let status: 'Successful' | 'Partially Successful' | 'No Impact' | 'Needs Adjustment' = 'No Impact';
  let insight = '';

  if (improvement >= 20) {
      status = 'Successful';
      insight = `Sleep intervention improved sleep quality by ${improvement}%.`;
  } else if (improvement > 5) {
      status = 'Partially Successful';
      insight = `Intervention showed marginal improvement (${improvement}%). Consider reinforcement.`;
  } else if (improvement > -5 && improvement <= 5) {
      status = 'No Impact';
      insight = 'No significant impact detected. Interventions may need adjustment.';
  } else {
      status = 'Needs Adjustment';
      insight = `Wellness metric declined by ${Math.abs(improvement)}% post-intervention. Urgent adjustment needed.`;
  }

  return {
      effectivenessScore,
      status,
      insight,
      beforeScore: beforeSleep,
      afterScore: afterSleep,
      improvement
  };
};

export const syncInterventionEffectiveness = async (studentId: string, assessments: any[]) => {
  const result = calculateInterventionEffectiveness(assessments);
  const calculatedDate = new Date().toISOString().split('T')[0];
  
  const record: InterventionEffectivenessRecord = {
      studentId,
      interventionId: 'sleep_hygiene_01', // Example ID
      beforeScore: result.beforeScore,
      afterScore: result.afterScore,
      improvement: result.improvement,
      effectivenessScore: result.effectivenessScore,
      status: result.status,
      insight: result.insight,
      calculatedDate
  };
  
  try {
      await setDoc(doc(db, 'intervention_effectiveness', `${studentId}_last_eval`), record);
  } catch (error) {
      console.error("Error saving intervention effectiveness:", error);
  }

  return { ...result, record };
};
