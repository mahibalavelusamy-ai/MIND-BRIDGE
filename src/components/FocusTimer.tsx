import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Sparkles, TrendingUp, Target, Brain, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
import { db, collection, addDoc, auth, query, where, getDocs, orderBy, handleFirestoreError, OperationType } from '../lib/firebase';

interface FocusTimerProps {
  childId?: string;
}

export default function FocusTimer({ childId }: FocusTimerProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'Study' | 'Sleep'>('Study');
  const [history, setHistory] = useState<any[]>([]);

  const distractionCountRef = useRef(0);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!childId) return;
      try {
        const qS = query(collection(db, 'sessions'), where('childId', '==', childId), where('userId', '==', auth.currentUser?.uid), orderBy('timestamp', 'desc'));
        const snapS = await getDocs(qS);
        setHistory(snapS.docs.map(d => d.data()));
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      }
    };
    fetchSessions();
  }, [childId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const recordSession = async (completed: boolean) => {
    try {
      if (childId && completed) {
        const newEvent = {
          childId: childId,
          parentId: auth.currentUser?.uid,
          title: `${sessionType} Session Complete`,
          type: sessionType.toLowerCase() === 'sleep' ? 'activity' : 'class',
          day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          subject: 'Focus Timer',
          difficulty: 'low'
        };
        await addDoc(collection(db, 'schoolSchedules'), newEvent);
      }

      const sessionData = {
        type: sessionType,
        durationMinutes: completed ? (sessionType === 'Study' ? 25 : 60) : Math.round(((sessionType === 'Study' ? 25 * 60 : 60 * 60) - timeLeft) / 60),
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid,
        childId: childId || null,
        completed,
        distractions: distractionCountRef.current
      };
      
      await addDoc(collection(db, 'sessions'), sessionData);
      
      // Update local history for rapid UI updates
      setHistory(prev => [sessionData, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
    
    // Reset refs
    distractionCountRef.current = 0;
    sessionStartedRef.current = false;
  };

  const handleComplete = async () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    await recordSession(true);
  };

  const toggleTimer = () => {
    if (!isActive) {
      // Starting or resuming
      if (!sessionStartedRef.current) sessionStartedRef.current = true;
    } else {
      // Pausing (counts as a distraction if it's a study session and they aren't done)
      if (sessionType === 'Study') {
         distractionCountRef.current += 1;
      }
    }
    setIsActive(!isActive);
  };
  
  const totalTime = sessionType === 'Study' ? 25 * 60 : 60 * 60;
  
  const resetTimer = async () => {
    setIsActive(false);
    if (sessionStartedRef.current && timeLeft < totalTime) {
      await recordSession(false); // record as incomplete tracking
    } else {
      distractionCountRef.current = 0;
      sessionStartedRef.current = false;
    }
    setTimeLeft(totalTime);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const progressPercent = ((totalTime - timeLeft) / totalTime) * 100;

  const coachInsights = useMemo(() => {
    if (!history || history.length === 0) return null;
    
    const studySessions = history.filter(h => h.type === 'Study');
    if (studySessions.length === 0) return null;

    let completedCount = 0;
    let totalDistractions = 0;
    let durationSum = 0;

    const hourCounts: Record<number, number> = {};

    studySessions.forEach(s => {
      if (s.completed) completedCount++;
      if (s.distractions) totalDistractions += s.distractions;
      durationSum += (s.durationMinutes || 0);

      if (s.completed && s.timestamp) {
        const h = new Date(s.timestamp).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    });

    const completionRate = Math.round((completedCount / studySessions.length) * 100);
    const avgDistractions = studySessions.length > 0 ? (totalDistractions / studySessions.length).toFixed(1) : "0";
    
    let bestHour = -1; let maxH = 0;
    Object.keys(hourCounts).forEach(h => {
       if (hourCounts[Number(h)] > maxH) { maxH = hourCounts[Number(h)]; bestHour = Number(h); }
    });
    
    let timeString = bestHour !== -1 ? `${bestHour % 12 || 12} ${bestHour >= 12 ? 'PM' : 'AM'}` : 'N/A';

    // Generative insights
    const insights = [];
    if (bestHour !== -1) {
       let endHour = bestHour + 2;
       insights.push(`Your highest focus levels occur between ${bestHour % 12 || 12} ${bestHour >= 12 ? 'PM' : 'AM'} and ${endHour % 12 || 12} ${endHour >= 12 ? 'PM' : 'AM'}.`);
    } else {
       insights.push(`25-minute sessions produce the best completion rate for your profile.`);
    }

    if (completionRate > 75) {
       insights.push(`Strong completion rate at ${completionRate}%. Your focus consistency improved this week.`);
    } else {
       insights.push(`Try to minimize pauses during sessions. You average ${avgDistractions} distractions per attempt.`);
    }

    return {
      insights,
      completionRate,
      totalSessions: studySessions.length,
      bestTime: timeString,
      avgDistractions
    };
  }, [history]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <div className="bg-[#0F172A] border border-white/5 rounded-[2rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2563EB]/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center justify-between w-full mb-8 relative z-10">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
            <Timer size={14} className="text-[#2563EB]" /> {sessionType} Mode
          </div>
          <select 
            value={sessionType}
            onChange={(e) => {
              setSessionType(e.target.value as 'Study' | 'Sleep');
              setIsActive(false);
              setTimeLeft(e.target.value === 'Study' ? 25*60 : 60*60);
              sessionStartedRef.current = false;
              distractionCountRef.current = 0;
            }}
            className="text-xs border border-white/10 rounded-lg p-2 bg-[#020617] text-white hover:bg-white/5 transition-colors outline-none cursor-pointer"
          >
            <option value="Study">Study (25m)</option>
            <option value="Sleep">Sleep (60m)</option>
          </select>
        </div>
        
        <div className="relative w-56 h-56 mb-8 flex items-center justify-center z-10">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="112" cy="112" r="100" className="stroke-white/5 fill-none" strokeWidth="4" />
            <circle 
              cx="112" 
              cy="112" 
              r="100" 
              className="stroke-[#2563EB] fill-none transition-all duration-1000" 
              strokeWidth="4"
              strokeDasharray="628.3"
              strokeDashoffset={628.3 - (progressPercent / 100) * 628.3}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-5xl font-sans font-medium tracking-tight text-white drop-shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        <div className="flex items-center gap-6 z-10">
          <button 
            onClick={toggleTimer}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 shadow-xl",
              isActive ? "bg-red-500 shadow-red-500/20" : "bg-[#2563EB] shadow-[#2563EB]/40"
            )}
          >
            {isActive ? <Pause size={24} className="fill-current" /> : <Play size={24} className="ml-1 fill-current" />}
          </button>
          <button 
            onClick={resetTimer}
            className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* AI Focus Coach Section */}
      {coachInsights ? (
        <div className="bg-[#0F172A] border border-white/5 shadow-sm rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden transition-all duration-500">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2563EB] to-[#22D3EE] opacity-50"></div>
           <div className="flex items-center gap-2 mb-2">
              <Brain size={20} className="text-[#2563EB]" />
              <h3 className="font-bold text-lg text-white font-serif">Focus Analytics</h3>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#020617] p-3 rounded-2xl flex flex-col justify-center border border-white/5">
                 <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Completion</span>
                 <span className="text-lg font-bold text-white flex items-center gap-1">{coachInsights.completionRate}%</span>
              </div>
              <div className="bg-[#020617] p-3 rounded-2xl flex flex-col justify-center border border-white/5">
                 <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Sessions</span>
                 <span className="text-lg font-bold text-white">{coachInsights.totalSessions}</span>
              </div>
              <div className="bg-[#020617] p-3 rounded-2xl flex flex-col justify-center border border-white/5">
                 <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Peak Focus</span>
                 <span className="text-lg font-bold text-white flex items-center gap-1 text-[#22D3EE]">
                    <Activity size={14} /> {coachInsights.bestTime}
                 </span>
              </div>
              <div className="bg-[#020617] p-3 rounded-2xl flex flex-col justify-center border border-white/5">
                 <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Distractions</span>
                 <span className="text-lg font-bold text-white">{coachInsights.avgDistractions} <span className="text-xs text-slate-500 font-normal">avg</span></span>
              </div>
           </div>

           <div className="mt-2 bg-[#2563EB]/10 rounded-2xl p-4 border border-[#2563EB]/20 flex flex-col gap-2">
              {coachInsights.insights.map((msg, i) => (
                 <div key={i} className="flex items-start gap-3">
                    <Sparkles size={16} className="text-[#22D3EE] shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{msg}</p>
                 </div>
              ))}
           </div>
        </div>
      ) : (
        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3">
           <Activity size={32} className="text-slate-600 mb-2" />
           <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Focus Analytics</p>
           <p className="text-xs text-slate-500 max-w-xs">Complete focus sessions to generate productivity insights and behavioral feedback.</p>
        </div>
      )}
    </div>
  );
}

