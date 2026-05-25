import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || "placeholder" });
    }
    return aiInstance;
};

export const AIInterpreter = {
  async generateSupportiveSummary(metrics: { emotionalRisk: number; overloadRisk: number; burnoutRisk: number }, role: 'student' | 'parent' | 'teacher'): Promise<string> {
    
    // As per rules, we must NEVER feel clinical. Always emotionally safe.
    
    const isStressed = metrics.overloadRisk >= 0.7;
    const isLowEnergy = metrics.burnoutRisk >= 0.7;
    const isThriving = metrics.emotionalRisk <= 0.3 && !isStressed && !isLowEnergy;
    
    // Fallback if API is missing or fails
    const fallback = () => {
      if (role === 'student') return isThriving ? "You're doing fantastic! You've found a great rhythm. Keep making time for the things you enjoy, and stay proud of your progress." : "You're navigating your week steadily. Remember to listen to your mind and body. Small moments of rest can make a huge difference in how you feel.";
      if (role === 'parent') return isThriving ? "Your child is showing very healthy engagement and steady emotional consistency." : "Your child's wellness profile is generally stable. Continue to provide a supportive environment.";
      return "The student is maintaining a stable baseline.";
    };

    try {
      const ai = getAI();
      const prompt = `
        You are a supportive, non-clinical emotional wellness AI for students.
        We have a new wellness check-in from a student.
        Metrics:
        - Emotional Risk (0-1): ${metrics.emotionalRisk}
        - Overload Risk (0-1): ${metrics.overloadRisk}
        - Burnout Risk (0-1): ${metrics.burnoutRisk}
        
        The audience reading this summary is: ${role}.
        
        Task: Write a short (2-3 sentences max) supportive summary based on these metrics.
        Rules:
        1. NEVER diagnose mental illness or use clinical psychiatric labels.
        2. Keep it emotionally safe, supportive, and futuristic.
        3. If audience is 'student', speak directly safely ("You're doing...").
        4. If audience is 'parent' or 'teacher', advise supportively but protect student's deep privacy.
        5. DO NOT use fear-inducing terms. Focus on encouragement and balance.
        
        Return ONLY the text paragraph.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      
      if (response.text) return response.text.trim();
      return fallback();
      
    } catch (e) {
      console.error("Failed to generate AI summary:", e);
      return fallback();
    }
  }
};
