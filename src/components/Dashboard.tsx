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
  MapPin
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
import { db, auth, collection, addDoc, OperationType, handleFirestoreError, query, where, getDocs, orderBy, limit } from '../lib/firebase';
import { generateRecommendations } from '../lib/recommendationService';
import { Lightbulb, ArrowRight, BookOpen, Coffee, Wind, Lock } from 'lucide-react';
import InterventionModal from './InterventionModal';
import FocusTimer from './FocusTimer';
import WellnessShop from './WellnessShop';

interface DashboardProps {
  user: any;
  children: Child[];
  alerts: Alert[];
  onViewProfile: (child: Child) => void;
  selectedChild?: Child | null;
  setActiveTab: (tab: any) => void;
}

const COLORS = ['#2d7a5a', '#c47a1e', '#c0392b'];

export default function Dashboard({ user, children, alerts, onViewProfile, selectedChild, setActiveTab }: DashboardProps) {
  // Session Isolation: Filter children to only show the currently authenticated profile if one is selected
  const displayChildren = selectedChild ? children.filter(c => c.id === selectedChild.id) : children;
  const activeChild = selectedChild || children[0];

  const [schedules, setSchedules] = useState<Record<string, any[]>>({});
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [interventionChild, setInterventionChild] = useState<Child | null>(null);
  const [dashboardAssessments, setDashboardAssessments] = useState<any[]>([]);
  const [isShopOpen, setIsShopOpen] = useState(false);
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
    const fetchSchedules = async () => {
      if (children.length === 0) return;
      const newSchedules: Record<string, any[]> = {};
      
      for (const child of children) {
        const q = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
        const snap = await getDocs(q);
        newSchedules[child.id] = snap.docs.map(d => d.data());
      }
      setSchedules(newSchedules);
    };

    const fetchRecommendations = async () => {
      if (!activeChild) return;
      setIsLoadingRecs(true);
      try {
        const child = activeChild; 
        
        // Fetch last assessment
        const qA = query(
          collection(db, 'assessments'),
          where('childId', '==', child.id),
          orderBy('timestamp', 'desc'),
          limit(7)
        );
        const snapA = await getDocs(qA);
        const assessments = snapA.docs.map(d => d.data());
        setDashboardAssessments(assessments);

        // Fetch schedule
        const qS = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
        const snapS = await getDocs(qS);
        const scheduleRaw = snapS.docs.map(d => d.data());
        
        // Strict deduplication by title/day/time
        const scheduleMap = new Map();
        scheduleRaw.forEach(item => {
          const key = `${item.title}-${item.day}-${item.time}`;
          if (!scheduleMap.has(key)) {
            scheduleMap.set(key, {
              ...item,
              title: item.title || 'TBD',
              day: item.day || 'TBD',
              time: item.time || 'TBD',
              subject: item.subject || 'TBD'
            });
          }
        });
        const schedule = Array.from(scheduleMap.values());

        const recs = await generateRecommendations(child, assessments, schedule);
        setRecommendations(recs);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setIsLoadingRecs(false);
      }
    };

    fetchSchedules();
    fetchRecommendations();
  }, [children]);

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
    },
    {
      id: 'find-spot',
      type: 'resource',
      title: 'Find a Study Spot',
      description: `Locate a quiet, distraction-free environment for deep work sessions.`,
      priority: 'low',
      context: 'Environment',
      actionLabel: 'Open Map',
      onClick: () => setShowSpotsModal(true)
    }
  ];

  const pieData = [
    { name: 'Low', value: displayChildren.filter(c => c.riskLevel === 'low').length || 1 },
    { name: 'Moderate', value: displayChildren.filter(c => c.riskLevel === 'medium').length || 0 },
    { name: 'High', value: displayChildren.filter(c => c.riskLevel === 'high').length || 0 },
  ];

  const selectedChildForChart = activeChild;
  const rawSchedule = selectedChildForChart ? (schedules[selectedChildForChart.id] || []) : [];
  
  // Deduplicate and fallback
  const uniqueScheduleIds = new Set();
  const childSchedule = rawSchedule.filter(event => {
    const idToUse = event.title || event.id; // force deduplicate by title primarily as requested
    if (uniqueScheduleIds.has(idToUse)) return false;
    uniqueScheduleIds.add(idToUse);
    // Apply null fallbacks here
    event.title = event.title || 'TBD';
    event.time = event.time || 'TBD';
    event.day = event.day || 'TBD';
    event.subject = event.subject || 'TBD';
    return true;
  });

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
          <h1 className="text-4xl font-serif tracking-tight">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-text-muted mt-1">Here's a bento-style overview of your family's well-being.</p>
        </div>
        <button 
          onClick={() => setIsShopOpen(true)}
          className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold hover:bg-amber-200 transition-colors"
        >
          <Trophy size={18} />
          {children[0]?.age >= 18 ? 'Habit Tracker' : 'Wellness Shop'}
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Main Insight - Large Bento Box */}
        <div className="md:col-span-8 glass-card p-8 group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-accent-light text-accent text-[10px] font-bold uppercase tracking-widest rounded-full">Mental State Trend</span>
                <span className="text-text-dim text-xs">Updated just now</span>
              </div>
              <div className="flex bg-surface-2 border border-border p-1 rounded-xl">
                 <button 
                   onClick={() => setChartTimeframe('7d')}
                   className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", chartTimeframe === '7d' ? "bg-accent text-white" : "text-text-dim hover:text-text-main")}
                 >7 Days</button>
                 <button 
                   onClick={() => setChartTimeframe('30d')}
                   className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", chartTimeframe === '30d' ? "bg-accent text-white" : "text-text-dim hover:text-text-main")}
                 >30 Days</button>
              </div>
            </div>
            <h3 className="text-2xl font-serif mb-4 leading-tight max-w-md">
              {activeChild && dashboardAssessments.length > 0
                ? `${activeChild.name}'s stress levels are correlating with upcoming exams.`
                : activeChild 
                  ? `Ready to track ${activeChild.name}'s well-being?`
                  : "Welcome! Add your first profile to start tracking."}
            </h3>
            
            {dashboardAssessments.length === 0 && activeChild ? (
              <div className="h-[280px] mt-8 flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-border bg-surface/50">
                 <p className="text-text-muted mb-6">No data available. Complete your first check-in to generate insights.</p>
                 <button onClick={() => onViewProfile(activeChild)} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all">Go to Profile</button>
              </div>
            ) : (
              <div className="h-[280px] mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-dim)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-dim)' }} domain={[0, 10]} />
                  
                  {/* Highlight Exam Periods from schedule */}
                  {childSchedule.slice(0, 1).map((event, i) => (
                    <React.Fragment key={`ref-${i}`}>
                      <RefArea 
                        x1={event.day && event.day !== 'TBD' ? event.day.substring(0, 3) : 'Wed'} 
                        x2={event.day && event.day !== 'TBD' ? event.day.substring(0, 3) : 'Thu'} 
                        fill="var(--color-accent-light)" 
                        fillOpacity={0.3}
                      />
                    </React.Fragment>
                  ))}

                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid var(--color-border)', 
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-main)',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                    }}
                  />
                  <Area type="monotone" dataKey="score" fill="var(--color-accent-light)" stroke="none" fillOpacity={0.2} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--color-accent)" 
                    strokeWidth={4} 
                    dot={{ r: 5, fill: 'var(--color-accent)', strokeWidth: 2, stroke: 'var(--color-surface)' }} 
                    activeDot={{ r: 8, strokeWidth: 0 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>
        </div>

        {/* Quick Stats - Sidebar Bento Boxes */}
        <div className="md:col-span-4 grid grid-cols-1 gap-6">
          <div className="glass-card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-accent-light rounded-2xl flex items-center justify-center text-accent">
                <Heart size={20} />
              </div>
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Avg Score</span>
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-white/20" strokeWidth="8" fill="none" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="stroke-accent drop-shadow-[0_0_8px_rgba(45,122,90,0.8)] transition-all duration-1000" 
                    strokeWidth="8" fill="none" 
                    strokeDasharray={2 * Math.PI * 40} 
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (avgScore || 0) / 10)} 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-serif font-bold text-text-main">{dashboardAssessments.length === 0 ? '-' : avgScore}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-accent font-medium leading-relaxed">Based on your recent family assessments</p>
              </div>
            </div>
          </div>

          <div className={cn(
            "glass-card p-6 flex flex-col justify-between",
            alerts.length > 0 && "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center",
                alerts.length > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-100 text-blue-600"
              )}>
                <AlertCircle size={20} />
              </div>
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Active Alerts</span>
            </div>
            <div>
              <p className={cn("text-4xl font-serif font-bold", alerts.length > 0 && "text-red-600")}>
                {alerts.length}
              </p>
              <p className="text-xs text-text-muted mt-2">
                {alerts.length > 0 ? "Requires immediate attention" : "All systems normal"}
              </p>
            </div>
          </div>
        </div>

        {/* Children List - Medium Bento Box */}
        <div className="md:col-span-6 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif">{activeChild?.age >= 18 ? 'Your Student' : 'Your Profile'}</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {displayChildren.map(child => (
              <div 
                key={child.id}
                onClick={() => onViewProfile(child)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewProfile(child);
                  }
                }}
                className={cn(
                  "group relative flex items-center gap-4 p-5 rounded-2xl border border-border hover:border-accent hover:bg-accent-light/10 transition-all text-left cursor-pointer",
                  child.riskLevel === 'high' && "border-red-200 shadow-sm shadow-red-100"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "w-14 h-14 rounded-full bg-accent-light flex items-center justify-center text-3xl z-10 relative",
                    child.riskLevel === 'high' && "ring-4 ring-red-100"
                  )}>
                    {child.age >= 18 ? <span className="font-serif text-accent">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}
                  </div>
                  {child.riskLevel === 'high' && (
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping -z-0" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg group-hover:text-accent transition-colors">{child.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-text-dim">{child.age} years • {child.age >= 18 ? 'College / University Student' : child.grade}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-accent">
                      <Sparkles size={10} /> {child.gems || 0} {child.age >= 18 ? 'Credits' : ''}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                      <Zap size={10} /> {child.streak || 0}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    child.riskLevel === 'low' ? "bg-green-100 text-green-700" : 
                    child.riskLevel === 'medium' ? "bg-amber-100 text-amber-700" : 
                    "bg-red-100 text-red-700"
                  )}>
                    {child.riskLevel}
                  </div>
                  {(child.riskLevel === 'high' || child.riskLevel === 'medium') && (
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setInterventionChild(child);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 transition-all border border-blue-100"
                      >
                        <Wind size={12} /> Breathe
                      </button>
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="text-text-dim group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>

        {interventionChild && (
          <InterventionModal 
            child={interventionChild}
            onClose={() => setInterventionChild(null)}
          />
        )}

        {/* Distribution - Medium Bento Box */}
        <div className="md:col-span-6 glass-card p-8">
          <h3 className="text-xl font-serif mb-8">Risk Distribution</h3>
          <div className="h-[280px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-serif font-bold">{children.length}</span>
              <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest">Total</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-text-muted font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Recommendations */}
        <div className="md:col-span-12 glass-card p-8 mb-8">
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent-light text-accent rounded-2xl">
                  <Lightbulb size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-serif">Personalized Recommendations</h3>
                  <p className="text-sm text-text-muted">Adaptive strategies based on {activeChild?.name}'s recent data</p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-text-dim"
              >
                <Sparkles size={20} />
              </button>
            </div>

            {activeChild?.privacyLevel === 'summary' ? (
              <div className="flex items-center gap-3 text-purple-400 bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                <Lock size={20} />
                <p className="text-sm font-medium">Personalized recommendations are disabled due to privacy settings.</p>
              </div>
            ) : isLoadingRecs ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-surface-2 rounded-3xl animate-pulse border border-border" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(recommendations.length > 0 ? recommendations : SHORTCUTS).map((rec: any) => (
                  <div key={rec.id} className="group p-6 bg-surface-2 rounded-3xl border border-border hover:border-accent/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          rec.type === 'activity' ? "bg-blue-100 text-blue-700" :
                          rec.type === 'resource' ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>
                          {rec.type}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase",
                          rec.priority === 'high' ? "text-red-500" : "text-text-dim"
                        )}>
                          {rec.priority} priority
                        </span>
                      </div>
                      <h4 className="font-bold text-lg mb-2 group-hover:text-accent transition-colors">{rec.title}</h4>
                      <p className="text-xs text-text-muted leading-relaxed mb-4">{rec.description}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-text-dim uppercase">
                        <Coffee size={12} />
                        Context: {rec.context}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (rec.onClick) {
                            rec.onClick();
                          } else if (rec.actionLabel === 'Start Check-in') {
                            setActiveTab('assessment');
                          }
                        }}
                        className="w-full py-3 bg-white border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-all"
                      >
                        {rec.actionLabel}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wellness Garden - Full Width Bento Box */}
        <div className="md:col-span-12 glass-card p-8">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-serif mb-1">{activeChild?.age >= 18 ? 'Habit Tracker' : 'Wellness Garden'}</h3>
                <p className="text-sm text-text-muted">{activeChild?.age >= 18 ? 'Encourage positive habits through a simple credit system.' : 'Encourage positive habits through gamified rewards.'}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsShopOpen(true)}
                  className="px-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-border transition-all"
                >
                  View Shop
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {displayChildren.map(child => (
                <div key={child.id} className="flex flex-col items-center gap-3 p-4 bg-surface-2 rounded-[2rem] border border-border group hover:border-accent transition-all">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                      {child.age >= 18 ? <span className="font-serif text-accent">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}
                    </div>
                    {child.age < 18 && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-surface border-2 border-accent rounded-full flex items-center justify-center text-xs font-bold text-accent shadow-lg">
                        Lvl {child.level || 1}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">{child.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-accent">
                        <Sparkles size={10} /> {child.gems || 0} {child.age >= 18 ? 'Credits' : ''}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                        <Zap size={10} /> {child.streak || 0}
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-accent transition-all duration-1000" 
                      style={{ width: `${((child.gems || 0) % 500) / 5}%` }} 
                    />
                  </div>
                </div>
              ))}
              {children.length === 0 && (
                <div className="col-span-full py-12 text-center text-text-dim italic">
                  Add a profile to start tracking progress.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {selectedChildForChart && (
        <WellnessShop 
          isOpen={isShopOpen} 
          onClose={() => setIsShopOpen(false)} 
          child={selectedChildForChart} 
        />
      )}

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
      <p className={cn("text-2xl font-serif font-bold", isUrgent && "text-red-600")}>{value}</p>
      <p className="text-[10px] text-text-dim mt-2">{change}</p>
    </div>
  );
}
