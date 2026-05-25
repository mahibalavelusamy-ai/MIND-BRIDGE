import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, getDocs, updateDoc, doc, setDoc } from '../lib/firebase';
import { Share2, Users, Check, X, Shield, UserPlus, Info } from 'lucide-react';

interface ConnectionsProps {
  user: any;
}

export default function Connections({ user }: ConnectionsProps) {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [tutorEmail, setTutorEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchConnections = async () => {
      const q = query(collection(db, 'relationships'), where('studentId', '==', auth.currentUser!.uid));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setPendingRequests(all.filter(r => r.status === 'pending' && r.caretakerId !== auth.currentUser!.uid));
      setActiveConnections(all.filter(r => r.status === 'approved'));
    };
    fetchConnections();
  }, [auth.currentUser]);

  const handleAccept = async (id: string, accept: boolean) => {
    try {
      if (accept) {
        await updateDoc(doc(db, 'relationships', id), { status: 'approved' });
      } else {
        await updateDoc(doc(db, 'relationships', id), { status: 'rejected' });
      }
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      if (accept) {
        // Optimistic update
        setActiveConnections(prev => [...prev, {id, status: 'approved'}]);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleShareWithTutor = async () => {
    if (!tutorEmail || !auth.currentUser) return;
    setStatusMsg('');
    try {
      // Find the user by email
      const uq = query(collection(db, 'users'), where('email', '==', tutorEmail));
      const usnap = await getDocs(uq);
      if (usnap.empty) {
         setStatusMsg('User not found. Ensure they have registered.');
         return;
      }
      const tutorId = usnap.docs[0].id;
      const relId = `${tutorId}_${auth.currentUser.uid}`;
      await setDoc(doc(db, 'relationships', relId), {
         caretakerId: tutorId,
         studentId: auth.currentUser.uid,
         status: 'approved', // Pre-approved since student initiated
         type: 'tutor'
      });
      setStatusMsg('Profile access shared successfully.');
      setActiveConnections(prev => [...prev, { id: relId, caretakerId: tutorId, studentId: auth.currentUser.uid, status: 'approved', type: 'tutor' }]);
      setTutorEmail('');
    } catch(e) {
      console.error(e);
      setStatusMsg('Error sharing profile.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
         <Users className="text-accent" size={28} />
         <h1 className="text-3xl font-serif font-bold text-white tracking-wide">Data Sharing & Connections</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full">
         <div className="glass-card p-6 flex flex-col w-full h-full border border-border/50 rounded-2xl bg-surface-1/80 backdrop-blur-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"> <Users size={18} className="text-blue-400" /> Pending Requests</h2>
            {pendingRequests.length === 0 ? (
               <p className="text-text-muted text-sm border border-border/50 bg-bg/50 p-6 rounded-xl text-center">No pending requests at this time.</p>
            ) : (
               <div className="space-y-4">
                 {pendingRequests.map(req => (
                    <div key={req.id} className="bg-surface p-4 rounded-xl border border-border flex items-center justify-between shadow-md">
                       <div>
                         <p className="text-sm text-text-main font-bold">Monitoring Request</p>
                         <p className="text-xs text-text-muted mt-1">A connection wants to view your wellness summary.</p>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => handleAccept(req.id, true)} className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors">
                           <Check size={16} />
                         </button>
                         <button onClick={() => handleAccept(req.id, false)} className="p-2 bg-alert-500/10 border border-alert-500/20 text-alert-500 rounded-lg hover:bg-alert-500/20 transition-colors">
                           <X size={16} />
                         </button>
                       </div>
                    </div>
                 ))}
               </div>
            )}
         </div>

         <div className="glass-card p-6 flex flex-col w-full h-full border border-border/50 rounded-2xl bg-surface-1/80 backdrop-blur-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"> <Share2 size={18} className="text-emerald-400" /> Share with Tutor</h2>
            <p className="text-sm text-text-muted mb-6">Grant a tutor access to view your academic schedules and wellness recommendations.</p>
            <div className="flex flex-col gap-4 mt-auto">
               <input 
                 className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent shadow-inner placeholder:text-text-dim"
                 placeholder="Tutor's registered email"
                 value={tutorEmail}
                 onChange={e => setTutorEmail(e.target.value)}
               />
               <button onClick={handleShareWithTutor} disabled={!tutorEmail} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-bg font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-accent/20">
                 <UserPlus size={18} /> Share Profile
               </button>
               {statusMsg && <p className="text-xs text-accent mt-1 tracking-wide font-medium text-center">{statusMsg}</p>}
            </div>
         </div>
      </div>

      <div className="glass-card p-6 border border-border/50 rounded-2xl bg-surface-1/80 backdrop-blur-md shadow-xl">
         <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"> <Shield size={18} className="text-indigo-400" /> Active Connections</h2>
         {activeConnections.length === 0 ? (
           <p className="text-text-muted text-sm border border-border/50 bg-bg/50 p-6 rounded-xl text-center">No active connections.</p>
         ) : (
           <div className="grid sm:grid-cols-3 gap-4">
             {activeConnections.map(conn => (
                <div key={conn.id} className="bg-surface p-4 rounded-xl border border-border flex items-center gap-3 shadow-md">
                  <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-lg shadow-inner">🤝</div>
                  <div>
                    <p className="text-sm text-white font-bold leading-tight">Connection Active</p>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider mt-1">{conn.type || 'Caretaker'}</p>
                  </div>
                </div>
             ))}
           </div>
         )}
      </div>

    </div>
  );
}
