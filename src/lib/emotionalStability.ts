import { db, collection, query, where, getDocs, addDoc, setDoc, doc } from './firebase';

export interface EmotionalStabilityRecord {
  studentId: string;
  stabilityScore: number;
  volatilityLevel: 'Stable' | 'Moderately Stable' | 'Unstable' | 'Highly Volatile';
  calculatedDate: string;
}

const calculateVariance = (data: number[]) => {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  return variance;
};

export const calculateEmotionalStability = (assessments: any[]) => {
  if (assessments.length < 2) {
    return {
      stabilityScore: 100,
      volatilityLevel: 'Stable' as const,
      varianceDetails: { mood: 0, stress: 0, motivation: 0 }
    };
  }

  const moods: number[] = [];
  const stresses: number[] = [];
  const motivations: number[] = [];

  assessments.forEach(a => {
    // Check if a.scores exists, or fallback to answers array
    const moodScore = a.scores?.mood || Number(a.answers?.find((ans: any) => ans.id.includes('mood'))?.value) || 3;
    const stressScore = a.scores?.academic_stress || Number(a.answers?.find((ans: any) => ans.id.includes('stress'))?.value) || 3;
    const motivationScore = a.scores?.motivation || Number(a.answers?.find((ans: any) => ans.id.includes('motivat'))?.value) || 3;
    
    moods.push(moodScore);
    stresses.push(stressScore);
    motivations.push(motivationScore);
  });

  const moodVariance = calculateVariance(moods);
  const stressVariance = calculateVariance(stresses);
  const motivationVariance = calculateVariance(motivations);

  // Max variance on a 1-5 scale is 4. For 3 metrics, max total variance is 12.
  const totalVariance = moodVariance + stressVariance + motivationVariance;
  
  // Normalize to 0-100 score, where 0 variance = 100 score. 
  // Let's say a total variance of 6 = score of 0
  let stabilityScore = Math.round(100 - (totalVariance / 6) * 100);
  if (stabilityScore < 0) stabilityScore = 0;
  if (stabilityScore > 100) stabilityScore = 100;

  let volatilityLevel: EmotionalStabilityRecord['volatilityLevel'] = 'Stable';
  if (stabilityScore >= 80) volatilityLevel = 'Stable';
  else if (stabilityScore >= 60) volatilityLevel = 'Moderately Stable';
  else if (stabilityScore >= 40) volatilityLevel = 'Unstable';
  else volatilityLevel = 'Highly Volatile';

  return {
    stabilityScore,
    volatilityLevel,
    varianceDetails: {
      mood: moodVariance,
      stress: stressVariance,
      motivation: motivationVariance
    }
  };
};

export const syncEmotionalStability = async (studentId: string, assessments: any[]) => {
  const result = calculateEmotionalStability(assessments);
  const today = new Date().toISOString().split('T')[0];

  const record: EmotionalStabilityRecord = {
    studentId,
    stabilityScore: result.stabilityScore,
    volatilityLevel: result.volatilityLevel,
    calculatedDate: today
  };

  try {
    // Save to Firestore
    await setDoc(doc(db, 'emotional_stability', `${studentId}_${today}`), record);
  } catch (error) {
    console.error("Error saving emotional stability:", error);
  }

  return { ...result, record };
};
