import React, { useState } from 'react';
import { PhoneCall, AlertTriangle, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Child } from '../types';

interface SOSModalProps {
  onClose: () => void;
  selectedChild: Child | null;
}

export default function SOSModal({ onClose, selectedChild }: SOSModalProps) {
  const [triggering, setTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const handleTriggerAlert = async () => {
    setTriggering(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        childId: selectedChild?.id || 'unknown',
        parentId: auth.currentUser?.uid || 'unknown',
        type: 'crisis',
        priority: 'CRITICAL',
        status: 'active',
        title: 'SOS Protocol Initiated',
        description: 'An emergency SOS protocol has been triggered. Please check in immediately.',
        timestamp: new Date().toISOString()
      });
      setTriggered(true);
    } catch (error) {
      console.error('Failed to dispatch SOS alert', error);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 animate-fade-in backdrop-blur-xl">
      <div className="bg-red-950/80 border border-red-500/50 p-8 md:p-12 rounded-[3rem] w-full max-w-2xl text-center shadow-[0_0_100px_rgba(220,38,38,0.3)] relative">
        <button onClick={onClose} className="absolute right-8 top-8 text-white/50 hover:text-white transition-colors">
          <X size={32} />
        </button>

        <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-white mx-auto mb-8 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]">
          <AlertTriangle size={48} />
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">Emergency Help</h1>
        <p className="text-red-200 text-lg md:text-xl font-medium mb-12 opacity-90 max-w-lg mx-auto">
          If you or someone else is in immediate physical danger, please contact local emergency services right away.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
          <a href="tel:911" className="bg-white/10 hover:bg-white/20 border border-white/20 p-6 rounded-2xl flex items-center justify-between transition-all group">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">Local Emergency</h3>
              <p className="text-red-200 text-sm">Police, Fire, Ambulance</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <PhoneCall size={20} />
            </div>
          </a>
          
          <a href="tel:988" className="bg-white/10 hover:bg-white/20 border border-white/20 p-6 rounded-2xl flex items-center justify-between transition-all group">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">Crisis Lifeline</h3>
              <p className="text-red-200 text-sm">24/7 Support Hotline</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <PhoneCall size={20} />
            </div>
          </a>
        </div>

        {triggered ? (
          <div className="bg-green-500/20 text-green-300 p-6 rounded-2xl border border-green-500/30 font-bold uppercase tracking-widest animate-fade-in">
            Critical Alert Dispatched to Emergency Contacts
          </div>
        ) : (
          <button 
            onClick={handleTriggerAlert}
            disabled={triggering}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-lg p-6 rounded-full transition-all shadow-[0_0_40px_rgba(220,38,38,0.4)] disabled:opacity-50"
          >
            {triggering ? "Dispatching..." : "Notify Emergency Contacts Now"}
          </button>
        )}
      </div>
    </div>
  );
}
