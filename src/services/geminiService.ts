import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
      
      Provide exactly 3 concise bullet points of clinical insights and actionable advice for the parent.
      Do not include any introductory or concluding text, just the 3 bullet points starting with "- ". Do not include "Recent Trends" or "Self-Checks" in the output.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || `${childData.name} is showing consistent patterns. Continue monitoring ${pronouns.possessive} mood and encourage open communication about ${pronouns.possessive} day.`;
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || error?.status === 429 || error?.status === 'RESOURCE_EXHAUSTED') {
      console.warn("AI Quota Exceeded for AI Insights.");
    } else {
      console.error("Error fetching AI insights:", error);
    }
    return `${childData.name} is showing consistent patterns. Continue monitoring ${pronouns.possessive} mood and encourage open communication about ${pronouns.possessive} day.`;
  }
}
