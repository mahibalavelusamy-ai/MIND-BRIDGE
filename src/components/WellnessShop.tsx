import React, { useState } from 'react';
import { X, Star, Gift, Palette, Gamepad2, Clock, Utensils, Film, Coffee, Music, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Child } from '../types';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../lib/firebase';

interface WellnessShopProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child;
}

const KID_REWARDS = [
  { id: 'gaming_pass', name: 'Gaming Pass', cost: 50, icon: <Gamepad2 size={24} />, color: 'bg-green-100 text-green-600' },
  { id: 'dinner_choice', name: 'Dinner Choice', cost: 100, icon: <Utensils size={24} />, color: 'bg-orange-100 text-orange-600' },
  { id: 'cinema_outing', name: 'Cinema Outing', cost: 250, icon: <Film size={24} />, color: 'bg-purple-100 text-purple-600' },
];

const ADULT_REWARDS = [
  { id: 'coffee_voucher', name: 'UberEats Coffee Voucher', cost: 50, icon: <Coffee size={24} />, color: 'bg-amber-100 text-amber-600' },
  { id: 'study_break', name: 'Extra Study Break', cost: 100, icon: <Clock size={24} />, color: 'bg-blue-100 text-blue-600' },
  { id: 'spotify_premium', name: 'Spotify Premium Contribution', cost: 250, icon: <Music size={24} />, color: 'bg-green-100 text-green-600' },
  { id: 'mental_health_day', name: 'Guilt-Free Mental Health Day', cost: 500, icon: <Heart size={24} />, color: 'bg-rose-100 text-rose-600' },
];

export default function WellnessShop({ isOpen, onClose, child }: WellnessShopProps) {
  const [isRedeeming, setIsRedeeming] = useState(false);

  if (!isOpen) return null;

  const currentInventory = child.age >= 18 ? ADULT_REWARDS : KID_REWARDS;

  const handleRedeem = async (cost: number) => {
    if ((child.gems || 0) < cost) return;
    setIsRedeeming(true);
    try {
      await updateDoc(doc(db, 'children', child.id), {
        gems: (child.gems || 0) - cost
      });
      // Could add a toast or success animation here
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'children');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl glass-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface-2/50">
            <div>
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                {child.age >= 18 ? 'Habit Tracker Rewards' : 'Wellness Garden Shop'}
              </h2>
              <p className="text-sm text-text-dim mt-1">Redeem your hard-earned {child.age >= 18 ? 'credits' : 'gems'} for rewards!</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-text-dim hover:text-text-main border border-border"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-8 bg-accent/10 p-4 rounded-2xl border border-accent/20">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{child.age >= 18 ? <span className="font-serif text-accent bg-white w-14 h-14 flex items-center justify-center rounded-2xl">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}</div>
                <div>
                  <p className="font-bold text-lg">{child.name}'s Balance</p>
                  <p className="text-xs text-text-dim">Keep completing tasks to earn more!</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                <Star className="text-amber-400 fill-amber-400" size={24} />
                <span className="text-2xl font-bold text-amber-600">{child.gems || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentInventory.map((item) => (
                <div key={item.id} className="glass-card p-4 flex flex-col justify-between hover:border-accent/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                      {item.icon}
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-bold text-sm border border-amber-200">
                      <Star size={14} className="fill-amber-500 text-amber-500" />
                      {item.cost}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-text-main">{item.name}</h3>
                    <button 
                      onClick={() => handleRedeem(item.cost)}
                      disabled={(child.gems || 0) < item.cost || isRedeeming}
                      className="mt-4 w-full py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-accent text-white hover:bg-accent-dark"
                    >
                      {(child.gems || 0) >= item.cost ? 'Buy' : `Not Enough ${child.age >= 18 ? 'Credits' : 'Gems'}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
