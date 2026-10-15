import { describe, it, expect } from 'vitest';
import { NotificationPreferencesService } from './notificationPreferencesService';

describe('NotificationPreferencesService', () => {
  const defaultPrefs = NotificationPreferencesService.getDefaultPreferences('user-1');

  describe('isQuietHoursActive', () => {
    it('returns false if quiet hours is disabled', () => {
      const disabledPrefs = {
        ...defaultPrefs,
        quietHours: { ...defaultPrefs.quietHours, enabled: false }
      };
      const checkDate = new Date('2026-10-15T23:30:00');
      expect(NotificationPreferencesService.isQuietHoursActive(disabledPrefs, checkDate)).toBe(false);
    });

    it('returns true during overnight quiet hours (e.g. 23:00 for 22:00-07:00)', () => {
      // 23:30
      const nightDate = new Date();
      nightDate.setHours(23, 30, 0, 0);
      expect(NotificationPreferencesService.isQuietHoursActive(defaultPrefs, nightDate)).toBe(true);

      // 05:00 morning
      const earlyMorning = new Date();
      earlyMorning.setHours(5, 0, 0, 0);
      expect(NotificationPreferencesService.isQuietHoursActive(defaultPrefs, earlyMorning)).toBe(true);
    });

    it('returns false during active daytime hours (e.g. 14:00)', () => {
      const afternoon = new Date();
      afternoon.setHours(14, 0, 0, 0);
      expect(NotificationPreferencesService.isQuietHoursActive(defaultPrefs, afternoon)).toBe(false);
    });
  });

  describe('shouldDeliverImmediateAlert', () => {
    it('delivers critical crisis alerts immediately even during quiet hours when bypass is enabled', () => {
      const midnight = new Date();
      midnight.setHours(0, 30, 0, 0);

      const decision = NotificationPreferencesService.shouldDeliverImmediateAlert('critical', defaultPrefs, midnight);
      expect(decision.deliver).toBe(true);
      expect(decision.reason).toContain('Critical safety alert overrides quiet hours');
    });

    it('suppresses non-critical alerts during quiet hours', () => {
      const midnight = new Date();
      midnight.setHours(0, 30, 0, 0);

      const decision = NotificationPreferencesService.shouldDeliverImmediateAlert('warning', defaultPrefs, midnight);
      expect(decision.deliver).toBe(false);
      expect(decision.reason).toContain('Suppressed: Quiet Hours active');
    });

    it('delivers standard warnings during daytime', () => {
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);

      const decision = NotificationPreferencesService.shouldDeliverImmediateAlert('warning', defaultPrefs, noon);
      expect(decision.deliver).toBe(true);
      expect(decision.reason).toBe('Standard delivery.');
    });
  });
});
