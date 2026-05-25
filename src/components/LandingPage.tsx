import React from 'react';
import { motion } from 'motion/react';
import { User, Users } from 'lucide-react';

export default function LandingPage({ onSelectRole }: { onSelectRole: (role: 'student' | 'caretaker') => void }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-light blur-[120px] rounded-full pointer-events-none opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl text-center"
      >
        <div className="text-2xl font-serif font-bold text-accent mb-2 tracking-widest uppercase">Mind Bridge</div>
        <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-6 text-text-main">
          Welcome to your <span className="italic text-accent">ecosystem</span>.
        </h1>
        <p className="text-lg text-text-muted mb-16 max-w-xl mx-auto">
          Please select your portal to continue.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole('student')}
            className="p-10 bg-surface border border-border rounded-[2rem] hover:border-accent hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] transition-all group flex flex-col items-center text-center backdrop-blur-sm"
          >
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-accent/20">
              <User size={32} className="text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-text-main mb-3">Continue as Student</h2>
            <p className="text-text-muted leading-relaxed">
              Access your personal wellness journey, assessments, and shop.
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole('caretaker')}
            className="p-10 bg-surface border border-border rounded-[2rem] hover:border-accent hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] transition-all group flex flex-col items-center text-center backdrop-blur-sm"
          >
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-accent/20">
              <Users size={32} className="text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-text-main mb-3">Continue as Caretaker</h2>
            <p className="text-text-muted leading-relaxed">
              Parents, teachers, and guardians: Monitor engagement.
            </p>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
