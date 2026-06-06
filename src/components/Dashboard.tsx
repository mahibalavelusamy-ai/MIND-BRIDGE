import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Heart, 
  ClipboardCheck, 
  AlertCircle,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  Zap,
  Trophy,
  MapPin,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ReferenceArea,
  Area,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

const RefArea = ReferenceArea as any;
import { Child, Alert, Recommendation } from '../types';
import { MOCK_MOOD_DATA } from '../constants';
import { cn } from '../lib/utils';
import { db, auth, collection, addDoc, OperationType, handleFirestoreError, query, where, getDocs, orderBy, limit, onSnapshot } from '../lib/firebase';
import { generateRecommendations } from '../lib/recommendationService';
import { Lightbulb, ArrowRight, BookOpen, Coffee, Wind, Lock, Users } from 'lucide-react';
import InterventionModal from './InterventionModal';
import FocusTimer from './FocusTimer';
import RecommendationAI from './RecommendationAI';
import { analyzeTextRisk } from '../lib/scoring';
import EmotionalStabilityView from './EmotionalStabilityView';
import MentalResilienceView from './MentalResilienceView';
import TriggerMappingView from './TriggerMappingView';
import InterventionEffectivenessView from './InterventionEffectivenessView';

interface DashboardProps {
  user: any;
  children: Child[];
  alerts: Alert[];
  onViewProfile: (child: Child) => void;
  selectedChild?: Child | null;
  setActiveTab: (tab: any) => void;
  privacyBlur?: boolean;
}

const COLORS = ['#2d7a5a', '#c47a1e', '#c0392b'];

export default function Dashboard({ user, children, alerts, onViewProfile, selectedChild, setActiveTab, privacyBlur = false }: DashboardProps) {
  // Session Isolation: Active Child vs Switchable Children
  const activeChild = selectedChild || children[0];
  const otherChildren = children.filter(c => c.id !== activeChild?.id);

  const [interventionChild, setInterventionChild] = useState<Child | null>(null);
  const [dashboardAssessments, setDashboardAssessments] = useState<any[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<'7d' | '30d'>('7d');
  
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showSpotsModal, setShowSpotsModal] = useState(false);

  // Apply clinical chart scaling filtering based on timeframe
  const rawAssessments = dashboardAssessments;
  // Make sure we correctly map and slice based on timeframe
  const filteredAssessments = chartTimeframe === '30d' 
    ? rawAssessments.slice(0, 30).reverse() 
    : rawAssessments.slice(0, 7).reverse();

  // If we don't have enough data to fill the timeframe, provide empty state pads, 
  // but map it properly across exactly 7 or 30 nodes so the chart line remains scaled exactly.
  const chartData = rawAssessments.length > 0 
    ? filteredAssessments.map(a => ({
        day: new Date(a.timestamp).toLocaleDateString('en-US', { 
           month: chartTimeframe === '30d' ? 'short' : undefined,
           day: chartTimeframe === '30d' ? 'numeric' : undefined,
           weekday: chartTimeframe === '7d' ? 'short' : undefined 
        }),
        score: a.totalScore || a.score || 0,
        mood: a.scores?.mood ? a.scores.mood * 20 : 0, // multiply by 20 to convert 1-5 scale to 1-100 scale for charting alongside totalScore
        focus: a.scores?.focus ? a.scores.focus * 20 : 0,
        sleep: a.scores?.sleep ? a.scores.sleep * 20 : 0,
        stress: a.scores?.academic_stress ? a.scores.academic_stress * 20 : 0
      }))
    : Array.from({ length: chartTimeframe === '30d' ? 30 : 7 }).map((_, i) => ({
        day: `Day ${i+1}`,
        score: 0,
        mood: 0,
        focus: 0,
        sleep: 0,
        stress: 0
      }));

  useEffect(() => {
    if (!activeChild) return;

    const fetchAssessments = async () => {
      try {
        const qA = user?.role === 'student'
          ? query(collection(db, 'assessments'), where('childId', '==', activeChild.id), orderBy('timestamp', 'desc'), limit(30))
          : query(collection(db, 'assessments'), where('childId', '==', activeChild.id), where('parentId', '==', user?.uid), orderBy('timestamp', 'desc'), limit(30));
        const snapA = await getDocs(qA);
        setDashboardAssessments(snapA.docs.map(d => d.data()));
      } catch (error) {
        console.error("Error fetching assessments:", error);
      }
    };

    fetchAssessments();

  }, [activeChild]);

  const handleSetSleepReminder = async () => {
    try {
      if (!activeChild) return;
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // notification successfully scheduled conceptually
        }
      }

      await addDoc(collection(db, 'notifications'), {
        type: 'info',
        title: 'Sleep Reminder',
        description: `Bedtime wind-down routine recommended for ${activeChild.name}.`,
        childId: activeChild.id,
        parentId: activeChild.parentId || activeChild.id,
        timestamp: new Date().toISOString(),
        status: 'active'
      });
      alert('Sleep Reminder set successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const SHORTCUTS = [
    ...(activeChild?.riskLevel === 'high' ? [{
      id: 'counselor-req',
      type: 'resource',
      title: '[COUNSELOR]',
      description: `Immediate access to the school counselor. Schedule an urgent check-in.`,
      priority: 'high',
      context: 'Clinical',
      actionLabel: 'Request Callback',
      onClick: async () => {
         await addDoc(collection(db, 'notifications'), {
            type: 'warning',
            title: 'Counselor Request',
            description: `A prioritized counselor check-in has been requested for ${activeChild?.name}.`,
            childId: activeChild.id,
            parentId: activeChild.parentId || activeChild.id,
            timestamp: new Date().toISOString()
         });
         alert('Counselor request submitted securely.');
      }
    }] : [{
      id: 'breathe-ex',
      type: 'strategy',
      title: '[BREATHE]',
      description: `A 3-minute guided breathing exercise to stabilize heart rate.`,
      priority: 'low',
      context: 'Wellness',
      actionLabel: 'Start Now',
      onClick: () => alert('Starting Breathing Exercise...')
    }]),
    {
      id: 'sleep-rem',
      type: 'activity',
      title: 'Set Sleep Reminder',
      description: `Establish a consistent wind-down routine for better sleep quality.`,
      priority: 'high',
      context: 'Bedtime',
      actionLabel: 'Set Reminder',
      onClick: handleSetSleepReminder
    },
    {
      id: 'study-timer',
      type: 'strategy',
      title: 'Start Study Timer',
      description: `Use the Pomodoro technique to improve focus and learning retention.`,
      priority: 'medium',
      context: 'Homework',
      actionLabel: 'Launch Timer',
      onClick: () => setShowTimerModal(true)
    }
  ];

  const pieData = [
    { name: 'Low', value: children.filter(c => c.riskLevel === 'low').length || 1 },
    { name: 'Moderate', value: children.filter(c => c.riskLevel === 'medium').length || 0 },
    { name: 'High', value: children.filter(c => c.riskLevel === 'high').length || 0 },
  ];

  const selectedChildForChart = activeChild;

  const calculateDisplayScore = (assessments: any[]) => {
    if (!assessments || assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => acc + (curr.totalScore || curr.score || 0), 0);
    return Math.round(sum / assessments.length);
  };
  
  const avgScore = calculateDisplayScore(dashboardAssessments);

  const calculateRadarData = (assessments: any[]) => {
    if (!assessments || assessments.length === 0) return [
      { subject: 'Mood', A: 0, fullMark: 100 },
      { subject: 'Sleep', A: 0, fullMark: 100 },
      { subject: 'Focus', A: 0, fullMark: 100 },
      { subject: 'Stress', A: 0, fullMark: 100 },
      { subject: 'Social', A: 0, fullMark: 100 },
      { subject: 'Motivation', A: 0, fullMark: 100 },
    ];
    
    let sums = { mood: 0, sleep: 0, focus: 0, academic_stress: 0, social: 0, motivation: 0 };
    let counts = { mood: 0, sleep: 0, focus: 0, academic_stress: 0, social: 0, motivation: 0 };

    assessments.forEach(a => {
      if (a.scores) {
         Object.keys(sums).forEach(k => {
           if (a.scores[k] !== undefined) {
             sums[k as keyof typeof sums] += a.scores[k];
             counts[k as keyof typeof counts]++;
           }
         });
      }
    });

    const getAvg = (k: keyof typeof sums) => counts[k] > 0 ? Math.round((sums[k] / counts[k]) * 20) : 0;

    return [
      { subject: 'Mood', A: getAvg('mood'), fullMark: 100 },
      { subject: 'Sleep', A: getAvg('sleep'), fullMark: 100 },
      { subject: 'Focus', A: getAvg('focus'), fullMark: 100 },
      { subject: 'Stress', A: getAvg('academic_stress'), fullMark: 100 },
      { subject: 'Social', A: getAvg('social'), fullMark: 100 },
      { subject: 'Motivation', A: getAvg('motivation'), fullMark: 100 },
    ];
  };

  const radarData = calculateRadarData(dashboardAssessments);

  const calculateTrendInfo = (category: string) => {
    if (!dashboardAssessments || dashboardAssessments.length < 2) return { label: 'Stable', icon: '→', prefix: 'text-text-muted' };
    const recent = dashboardAssessments.slice(0, Math.ceil(dashboardAssessments.length / 2));
    const older = dashboardAssessments.slice(Math.ceil(dashboardAssessments.length / 2));
    
    const getAvg = (arr: any[]) => {
      let sum = 0, count = 0;
      arr.forEach(a => {
        if (a.scores && a.scores[category] !== undefined) {
          sum += a.scores[category]; count++;
        }
      });
      return count > 0 ? sum / count : 0;
    };
    const rAvg = getAvg(recent);
    const oAvg = getAvg(older);
    
    if (rAvg > oAvg + 0.2) return { label: 'Improving', icon: '↑', prefix: 'text-accent' };
    if (rAvg < oAvg - 0.2) return { label: 'Declining', icon: '↓', prefix: 'text-alert-500' };
    return { label: 'Stable', icon: '→', prefix: 'text-text-muted' };
  };

  const trends = {
    mood: calculateTrendInfo('mood'),
    sleep: calculateTrendInfo('sleep'),
    focus: calculateTrendInfo('focus'),
    stress: calculateTrendInfo('academic_stress'),
    social: calculateTrendInfo('social'),
    motivation: calculateTrendInfo('motivation'),
  };


  if (children.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif tracking-tight">No Profiles Available</h1>
            <p className="text-text-muted mt-1">Head back to the Gateway screen to add your first profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif tracking-tight text-white">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-400 mt-1">Here is your {user?.role === 'student' ? 'personal growth overview' : "family's wellbeing command center"}.</p>
        </div>
        <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
          {activeChild && (
            <div className="bg-[#0F172A]/50 border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-4 animate-fade-in group hover:border-[#2563EB]/40 transition-colors backdrop-blur-md">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progress</span>
                <p className="text-sm font-bold text-[#FBBF24]">
                  Day {(activeChild?.streak || 0) % 7}/7 Streak
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FBBF24]/10 flex items-center justify-center text-[#FBBF24] group-hover:scale-110 transition-transform shadow-inner">
                <Trophy size={24} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        
        {/* Left Column - Profile & Quick Stats */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-8 border-border flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#2563EB]/10 to-transparent pointer-events-none" />
            
            <h3 className="text-xs font-bold text-text-muted mb-6 uppercase tracking-widest relative z-10">Personal Growth Center</h3>
            {activeChild ? (
               <div className="relative z-10 w-full flex flex-col items-center">
                 <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-[#0F172A] border-4 border-[#2563EB]/30 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(37,99,235,0.2)]">
                      {activeChild.age >= 18 ? <span className="font-serif text-[#22D3EE]">{activeChild.name ? activeChild.name.charAt(0).toUpperCase() : '👤'}</span> : activeChild.avatar}
                    </div>
                 </div>
                 
                 <h4 className="font-bold text-2xl text-white mb-1 font-serif">{activeChild.name}</h4>
                 <p className="text-sm text-slate-400">Level {Math.floor((activeChild.gems || 0) / 100) + 1} Explorer</p>
                 
                 <div className="grid grid-cols-2 w-full gap-4 mt-8">
                    <div className="bg-[#0F172A]/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center backdrop-blur-md">
                       <Sparkles size={20} className="text-[#FBBF24] mb-2" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reward Points</span>
                       <span className="text-2xl font-bold text-white font-serif">{activeChild.gems || 0}</span>
                    </div>
                    <div className="bg-[#0F172A]/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center backdrop-blur-md">
                       <Zap size={20} className="text-[#22D3EE] mb-2" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Streak</span>
                       <span className="text-2xl font-bold text-white font-serif">{activeChild.streak || 0}</span>
                    </div>
                 </div>

                 {user?.role === 'student' && (
                    <div className="w-full mt-6">
                       <button 
                         onClick={() => setActiveTab('assessments')}
                         className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#0891B2] hover:opacity-90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                       >
                         Start Daily Check-in
                       </button>
                    </div>
                 )}
               </div>
            ) : (
                <div className="p-6 rounded-2xl border border-dashed border-border text-center text-text-muted">
                    No active profile
                </div>
            )}
          </div>
        </div>

        {/* Right Column - Stats & Charts */}
        <div className="md:col-span-8 flex flex-col gap-6">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <StatCard 
                 icon={<TrendingUp size={20} />}
                 label="Avg Wellness Score"
                 value={avgScore > 0 ? avgScore.toString() : '--'}
                 change="Past 7 days"
                 color="text-[#22D3EE]"
                 bgClass="bg-[#22D3EE]/10"
              />
              <StatCard 
                 icon={<AlertCircle size={20} />}
                 label="Active Alerts"
                 value={alerts.filter(a => a.childId === activeChild?.id && !a.read).length.toString()}
                 change="Require attention"
                 color="text-[#F87171]"
                 bgClass="bg-[#F87171]/10"
                 isUrgent={alerts.filter(a => a.childId === activeChild?.id && !a.read).length > 0}
              />
              <StatCard 
                 icon={<ClipboardCheck size={20} />}
                 label="Assessments"
                 value={dashboardAssessments.length.toString()}
                 change="Completed recently"
                 color="text-[#2563EB]"
                 bgClass="bg-[#2563EB]/10"
              />
           </div>

           <div className="glass-card p-6 border-border flex-1 flex flex-col bg-[#0F172A]/50 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#2563EB]" /> Wellness Trends
                 </h3>
                 <div className="flex bg-[#0F172A] rounded-lg p-1 border border-white/10">
                    <button 
                      onClick={() => setChartTimeframe('7d')}
                      className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", chartTimeframe === '7d' ? "bg-[#2563EB]/20 text-[#22D3EE]" : "text-slate-500 hover:text-slate-300")}
                    >
                      7 Days
                    </button>
                    <button 
                      onClick={() => setChartTimeframe('30d')}
                      className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", chartTimeframe === '30d' ? "bg-[#2563EB]/20 text-[#22D3EE]" : "text-slate-500 hover:text-slate-300")}
                    >
                      30 Days
                    </button>
                 </div>
              </div>
              
              <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis 
                         dataKey="day" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fill: '#64748b' }} 
                         dy={10}
                       />
                       <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fill: '#64748b' }}
                       />
                       <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#020617', fontSize: '12px', fontWeight: 'bold' }}
                         itemStyle={{ color: '#22D3EE' }}
                       />
                       {user?.role !== 'student' && <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />}
                       <Area type="monotone" dataKey="score" stroke="none" fillOpacity={1} fill="url(#colorScore)" name="Overall Wellness" />
                       <Line 
                         type="monotone" 
                         dataKey="score" 
                         name="Overall Wellness"
                         stroke="#22D3EE" 
                         strokeWidth={3}
                         dot={{ r: 4, fill: "#0F172A", strokeWidth: 2 }}
                         activeDot={{ r: 6, strokeWidth: 0, fill: "#22D3EE" }}
                       />
                       {user?.role !== 'student' && (
                         <>
                           <Line type="monotone" dataKey="mood" name="Mood" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="3 3"/>
                           <Line type="monotone" dataKey="focus" name="Focus" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="3 3"/>
                           <Line type="monotone" dataKey="sleep" name="Sleep" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="3 3"/>
                           <Line type="monotone" dataKey="stress" name="Stress" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="3 3"/>
                         </>
                       )}
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

      </div>
      
      {activeChild && (
        <RecommendationAI weightedRiskScore={(100 - avgScore) / 100} childId={activeChild.id} />
      )}

        {interventionChild && (
          <InterventionModal 
            child={interventionChild}
            onClose={() => setInterventionChild(null)}
          />
        )}

        {/* Wellness Overview Command Center */}
        <div className="md:col-span-12 w-full mt-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
             <Heart size={24} className="text-accent" />
             <h2 className="text-2xl font-serif font-bold text-text-main">Wellness Overview</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Radar Chart */}
             <div className="col-span-1 glass-card p-6 flex flex-col items-center justify-center min-h-[300px] hover:border-accent/40 transition-colors">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest w-full text-left mb-4">Wellness Radar</h3>
                <ResponsiveContainer width="100%" height={240}>
                   <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                     <PolarGrid stroke="rgba(255,255,255,0.1)" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                     <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                     <Radar
                       name="Current"
                       dataKey="A"
                       stroke="#22D3EE"
                       strokeWidth={2}
                       fill="#2563EB"
                       fillOpacity={0.4}
                     />
                   </RadarChart>
                </ResponsiveContainer>
             </div>

             {/* Dimension Trends */}
             <div className="col-span-1 glass-card p-6 flex flex-col hover:border-[#2563EB]/40 transition-colors bg-[#0F172A]/50">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                  Dimension Trends
                  <span className="text-[10px] bg-[#2563EB]/20 text-[#22D3EE] px-2 py-1 rounded-md">Last 30 Days</span>
                </h3>
                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                   {radarData.map((d) => {
                     const keyMap: Record<string, keyof typeof trends> = { 'Mood': 'mood', 'Sleep': 'sleep', 'Focus': 'focus', 'Stress': 'stress', 'Social': 'social', 'Motivation': 'motivation' };
                     const trend = trends[keyMap[d.subject]];
                     if (!trend) return null;
                     return (
                       <div key={d.subject} className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-1 shadow-sm backdrop-blur-sm">
                          <span className="text-[10px] uppercase text-slate-400 font-bold">{d.subject}</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xl font-bold text-white leading-none font-serif">{d.A}</span>
                            <span className={`text-xs font-bold flex items-center gap-1 leading-none ${
                                trend.label === 'Improving' ? 'text-[#22D3EE]' :
                                trend.label === 'Declining' ? 'text-[#F87171]' : 'text-slate-400'
                            }`}>
                              {trend.icon} {trend.label}
                            </span>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>

             {/* AI Summary */}
             <div className="col-span-1 glass-card p-6 flex flex-col hover:border-[#22D3EE]/40 transition-colors bg-[#0F172A]/50">
                <h3 className="text-sm font-bold text-[#22D3EE] uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Sparkles size={16} /> AI Insights
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-sm text-slate-300 flex-1 font-medium bg-[#2563EB]/10 p-4 rounded-xl border border-[#2563EB]/20 leading-relaxed">
                    {dashboardAssessments[0]?.aiInsight?.message || `${activeChild?.name}'s wellness profile is forming.`}
                  </p>
                  {dashboardAssessments[0]?.aiInsight?.recommendations?.length > 0 && (
                     <ul className="text-xs text-slate-400 list-disc list-inside mt-4 space-y-2 mb-4 pl-2">
                        {dashboardAssessments[0].aiInsight.recommendations.map((rec: string, i: number) => (
                           <li key={i}>{rec}</li>
                        ))}
                     </ul>
                  )}
                </div>
                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2563EB] mt-4 pt-4 border-t border-white/10">
                  <span>Profile: </span>
                  <span className="text-[#22D3EE]">{activeChild?.wellnessProfile || 'Analyzing Baseline'}</span>
                </div>
             </div>
          </div>
          
          {/* Action Center */}
          <div className="mt-6">
            {user?.role === 'student' ? (
              <>
                 <div className="glass-card p-8 flex flex-col hover:border-[#2563EB]/40 transition-colors bg-[#0F172A]/50 mb-6">
                   <h3 className="text-xl font-serif mb-4 flex items-center gap-2 text-white">
                     <Trophy size={20} className="text-[#FBBF24]" />
                     Daily Growth Quests
                   </h3>
                   <p className="text-sm text-slate-400 mb-6">
                     Complete these mini-quests today to earn bonus credits and boost your wellbeing.
                   </p>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-auto">
                     <button 
                       onClick={() => { setShowTimerModal(true); }}
                       className="bg-white/5 hover:border-[#2563EB] hover:bg-[#2563EB]/10 text-white text-sm font-bold py-4 px-5 rounded-xl border border-white/10 transition-all text-left flex flex-col gap-2 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_24px_rgba(37,99,235,0.2)] backdrop-blur-md"
                     >
                       <span className="text-[#2563EB]">Focus for 15m</span>
                       <span className="text-[10px] text-slate-500 uppercase flex justify-between w-full"><span>Academic</span><span className="text-[#FBBF24]">+15 💎</span></span>
                     </button>
                     <button 
                       onClick={() => alert(`Starting 3-min Journal...`)}
                       className="bg-white/5 hover:border-[#22D3EE] hover:bg-[#22D3EE]/10 text-white text-sm font-bold py-4 px-5 rounded-xl border border-white/10 transition-all text-left flex flex-col gap-2 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_24px_rgba(34,211,238,0.2)] backdrop-blur-md"
                     >
                       <span className="text-[#22D3EE]">Quick Journal</span>
                       <span className="text-[10px] text-slate-500 uppercase flex justify-between w-full"><span>Mindfulness</span><span className="text-[#FBBF24]">+20 💎</span></span>
                     </button>
                     <button 
                       onClick={() => { setActiveTab('shop'); }}
                       className="bg-gradient-to-br from-[#2563EB]/10 to-[#8B5CF6]/10 hover:from-[#2563EB]/20 hover:to-[#8B5CF6]/20 col-span-2 hover:border-[#8B5CF6] text-white text-sm font-bold py-4 px-5 rounded-xl border border-[#8B5CF6]/30 transition-all text-left flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-md group"
                     >
                       <div className="flex flex-col h-full justify-between gap-1">
                         <span className="text-[#8B5CF6] group-hover:text-white transition-colors">Visit Wellness Shop</span>
                         <span className="text-[10px] text-slate-400 uppercase">Reward Yourself</span>
                       </div>
                       <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6] self-center group-hover:scale-110 group-hover:bg-[#8B5CF6] group-hover:text-white transition-all shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                         <Zap size={24} />
                       </div>
                     </button>
                   </div>
                 </div>

                 {dashboardAssessments.length > 0 && (
                   <div className="grid grid-cols-1 gap-6 mt-8">
                     <EmotionalStabilityView assessments={dashboardAssessments} />
                     <MentalResilienceView assessments={dashboardAssessments} />
                     <TriggerMappingView assessments={dashboardAssessments} sessions={[]} schedules={[]} />
                     <InterventionEffectivenessView assessments={dashboardAssessments} />
                   </div>
                 )}
              </>
            ) : (
              <div className="glass-card p-8 h-full flex flex-col hover:border-[#2563EB]/40 transition-colors bg-[#0F172A]/50">
                <h3 className="text-xl font-serif mb-4 flex items-center gap-2 text-white">
                  <Heart size={20} className="text-[#F87171]" />
                  Supportive Nudges
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  Send a quick supportive message or reminder to {activeChild?.name}'s device.
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-auto">
                  <button 
                    onClick={() => alert(`Encouragement sent to ${activeChild?.name}`)}
                    className="bg-white/5 hover:border-[#22D3EE] text-white text-sm font-bold py-4 px-5 rounded-xl border border-white/10 transition-colors text-left flex flex-col gap-2"
                  >
                    <span className="text-[#22D3EE]">"You're doing great 💙"</span>
                    <span className="text-[10px] text-slate-400 uppercase">Encouragement</span>
                  </button>
                  <button 
                    onClick={() => alert(`Reminder sent to ${activeChild?.name}`)}
                    className="bg-white/5 hover:border-[#2563EB] text-white text-sm font-bold py-4 px-5 rounded-xl border border-white/10 transition-colors text-left flex flex-col gap-2"
                  >
                    <span className="text-[#2563EB]">"Don't forget to pack!"</span>
                    <span className="text-[10px] text-slate-400 uppercase">Planner Nudge</span>
                  </button>
                  <button 
                    onClick={() => alert(`Wellness nudge sent to ${activeChild?.name}`)}
                    className="bg-white/5 hover:border-emerald-500 text-white text-sm font-bold py-4 px-5 rounded-xl border border-white/10 transition-colors text-left flex flex-col gap-2"
                  >
                    <span className="text-emerald-500">"Take a 5 min break"</span>
                    <span className="text-[10px] text-slate-400 uppercase">Wellness</span>
                  </button>
                  <button 
                    onClick={handleSetSleepReminder}
                    className="bg-white/5 hover:border-[#FBBF24] text-white text-sm font-bold py-4 px-5 rounded-xl border border-white/10 transition-colors text-left flex flex-col gap-2"
                  >
                    <span className="text-[#FBBF24]">Sleep Reminder</span>
                    <span className="text-[10px] text-slate-400 uppercase">Routine</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-[2rem] w-full max-w-md p-8 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setShowTimerModal(false)}
              className="absolute top-6 right-6 text-text-dim hover:text-text-main transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-serif font-bold mb-6">Focus Timer</h2>
            <FocusTimer childId={children[0]?.id} />
          </div>
        </div>
      )}

      {/* Spots Modal */}
      {showSpotsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-[2rem] w-full max-w-lg p-8 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setShowSpotsModal(false)}
              className="absolute top-6 right-6 text-text-dim hover:text-text-main transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <MapPin size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-text-main">Find a Spot</h2>
                <p className="text-sm text-text-muted">Locate distraction-free environments nearby</p>
              </div>
            </div>
            
            <div className="bg-surface-2 rounded-xl border border-border h-64 mb-6 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent pointer-events-none" />
              <div className="text-center z-10 relative">
                <MapPin size={48} className="text-blue-500 mx-auto mb-2 animate-bounce" />
                <p className="font-bold text-blue-900">Searching local map data...</p>
                <p className="text-xs text-blue-700/80">Connecting to Google Maps</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Local Public Library', distance: '0.8 miles', type: 'Quiet Zone' },
                { name: 'Community Center Study Hall', distance: '1.2 miles', type: 'Collaborative' },
              ].map((spot, i) => (
                <div key={i} className="p-4 border border-border rounded-xl flex items-center justify-between hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                  <div>
                    <h4 className="font-bold text-sm">{spot.name}</h4>
                    <p className="text-xs text-text-dim">{spot.distance}</p>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold tracking-wider uppercase">
                    {spot.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, change, color, bgClass, isUrgent }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  change: string; 
  color: string;
  bgClass?: string;
  isUrgent?: boolean;
}) {
  return (
    <div className="bg-[#0F172A]/50 border border-white/5 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:bg-[#0F172A]/80 transition-all backdrop-blur-md relative overflow-hidden group">
      <div className="absolute -right-10 -top-10 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors pointer-events-none" />
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4 relative z-10", bgClass || color)}>
        <div className={color}>{icon}</div>
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">{label}</p>
      <p className={cn("text-3xl font-serif font-bold relative z-10", isUrgent ? "text-[#F87171]" : "text-white")}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-2 relative z-10">{change}</p>
    </div>
  );
}
