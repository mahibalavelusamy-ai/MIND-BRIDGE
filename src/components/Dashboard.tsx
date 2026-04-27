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

  const [todayClasses, setTodayClasses] = useState<any[]>([]);
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
    if (!activeChild) return;
    
    // Listen to today's schedule for activeChild
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const todayIndex = new Date().getDay();
    const currentDay = todayIndex >= 1 && todayIndex <= 5 ? DAYS[todayIndex - 1] : 'Monday';

    const qSchedules = query(collection(db, 'children', activeChild.id, 'schedules'));
    const unsubscribeSchedules = onSnapshot(qSchedules, (snap) => {
      const scheduleData = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const uniqueScheduleIds = new Set();
      const filteredForToday = scheduleData.filter(event => {
        const dedupeKey = `${event.subject || event.title}-${event.day}-${event.startTime}`;
        if (uniqueScheduleIds.has(dedupeKey)) return false;
        uniqueScheduleIds.add(dedupeKey);
        return event.day === currentDay;
      }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      
      setTodayClasses(filteredForToday);
    });

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

    return () => unsubscribeSchedules();
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
                <p className="text-sm font-bold text-accent dark:text-white">
                  Day {activeChild.streak || 0}/7 — {7 - (activeChild.streak || 0)} more days to unlock 70 bonus credits!
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <Trophy size={24} />
              </div>
            </div>
          )}
          <button 
            onClick={() => setActiveTab('shop')}
            className="flex items-center gap-2 bg-amber-100 text-amber-700 px-6 py-2.5 rounded-xl font-bold hover:bg-amber-200 transition-colors shadow-sm"
          >
            <Sparkles size={18} />
            {activeChild?.age >= 18 ? 'Habit Tracker' : 'Wellness Shop'}
          </button>
        </div>
      </div>

      {/* Bento Grid Layout - Purged Personalized Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto w-full">
        
        {/* Children List */}
        <div className="md:col-span-7 lg:col-span-8 w-full">
          <div className="glass-card p-8 h-full">
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
      </div>

      {/* Today's Overview Widget */}
      <div className="md:col-span-5 lg:col-span-4 w-full">
        <div className="glass-card p-6 h-full flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <BookOpen size={80} />
          </div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-lg font-serif flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <BookOpen size={16} />
              </div>
              Today's Overview
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-4 relative z-10 pr-2">
            {todayClasses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 bg-surface text-text-muted rounded-full flex items-center justify-center mb-3">
                  <Coffee size={20} />
                </div>
                <p className="font-bold text-sm text-text-main mb-1">No Classes Today</p>
                <p className="text-xs text-text-muted">Enjoy your free time!</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-indigo-500/30 ml-3 pl-4 space-y-6">
                {todayClasses.map((event, i) => (
                  <div key={event.id || i} className="relative group">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-surface-2 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                    <div className="bg-surface-2/50 hover:bg-surface-2 border border-border group-hover:border-indigo-500/30 p-3 rounded-xl transition-all cursor-default">
                      <p className="font-bold text-sm text-text-main">{event.subject}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-text-muted font-medium flex items-center gap-1">
                          <Clock size={12} /> {event.startTime} - {event.endTime}
                        </p>
                        {event.room && (
                          <p className="text-[10px] bg-white/10 dark:bg-black/20 text-text-dim px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                            {event.room}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              if (activeChild) onViewProfile(activeChild);
            }}
            className="mt-auto w-full bg-surface-2 border border-border hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 relative z-10 group"
          >
            View Full Schedule
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

        {interventionChild && (
          <InterventionModal 
            child={interventionChild}
            onClose={() => setInterventionChild(null)}
          />
        )}

        {/* Distribution - Full Width Bento Box */}
        <div className="md:col-span-12 max-w-5xl mx-auto w-full mt-6">
          <div className="glass-card p-8">
            <h3 className="text-xl font-serif mb-8 text-center">Risk Distribution</h3>
            <div className="h-[300px] flex items-center justify-center relative">
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
        </div>

        {/* Wellness Garden - Full Width Bento Box */}
        <div className="md:col-span-12 max-w-5xl mx-auto w-full mt-6">
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Sparkles size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-serif mb-1">{activeChild?.age >= 18 ? 'Habit Tracker' : 'Wellness Garden'}</h3>
                  <p className="text-sm text-text-muted">{activeChild?.age >= 18 ? 'Encourage positive habits through a simple credit system.' : 'Encourage positive habits through gamified rewards.'}</p>
                  {activeChild && (
                    <div className="mt-4 inline-flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-500/30 px-4 py-2 rounded-xl">
                      <Trophy className="text-orange-500 dark:text-orange-400" size={18} />
                      <div>
                        <p className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider">Mega Prize Progress</p>
                        <p className="text-[10px] text-orange-600 dark:white font-bold tracking-tight">
                          Day {activeChild.streak || 0}/7 — {7 - (activeChild.streak || 0)} more days to unlock 20 bonus credits!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('shop')}
                    className="px-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-border transition-all"
                  >
                    Wellness Shop
                  </button>
                  <button 
                    onClick={() => setActiveTab('assessment')}
                    className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-all"
                  >
                    Start Check-in
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
              </div>
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
