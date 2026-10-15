import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Moon, ShieldCheck, X, Check, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { NotificationPreferencesService, NotificationPreferences } from '../services/notifications/notificationPreferencesService';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPreferencesModal({
  isOpen,
  onClose
}: NotificationPreferencesModalProps) {
  const { notificationPreferences, setNotificationPreferences, user } = useAppStore();
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => {
    return notificationPreferences || NotificationPreferencesService.getDefaultPreferences(user?.uid || 'user');
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setNotificationPreferences(prefs);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-prefs-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="bg-surface-2 border-b border-border p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                <Bell size={22} />
              </div>
              <div>
                <h2 id="notif-prefs-title" className="text-lg font-bold text-text-main">
                  Notification Center & Quiet Hours
                </h2>
                <p className="text-xs text-text-muted">Configure delivery channels, quiet schedules, and critical emergency overrides.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close notification settings"
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {saveSuccess && (
              <div className="p-3 bg-accent/15 border border-accent/40 text-accent rounded-xl flex items-center gap-2">
                <Check size={16} />
                <span>Notification preferences updated.</span>
              </div>
            )}

            {/* Channels */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Delivery Channels</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'inApp', label: 'In-App Inbox' },
                  { key: 'email', label: 'Email Digest' },
                  { key: 'sms', label: 'SMS Alerts' }
                ].map(({ key, label }) => {
                  const active = (prefs.channels as any)[key];
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setPrefs(prev => ({
                          ...prev,
                          channels: { ...prev.channels, [key]: !active }
                        }))
                      }
                      className={`p-3 rounded-xl border text-center transition-all ${
                        active
                          ? 'bg-accent/15 border-accent text-accent font-semibold shadow-sm'
                          : 'bg-surface-2 border-border text-text-muted hover:text-text-main'
                      }`}
                    >
                      <div className="text-xs">{label}</div>
                      <span className="text-[10px] text-text-dim mt-1 block">{active ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon size={18} className="text-accent" />
                  <div>
                    <h4 className="font-semibold text-text-main text-sm">Quiet Hours Routine</h4>
                    <p className="text-[11px] text-text-muted">Silences non-emergency notifications during sleep or focus hours.</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setPrefs(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled }
                    }))
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    prefs.quietHours.enabled ? 'bg-accent justify-end' : 'bg-surface border border-border justify-start'
                  }`}
                  aria-label="Toggle quiet hours"
                >
                  <span className="w-4 h-4 rounded-full bg-bg shadow-sm" />
                </button>
              </div>

              {prefs.quietHours.enabled && (
                <div className="pt-3 border-t border-border flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] text-text-muted flex items-center gap-1">
                      <Clock size={12} /> Start Time
                    </label>
                    <input
                      type="time"
                      value={prefs.quietHours.startTime}
                      onChange={e =>
                        setPrefs(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, startTime: e.target.value }
                        }))
                      }
                      className="w-full bg-surface border border-border rounded-lg p-2 text-text-main font-mono text-xs focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] text-text-muted flex items-center gap-1">
                      <Clock size={12} /> End Time
                    </label>
                    <input
                      type="time"
                      value={prefs.quietHours.endTime}
                      onChange={e =>
                        setPrefs(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, endTime: e.target.value }
                        }))
                      }
                      className="w-full bg-surface border border-border rounded-lg p-2 text-text-main font-mono text-xs focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Critical Bypass Override */}
            <div className="p-4 bg-alert-500/10 rounded-xl border border-alert-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-alert-400" />
                <div>
                  <h4 className="font-semibold text-text-main text-xs">Critical Crisis Bypass (Recommended)</h4>
                  <p className="text-[11px] text-text-muted">High-priority psychological crisis escalations always deliver immediately, even during quiet hours.</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setPrefs(prev => ({
                    ...prev,
                    criticalBypassQuietHours: !prev.criticalBypassQuietHours
                  }))
                }
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  prefs.criticalBypassQuietHours ? 'bg-alert-500 justify-end' : 'bg-surface border border-border justify-start'
                }`}
                aria-label="Toggle critical bypass"
              >
                <span className="w-4 h-4 rounded-full bg-bg shadow-sm" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-surface-2 border-t border-border p-4 px-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface border border-border text-text-muted hover:text-text-main text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
            >
              Save Preferences
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
