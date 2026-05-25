import { AIInterpreter } from './aiInterpreter';

export type AssessmentCategory = 
  | 'emotional_wellbeing'
  | 'academic_stress'
  | 'social_comfort'
  | 'motivation'
  | 'energy_levels'
  | 'self_confidence'
  | 'burnout_tendency'
  | 'engagement_health';

export interface AdaptiveQuestion {
  id: string;
  category: AssessmentCategory;
  text: string;
  options: { label: string; value: number; followUpCategory?: AssessmentCategory }[];
}

// Question Bank
const QUESTION_BANK: Record<AssessmentCategory, AdaptiveQuestion[]> = {
  emotional_wellbeing: [
    {
      id: 'ew_1',
      category: 'emotional_wellbeing',
      text: "How have you been feeling overall this week?",
      options: [
        { label: "Pretty great! I've been in a good mood.", value: 5 },
        { label: "It's been an okay week, feeling stable.", value: 4 },
        { label: "A bit up and down, but manageable.", value: 3 },
        { label: "Struggling a bit, kind of down.", value: 2, followUpCategory: 'burnout_tendency' },
        { label: "Really down and exhausted.", value: 1, followUpCategory: 'burnout_tendency' }
      ]
    },
    {
      id: 'ew_2',
      category: 'emotional_wellbeing',
      text: "When you wake up, how ready are you for the day?",
      options: [
        { label: "Ready to go!", value: 5 },
        { label: "Takes a minute, but I get up.", value: 4 },
        { label: "Neutral.", value: 3 },
        { label: "Hard to get out of bed.", value: 2, followUpCategory: 'energy_levels' },
        { label: "I dread waking up.", value: 1, followUpCategory: 'energy_levels' }
      ]
    }
  ],
  academic_stress: [
    {
      id: 'as_1',
      category: 'academic_stress',
      text: "How do you feel about your workload right now?",
      options: [
        { label: "Completely under control.", value: 5 },
        { label: "Busy but handling it.", value: 4 },
        { label: "Getting a bit heavy.", value: 3 },
        { label: "I feel overwhelmed.", value: 2 },
        { label: "I feel like I'm drowning in work.", value: 1 }
      ]
    }
  ],
  burnout_tendency: [
    {
      id: 'bt_1',
      category: 'burnout_tendency',
      text: "Have you noticed yourself caring less about things you usually enjoy?",
      options: [
        { label: "Not at all, I'm fully engaged.", value: 5 },
        { label: "Mostly still care.", value: 4 },
        { label: "Sometimes feeling detached.", value: 3 },
        { label: "Yes, losing interest lately.", value: 2 },
        { label: "I feel completely detached.", value: 1 }
      ]
    }
  ],
  energy_levels: [
    {
      id: 'en_1',
      category: 'energy_levels',
      text: "How is your energy throughout the day?",
      options: [
        { label: "Consistently high.", value: 5 },
        { label: "Good, with minor dips.", value: 4 },
        { label: "Okay.", value: 3 },
        { label: "Often feeling drained.", value: 2 },
        { label: "Constantly exhausted.", value: 1 }
      ]
    }
  ],
  motivation: [
    {
      id: 'mo_1',
      category: 'motivation',
      text: "How motivated are you to tackle your daily tasks?",
      options: [
        { label: "Highly motivated!", value: 5 },
        { label: "Fairly motivated.", value: 4 },
        { label: "Neutral.", value: 3 },
        { label: "Low motivation.", value: 2 },
        { label: "No motivation at all.", value: 1 }
      ]
    }
  ],
  self_confidence: [
    {
      id: 'sc_1',
      category: 'self_confidence',
      text: "How confident do you feel in your abilities lately?",
      options: [
        { label: "Very confident.", value: 5 },
        { label: "Confident.", value: 4 },
        { label: "Unsure.", value: 3 },
        { label: "Doubtful.", value: 2 },
        { label: "Not confident at all.", value: 1 }
      ]
    }
  ],
  social_comfort: [
    {
      id: 'soc_1',
      category: 'social_comfort',
      text: "How comfortable have you been around others this week?",
      options: [
        { label: "Very comfortable and social.", value: 5 },
        { label: "Comfortable enough.", value: 4 },
        { label: "Neutral.", value: 3 },
        { label: "Preferring to be alone.", value: 2 },
        { label: "Avoiding social interaction completely.", value: 1 }
      ]
    }
  ],
  engagement_health: [
    {
      id: 'eh_1',
      category: 'engagement_health',
      text: "Are you finding time to do the things you love?",
      options: [
        { label: "Absolutely, lots of time.", value: 5 },
        { label: "Some time.", value: 4 },
        { label: "Not enough time.", value: 3 },
        { label: "Rarely.", value: 2 },
        { label: "Not at all.", value: 1 }
      ]
    }
  ]
};

export const AdaptiveAssessmentEngine = {
  /**
   * Initializes a set of questions for a new session.
   */
  initializeSession(age: number): AdaptiveQuestion[] {
    // Start with core categories
    const initialCategories: AssessmentCategory[] = ['emotional_wellbeing', 'academic_stress', 'energy_levels', 'motivation'];
    
    return initialCategories.map(cat => {
      const qBank = QUESTION_BANK[cat];
      return qBank[Math.floor(Math.random() * qBank.length)];
    });
  },

  /**
   * Evaluates the answers and determines if follow-up questions are needed.
   */
  evaluateFollowUps(currentQuestions: AdaptiveQuestion[], answers: Record<string, number>): AdaptiveQuestion[] {
    const nextQuestions: AdaptiveQuestion[] = [...currentQuestions];
    let addedFollowUps = false;

    currentQuestions.forEach(q => {
      const answerVal = answers[q.id];
      if (answerVal !== undefined) {
        const selectedOption = q.options.find(opt => opt.value === answerVal);
        if (selectedOption && selectedOption.followUpCategory) {
          const cat = selectedOption.followUpCategory;
          // Ensure we don't already have a question from this category in the array
          const hasCategory = nextQuestions.find(nq => nq.category === cat);
          if (!hasCategory && nextQuestions.length < 7) { // limit total questions
            const newQ = QUESTION_BANK[cat][Math.floor(Math.random() * QUESTION_BANK[cat].length)];
            nextQuestions.push(newQ);
            addedFollowUps = true;
          }
        }
      }
    });

    return addedFollowUps ? nextQuestions : [];
  },

  /**
   * Maps raw scores to a risk profile and structured output.
   */
  generateAssessmentOutcome(answers: Record<string, number>, questions: AdaptiveQuestion[]) {
    let totalScore = 0;
    let count = 0;
    const categoryScores: Record<string, number> = {};

    questions.forEach(q => {
      const val = answers[q.id];
      if (val !== undefined) {
        totalScore += val;
        count++;
        categoryScores[q.category] = val;
      }
    });

    const averageScore = count > 0 ? totalScore / count : 0;
    
    // Normalize risk: 5 -> 0.0, 1 -> 1.0
    const rawRisk = Math.max(0, Math.min(1, (5 - averageScore) / 4));
    
    return {
      averageScore,
      categoryScores,
      riskLevel: rawRisk > 0.7 ? 'high' : rawRisk > 0.4 ? 'medium' : 'low',
      riskScore: rawRisk,
      isBurnoutRisk: (categoryScores['burnout_tendency'] !== undefined && categoryScores['burnout_tendency'] <= 2) || (rawRisk > 0.6)
    };
  }
};
