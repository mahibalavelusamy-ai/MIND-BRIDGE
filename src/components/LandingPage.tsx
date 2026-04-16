import React from 'react';
import { motion } from 'motion/react';
import { Heart, BrainCircuit, ShieldCheck, Gamepad2, Bell, BarChart3, TrendingUp } from 'lucide-react';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-light text-accent rounded-full text-sm font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              AI-Powered Mental Health Care
            </div>
            <h1 className="text-5xl md:text-6xl font-serif leading-tight mb-6">
              Early support for <em className="italic text-accent">every child's</em> mental well-being
            </h1>
            <p className="text-lg text-text-muted leading-relaxed mb-8 max-w-lg">
              MindBridge helps parents, teachers, and clinicians detect emotional patterns early — with gentle assessments, real-time tracking, and AI-guided insights.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={onStart} className="px-8 py-3 bg-accent text-white rounded-full font-medium hover:bg-accent-hover transition-all shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5">
                Get Started →
              </button>
              <button onClick={onStart} className="px-8 py-3 bg-surface border border-border rounded-full font-medium hover:bg-surface-2 transition-all">
                Login
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-surface border border-border rounded-3xl p-8 shadow-xl"
          >
            <div className="text-xs font-bold text-text-dim uppercase tracking-widest mb-6">Live Overview</div>
            <div className="space-y-4">
              <StatItem icon="😊" label="Average Mood Score" value="7.4 / 10" color="bg-accent-light" trend="+5%" />
              <StatItem icon="⚡" label="Stress Level" value="Moderate" color="bg-amber-100" trend="Watch" />
              <StatItem icon="📊" label="Assessments This Week" value="12" color="bg-blue-100" trend="Active" />
              <StatItem icon="🔔" label="Active Alerts" value="2" color="bg-red-100" trend="Urgent" />
            </div>
            <div className="mt-8">
              <p className="text-xs text-text-dim mb-4">Weekly mood trend</p>
              <div className="flex items-end gap-1.5 h-16">
                {[55, 70, 85, 60, 90, 45, 75].map((h, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 rounded-t-sm transition-all duration-500",
                      i === 5 ? "bg-amber-400" : "bg-accent-light"
                    )}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-text-dim mt-2">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif mb-4">Everything you need to <em className="italic text-accent">support</em> a child</h2>
            <p className="text-text-muted">Built for parents, educators, and healthcare professionals — all in one platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon={<BrainCircuit className="text-accent" />} title="AI-Powered Insights" description="Machine learning algorithms analyze behavioral patterns and flag early warning signs." />
            <FeatureCard icon={<BarChart3 className="text-accent" />} title="Real-Time Monitoring" description="Track mood, energy, and social engagement with continuous assessments." />
            <FeatureCard icon={<Bell className="text-accent" />} title="Instant Alerts" description="Receive immediate notifications when critical mental health indicators are detected." />
            <FeatureCard icon={<Gamepad2 className="text-accent" />} title="Gamified Assessments" description="Child-friendly, interactive questionnaires that feel like a game." />
            <FeatureCard icon={<ShieldCheck className="text-accent" />} title="Privacy First" description="GDPR and COPPA compliant. All data is encrypted and secure." />
            <FeatureCard icon={<TrendingUp className="text-accent" />} title="Progress Reports" description="Detailed weekly and monthly reports with visual charts." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-surface px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-serif font-bold text-accent mb-4">MindBridge</div>
          <p className="text-sm text-text-muted mb-8">Child Mental Health Monitoring & Tracking System</p>
          <div className="flex justify-center gap-8 text-sm text-text-muted mb-8">
            <a href="#" className="hover:text-accent transition-colors">About</a>
            <a href="#" className="hover:text-accent transition-colors">Features</a>
            <a href="#" className="hover:text-accent transition-colors">Privacy</a>
            <a href="#" className="hover:text-accent transition-colors">Contact</a>
          </div>
          <p className="text-xs text-text-dim">© 2025 MindBridge. For educational use only. Not a clinical diagnostic tool.</p>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ icon, label, value, color, trend }: { icon: string; label: string; value: string; color: string; trend: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl", color)}>{icon}</div>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-text-dim uppercase">{label}</p>
        <p className="text-lg font-serif font-bold">{value}</p>
      </div>
      <span className="text-[10px] font-bold px-2 py-1 bg-white rounded-full shadow-sm">{trend}</span>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 bg-bg border border-border rounded-2xl hover:border-accent hover:-translate-y-1 transition-all group">
      <div className="w-12 h-12 bg-accent-light rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
