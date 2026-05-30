import React, { useState } from 'react';
import {
  X, Star, Clock, Coffee, BookOpen, Printer, ShoppingBag,
  HeartHandshake, UserCheck, CalendarCheck, Award, Pencil,
  Gamepad2, Utensils, Library, CheckCircle2, ShoppingCart, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Child } from '../types';
import { db, auth, doc, updateDoc, handleFirestoreError, OperationType, increment, collection, addDoc } from '../lib/firebase';
import { cn, getGradientForChild } from '../lib/utils';

interface WellnessShopProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: 'Entertainment' | 'Productivity' | 'Wellness' | 'Achievement';
  cost?: number;
  requiredStreak?: number;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const REWARDS_CATALOG: ShopItem[] = [
  // Entertainment Rewards
  {
    id: 'movie_pass',
    name: 'Movie Time Pass',
    description: 'Unlock 2 hours of guilt-free movie or show watching.',
    category: 'Entertainment',
    cost: 50,
    icon: <Gamepad2 size={22} />,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    badge: 'Popular',
  },
  {
    id: 'gaming_pass',
    name: 'Gaming Pass',
    description: '1 hour of uninterrupted gaming time.',
    category: 'Entertainment',
    cost: 40,
    requiredStreak: 3,
    icon: <Gamepad2 size={22} />,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  // Productivity Rewards
  {
    id: 'premium_theme',
    name: 'Premium App Theme',
    description: 'Unlock a custom premium visual theme for your dashboard.',
    category: 'Productivity',
    cost: 100,
    icon: <Star size={22} />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    id: 'study_playlist',
    name: 'Lo-Fi Study Playlist',
    description: 'Unlock an exclusive ad-free study playlist curated by AI.',
    category: 'Productivity',
    cost: 30,
    icon: <Printer size={22} />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  // Wellness Rewards
  {
    id: 'music_relax',
    name: 'Music Relaxation Pack',
    description: 'A curated pack of ambient sounds and guided relaxation.',
    category: 'Wellness',
    requiredStreak: 5,
    icon: <HeartHandshake size={22} />,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    badge: 'Streak Reward',
  },
  {
    id: 'wellness_day',
    name: 'Wellness Day Pass',
    description: 'An official mental health day off from assignments (requires parent approval).',
    category: 'Wellness',
    cost: 200,
    requiredStreak: 10,
    icon: <CalendarCheck size={22} />,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  // Achievement Rewards
  {
    id: 'badge_focus_master',
    name: 'Focus Master Badge',
    description: 'Exclusive profile badge for completing 50 focus sessions.',
    category: 'Achievement',
    cost: 500,
    icon: <Award size={22} />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    badge: 'Epic',
  },
  {
    id: 'badge_consistency',
    name: 'Consistency King/Queen',
    description: 'Exclusive badge for hitting a 30-day usage streak.',
    category: 'Achievement',
    requiredStreak: 30,
    icon: <UserCheck size={22} />,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  }
];

type PurchaseState = 'idle' | 'confirming' | 'loading' | 'success' | 'error';

export default function WellnessShop({ isOpen, onClose, child }: WellnessShopProps) {
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isCollege = child.age >= 18;
  const currencyLabel = 'Gems';
  const balance = child.gems || 0;
  const currentStreak = child.assessmentCount || 0;

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const categories = ['All', 'Entertainment', 'Productivity', 'Wellness', 'Achievement'];

  const filteredInventory = activeCategory === 'All' 
    ? REWARDS_CATALOG 
    : REWARDS_CATALOG.filter(i => i.category === activeCategory);

  const checkEligibility = (item: ShopItem) => {
    let eligible = true;
    let reason = '';
    let missingType = '';
    let remainingAmount = 0;

    if (item.cost && balance < item.cost) {
      eligible = false;
      missingType = 'cost';
      remainingAmount = item.cost - balance;
      reason = `Need ${remainingAmount} more`;
    }
    if (item.requiredStreak && currentStreak < item.requiredStreak) {
      eligible = false;
      missingType = 'streak';
      remainingAmount = item.requiredStreak - currentStreak;
      reason = `${remainingAmount} days left`;
    }
    return { eligible, reason, missingType };
  };

  const handleSelectItem = (item: ShopItem) => {
    const { eligible } = checkEligibility(item);
    if (!eligible) return;
    setSelectedItem(item);
    setPurchaseState('confirming');
  };

  const handleConfirmPurchase = async () => {
    if (!selectedItem || !auth.currentUser) return;
    setPurchaseState('loading');
    try {
      if (selectedItem.cost) {
        // Atomically deduct from both gems AND credits fields
        await updateDoc(doc(db, 'students', child.id), {
          gems: increment(-selectedItem.cost),
          credits: increment(-selectedItem.cost),
        });
        // Deduct from parent's creditsEarned pool
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          creditsEarned: increment(-selectedItem.cost),
        }).catch(e => console.warn('Failed to deduct parent credits (non-critical):', e));
      }

      // Log the redemption
      await addDoc(collection(db, 'rewardRedemptions'), {
        childId: child.id,
        parentId: auth.currentUser.uid,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        cost: selectedItem.cost || 0,
        timestamp: new Date().toISOString(),
        schoolLinked: true,
      }).catch(e => console.warn('Redemption log failed (non-critical):', e));
      
      setPurchaseState('success');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Redemption failed. Please try again.');
      setPurchaseState('error');
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    }
  };

  const handleReset = () => {
    setPurchaseState('idle');
    setSelectedItem(null);
    setErrorMsg('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={purchaseState === 'idle' ? onClose : undefined}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl glass-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0F172A] shrink-0">
            <div>
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2 text-white">
                <ShoppingCart size={22} className="text-[#FBBF24]" />
                {isCollege ? 'Campus Wellness Shop' : 'School Wellness Shop'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">Redeem your {currencyLabel.toLowerCase()} for real school rewards</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Balance Banner */}
          <div className="px-6 pt-5 pb-2 shrink-0">
            <div className="flex items-center justify-between bg-[#FBBF24]/10 p-4 rounded-2xl border border-[#FBBF24]/30 shadow-[0_4px_24px_rgba(251,191,36,0.1)] backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className={cn('text-3xl w-12 h-12 flex items-center justify-center rounded-2xl shadow-inner text-white',
                  isCollege ? 'bg-gradient-to-br from-[#2563EB] to-[#22D3EE]' : 'bg-[#0F172A] border border-[#2563EB]/40'
                )}>
                  {isCollege ? <span className="font-serif text-lg">{child.name?.charAt(0).toUpperCase() || '👤'}</span> : child.avatar}
                </div>
                <div>
                  <p className="font-bold text-white text-lg font-serif">{child.name}'s Balance</p>
                  <p className="text-xs text-[#22D3EE]">Complete daily check-ins to earn more!</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#020617] px-4 py-2 rounded-xl shadow-inner border border-white/5">
                <Star className="text-[#FBBF24] fill-[#FBBF24] drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" size={24} />
                <span className="text-3xl font-bold text-white font-serif">{balance}</span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{currencyLabel}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-medium bg-[#020617] border border-white/5 px-3 py-2 rounded-xl">
              <Info size={13} className="shrink-0 text-[#2563EB]" />
              All rewards are linked to {child.school || 'your institution'} and require staff approval to redeem.
            </div>
          </div>

          {/* Shop Grid */}
          <div className="p-6 flex-1 overflow-y-auto w-full bg-[#020617]">
            <div className="flex bg-[#0F172A] border border-white/5 rounded-xl p-1 shrink-0 mb-6 overflow-x-auto custom-scrollbar shadow-inner">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap",
                    activeCategory === cat ? "bg-[#2563EB]/20 text-[#22D3EE] border border-[#2563EB]/40 shadow-sm" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredInventory.map((item) => {
                const { eligible, reason, missingType } = checkEligibility(item);
                
                return (
                  <motion.div key={item.id} whileHover={eligible ? { scale: 1.02 } : {}}
                    className={cn('bg-[#0F172A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group shadow-[0_4px_20px_rgba(0,0,0,0.2)]',
                      eligible ? 'hover:border-[#FBBF24]/40 hover:shadow-[0_8px_30px_rgba(251,191,36,0.15)]' : 'opacity-60')}
                  >
                    <div className="absolute -right-10 -top-10 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-[#FBBF24]/5 transition-colors pointer-events-none" />
                    {item.badge && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30 px-2 py-0.5 rounded-full shadow-sm">
                        {item.badge}
                      </span>
                    )}
                    <div className="flex items-start gap-4 mb-4 relative z-10">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner border border-white/10 ${item.color}`}>{item.icon}</div>
                      <div className="flex-1 min-w-0 pr-12">
                        <h3 className="font-bold text-white text-base leading-tight mb-1 font-serif">{item.name}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto flex-wrap gap-2 relative z-10 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                         {item.cost && (
                            <div className="flex items-center gap-1 text-[#FBBF24] font-bold text-sm bg-[#FBBF24]/10 px-2 py-1 rounded-md border border-[#FBBF24]/20">
                               <Star size={14} className="fill-[#FBBF24] drop-shadow-sm" /> {item.cost} {currencyLabel}
                            </div>
                         )}
                         {item.requiredStreak && (
                            <div className="flex items-center gap-1 text-[#22D3EE] font-bold text-sm bg-[#22D3EE]/10 px-2 py-1 rounded-md border border-[#22D3EE]/20">
                               <Award size={14} /> {item.requiredStreak} Day Streak
                            </div>
                         )}
                      </div>
                      <button onClick={() => handleSelectItem(item)} disabled={!eligible}
                        className={cn('px-4 py-2 rounded-xl font-bold text-xs transition-all shrink-0 uppercase tracking-wider',
                          eligible ? 'bg-gradient-to-r from-[#2563EB] to-[#0891B2] text-white hover:opacity-90 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-[#020617] border border-white/10 text-slate-600 cursor-not-allowed')}
                      >
                        {eligible ? 'Redeem' : reason}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Confirmation Dialog */}
        <AnimatePresence>
          {(purchaseState === 'confirming' || purchaseState === 'loading') && selectedItem && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-10 bg-[#0F172A] border border-white/10 shadow-[0_10px_50px_rgba(0,0,0,0.8)] rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center backdrop-blur-xl"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner ${selectedItem.color}`}>{selectedItem.icon}</div>
              <h3 className="text-xl font-serif font-bold mb-1 text-white">{selectedItem.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{selectedItem.description}</p>
              <div className="bg-[#020617] border border-white/5 rounded-xl p-3 mb-6 flex flex-col justify-center gap-2 items-center shadow-inner">
                 {selectedItem.cost && (
                   <div className="flex items-center gap-2">
                     <Star size={16} className="fill-[#FBBF24] text-[#FBBF24]" />
                     <span className="font-bold text-[#FBBF24]">{selectedItem.cost} {currencyLabel}</span>
                     <span className="text-slate-500 text-sm">→ New balance: {balance - selectedItem.cost}</span>
                   </div>
                 )}
                 {selectedItem.requiredStreak && (
                   <div className="flex items-center gap-2">
                     <Award size={16} className="text-[#22D3EE]" />
                     <span className="font-bold text-[#22D3EE]">Unlocks with {selectedItem.requiredStreak} day streak</span>
                     <span className="text-slate-500 text-sm break-keep">(Current: {currentStreak})</span>
                   </div>
                 )}
              </div>
              <div className="flex gap-3">
                <button onClick={handleReset} disabled={purchaseState === 'loading'}
                  className="flex-1 py-3 rounded-xl border border-white/10 font-bold text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleConfirmPurchase} disabled={purchaseState === 'loading'}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#0891B2] text-white font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:animate-pulse">
                  {purchaseState === 'loading' ? 'Processing…' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success State */}
        <AnimatePresence>
          {purchaseState === 'success' && selectedItem && (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              className="absolute z-10 bg-[#0F172A] border border-[#22D3EE]/40 shadow-[0_10px_50px_rgba(34,211,238,0.2)] rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center backdrop-blur-xl"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#22D3EE]/20 via-transparent to-transparent pointer-events-none rounded-[2rem]" />
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                className="w-20 h-20 bg-[#22D3EE]/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#22D3EE]/30 relative z-10">
                <CheckCircle2 size={44} className="text-[#22D3EE]" />
              </motion.div>
              <h3 className="text-2xl font-serif font-bold text-white mb-2 relative z-10">Reward Claimed! 🎉</h3>
              <p className="text-sm text-[#FBBF24] mb-2 font-bold uppercase tracking-widest relative z-10">{selectedItem.name}</p>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed relative z-10">
                Show this screen to your {isCollege ? 'college administrator or department staff' : 'teacher or school office'} to redeem.
                {selectedItem.cost ? ` Your ${currencyLabel.toLowerCase()} have been deducted.` : ' Unlocked via your streak progress!'}
              </p>
              {selectedItem.cost ? (
                 <div className="bg-[#020617] border border-white/5 rounded-xl p-3 mb-6 text-xs text-slate-400 relative z-10">
                   <span className="font-bold text-white">Remaining balance: </span>
                   <span className="text-[#FBBF24] font-bold">{balance - selectedItem.cost} {currencyLabel}</span>
                 </div>
              ) : null}
              <button onClick={() => { handleReset(); onClose(); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#22D3EE] to-[#0891B2] text-[#020617] font-bold hover:opacity-90 transition-all font-serif">Done</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {purchaseState === 'error' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-10 bg-[#0F172A] border border-[#F87171]/40 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center"
            >
              <X size={44} className="text-[#F87171] mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold mb-2 text-white">Redemption Failed</h3>
              <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
              <button onClick={handleReset} className="w-full py-3 rounded-xl bg-[#020617] text-white border border-white/10 hover:bg-white/5 font-bold transition-colors">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
