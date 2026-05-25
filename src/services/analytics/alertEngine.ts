export interface AnalyticsAlert {
  id: string;
  userId: string;
  type: 'stress_spike' | 'engagement_decline' | 'streak_collapse' | 'overload' | 'missed_checkins';
  level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

/**
 * Realtime Alert Engine
 * Triggers alerts based on risk thresholds and sudden behavioral shifts.
 */
export const AlertEngine = {
  evaluateRiskProfile(userId: string, currentRisk: any, previousRisk: any): AnalyticsAlert[] {
    const alerts: AnalyticsAlert[] = [];
    const timestamp = new Date().toISOString();
    
    // Example: Sudden stress spike
    if (currentRisk.emotionalRisk > 0.8 && previousRisk?.emotionalRisk < 0.5) {
      alerts.push({
        id: `alert_spike_${Date.now()}`,
        userId,
        type: 'stress_spike',
        level: 'high',
        message: 'Sudden increase in emotional stress detected.',
        timestamp,
        status: 'active'
      });
    }

    // Example: Academic Overload
    if (currentRisk.overloadRisk > 0.9) {
      alerts.push({
        id: `alert_overload_${Date.now()}`,
        userId,
        type: 'overload',
        level: 'critical',
        message: 'High academic overload and deadline pressure detected.',
        timestamp,
        status: 'active'
      });
    }
    
    // Example: Disengagement
    if (currentRisk.disengagementRisk > 0.7) {
      alerts.push({
        id: `alert_disengage_${Date.now()}`,
        userId,
        type: 'engagement_decline',
        level: 'medium',
        message: 'Significant drop in platform engagement.',
        timestamp,
        status: 'active'
      });
    }
    
    return alerts;
  },
  
  publishAlerts(alerts: AnalyticsAlert[]) {
    // In production, this would write to Firestore to trigger
    // realtime subscriptions for CareTakers and Users.
    // console.log("Publishing alerts:", alerts);
    return alerts;
  }
};
