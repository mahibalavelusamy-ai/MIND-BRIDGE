import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Child } from '../types';
import { cn, getGradientForChild } from '../lib/utils';
import { db, auth, collection, query, where, getDocs, orderBy } from '../lib/firebase';
import { 
  Activity, 
  Brain,
  TrendingDown,
  TrendingUp,
  HeartPulse,
  Sparkles,
  Calendar,
  Layers,
  Zap,
  Target,
  AlertTriangle
} from 'lucide-react';

interface ReportsProps {
  children: Child[];
  selectedChild: Child | null;
}

type Timeframe = '7d' | '30d' | '365d';

export default function Reports({ children, selectedChild }: ReportsProps) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  useEffect(() => {
    if (!selectedChild) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let assessmentData: any[] = [];
        try {
          const qA = query(
            collection(db, 'assessments'), 
            where('childId', '==', selectedChild.id),
            orderBy('timestamp', 'asc')
          );
          const snapA = await getDocs(qA);
          assessmentData = snapA.docs.map(d => ({ id: d.id, ...d.data() } as any));
          setAssessments(assessmentData);
        } catch (e) {
          console.warn("Failed to fetch assessments", e);
        }

        try {
          // Rule requires userId == auth.currentUser.uid constraint on sessions otherwise it blocks
          const qSessions = query(collection(db, 'sessions'), where('childId', '==', selectedChild.id), where('userId', '==', auth.currentUser?.uid));
          const snapS = await getDocs(qSessions);
          setSessions(snapS.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        } catch (e) {
          console.warn("Failed to fetch sessions", e);
        }
        
        try {
          const qSched = query(collection(db, 'schoolSchedules'), where('childId', '==', selectedChild.id));
          const snapSched = await getDocs(qSched);
          setSchedules(snapSched.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        } catch (e) {
          console.warn("Failed to fetch school schedules", e);
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedChild]);

  const { chartData, insights } = useMemo(() => {
    if (!assessments.length) return { chartData: [], insights: [] };

    // Filter by timeframe
    let daysToInclude = 30;
    if (timeframe === '7d') daysToInclude = 7;
    if (timeframe === '365d') daysToInclude = 365;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToInclude);
    cutoffDate.setHours(0,0,0,0);

    const filtered = assessments.filter(a => new Date(a.timestamp) >= cutoffDate);
    
    // Grouping
    const grouped: Record<string, any[]> = {};
    filtered.forEach(a => {
        const d = new Date(a.timestamp);
        let key = '';
        if (timeframe === '365d') {
            // Group by Month
            key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        } else {
            // Group by Day
            key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(a);
    });

    const finalChartData = Object.keys(grouped).map(key => {
        const groupDecs = grouped[key];
        
        let sums = { mood: 0, sleep: 0, focus: 0, academic_stress: 0, social: 0, motivation: 0 };
        let counts = { mood: 0, sleep: 0, focus: 0, academic_stress: 0, social: 0, motivation: 0 };

        groupDecs.forEach(a => {
           const s = a.scores || {};
           Object.keys(sums).forEach(k => {
               const val = s[k];
               if (val !== undefined) {
                   sums[k as keyof typeof sums] += val;
                   counts[k as keyof typeof counts]++;
               }
           });
        });

        // Convert 1-5 scale to 1-100 scale for plotting
        const normalize = (amount: number, count: number) => count > 0 ? Math.round((amount / count) * 20) : 0;
        
        return {
           timeLabel: key,
           Mood: normalize(sums.mood, counts.mood),
           Sleep: normalize(sums.sleep, counts.sleep),
           Focus: normalize(sums.focus, counts.focus),
           Stress: normalize(sums.academic_stress, counts.academic_stress),
           Social: normalize(sums.social, counts.social),
           Motivation: normalize(sums.motivation, counts.motivation),
           originalGroup: groupDecs
        };
    });

    // Generate Insights based on comparing the first half of the timeframe vs the second half
    const generatedInsights: string[] = [];
    if (finalChartData.length >= 2) {
       const half = Math.floor(finalChartData.length / 2);
       const firstHalf = finalChartData.slice(0, half);
       const secondHalf = finalChartData.slice(half);

       const getAvg = (halfData: any[], metric: string) => {
           let sum = 0;
           let realCount = 0;
           halfData.forEach(d => {
               if (d[metric] > 0) {
                   sum += d[metric];
                   realCount++;
               }
           });
           return realCount > 0 ? sum / realCount : 0;
       };

       const metricsToCheck = ['Mood', 'Sleep', 'Focus', 'Stress', 'Social', 'Motivation'];
       metricsToCheck.forEach(m => {
           const avg1 = getAvg(firstHalf, m);
           const avg2 = getAvg(secondHalf, m);
           
           if (avg1 > 0 && Math.abs(avg2 - avg1) > 5) {
               const diff = avg2 - avg1;
               const percentChange = Math.round((Math.abs(diff) / avg1) * 100);
               if (diff > 0) {
                   if (m === 'Stress') {
                       generatedInsights.push(`Stress increased during ${timeframe === '7d' ? 'the week' : 'this period'} by ${percentChange}%. Take more breaks.`);
                   } else {
                       generatedInsights.push(`${m} improved by ${percentChange}% compared to the previous period.`);
                   }
               } else {
                   if (m === 'Stress') {
                       generatedInsights.push(`Stress decreased by ${percentChange}%. You are managing pressure well!`);
                   } else {
                       generatedInsights.push(`${m} consistency has slightly decreased by ${percentChange}%. Focus on returning to standard routines.`);
                   }
               }
           }
       });

       if (generatedInsights.length === 0) {
           generatedInsights.push("Wellness metrics remain stable with no dramatic fluctuations.");
       }
    }

    return { chartData: finalChartData, insights: generatedInsights };

  }, [assessments, timeframe]);

  const triggers = useMemo(() => {
    const analysis: {type: 'positive' | 'negative' | 'neutral', text: string}[] = [];
    if (!assessments.length) return analysis;

    const recentAssessments = assessments.slice(-7);
    const hasHighStress = recentAssessments.some(a => a.scores && a.scores.academic_stress <= 2);
    const hasLowSleep = recentAssessments.some(a => a.scores && a.scores.sleep <= 2);

    if (hasHighStress) {
      analysis.push({ type: 'negative', text: "Stress increases before examinations." });
    }
    
    if (sessions.length > 2 && hasLowSleep) {
      analysis.push({ type: 'negative', text: "Sleep quality decreases during project deadlines and extended study sessions." });
    }

    if (schedules.length > 3) {
      analysis.push({ type: 'positive', text: "Focus improves on days with scheduled study sessions and planned tasks." });
    } else {
      analysis.push({ type: 'neutral', text: "Inconsistent planner usage correlates with fluctuating focus levels." });
    }

    if (recentAssessments.some(a => a.scores?.social >= 4)) {
       analysis.push({ type: 'positive', text: "Mood stabilizes positively after social interactions." });
    }

    if (analysis.length === 0) {
       analysis.push({ type: 'neutral', text: "No significant behavioral triggers detected in recent data." });
    }

    return analysis;
  }, [assessments, sessions, schedules]);

  if (!selectedChild) {
    return (
      <div className="h-full flex items-center justify-center animate-fade-in pb-12">
        <p className="text-text-muted mt-1">Select a profile to view wellness intelligence.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0F172A] border border-white/10 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-2 z-50 relative min-w-[150px] backdrop-blur-md">
          <p className="text-xs font-bold text-slate-400 uppercase border-b border-white/5 pb-2 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
             <div key={i} className="flex items-center justify-between text-sm gap-4">
                <div className="flex items-center gap-2">
                   <div style={{ backgroundColor: p.stroke || p.fill }} className="w-2 h-2 rounded-full" />
                   <span className="text-slate-300 capitalize">{p.name}:</span>
                </div>
                <span className="font-bold text-white">{p.value}</span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in p-4 overflow-y-auto text-text-main pb-24 lg:pb-4 h-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#0F172A] to-[#020617] border border-[#2563EB]/20 shadow-[0_0_30px_rgba(34,211,238,0.05)] rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 relative overflow-hidden">
        <div className="flex items-center gap-6 z-10 w-full flex-col md:flex-row">
          <div className={cn(
            "w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl shrink-0 border border-[#2563EB]/30 shadow-inner z-10 bg-[#0F172A]",
            selectedChild.age >= 18 ? `text-black bg-gradient-to-br ${getGradientForChild(selectedChild.id)}` : "bg-[#0F172A] text-white"
          )}>
             {selectedChild.age >= 18 ? <span className="font-serif text-white">{selectedChild.name ? selectedChild.name.charAt(0).toUpperCase() : '👤'}</span> : selectedChild.avatar}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">{selectedChild.name}'s Wellness Timeline</h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#22D3EE] text-xs font-bold uppercase tracking-widest shadow-sm">
               <HeartPulse size={14} /> Behavioral Intelligence
            </div>
          </div>
          
          <div className="hidden md:flex bg-[#020617] border border-white/5 rounded-xl p-1 shrink-0 shadow-inner">
             {(['7d', '30d', '365d'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors",
                    timeframe === tf ? "bg-[#2563EB]/20 text-[#22D3EE] border border-[#2563EB]/40 shadow-[0_2px_10px_rgba(37,99,235,0.2)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                  {tf === '7d' ? 'Weekly View' : tf === '30d' ? 'Monthly View' : 'Yearly View'}
                </button>
             ))}
          </div>
        </div>
      </div>
      
      {/* Mobile Timeframe Selector */}
      <div className="md:hidden flex bg-[#020617] border border-white/5 rounded-xl p-1 w-full shrink-0 shadow-inner">
         {(['7d', '30d', '365d'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors",
                timeframe === tf ? "bg-[#2563EB]/20 text-[#22D3EE] border border-[#2563EB]/40 shadow-sm" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {tf === '7d' ? 'Weekly' : tf === '30d' ? 'Monthly' : 'Yearly'}
            </button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 shrink-0">
         <div className="lg:col-span-3 bg-[#0F172A] p-6 md:p-8 flex flex-col border border-white/5 shadow-sm rounded-[2rem]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
               <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                     <Activity className="text-[#2563EB]" size={24} /> Wellness Progression
                  </h2>
                  <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Multi-Dimensional Analysis</p>
               </div>
               
               <div className="flex items-center gap-2 text-slate-400 text-sm border border-white/5 bg-[#020617] px-4 py-2 rounded-full font-bold shadow-sm">
                  <Calendar size={16} className="text-[#22D3EE]" />
                  <span>
                    {timeframe === '7d' ? 'Last 7 Days' : timeframe === '30d' ? 'Last 30 Days' : 'Last 12 Months'}
                  </span>
               </div>
            </div>
            
            <div className="w-full h-64">
              {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                      <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} dy={10} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '5 5' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingBottom: '20px', color: '#CBD5E1' }} />
                      
                      <Line type="monotone" dataKey="Mood" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0F172A' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Sleep" stroke="#FBBF24" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0F172A' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Focus" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0F172A' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Stress" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0F172A' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Social" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0F172A' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Motivation" stroke="#22D3EE" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0F172A' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-[#020617] rounded-[2rem] border border-white/5">
                     <Activity size={48} className="opacity-20 mb-4 text-[#2563EB]" />
                     <p className="text-base font-bold text-slate-400">Not enough data points yet.</p>
                     <p className="text-sm mt-2 max-w-xs text-center opacity-80">Complete a few more daily assessments to populate your timeline.</p>
                  </div>
              )}
            </div>
         </div>

         {/* AI Observations Panel */}
         <div className="bg-[#0F172A] p-6 md:p-8 flex flex-col border border-white/5 mx-auto w-full shadow-sm h-full max-h-[600px] rounded-[2rem]">
            <h2 className="text-lg font-bold w-full text-left flex items-center gap-2 mb-2 text-white">
               <Sparkles className="text-[#FBBF24]" size={20} /> AI Observations
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest w-full text-left mb-6">Pattern Recognition</p>
            
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pb-4">
               {insights.length > 0 ? (
                   insights.map((insight, idx) => {
                       const isPositive = insight.toLowerCase().includes('improved') || insight.toLowerCase().includes('decreased') && insight.toLowerCase().includes('stress') || insight.toLowerCase().includes('stable');
                       return (
                           <div key={idx} className="flex gap-3 p-4 rounded-xl bg-[#020617] border border-white/5 shadow-sm transition-colors hover:border-white/10 group">
                               <div className={cn(
                                   "p-2 rounded-lg shrink-0 h-min",
                                   isPositive ? "bg-[#22D3EE]/10 border border-[#22D3EE]/20 text-[#22D3EE]" : "bg-[#F87171]/10 border border-[#F87171]/20 text-[#F87171]"
                               )}>
                                   {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                               </div>
                               <p className="text-sm text-slate-300 font-medium leading-relaxed pt-1 flex-1 group-hover:text-white transition-colors">{insight}</p>
                           </div>
                       )
                   })
               ) : (
                   <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-[#020617] rounded-xl border border-white/5 border-dashed h-full min-h-[150px]">
                      <Brain size={24} className="opacity-40 mb-2" />
                      <p className="text-sm">Accumulating data points to generate meaningful observations.</p>
                   </div>
               )}
            </div>
         </div>
      </div>

      {/* Engine views removed from My Growth part as requested */}

    </div>
  );
}
