import React, { useMemo, useEffect } from 'react';
import { calculateEmotionalStability, syncEmotionalStability } from '../lib/emotionalStability';
import { Activity, Brain, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface EmotionalStabilityViewProps {
  assessments: any[];
}

export default function EmotionalStabilityView({ assessments }: EmotionalStabilityViewProps) {
  const stabilityData = useMemo(() => calculateEmotionalStability(assessments), [assessments]);

  useEffect(() => {
    if (assessments.length > 1) {
      // Find the studentId since assessments have childId
      const studentId = assessments[0]?.childId;
      if (studentId) {
        // Run sync without awaiting
        syncEmotionalStability(studentId, assessments).catch(console.error);
      }
    }
  }, [assessments]);

  const { stabilityScore, volatilityLevel, varianceDetails } = stabilityData;

  const chartData = useMemo(() => {
    return assessments.map((a, i) => {
      const mood = a.scores?.mood || Number(a.answers?.find((ans: any) => ans.id.includes('mood'))?.value) || 3;
      const stress = a.scores?.academic_stress || Number(a.answers?.find((ans: any) => ans.id.includes('stress'))?.value) || 3;
      return {
        name: `Day ${i + 1}`,
        mood,
        stress,
      };
    });
  }, [assessments]);

  return (
    <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="text-purple-400" size={20} />
          Emotional Stability Engine
        </h3>
        <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${
          volatilityLevel === 'Stable' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          volatilityLevel === 'Moderately Stable' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          volatilityLevel === 'Unstable' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {volatilityLevel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#020617] border border-white/5 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Stability Score</p>
          <p className="text-3xl font-serif text-white font-bold">{stabilityScore} <span className="text-sm text-slate-400">/ 100</span></p>
        </div>
        <div className="bg-[#020617] border border-white/5 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">AI Insight</p>
          <p className="text-sm text-slate-300 font-medium mt-1">
            {volatilityLevel === 'Stable' ? 'Emotional fluctuations are minimal.' : 
             volatilityLevel === 'Moderately Stable' ? 'Showing normal variations in mood.' : 
             volatilityLevel === 'Unstable' ? 'Emotional fluctuations have increased recently.' : 
             'High volatility detected in mood patterns.'}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-bold text-slate-400 mb-4 px-1 uppercase tracking-widest">Fluctuation Trend (Volatility)</h4>
        <div className="h-48 w-full bg-[#020617] rounded-xl border border-white/5 p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} domain={[0, 5]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                />
                <Line type="step" dataKey="mood" stroke="#A855F7" strokeWidth={2} dot={true} name="Mood" />
                <Line type="step" dataKey="stress" stroke="#F43F5E" strokeWidth={2} dot={true} name="Stress" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-500">Not enough data to calculate trend</div>
          )}
        </div>
      </div>
    </div>
  );
}
