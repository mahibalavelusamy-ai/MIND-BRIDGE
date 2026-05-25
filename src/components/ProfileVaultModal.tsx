import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Child } from '../types';
import { getGradientForChild, cn } from '../lib/utils';
import { X, Lock, Delete } from 'lucide-react';

interface ProfileVaultModalProps {
  child: Child;
  enteredPin: string;
  setEnteredPin: (pin: string) => void;
  pinError: string;
  isShaking: boolean;
  onCancel: () => void;
  onSubmit: (e?: React.FormEvent) => void;
  onRequestAdminReset: () => void;
}

export default function ProfileVaultModal({
  child,
  enteredPin,
  setEnteredPin,
  pinError,
  isShaking,
  onCancel,
  onSubmit,
  onRequestAdminReset
}: ProfileVaultModalProps) {
  useEffect(() => {
    if (enteredPin.length === 4) {
      onSubmit();
    }
  }, [enteredPin, onSubmit]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
    >
      <motion.div 
         initial={{ scale: 0.95, y: 20 }}
         animate={isShaking ? { x: [-10, 10, -10, 10, -5, 5, 0], scale: 1, y: 0 } : { scale: 1, y: 0 }}
         transition={{ duration: isShaking ? 0.4 : 0.4, type: "spring", bounce: 0.25 }}
         className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] max-w-sm w-full mx-4 backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-accent/5 opacity-50 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          
          <button 
            onClick={onCancel} 
            className="absolute -top-2 -right-2 p-2 bg-surface border border-border rounded-full text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
          >
             <X size={20} />
          </button>

          <div className="text-center mb-8 mt-2">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner text-bg border border-white/10",
              `bg-gradient-to-br ${getGradientForChild(child.id)}`
            )}>
              {child.age >= 18 ? <span className="font-serif">{child.name.charAt(0).toUpperCase()}</span> : child.avatar}
            </div>
            <h3 className="text-2xl font-sans font-medium text-text-main">Enter Vault PIN</h3>
            <p className="text-sm text-text-muted mt-2 font-medium">Authentication required for {child.name}</p>
          </div>

          <div className="mb-6">
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setEnteredPin(val);
              }}
              className={cn(
                "w-full h-16 bg-surface-2 border rounded-xl text-center text-4xl tracking-[0.5em] font-mono text-text-main focus:outline-none transition-colors shadow-inner",
                pinError ? "border-amber-500 text-amber-500 focus:border-amber-500" : "border-border focus:border-accent"
              )}
              placeholder="••••"
            />
          </div>

          {pinError && (
            <p className="text-amber-500 text-xs text-center font-bold animate-fade-in mb-4">{pinError}</p>
          )}

          <div className="flex justify-center mt-2">
            <button
               onClick={() => onRequestAdminReset()}
               className="text-sm text-text-muted hover:text-accent transition-colors flex items-center gap-2"
               title="Forgot PIN?"
            >
               <Lock size={16} /> Forgot PIN?
            </button>
          </div>
          
        </div>
      </motion.div>
    </motion.div>
  );
}
