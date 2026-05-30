import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Link as LinkIcon, UserCheck, Clock, Activity, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db, auth, collection, query, where, getDocs, addDoc, onSnapshot, doc, updateDoc, setDoc } from '../lib/firebase';
import { Child, Alert } from '../types';
import { cn } from '../lib/utils';

interface CaretakerDashboardProps {
  onViewProfile?: (child: Child) => void;
}

export default function CaretakerDashboard({ onViewProfile }: CaretakerDashboardProps) {
  const [students, setStudents] = useState<Child[]>([]);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkingStatus, setLinkingStatus] = useState<string>('');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for linked students (where this caretaker is in their linkedCaretakers array, or we use a separate relationships collection)
    const relQuery = query(collection(db, 'relationships'), where('caretakerId', '==', auth.currentUser.uid), where('status', '==', 'approved'));
    const unsubRel = onSnapshot(relQuery, async (snapshot) => {
      const studentIds = snapshot.docs.map(d => d.data().studentId);
      if (studentIds.length > 0) {
        // NOTE: Firebase "in" query limits to 10. For now, this is a prototype.
        const studentsQuery = query(collection(db, 'students'), where('parentId', 'in', studentIds)); // The student user is the 'parentId' of their own profile
        const stuSnap = await getDocs(studentsQuery);
        setStudents(stuSnap.docs.map(d => ({ id: d.id, ...d.data() } as Child)));
      } else {
        setStudents([]);
      }
    });

    // Listen for pending requests we sent
    const pendingQuery = query(collection(db, 'connectionRequests'), where('caretakerId', '==', auth.currentUser.uid), where('status', '==', 'pending'));
    const unsubPending = onSnapshot(pendingQuery, (snap) => {
      setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubRel(); unsubPending(); };
  }, []);

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingStatus('Searching...');
    try {
      // Find student user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', linkEmail), where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLinkingStatus('Student not found. Ensure they registered as a student.');
        return;
      }

      const studentUser = querySnapshot.docs[0];
      
      // Check if relationship already exists
      const relCheckQuery = query(collection(db, 'relationships'), where('caretakerId', '==', auth.currentUser?.uid), where('studentId', '==', studentUser.id));
      const relCheckSnap = await getDocs(relCheckQuery);
      if (!relCheckSnap.empty) {
        setLinkingStatus('Relationship already exists.');
        return;
      }
      
      const reqCheckQuery = query(collection(db, 'connectionRequests'), where('caretakerId', '==', auth.currentUser?.uid), where('studentId', '==', studentUser.id));
      const reqCheckSnap = await getDocs(reqCheckQuery);
      if (!reqCheckSnap.empty) {
        setLinkingStatus('Request already sent to this student.');
        return;
      }

      // Create relationship request
      await setDoc(doc(db, 'connectionRequests', `${auth.currentUser?.uid}_${studentUser.id}`), {
        caretakerId: auth.currentUser?.uid,
        studentId: studentUser.id,
        studentEmail: linkEmail,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      // Send alert to student
      await addDoc(collection(db, 'notifications'), {
        type: 'info',
        title: 'New Connection Request',
        description: `A caretaker (${auth.currentUser?.email}) has requested to monitor your wellness metrics.`,
        childId: studentUser.id,
        parentId: studentUser.id,
        timestamp: new Date().toISOString(),
        status: 'active',
        isConnectionRequest: true,
        caretakerId: auth.currentUser?.uid
      });

      setLinkingStatus('Request sent successfully!');
      setLinkEmail('');
      setTimeout(() => setLinkingStatus(''), 3000);
    } catch (error) {
       console.error("Error linking student", error);
       setLinkingStatus('An error occurred.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white">Caretaker Portal</h1>
          <p className="text-slate-400 mt-1">Professional wellness & engagement monitoring.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#0F172A]/80 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <LinkIcon size={18} className="text-[#2563EB]" />
              Link a Student
            </h3>
            <form onSubmit={handleLinkStudent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Student Email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="email"
                    required
                    value={linkEmail}
                    onChange={e => setLinkEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full bg-[#020617] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#2563EB] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <button type="submit" className="w-full p-2.5 bg-gradient-to-r from-[#2563EB] to-[#0891B2] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all shadow-[0_4px_15px_rgba(37,99,235,0.3)]">
                Send Request
              </button>
              {linkingStatus && <p className="text-xs text-slate-400 text-center">{linkingStatus}</p>}
            </form>
          </div>

          {pendingRequests.length > 0 && (
             <div className="bg-[#0F172A]/80 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
               <h3 className="font-bold text-white text-sm mb-4">Pending Requests</h3>
               <div className="space-y-3">
                 {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-[#020617] rounded-xl border border-white/5">
                       <span className="text-xs font-medium text-slate-400 truncate mr-2">{req.studentEmail}</span>
                       <span className="text-[10px] uppercase font-bold tracking-wider text-[#FBBF24] bg-[#FBBF24]/10 px-2 py-1 rounded-md">Pending</span>
                    </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="md:col-span-2">
          <h3 className="font-bold text-white flex items-center gap-2 mb-4">
            <UserCheck size={18} className="text-[#22D3EE]" />
            Monitored Students
          </h3>
          
          {students.length === 0 ? (
            <div className="bg-[#0F172A]/50 border border-white/10 border-dashed p-12 rounded-[2rem] text-center backdrop-blur-md">
               <Activity size={32} className="text-slate-600 mx-auto mb-4" />
               <h4 className="font-bold text-white mb-2">No Students Linked</h4>
               <p className="text-sm text-slate-400 max-w-sm mx-auto">Link a student using their registered email to begin monitoring their engagement and wellness summaries safely.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {students.map(student => (
                 <div 
                   key={student.id} 
                   onClick={() => onViewProfile && onViewProfile(student)}
                   className="bg-[#0F172A]/80 backdrop-blur-md border border-white/5 p-5 rounded-[2rem] hover:border-[#22D3EE]/40 hover:shadow-[0_4px_20px_rgba(34,211,238,0.15)] transition-all cursor-pointer group"
                 >
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#020617] border border-white/10 flex items-center justify-center text-lg shadow-inner">{student.avatar || '🎓'}</div>
                          <div>
                            <h4 className="font-bold text-white text-sm group-hover:text-[#22D3EE] transition-colors">{student.name}</h4>
                            <span className="text-xs text-slate-400">Grade: {student.grade || 'N/A'}</span>
                          </div>
                       </div>
                       <div className="px-2 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center gap-1.5 shadow-sm">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
                         <span className="text-[10px] font-bold text-[#22D3EE] uppercase tracking-wider">Active</span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[#020617]/50 p-3 rounded-xl border border-white/5">
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Consistency</p>
                           <p className="text-xl font-serif font-bold text-white">{student.streak || 0} <span className="text-xs text-slate-400 font-sans ml-1">Days</span></p>
                        </div>
                        <div className="bg-[#020617]/50 p-3 rounded-xl border border-white/5">
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Risk Level</p>
                           <p className={cn("text-lg font-serif font-bold", student.riskLevel === 'high' ? 'text-[#F87171]' : 'text-white')}>{student.riskLevel === 'high' ? 'Elevated' : 'Stable'}</p>
                        </div>
                    </div>

                    <div className="bg-[#2563EB]/5 p-4 rounded-xl border border-[#2563EB]/10 flex flex-col gap-2">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">Last Assessment</span>
                          <span className="text-slate-300 font-mono">{student.lastAssessmentDate || 'Never'}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">AI Insight</span>
                          <span className={student.riskLevel === 'high' ? "text-[#F87171] font-medium" : "text-[#10B981] font-medium"}>
                             {student.riskLevel === 'high' ? "Review workload" : "Consistent baseline"}
                          </span>
                       </div>
                    </div>
                 </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
