import React, { useState } from 'react';
import { X, Lock, Trash2, AlertTriangle, ShieldCheck, Sun, Moon, Palette } from 'lucide-react';
import { Child } from '../types';
import { db, doc, deleteDoc, updateDoc } from '../lib/firebase';

interface ProfileSettingsModalProps {
  child: Child;
  userRole?: string;
  isDarkMode?: boolean;
  setIsDarkMode?: (isDark: boolean) => void;
  onClose: () => void;
  onDelete: () => void;
}

export default function ProfileSettingsModal({ child, userRole, isDarkMode, setIsDarkMode, onClose, onDelete }: ProfileSettingsModalProps) {
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    try {
      await updateDoc(doc(db, 'students', child.id), { pin: newPin });
      setPinSuccess('PIN updated successfully');
      setNewPin('');
      setPinError('');
      setTimeout(() => setPinSuccess(''), 3000);
    } catch (error) {
      setPinError('Failed to update PIN');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'students', child.id));
      onDelete();
      onClose();
    } catch (error) {
      setPinError('Failed to delete profile');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg bg-bg/80 animate-fade-in">
      <div className="bg-surface border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface-2/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[40px] rounded-full pointer-events-none"></div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-text-main flex items-center gap-2">
              <ShieldCheck className="text-accent" /> Profile Vault
            </h2>
            <p className="text-sm tracking-widest uppercase font-bold text-text-dim mt-1">System Security & Identity</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl text-text-muted hover:text-text-main transition-colors relative z-10">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto max-h-[80vh]">
          
          {/* Metadata Section (Read-Only) */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-text-dim uppercase tracking-widest border-b border-border/50 pb-2">Student Identity</h3>
            <div className="bg-surface-2 rounded-2xl p-4 border border-border shadow-inner space-y-3">
               <div className="flex justify-between items-center">
                 <span className="text-sm text-text-muted font-bold">System ID</span>
                 <span className="text-sm font-mono text-text-main">{child.id}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-text-muted font-bold">Full Name</span>
                 <span className="text-sm text-text-main font-medium">{child.name}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-text-muted font-bold">Grade Level</span>
                 <span className="text-sm text-text-main font-medium">{child.grade || 'N/A'}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-text-muted font-bold">Institution</span>
                 <span className="text-sm text-text-main font-medium">{child.school || 'Unassigned'}</span>
               </div>
            </div>
          </section>

          {/* Appearance Section */}
          {setIsDarkMode && (
            <section className="space-y-4">
               <h3 className="text-sm font-bold border-b border-border/50 pb-2 flex items-center gap-2">
                  <Palette size={16} className="text-accent" />
                  <span className="text-text-dim uppercase tracking-widest">Appearance</span>
               </h3>
               <div className="bg-surface-2 rounded-2xl p-4 border border-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-text-main">Interface Theme</h4>
                    <p className="text-xs text-text-muted">Toggle between dark and light modes</p>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)} 
                    title="Toggle Theme"
                    className="w-12 h-12 flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-3 transition-all text-accent shadow-sm"
                  >
                    {isDarkMode ? <Sun size={24} strokeWidth={2} /> : <Moon size={24} strokeWidth={2} />}
                  </button>
               </div>
            </section>
          )}

          {/* PIN Management */}
          <section className="space-y-4">
             <h3 className="text-sm font-bold border-b border-border/50 pb-2 flex items-center gap-2">
                <Lock size={16} className="text-orange-500" />
                <span className="text-text-dim uppercase tracking-widest">Access Control</span>
             </h3>
             <form onSubmit={handleUpdatePin} className="bg-surface-2 rounded-2xl p-4 border border-border flex flex-col gap-3">
                <p className="text-xs text-text-muted mb-2">Update the 4-digit security PIN required to access this profile's clinical data.</p>
                <div className="flex gap-3">
                  <input 
                    type="password" 
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="New 4-digit PIN"
                    className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-accent outline-none text-text-main tracking-[0.5em] font-mono text-center"
                  />
                  <button type="submit" disabled={newPin.length !== 4} className="bg-accent hover:bg-accent-hover text-bg px-4 py-2 rounded-xl font-bold shadow-sm disabled:opacity-50 transition-all">Update</button>
                </div>
                {pinError && <p className="text-amber-500 text-xs font-bold text-center">{pinError}</p>}
                {pinSuccess && <p className="text-emerald-500 text-xs font-bold text-center">{pinSuccess}</p>}
             </form>
          </section>

          {/* Danger Zone */}
          {['parent', 'school_admin'].includes(userRole || '') && (
            <section className="space-y-4 pt-4">
               <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5">
                 <h3 className="text-orange-500 font-bold uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                   <AlertTriangle size={16} /> Danger Zone
                 </h3>
                 <p className="text-xs text-text-muted mb-4 leading-relaxed">
                   Permanently purge this student's data from the system. This will cascade-delete all clinical assessments, analytics, and schedules. <strong>This action is irreversible.</strong>
                 </p>
                 <div className="flex flex-col gap-3">
                   <input 
                     type="text" 
                     placeholder="Type 'DELETE' to confirm" 
                     value={deleteConfirm}
                     onChange={(e) => setDeleteConfirm(e.target.value)}
                     className="bg-surface border border-orange-500/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none text-text-main font-mono text-center uppercase"
                   />
                   <button 
                     onClick={handleDelete}
                     disabled={deleteConfirm !== 'DELETE' || isDeleting}
                     className="w-full bg-orange-600 hover:bg-orange-700 text-bg font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
                   >
                     {isDeleting ? 'Purging...' : <><Trash2 size={18} /> Permanently Delete Student</>}
                   </button>
                 </div>
               </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
