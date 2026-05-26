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
import { cn, getGradientForChild } from '../lib/utils';
import { db, auth, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, OperationType, handleFirestoreError, updateDoc, getDocs, orderBy, limit, increment, writeBatch } from '../lib/firebase';
import { getAIInsights } from '../services/geminiService';
import { predictFutureRisk } from '../lib/predictiveService';
import { ShieldAlert, Zap, Target } from 'lucide-react';
import FocusTimer from './FocusTimer';

interface ChildProfileProps {
  child: Child;
  onUpdate: (child: Child) => void;
  onStartAssessment: () => void;
  onDelete?: () => void;
}

export default function ChildProfile({ child, onUpdate, onStartAssessment, onDelete }: ChildProfileProps) {
  const [formData, setFormData] = useState(child);
  const [isSaving, setIsSaving] = useState(false);
  const [aiInsight, setAiInsight] = useState<any | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [prediction, setPrediction] = useState<PredictiveRisk | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showCreatePinModal, setShowCreatePinModal] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');
  const [confirmPinValue, setConfirmPinValue] = useState('');

  useEffect(() => {
    if (auth.currentUser && !child.pinSet) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [child.pinSet, child.id]);

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinValue !== confirmPinValue) {
      alert("PINs do not match.");
      return;
    }
    if (!/^\d{4}$/.test(newPinValue)) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'students', child.id), { 
        pin: newPinValue, 
        pinSet: true
      });
      alert("PIN created successfully!");
      onUpdate({ ...child, pin: newPinValue, pinSet: true });
      setShowCreatePinModal(false);
      setNewPinValue('');
      setConfirmPinValue('');
      setShowToast(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDisplayScore = (assessments: any[]) => {
    if (assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => acc + (curr.totalScore || curr.score || 0), 0);
    return Math.round(sum / assessments.length);
  };

  const fetchRootCause = async () => {
    try {
      const q = query(
        collection(db, 'rootCauseAnalyses'),
        where('childId', '==', child.id),
        where('parentId', '==', auth.currentUser?.uid)
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
        where('childId', '==', child.id),
        where('parentId', '==', child.parentId)
      );
      const snapA = await getDocs(qA);
      const assessmentsData = snapA.docs
        .map(d => d.data())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 7);
      
      setAssessments(assessmentsData);

      // Fetch schedule from new subcollection
      const qS = query(collection(db, `students/${child.id}/schedules`));
      const snapS = await getDocs(qS);
      const scheduleData = snapS.docs.map(d => d.data());

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
      await updateDoc(doc(db, 'students', child.id), {
        name: formData.name,
        age: formData.age,
        grade: formData.grade,
        notes: formData.notes,
        gender: formData.gender,
        avatar: formData.avatar
      });
      onUpdate(formData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    } finally {
      setIsSaving(false);
    }
  };

  const Maps = (path: string) => {
    if (path === '/switch-profile' && onDelete) {
      onDelete();
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);

      // 1. Atomic Cleanup: Query all associated sub-collections
      const collectionsToCleanup = ['assessments', 'schoolSchedules', 'rootCauseAnalyses', 'alerts', 'sessions'];
      
      for (const collName of collectionsToCleanup) {
        try {
          const authUid = auth.currentUser?.uid;
          if (!authUid) continue;

          let q;
          if (collName === 'sessions') {
            q = query(collection(db, collName), where('childId', '==', child.id), where('userId', '==', authUid));
          } else {
            q = query(collection(db, collName), where('childId', '==', child.id), where('parentId', '==', authUid));
          }
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            batch.delete(doc(db, collName, d.id));
          });
        } catch (subErr) {
          console.warn(`Failed to query collection ${collName} for deletion. Ensure rules allow lists/gets:`, subErr);
        }
      }

      // 2. Add profile document deletion to batch
      batch.delete(doc(db, "students", child.id));
      
      // 3. Commit the batch
      await batch.commit();
      
      setShowDeleteConfirm(false);
      if (onDelete) {
        await onDelete(); // Redirect only after successful deletion
      }
    } catch (error) {
      console.error("Batch delete failed:", error);
      handleFirestoreError(error, OperationType.DELETE, 'students');
    } finally {
      setIsSaving(false);
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
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="glass-card p-8 relative overflow-hidden border-border/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className={cn(
            "w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl shadow-lg border border-border/50",
            child.age >= 18 ? `text-bg bg-gradient-to-br ${getGradientForChild(child.id)}` : "bg-surface-2"
          )}>
            {child.age >= 18 ? <span className="font-sans relative z-10">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : <span className="relative z-10">{child.avatar}</span>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-sans tracking-tight font-bold text-text-main">{child.name}</h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest",
                child.riskLevel === 'low' ? "bg-alert-50 text-alert-500" : "bg-alert-100 text-alert-700"
              )}>
                {child.riskLevel} risk
              </span>
            </div>
            <p className="text-text-muted mb-6">{child.age} years old • {getStatus(child.age)}{child.age >= 18 ? '' : ` • Grade ${child.grade}`}</p>
            <div className="flex flex-wrap gap-3">
              {(() => {
                const today = new Date();
                const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                
                let lastCheckInDateString = '';
                if (child.lastAssessmentTimestamp) {
                  const d = new Date(child.lastAssessmentTimestamp);
                  lastCheckInDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
                const hasCheckedInToday = child.lastAssessmentDate === todayDate || lastCheckInDateString === todayDate;
                
                return (
                  <div className="flex flex-col gap-2">
                    {hasCheckedInToday ? (
                      <div className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center gap-2">
                         <span className="relative flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                         </span>
                         Check-in Complete
                      </div>
                    ) : (
                      <button 
                        onClick={onStartAssessment}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg bg-accent text-bg dark:text-bg hover:bg-accent-hover shadow-accent/10"
                      >
                        Start Assessment
                      </button>
                    )}
                    {hasCheckedInToday && (
                      <p className="text-[10px] font-bold text-accent dark:text-emerald-400 animate-fade-in text-center mt-1">
                        Great job maintaining your streak! See you tomorrow.
                      </p>
                    )}
                  </div>
                );
              })()}
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'students', child.id), {
                      consentToSchoolSharing: !child.consentToSchoolSharing
                    });
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, 'students');
                  }
                }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border flex items-center gap-2",
                  child.consentToSchoolSharing 
                    ? "bg-alert-50 text-alert-500 border-alert-100" 
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
                      await updateDoc(doc(db, 'students', child.id), {
                        privacyLevel: child.privacyLevel === 'summary' ? 'full' : 'summary'
                      });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, 'students');
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
              
              <button 
                onClick={() => {
                  const el = document.getElementById('edit-profile-form');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-border transition-all"
              >
                Edit Profile
              </button>

              {!child.pinSet ? (
                <button
                  onClick={() => setShowCreatePinModal(true)}
                  className="px-6 py-2.5 bg-alert-50 text-alert-600 border border-alert-100 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-alert-100 transition-all flex items-center gap-2"
                  title="Earn +5 credits!"
                >
                  <Lock size={16} /> Create Profile PIN
                </button>
              ) : (
                <button
                  onClick={() => {
                    const el = document.getElementById('security-settings');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-2.5 bg-surface-2 text-text-main border border-border rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-border transition-all flex items-center gap-2"
                >
                  <Lock size={16} /> Change PIN
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-surface-2 rounded-xl border border-border text-center">
              <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Avg Score</p>
              <p className="text-2xl font-serif font-bold text-accent">{assessments.length === 0 ? '-' : calculateDisplayScore(assessments)}</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-xl border border-border text-center">
              <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Stress</p>
              <p className="text-2xl font-serif font-bold text-alert-500">{child.stressLevel}</p>
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
          <div id="edit-profile-form" className="glass-card p-8">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Save size={20} className="text-accent" />
              Edit {child.age >= 18 ? 'Student' : 'Child'} Profile
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
            <div className="mt-8 flex justify-between items-center">
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-6 py-2.5 text-alert-500 bg-alert-50 hover:bg-alert-100 rounded-lg font-medium transition-all"
              >
                <Trash2 size={18} /> Delete Profile
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-bg rounded-lg font-medium hover:bg-accent-hover transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : <><Save size={18} /> Save Changes</>}
              </button>
            </div>
          </div>

          {/* Quick Summary Block */}
          <div className="max-w-5xl mx-auto w-full">
            <div className="glass-card p-6 mb-8 border-accent/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent/10 text-accent rounded-lg">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-bold text-lg">Clinical Profile Status</h3>
              </div>
              <div className="bg-surface-2 p-6 rounded-2xl border border-border">
                {aiInsight && typeof aiInsight === 'object' ? (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-text-main leading-relaxed">{aiInsight.status}</p>
                    <ul className="space-y-2">
                      {aiInsight.recommendations?.slice(0, 3).map((rec: string, i: number) => (
                        <li key={i} className="text-xs text-text-muted flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic">
                    {typeof aiInsight === 'string' ? aiInsight : "No primary clinical summary available. Perform an assessment for AI insights."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Security Settings Section */}
          {child.pinSet && (
            <div id="security-settings" className="glass-card p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest mb-4">
                <Lock size={14} /> Security Settings
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Update Profile PIN</h4>
                <p className="text-xs text-text-muted mb-4">Create a 4-digit PIN. Repeating characters are not allowed.</p>
                
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    // Validate input
                    const currentPinInput = (document.getElementById('current-pin') as HTMLInputElement).value;
                    const newPinInput = (document.getElementById('change-new-pin') as HTMLInputElement).value;
                    const confirmPinInput = (document.getElementById('change-confirm-pin') as HTMLInputElement).value;
                    
                    if (currentPinInput !== child.pin) {
                      alert("Current PIN is incorrect.");
                      return;
                    }
                    if (newPinInput !== confirmPinInput) {
                      alert("New PINs do not match.");
                      return;
                    }
                    if (!/^\d{4}$/.test(newPinInput)) {
                      alert("PIN must be exactly 4 digits.");
                      return;
                    }
                    if (/(.)\1{3}/.test(newPinInput)) {
                      alert("PIN is too weak. Please avoid repeating characters.");
                      return;
                    }
                    
                    setIsSaving(true);
                    try {
                      await updateDoc(doc(db, 'students', child.id), { pin: newPinInput });
                      alert("PIN updated successfully.");
                      onUpdate({ ...child, pin: newPinInput });
                      (document.getElementById('current-pin') as HTMLInputElement).value = '';
                      (document.getElementById('change-new-pin') as HTMLInputElement).value = '';
                      (document.getElementById('change-confirm-pin') as HTMLInputElement).value = '';
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, 'students');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    id="current-pin"
                    type="password"
                    required
                    placeholder="Current PIN"
                    className="w-full p-3 rounded-xl border border-border text-sm bg-surface"
                  />
                  <input
                    id="change-new-pin"
                    type="password"
                    required
                    placeholder="New PIN (4 digits)"
                    className="w-full p-3 rounded-xl border border-border text-sm bg-surface"
                  />
                  <input
                    id="change-confirm-pin"
                    type="password"
                    required
                    placeholder="Confirm New PIN"
                    className="w-full p-3 rounded-xl border border-border text-sm bg-surface"
                  />
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-accent text-bg py-3 rounded-xl text-sm font-bold shadow hover:bg-accent-hover transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Updating..." : "Update PIN"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="glass-card p-6 border-alert-100 dark:border-alert-900/30">
            <div className="flex items-center gap-2 text-alert-600 font-bold text-xs uppercase tracking-widest mb-4">
              <AlertCircle size={14} /> Danger Zone
            </div>
            <p className="text-xs text-text-muted mb-4">Once you delete a profile, there is no going back. Please be certain.</p>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 border border-alert-200 text-alert-600 rounded-xl text-sm font-bold hover:bg-alert-50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Trash2 size={16} />
              Delete Profile
            </button>
          </div>
          
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal 
          childName={child.name} 
          onCancel={() => setShowDeleteConfirm(false)} 
          onConfirm={handleDelete} 
          isSaving={isSaving} 
        />
      )}

      {/* Create PIN Modal */}
      {showCreatePinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-sm p-8 shadow-2xl relative overflow-hidden animate-fade-in text-center border border-border">
            <h2 className="text-2xl font-serif font-bold text-text-main mb-2">Create Profile PIN</h2>
            <p className="text-sm text-text-muted mb-8 text-center px-4">
              Secure your profile with a 4-digit PIN and earn <strong className="text-accent">+5 credits</strong> instantly!
            </p>
            <form onSubmit={handleSetPin} className="space-y-4 text-left">
              <input
                type="password"
                required
                value={newPinValue}
                onChange={e => setNewPinValue(e.target.value)}
                placeholder="4-Digit PIN"
                maxLength={4}
                className="w-full p-3 rounded-xl border border-border text-sm bg-surface-2 focus:border-accent outline-none text-center tracking-[1em]"
              />
              <input
                type="password"
                required
                value={confirmPinValue}
                onChange={e => setConfirmPinValue(e.target.value)}
                placeholder="Confirm 4-Digit PIN"
                maxLength={4}
                className="w-full p-3 rounded-xl border border-border text-sm bg-surface-2 focus:border-accent outline-none text-center tracking-[1em]"
              />
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreatePinModal(false)}
                  className="flex-1 py-3 px-4 bg-surface-2 border border-border rounded-xl text-sm font-bold hover:bg-border transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-accent text-bg rounded-xl text-sm font-bold hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gentle Toast */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[100] bg-accent/10 border border-accent text-accent px-6 py-4 rounded-2xl shadow-xl shadow-accent/10 flex items-center gap-4 animate-fade-in">
          <Lock size={20} />
          <div>
            <p className="font-bold text-sm">Secure your profile with a PIN</p>
            <p className="text-xs opacity-90">to earn extra credits!</p>
          </div>
          <button onClick={() => setShowToast(false)} className="p-1 hover:bg-black/5 rounded-full ml-2">
            <X size={16} />
          </button>
        </div>
      )}
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

function DeleteConfirmModal({ childName, onCancel, onConfirm, isSaving }: { childName: string; onCancel: () => void; onConfirm: () => void; isSaving: boolean; }) {
  const [confirmText, setConfirmText] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl w-full max-w-sm p-8 shadow-2xl relative overflow-hidden animate-fade-in text-center border border-border">
        <div className="w-16 h-16 bg-alert-100 text-alert-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={32} />
        </div>
        <h2 className="text-2xl font-serif font-bold text-text-main mb-2">Delete Profile?</h2>
        <p className="text-sm text-text-muted mb-4 text-center px-4">
          This action is irreversible. All data for <strong>{childName}</strong> will be permanently removed.
        </p>
        <p className="text-sm font-bold text-alert-600 mb-2">Type "DELETE" to confirm:</p>
        <input 
          type="text" 
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full p-3 rounded-lg border border-border bg-surface-2 mb-6 text-center tracking-widest font-bold focus:border-alert-500 outline-none"
        />
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-surface-2 border border-border rounded-xl text-sm font-bold hover:bg-border transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isSaving || confirmText !== "DELETE"}
            className="flex-1 py-3 px-4 bg-alert-600 text-bg rounded-xl text-sm font-bold hover:bg-alert-700 transition-all shadow-lg shadow-alert-200 disabled:opacity-50"
          >
            {isSaving ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
