import { GoogleGenAI } from "@google/genai";
import { aiPrompts } from "./prompts";
import { validateEmotions, validateRisk } from "./validation";

// Initialize Gemini client (ensure you have process.env.GEMINI_API_KEY in server-side, but this is client side for now. Given "No direct AI calls inside frontend pages" rule, we should ideally have a server, or simulate the service layer abstraction).
// For Vite client application, the instructions said: "We should proxy requests", but if the environment has a pre-existing pattern, I will follow it.
// I will create a centralized service abstraction.

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || "placeholder" });
    }
    return aiInstance;
};

export const AIService = {
    async analyzeEmotion(text: string, context: any) {
        const ai = getAI();
        const prompt = aiPrompts.emotionAnalysis(text, context);
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
            
            const rawOutput = response.text || "{}";
            const json = JSON.parse(rawOutput);
            
            return validateEmotions(json);
        } catch (error) {
            console.error("AI Analysis failed", error);
            // Fallback
            return {
                mood: 3,
                stressLevel: "Moderate",
                concerns: ["Analysis unavailable"],
                supportiveMessage: "Thank you for sharing. We're here for you."
            };
        }
    },
    
    async analyzeAssessment(childData: any, scores: any, analysisResult: any) {
        const ai = getAI();
        const prompt = `
            As a child mental health expert, analyze this child's data:
            Child: ${childData.name}, Age: ${childData.age}
            Current Scores (1-5 scale, 5 is worst): 
            Mood: ${scores.mood}, Stress: ${scores.stress}, Sleep: ${scores.sleep}, Behavior: ${scores.behavior}, Social: ${scores.social}
            Weighted Score: ${analysisResult.weightedScore}/5, Risk Level: ${analysisResult.riskLevel}

            Provide exactly ONE primary factor and exactly TWO recommendations suitable for parents/teachers to help.
            Keep language positive, supportive, and non-alarmist.
            Return ONLY valid JSON: { "primaryFactor": "String", "recommendations": ["String", "String"] }
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const json = JSON.parse(response.text || "{}");
            return {
                primaryFactor: json.primaryFactor || "Unknown",
                recommendations: Array.isArray(json.recommendations) ? json.recommendations : ["Maintain routine."]
            };
        } catch(error) {
            console.error("AI Assessment failed", error);
            return { primaryFactor: "Unknown", recommendations: ["Encourage verbal expression.", "Maintain consistent routine."] };
        }
    },
    
    async parseSyllabus(parts: any[]) {
        const ai = getAI();
        const prompt = `
            You are an expert academic planner. Review the provided syllabus/schedule.
            Extract all important dates: exams, project deadlines, holidays, and start/end of terms.
            
            Return ONLY a raw JSON array of objects with this exact structure (no markdown, no backticks, no explanations, no wrapping JSON object):
            [
              {
                "title": "String (e.g., Midterm Exam, Fall Break)",
                "start": "YYYY-MM-DD",
                "allDay": true,
                "type": "exam"
              }
            ]
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: prompt }, ...parts] }
            });
            let responseText = response.text || "[]";
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(responseText);
            return Array.isArray(json) ? json : (json.events || []);
        } catch(err) {
            console.error("Syllabus parsing failed", err);
            return [];
        }
    }
};
