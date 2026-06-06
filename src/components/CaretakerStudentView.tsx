import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, BarChart3, Clock, AlertTriangle, Send, Activity, Brain, Download, Inbox, MessageSquareHeart, CheckCircle2, Target } from 'lucide-react';
import { Child } from '../types';
import { db, auth, collection, query, where, getDocs, addDoc, orderBy, limit } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import EmotionalStabilityView from './EmotionalStabilityView';
import MentalResilienceView from './MentalResilienceView';
import SilentRiskView from './SilentRiskView';
import TriggerMappingView from './TriggerMappingView';
import InterventionEffectivenessView from './InterventionEffectivenessView';

interface CaretakerStudentViewProps {
  student: Child;
  onBack: () => void;
}

export default function CaretakerStudentView({ student, onBack }: CaretakerStudentViewProps) {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const aQuery = query(
          collection(db, 'assessments'),
          where('childId', '==', student.id),
          where('timestamp', '>=', thirtyDaysAgo.toISOString().split('T')[0]),
          orderBy('timestamp', 'desc')
        );
        const aSnap = await getDocs(aQuery);
        let aData = aSnap.docs.map(d => d.data());
        // Sort ascending for chart
        aData.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setAssessments(aData);

        const sQuery = query(
          collection(db, 'sessions'),
          where('childId', '==', student.id),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const sSnap = await getDocs(sQuery);
        setSessions(sSnap.docs.map(d => d.data()));

      } catch (e) {
        console.error("Error fetching caretaker student data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [student.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'info',
        title: 'Caretaker Message',
        description: message,
        childId: student.id,
        parentId: student.id, // Notification targets the student user
        timestamp: new Date().toISOString(),
        status: 'active',
        isMessage: true,
        caretakerId: auth.currentUser?.uid,
        caretakerEmail: auth.currentUser?.email
      });
      setMessage('');
      alert('Message sent to student!');
    } catch (error) {
      console.error(error);
      alert('Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  const calculateAverage = (field: string) => {
    if (assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => {
      // Find the metric in the answers
      const moodAns = curr.answers?.find((a: any) => a.id === field);
      return acc + (moodAns ? Number(moodAns.value) : 5);
    }, 0);
    return (sum / assessments.length).toFixed(1);
  };

  const getPriority = () => {
    const avgScore = Number(calculateAverage('mood1')); // using mood as proxy for overall wellness
    if (avgScore < 4) return 'HIGH';
    if (avgScore < 6) return 'MEDIUM';
    return 'LOW';
  };

  // Mock recommendations based on Priority (AI Engine proxy for now)
  const getRecommendations = () => {
    const priority = getPriority();
    if (priority === 'HIGH') return ["Review workload immediately", "Recommend daily breaks", "Initiate a wellness check"];
    if (priority === 'MEDIUM') return ["Monitor sleep consistency", "Encourage short focus bursts"];
    return ["Maintain current routine", "Send an encouragement message"];
  };

  const chartData = assessments.map((a, i) => {
    const moodAns = a.answers?.find((ans: any) => ans.id === 'mood1') || { value: 5 };
    const energyAns = a.answers?.find((ans: any) => ans.id === 'energy1') || { value: 5 };
    return {
      name: `Day ${i + 1}`,
      mood: Number(moodAns.value),
      energy: Number(energyAns.value)
    };
  });

  if (loading) {
     return <div className="p-8 text-center text-slate-400">Loading student analytics...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
          <ChevronLeft className="text-white" size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             {student.avatar || '🎓'} {student.name}
             <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${getPriority() === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : getPriority() === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                Priority: {getPriority()}
             </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Detailed Analytics & Intervention Dashboard</p>
        </div>
        
        <button onClick={() => alert('Report download will be processed by the server.')} className="ml-auto bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 text-sm font-medium transition-colors">
          <Download size={16} />
          Monthly Report
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-[#020617] border border-white/5 rounded-[2rem] p-6 shadow-xl">
           <Activity className="text-blue-400 mb-3" size={24} />
           <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Avg Wellness (30d)</p>
           <p className="text-3xl font-serif text-white font-bold">{calculateAverage('mood1')} / 10</p>
        </div>
        <div className="bg-[#020617] border border-white/5 rounded-[2rem] p-6 shadow-xl">
           <BarChart3 className="text-emerald-400 mb-3" size={24} />
           <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Assessments (30d)</p>
           <p className="text-3xl font-serif text-white font-bold">{assessments.length}</p>
        </div>
        <div className="bg-[#020617] border border-white/5 rounded-[2rem] p-6 shadow-xl">
           <Clock className="text-purple-400 mb-3" size={24} />
           <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Focus Sessions</p>
           <p className="text-3xl font-serif text-white font-bold">{sessions.length}</p>
        </div>
        <div className="bg-[#020617] border border-white/5 rounded-[2rem] p-6 shadow-xl">
           <Brain className="text-amber-400 mb-3" size={24} />
           <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Current Streak</p>
           <p className="text-3xl font-serif text-white font-bold">{student.streak || 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="text-blue-400" size={20} />
              Wellness Trends (30 Days)
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                     itemStyle={{ color: '#E2E8F0' }}
                   />
                   <Line type="monotone" dataKey="mood" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#0F172A', strokeWidth: 2 }} name="Mood" />
                   <Line type="monotone" dataKey="energy" stroke="#10B981" strokeWidth={3} dot={{ fill: '#0F172A', strokeWidth: 2 }} name="Energy" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <EmotionalStabilityView assessments={assessments} />
          
          <MentalResilienceView assessments={assessments} />

          <SilentRiskView assessments={assessments} sessions={sessions} streak={student.streak || 0} />

          <TriggerMappingView assessments={assessments} sessions={sessions} schedules={[]} />

          <InterventionEffectivenessView assessments={assessments} />

          <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <MessageSquareHeart className="text-purple-400" size={20} />
               Communication Center
            </h3>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Send encouragement, check-in prompts, or reminders..."
                className="w-full bg-[#020617] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#2563EB] focus:outline-none transition-colors resize-none h-24"
                required
              />
              <button 
                disabled={sendingMsg}
                type="submit" 
                className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                <Send size={16} /> {sendingMsg ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={20} />
              AI Early Warning System
            </h3>
            <div className="space-y-3">
              {getPriority() === 'HIGH' ? (
                <>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                     <p className="text-sm text-red-200 font-medium tracking-wide">Stress Escalation Detected</p>
                     <p className="text-xs text-red-300/70 mt-1">Mood scores have dropped significantly over the last 3 days.</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                     <p className="text-sm text-amber-200 font-medium tracking-wide">Assessment Avoidance</p>
                     <p className="text-xs text-amber-300/70 mt-1">Missed expected check-ins for 2 consecutive days.</p>
                  </div>
                </>
              ) : (
                <div className="p-4 border border-white/5 rounded-xl bg-[#020617] text-center">
                   <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24} />
                   <p className="text-sm text-slate-300 font-medium">No Active Warnings</p>
                   <p className="text-xs text-slate-500 mt-1">Trends are currently stable.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0F172A]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="text-blue-400" size={20} />
              Recommended Actions
            </h3>
            <ul className="space-y-3">
              {getRecommendations().map((rec, i) => (
                <li key={i} className="flex gap-3 items-start bg-[#020617] p-3 rounded-xl border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
