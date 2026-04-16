import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Smile, 
  Meh, 
  Frown, 
  Star, 
  Gamepad2, 
  BookOpen, 
  Users, 
  CloudRain,
  Sun,
  Heart,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, collection, addDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { Child } from '../types';
import MicroIntervention from './MicroIntervention';

interface ChildSelfCheckProps {
  child: Child;
  onClose: () => void;
  onComplete: () => void;
}

const MOODS = [
  { value: 1, emoji: '😊', label: 'Great!', color: 'text-green-500', bg: 'bg-green-50' },
  { value: 2, emoji: '🙂', label: 'Good', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { value: 3, emoji: '😐', label: 'Okay', color: 'text-amber-500', bg: 'bg-amber-50' },
  { value: 4, emoji: '🙁', label: 'Not so good', color: 'text-orange-500', bg: 'bg-orange-50' },
  { value: 5, emoji: '😢', label: 'Sad/Angry', color: 'text-red-500', bg: 'bg-red-50' },
];

const TAGS = [
  { id: 'school', label: 'School', icon: <BookOpen size={16} /> },
  { id: 'friends', label: 'Friends', icon: <Users size={16} /> },
  { id: 'family', label: 'Family', icon: <Heart size={16} /> },
  { id: 'play', label: 'Play', icon: <Gamepad2 size={16} /> },
  { id: 'weather', label: 'Weather', icon: <Sun size={16} /> },
  { id: 'other', label: 'Other', icon: <Star size={16} /> },
];

export default function ChildSelfCheck({ child, onClose, onComplete }: ChildSelfCheckProps) {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'selfChecks'), {
        childId: child.id,
        timestamp: new Date().toISOString(),
        mood,
        note,
        tags: selectedTags
      });
      
      if (mood >= 4) {
        setStep(3); // Offer intervention
      } else {
        setStep(5); // Success step
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'selfChecks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMood = MOODS.find(m => m.value === mood) || MOODS[2];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-2xl">
              {child.avatar}
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold">Hi, {child.name}!</h2>
              <p className="text-sm text-text-muted">How are you feeling today?</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-8 pb-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                {/* Emoji Slider Area */}
                <div className="flex flex-col items-center gap-6 py-8">
                  <motion.div 
                    key={mood}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "text-8xl p-8 rounded-full transition-colors duration-500",
                      currentMood.bg
                    )}
                  >
                    {currentMood.emoji}
                  </motion.div>
                  <h3 className={cn("text-3xl font-serif font-bold", currentMood.color)}>
                    {currentMood.label}
                  </h3>
                </div>

                {/* Custom Slider */}
                <div className="px-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    step="1" 
                    value={mood}
                    onChange={(e) => setMood(parseInt(e.target.value))}
                    className="w-full h-4 bg-surface-2 rounded-full appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between mt-4 px-1">
                    {MOODS.map((m) => (
                      <button 
                        key={m.value}
                        onClick={() => setMood(m.value)}
                        className={cn(
                          "text-xl transition-all",
                          mood === m.value ? "scale-125 opacity-100" : "scale-100 opacity-40 grayscale"
                        )}
                      >
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-5 bg-accent text-white rounded-[2rem] font-bold text-lg shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Next
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-serif font-bold">What's on your mind?</h3>
                  <div className="flex flex-wrap gap-3">
                    {TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={cn(
                          "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all border-2",
                          selectedTags.includes(tag.id) 
                            ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" 
                            : "bg-white border-border text-text-muted hover:border-accent/30"
                        )}
                      >
                        {tag.icon}
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-serif font-bold">Want to say more?</h3>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Write or draw something here..."
                    className="w-full h-32 p-6 bg-surface-2 rounded-[2rem] border-none focus:ring-2 focus:ring-accent resize-none text-lg"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-5 bg-surface-2 text-text-main rounded-[2rem] font-bold text-lg hover:bg-border transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-[2] py-5 bg-accent text-white rounded-[2rem] font-bold text-lg shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? "Saving..." : (
                      <>
                        Done! <Send size={20} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex flex-col items-center text-center py-8 space-y-8"
              >
                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <CloudRain size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold mb-2">It looks like a tough day.</h3>
                  <p className="text-text-muted">Want to try a quick breathing trick to feel a little better?</p>
                </div>
                <div className="flex flex-col gap-4 w-full">
                  <button 
                    onClick={() => setStep(4)}
                    className="w-full py-5 bg-blue-500 text-white rounded-[2rem] font-bold text-lg shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Yes, let's breathe
                  </button>
                  <button 
                    onClick={() => {
                      setStep(5);
                      setTimeout(() => {
                        onComplete();
                        onClose();
                      }, 2000);
                    }}
                    className="w-full py-4 bg-surface-2 text-text-main rounded-[2rem] font-bold hover:bg-border transition-all"
                  >
                    No thanks, I'm done
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <MicroIntervention 
                  onComplete={() => {
                    setStep(5);
                    setTimeout(() => {
                      onComplete();
                      onClose();
                    }, 2000);
                  }}
                  onSkip={() => {
                    setStep(5);
                    setTimeout(() => {
                      onComplete();
                      onClose();
                    }, 2000);
                  }}
                />
              </motion.div>
            )}

            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 space-y-6"
              >
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <Star size={48} fill="currentColor" />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-serif font-bold mb-2">Awesome!</h3>
                  <p className="text-text-muted">Thanks for sharing how you feel.</p>
                </div>
                <div className="flex items-center gap-2 text-accent font-bold">
                  <Zap size={20} /> +10 Gems earned!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
