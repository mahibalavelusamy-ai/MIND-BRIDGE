import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Download, Trash2, X, Check, Clock, Eye, AlertCircle, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PrivacyConsentService } from '../services/privacy/privacyConsentService';

interface StudentPrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentPrivacySettingsModal({
  isOpen,
  onClose
}: StudentPrivacySettingsModalProps) {
  const {
    selectedChild,
    consentSettings,
    setConsentSettings,
    auditLogs,
    logAccess,
    deleteStudentData,
    user
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'consent' | 'audit' | 'export'>('consent');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  if (!isOpen) return null;

  const currentSettings = consentSettings || PrivacyConsentService.getDefaultConsent(selectedChild?.id || 'default');

  const handleToggle = (key: keyof typeof currentSettings) => {
    const updated = {
      ...currentSettings,
      [key]: !currentSettings[key],
      lastUpdated: new Date().toISOString()
    };
    setConsentSettings(updated);
    logAccess(
      user?.uid || 'student',
      user?.role || 'student',
      'consent_change',
      `Toggled ${String(key)} to ${updated[key]}`
    );
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleExportData = () => {
    const data = PrivacyConsentService.generateDataExport(selectedChild, [], [], auditLogs);
    PrivacyConsentService.downloadJsonFile(data, `mindbridge-${selectedChild?.name?.toLowerCase().replace(/\s+/g, '-') || 'student'}-data.json`);
    logAccess(
      user?.uid || 'student',
      user?.role || 'student',
      'export_data',
      'Generated and downloaded full telemetry JSON archive'
    );
  };

  const handleDeleteConfirmed = () => {
    if (!selectedChild) return;
    const targetId = selectedChild.id;
    logAccess(
      user?.uid || 'student',
      user?.role || 'student',
      'delete_request',
      `Right to be Forgotten invoked for student ${selectedChild.name}`
    );
    deleteStudentData(targetId);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="bg-surface-2 border-b border-border p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                <Shield size={22} />
              </div>
              <div>
                <h2 id="privacy-modal-title" className="text-lg font-bold text-text-main">
                  Privacy & Data Sovereignty
                </h2>
                <p className="text-xs text-text-muted">Manage consent, inspect access audit logs, and export your personal data.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close privacy settings"
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-border bg-bg/50 px-6">
            <button
              onClick={() => setActiveSubTab('consent')}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeSubTab === 'consent'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              Consent Preferences
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeSubTab === 'audit'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              Access Audit Log ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveSubTab('export')}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeSubTab === 'export'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              Export & Delete
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {saveToast && (
              <div className="p-3 bg-accent/15 border border-accent/40 text-accent text-xs rounded-xl flex items-center gap-2">
                <Check size={16} />
                <span>Privacy preferences updated successfully.</span>
              </div>
            )}

            {activeSubTab === 'consent' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-text-main">Share Wellness Telemetry with School Counselor</h4>
                    <p className="text-xs text-text-muted mt-1">Enables assigned educators to view aggregated wellbeing indices.</p>
                  </div>
                  <button
                    onClick={() => handleToggle('shareWithSchool')}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      currentSettings.shareWithSchool ? 'bg-accent justify-end' : 'bg-surface border border-border justify-start'
                    }`}
                    aria-label="Toggle share with school"
                  >
                    <span className="w-4 h-4 rounded-full bg-bg shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-text-main">Parent Visibility: Summary Only</h4>
                    <p className="text-xs text-text-muted mt-1">Restricts parental dashboard to high-level clinical summaries, protecting private notes.</p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = {
                        ...currentSettings,
                        parentVisibility: currentSettings.parentVisibility === 'summary_only' ? ('standard' as const) : ('summary_only' as const),
                        lastUpdated: new Date().toISOString()
                      };
                      setConsentSettings(updated);
                      setSaveToast(true);
                      setTimeout(() => setSaveToast(false), 2500);
                    }}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      currentSettings.parentVisibility === 'summary_only' ? 'bg-accent justify-end' : 'bg-surface border border-border justify-start'
                    }`}
                    aria-label="Toggle parent summary only"
                  >
                    <span className="w-4 h-4 rounded-full bg-bg shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-text-main">AI Longitudinal Trend Analysis</h4>
                    <p className="text-xs text-text-muted mt-1">Allows the AI engine to generate proactive stress forecasts and personalized coping tips.</p>
                  </div>
                  <button
                    onClick={() => handleToggle('allowAiAnalysis')}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      currentSettings.allowAiAnalysis ? 'bg-accent justify-end' : 'bg-surface border border-border justify-start'
                    }`}
                    aria-label="Toggle AI analysis"
                  >
                    <span className="w-4 h-4 rounded-full bg-bg shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-text-main">Anonymize Telemetry for Institutional Research</h4>
                    <p className="text-xs text-text-muted mt-1">Strips all identifying credentials from aggregated wellness statistics.</p>
                  </div>
                  <button
                    onClick={() => handleToggle('anonymizeResearchData')}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      currentSettings.anonymizeResearchData ? 'bg-accent justify-end' : 'bg-surface border border-border justify-start'
                    }`}
                    aria-label="Toggle anonymize research data"
                  >
                    <span className="w-4 h-4 rounded-full bg-bg shadow-sm" />
                  </button>
                </div>
              </div>
            )}

            {activeSubTab === 'audit' && (
              <div className="space-y-3">
                <div className="p-3 bg-surface-2 rounded-xl border border-border text-xs text-text-muted flex items-center gap-2">
                  <Eye size={16} className="text-accent" />
                  <span>Immutable transparency log of who accessed or modified this student's records.</span>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-text-dim text-sm">
                    No access events recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3.5 bg-surface-2 rounded-xl border border-border flex items-start justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-surface border border-border font-mono text-[10px] text-accent uppercase">
                              {log.action}
                            </span>
                            <span className="text-text-muted">by</span>
                            <span className="font-semibold text-text-main">{log.actorRole}</span>
                          </div>
                          <p className="text-text-dim text-[11px]">{log.details}</p>
                        </div>
                        <span className="text-text-dim flex items-center gap-1 text-[11px]">
                          <Clock size={12} />
                          {log.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'export' && (
              <div className="space-y-6">
                {/* Export Card */}
                <div className="p-5 bg-surface-2 rounded-xl border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-accent" />
                    <div>
                      <h4 className="text-sm font-semibold text-text-main">Data Portability (GDPR / FERPA)</h4>
                      <p className="text-xs text-text-muted">Download all check-in telemetry, assessments, scores, and logs in machine-readable JSON format.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-bg font-semibold text-xs rounded-xl hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    <Download size={14} />
                    Download JSON Archive
                  </button>
                </div>

                {/* Right to be Forgotten */}
                <div className="p-5 bg-alert-500/10 rounded-xl border border-alert-500/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <Trash2 size={20} className="text-alert-500" />
                    <div>
                      <h4 className="text-sm font-semibold text-text-main">Right to be Forgotten</h4>
                      <p className="text-xs text-text-muted">Permanently erase all profile records, check-ins, and assessment history from Mind Bridge.</p>
                    </div>
                  </div>

                  {showDeleteConfirm ? (
                    <div className="p-3 bg-surface rounded-lg border border-alert-500/40 space-y-2">
                      <p className="text-xs text-alert-400 font-semibold">
                        Are you absolutely certain? This operation is permanent and cannot be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDeleteConfirmed}
                          className="px-3 py-1.5 bg-alert-500 text-white rounded-lg text-xs font-semibold hover:bg-alert-600 transition-colors"
                        >
                          Confirm & Purge Data
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-3 py-1.5 bg-surface-2 text-text-main rounded-lg text-xs border border-border hover:bg-surface transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-alert-500/40 text-alert-500 font-semibold text-xs rounded-xl hover:bg-alert-500/20 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete My Records
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-surface-2 border-t border-border p-4 px-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
