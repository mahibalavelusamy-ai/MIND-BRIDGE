import React, { useMemo, useEffect } from 'react';
import { calculateTriggerMapping, syncTriggerMapping } from '../lib/triggerMapping';
import { Crosshair, Link2, AlertTriangle, Lightbulb } from 'lucide-react';

interface TriggerMappingViewProps {
  assessments: any[];
  sessions: any[];
  schedules: any[];
}

export default function TriggerMappingView({ assessments, sessions, schedules }: TriggerMappingViewProps) {
  const triggerData = useMemo(() => calculateTriggerMapping(assessments, sessions, schedules), [assessments, sessions, schedules]);

  useEffect(() => {
    if (assessments.length > 0) {
      const studentId = assessments[0]?.childId;
      if (studentId) {
        syncTriggerMapping(studentId, assessments, sessions, schedules).catch(console.error);
      }
    }
  }, [assessments, sessions, schedules]);

  const { triggers, recommendation } = triggerData;

  return (
    <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-6 z-10 relative">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Crosshair className="text-indigo-400" size={20} />
          Trigger Mapping Engine
        </h3>
        <span className="text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          {triggers.length} Detected
        </span>
      </div>

      <div className="flex items-start gap-4 mb-8 bg-[#020617] border border-white/5 rounded-xl p-5 relative z-10">
         <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500 shrink-0 mt-0.5">
            <Lightbulb size={20} />
         </div>
         <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">AI Recommendation</p>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">{recommendation}</p>
         </div>
      </div>

      <div className="space-y-4 z-10 relative">
         <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Trigger Library</p>
         
         {triggers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {triggers.map((t, idx) => (
                    <div key={idx} className="bg-[#020617] border border-white/5 rounded-xl p-4 flex flex-col justify-between group hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Link2 size={16} className="text-slate-500" />
                                <span className="font-bold text-white text-sm">{t.triggerName}</span>
                            </div>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                t.confidence === 'Strong' ? 'bg-rose-500/20 text-rose-400' :
                                t.confidence === 'Moderate' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-slate-500/20 text-slate-400'
                            }`}>
                                {t.confidence}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                <AlertTriangle size={10} /> Effect
                            </span>
                            <span className="text-sm text-indigo-300 font-medium">{t.effect}</span>
                        </div>
                    </div>
                ))}
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-[#020617] rounded-xl border border-white/5 border-dashed h-[120px]">
                <Crosshair size={24} className="opacity-40 mb-2" />
                <p className="text-sm">Accumulating data points to map behavioral triggers.</p>
            </div>
         )}
      </div>
    </div>
  );
}
