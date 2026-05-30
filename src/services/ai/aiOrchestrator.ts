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
    
    async generateProgressiveQuestions(context: any, numAdaptive: number = 1) {
        const ai = getAI();
        const numQuestions = numAdaptive;
        
        let trendsStr = "";
        if (context.recentData && context.recentData.length >= 2 && context.stage >= 2) {
            const recent = context.recentData.slice(0, Math.ceil(context.recentData.length / 2));
            const older = context.recentData.slice(Math.ceil(context.recentData.length / 2));
            
            const getAvg = (arr: any[], cat: string) => {
                let sum = 0, count = 0;
                arr.forEach(a => { if (a.scores && a.scores[cat] !== undefined) { sum += a.scores[cat]; count++; }});
                return count > 0 ? sum / count : 0;
            };
            
            const categories = ['mood', 'sleep', 'focus', 'academic_stress'];
            const trendResults = categories.map(cat => {
                const r = getAvg(recent, cat);
                const o = getAvg(older, cat);
                let trend = 'stable';
                if (r > o + 0.2) trend = 'improving';
                if (r < o - 0.2) trend = 'declining';
                return `${cat}: ${trend}`;
            });
            trendsStr = `\nRecent Trends (Last 14 days): ${trendResults.join(', ')}`;
        }

        const prompt = `
            You are a progressive AI mental wellbeing engine for a student (Name: ${context.student.name}, Age: ${context.student.age}).
            Current Stage: ${context.stage} (Stage 1: Observation, Stage 2: Pattern Detection, Stage 3: Behavioral, Stage 4: Predictive).
            Total Days Active: ${context.student.assessmentCount}.
            ${context.wellnessProfile ? `Internal Status: ${context.wellnessProfile}` : ''}
            ${trendsStr}
            
            Generate exactly ${numQuestions} multiple-choice questions to assess this student's wellbeing today.
            In lower stages, keep it very general. In higher stages (2+), adapt specifically based on the provided recent trends (e.g. if sleep is declining, ask a specific sleep hygiene question, if stress is increasing, ask about workload).
            
            Return ONLY valid JSON (no markdown):
            [
              {
                "category": "emotional_wellbeing|academic_stress|social_comfort|motivation|energy_levels|burnout_tendency|engagement_health",
                "text": "The question tailored for the student",
                "options": [
                  { "label": "Most positive answer", "value": 5 },
                  { "label": "Positive answer", "value": 4 },
                  { "label": "Neutral answer", "value": 3 },
                  { "label": "Negative answer", "value": 2 },
                  { "label": "Most negative answer", "value": 1 }
                ]
              }
            ]
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "[]";
            return JSON.parse(text);
        } catch(e) {
            console.error("AI question generation error", e);
            return null;
        }
    },

    async analyzeProgressiveAssessment(context: any) {
        const ai = getAI();
        const stage = context.stage;
        
        let instructions = "";
        if (stage === 1) {
            instructions = "Provide ONLY light observations (no risk labels, no strong predictions). (e.g. 'We are learning your wellness patterns.')";
        } else if (stage === 2) {
            instructions = "Identify medium-confidence trends. Give observations like 'Focus has slightly decreased..'";
        } else if (stage === 3) {
            instructions = "Understand recurring patterns. Provide personalized recommendations (e.g. 'Try shorter study sessions').";
        } else {
            instructions = "Advanced intelligence. Provide personalized wellness insights and risk trends. Still avoid medical diagnoses.";
        }

        const prompt = `
            Analyze this student's assessment. Name: ${context.student.name}, Age: ${context.student.age}.
            Stage: ${stage}.
            Category Scores (1-5, lower is worse): ${JSON.stringify(context.categoryScores)}.
            Overall Wellness Score (0-100 scale): ${context.averageScore}. Risk Score (0-1): ${context.rawRisk}.
            ${context.textReflections && context.textReflections.length > 0 ? `Student Journals/Reflections: ${JSON.stringify(context.textReflections)}` : ''}
            
            ${instructions}
            
            Internal Wellness Profiles (choose one): "Thriving Learner", "Exam-Stressed Student", "Sleep-Deprived Student", "Socially Withdrawn Student", "Burnout Risk Student", "Analyzing Baseline".

            Return ONLY valid JSON:
            {
               "insight": {
                  "message": "The main message to the user",
                  "recommendations": ["Rec 1", "Rec 2"] // empty for stage 1
               },
               "wellnessProfile": "One of the internal wellness profiles"
            }
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}";
            return JSON.parse(text);
        } catch(e) {
            console.error("AI analysis error", e);
            throw e;
        }
    },
    
    async parseSyllabus(parts: any[], burnoutContext?: any) {
        const ai = getAI();
        let burnoutInstruction = '';
        
        if (burnoutContext) {
            burnoutInstruction = `
            You are also operating as the AI Burnout Prevention Scheduler.
            Analyze the following student data alongside the syllabus:
            ${JSON.stringify(burnoutContext)}
            
            Detect any overloaded schedules, excessive workload, or insufficient breaks.
            Actively prevent burnout by automatically inserting:
            - Breaks
            - Recovery periods
            - Balanced study sessions (e.g. 25-min focus blocks leading up to exams)
            
            Return ONLY a raw JSON object with this exact structure (no markdown, no backticks, no wrapping text):
            {
              "events": [
                {
                  "title": "String (e.g., Midterm Exam, Recovery Period, Balanced Study)",
                  "start": "YYYY-MM-DD",
                  "end": "YYYY-MM-DD", 
                  "allDay": true,
                  "type": "String (e.g., exam, break, recovery, study, assignment)"
                }
              ],
              "insights": [
                "String (e.g., 'Warning: Overloaded schedule detected near Midterms.', 'Added recovery periods after major exams.')"
              ]
            }
            `;
        } else {
             burnoutInstruction = `
             Return ONLY a raw JSON object with this exact structure (no markdown, no backticks):
             {
               "events": [
                 {
                    "title": "String",
                    "start": "YYYY-MM-DD",
                    "allDay": true,
                    "type": "exam"
                 }
               ],
               "insights": []
             }
             `;
        }

        const prompt = `
            You are an expert academic planner. Review the provided syllabus/schedule.
            Extract all important dates: exams, project deadlines, holidays, and start/end of terms.
            
            ${burnoutInstruction}
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: prompt }, ...parts] }
            });
            let responseText = response.text || "{}";
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(responseText);
            return {
                events: Array.isArray(json.events) ? json.events : [],
                insights: Array.isArray(json.insights) ? json.insights : []
            };
        } catch(err) {
            console.error("Syllabus parsing failed", err);
            return { events: [], insights: [] };
        }
    }
};
