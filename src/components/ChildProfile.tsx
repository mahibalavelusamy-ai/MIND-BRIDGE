import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Plus, 
  Trash2,
  TrendingUp,
  AlertCircle,
  X,
  BrainCircuit,
  Sparkles,
  Save,
  Shield,
  Lock,
  Info,
  MessageSquare,
  Smile
} from 'lucide-react';
import { Child, PredictiveRisk, RootCauseAnalysis } from '../types';
import { cn } from '../lib/utils';
import { db, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, OperationType, handleFirestoreError, updateDoc, getDocs, orderBy, limit } from '../lib/firebase';
import { getAIInsights } from '../services/geminiService';
import { predictFutureRisk } from '../lib/predictiveService';
import { ShieldAlert, Zap, Target } from 'lucide-react';
import FocusTimer from './FocusTimer';

interface ChildProfileProps {
  child: Child;
  onUpdate: (child: Child) => void;
  onStartAssessment: () => void;
}

export default function ChildProfile({ child, onUpdate, onStartAssessment }: ChildProfileProps) {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'class', time: '', day: 'Monday', subject: '', difficulty: 'medium' });
  const [formData, setFormData] = useState(child);
  const [isSaving, setIsSaving] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [prediction, setPrediction] = useState<PredictiveRisk | null>(null);
  const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);

  const calculateDisplayScore = (assessments: any[]) => {
    if (assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => acc + (curr.totalScore || curr.score || 0), 0);
    return Math.round(sum / assessments.length);
  };

  const fetchRootCause = async () => {
    try {
      const q = query(
        collection(db, 'rootCauseAnalyses'),
        where('childId', '==', child.id)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const analyses = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as RootCauseAnalysis))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRootCause(analyses[0]);
      }
    } catch (error) {
      console.error("Error fetching root cause:", error);
    }
  };

  useEffect(() => {
    setFormData(child);
    fetchInsight();
    fetchPrediction();
    fetchRootCause();
    
    const q = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleRaw = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
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
      setSchedule(Array.from(scheduleMap.values()) as any);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schoolSchedules');
    });
    return () => unsubscribe();
  }, [child.id]);

  const fetchInsight = async () => {
    setIsLoadingInsight(true);
    const insight = await getAIInsights(child);
    setAiInsight(insight);
    setIsLoadingInsight(false);
  };

  const fetchPrediction = async () => {
    setIsLoadingPrediction(true);
    try {
      // Fetch last 7 assessments
      const qA = query(
        collection(db, 'assessments'), 
        where('childId', '==', child.id)
      );
      const snapA = await getDocs(qA);
      const assessmentsData = snapA.docs
        .map(d => d.data())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 7);
      
      setAssessments(assessmentsData);

      // Fetch schedule
      const qS = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
      const snapS = await getDocs(qS);
      const scheduleRaw = snapS.docs.map(d => d.data());
      
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
      const scheduleData = Array.from(scheduleMap.values());

      const pred = await predictFutureRisk(child.id, assessmentsData, scheduleData);
      setPrediction(pred);
    } catch (error) {
      console.error("Error fetching prediction:", error);
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'children', child.id), {
        name: formData.name,
        age: formData.age,
        grade: formData.grade,
        notes: formData.notes,
        gender: formData.gender,
        avatar: formData.avatar
      });
      onUpdate(formData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'children');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'schoolSchedules'), {
        ...newEvent,
        childId: child.id
      });
      setIsAddingEvent(false);
      setNewEvent({ title: '', type: 'class', time: '', day: 'Monday', subject: '', difficulty: 'medium' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schoolSchedules');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schoolSchedules', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'schoolSchedules');
    }
  };

  const getStatus = (age: number) => {
    if (age >= 18) return 'College/University';
    if (age > 5) return 'Student';
    return 'Toddler';
  };

  const pronouns = (() => {
    if (child.gender === 'male') return { subject: 'He', object: 'him', possessive: 'His' };
    if (child.gender === 'female') return { subject: 'She', object: 'her', possessive: 'Her' };
    return { subject: 'They', object: 'them', possessive: 'Their' };
  })();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="w-24 h-24 rounded-2xl bg-accent-light flex items-center justify-center text-5xl shadow-inner">
            {child.age >= 18 ? <span className="font-serif text-accent">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-serif">{child.name}</h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest",
                child.riskLevel === 'low' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {child.riskLevel} risk
              </span>
            </div>
            <p className="text-text-muted mb-6">{child.age} years old • {getStatus(child.age)}{child.age >= 18 ? '' : ` • Grade ${child.grade}`}</p>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={onStartAssessment}
                className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-accent-hover transition-all shadow-lg shadow-accent/10"
              >
                Start Assessment
              </button>
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'children', child.id), {
                      consentToSchoolSharing: !child.consentToSchoolSharing
                    });
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, 'children');
                  }
                }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border flex items-center gap-2",
                  child.consentToSchoolSharing 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-surface border-border text-text-dim hover:text-text-main"
                )}
              >
                <Shield size={16} />
                {child.consentToSchoolSharing ? "School Sharing Active" : "Enable School Sharing"}
              </button>
              
              {child.age >= 18 && (
                <button 
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'children', child.id), {
                        privacyLevel: child.privacyLevel === 'summary' ? 'full' : 'summary'
                      });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, 'children');
                    }
                  }}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border flex items-center gap-2",
                    child.privacyLevel === 'summary' 
                      ? "bg-purple-50 text-purple-700 border-purple-200" 
                      : "bg-surface border-border text-text-dim hover:text-text-main"
                  )}
                >
                  <Lock size={16} />
                  {child.privacyLevel === 'summary' ? "High-Level Summary Only" : "Data Privacy: Full Sharing"}
                </button>
              )}
              
              <button className="px-6 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-border transition-all">
                Edit Profile
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-surface-2 rounded-xl border border-border text-center">
              <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Avg Score</p>
              <p className="text-2xl font-serif font-bold text-accent">{assessments.length === 0 ? '-' : calculateDisplayScore(assessments)}</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-xl border border-border text-center">
              <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Stress</p>
              <p className="text-2xl font-serif font-bold text-amber-600">{child.stressLevel}</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-xl border border-border text-center">
              <p className="text-[10px] font-bold text-text-dim uppercase mb-1">{child.age >= 18 ? 'Credits' : 'Mind Gems'}</p>
              <div className="flex items-center justify-center gap-1 text-2xl font-serif font-bold text-accent">
                <Sparkles size={18} /> {child.gems || 0}
              </div>
            </div>
            <div className="p-4 bg-surface-2 rounded-xl border border-border text-center">
              <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Streak</p>
              <div className="flex items-center justify-center gap-1 text-2xl font-serif font-bold text-orange-500">
                <Zap size={18} /> {child.streak || 0}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Form */}
          <div className="glass-card p-8">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Save size={20} className="text-accent" />
              {pronouns.possessive} Profile Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-dim uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 rounded-lg border border-border bg-surface-2 focus:border-accent outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-dim uppercase">Age</label>
                  <input 
                    type="number" 
                    value={formData.age} 
                    onChange={e => {
                      const age = parseInt(e.target.value);
                      let grade = formData.grade;
                      let gender = formData.gender;
                      let avatar = formData.avatar;
                      if (!isNaN(age)) {
                        if (age >= 18) {
                          grade = 'College/University';
                          if (gender === 'other') gender = 'male';
                        }
                        if (age > 5 && avatar === '👶') {
                          avatar = '👦';
                        }
                      }
                      setFormData({...formData, age, grade, gender, avatar});
                    }}
                    className="w-full p-3 rounded-lg border border-border bg-surface-2 focus:border-accent outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-dim uppercase">Grade</label>
                  <input 
                    type="text" 
                    value={formData.grade} 
                    onChange={e => setFormData({...formData, grade: e.target.value})}
                    disabled={formData.age >= 18}
                    className={cn("w-full p-3 rounded-lg border border-border bg-surface-2 focus:border-accent outline-none transition-all", formData.age >= 18 && "opacity-60 cursor-not-allowed")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-dim uppercase">Gender</label>
                  <select 
                    value={formData.gender || 'male'} 
                    onChange={e => setFormData({...formData, gender: e.target.value as any})}
                    className="w-full p-3 rounded-lg border border-border bg-surface-2 focus:border-accent outline-none transition-all"
                  >
                    <option value="male">Boy</option>
                    <option value="female">Girl</option>
                    {formData.age < 18 && <option value="other">Other</option>}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-dim uppercase">Avatar</label>
                  <select 
                    value={formData.avatar || '👦'} 
                    onChange={e => setFormData({...formData, avatar: e.target.value})}
                    className="w-full p-3 rounded-lg border border-border bg-surface-2 focus:border-accent outline-none transition-all"
                  >
                    <option value="👦">👦 Boy</option>
                    <option value="👧">👧 Girl</option>
                    {formData.age <= 5 && <option value="👶">👶 Toddler</option>}
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-text-dim uppercase">Background / Notes</label>
                <textarea 
                  rows={4}
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 rounded-lg border border-border bg-surface-2 focus:border-accent outline-none transition-all resize-none"
                  placeholder="Enter any relevant background information..."
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : <><Save size={18} /> Save Changes</>}
              </button>
            </div>
          </div>

          {/* Root-Cause Analysis Engine */}
          {assessments.length === 0 ? (
            <div className="glass-card p-12 mb-8 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-4"><Sparkles size={28} /></div>
              <h3 className="text-xl font-serif">No data available</h3>
              <p className="text-text-muted max-w-md">Complete your first check-in to generate insights.</p>
              <button onClick={onStartAssessment} className="mt-4 px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-accent-hover transition-all shadow-lg shadow-accent/10">Start Assessment</button>
            </div>
          ) : (
            <div className="glass-card p-8 mb-8">
              <div className="absolute -right-12 -top-12 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent-light text-accent rounded-2xl">
                      <BrainCircuit size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif">Root-Cause Analysis</h3>
                      <p className="text-sm text-text-muted">Multi-factor correlation engine results</p>
                    </div>
                  </div>
                  {child.privacyLevel === 'summary' ? null : rootCause && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-xl w-fit">
                      <span className="text-[10px] font-bold text-text-dim uppercase">Confidence</span>
                      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${rootCause.confidence * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold">{Math.round(rootCause.confidence * 100)}%</span>
                    </div>
                  )}
                </div>

                {child.privacyLevel === 'summary' ? (
                  <div className="flex items-center gap-3 text-purple-400 bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                    <Lock size={20} />
                    <p className="text-sm font-medium">Root-cause analysis is hidden due to privacy settings.</p>
                  </div>
                ) : rootCause ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="p-6 bg-surface-2 rounded-3xl border border-border">
                        <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Primary Factor</p>
                        <h4 className="text-xl font-bold mb-4">{rootCause.primaryFactor}</h4>
                        <p className="text-text-muted leading-relaxed">{rootCause.explanation}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-surface-2 rounded-3xl border border-border">
                          <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4">Contributing Factors</p>
                          <div className="flex flex-wrap gap-2">
                            {rootCause.contributingFactors.map((f, i) => (
                              <span key={i} className="px-3 py-1 bg-white border border-border rounded-lg text-xs font-medium">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="p-6 bg-surface-2 rounded-3xl border border-border">
                          <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4">Evidence Points</p>
                          <ul className="space-y-2">
                            {rootCause.evidence.map((e, i) => (
                              <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                                {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-accent-light/10 border border-accent/20 rounded-3xl p-6">
                      <h4 className="font-bold text-accent mb-4 flex items-center gap-2">
                        <Zap size={18} />
                        Actionable Logic
                      </h4>
                      <div className="space-y-4">
                        <p className="text-xs text-text-muted leading-relaxed">
                          The engine has correlated <strong>{rootCause.evidence.length}</strong> data points across mood, sleep, and school schedule.
                        </p>
                        <div className="p-4 bg-white rounded-2xl border border-accent/10 shadow-sm">
                          <p className="text-[10px] font-bold text-accent uppercase mb-2">Recommended Strategy</p>
                          <p className="text-xs font-medium">
                            {rootCause.primaryFactor === "Academic Pressure" 
                              ? "Reduce extracurricular load this week and prioritize 9+ hours of sleep." 
                              : "Focus on emotional validation and one-on-one connection time."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-surface-2 rounded-3xl border border-dashed border-border">
                    <p className="text-text-muted">Complete an assessment to generate a root-cause analysis.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar size={20} className="text-accent" />
                {pronouns.possessive} Schedule
              </h3>
              <button 
                onClick={() => setIsAddingEvent(true)}
                className="text-accent text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={16} /> Add event
              </button>
            </div>

            {isAddingEvent && (
              <form onSubmit={handleAddEvent} className="mb-6 p-4 bg-surface-2 rounded-xl border border-border space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm">Add New Event</h4>
                  <button type="button" onClick={() => setIsAddingEvent(false)}><X size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    required
                    placeholder="Title (e.g. Math Exam)" 
                    className="p-2 rounded-lg border border-border text-sm"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  />
                  <select 
                    className="p-2 rounded-lg border border-border text-sm"
                    value={newEvent.day}
                    onChange={e => setNewEvent({...newEvent, day: e.target.value})}
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input 
                    required
                    type="time"
                    className="p-2 rounded-lg border border-border text-sm"
                    value={newEvent.time}
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                  />
                  <select 
                    className="p-2 rounded-lg border border-border text-sm"
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                  >
                    <option value="class">Class</option>
                    <option value="exam">Exam</option>
                    <option value="activity">Activity</option>
                    <option value="deadline">Deadline</option>
                  </select>
                  <input 
                    placeholder="Subject (e.g. Math)" 
                    className="p-2 rounded-lg border border-border text-sm"
                    value={newEvent.subject}
                    onChange={e => setNewEvent({...newEvent, subject: e.target.value})}
                  />
                  <select 
                    className="p-2 rounded-lg border border-border text-sm"
                    value={newEvent.difficulty}
                    onChange={e => setNewEvent({...newEvent, difficulty: e.target.value})}
                  >
                    <option value="low">Low Difficulty</option>
                    <option value="medium">Medium Difficulty</option>
                    <option value="high">High Difficulty</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-accent text-white py-2 rounded-lg text-sm font-medium">Add to Schedule</button>
              </form>
            )}

            <div className="space-y-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const dayEvents = schedule.filter(e => e.day === day);
                if (dayEvents.length === 0) return null;
                return (
                  <div key={day} className="space-y-2">
                    <h4 className="text-xs font-bold text-text-dim uppercase tracking-widest">{day}</h4>
                    {dayEvents.map(event => (
                      <div key={event.id} className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl border border-border group">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          event.type === 'exam' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {event.type === 'exam' ? <AlertCircle size={20} /> : <BookOpen size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{event.title}</p>
                          <p className="text-xs text-text-dim flex items-center gap-1">
                            <Clock size={12} /> {event.time}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-text-dim hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
              {schedule.length === 0 && (
                <div className="text-center py-12 text-text-dim italic text-sm">
                  No school schedule added yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-accent-light border border-accent/20 rounded-xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-accent/20 group-hover:text-accent/40 transition-colors">
              <BrainCircuit size={48} />
            </div>
            <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest mb-4">
              <Sparkles size={14} /> Clinical AI Review
            </div>
            {child.privacyLevel === 'summary' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-purple-400 bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                  <Lock size={20} />
                  <p className="text-sm font-medium">Detailed clinical notes are hidden due to privacy settings.</p>
                </div>
              </div>
            ) : isLoadingInsight ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-accent/10 rounded w-full" />
                <div className="h-4 bg-accent/10 rounded w-5/6" />
                <div className="h-4 bg-accent/10 rounded w-4/6" />
              </div>
            ) : (
              <ul className="space-y-2 relative z-10">
                {aiInsight?.split('\n').filter(line => line.trim().length > 0).map((line, i) => (
                  <li key={i} className="text-sm text-text-muted leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <span>{line.replace(/^- /, '')}</span>
                  </li>
                ))}
              </ul>
            )}
            <button 
              onClick={fetchInsight}
              className="mt-6 text-xs text-accent font-bold hover:underline flex items-center gap-1"
            >
              Refresh Insight
            </button>
          </div>

          {/* Predictive Outlook */}
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest mb-4">
              <ShieldAlert size={14} /> Predictive Outlook (7d)
            </div>
            
            {child.privacyLevel === 'summary' ? (
              <div className="flex items-center gap-3 text-purple-400 bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                <Lock size={20} />
                <p className="text-sm font-medium">Predictive modeling is hidden due to privacy settings.</p>
              </div>
            ) : isLoadingPrediction ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-12 bg-surface-2 rounded-xl" />
                <div className="h-20 bg-surface-2 rounded-xl" />
              </div>
            ) : prediction ? (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl border flex items-center justify-between",
                  prediction.predictedRisk === 'low' ? "bg-green-50 border-green-100 text-green-700" :
                  prediction.predictedRisk === 'medium' ? "bg-amber-50 border-amber-100 text-amber-700" :
                  "bg-red-50 border-red-100 text-red-700"
                )}>
                  <div>
                    <p className="text-[10px] font-bold uppercase">Predicted Risk</p>
                    <p className="text-lg font-serif font-bold capitalize">{prediction.predictedRisk}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase">Confidence</p>
                    <p className="text-lg font-serif font-bold">{prediction.confidence}%</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-text-dim uppercase flex items-center gap-2">
                    <Info size={14} /> Model Evidence
                  </h4>
                  <ul className="space-y-1">
                    {prediction.evidence.map((e, i) => (
                      <li key={i} className="text-[10px] text-text-muted leading-relaxed flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-text-dim uppercase flex items-center gap-2">
                    <Target size={14} /> Potential Triggers
                  </h4>
                  <ul className="space-y-1">
                    {prediction.predictedTriggers.map((t, i) => (
                      <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-text-dim mt-1.5 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-text-dim uppercase flex items-center gap-2">
                    <Zap size={14} /> Preemptive Actions
                  </h4>
                  <ul className="space-y-1">
                    {prediction.preemptiveActions.map((a, i) => (
                      <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-dim italic">Insufficient data for prediction.</p>
            )}
            
            <button 
              onClick={fetchPrediction}
              className="mt-6 text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
            >
              Recalculate Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function SummaryBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface-2 p-4 rounded-lg text-center">
      <p className="text-[10px] font-bold text-text-dim uppercase mb-1">{label}</p>
      <p className={cn("text-xl font-serif font-bold", color)}>{value}</p>
    </div>
  );
}
