import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAIInsights(childData: any) {
  try {
    const prompt = `
      As a child mental health expert, analyze the following data for a child named ${childData.name}:
      - Age: ${childData.age}
      - Mood Score: ${childData.moodScore}/10
      - Stress Level: ${childData.stressLevel}
      - Recent Notes: ${childData.notes}
      
      Provide a brief, empathetic insight (2-3 sentences) for the parent. 
      Focus on actionable advice and emotional support.
      Keep the tone warm and professional.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Arjun is showing consistent patterns. Continue monitoring his mood and encourage open communication about his day.";
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return "Arjun is showing consistent patterns. Continue monitoring his mood and encourage open communication about his day.";
  }
}
