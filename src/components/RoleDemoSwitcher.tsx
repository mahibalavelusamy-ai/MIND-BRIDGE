import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Check, ChevronDown, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { UserRole } from '../services/demo/seedDataService';

const ROLES: Array<{ role: UserRole; label: string; avatar: string; description: string }> = [
  { role: 'student', label: 'Student', avatar: '👦', description: 'Aarav Sharma • Grade 10 • Daily Check-ins & Rewards' },
  { role: 'parent', label: 'Parent', avatar: '👩‍⚕️', description: 'Dr. Priya Sharma • Family Dashboard & Summary' },
  { role: 'teacher', label: 'Teacher', avatar: '👨‍🏫', description: 'Prof. Vikram Patel • Classroom Trends & Timetable' },
  { role: 'counselor', label: 'Counselor', avatar: '🩺', description: 'Dr. Neha Sen • Clinical Triage & Crisis Queue' },
  { role: 'school_admin', label: 'School Admin', avatar: '🏛️', description: 'Principal Sunita Rao • School-wide Analytics' }
];

export default function RoleDemoSwitcher() {
  const { isDemoMode, activeDemoRole, switchDemoRole, user } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentRole = activeDemoRole || user?.role || 'parent';
  const activeConfig = ROLES.find(r => r.role === currentRole) || ROLES[1];

  const handleSelectRole = (role: UserRole) => {
    switchDemoRole(role);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-accent/40 text-xs text-text-main font-medium transition-all shadow-sm"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Switch simulation role"
      >
        <span className="text-sm">{activeConfig.avatar}</span>
        <span className="font-semibold text-accent">{activeConfig.label}</span>
        {isDemoMode && (
          <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent font-mono text-[9px] uppercase tracking-wider">
            Demo
          </span>
        )}
        <ChevronDown size={14} className="text-text-muted" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-border"
            >
              <div className="p-3 bg-surface-2 text-xs text-text-muted flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent" />
                  Role Simulation Mode
                </span>
                <span className="text-[10px] text-text-dim">5 Personas</span>
              </div>

              <div className="p-1.5 space-y-1">
                {ROLES.map(({ role, label, avatar, description }) => {
                  const isSelected = currentRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => handleSelectRole(role)}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-accent/15 border border-accent/40 text-text-main'
                          : 'hover:bg-surface-2 text-text-muted hover:text-text-main'
                      }`}
                    >
                      <span className="text-lg mt-0.5">{avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold capitalize ${isSelected ? 'text-accent' : 'text-text-main'}`}>
                            {label}
                          </span>
                          {isSelected && <Check size={14} className="text-accent" />}
                        </div>
                        <p className="text-[10px] text-text-dim truncate mt-0.5">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
