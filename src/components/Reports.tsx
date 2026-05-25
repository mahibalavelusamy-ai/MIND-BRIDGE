import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Child } from '../types';
import { cn, getGradientForChild } from '../lib/utils';
import { db, collection, query, where, getDocs, orderBy, limit } from '../lib/firebase';
import { 
  Activity, 
  Brain,
  Moon,
  Zap,
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  BatteryCharging,
  HeartPulse
} from 'lucide-react';
import { AIInterpreter } from '../services/analytics/aiInterpreter';

interface ReportsProps {
  children: Child[];
  selectedChild: Child | null;
}

export default function Reports({ children, selectedChild }: ReportsProps) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState("Analyzing recent emotional rhythms...");

  useEffect(() => {
    if (!selectedChild) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);

        const qA = query(
          collection(db, 'assessments'), 
          where('childId', '==', selectedChild.id),
          where('parentId', '==', selectedChild.parentId),
          where('timestamp', '>=', startDate.toISOString()),
          orderBy('timestamp', 'asc') // Use 'asc' rather than 'ascending'
        );
        const snapA = await getDocs(qA);
        const assessmentData = snapA.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setAssessments(assessmentData);
        
        // Generate a role-aware insight based on latest data
        if (assessmentData.length > 0) {
            const latest = assessmentData[assessmentData.length - 1];
            // Normalize scores to compute risks
            const rawRisk = latest.riskLevel === 'high' ? 0.9 : latest.riskLevel === 'medium' ? 0.5 : 0.1;
            const insight = await AIInterpreter.generateSupportiveSummary({
                emotionalRisk: rawRisk,
                overloadRisk: (latest.scores?.academic_stress || 3) < 3 ? 0.8 : 0.2, // assuming lower score means worse
                burnoutRisk: (latest.scores?.burnout_tendency || 3) < 3 ? 0.8 : 0.2
            }, selectedChild.age >= 18 ? 'student' : 'parent');
            setAiInsight(insight);
        } else {
            setAiInsight("We need a few days of check-ins to start revealing meaningful patterns and growth insights.");
        }

      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedChild]);

  if (!selectedChild) {
    return (
      <div className="h-full flex items-center justify-center animate-fade-in pb-12">
        <p className="text-text-muted mt-1">Select a profile to view wellness intelligence.</p>
      </div>
    );
  }

  // Formatting Data for Recharts
  const trendData = assessments.map((a, i) => {
    // If adaptive, scores might use string keys. Map them to a safe 1-5 scale or default to 3
    const getScore = (key1: string, key2: string) => {
        if (!a.scores) return 3;
        if (a.scores[key1] !== undefined) return a.scores[key1];
        if (a.scores[key2] !== undefined) return a.scores[key2];
        return 3;
    };
    
    return {
      day: `Day ${i + 1}`,
      emotional_wellbeing: getScore('emotional_wellbeing', 'mood'),
      academic_stress: getScore('academic_stress', 'stress'),
      energy_levels: getScore('energy_levels', 'energy'),
      burnout_tendency: getScore('burnout_tendency', 'social')
    };
  });

  // Calculate Radar Chart averages
  const radarData = [
    { subject: 'Emotional', A: 0, fullMark: 5 },
    { subject: 'Academic Load', A: 0, fullMark: 5 },
    { subject: 'Energy', A: 0, fullMark: 5 },
    { subject: 'Resilience', A: 0, fullMark: 5 },
    { subject: 'Engagement', A: 0, fullMark: 5 },
  ];

  if (trendData.length > 0) {
    const latest = trendData[trendData.length - 1];
    radarData[0].A = latest.emotional_wellbeing;
    radarData[1].A = latest.academic_stress;
    radarData[2].A = latest.energy_levels;
    radarData[3].A = latest.burnout_tendency;
    radarData[4].A = (latest.emotional_wellbeing + latest.energy_levels) / 2;
  } else {
    radarData.forEach(r => r.A = 3);
  }

  const latestAssessment = assessments[assessments.length - 1];
  const riskLevel = selectedChild.riskLevel || 'low';
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border p-3 rounded-xl shadow-xl flex flex-col gap-2">
          <p className="text-xs font-bold text-text-dim uppercase">{label}</p>
          {payload.map((p: any, i: number) => (
             <div key={i} className="flex items-center gap-2 text-sm">
                <div style={{ backgroundColor: p.stroke || p.fill }} className="w-2 h-2 rounded-full" />
                <span className="text-text-muted capitalize">{p.dataKey.replace('_', ' ')}:</span>
                <span className="font-bold text-text-main">{p.value}</span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in p-4 overflow-y-auto text-text-main pb-24 lg:pb-4 h-full">
      {/* Top Banner: AI Insight & Identity */}
      <div className="bg-gradient-to-br from-surface to-surface-2 border border-accent/20 shadow-[0_0_30px_rgba(0,255,136,0.05)] rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-6 shrink-0 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none scale-150 -translate-y-1/4 translate-x-1/4">
          <Brain size={400} />
        </div>
        
        <div className={cn(
          "w-24 h-24 rounded-[2rem] flex items-center justify-center text-4xl shrink-0 border border-accent/30 shadow-inner z-10",
          selectedChild.age >= 18 ? `text-black bg-gradient-to-br ${getGradientForChild(selectedChild.id)}` : "bg-black"
        )}>
           {selectedChild.age >= 18 ? <span className="font-serif text-white">{selectedChild.name ? selectedChild.name.charAt(0).toUpperCase() : '👤'}</span> : selectedChild.avatar}
        </div>
        
        <div className="flex-1 z-10 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-text-main">{selectedChild.name}'s Wellness Overview</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-widest mb-4">
             <HeartPulse size={14} /> Behavioral Intelligence
          </div>
          <p className="text-sm md:text-base text-text-muted leading-relaxed max-w-2xl text-balance">
             "{aiInsight}"
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        
        {/* Left Column: Big Area Chart (Emotional Consistency) */}
        <div className="lg:col-span-2 glass-card p-6 md:p-8 flex flex-col bg-surface border-border shadow-sm min-h-[350px]">
           <div className="flex items-center justify-between mb-6">
              <div>
                 <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="text-blue-500" size={20} /> Emotional Momentum
                 </h2>
                 <p className="text-xs text-text-dim uppercase tracking-widest mt-1">14-Day Timeline</p>
              </div>
           </div>
           
           <div className="flex-1 w-full h-full min-h-[250px]">
             {trendData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorEmotional" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                     <YAxis domain={[1, 5]} hide />
                     <Tooltip content={<CustomTooltip />} />
                     <Area type="monotone" dataKey="emotional_wellbeing" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEmotional)" />
                   </AreaChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-text-dim">
                    <Activity size={32} className="opacity-20 mb-2" />
                    <p className="text-sm">Not enough data points yet.</p>
                 </div>
             )}
           </div>
        </div>

        {/* Right Column: Radar Chart (Wellness Balance) */}
        <div className="glass-card p-6 md:p-8 flex flex-col items-center justify-center bg-surface border-border shadow-sm">
           <h2 className="text-lg font-bold w-full text-left flex items-center gap-2 mb-2">
              <Zap className="text-accent" size={20} /> Wellness Balance
           </h2>
           <p className="text-xs text-text-dim uppercase tracking-widest w-full text-left mb-4">Current State</p>
           
           <div className="w-full aspect-square relative">
             <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                  <Radar name="Wellness" dataKey="A" stroke="#00ff88" strokeWidth={2} fill="#00ff88" fillOpacity={0.2} />
                </RadarChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>

      {/* Bottom Row: Detailed Trackers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0 pb-12">
          {/* Burnout Indicator */}
          <div className="glass-card p-6 flex flex-col bg-surface border-border">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                   <BatteryCharging size={20} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-text-main">Burnout Trajectory</h3>
                  <p className="text-xs text-text-dim">Tracking energy depletion</p>
                </div>
             </div>
             
             <div className="h-32 w-full">
               {trendData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={trendData}>
                     <YAxis domain={[1, 5]} hide />
                     <Tooltip content={<CustomTooltip />} />
                     <Line type="stepAfter" dataKey="burnout_tendency" stroke="#f97316" strokeWidth={2} dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-xs text-text-dim">Data aggregating...</div>
               )}
             </div>
          </div>

          {/* Academic Overload Indicator */}
          <div className="glass-card p-6 flex flex-col bg-surface border-border">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                   <Brain size={20} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-text-main">Cognitive Load</h3>
                  <p className="text-xs text-text-dim">Tracking academic & schedule stress</p>
                </div>
             </div>
             
             <div className="h-32 w-full">
               {trendData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={trendData}>
                     <YAxis domain={[1, 5]} hide />
                     <Tooltip content={<CustomTooltip />} />
                     <Line type="monotone" dataKey="academic_stress" stroke="#a855f7" strokeWidth={2} dot={{r: 3, fill: '#a855f7'}} />
                   </LineChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-xs text-text-dim">Data aggregating...</div>
               )}
             </div>
          </div>
      </div>
    </div>
  );
}
