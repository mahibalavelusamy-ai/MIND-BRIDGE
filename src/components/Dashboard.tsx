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
  Area
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
        score: a.totalScore || a.score || 0
      }))
    : Array.from({ length: chartTimeframe === '30d' ? 30 : 7 }).map((_, i) => ({
        day: `Day ${i+1}`,
        score: 0
      }));

  useEffect(() => {
    if (!activeChild) return;

    const fetchAssessments = async () => {
      try {
        const qA = query(
          collection(db, 'assessments'),
          where('childId', '==', activeChild.id),
          where('parentId', '==', auth.currentUser?.uid),
          orderBy('timestamp', 'desc'),
          limit(7)
        );
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

      await addDoc(collection(db, 'alerts'), {
        type: 'info',
        title: 'Sleep Reminder',
        description: `Bedtime wind-down routine recommended for ${activeChild.name}.`,
        childId: activeChild.id,
        parentId: auth.currentUser?.uid || '',
        timestamp: new Date().toISOString(),
        status: 'active'
      });
      alert('Sleep Reminder set successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'alerts');
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
         await addDoc(collection(db, 'alerts'), {
            type: 'warning',
            title: 'Counselor Request',
            description: `A prioritized counselor check-in has been requested for ${activeChild?.name}.`,
            childId: activeChild.id,
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
          <h1 className="text-4xl font-serif tracking-tight text-text-main">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-text-muted mt-1">Here's a bento-style overview of your family's well-being.</p>
        </div>
        <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
          {activeChild && (
            <div className="bg-surface border border-border px-4 py-2 rounded-2xl shadow-sm flex items-center gap-4 animate-fade-in group hover:border-accent transition-colors">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Progress to Mega Prize</span>
                <p className="text-sm font-bold text-accent">
                  Day {(activeChild?.streak || 0) % 7}/7 — {7 - ((activeChild?.streak || 0) % 7)} more days to unlock 70 bonus credits!
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
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
          <div className="glass-card p-6 border-border flex-1">
            <h3 className="text-sm font-bold text-text-muted mb-4 uppercase tracking-widest">Active Profile</h3>
            {activeChild ? (
              <div 
                className={cn(
                  "flex flex-col items-center gap-4 p-6 rounded-2xl border bg-surface text-center",
                  activeChild.riskLevel === 'high' ? "border-alert-200 shadow-sm shadow-alert-100" : "border-border"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "w-20 h-20 rounded-full bg-accent-light flex items-center justify-center text-4xl z-10 relative shadow-inner",
                    activeChild.riskLevel === 'high' && "ring-4 ring-alert-100"
                  )}>
                    {activeChild.age >= 18 ? <span className="font-serif text-accent">{activeChild.name ? activeChild.name.charAt(0).toUpperCase() : '👤'}</span> : activeChild.avatar}
                  </div>
                  {activeChild.riskLevel === 'high' && (
                    <div className="absolute inset-0 rounded-full bg-alert-500/20 animate-ping -z-0" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xl text-text-main">{activeChild.name}</h4>
                  <p className="text-xs text-text-dim mt-1">{activeChild.age} years • {activeChild.age >= 18 ? 'Student' : activeChild.grade}</p>
                </div>
                
                <div className="grid grid-cols-2 w-full gap-3 mt-4">
                   <div className="bg-surface-2 p-3 rounded-xl border border-border flex flex-col items-center">
                      <Sparkles size={16} className="text-accent mb-1" />
                      <span className="text-xs font-bold text-text-muted uppercase">Credits</span>
                      <span className="text-lg font-bold text-text-main">{activeChild.gems || 0}</span>
                   </div>
                   <div className="bg-surface-2 p-3 rounded-xl border border-border flex flex-col items-center">
                      <Zap size={16} className="text-orange-500 mb-1" />
                      <span className="text-xs font-bold text-text-muted uppercase">Streak</span>
                      <span className="text-lg font-bold text-text-main">{activeChild.streak || 0}</span>
                   </div>
                </div>
                <div className="w-full mt-2">
                   <div className={cn(
                    "w-full py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-center",
                    activeChild.riskLevel === 'low' ? "bg-alert-50 text-alert-500 border border-alert-200" : 
                    activeChild.riskLevel === 'medium' ? "bg-alert-100 text-alert-600 border border-alert-300" : 
                    "bg-alert-200 text-alert-700 border border-alert-400"
                  )}>
                    Risk Level: {activeChild.riskLevel}
                  </div>
                </div>
              </div>
            ) : (
                <div className="p-6 rounded-2xl border border-dashed border-border text-center text-text-muted">
                    No active profile
                </div>
            )}

            {otherChildren.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-bold text-text-muted mb-3 uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} /> Switch Account
                </h4>
                <div className="flex flex-col gap-2">
                  {otherChildren.map(child => (
                    <div 
                      key={child.id}
                      onClick={() => onViewProfile(child)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent hover:bg-surface transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-sm border border-border group-hover:border-accent transition-colors">
                        {child.age >= 18 ? <span className="font-serif text-text-muted group-hover:text-accent">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}
                      </div>
                      <div className="flex-1">
                         <h4 className="font-bold text-sm text-text-main group-hover:text-accent transition-colors">{child.name}</h4>
                      </div>
                      <ChevronRight size={14} className="text-text-dim group-hover:text-accent transition-all" />
                    </div>
                  ))}
                </div>
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
                 color="bg-emerald-100 text-emerald-600"
              />
              <StatCard 
                 icon={<AlertCircle size={20} />}
                 label="Active Alerts"
                 value={alerts.filter(a => a.childId === activeChild?.id && !a.read).length.toString()}
                 change="Require attention"
                 color="bg-alert-100 text-alert-600"
                 isUrgent={alerts.filter(a => a.childId === activeChild?.id && !a.read).length > 0}
              />
              <StatCard 
                 icon={<ClipboardCheck size={20} />}
                 label="Assessments"
                 value={dashboardAssessments.length.toString()}
                 change="Completed recently"
                 color="bg-blue-100 text-blue-600"
              />
           </div>

           <div className="glass-card p-6 border-border flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} /> Wellness Trends
                 </h3>
                 <div className="flex bg-surface-2 rounded-lg p-1 border border-border">
                    <button 
                      onClick={() => setChartTimeframe('7d')}
                      className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", chartTimeframe === '7d' ? "bg-surface shadow-sm text-text-main" : "text-text-muted hover:text-text-main")}
                    >
                      7 Days
                    </button>
                    <button 
                      onClick={() => setChartTimeframe('30d')}
                      className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", chartTimeframe === '30d' ? "bg-surface shadow-sm text-text-main" : "text-text-muted hover:text-text-main")}
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
                             <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis 
                         dataKey="day" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fill: '#888888' }} 
                         dy={10}
                       />
                       <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fill: '#888888' }}
                       />
                       <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: '12px', fontWeight: 'bold' }}
                         itemStyle={{ color: 'var(--color-accent)' }}
                       />
                       <Area type="monotone" dataKey="score" stroke="none" fillOpacity={1} fill="url(#colorScore)" />
                       <Line 
                         type="monotone" 
                         dataKey="score" 
                         stroke="var(--color-accent)" 
                         strokeWidth={3}
                         dot={{ r: 4, fill: "var(--color-surface)", strokeWidth: 2 }}
                         activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-accent)" }}
                       />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

      </div>
      
      {activeChild && (
        <RecommendationAI weightedRiskScore={avgScore / 5} childId={activeChild.id} />
      )}

        {interventionChild && (
          <InterventionModal 
            child={interventionChild}
            onClose={() => setInterventionChild(null)}
          />
        )}

        {/* Parent Nudge System & AI Summary */}
        <div className="md:col-span-12 w-full mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="glass-card p-8 h-full flex flex-col">
              <h3 className="text-xl font-serif mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-accent" />
                AI Wellness Summary
              </h3>
              <p className="text-sm text-text-muted leading-relaxed mb-6 flex-1">
                {activeChild?.name} has shown improved emotional consistency this week and maintained strong planner engagement. Their stress levels appear stable, and they are building a solid routine.
              </p>
              <div className="flex gap-2 text-xs font-bold uppercase tracking-widest text-text-dim">
                <span className="bg-surface-2 px-3 py-1 rounded-full border border-border">Mood: Stable</span>
                <span className="bg-surface-2 px-3 py-1 rounded-full border border-border">Stress: Low</span>
              </div>
            </div>

            <div className="glass-card p-8 h-full flex flex-col">
              <h3 className="text-xl font-serif mb-4 flex items-center gap-2">
                <Heart size={20} className="text-alert-500" />
                Supportive Nudges
              </h3>
              <p className="text-sm text-text-muted mb-6">
                Send a quick supportive message or reminder to {activeChild?.name}'s device.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button 
                  onClick={() => alert(`Encouragement sent to ${activeChild?.name}`)}
                  className="bg-surface-2 hover:border-accent text-text-main text-sm font-bold py-3 px-4 rounded-xl border border-border transition-colors text-left flex flex-col gap-1"
                >
                  <span className="text-accent">"You're doing great 💙"</span>
                  <span className="text-[10px] text-text-dim uppercase">Encouragement</span>
                </button>
                <button 
                  onClick={() => alert(`Reminder sent to ${activeChild?.name}`)}
                  className="bg-surface-2 hover:border-indigo-400 text-text-main text-sm font-bold py-3 px-4 rounded-xl border border-border transition-colors text-left flex flex-col gap-1"
                >
                  <span className="text-indigo-400">"Don't forget to pack!"</span>
                  <span className="text-[10px] text-text-dim uppercase">Planner Nudge</span>
                </button>
                <button 
                  onClick={() => alert(`Wellness nudge sent to ${activeChild?.name}`)}
                  className="bg-surface-2 hover:border-emerald-500 text-text-main text-sm font-bold py-3 px-4 rounded-xl border border-border transition-colors text-left flex flex-col gap-1"
                >
                  <span className="text-emerald-500">"Take a 5 min break"</span>
                  <span className="text-[10px] text-text-dim uppercase">Wellness</span>
                </button>
                <button 
                  onClick={handleSetSleepReminder}
                  className="bg-surface-2 hover:border-amber-500 text-text-main text-sm font-bold py-3 px-4 rounded-xl border border-border transition-colors text-left flex flex-col gap-1"
                >
                  <span className="text-amber-500">Sleep Reminder</span>
                  <span className="text-[10px] text-text-dim uppercase">Routine</span>
                </button>
              </div>
            </div>
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

function StatCard({ icon, label, value, change, color, isUrgent }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  change: string; 
  color: string;
  isUrgent?: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", color)}>
        {icon}
      </div>
      <p className="text-xs font-medium text-text-dim mb-1">{label}</p>
      <p className={cn("text-2xl font-serif font-bold", isUrgent && "text-alert-600")}>{value}</p>
      <p className="text-[10px] text-text-dim mt-2">{change}</p>
    </div>
  );
}
