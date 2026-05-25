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
import { AdaptiveAssessmentEngine, AdaptiveQuestion } from '../services/analytics/adaptiveEngine';
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
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isSuccessfullyFinished, setIsSuccessfullyFinished] = useState(false);
  const [sessionRewards, setSessionRewards] = useState({ gems: 0, streak: 0 }); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);

  useEffect(() => {
    // Check if already completed today
    const checkCompletion = async () => {
      if (!child || !auth.currentUser) return;
      const todayDateStr = new Date().toISOString().split('T')[0];
      try {
        const qDailyCheck = query(
          collection(db, 'assessments'),
          where('childId', '==', child.id),
          where('timestamp', '>=', todayDateStr)
        );
        const dailyCheckSnap = await getDocs(qDailyCheck);
        if (!dailyCheckSnap.empty) {
          setIsAlreadyCompleted(true);
        }
      } catch (err) {
        // Ignored in dev
      }
    };
    checkCompletion();
    setQuestions(AdaptiveAssessmentEngine.initializeSession(child?.age || 10));
  }, [child]);

  const handleSelect = (optionValue: number, qId: string) => {
    const newAnswers = { ...answers, [qId]: optionValue };
    setAnswers(newAnswers);
    
    // Evaluate if we need to add dynamic follow-ups
    const updatedQuestions = AdaptiveAssessmentEngine.evaluateFollowUps(questions, newAnswers);
    if (updatedQuestions.length > questions.length) {
      setQuestions(updatedQuestions);
    }
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
      const outcome = AdaptiveAssessmentEngine.generateAssessmentOutcome(answers, questions);
      const viewerRole = child.age >= 18 ? 'student' : 'parent';
      const aiInsight = await AIInterpreter.generateSupportiveSummary({
         emotionalRisk: outcome.riskScore,
         overloadRisk: outcome.isBurnoutRisk ? 0.8 : 0.2,
         burnoutRisk: outcome.isBurnoutRisk ? 0.9 : 0.3
      }, viewerRole);

      const batch = writeBatch(db);
      
      let newStreak = child.streak || 0;
      const rewardAmount = (newStreak > 0 && newStreak % 7 === 0) ? 70 : 10;
      const newLevel = Math.floor(((child.gems || 0) + rewardAmount) / 500) + 1;

      const assessmentRef = doc(collection(db, 'assessments'));
      batch.set(assessmentRef, {
        childId: child.id,
        parentId: auth.currentUser!.uid,
        submittedBy: auth.currentUser!.uid,
        timestamp: new Date().toISOString(),
        scores: outcome.categoryScores,
        totalScore: outcome.averageScore,
        aiInsight,
        riskLevel: outcome.riskLevel,
        isAdaptive: true
      });

      const childRef = doc(db, 'children', child.id);
      batch.update(childRef, {
        streak: increment(1),
        lastAssessmentTimestamp: new Date().toISOString(),
        lastAssessmentDate: new Date().toISOString().split('T')[0],
        riskLevel: outcome.riskLevel,
        moodScore: outcome.averageScore,
        level: newLevel,
        gems: increment(rewardAmount),
        credits: increment(rewardAmount),
        moodHistory: arrayUnion(outcome.categoryScores)
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
        <h2 className="text-4xl font-serif mb-4 text-text-main neon-text">Awesome Job! 🌟</h2>
        <p className="text-text-muted max-w-sm mb-8 text-balance">
          {child.age >= 18 
            ? `Your wellness profile is updated, ${child.name}. Small consistent check-ins lead to big growth.` 
            : `Great check-in, ${child.name}! Your wellness garden is growing.`}
        </p>
        
        <div className="flex gap-4 mb-8">
          <div className="bg-surface border border-accent/20 p-4 rounded-2xl shadow-sm glass-card">
            <p className="text-[10px] font-bold text-text-dim uppercase mb-1">{child.age >= 18 ? 'Credits' : 'Gems'} Earned</p>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-accent">
              <Sparkles size={20} /> +{sessionRewards.gems}
            </div>
          </div>
          <div className="bg-surface border border-orange-500/20 p-4 rounded-2xl shadow-sm glass-card">
            <p className="text-[10px] font-bold text-text-dim uppercase mb-1">New Streak</p>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-orange-500">
              <Zap size={20} /> {sessionRewards.streak} Days
            </div>
          </div>
        </div>
        
        <button 
          onClick={onNavigateHome}
          className="bg-accent text-black font-bold px-8 py-3 rounded-xl hover:bg-accent-hover transition-all"
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
          "w-32 h-32 md:w-40 md:h-40 rounded-3xl shadow-2xl flex items-center justify-center text-6xl mb-8 transition-all duration-300 relative overflow-hidden bg-gradient-to-br text-black border border-accent/30 neon-border",
          getGradientForChild(child.id)
        )}>
          <div className="absolute inset-0 bg-black/10" />
          {child.age >= 18 ? <span className="font-serif text-white">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}
        </div>
        <h1 className="text-3xl md:text-4xl font-serif mb-4 text-text-main neon-text-blue">
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
              className="w-full glass-card border border-accent/30 p-6 rounded-2xl text-center shadow-[0_0_20px_rgba(0,255,136,0.1)] mb-4"
            >
              <h3 className="text-xl font-bold text-accent mb-2">Rest Secured 🌙</h3>
              <p className="text-sm text-text-muted font-medium leading-relaxed">
                You've successfully completed your check-in today.<br />Take this time to relax and recharge.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-muted bg-surface-2 py-2 px-4 rounded-full w-fit mx-auto">
                <CheckCircle2 size={14} className="text-accent" /> Check-in resets at midnight
              </div>
            </motion.div>
          ) : (
            <button 
              onClick={() => setHasStarted(true)}
              className="w-full md:w-auto px-12 py-4 bg-accent text-black rounded-xl font-bold transition-all hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/20 flex items-center gap-3 justify-center group"
            >
              <Play size={18} className="fill-black group-hover:scale-110 transition-transform" /> Begin Journey
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-3xl border border-accent/20">
            <Loader2 className="animate-spin text-accent mb-4" size={48} />
            <h2 className="text-2xl font-serif font-bold text-text-main mb-2">Analyzing Wellness...</h2>
            <p className="text-text-muted animate-pulse">Generating personalized insights.</p>
        </div>
      )}
      
      <div className="mb-10 text-center relative z-10">
        <h1 className="text-3xl md:text-2xl font-bold mb-2 uppercase tracking-[0.2em] text-text-dim">Behavioral Insights</h1>
        <p className="text-text-muted text-sm">Listening to your emotional rhythm</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-12 relative z-10">
        <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 text-right text-xs font-mono text-accent">
          {currentIdx + 1} / {questions.length}
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
            className="glass-card p-8 md:p-12 relative overflow-visible border-accent/20 shadow-2xl bg-surface-2/40"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-accent/10 text-accent rounded-xl border border-accent/20">
                  {CATEGORY_ICONS[currentQuestion.category] || <ClipboardCheck size={20} />}
                </div>
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                  {currentQuestion.category.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-2xl md:text-3xl font-sans font-bold mb-10 leading-snug text-text-main text-balance">
                {currentQuestion.text}
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(option.value, currentQuestion.id)}
                    className={cn(
                      "w-full flex items-center gap-5 p-5 rounded-2xl border transition-all text-left relative overflow-hidden group bg-surface shadow-sm",
                      answers[currentQuestion.id] === option.value 
                        ? "border-accent bg-accent/5 shadow-[0_0_15px_rgba(0,255,136,0.1)]" 
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                      answers[currentQuestion.id] === option.value 
                        ? "border-accent bg-accent text-black scale-110" 
                        : "border-border text-text-dim group-hover:border-accent/50 group-hover:text-accent"
                    )}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className={cn(
                      "text-base transition-colors font-medium",
                      answers[currentQuestion.id] === option.value ? "text-accent" : "text-text-muted group-hover:text-text-main"
                    )}>
                      {option.label}
                    </span>
                  </motion.button>
                ))}
              </div>
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
          disabled={answers[currentQuestion.id] === undefined || isSubmitting}
          className={cn(
            "flex items-center gap-2 px-8 py-3 bg-white text-black dark:bg-white rounded-2xl font-bold text-sm hover:bg-slate-200 disabled:opacity-50 transition-all",
            currentIdx === questions.length - 1 && "bg-accent hover:bg-accent-hover text-black"
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

