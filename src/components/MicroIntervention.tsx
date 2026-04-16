import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wind } from 'lucide-react';

interface MicroInterventionProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function MicroIntervention({ onComplete, onSkip }: MicroInterventionProps) {
  const [phase, setPhase] = useState<'in' | 'hold1' | 'out' | 'hold2'>('in');
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (cycle >= 3) {
      onComplete();
      return;
    }

    let timeout: NodeJS.Timeout;
    if (phase === 'in') {
      timeout = setTimeout(() => setPhase('hold1'), 4000);
    } else if (phase === 'hold1') {
      timeout = setTimeout(() => setPhase('out'), 2000);
    } else if (phase === 'out') {
      timeout = setTimeout(() => setPhase('hold2'), 4000);
    } else if (phase === 'hold2') {
      timeout = setTimeout(() => {
        setPhase('in');
        setCycle(c => c + 1);
      }, 2000);
    }

    return () => clearTimeout(timeout);
  }, [phase, cycle, onComplete]);

  const getInstruction = () => {
    switch (phase) {
      case 'in': return 'Breathe In...';
      case 'hold1': return 'Hold...';
      case 'out': return 'Breathe Out...';
      case 'hold2': return 'Hold...';
    }
  };

  const getScale = () => {
    switch (phase) {
      case 'in': return 1.5;
      case 'hold1': return 1.5;
      case 'out': return 1;
      case 'hold2': return 1;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-12">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-serif font-bold text-blue-900">Let's take a breath</h3>
        <p className="text-blue-600/80 font-medium">Follow the bubble. Cycle {cycle + 1} of 3</p>
      </div>

      <div className="relative w-48 h-48 flex items-center justify-center my-8">
        <motion.div
          animate={{ scale: getScale() }}
          transition={{ duration: phase === 'in' || phase === 'out' ? 4 : 2, ease: "easeInOut" }}
          className="absolute w-32 h-32 bg-blue-200 rounded-full opacity-50"
        />
        <motion.div
          animate={{ scale: getScale() }}
          transition={{ duration: phase === 'in' || phase === 'out' ? 4 : 2, ease: "easeInOut" }}
          className="absolute w-24 h-24 bg-blue-400 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-400/50"
        >
          <Wind size={32} />
        </motion.div>
      </div>

      <div className="h-8">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-blue-800 tracking-wide"
        >
          {getInstruction()}
        </motion.p>
      </div>

      <button 
        onClick={onSkip} 
        className="text-sm font-bold text-text-muted hover:text-text-main transition-colors mt-8"
      >
        Skip for now
      </button>
    </div>
  );
}
