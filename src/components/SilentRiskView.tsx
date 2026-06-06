import React, { useMemo, useEffect } from 'react';
import { calculateSilentRisk, syncSilentRisk } from '../lib/silentRisk';
import { ActivitySquare, Fingerprint, AlertCircle } from 'lucide-react';

interface SilentRiskViewProps {
  assessments: any[];
  sessions: any[];
  streak: number;
}

export default function SilentRiskView({ assessments, sessions, streak }: SilentRiskViewProps) {
  const riskData = useMemo(() => calculateSilentRisk(assessments, sessions, streak), [assessments, sessions, streak]);

  useEffect(() => {
    if (assessments.length > 0) {
      const studentId = assessments[0]?.childId;
      if (studentId) {
        syncSilentRisk(studentId, assessments, sessions, streak).catch(console.error);
      }
    }
  }, [assessments, sessions, streak]);

  const { riskScore, riskLevel, riskFactors, explanation } = riskData;

  return (
    <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
      {/* Background glow pattern for high risk */}
      {riskLevel === 'High' && (
         <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
      )}
      
      <div className="flex items-center justify-between mb-6 z-10 relative">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Fingerprint className="text-rose-400" size={20} />
          Silent Risk Detection Engine
        </h3>
        <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${
          riskLevel === 'None' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          riskLevel === 'Low' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          riskLevel === 'Moderate' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
        }`}>
          {riskLevel === 'None' ? 'No Risk Detected' : `${riskLevel} Risk`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10 relative">
        <div className="bg-[#020617] border border-white/5 rounded-xl p-5 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">Silent Risk Score</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-serif text-white font-bold">{riskScore}</p>
            <span className="text-sm text-slate-400">/ 100</span>
          </div>
        </div>
        
        <div className="bg-[#020617] border border-white/5 rounded-xl p-5 md:col-span-2">
           <div className="flex items-center gap-2 mb-2">
              <ActivitySquare className="text-purple-400" size={16} />
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">AI Explanation</p>
           </div>
           <p className="text-sm text-slate-300 font-medium mb-3 leading-relaxed">
             {explanation}
           </p>
           {riskFactors.length > 0 && riskFactors[0] !== 'No significant silent risk factors detected.' && (
              <div className="space-y-1 mt-2 border-t border-white/5 pt-3">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Detected Anomalies</p>
                 {riskFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-rose-300">
                       <AlertCircle size={14} className="shrink-0 mt-0.5" />
                       <p>{factor}</p>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
