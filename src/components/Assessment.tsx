import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Smile, 
  Zap, 
  Moon, 
  Users, 
  Brain, 
  Activity,
  ClipboardCheck,
  AlertCircle,
  Trophy,
  Sparkles
} from 'lucide-react';
import { Child } from '../types';
import { ASSESSMENT_QUESTIONS } from '../constants';
import { cn } from '../lib/utils';
import { db, auth, collection, addDoc, updateDoc, doc, Timestamp, OperationType, handleFirestoreError, query, where, getDocs, orderBy, limit } from '../lib/firebase';
import { GoogleGenAI } from "@google/genai";
import { calculateAssessmentResult, generateAlerts, CategoryScores } from '../lib/scoring';
import { generateRuleInsights } from '../lib/ruleEngine';
import { performRootCauseAnalysis } from '../lib/rootCauseService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface AssessmentProps {
  child: Child;
  onComplete: (level?: number) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Mood': <Smile size={20} />,
  'Energy': <Zap size={20} />,
  'Sleep': <Moon size={20} />,
  'Social': <Users size={20} />,
  'Stress': <Brain size={20} />,
  'Behavior': <Activity size={20} />
};

export default function Assessment({ child, onComplete }: AssessmentProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        // Fetch Schedule
        const qSchedule = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
        const snapSchedule = await getDocs(qSchedule);
        setSchedule(snapSchedule.docs.map(d => d.data()));

        // Fetch History (Last 3) - Sort in memory to avoid composite index requirement
        const qHistory = query(
          collection(db, 'assessments'), 
          where('childId', '==', child.id)
        );
        const snapHistory = await getDocs(qHistory);
        const historyData = snapHistory.docs
          .map(d => ({ ...d.data() as any, id: d.id }))
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3);
        
        setHistory(historyData.map(d => ({ scores: d.scores, totalScore: d.totalScore })));
      } catch (error) {
        console.error("Error fetching assessment data:", error);
      }
    };
    fetchData();
  }, [child.id]);

  const currentQuestion = ASSESSMENT_QUESTIONS[currentIdx];
  const progress = ((currentIdx + 1) / ASSESSMENT_QUESTIONS.length) * 100;

  const handleSelect = (optionIdx: number) => {
    setAnswers({ ...answers, [currentQuestion.id]: optionIdx });
  };

  const handleNext = async () => {
    if (currentIdx < ASSESSMENT_QUESTIONS.length - 1) {
      setDirection(1);
      setCurrentIdx(currentIdx + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    
    try {
      // Map answers to scores (0-4 index to 1-5 scale where 5 is high distress)
      const scores: CategoryScores = {
        mood: (answers['1'] || 0) + 1,
        energy: (answers['2'] || 0) + 1,
        sleep: (answers['3'] || 0) + 1,
        social: (answers['4'] || 0) + 1,
        stress: (answers['5'] || 0) + 1,
        behavior: (answers['6'] || 0) + 1
      };

      // Perform analysis locally (following Gemini API skill guidelines)
      const analysisResult = calculateAssessmentResult(scores);
      const alerts = generateAlerts(child.id, scores, child.name);
      const ruleInsights = generateRuleInsights(scores, analysisResult.riskLevel);

      // AI Contextual Insight
      let insight = "Continue monitoring patterns and maintain open communication.";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `
            As a child mental health expert, analyze this child's data:
            Child: ${child.name}, Age: ${child.age}
            Current Scores (1-5 scale, 5 is worst): Mood ${scores.mood}, Stress ${scores.stress}, Sleep ${scores.sleep}, Behavior ${scores.behavior}, Social ${scores.social}
            Weighted Score: ${analysisResult.weightedScore}/5, Risk Level: ${analysisResult.riskLevel}
            
            Historical Context (Last 3 assessments): ${JSON.stringify(history || [])}
            School Schedule: ${JSON.stringify(schedule)}
            Rule-Based Findings: ${JSON.stringify(ruleInsights)}
            
            Provide a human-readable summary for the parent. 
            1. Analyze trends: Is the child improving or declining compared to history?
            2. Correlate with schedule: How do upcoming school events impact these scores?
            3. Recommendations: Provide 2 specific, actionable steps for the parent.

            Keep the tone empathetic, professional, and supportive.
          `,
        });
        insight = response.text || insight;
      } catch (aiError) {
        console.error("AI Insight generation failed:", aiError);
      }

      // 3. Perform Root-Cause Analysis
      const rootCause = await performRootCauseAnalysis(child, scores, history || [], schedule);

      // Save assessment to Firestore
      await addDoc(collection(db, 'assessments'), {
        childId: child.id,
        submittedBy: auth.currentUser.uid,
        timestamp: new Date().toISOString(),
        scores,
        totalScore: analysisResult.weightedScore,
        aiInsight: insight
      });

      // Save Root-Cause Analysis
      await addDoc(collection(db, 'rootCauseAnalyses'), {
        ...rootCause,
        childId: child.id,
        timestamp: new Date().toISOString(),
        assessmentId: 'latest' // We could get the ID from the previous addDoc if needed
      });

      const newGems = (child.gems || 0) + 50;
      const newLevel = Math.floor(newGems / 500) + 1;

      // Update child record
      await updateDoc(doc(db, 'children', child.id), {
        riskLevel: analysisResult.riskLevel,
        moodScore: scores.mood,
        stressLevel: scores.stress >= 4 ? 'High' : scores.stress >= 2.5 ? 'Moderate' : 'Low',
        lastCheckIn: 'Just now',
        gems: newGems,
        streak: (child.streak || 0) + 1,
        level: newLevel
      });

      // Save generated alerts
      if (alerts && Array.isArray(alerts)) {
        for (const alert of alerts) {
          await addDoc(collection(db, 'alerts'), {
            ...alert,
            parentId: auth.currentUser.uid
          });
        }
      }

      setIsFinished(true);
      setTimeout(() => onComplete(newLevel), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assessments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setDirection(-1);
      setCurrentIdx(currentIdx - 1);
    }
  };

  if (isFinished) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-fade-in">
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-24 h-24 bg-accent text-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-accent/40"
        >
          <Trophy size={48} />
        </motion.div>
        <h2 className="text-4xl font-serif mb-4">You're a Star! 🌟</h2>
        <p className="text-text-muted max-w-sm mb-8">
          Amazing job completing your check-in, {child.name}! You've earned some rewards for your wellness garden.
        </p>
        
        <div className="flex gap-4 mb-8">
          <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Gems Earned</p>
            <div className="flex items-center gap-2 text-2xl font-bold text-accent">
              <Sparkles size={20} /> +50
            </div>
          </div>
          <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-text-dim uppercase mb-1">New Streak</p>
            <div className="flex items-center gap-2 text-2xl font-bold text-orange-500">
              <Zap size={20} /> {(child.streak || 0) + 1} Days
            </div>
          </div>
        </div>
      </div>
    );
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in min-h-[80vh] flex flex-col">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-serif mb-2">Weekly Check-in</h1>
        <p className="text-text-muted">Helping you understand {child.name}'s well-being</p>
      </div>

      {/* Stepper Header */}
      <div className="mb-12 relative">
        <div className="flex justify-between items-center relative z-10">
          {ASSESSMENT_QUESTIONS.map((q, i) => (
            <div key={q.id} className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  if (i < currentIdx) {
                    setDirection(-1);
                    setCurrentIdx(i);
                  }
                }}
                disabled={i > currentIdx}
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 relative",
                  i === currentIdx ? "border-accent bg-accent text-white shadow-lg shadow-accent/20 scale-110" :
                  i < currentIdx ? "border-accent bg-accent/10 text-accent" :
                  "border-border bg-surface text-text-dim"
                )}
              >
                {i < currentIdx ? <CheckCircle2 size={18} /> : <span>{i + 1}</span>}
                {i === currentIdx && (
                  <motion.div 
                    layoutId="active-step"
                    className="absolute inset-0 rounded-full border-2 border-accent animate-ping opacity-20"
                  />
                )}
              </button>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-tighter hidden md:block",
                i === currentIdx ? "text-accent" : "text-text-dim"
              )}>
                {q.category}
              </span>
            </div>
          ))}
        </div>
        {/* Progress Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-border -z-0">
          <motion.div 
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${(currentIdx / (ASSESSMENT_QUESTIONS.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="flex-1 relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQuestion.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="bg-surface border border-border rounded-3xl p-8 md:p-12 shadow-xl shadow-black/5 relative overflow-hidden"
          >
            {/* Decorative Background Element */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-accent-light text-accent rounded-xl">
                  {CATEGORY_ICONS[currentQuestion.category] || <ClipboardCheck size={20} />}
                </div>
                <span className="text-xs font-bold text-accent uppercase tracking-widest">
                  {currentQuestion.category} Focus
                </span>
              </div>

              <h3 className="text-2xl md:text-3xl font-serif mb-10 leading-tight text-text-main">
                {currentQuestion.question}
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(i)}
                    className={cn(
                      "w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden group",
                      answers[currentQuestion.id] === i 
                        ? "border-accent bg-accent/5 ring-4 ring-accent/5" 
                        : "border-border hover:border-accent/30 hover:bg-surface-2"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                      answers[currentQuestion.id] === i 
                        ? "border-accent bg-accent text-white rotate-12" 
                        : "border-border text-text-dim group-hover:border-accent/50"
                    )}>
                      {i + 1}
                    </div>
                    <span className={cn(
                      "text-lg transition-colors",
                      answers[currentQuestion.id] === i ? "text-text-main font-medium" : "text-text-muted"
                    )}>
                      {option}
                    </span>
                    
                    {answers[currentQuestion.id] === i && (
                      <motion.div 
                        layoutId="selection-glow"
                        className="absolute inset-0 bg-accent/5 pointer-events-none"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <button 
          onClick={handleBack}
          disabled={currentIdx === 0 || isSubmitting}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider text-text-dim hover:text-text-main hover:bg-surface-2 disabled:opacity-30 transition-all"
        >
          <ChevronLeft size={20} /> Previous
        </button>

        <div className="hidden md:flex gap-2">
          {ASSESSMENT_QUESTIONS.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === currentIdx ? "w-8 bg-accent" : i < currentIdx ? "w-4 bg-accent/30" : "w-4 bg-border"
              )} 
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          disabled={answers[currentQuestion.id] === undefined || isSubmitting}
          className={cn(
            "flex items-center gap-2 px-10 py-4 bg-accent text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-hover disabled:opacity-50 transition-all shadow-xl shadow-accent/20",
            isSubmitting && "animate-pulse"
          )}
        >
          {isSubmitting ? "Analyzing..." : currentIdx === ASSESSMENT_QUESTIONS.length - 1 ? "Complete Check-in" : <>Next Step <ChevronRight size={20} /></>}
        </button>
      </div>
      {/* AI Disclaimer */}
      <div className="mt-auto pt-8 border-t border-border">
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="text-[10px] text-amber-800 leading-relaxed">
            <p className="font-bold uppercase tracking-widest mb-1">Ethical AI Disclosure</p>
            Insights are generated by Gemini AI for decision support. This is not a clinical diagnosis. 
            Always consult a qualified mental health professional for medical advice.
          </div>
        </div>
      </div>
    </div>
  );
}
