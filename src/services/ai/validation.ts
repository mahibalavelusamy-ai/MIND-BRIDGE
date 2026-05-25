export function validateEmotions(data: any) {
    // Basic structural validation
    if (typeof data?.mood !== 'number') data.mood = 3;
    if (!['Low', 'Moderate', 'High'].includes(data?.stressLevel)) data.stressLevel = 'Moderate';
    if (!Array.isArray(data?.concerns)) data.concerns = [];
    if (typeof data?.supportiveMessage !== 'string') data.supportiveMessage = "Thank you for sharing your thoughts.";
    if (typeof data?.requiresEscalation !== 'boolean') data.requiresEscalation = false;
    
    // Ensure safe ranges
    data.mood = Math.max(1, Math.min(5, data.mood));
    
    return data;
}

export function validateRisk(data: any) {
    if (!['low', 'medium', 'high'].includes(data?.riskLevel)) data.riskLevel = 'low';
    return data;
}
