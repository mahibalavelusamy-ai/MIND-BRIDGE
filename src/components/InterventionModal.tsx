import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Star, Zap } from 'lucide-react';
import MicroIntervention from './MicroIntervention';
import { Child } from '../types';

interface InterventionModalProps {
  child: Child;
  onClose: () => void;
}

export default function InterventionModal({ child, onClose }: InterventionModalProps) {
  const [step, setStep] = useState(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden relative"
      >
        <div className="p-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
              {child.avatar}
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold">Quick Relief</h2>
              <p className="text-sm text-text-muted">Take a moment for yourself</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-8 pb-12">
          {step === 1 ? (
            <MicroIntervention 
              onComplete={() => setStep(2)} 
              onSkip={onClose} 
            />
          ) : (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-6"
            >
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <Star size={48} fill="currentColor" />
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-serif font-bold mb-2">Great job!</h3>
                <p className="text-text-muted">Taking a moment to breathe is a superpower.</p>
              </div>
              <div className="flex items-center gap-2 text-accent font-bold">
                <Zap size={20} /> +5 Gems earned!
              </div>
              <button 
                onClick={onClose} 
                className="mt-8 px-8 py-3 bg-accent text-white rounded-full font-bold hover:scale-105 transition-all"
              >
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
