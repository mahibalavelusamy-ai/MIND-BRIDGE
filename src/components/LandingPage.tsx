import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Users, Activity, Brain, Timer, ShieldAlert, Shield, 
  Sparkles, LineChart, Target, ArrowDown, Network, 
  MessageSquareHeart, CheckCircle2, ChevronRight, BarChart
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function LandingPage({ onSelectRole }: { onSelectRole: (role: 'student' | 'caretaker' | 'admin') => void }) {
  const [activeInsight, setActiveInsight] = useState(0);
  
  const insights = [
    "Students with consistent sleep schedules often show stronger focus levels.",
    "Regular wellness check-ins help identify trends earlier.",
    "Small positive habits create long-term wellbeing improvements.",
    "Healthy routines contribute to academic success."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveInsight((prev) => (prev + 1) % insights.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans overflow-x-hidden selection:bg-[#2563EB]/30 selection:text-[#22D3EE]">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center p-6 pt-20 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-[#0F172A] rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] bg-[#2563EB]/10 rounded-full blur-[150px] mix-blend-screen" />
          <div className="absolute bottom-[0%] left-[20%] w-[50vw] h-[50vw] bg-[#22D3EE]/10 rounded-full blur-[100px] mix-blend-screen" />
          
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_20%,transparent_100%)]" />
        </div>

        {/* Floating Icons */}
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[20%] left-[15%] hidden lg:flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0F172A] border border-[#2563EB]/20 backdrop-blur-md">
          <Brain className="text-[#2563EB]" size={32} />
        </motion.div>
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute bottom-[30%] right-[15%] hidden lg:flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0F172A] border border-[#22D3EE]/20 backdrop-blur-md">
          <Activity className="text-[#22D3EE]" size={32} />
        </motion.div>
        <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="absolute top-[35%] right-[20%] hidden lg:flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F172A] border border-[#FBBF24]/20 backdrop-blur-md">
          <Network className="text-[#FBBF24]" size={24} />
        </motion.div>

        <div className="relative z-10 flex flex-col items-center max-w-5xl text-center mx-auto mt-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#22D3EE] text-sm font-semibold tracking-wide uppercase mb-10 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
          >
            <Sparkles size={16} /> Intelligent Wellness Ecosystem
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight text-white mb-6 leading-[1.1] font-serif"
          >
            Mind Bridge
          </motion.h1>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#22D3EE] via-[#2563EB] to-white mb-8 leading-[1.2]"
          >
            Building Stronger Minds <br className="hidden md:block"/> Through Intelligent Wellbeing
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-3xl mb-12 leading-relaxed"
          >
            An AI-powered student wellbeing ecosystem that assesses, tracks, predicts, and improves mental wellness through adaptive assessments, personalized guidance, wellness analytics, and early intervention support.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <button
               onClick={() => onSelectRole('student')}
               className="group relative px-8 py-4 bg-white text-[#020617] font-bold text-lg rounded-2xl hover:bg-slate-100 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center gap-3 overflow-hidden"
            >
               <span className="relative z-10 flex items-center gap-3">
                 <User size={20} className="text-[#2563EB]" />
                 Login as Student
               </span>
            </button>
            <button
               onClick={() => onSelectRole('caretaker')}
               className="px-8 py-4 bg-[#0F172A] text-white border border-slate-700 hover:border-[#2563EB] hover:bg-[#0F172A]/80 font-bold text-lg rounded-2xl transition-all shadow-lg flex items-center gap-3"
            >
               <Users size={20} className="text-slate-400" />
               Login as Caretaker
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. AI INSIGHT BANNER */}
      <section className="border-y border-slate-800/50 bg-[#0F172A]/80 backdrop-blur-xl overflow-hidden py-4">
         <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">
             <div className="flex items-center gap-2 text-[#22D3EE] uppercase tracking-widest text-xs font-bold shrink-0">
               <Sparkles size={16} /> AI Observation
             </div>
             <div className="h-6 w-px bg-slate-800 shrink-0 mx-2" />
             <div className="relative h-6 flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                     key={activeInsight}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     transition={{ duration: 0.4 }}
                     className="absolute inset-0 text-sm font-medium text-slate-300"
                  >
                     {insights[activeInsight]}
                  </motion.p>
                </AnimatePresence>
             </div>
         </div>
      </section>

      {/* 3. STUDENT JOURNEY ANIMATION */}
      <section className="py-32 px-6 relative max-w-7xl mx-auto">
         <div className="text-center mb-24">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">The Student Journey</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Understand → Track → Improve → Thrive</p>
         </div>

         <div className="relative max-w-3xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute left-[28px] md:left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-[#2563EB]/20 via-[#22D3EE]/20 to-[#FBBF24]/20 md:-translate-x-1/2 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ top: '-10%' }}
                 whileInView={{ top: '100%' }}
                 transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
                 className="absolute left-0 w-full h-[20%] bg-gradient-to-b from-transparent via-[#2563EB] to-transparent"
                 viewport={{ once: false }}
               />
            </div>

            {[
               { title: 'Daily Check-In', desc: 'Brief, intelligent assessments that adapt to your mood.', icon: <MessageSquareHeart />, color: 'text-[#22D3EE]', bg: 'bg-[#22D3EE]/10', border: 'border-[#22D3EE]/20' },
               { title: 'AI Understanding', desc: 'Our neural engine safely analyzes behavioral patterns.', icon: <Brain />, color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10', border: 'border-[#2563EB]/20' },
               { title: 'Wellness Analysis', desc: 'Transformations into clear, meaningful charts and scores.', icon: <BarChart />, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
               { title: 'Personalized Guidance', desc: 'Actionable, step-by-step plans tailored to your needs.', icon: <Target />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
               { title: 'Growth & Improvement', desc: 'Celebrate milestones, build streaks, and unlock rewards.', icon: <Sparkles />, color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/10', border: 'border-[#FBBF24]/20' }
            ].map((step, i) => (
               <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className={cn("flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 relative mb-16 last:mb-0", 
                    i % 2 === 0 ? "md:flex-row-reverse text-left md:text-right" : "text-left"
                  )}
               >
                  <div className="flex-1 w-full pt-2 md:pt-0">
                     <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{step.title}</h3>
                     <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className={cn("w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border z-10 backdrop-blur-md relative", step.bg, step.border, step.color)}>
                     {step.icon}
                     <div className="absolute inset-0 bg-current opacity-20 blur-xl rounded-full" />
                  </div>
                  <div className="flex-1 hidden md:block" />
               </motion.div>
            ))}
         </div>
      </section>

      {/* 4. AI CAPABILITIES SHOWCASE */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative border-y border-slate-800/50">
         <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">AI Capabilities Showcase</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Intelligent support engineered for the modern student.</p>
         </div>

         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
               { title: 'Adaptive Assessment Engine', desc: 'Questions adapt based on student wellness patterns to extract maximal context safely.', icon: <Activity /> },
               { title: 'Wellness Analytics', desc: 'Cross-reference sleep, mood, constraints, and stress into understandable timelines.', icon: <BarChart /> },
               { title: 'Focus Development', desc: 'Build healthy productivity habits through customizable, AI-guided focus sessions.', icon: <Timer /> },
               { title: 'Early Intervention', desc: 'Identify concerning trends and automatically flag risks before they become major challenges.', icon: <ShieldAlert /> },
               { title: 'Personalized Recommendations', desc: 'Receive structured, step-by-step action plans tailored perfectly to recent behavioral changes.', icon: <Sparkles /> },
               { title: 'Predictive Wellness Intelligence', desc: 'Forecast potential academic or emotional friction and support proactive wellness.', icon: <Network /> }
            ].map((feature, i) => (
               <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
               >
                  <div className="w-12 h-12 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl flex items-center justify-center text-[#22D3EE] mb-6">
                     {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
               </motion.div>
            ))}
         </div>
      </section>

      <div 
        onClick={() => onSelectRole('admin')}
        className="fixed bottom-4 right-4 w-12 h-12 flex items-center justify-center text-transparent hover:text-white/20 transition-all cursor-pointer z-50 rounded-full"
      >
        <Shield size={24} />
      </div>

    </div>
  );
}

