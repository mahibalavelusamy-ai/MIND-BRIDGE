import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhoneCall, ShieldAlert, Heart, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { INDIAN_HELPLINES, CrisisIncident } from '../services/crisis/crisisEscalationService';

interface CrisisEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident?: CrisisIncident | null;
  userRole?: string;
}

export default function CrisisEscalationModal({
  isOpen,
  onClose,
  incident,
  userRole = 'student'
}: CrisisEscalationModalProps) {
  if (!isOpen) return null;

  const isCaregiverOrCounselor = userRole === 'parent' || userRole === 'counselor' || userRole === 'teacher';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crisis-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="w-full max-w-2xl bg-surface border border-alert-500/40 rounded-2xl shadow-[0_0_50px_rgba(255,51,102,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-alert-500/20 via-surface to-accent/10 border-b border-alert-500/30 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-alert-500/20 border border-alert-500/40 flex items-center justify-center text-alert-500 animate-pulse-soft">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h2 id="crisis-modal-title" className="text-xl font-bold text-text-main flex items-center gap-2">
                  Immediate Support & Helplines
                </h2>
                <p className="text-xs text-text-muted">You are never alone. Confidential, free assistance is available 24/7.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close crisis support modal"
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-2 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Contextual Notice */}
            {isCaregiverOrCounselor ? (
              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
                <div className="flex items-center gap-2 text-warning-400 font-semibold text-sm">
                  <AlertTriangle size={18} />
                  <span>Clinical Confidentiality Notice</span>
                </div>
                <p className="text-sm text-text-muted">
                  To protect student trust and encourage safe reflection, personal diary text is strictly private.
                  Below is the synthesized overview:
                </p>
                <div className="p-3 bg-bg rounded-lg border border-border text-xs text-text-main font-mono">
                  {incident?.redactedSummary || 'Elevated emotional vulnerability detected. Caretaker presence and empathetic check-in advised.'}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 flex items-start gap-3">
                <Heart size={20} className="text-accent mt-0.5 shrink-0" />
                <p className="text-sm text-text-main leading-relaxed">
                  Taking a breath right now is okay. You don't have to carry heavy feelings by yourself.
                  Reach out to one of the trained, compassionate counselors below who are ready to listen without judgment.
                </p>
              </div>
            )}

            {/* National Helplines Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <PhoneCall size={16} className="text-accent" />
                24/7 Toll-Free Support Lines (India)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INDIAN_HELPLINES.map((helpline) => (
                  <div
                    key={helpline.number}
                    className={`p-4 rounded-xl border transition-all ${
                      helpline.isPrimary
                        ? 'bg-alert-500/10 border-alert-500/50 shadow-[0_0_15px_rgba(255,51,102,0.15)]'
                        : 'bg-surface-2 border-border hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-text-main text-sm">{helpline.name}</h4>
                        <p className="text-xs text-text-muted mt-1 leading-snug">{helpline.description}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-accent">
                        {helpline.hours}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-accent">{helpline.number}</span>
                      <a
                        href={`tel:${helpline.number.replace(/\s+/g, '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                        aria-label={`Call ${helpline.name} at ${helpline.number}`}
                      >
                        <PhoneCall size={12} />
                        Call Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-surface-2 border-t border-border p-4 px-6 flex items-center justify-between">
            <span className="text-xs text-text-dim">Mind Bridge Emotional Safety Net</span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-surface border border-border hover:bg-surface-2 text-text-main text-sm font-medium transition-colors"
            >
              I Understand & Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
