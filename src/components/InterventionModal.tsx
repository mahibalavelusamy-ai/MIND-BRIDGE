import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Star, Zap } from 'lucide-react';
import MicroIntervention from './MicroIntervention';
import { Child } from '../types';
import { db, auth, updateDoc, doc, increment } from '../lib/firebase';

interface InterventionModalProps {
  child: Child;
  onClose: () => void;
}

export default function InterventionModal({ child, onClose }: InterventionModalProps) {
  const [step, setStep] = useState(1);
  const [isAwarding, setIsAwarding] = useState(false);

  const handleComplete = () => {
    setStep(2);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden relative"
      >
        <div className="p-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-2xl shadow-inner">
              {child.avatar}
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-white">Quick Relief</h2>
              <p className="text-sm text-slate-400">Take a moment for yourself {isAwarding && '(Awarding...)'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-8 pb-12">
          {step === 1 ? (
            <MicroIntervention 
              onComplete={handleComplete} 
              onSkip={onClose} 
            />
          ) : (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-6"
            >
              <div className="w-24 h-24 bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                <Star size={48} fill="currentColor" />
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-serif font-bold mb-2 text-white">Great job!</h3>
                <p className="text-slate-400">Taking a moment to breathe is a superpower.</p>
              </div>
              <div className="flex items-center gap-2 text-[#22D3EE] font-bold">
                <Zap size={20} /> +5 Gems earned!
              </div>
              <button 
                onClick={onClose} 
                className="mt-8 px-8 py-3 bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white rounded-full font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                Continue
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
