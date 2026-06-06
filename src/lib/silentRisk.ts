import { db, setDoc, doc } from './firebase';

export interface SilentRiskRecord {
  studentId: string;
  riskScore: number;
  riskLevel: 'None' | 'Low' | 'Moderate' | 'High';
  riskFactors: string[];
  explanation: string;
  generatedAt: string;
}

export const calculateSilentRisk = (assessments: any[], sessions: any[], streak: number) => {
  let riskScore = 0;
  let riskFactors: string[] = [];
  
  if (assessments.length === 0) {
      return {
          riskScore: 0,
          riskLevel: 'None' as const,
          riskFactors: [],
          explanation: 'Insufficient data for silent risk analysis.'
      };
  }

  const getScore = (a: any, key: string) => {
     if (key === 'mood') return a.scores?.mood || Number(a.answers?.find((ans: any) => ans.id.includes('mood'))?.value) || 3;
     if (key === 'stress') return a.scores?.academic_stress || Number(a.answers?.find((ans: any) => ans.id.includes('stress'))?.value) || 3;
     return 3;
  };

  let recentAssessments = assessments;
  if (assessments.length > 5) {
     recentAssessments = assessments.slice(-5); // Look at most recent 5
  }

  let avgMood = 0;
  let avgStress = 0;

  recentAssessments.forEach(a => {
     avgMood += getScore(a, 'mood');
     avgStress += getScore(a, 'stress');
  });
  avgMood /= recentAssessments.length;
  avgStress /= recentAssessments.length;

  const assessmentCount = assessments.length;
  const sessionCount = sessions.length;

  // Stated: Good (Mood >= 3.5, Stress <= 3)
  const isStatedGood = avgMood >= 3.5 && avgStress <= 3;
  
  if (isStatedGood) {
      if (assessmentCount < 5) {
         riskScore += 30;
         riskFactors.push('Missed Assessments');
      }
      if (sessionCount < 3) {
         riskScore += 30;
         riskFactors.push('Reduced Focus Sessions');
      }
      if (streak < 2) {
         riskScore += 20;
         riskFactors.push('Low Engagement (Falling Streak)');
      }
  } else {
      if (assessmentCount < 3 || sessionCount < 2 || streak === 0) {
          riskScore += 50;
          riskFactors.push('Withdrawing from activities after reporting low mood/high stress');
      } else {
          riskScore += 10;
          riskFactors.push('Reported struggles but maintaining healthy system engagement');
      }
  }

  // Normalize
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  
  let riskLevel: SilentRiskRecord['riskLevel'] = 'None';
  if (riskScore >= 70) riskLevel = 'High';
  else if (riskScore >= 40) riskLevel = 'Moderate';
  else if (riskScore >= 20) riskLevel = 'Low';

  let explanation = 'Behavior patterns align with self-reported wellness.';
  if (riskLevel === 'High') {
      explanation = 'Behavioral engagement has critically declined despite positive or neutral assessment responses, indicating possible masking.';
  } else if (riskLevel === 'Moderate') {
      explanation = 'Some mismatch detected between reported well-being and actual system engagement.';
  } else if (riskLevel === 'Low') {
      explanation = 'Minor inconsistencies between reported state and engagement levels.';
  }

  if (riskFactors.length === 0) {
      riskFactors.push('No significant silent risk factors detected.');
  }

  return {
      riskScore,
      riskLevel,
      riskFactors,
      explanation
  };
};

export const syncSilentRisk = async (studentId: string, assessments: any[], sessions: any[], streak: number) => {
   const result = calculateSilentRisk(assessments, sessions, streak);
   const generatedAt = new Date().toISOString();

   const record: SilentRiskRecord = {
      studentId,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      riskFactors: result.riskFactors,
      explanation: result.explanation,
      generatedAt
   };
   
   try {
      await setDoc(doc(db, 'silent_risk', `${studentId}_${generatedAt.split('T')[0]}`), record);
   } catch (error) {
      console.error("Error saving silent risk:", error);
   }

   return { ...result, record };
};
