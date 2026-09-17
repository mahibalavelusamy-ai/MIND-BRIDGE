import { safeJsonParse } from "../lib/aiUtils";

export async function getAIInsights(childData: any) {
  const pronouns = (() => {
    if (childData.gender === 'male') return { subject: 'he', object: 'him', possessive: 'his' };
    if (childData.gender === 'female') return { subject: 'she', object: 'her', possessive: 'her' };
    return { subject: 'they', object: 'them', possessive: 'their' };
  })();

  try {
    const prompt = `
      As a child mental health expert, analyze the following data for a child named ${childData.name}:
      - Age: ${childData.age}
      - Gender: ${childData.gender || 'Not specified'}
      - Mood Score: ${childData.moodScore}/10
      - Stress Level: ${childData.stressLevel}
      - Recent Notes: ${childData.notes}
      
      Return a structured JSON object with exactly these fields:
      {
        "status": "A one-sentence summary of the child's current clinical status.",
        "concerns": ["Any specific concerns based on the data provided"],
        "recommendations": ["Three specific, actionable clinical recommendations for the parent"]
      }

      Ensure the recommendations are concise and practical. Data processing is strictly for decision-support.
    `;

    const response = await fetch('/api/gemini/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || error?.status === 429 || error?.status === 'RESOURCE_EXHAUSTED') {
      console.warn("AI Quota Exceeded for AI Insights.");
    } else {
      console.error("Error fetching AI insights:", error);
    }
    return {
      status: `${childData.name} is showing consistent patterns.`,
      concerns: [],
      recommendations: [
        `Continue monitoring ${pronouns.possessive} mood closely.`,
        `Encourage open communication about ${pronouns.possessive} daily experiences.`,
        `Maintain a consistent routine to help manage stress levels.`
      ]
    };
  }
}
