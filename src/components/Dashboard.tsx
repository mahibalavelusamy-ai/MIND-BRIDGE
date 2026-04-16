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
  Trophy
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
import { Lightbulb, ArrowRight, BookOpen, Coffee, UserCircle, Wind } from 'lucide-react';
import ChildSelfCheck from './ChildSelfCheck';
import InterventionModal from './InterventionModal';

interface DashboardProps {
  user: any;
  children: Child[];
  alerts: Alert[];
  onViewProfile: (child: Child) => void;
}

const COLORS = ['#2d7a5a', '#c47a1e', '#c0392b'];

export default function Dashboard({ user, children, alerts, onViewProfile }: DashboardProps) {
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', age: '', grade: '', avatar: '👦' });
  const [schedules, setSchedules] = useState<Record<string, any[]>>({});
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [selfCheckChild, setSelfCheckChild] = useState<Child | null>(null);
  const [interventionChild, setInterventionChild] = useState<Child | null>(null);

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
      if (children.length === 0) return;
      setIsLoadingRecs(true);
      try {
        const child = children[0]; // Default to first child for dashboard recs
        
        // Fetch last assessment
        const qA = query(
          collection(db, 'assessments'),
          where('childId', '==', child.id),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snapA = await getDocs(qA);
        const assessments = snapA.docs.map(d => d.data());

        // Fetch schedule
        const qS = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
        const snapS = await getDocs(qS);
        const schedule = snapS.docs.map(d => d.data());

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

  const pieData = [
    { name: 'Low', value: children.filter(c => c.riskLevel === 'low').length || 1 },
    { name: 'Moderate', value: children.filter(c => c.riskLevel === 'medium').length || 0 },
    { name: 'High', value: children.filter(c => c.riskLevel === 'high').length || 0 },
  ];

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'children'), {
        ...newChild,
        age: parseInt(newChild.age),
        parentId: auth.currentUser.uid,
        riskLevel: 'low',
        moodScore: 7.0,
        stressLevel: 'Low',
        notes: '',
        lastCheckIn: 'Never',
        gems: 0,
        streak: 0,
        level: 1
      });
      setIsAddingChild(false);
      setNewChild({ name: '', age: '', grade: '', avatar: '👦' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'children');
    }
  };

  const selectedChildForChart = children[0];
  const childSchedule = selectedChildForChart ? (schedules[selectedChildForChart.id] || []) : [];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif tracking-tight">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-text-muted mt-1">Here's a bento-style overview of your family's well-being.</p>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Main Insight - Large Bento Box */}
        <div className="md:col-span-8 bg-surface border border-border rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 bg-accent-light text-accent text-[10px] font-bold uppercase tracking-widest rounded-full">Family Insight</span>
              <span className="text-text-dim text-xs">Updated just now</span>
            </div>
            <h3 className="text-2xl font-serif mb-4 leading-tight max-w-md">
              {children.length > 0 
                ? `${children[0].name}'s stress levels are correlating with upcoming exams.`
                : "Welcome! Add your first child to start tracking mental health."}
            </h3>
            
            <div className="h-[280px] mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={MOCK_MOOD_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-dim)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-dim)' }} domain={[0, 10]} />
                  
                  {/* Highlight Exam Periods from schedule */}
                  {childSchedule.map((event, i) => (
                    <React.Fragment key={`ref-${i}`}>
                      <RefArea 
                        x1={event.day || 'Wed'} // Fallback for mock
                        x2={event.day || 'Thu'} 
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
          </div>
        </div>

        {/* Quick Stats - Sidebar Bento Boxes */}
        <div className="md:col-span-4 grid grid-cols-1 gap-6">
          <div className="bg-surface border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-accent-light rounded-2xl flex items-center justify-center text-accent">
                <Heart size={20} />
              </div>
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Avg Mood</span>
            </div>
            <div>
              <p className="text-4xl font-serif font-bold">7.2<span className="text-lg text-text-dim ml-1">/10</span></p>
              <p className="text-xs text-accent mt-2 font-medium">↑ 0.4 from last week</p>
            </div>
          </div>

          <div className={cn(
            "bg-surface border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between transition-all",
            alerts.length > 0 && "border-red-200 bg-red-50/30"
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
        <div className="md:col-span-6 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif">Your Children</h3>
            <button 
              onClick={() => setIsAddingChild(true)}
              className="w-8 h-8 bg-surface-2 rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-all"
            >
              <Plus size={16} />
            </button>
          </div>

          {isAddingChild && (
            <form onSubmit={handleAddChild} className="mb-8 p-6 bg-surface-2 rounded-3xl border border-border space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm">Add New Child</h4>
                <button type="button" onClick={() => setIsAddingChild(false)} className="p-1 hover:bg-border rounded-lg"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Name" className="p-3 rounded-xl border border-border text-sm bg-surface" value={newChild.name} onChange={e => setNewChild({...newChild, name: e.target.value})} />
                <input required type="number" placeholder="Age" className="p-3 rounded-xl border border-border text-sm bg-surface" value={newChild.age} onChange={e => setNewChild({...newChild, age: e.target.value})} />
                <input placeholder="Grade" className="p-3 rounded-xl border border-border text-sm bg-surface" value={newChild.grade} onChange={e => setNewChild({...newChild, grade: e.target.value})} />
                <select className="p-3 rounded-xl border border-border text-sm bg-surface" value={newChild.avatar} onChange={e => setNewChild({...newChild, avatar: e.target.value})}>
                  <option value="👦">👦 Boy</option>
                  <option value="👧">👧 Girl</option>
                  <option value="👶">👶 Toddler</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-accent text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all">Add Child</button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-4">
            {children.map(child => (
              <button 
                key={child.id}
                onClick={() => onViewProfile(child)}
                className={cn(
                  "group relative flex items-center gap-4 p-5 rounded-2xl border border-border hover:border-accent hover:bg-accent-light/10 transition-all text-left",
                  child.riskLevel === 'high' && "border-red-200 shadow-sm shadow-red-100"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "w-14 h-14 rounded-full bg-accent-light flex items-center justify-center text-3xl z-10 relative",
                    child.riskLevel === 'high' && "ring-4 ring-red-100"
                  )}>
                    {child.avatar}
                  </div>
                  {child.riskLevel === 'high' && (
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping -z-0" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg group-hover:text-accent transition-colors">{child.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-text-dim">{child.age} years • {child.grade}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-accent">
                      <Sparkles size={10} /> {child.gems || 0}
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelfCheckChild(child);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-light text-accent rounded-lg text-[10px] font-bold uppercase hover:bg-accent hover:text-white transition-all"
                    >
                      <UserCircle size={12} /> Self-Check
                    </button>
                  </div>
                </div>
                <ChevronRight size={18} className="text-text-dim group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {selfCheckChild && (
          <ChildSelfCheck 
            child={selfCheckChild}
            onClose={() => setSelfCheckChild(null)}
            onComplete={() => {
              // Optionally refresh data
              setSelfCheckChild(null);
            }}
          />
        )}

        {interventionChild && (
          <InterventionModal 
            child={interventionChild}
            onClose={() => setInterventionChild(null)}
          />
        )}

        {/* Distribution - Medium Bento Box */}
        <div className="md:col-span-6 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
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
        <div className="md:col-span-12 bg-surface border border-border rounded-[2rem] p-8 shadow-sm relative overflow-hidden mb-8">
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent-light text-accent rounded-2xl">
                  <Lightbulb size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-serif">Personalized Recommendations</h3>
                  <p className="text-sm text-text-muted">Adaptive strategies based on {children[0]?.name}'s recent data</p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-text-dim"
              >
                <Sparkles size={20} />
              </button>
            </div>

            {isLoadingRecs ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-surface-2 rounded-3xl animate-pulse border border-border" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendations.map((rec) => (
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
                      <button className="w-full py-3 bg-white border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-all">
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
        <div className="md:col-span-12 bg-surface border border-border rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-serif mb-1">Wellness Garden</h3>
                <p className="text-sm text-text-muted">Encourage positive habits through gamified rewards.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-border transition-all">
                  View Shop
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {children.map(child => (
                <div key={child.id} className="flex flex-col items-center gap-3 p-4 bg-surface-2 rounded-[2rem] border border-border group hover:border-accent transition-all">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                      {child.avatar}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-surface border-2 border-accent rounded-full flex items-center justify-center text-xs font-bold text-accent shadow-lg">
                      Lvl {child.level || 1}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">{child.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-accent">
                        <Sparkles size={10} /> {child.gems || 0}
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
                  Add a child to see their wellness garden progress.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
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
