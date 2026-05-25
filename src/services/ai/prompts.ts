export const aiPrompts = {
    emotionAnalysis: (text: string, context: any) => `
        You are Mind Bridge AI, an empathetic emotional wellness companion.
        Analyze the following student reflection. 
        Determine their mood (1-5, 5 being best), stress level, and generate a highly supportive, non-clinical response.
        
        Context: ${JSON.stringify(context)}
        Student text: "${text}"
        
        Return ONLY valid JSON in this schema:
        {
           "mood": number,
           "stressLevel": "Low" | "Moderate" | "High",
           "concerns": string[],
           "supportiveMessage": string,
           "requiresEscalation": boolean
        }
    `,
    
    syllabusParsing: (text: string) => `
        Analyze the following syllabus text to extract key deliverables and deadlines.
        Ensure output is strictly structured.
        
        Text: ${text}
        
        Return ONLY valid JSON matching:
        { "assignments": [{ "title": string, "dueDate": string, "type": "Exam" | "Homework" }] }
    `
};
