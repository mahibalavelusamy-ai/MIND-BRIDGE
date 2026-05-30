import { AIService } from './aiOrchestrator';
import { Child } from '../../types';
import { QUESTION_BANK, BaseQuestion } from './questionBank';
import { db, collection, query, where, getDocs, orderBy, limit, auth } from '../../lib/firebase';

export interface AdaptiveQuestion extends BaseQuestion {
  options: { label: string; value: number }[];
}

export const ProgressiveAssessmentEngine = {
  // Select a random standard question from a specific category
  getRandomCategoryQuestion(category: string, excludeIds: string[]): AdaptiveQuestion {
    const candidates = QUESTION_BANK.filter(q => q.category === category && !q.isOpenEnded && !excludeIds.includes(q.id));
    const finalCandidates = candidates.length > 0 ? candidates : QUESTION_BANK.filter(q => q.category === category && !q.isOpenEnded); // Fallback if all exhausted
    if (finalCandidates.length === 0) throw new Error("No questions found for category " + category);
    const selected = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
    return selected as AdaptiveQuestion;
  },

  async generateQuestions(child: Child, recentAssessments: any[] = []): Promise<AdaptiveQuestion[]> {
    const daysActive = child.assessmentCount || 0;
    
    // Stages: 1 (0-6), 2 (7-13), 3 (14-29), 4 (30+)
    let stage = 1;
    if (daysActive >= 30) stage = 4;
    else if (daysActive >= 14) stage = 3;
    else if (daysActive >= 7) stage = 2;

    const askedQuestions: string[] = [];
    const fetchedRecentAssessments: any[] = [];
    
    // Anti-Repetition Logic: Fetch recent assessment history from the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    try {
        const qHistory = auth.currentUser?.uid === child.id 
          ? query(collection(db, 'assessments'), where('childId', '==', child.id), where('timestamp', '>=', fourteenDaysAgo.toISOString().split('T')[0]), orderBy('timestamp', 'desc'))
          : query(collection(db, 'assessments'), where('childId', '==', child.id), where('parentId', '==', auth.currentUser?.uid), where('timestamp', '>=', fourteenDaysAgo.toISOString().split('T')[0]), orderBy('timestamp', 'desc'));
        const historySnap = await getDocs(qHistory);
        historySnap.docs.forEach(doc => {
            const data = doc.data();
            fetchedRecentAssessments.push(data);
            if (data.questionsAsked) {
                // track which question IDs were asked
                data.questionsAsked.forEach((qid: string) => askedQuestions.push(qid));
            }
        });
    } catch (e) {
        console.error("Anti-repetition fetch failed", e);
    }

    let finalQuestions: AdaptiveQuestion[] = [];

    // Daily structure: 2 Mood, 1 Academic Stress, 1 Focus, 1 Sleep, 1 Social, 1 Motivation, 1 AI Adaptive = 8 questions total.
    const distribution = ['mood', 'mood', 'academic_stress', 'focus', 'sleep', 'social', 'motivation'];
    
    for(const c of distribution) {
        try {
            const q = this.getRandomCategoryQuestion(c, askedQuestions);
            finalQuestions.push(q);
            askedQuestions.push(q.id);
        } catch(e) {
            console.error("Failed to fetch categorized question", e);
        }
    }

    // Generate AI Adaptive Questions based on trends (stage >= 2)
    let numAdaptive = 1;
    
    try {
        const aiQuestions = await AIService.generateProgressiveQuestions({
            student: { name: child.name, age: child.age, assessmentCount: daysActive },
            stage,
            recentData: fetchedRecentAssessments.length > 0 ? fetchedRecentAssessments : recentAssessments,
            wellnessProfile: child.wellnessProfile
        }, numAdaptive);
        
        if (aiQuestions && aiQuestions.length > 0) {
            const mappedAi: AdaptiveQuestion[] = aiQuestions.map((q: any, i: number) => ({
                id: `ai_${Date.now()}_${i}`,
                category: q.category || 'emotional_wellbeing',
                text: q.text,
                options: q.options || [
                    { label: "Excellent", value: 5 }, { label: "Good", value: 4 }, { label: "Okay", value: 3 }, { label: "Not great", value: 2 }, { label: "Struggling", value: 1 }
                ]
            }));
            
            // Limit to required count 
            finalQuestions = [...finalQuestions, ...mappedAi].slice(0, 8);
        }
    } catch (e) {
        console.error("AI question generation failed.", e);
        if (finalQuestions.length < 8) {
            try { finalQuestions.push(this.getRandomCategoryQuestion('confidence', askedQuestions)); } catch(e){}
        }
    }
    
    // Periodically add an optional reflection question (maybe every 3 days)
    if (daysActive % 3 === 0) {
        const refs = QUESTION_BANK.filter(q => q.isOpenEnded);
        const refQ = refs[Math.floor(Math.random() * refs.length)];
        finalQuestions.push({
           ...refQ,
           options: [] // Open ended
        } as AdaptiveQuestion);
    }

    // Shuffle questions
    return finalQuestions.sort(() => Math.random() - 0.5);
  },

  async analyzeOutcome(answers: Record<string, number>, textAnswers: Record<string, string>, questions: AdaptiveQuestion[], child: Child) {
    let totalScore = 0;
    let count = 0;
    const categoryScores: Record<string, number> = {};

    questions.forEach(q => {
      const val = answers[q.id];
      if (val !== undefined) {
        totalScore += val;
        count++;
        // Maintain category average
        if (categoryScores[q.category]) {
           categoryScores[q.category] = (categoryScores[q.category] + val) / 2;
        } else {
           categoryScores[q.category] = val;
        }
      }
    });

    const averageScore = count > 0 ? totalScore / count : 0;
    
    // Apply weighted analytics model
    const weights: Record<string, number> = {
      'mood': 0.20,
      'sleep': 0.20,
      'academic_stress': 0.15,
      'focus': 0.15,
      'social': 0.10,
      'motivation': 0.10,
      'confidence': 0.05,
      'support_system': 0.05
    };
    
    let weightedSum = 0;
    let weightTotal = 0;
    
    for (const [cat, val] of Object.entries(categoryScores)) {
        if (weights[cat]) {
            weightedSum += (val * weights[cat]);
            weightTotal += weights[cat];
        }
    }
    
    // Normalize to 100
    const normalizedScore = weightTotal > 0 ? (weightedSum / weightTotal) * 20 : averageScore * 20;
    const finalWellnessScore = Math.round(Math.max(0, Math.min(100, normalizedScore)));

    const rawRisk = Math.max(0, Math.min(1, (100 - finalWellnessScore) / 100));
    
    // In actual implementation this would be more complex
    const isBurnoutRisk = (categoryScores['burnout_tendency'] !== undefined && categoryScores['burnout_tendency'] <= 2) || (rawRisk > 0.6) || (categoryScores['academic_stress'] <= 2);

    const daysActive = (child.assessmentCount || 0) + 1;
    let stage = 1;
    if (daysActive >= 30) stage = 4;
    else if (daysActive >= 14) stage = 3;
    else if (daysActive >= 7) stage = 2;

    let aiInsight = null;
    let newProfile = child.wellnessProfile || 'Analyzing Baseline';

    try {
        const analysis = await AIService.analyzeProgressiveAssessment({
            student: { name: child.name, age: child.age, assessmentCount: daysActive },
            stage,
            categoryScores,
            averageScore: finalWellnessScore, // using 0-100 scale now
            rawRisk,
            textReflections: Object.values(textAnswers)
        });
        aiInsight = analysis.insight;
        if (analysis.wellnessProfile) {
            newProfile = analysis.wellnessProfile;
        }
    } catch(e) {
        console.error("AI Analysis failed", e);
    }

    if (!aiInsight) {
        aiInsight = {
            message: stage === 1 ? "Thank you for checking in regularly." : "Great job completing your assessment.",
            recommendations: stage >= 3 ? ["Keep taking breaks during study sessions."] : []
        };
    }

    return {
      averageScore: finalWellnessScore,
      categoryScores,
      riskLevel: stage >= 3 ? (rawRisk > 0.7 ? 'high' : rawRisk > 0.4 ? 'medium' : 'low') : 'low',
      riskScore: stage >= 2 ? rawRisk : 0,
      isBurnoutRisk: stage >= 3 ? isBurnoutRisk : false,
      aiInsight,
      wellnessProfile: newProfile,
      stage
    };
  }
};
