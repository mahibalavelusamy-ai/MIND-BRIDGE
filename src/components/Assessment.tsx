import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Play, 
  Zap, 
  Moon, 
  Users, 
  Brain, 
  Activity,
  ClipboardCheck,
  AlertCircle,
  Trophy,
  Sparkles,
  Loader2,
  Heart,
  Smile
} from 'lucide-react';
import { Child } from '../types';
import { cn, getGradientForChild } from '../lib/utils';
import { db, auth, collection, doc, writeBatch, increment, arrayUnion, query, where, getDocs } from '../lib/firebase';
import { ProgressiveAssessmentEngine, AdaptiveQuestion } from '../services/ai/progressiveAssessmentEngine';
import { AIInterpreter } from '../services/analytics/aiInterpreter';

interface AssessmentProps {
  child: Child;
  onComplete: (level?: number, childName?: string, rewardAmount?: number) => void;
  onError?: (message: string) => void;
  onNavigateHome?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'emotional_wellbeing': <Heart size={20} />,
  'academic_stress': <Brain size={20} />,
  'social_comfort': <Users size={20} />,
  'motivation': <Activity size={20} />,
  'energy_levels': <Zap size={20} />,
  'self_confidence': <Smile size={20} />, // Fallback icon
  'burnout_tendency': <AlertCircle size={20} />,
  'engagement_health': <ClipboardCheck size={20} />
};

export default function Assessment({ child, onComplete, onError, onNavigateHome }: AssessmentProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [questions, setQuestions] = useState<AdaptiveQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isSuccessfullyFinished, setIsSuccessfullyFinished] = useState(false);
  const [sessionRewards, setSessionRewards] = useState({ gems: 0, streak: 0 }); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);

  useEffect(() => {
    // Check if already completed today
    const checkCompletion = async () => {
      if (!child || !auth.currentUser) return;
      
      const now = new Date();
      // Start of the day in user's local timezone
      const localStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      try {
        const qDailyCheck = query(
          collection(db, 'assessments'),
          where('childId', '==', child.id),
          where('parentId', '==', auth.currentUser.uid),
          where('timestamp', '>=', localStartOfDay.toISOString())
        );
        const dailyCheckSnap = await getDocs(qDailyCheck);
        if (!dailyCheckSnap.empty) {
          setIsAlreadyCompleted(true);
        }
      } catch (err) {
        // Ignored in dev
      }
    };

    const initQuestions = async () => {
      setIsLoadingQuestions(true);
      const generated = await ProgressiveAssessmentEngine.generateQuestions(child);
      setQuestions(generated);
      setIsLoadingQuestions(false);
    };

    checkCompletion();
    initQuestions();
  }, [child]);

  const handleSelect = (optionValue: number, qId: string) => {
    const newAnswers = { ...answers, [qId]: optionValue };
    setAnswers(newAnswers);
  };

  const handleTextEntry = (text: string, qId: string) => {
    const newAnswers = { ...textAnswers, [qId]: text };
    setTextAnswers(newAnswers);
  };

  const isCurrentQuestionAnswered = () => {
     if (questions.length === 0) return false;
     const q = questions[currentIdx];
     if (q.isOpenEnded) {
        return textAnswers[q.id] && textAnswers[q.id].trim().length > 0;
     }
     return answers[q.id] !== undefined;
  };

  const handleNext = async () => {
    if (!child) return;
    if (currentIdx < questions.length - 1) {
      setDirection(1);
      setCurrentIdx(currentIdx + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser || !child || isSubmitting || isAlreadyCompleted) return;
    setIsSubmitting(true);
    
    try {
      const outcome = await ProgressiveAssessmentEngine.analyzeOutcome(answers, textAnswers, questions, child);

      const batch = writeBatch(db);
      
      let newStreak = child.streak || 0;
      const newStreakCount = newStreak + 1;
      const rewardAmount = (newStreakCount % 7 === 0) ? 30 : 5;
      const newLevel = Math.floor(((child.gems || 0) + rewardAmount) / 500) + 1;

      const assessmentRef = doc(collection(db, 'assessments'));
      batch.set(assessmentRef, {
        childId: child.id,
        parentId: child.parentId || auth.currentUser!.uid,
        submittedBy: auth.currentUser!.uid,
        timestamp: new Date().toISOString(),
        scores: outcome.categoryScores,
        totalScore: outcome.averageScore,
        questionsAsked: questions.map(q => q.id),
        aiInsight: outcome.aiInsight,
        riskLevel: outcome.riskLevel,
        isAdaptive: true,
        stage: outcome.stage
      });

      const childRef = doc(db, 'students', child.id);
      batch.update(childRef, {
        streak: increment(1),
        lastAssessmentTimestamp: new Date().toISOString(),
        lastAssessmentDate: new Date().toISOString().split('T')[0],
        riskLevel: outcome.riskLevel,
        moodScore: outcome.averageScore,
        level: newLevel,
        gems: increment(rewardAmount),
        credits: increment(rewardAmount),
        moodHistory: arrayUnion(outcome.categoryScores),
        wellnessProfile: outcome.wellnessProfile,
        assessmentCount: increment(1)
      });

      await batch.commit();
      
      setIsSubmitting(false);
      setSessionRewards({ gems: rewardAmount, streak: newStreak + 1 });
      setIsFinished(true);
      setIsSuccessfullyFinished(true);

      if (onComplete) {
        onComplete(newLevel, child.name, rewardAmount);
      }
      
    } catch (error: any) {
      setIsSubmitting(false);
      if (onError) onError("Failed to submit assessment securely.");
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
          className="w-24 h-24 bg-accent text-bg rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-accent/40"
        >
          <Trophy size={48} />
        </motion.div>
        <h2 className="text-4xl font-serif mb-4 text-text-main tracking-tight">Awesome Job! 🌟</h2>
        <p className="text-text-muted max-w-sm mb-8 text-balance">
          {child.age >= 18 
            ? `Your wellness profile is updated, ${child.name}. Small consistent check-ins lead to big growth.` 
            : `Great check-in, ${child.name}! Your wellness garden is growing.`}
        </p>
        
        <div className="flex gap-4 mb-8">
          <div className="bg-[#020617] border border-white/5 p-4 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5"><Sparkles size={12} className="text-[#FBBF24]" /> {child.age >= 18 ? 'Credits' : 'Gems'} Earned</p>
            <div className="flex items-center justify-center gap-2 text-2xl font-serif font-bold text-[#FBBF24]">
              +{sessionRewards.gems}
            </div>
          </div>
          <div className="bg-[#020617] border border-white/5 p-4 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5"><Zap size={12} className="text-[#22D3EE]" /> New Streak</p>
            <div className="flex items-center justify-center gap-2 text-2xl font-serif font-bold text-[#22D3EE]">
              {sessionRewards.streak} <span className="text-sm font-sans text-slate-400">Days</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onNavigateHome}
          className="bg-gradient-to-r from-[#2563EB] to-[#0891B2] text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition-all font-serif shadow-[0_0_20px_rgba(37,99,235,0.3)] shadow-[#2563EB]/20"
        >
          Return to Dashboard
        </button>
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

  if (!hasStarted) {
    if (!child) return null;

    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in flex flex-col items-center text-center">
        <div className={cn(
          "w-32 h-32 md:w-40 md:h-40 rounded-3xl shadow-lg border-border/50 flex items-center justify-center text-6xl mb-8 transition-all duration-300 relative overflow-hidden bg-gradient-to-br text-black border",
          getGradientForChild(child.id)
        )}>
          <div className="absolute inset-0 bg-black/10" />
          {child.age >= 18 ? <span className="font-serif text-white">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}
        </div>
        <h1 className="text-3xl md:text-4xl font-serif mb-4 text-text-main tracking-tight">
          {isAlreadyCompleted ? 'Daily Summary' : `Your Wellness Journey`}
        </h1>
        <p className="text-text-muted mb-8 max-w-sm text-balance">
          {isAlreadyCompleted 
            ? 'Great job keeping up your streak! Your mind needs rest too. See you tomorrow.' 
            : 'Take a calm moment to reflect. This is a safe space to understand how you are feeling.'}
        </p>
        
        <div className="w-full flex flex-col items-center gap-4">
          {isAlreadyCompleted ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-[#0F172A]/80 backdrop-blur-md border border-white/5 p-8 rounded-[2rem] text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-4"
            >
              <h3 className="text-xl font-bold text-[#FBBF24] mb-2 font-serif flex items-center justify-center gap-2"><Moon size={20} /> Rest Secured</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed mt-4 mb-6">
                You've already completed today's wellness check-in.<br />Come back tomorrow and keep the streak alive.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 bg-[#020617] py-3 px-6 rounded-2xl w-fit mx-auto border border-white/5 shadow-inner">
                <CheckCircle2 size={16} className="text-[#2563EB]" /> Check-in resets at midnight
              </div>
            </motion.div>
          ) : isLoadingQuestions ? (
            <div className="w-full md:w-auto px-12 py-4 bg-surface-2 text-text-muted rounded-xl font-bold flex items-center gap-3 justify-center border border-border">
              <Loader2 size={18} className="animate-spin" /> Preparing Journey...
            </div>
          ) : (
            <button 
              onClick={() => setHasStarted(true)}
              className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-[#2563EB] to-[#0891B2] text-white rounded-2xl font-bold font-serif transition-all hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-[#2563EB]/40 flex items-center gap-3 justify-center group shadow-[0_0_25px_rgba(37,99,235,0.4)]"
            >
              <Play size={18} className="fill-white text-white group-hover:scale-110 transition-transform" /> Begin Journey
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in min-h-[80vh] flex flex-col relative">
      {isSubmitting && (
        <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-[2.5rem] border border-[#2563EB]/20 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
            <Loader2 className="animate-spin text-[#22D3EE] mb-4" size={48} />
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Analyzing Wellness...</h2>
            <p className="text-slate-400 animate-pulse uppercase tracking-widest text-xs font-bold">Generating personalized insights</p>
        </div>
      )}
      
      <div className="mb-10 text-center relative z-10 w-full flex flex-col items-center">
        <h1 className="text-3xl md:text-2xl font-bold mb-2 uppercase tracking-[0.2em] text-slate-500">Behavioral Insights</h1>
        <p className="text-slate-400 text-sm italic font-serif">Listening to your emotional rhythm</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-12 relative z-10 w-full max-w-xl mx-auto">
        <div className="h-2 w-full bg-[#020617] rounded-full overflow-hidden border border-white/5 shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-[#22D3EE]">
          Question {currentIdx + 1} of {questions.length}
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
            className="bg-[#0F172A] p-8 md:p-12 relative overflow-visible border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-[2.5rem]"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-[#2563EB]/10 text-[#2563EB] rounded-2xl border border-[#2563EB]/20 shadow-inner">
                  {CATEGORY_ICONS[currentQuestion.category] || <ClipboardCheck size={20} />}
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {currentQuestion.category.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-2xl md:text-3xl font-serif font-bold mb-10 leading-snug text-white text-balance text-left">
                {currentQuestion.text}
              </h3>

              {currentQuestion.isOpenEnded ? (
                <div className="w-full">
                   <textarea
                     className="w-full h-40 p-6 rounded-3xl bg-[#020617] border border-white/10 focus:border-[#2563EB] resize-none outline-none text-white text-lg transition-colors shadow-inner font-sans"
                     placeholder="Tap here to type your answer..."
                     value={textAnswers[currentQuestion.id] || ''}
                     onChange={(e) => handleTextEntry(e.target.value, currentQuestion.id)}
                   />
                </div>
              ) : (
                 <div className="grid grid-cols-1 gap-4">
                   {currentQuestion.options.map((option, i) => (
                     <motion.button
                       key={i}
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => handleSelect(option.value, currentQuestion.id)}
                       className={cn(
                         "w-full flex items-center gap-5 p-5 rounded-[1.5rem] border transition-all text-left relative overflow-hidden group bg-[#020617] shadow-sm",
                         answers[currentQuestion.id] === option.value 
                           ? "border-[#2563EB] bg-[#2563EB]/10 shadow-[0_4px_20px_rgba(37,99,235,0.2)]" 
                           : "border-white/5 hover:border-white/10 hover:bg-white/5"
                       )}
                     >
                       <div className={cn(
                         "w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                         answers[currentQuestion.id] === option.value 
                           ? "border-[#2563EB] bg-[#2563EB] text-white scale-110 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                           : "border-white/10 text-slate-500 group-hover:border-white/30 group-hover:text-slate-300"
                       )}>
                         {String.fromCharCode(65 + i)}
                       </div>
                       <span className={cn(
                         "text-base transition-colors font-medium tracking-wide",
                         answers[currentQuestion.id] === option.value ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                       )}>
                         {option.label}
                       </span>
                     </motion.button>
                   ))}
                 </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-12 flex items-center justify-between z-10">
        <button 
          onClick={handleBack}
          disabled={currentIdx === 0 || isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm tracking-wider text-text-muted hover:text-text-main disabled:opacity-30 transition-all"
        >
          <ChevronLeft size={20} /> Back
        </button>

        <button 
          onClick={handleNext}
          disabled={!isCurrentQuestionAnswered() || isSubmitting}
          className={cn(
            "flex items-center gap-2 px-8 py-4 bg-white text-[#020617] rounded-full font-bold text-sm tracking-widest uppercase hover:bg-slate-200 disabled:opacity-50 transition-all font-serif",
            currentIdx === questions.length - 1 && "bg-gradient-to-r from-[#2563EB] to-[#22D3EE] hover:opacity-90 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Processing
            </span>
          ) : currentIdx === questions.length - 1 ? (
            "Complete Journey"
          ) : (
            <>Continue <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
}

