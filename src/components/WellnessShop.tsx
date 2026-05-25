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
  cost: number;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

// School-linked rewards for college students (age >= 18)
const COLLEGE_REWARDS: ShopItem[] = [
  {
    id: 'cafeteria_voucher',
    name: 'Campus Café Voucher',
    description: 'Redeemable at your college cafeteria or food court for any meal or beverage.',
    cost: 30,
    icon: <Coffee size={22} />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    badge: 'Most Popular',
  },
  {
    id: 'printing_credits',
    name: 'Free Printing Credits',
    description: '30 pages of free printing at the campus library or resource centre.',
    cost: 25,
    icon: <Printer size={22} />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    id: 'library_priority',
    name: 'Priority Study Seat',
    description: 'Reserve a quiet, air-conditioned study bay in the campus library for 3 days.',
    cost: 20,
    icon: <Library size={22} />,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  {
    id: 'bookstore_discount',
    name: 'Campus Store Discount',
    description: '15% off stationery, textbooks, or accessories at the college bookstore.',
    cost: 50,
    icon: <ShoppingBag size={22} />,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  {
    id: 'counselor_session',
    name: 'Counsellor Fast-Track',
    description: 'Skip the queue — priority appointment with the campus wellness counsellor.',
    cost: 60,
    icon: <HeartHandshake size={22} />,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    badge: 'School Backed',
  },
  {
    id: 'mentor_session',
    name: 'Faculty Mentor Hour',
    description: '1-on-1 academic mentoring session with a faculty member of your choice.',
    cost: 75,
    icon: <UserCheck size={22} />,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    badge: 'School Backed',
  },
  {
    id: 'stationery_bundle',
    name: 'Stationery Bundle',
    description: 'Quality pens, a notebook, and highlighters from the campus store.',
    cost: 40,
    icon: <Pencil size={22} />,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    id: 'wellness_day',
    name: 'Wellness Day Pass',
    description: 'Institution-approved mental health day — no attendance penalty applied.',
    cost: 100,
    icon: <CalendarCheck size={22} />,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    badge: 'Best Value',
  },
];

// School-linked rewards for younger students (age < 18)
const SCHOOL_KID_REWARDS: ShopItem[] = [
  {
    id: 'canteen_treat',
    name: 'Canteen Treat',
    description: 'A special snack or meal voucher redeemable at the school cafeteria.',
    cost: 15,
    icon: <Utensils size={22} />,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    badge: 'Fan Favourite',
  },
  {
    id: 'extra_recess',
    name: 'Extra Recess Pass',
    description: '10 extra minutes of recess with your friends — teacher pre-approved!',
    cost: 20,
    icon: <Clock size={22} />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    badge: 'School Backed',
  },
  {
    id: 'library_pick',
    name: 'Library First Pick',
    description: 'First choice of any new book arrival at the school library this week.',
    cost: 25,
    icon: <BookOpen size={22} />,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
  },
  {
    id: 'stationery_set',
    name: 'Fun Stationery Set',
    description: 'Colourful pencils, erasers, and stickers from the school store.',
    cost: 30,
    icon: <Pencil size={22} />,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  },
  {
    id: 'star_badge',
    name: 'Star Student Badge',
    description: 'A special badge displayed next to your name in the classroom for a whole week!',
    cost: 50,
    icon: <Award size={22} />,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    badge: 'School Backed',
  },
  {
    id: 'game_time',
    name: 'Game Time Pass',
    description: '30 minutes of school-approved board game or activity time with friends.',
    cost: 40,
    icon: <Gamepad2 size={22} />,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
  },
];

type PurchaseState = 'idle' | 'confirming' | 'loading' | 'success' | 'error';

export default function WellnessShop({ isOpen, onClose, child }: WellnessShopProps) {
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isCollege = child.age >= 18;
  const currentInventory = isCollege ? COLLEGE_REWARDS : SCHOOL_KID_REWARDS;
  const currencyLabel = isCollege ? 'Credits' : 'Gems';
  const balance = child.gems || 0;

  const handleSelectItem = (item: ShopItem) => {
    if (balance < item.cost) return;
    setSelectedItem(item);
    setPurchaseState('confirming');
  };

  const handleConfirmPurchase = async () => {
    if (!selectedItem || !auth.currentUser) return;
    setPurchaseState('loading');
    try {
      // Atomically deduct from both gems AND credits fields
      await updateDoc(doc(db, 'children', child.id), {
        gems: increment(-selectedItem.cost),
        credits: increment(-selectedItem.cost),
      });
      // Deduct from parent's creditsEarned pool
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        creditsEarned: increment(-selectedItem.cost),
      }).catch(e => console.warn('Failed to deduct parent credits (non-critical):', e));
      // Log the redemption for school admin visibility
      await addDoc(collection(db, 'rewardRedemptions'), {
        childId: child.id,
        parentId: auth.currentUser.uid,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        cost: selectedItem.cost,
        timestamp: new Date().toISOString(),
        schoolLinked: true,
        isCollegeReward: isCollege,
      }).catch(e => console.warn('Redemption log failed (non-critical):', e));
      setPurchaseState('success');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Redemption failed. Please try again.');
      setPurchaseState('error');
      handleFirestoreError(error, OperationType.UPDATE, 'children');
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
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface-2/50 shrink-0">
            <div>
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                <ShoppingCart size={22} className="text-accent" />
                {isCollege ? 'Campus Wellness Shop' : 'School Wellness Shop'}
              </h2>
              <p className="text-sm text-text-dim mt-1">Redeem your {currencyLabel.toLowerCase()} for real school rewards</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-text-dim hover:text-text-main border border-border">
              <X size={20} />
            </button>
          </div>

          {/* Balance Banner */}
          <div className="px-6 pt-5 pb-2 shrink-0">
            <div className="flex items-center justify-between bg-accent/10 p-4 rounded-2xl border border-accent/20">
              <div className="flex items-center gap-3">
                <div className={cn('text-3xl w-12 h-12 flex items-center justify-center rounded-2xl shadow-inner',
                  isCollege ? `text-bg bg-gradient-to-br ${getGradientForChild(child.id)}` : 'bg-bg text-accent'
                )}>
                  {isCollege ? <span className="font-serif text-lg">{child.name?.charAt(0).toUpperCase() || '👤'}</span> : child.avatar}
                </div>
                <div>
                  <p className="font-bold">{child.name}'s Balance</p>
                  <p className="text-xs text-text-dim">Complete daily check-ins to earn more!</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-bg px-4 py-2 rounded-xl shadow-sm">
                <Star className="text-amber-400 fill-amber-400" size={22} />
                <span className="text-2xl font-bold text-amber-500">{balance}</span>
                <span className="text-xs text-text-dim font-semibold">{currencyLabel}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-text-dim font-medium bg-surface border border-border px-3 py-2 rounded-xl">
              <Info size={13} className="shrink-0 text-accent" />
              All rewards are linked to {child.school || 'your institution'} and require staff approval to redeem.
            </div>
          </div>

          {/* Shop Grid */}
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentInventory.map((item) => {
                const canAfford = balance >= item.cost;
                return (
                  <motion.div key={item.id} whileHover={canAfford ? { scale: 1.01 } : {}}
                    className={cn('glass-card p-4 flex flex-col justify-between transition-colors relative overflow-hidden',
                      canAfford ? 'hover:border-accent/30' : 'opacity-55')}
                  >
                    {item.badge && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>{item.icon}</div>
                      <div className="flex-1 min-w-0 pr-12">
                        <h3 className="font-bold text-text-main text-sm leading-tight">{item.name}</h3>
                        <p className="text-xs text-text-dim mt-0.5 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                        <Star size={13} className="fill-amber-400 text-amber-400" />{item.cost} {currencyLabel}
                      </div>
                      <button onClick={() => handleSelectItem(item)} disabled={!canAfford}
                        className={cn('px-4 py-1.5 rounded-xl font-bold text-xs transition-all',
                          canAfford ? 'bg-accent text-bg hover:bg-accent-dark shadow-sm' : 'bg-surface border border-border text-text-dim cursor-not-allowed')}
                      >
                        {canAfford ? 'Redeem' : `Need ${item.cost - balance} more`}
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
              className="absolute z-10 bg-surface border border-border shadow-2xl rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${selectedItem.color}`}>{selectedItem.icon}</div>
              <h3 className="text-xl font-serif font-bold mb-1">{selectedItem.name}</h3>
              <p className="text-sm text-text-dim mb-4">{selectedItem.description}</p>
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-6 flex items-center justify-center gap-2">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span className="font-bold text-accent">{selectedItem.cost} {currencyLabel}</span>
                <span className="text-text-dim text-sm">→ New balance: {balance - selectedItem.cost}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={handleReset} disabled={purchaseState === 'loading'}
                  className="flex-1 py-3 rounded-xl border border-border font-bold text-sm text-text-muted hover:bg-surface-2 transition-colors">Cancel</button>
                <button onClick={handleConfirmPurchase} disabled={purchaseState === 'loading'}
                  className="flex-1 py-3 rounded-xl bg-accent text-bg font-bold text-sm hover:bg-accent-dark transition-colors disabled:animate-pulse">
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
              className="absolute z-10 bg-surface border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={44} className="text-emerald-500" />
              </motion.div>
              <h3 className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400 mb-2">Reward Claimed! 🎉</h3>
              <p className="text-sm text-text-muted mb-2 font-semibold">{selectedItem.name}</p>
              <p className="text-xs text-text-dim mb-6">
                Show this screen to your {isCollege ? 'college administrator or department staff' : 'teacher or school office'} to redeem.
                Your {currencyLabel.toLowerCase()} have been deducted.
              </p>
              <div className="bg-surface-2 border border-border rounded-xl p-3 mb-6 text-xs text-text-dim">
                <span className="font-bold text-text-main">Remaining balance: </span>
                <span className="text-amber-500 font-bold">{balance - selectedItem.cost} {currencyLabel}</span>
              </div>
              <button onClick={() => { handleReset(); onClose(); }}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-colors">Done</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {purchaseState === 'error' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-10 bg-surface border border-red-400/40 shadow-2xl rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
            >
              <X size={44} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold mb-2 text-red-600">Redemption Failed</h3>
              <p className="text-sm text-text-dim mb-6">{errorMsg}</p>
              <button onClick={handleReset} className="w-full py-3 rounded-xl bg-accent text-bg font-bold">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
