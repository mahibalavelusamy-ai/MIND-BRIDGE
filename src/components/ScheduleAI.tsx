import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { motion } from 'motion/react';
import { db, collection, query, where, onSnapshot, auth, handleFirestoreError, OperationType, addDoc, getDocs } from '../lib/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { CalendarDays, Sparkles, Upload, FileText, X } from 'lucide-react';
import { AIService } from '../services/ai/aiOrchestrator';

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise as string, mimeType: file.type },
  };
}

export default function ScheduleAI() {
  const [syllabusText, setSyllabusText] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [burnoutInsights, setBurnoutInsights] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Set up a Firestore listener for events
    const qSchedules = query(
      collection(db, 'schedules'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(qSchedules, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        let color = '#3B82F6'; // default study blue
        let glowClass = 'shadow-[0_0_10px_rgba(59,130,246,0.5)]';
        
        if (data.type === 'exam' || data.type === 'test') { color = '#F97316'; glowClass = 'shadow-[0_0_10px_rgba(249,115,22,0.5)]'; } // soft orange alerts
        else if (data.type === 'assignment' || data.type === 'deadline') { color = '#3B82F6'; glowClass = 'shadow-[0_0_10px_rgba(59,130,246,0.5)]'; }
        else if (data.type === 'project' || data.type === 'goal') { color = '#FBBF24'; glowClass = 'shadow-[0_0_10px_rgba(251,191,36,0.5)]'; } // gold
        else if (data.type === 'wellness' || data.type === 'break') { color = '#10B981'; glowClass = 'shadow-[0_0_10px_rgba(16,185,129,0.5)]'; } // emerald green
        else if (data.type === 'recovery') { color = '#A855F7'; glowClass = 'shadow-[0_0_10px_rgba(168,85,247,0.5)]'; } // soft purple
        else if (data.type === 'focus' || data.type === 'session') { color = '#06B6D4'; glowClass = 'shadow-[0_0_10px_rgba(6,182,212,0.5)]'; } // cyan
        else if (data.priority === 'high') { color = '#F97316'; glowClass = 'shadow-[0_0_10px_rgba(249,115,22,0.5)]'; }
        else if (data.type === 'study') { color = '#3B82F6'; glowClass = 'shadow-[0_0_10px_rgba(59,130,246,0.5)]'; }

        return {
          id: doc.id,
          title: data.subject || data.title,
          start: data.start || data.startTime,
          end: data.end || data.endTime,
          color: color,
          className: `px-1.5 rounded py-0.5 text-xs font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:brightness-110 cursor-pointer border border-white/20 ${glowClass}`,
          ...data
        };
      });

      // Deduplicate events by title and date
      const uniqueEventsMap = new Map();
      fetchedEvents.forEach(evt => {
        let title = (evt.title || 'unknown').toString().toLowerCase().trim();
        // Remove trailing numbers or weird suffixes that might duplicate
        title = title.replace(/\s*\(\d+\)\s*$/, '').trim();

        let dateKey = '';
        if (typeof evt.start === 'string') {
          dateKey = evt.start.split('T')[0];
        } else if (evt.start instanceof Date) {
          dateKey = evt.start.toISOString().split('T')[0];
        } else if (evt.start && typeof evt.start.toDate === 'function') { // Firestore Timestamp
          dateKey = evt.start.toDate().toISOString().split('T')[0];
        } else {
          dateKey = String(evt.start);
        }

        const key = `${title}-${dateKey}`;
        
        // Keep the one with an end time if available, or just the first one
        if (!uniqueEventsMap.has(key) || (!uniqueEventsMap.get(key).end && evt.end)) {
          uniqueEventsMap.set(key, evt);
        }
      });

      setEvents(Array.from(uniqueEventsMap.values()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    return () => unsubscribe();
  }, []);

  const handleGenerate = async () => {
    if (!pdfFile && !syllabusText) {
      alert("Please upload a PDF or paste syllabus text first.");
      return;
    }
    if (!auth.currentUser) return;

    setIsGenerating(true);
    setProgress('Reading documents...');
    try {
      let parts: any[] = [];
      if (pdfFile) {
        setProgress('Processing PDF syllabus...');
        const pdfPart = await fileToGenerativePart(pdfFile);
        parts.push(pdfPart);
      }
      if (syllabusText) {
        setProgress('Processing text context...');
        parts.push({ text: syllabusText });
      }

      setProgress('Gathering wellness and workload data...');
      let burnoutContext = null;
      try {
          const qA = query(collection(db, 'assessments'), where('childId', '==', auth.currentUser.uid));
          const snapA = await getDocs(qA);
          const qS = query(collection(db, 'sessions'), where('childId', '==', auth.currentUser.uid), where('userId', '==', auth.currentUser?.uid));
          const snapS = await getDocs(qS);
          burnoutContext = {
              assessments: snapA.docs.map(d => d.data()).slice(-10),
              focusSessions: snapS.docs.map(d => d.data()).slice(-10)
          };
      } catch(e) {
          console.warn("Could not fetch burnout context", e);
      }

      setProgress('AI is balancing your schedule to prevent burnout...');
      const { events: eventsArray, insights } = await AIService.parseSyllabus(parts, burnoutContext);

      setProgress('Syncing ' + (eventsArray?.length || 0) + ' events to your calendar...');
      const schedulesRef = collection(db, 'schedules');
      if (eventsArray && Array.isArray(eventsArray)) {
         for (const event of eventsArray) {
           await addDoc(schedulesRef, {
             ...event,
             userId: auth.currentUser.uid,
             createdAt: serverTimestamp()
           });
         }
      }

      setBurnoutInsights(insights || []);
      alert(`Successfully imported ${eventsArray?.length || 0} smart events!`);
      setPdfFile(null);
      setSyllabusText('');
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Failed to generate schedule. Please check the console for details.");
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setPdfFile(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8 p-4 md:p-6 animate-fade-in relative z-10 w-full overflow-hidden bg-[#020617] rounded-[2rem]">
      {/* Calendar Column */}
      <div className="flex-[2] glass-card p-6 md:p-8 flex flex-col bg-white/[0.06] backdrop-blur-xl border border-white/10 min-h-[500px] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all duration-300 rounded-[2rem]">
        <div className="mb-6">
          <h2 className="text-3xl font-sans font-bold tracking-tight flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#22D3EE]">
            <CalendarDays className="text-[#22D3EE]" size={28} />
            LifeFlow Planner
          </h2>
          <p className="text-sm font-medium mt-2 text-[#22D3EE] tracking-widest uppercase">Plan Smart. Stay Balanced. Grow Consistently.</p>
        </div>

        {/* Daily Wellness Banner */}
        <div className="mb-6 bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#06B6D4] p-4 rounded-[1.5rem] flex items-center justify-between border border-white/10 shadow-[0_4px_20px_rgba(34,211,238,0.15)] backdrop-blur-md">
          <div>
             <h3 className="text-white font-bold tracking-widest uppercase text-xs mb-2 opacity-80">Today's Wellness State</h3>
             <div className="flex gap-4 items-center">
                <div className="flex flex-col">
                   <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">Status</span>
                   <span className="text-white font-bold text-sm">🟢 Balanced Day</span>
                </div>
                <div className="h-6 w-px bg-white/20 mx-2"></div>
                <div className="flex gap-4">
                  <div className="flex flex-col"><span className="text-[10px] text-blue-200 uppercase tracking-widest">Mood</span><span className="text-white font-bold">82</span></div>
                  <div className="flex flex-col"><span className="text-[10px] text-cyan-200 uppercase tracking-widest">Focus</span><span className="text-white font-bold">78</span></div>
                  <div className="flex flex-col"><span className="text-[10px] text-purple-200 uppercase tracking-widest">Stress</span><span className="text-white font-bold">43</span></div>
                </div>
             </div>
          </div>
        </div>

        <div className="flex-1 bg-black/20 ring-1 ring-white/10 shadow-inner p-4 rounded-[1.5rem] overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            events={events}
            height="100%"
            dayMaxEvents={true}
          />
        </div>
      </div>

      {/* AI Uploader Column */}
      <div className="flex-1 glass-card p-6 md:p-8 flex flex-col bg-white/[0.06] backdrop-blur-xl border border-white/10 h-full min-h-[400px] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all duration-300 rounded-[2rem]">
        <h2 className="text-xl font-sans font-bold tracking-tight mb-4 flex items-center gap-3 text-white">
          <Sparkles className="text-[#22D3EE]" size={24} />
          AI Plan Uploader
        </h2>
        
        <p className="text-sm text-slate-300 mb-8 text-balance">
          Paste your syllabus, study plan, or class schedule below. Our AI planner will automatically extract the dates and populate your calendar.
        </p>

        <div className="flex-1 flex flex-col gap-6 relative">
          {/* PDF Upload Zone */}
          <div className="relative border-2 border-dashed border-border/80 hover:border-accent/80 bg-surface-2/50 rounded-2xl p-8 transition-all duration-300 group flex flex-col items-center justify-center text-center">
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            {pdfFile ? (
              <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-accent/30 w-full justify-between relative z-20 shadow-lg">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-3 bg-accent/10 rounded-xl shrink-0 border border-accent/20">
                    <FileText size={24} className="text-accent" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">{pdfFile.name}</p>
                    <p className="text-xs text-text-muted">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={clearFile}
                  className="p-2 hover:bg-alert-500/10 text-text-muted hover:text-alert-500 rounded-lg transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-border flex items-center justify-center mb-4 group-hover:scale-105 group-hover:-translate-y-2 group-hover:border-accent/40 group-hover:shadow-[0_0_20px_rgba(0,255,136,0.15)] transition-all duration-300">
                  <Upload size={28} className="text-text-muted group-hover:text-accent transition-colors" />
                </div>
                <p className="text-base font-bold text-text-main mb-1">Upload PDF Syllabus</p>
                <p className="text-sm text-text-muted">Drag and drop or click to browse</p>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted bg-surface px-2 rounded-full">OR PASTE TEXT</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <textarea
            value={syllabusText}
            onChange={(e) => setSyllabusText(e.target.value)}
            className="flex-1 w-full p-5 rounded-2xl bg-surface-2/50 border border-border text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 text-text-main placeholder-text-muted shadow-inner transition-all"
            placeholder="Paste manual dates or extra instructions here..."
          ></textarea>

          <div className="mt-auto pt-6 border-t border-border mt-4">
            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-xs font-mono text-accent text-center bg-accent/10 py-2 rounded-lg"
              >
                {progress || 'Processing...'}
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating || (!syllabusText.trim() && !pdfFile)}
              className="w-full py-4 bg-accent text-black font-bold rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.3)] flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group"
            >
              <Sparkles size={20} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'Analyzing Syllabus...' : 'Generate Smart Schedule'}
            </motion.button>
          </div>

          {burnoutInsights.length > 0 && (
            <div className="mt-6 -mb-4 p-4 border border-indigo-500/30 bg-indigo-500/10 rounded-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
               <h3 className="font-bold text-sm text-text-main flex items-center gap-2 mb-2"><Sparkles size={16} className="text-indigo-400" /> AI Burnout Prevention</h3>
               <div className="space-y-2">
                  {burnoutInsights.map((ins, i) => (
                     <p key={i} className="text-sm text-text-main leading-relaxed">{ins}</p>
                  ))}
               </div>
            </div>
          )}
          
          {events.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-sans font-bold text-lg mb-4 text-text-main flex items-center justify-between">
                <span>Upcoming Events</span>
                <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">{events.length}</span>
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {events.slice(0, 5).map(evt => {
                  let typeColor = 'bg-neon-blue/20 text-neon-blue';
                  if (evt.type === 'exam' || evt.priority === 'high') typeColor = 'bg-alert-500/20 text-alert-500';
                  else if (evt.type === 'project') typeColor = 'bg-amber-500/20 text-amber-500';
                  else if (evt.type === 'reading') typeColor = 'bg-violet-500/20 text-violet-500';
                  else if (evt.type === 'recovery' || evt.type === 'break') typeColor = 'bg-emerald-500/20 text-emerald-500';
                  else if (evt.type === 'study') typeColor = 'bg-blue-500/20 text-blue-500';

                  return (
                  <div key={evt.id} className="bg-surface-2 p-3 rounded-xl border border-border flex items-center justify-between group hover:border-accent/50 hover:bg-surface transition-all">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-text-main truncate">{evt.title}</span>
                      <span className="text-xs text-text-muted mt-0.5">{typeof evt.start === 'string' ? evt.start.split('T')[0] : evt.start}</span>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${typeColor}`}>
                      {evt.type || 'TASK'}
                    </span>
                  </div>
                );})}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
