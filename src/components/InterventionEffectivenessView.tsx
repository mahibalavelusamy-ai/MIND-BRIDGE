import React, { useMemo, useEffect } from 'react';
import { calculateInterventionEffectiveness, syncInterventionEffectiveness } from '../lib/interventionEffectiveness';
import { Target, ArrowRight, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface InterventionEffectivenessViewProps {
  assessments: any[];
}

export default function InterventionEffectivenessView({ assessments }: InterventionEffectivenessViewProps) {
  const effectivenessData = useMemo(() => calculateInterventionEffectiveness(assessments), [assessments]);

  useEffect(() => {
    if (assessments.length > 0) {
      const studentId = assessments[0]?.childId || assessments[0]?.userId;
      if (studentId) {
        syncInterventionEffectiveness(studentId, assessments).catch(console.error);
      }
    }
  }, [assessments]);

  const { effectivenessScore, status, insight, beforeScore, afterScore, improvement } = effectivenessData;

  return (
    <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-6 z-10 relative">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="text-pink-400" size={20} />
          Intervention Effectiveness Engine
        </h3>
        <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${
          status === 'Successful' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          status === 'Partially Successful' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          status === 'Needs Adjustment' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
        }`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10 relative">
        <div className="bg-[#020617] border border-white/5 rounded-xl p-5 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">Effectiveness Score</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-serif text-white font-bold">{effectivenessScore}</p>
            <span className="text-sm text-slate-400">/ 100</span>
          </div>
        </div>
        
        <div className="bg-[#020617] border border-white/5 rounded-xl p-5">
           <div className="flex flex-col h-full justify-center">
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Metric Change (Sleep Quality)</p>
               <div className="flex items-center justify-between text-sm">
                   <div className="flex flex-col items-center">
                       <span className="text-slate-400 font-medium mb-1">Before</span>
                       <span className="text-xl text-white font-bold">{beforeScore}</span>
                   </div>
                   <ArrowRight size={20} className="text-slate-600 mx-2" />
                   <div className="flex flex-col items-center">
                       <span className="text-slate-400 font-medium mb-1">After</span>
                       <span className="text-xl text-white font-bold">{afterScore}</span>
                   </div>
               </div>
               <div className="mt-4 flex items-center gap-2 justify-center">
                   {improvement > 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-rose-400" />}
                   <span className={`text-sm font-bold ${improvement > 0 ? 'text-emerald-400' : improvement < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {Math.abs(improvement)}% {improvement > 0 ? 'Improvement' : improvement < 0 ? 'Decline' : 'Change'}
                   </span>
               </div>
           </div>
        </div>

        <div className="bg-[#020617] border border-white/5 rounded-xl p-5 flex flex-col justify-center">
           <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-emerald-400" size={16} />
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">AI Insight</p>
           </div>
           <p className="text-sm text-slate-300 font-medium mt-1 leading-relaxed">
             {insight}
           </p>
        </div>
      </div>
    </div>
  );
}
