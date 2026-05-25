import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Link as LinkIcon, UserCheck, Clock, Activity, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db, auth, collection, query, where, getDocs, addDoc, onSnapshot, doc, updateDoc, setDoc } from '../lib/firebase';
import { Child, Alert } from '../types';

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
    const pendingQuery = query(collection(db, 'relationships'), where('caretakerId', '==', auth.currentUser.uid), where('status', '==', 'pending'));
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
        setLinkingStatus('Request already sent to this student.');
        return;
      }

      // Create relationship request
      await setDoc(doc(db, 'relationships', `${auth.currentUser?.uid}_${studentUser.id}`), {
        caretakerId: auth.currentUser?.uid,
        studentId: studentUser.id,
        studentEmail: linkEmail,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      // Send alert to student
      await addDoc(collection(db, 'alerts'), {
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
          <h1 className="text-3xl font-serif text-text-main">Caretaker Portal</h1>
          <p className="text-text-muted mt-1">Professional wellness & engagement monitoring.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-surface border border-border p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-text-main flex items-center gap-2 mb-4">
              <LinkIcon size={18} className="text-accent" />
              Link a Student
            </h3>
            <form onSubmit={handleLinkStudent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-dim uppercase tracking-wider mb-2 block">Student Email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-text-muted" size={16} />
                  <input
                    type="email"
                    required
                    value={linkEmail}
                    onChange={e => setLinkEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <button type="submit" className="w-full p-2.5 bg-accent text-bg font-bold rounded-xl text-sm hover:bg-accent-hover transition-colors">
                Send Request
              </button>
              {linkingStatus && <p className="text-xs text-text-dim text-center">{linkingStatus}</p>}
            </form>
          </div>

          {pendingRequests.length > 0 && (
             <div className="bg-surface border border-border p-6 rounded-2xl shadow-sm">
               <h3 className="font-bold text-text-main text-sm mb-4">Pending Requests</h3>
               <div className="space-y-3">
                 {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border/50">
                       <span className="text-xs font-medium text-text-muted truncate mr-2">{req.studentEmail}</span>
                       <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">Pending</span>
                    </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="md:col-span-2">
          <h3 className="font-bold text-text-main flex items-center gap-2 mb-4">
            <UserCheck size={18} className="text-accent" />
            Monitored Students
          </h3>
          
          {students.length === 0 ? (
            <div className="bg-surface border border-border border-dashed p-12 rounded-2xl text-center">
               <Activity size={32} className="text-text-dim mx-auto mb-4" />
               <h4 className="font-bold text-text-main mb-2">No Students Linked</h4>
               <p className="text-sm text-text-muted max-w-sm mx-auto">Link a student using their registered email to begin monitoring their engagement and wellness summaries safely.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {students.map(student => (
                 <div 
                   key={student.id} 
                   onClick={() => onViewProfile && onViewProfile(student)}
                   className="bg-surface border border-border p-5 rounded-2xl hover:border-accent hover:shadow-[0_0_15px_rgba(56,189,248,0.1)] transition-all cursor-pointer"
                 >
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-lg">{student.avatar || '🎓'}</div>
                          <div>
                            <h4 className="font-bold text-text-main text-sm">{student.name}</h4>
                            <span className="text-xs text-text-muted">Grade: {student.grade || 'N/A'}</span>
                          </div>
                       </div>
                       <div className="px-2 py-1 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
                         <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Active</span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-surface-2 p-3 rounded-xl border border-border/50">
                           <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Consistency</p>
                           <p className="text-xl font-mono font-bold text-text-main">{student.streak || 0} <span className="text-xs text-text-muted font-sans ml-1 text-normal">Days</span></p>
                        </div>
                        <div className="bg-surface-2 p-3 rounded-xl border border-border/50">
                           <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Risk Level</p>
                           <p className="text-lg font-bold text-text-main">{student.riskLevel === 'high' ? 'Elevated' : 'Stable'}</p>
                        </div>
                    </div>

                    <div className="bg-surface-2/30 p-4 rounded-xl border border-border/50 flex flex-col gap-2">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-text-muted font-medium">Last Assessment</span>
                          <span className="text-text-main font-mono">{student.lastAssessmentDate || 'Never'}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-text-muted font-medium">AI Insight</span>
                          <span className={student.riskLevel === 'high' ? "text-alert-500 font-medium" : "text-emerald-500 font-medium"}>
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
