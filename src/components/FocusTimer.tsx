import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
import { db, collection, addDoc, auth, doc, updateDoc, increment, handleFirestoreError, OperationType } from '../lib/firebase';

interface FocusTimerProps {
  childId?: string;
}

export default function FocusTimer({ childId }: FocusTimerProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'Study' | 'Sleep'>('Study');

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

  const handleComplete = async () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    try {
      if (childId) {
        // Record without granting credits
        // (Credits are only granted upon a successful once-daily check in)

        // Add a 'Study Session Complete' event to the schedule
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

      await addDoc(collection(db, 'sessions'), {
        type: sessionType,
        durationMinutes: 25,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid,
        childId: childId || null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const totalTime = sessionType === 'Study' ? 25 * 60 : 60 * 60;
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(totalTime);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const progressPercent = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className="bg-surface-2 border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between w-full mb-8 relative z-10">
        <div className="flex items-center gap-2 text-text-muted font-bold text-xs uppercase tracking-widest">
          <Timer size={14} className="text-accent" /> {sessionType} Mode
        </div>
        <select 
          value={sessionType}
          onChange={(e) => {
            setSessionType(e.target.value as 'Study' | 'Sleep');
            setIsActive(false);
            setTimeLeft(e.target.value === 'Study' ? 25*60 : 60*60);
          }}
          className="text-xs border border-border/50 rounded-lg p-2 bg-surface text-text-main hover:bg-surface-3 transition-colors"
        >
          <option value="Study">Study (25m)</option>
          <option value="Sleep">Sleep (60m)</option>
        </select>
      </div>
      
      <div className="relative w-48 h-48 mb-8 flex items-center justify-center z-10">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="96" cy="96" r="90" className="stroke-border/30 fill-none" strokeWidth="6" />
          <circle 
            cx="96" 
            cy="96" 
            r="90" 
            className="stroke-accent fill-none transition-all duration-1000" 
            strokeWidth="6"
            strokeDasharray="565.48"
            strokeDashoffset={565.48 - (progressPercent / 100) * 565.48}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-4xl font-sans font-medium tracking-tight text-text-main drop-shadow-md">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      <div className="flex items-center gap-6 z-10">
        <button 
          onClick={toggleTimer}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-bg transition-all hover:scale-105 shadow-lg",
            isActive ? "bg-indigo-400 shadow-indigo-400/20" : "bg-accent shadow-accent/20"
          )}
        >
          {isActive ? <Pause size={24} className="fill-current" /> : <Play size={24} className="ml-1 fill-current" />}
        </button>
        <button 
          onClick={resetTimer}
          className="w-12 h-12 rounded-full border border-border bg-surface flex items-center justify-center text-text-dim hover:text-text-main hover:border-text-dim transition-colors"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}
