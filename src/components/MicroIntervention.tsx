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
      timeout = setTimeout(() => setPhase('out'), 4000);
    } else if (phase === 'out') {
      timeout = setTimeout(() => setPhase('hold2'), 4000);
    } else if (phase === 'hold2') {
      timeout = setTimeout(() => {
        setPhase('in');
        setCycle(c => c + 1);
      }, 4000);
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
        <h3 className="text-2xl font-serif font-bold text-white">Let's take a breath</h3>
        <p className="text-slate-400 font-medium tracking-wide">Follow the rhythm. Cycle {cycle + 1} of 3</p>
      </div>

      <div className="relative w-48 h-48 flex items-center justify-center my-8">
        <motion.div
          animate={{ scale: getScale() }}
          transition={{ duration: phase === 'in' || phase === 'out' ? 4 : 4, ease: "linear" }}
          className="absolute w-32 h-32 bg-[#2563EB]/20 rounded-full blur-xl pointer-events-none"
        />
        <motion.div
          animate={{ scale: getScale() }}
          transition={{ duration: phase === 'in' || phase === 'out' ? 4 : 4, ease: "linear" }}
          className="absolute w-24 h-24 bg-gradient-to-tr from-[#2563EB] to-[#22D3EE] rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]"
        >
          <Wind size={32} />
        </motion.div>
      </div>

      <div className="h-8">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-serif font-bold text-[#22D3EE] tracking-wide drop-shadow-sm"
        >
          {getInstruction()}
        </motion.p>
      </div>

      <button 
        onClick={onSkip} 
        className="text-sm font-bold text-slate-500 hover:text-white transition-colors mt-8 uppercase tracking-widest"
      >
        Skip for now
      </button>
    </div>
  );
}
