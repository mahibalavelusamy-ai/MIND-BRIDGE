import { db, setDoc, doc } from './firebase';

export interface MentalResilienceRecord {
  studentId: string;
  resilienceScore: number;
  recoverySpeed: string;
  recoveryPattern: string;
  calculatedDate: string;
}

export const calculateMentalResilience = (assessments: any[]) => {
  if (assessments.length < 5) {
     return {
        resilienceScore: 100,
        category: 'Highly Resilient',
        recoverySpeed: 0,
        recoveryPattern: 'Insufficient Data'
     };
  }

  // sort assessments by date (assume they are already sorted ascending)
  const getScore = (a: any, key: string) => {
     if (key === 'mood') {
        return a.scores?.mood || Number(a.answers?.find((ans: any) => ans.id.includes('mood'))?.value) || 3;
     }
     if (key === 'stress') {
        return a.scores?.academic_stress || Number(a.answers?.find((ans: any) => ans.id.includes('stress'))?.value) || 3;
     }
     return 3;
  };

  let lowPoints = 0;
  let recoveryDaysSum = 0;
  let recoveredCount = 0;

  for (let i = 0; i < assessments.length - 1; i++) {
     const mood = getScore(assessments[i], 'mood');
     const stress = getScore(assessments[i], 'stress');
     
     // Detect a low point (mood <= 2 or stress >= 4) (assuming 1-5 scale)
     if (mood <= 2 || stress >= 4) {
        lowPoints++;
        // track how many days it takes to recover (mood >= 3 and stress <= 3)
        let daysToRecover = 0;
        let recovered = false;
        for (let j = i + 1; j < assessments.length; j++) {
           daysToRecover++;
           const nextMood = getScore(assessments[j], 'mood');
           const nextStress = getScore(assessments[j], 'stress');
           if (nextMood >= 3 && nextStress <= 3) {
              recovered = true;
              break;
           }
        }
        if (recovered) {
           recoveredCount++;
           recoveryDaysSum += daysToRecover;
           // skip the days we just counted to avoid overlapping low points
           i += daysToRecover;
        }
     }
  }

  let recoverySpeed = 0; // average days to recover
  let recoveryPattern = "";
  let resilienceScore = 100;

  if (lowPoints > 0) {
      if (recoveredCount > 0) {
         recoverySpeed = recoveryDaysSum / recoveredCount;
         
         const recoveryRatio = recoveredCount / lowPoints;
         
         // Non-recovery penalizes. Quick recovery = good score
         resilienceScore = 100 - (recoverySpeed * 15) - ((lowPoints - recoveredCount) * 10);
         
         if (recoverySpeed <= 2) recoveryPattern = "Quick Recovery";
         else if (recoverySpeed <= 4) recoveryPattern = "Gradual Recovery";
         else recoveryPattern = "Slow Recovery";

         if (recoveryRatio < 0.5) recoveryPattern += ", Inconsistent";
      } else {
         // Has low points, never recovered
         resilienceScore = Math.max(0, 100 - (lowPoints * 20));
         recoveryPattern = "Prolonged Low Periods";
      }
  } else {
      recoveryPattern = "Consistently Stable";
  }

  resilienceScore = Math.max(0, Math.min(100, Math.round(resilienceScore)));

  let category = 'Highly Resilient';
  if (resilienceScore >= 80) category = 'Highly Resilient';
  else if (resilienceScore >= 60) category = 'Moderately Resilient';
  else if (resilienceScore >= 40) category = 'Needs Support';
  else category = 'Low Resilience';

  return {
     resilienceScore,
     category,
     recoverySpeed,
     recoveryPattern
  };
};

export const syncMentalResilience = async (studentId: string, assessments: any[]) => {
   const result = calculateMentalResilience(assessments);
   const today = new Date().toISOString().split('T')[0];

   const record: MentalResilienceRecord = {
      studentId,
      resilienceScore: result.resilienceScore,
      recoverySpeed: result.recoverySpeed.toFixed(1),
      recoveryPattern: result.recoveryPattern,
      calculatedDate: today
   };
   
   try {
      await setDoc(doc(db, 'mental_resilience', `${studentId}_${today}`), record);
   } catch (error) {
      console.error("Error saving mental resilience:", error);
   }

   return { ...result, record };
};
