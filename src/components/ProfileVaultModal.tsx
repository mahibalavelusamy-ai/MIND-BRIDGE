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
  const handleKeyClick = (num: number) => {
    if (enteredPin.length < 4) {
      setEnteredPin(enteredPin + num);
    }
  };

  const handleBackspace = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
    }
  };

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

          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index}
                className={cn(
                  "w-5 h-5 rounded-full transition-all duration-300 border-2",
                  enteredPin.length > index 
                    ? "bg-accent border-accent ring-4 ring-accent/30 scale-110 shadow-[0_0_10px_var(--color-accent)]" 
                    : enteredPin.length === index
                      ? "border-accent bg-accent/20 ring-4 ring-accent/10 scale-110"
                      : pinError
                        ? "border-amber-500 bg-amber-500/20 ring-4 ring-amber-500/20"
                        : "border-border bg-surface-2"
                )}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-amber-500 text-xs text-center font-bold animate-fade-in mb-4">{pinError}</p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyClick(num)}
                className="h-16 rounded-2xl bg-surface-2 border border-border hover:bg-surface hover:border-accent hover:text-accent flex items-center justify-center text-2xl font-mono text-text-main transition-all group"
              >
                <span className="group-active:scale-90 transition-transform">{num}</span>
              </button>
            ))}
            <button
               onClick={() => onRequestAdminReset()}
               className="h-16 rounded-2xl flex items-center justify-center text-text-muted hover:text-accent transition-colors"
               title="Forgot PIN?"
            >
               <Lock size={20} />
            </button>
            <button
                onClick={() => handleKeyClick(0)}
                className="h-16 rounded-2xl bg-surface-2 border border-border hover:bg-surface hover:border-accent hover:text-accent flex items-center justify-center text-2xl font-mono text-text-main transition-all group"
              >
                <span className="group-active:scale-90 transition-transform">0</span>
            </button>
            <button
               onClick={handleBackspace}
               className="h-16 rounded-2xl flex items-center justify-center text-text-muted hover:text-amber-500 transition-colors"
               title="Backspace"
            >
               <Delete size={24} />
            </button>
          </div>
          
        </div>
      </motion.div>
    </motion.div>
  );
}
