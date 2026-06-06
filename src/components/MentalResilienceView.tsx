import React, { useMemo, useEffect } from 'react';
import { calculateMentalResilience, syncMentalResilience } from '../lib/mentalResilience';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';

interface MentalResilienceViewProps {
  assessments: any[];
}

export default function MentalResilienceView({ assessments }: MentalResilienceViewProps) {
  const resilienceData = useMemo(() => calculateMentalResilience(assessments), [assessments]);

  useEffect(() => {
    if (assessments.length > 1) {
      const studentId = assessments[0]?.childId;
      if (studentId) {
        syncMentalResilience(studentId, assessments).catch(console.error);
      }
    }
  }, [assessments]);

  const { resilienceScore, category, recoverySpeed, recoveryPattern } = resilienceData;

  const getInsight = () => {
     if (recoveryPattern === 'Consistently Stable') return 'Maintains strong emotional baseline, rarely dips.';
     if (recoveryPattern === 'Insufficient Data') return 'Not enough data to determine resilience pattern.';
     if (resilienceScore === 100 && recoverySpeed > 0) return 'Student typically recovers quickly and consistently.';
     if (recoverySpeed > 0) {
        return `Student typically recovers within ${recoverySpeed.toFixed(1)} days after stressful periods.`;
     }
     return 'Struggles to recover from low periods or high stress without support.';
  };

  return (
    <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="text-emerald-400" size={20} />
          Mental Resilience Index
        </h3>
        <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${
          category === 'Highly Resilient' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          category === 'Moderately Resilient' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          category === 'Needs Support' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {category}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#020617] border border-white/5 rounded-xl p-5 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">Resilience Score</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-serif text-white font-bold">{resilienceScore}</p>
            <span className="text-sm text-slate-400">/ 100</span>
          </div>
        </div>
        
        <div className="bg-[#020617] border border-white/5 rounded-xl p-5">
           <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-blue-400" size={16} />
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Recovery Speed</p>
           </div>
           <p className="text-2xl font-serif text-white font-bold mb-1">
             {recoverySpeed > 0 ? `${recoverySpeed.toFixed(1)} Days` : 'N/A'}
           </p>
           <p className="text-xs text-blue-400/80 font-medium">{recoveryPattern}</p>
        </div>

        <div className="bg-[#020617] border border-white/5 rounded-xl p-5 flex flex-col justify-center">
           <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-amber-400" size={16} />
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">AI Insight</p>
           </div>
           <p className="text-sm text-slate-300 font-medium mt-1 leading-relaxed">
             {getInsight()}
           </p>
        </div>
      </div>
    </div>
  );
}
