export interface RawDataInput {
  userId: string;
  type: 'assessment' | 'planner' | 'engagement' | 'streak';
  data: any;
  timestamp: string;
}

export const DataIntakeLayer = {
  /**
   * Collects raw data from various sources (assessments, planner events, streaks)
   * and normalizes it for processing.
   */
  async collect(input: RawDataInput) {
    console.log(`Intaking data for user ${input.userId} of type ${input.type}`);
    // In a real application, this might persist to an event streaming platform or staging database.
    return {
      normalizedId: `${input.type}_${Date.now()}`,
      userId: input.userId,
      type: input.type,
      payload: this.normalize(input.type, input.data),
      receivedAt: input.timestamp
    };
  },
  
  normalize(type: string, data: any) {
    // Normalization logic based on type (e.g. standardizing timestamp formats, value scales)
    switch(type) {
      case 'assessment':
        return {
          moodScore: data.mood,
          stressScore: data.stress,
          energyLevel: data.energy || 3,
        };
      case 'planner':
        return {
          tasksCompleted: data.completed || 0,
          tasksAdded: data.added || 0,
          overdueTasks: data.overdue || 0,
        };
      default:
        return data;
    }
  }
};
