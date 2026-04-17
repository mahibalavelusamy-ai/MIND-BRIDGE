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
        // Add 10 gems to the child's profile
        await updateDoc(doc(db, 'children', childId), {
          gems: increment(10)
        });

        // Add a 'Study Session Complete' event to the schedule
        const newEvent = {
          childId: childId,
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
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
      <div className="flex items-center justify-between w-full mb-4">
        <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
          <Timer size={14} /> {sessionType} Timer
        </div>
        <select 
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value as 'Study' | 'Sleep')}
          className="text-xs border border-border rounded-lg p-1 bg-surface-2"
        >
          <option value="Study">Study</option>
          <option value="Sleep">Sleep</option>
        </select>
      </div>
      
      <div className="text-5xl font-serif font-bold tracking-tight mb-6">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTimer}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105",
            isActive ? "bg-amber-500" : "bg-accent"
          )}
        >
          {isActive ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
        </button>
        <button 
          onClick={resetTimer}
          className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-text-dim hover:text-text-main transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
