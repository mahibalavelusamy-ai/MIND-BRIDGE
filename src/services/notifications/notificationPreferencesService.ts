/**
 * Notification Preferences & Quiet Hours Service
 *
 * Provides users (parents, students, educators) with agency over when and how they receive alerts:
 * - Channel routing (inApp, email, sms)
 * - Quiet Hours window (e.g., 22:00 to 07:00)
 * - Critical Safety Bypass: Urgent/critical safety escalations bypass quiet hours to guarantee child safety.
 */

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // "HH:MM" e.g. "22:00"
    endTime: string;   // "HH:MM" e.g. "07:00"
  };
  criticalBypassQuietHours: boolean;
  categoryToggles: {
    academicDeadlines: boolean;
    wellnessReminders: boolean;
    behavioralAnomalies: boolean;
    rewards: boolean;
  };
}

export const NotificationPreferencesService = {
  /**
   * Generates default notification preferences for a user.
   */
  getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      channels: {
        inApp: true,
        email: true,
        sms: false
      },
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '07:00'
      },
      criticalBypassQuietHours: true,
      categoryToggles: {
        academicDeadlines: true,
        wellnessReminders: true,
        behavioralAnomalies: true,
        rewards: true
      }
    };
  },

  /**
   * Determines if the current time falls inside the configured Quiet Hours window.
   */
  isQuietHoursActive(prefs: NotificationPreferences, checkTime: Date = new Date()): boolean {
    if (!prefs.quietHours.enabled) return false;

    const currentMinutes = checkTime.getHours() * 60 + checkTime.getMinutes();

    const [startH, startM] = prefs.quietHours.startTime.split(':').map(Number);
    const [endH, endM] = prefs.quietHours.endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Overnight window (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    // Same-day window (e.g., 13:00 to 15:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  },

  /**
   * Decides whether an alert should produce an immediate notification based on preferences.
   */
  shouldDeliverImmediateAlert(
    alertType: 'critical' | 'warning' | 'info',
    prefs: NotificationPreferences,
    checkTime: Date = new Date()
  ): { deliver: boolean; reason: string } {
    // Critical safety alerts always break through if bypass is enabled
    if (alertType === 'critical' && prefs.criticalBypassQuietHours) {
      return { deliver: true, reason: 'Critical safety alert overrides quiet hours.' };
    }

    if (this.isQuietHoursActive(prefs, checkTime)) {
      return { deliver: false, reason: 'Suppressed: Quiet Hours active.' };
    }

    return { deliver: true, reason: 'Standard delivery.' };
  }
};
