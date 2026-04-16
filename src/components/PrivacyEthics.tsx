import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  UserCheck, 
  Brain, 
  Scale, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Info,
  ChevronRight,
  Database,
  Users,
  LineChart,
  Target,
  Zap,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PrivacyEthicsProps {
  user: any;
}

export default function PrivacyEthics({ user }: PrivacyEthicsProps) {
  const [activeSection, setActiveSection] = useState<'protection' | 'consent' | 'rbac' | 'ai' | 'forecasting' | 'recommendations'>('protection');

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="page-header">
        <h1 className="text-4xl font-serif tracking-tight flex items-center gap-3">
          <Shield className="text-accent" size={36} />
          Privacy & Ethical Framework
        </h1>
        <p className="text-text-muted mt-1">Our commitment to protecting your child's data and maintaining ethical AI standards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <NavButton 
            active={activeSection === 'protection'} 
            onClick={() => setActiveSection('protection')}
            icon={<Lock size={18} />}
            label="Data Protection"
            description="Encryption & Anonymization"
          />
          <NavButton 
            active={activeSection === 'consent'} 
            onClick={() => setActiveSection('consent')}
            icon={<UserCheck size={18} />}
            label="Consent System"
            description="Parental & School Rights"
          />
          <NavButton 
            active={activeSection === 'rbac'} 
            onClick={() => setActiveSection('rbac')}
            icon={<Users size={18} />}
            label="Role-Based Access"
            description="Data Visibility Matrix"
          />
          <NavButton 
            active={activeSection === 'ai'} 
            onClick={() => setActiveSection('ai')}
            icon={<Brain size={18} />}
            label="AI Ethics"
            description="Limitations & Disclaimers"
          />
          <NavButton 
            active={activeSection === 'forecasting'} 
            onClick={() => setActiveSection('forecasting')}
            icon={<LineChart size={18} />}
            label="Risk Forecasting"
            description="Logic & Prediction Rules"
          />
          <NavButton 
            active={activeSection === 'recommendations'} 
            onClick={() => setActiveSection('recommendations')}
            icon={<Lightbulb size={18} />}
            label="Recommendations"
            description="Personalized Engine Logic"
          />
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
          {activeSection === 'protection' && <ProtectionSection />}
          {activeSection === 'consent' && <ConsentSection user={user} />}
          {activeSection === 'rbac' && <RBACSection />}
          {activeSection === 'ai' && <AISection />}
          {activeSection === 'forecasting' && <ForecastingSection />}
          {activeSection === 'recommendations' && <RecommendationsSection />}
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, description }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; description: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left p-6 rounded-3xl border transition-all flex items-center gap-4 group",
        active 
          ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" 
          : "bg-surface border-border hover:border-accent/50 text-text-main"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
        active ? "bg-white/20" : "bg-accent-light text-accent"
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-bold">{label}</p>
        <p className={cn("text-xs", active ? "text-white/80" : "text-text-dim")}>{description}</p>
      </div>
      <ChevronRight className={cn("transition-transform", active ? "translate-x-1" : "text-text-dim")} size={18} />
    </button>
  );
}

function ProtectionSection() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
          <Lock size={24} />
        </div>
        <h2 className="text-2xl font-serif">Data Protection Strategies</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard 
          icon={<Shield size={20} />}
          title="End-to-End Encryption"
          description="All sensitive mental health data is encrypted at rest using AES-256 and in transit via TLS 1.3."
        />
        <FeatureCard 
          icon={<Eye size={20} />}
          title="Dynamic Anonymization"
          description="Institutional reports use unique identifiers instead of names to prevent individual student identification."
        />
        <FeatureCard 
          icon={<Database size={20} />}
          title="Data Residency"
          description="Data is stored in secure, regional cloud environments with strict compliance certifications (HIPAA, GDPR)."
        />
        <FeatureCard 
          icon={<AlertCircle size={20} />}
          title="Zero-Knowledge Insights"
          description="AI analysis is performed on temporary buffers; raw behavioral logs are never used for model training."
        />
      </div>

      <div className="p-6 bg-surface-2 rounded-3xl border border-border mt-8">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Info size={18} className="text-accent" />
          Security Audit Log
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          MindBridge maintains a comprehensive, immutable audit log of all data access. Every time a counselor or parent views a report, the event is logged with a timestamp and user ID to ensure total accountability.
        </p>
      </div>
    </div>
  );
}

function ConsentSection({ user }: { user: any }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
          <UserCheck size={24} />
        </div>
        <h2 className="text-2xl font-serif">Consent & Data Rights</h2>
      </div>

      <div className="space-y-6">
        <ConsentItem 
          title="Parental Sovereignty"
          description="Parents maintain 100% ownership of their child's data. You can export or delete all records at any time."
          status="Active"
        />
        <ConsentItem 
          title="School Data Sharing"
          description="Schools only receive access to data if explicitly authorized by the parent via a signed digital waiver."
          status={user?.role === 'teacher' ? 'Institutional' : 'Parent-Controlled'}
        />
        <ConsentItem 
          title="Right to be Forgotten"
          description="Upon account deletion, all behavioral data and AI insights are purged from our systems within 24 hours."
          status="Guaranteed"
        />
      </div>

      <div className="p-6 bg-accent-light/10 rounded-3xl border border-accent/20">
        <h3 className="font-bold text-accent mb-2">Transparency Note</h3>
        <p className="text-sm text-text-muted">
          We do not sell data to third parties. Our business model is based on institutional subscriptions, not data monetization.
        </p>
      </div>
    </div>
  );
}

function RBACSection() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
          <Users size={24} />
        </div>
        <h2 className="text-2xl font-serif">Role-Based Access Control (RBAC)</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-4 text-xs font-bold text-text-dim uppercase tracking-widest">Data Type</th>
              <th className="py-4 text-xs font-bold text-text-dim uppercase tracking-widest">Parent</th>
              <th className="py-4 text-xs font-bold text-text-dim uppercase tracking-widest">Teacher</th>
              <th className="py-4 text-xs font-bold text-text-dim uppercase tracking-widest">Counselor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <RBACRow label="Raw Assessment Scores" parent="Full" teacher="None" counselor="Full" />
            <RBACRow label="AI Behavioral Insights" parent="Full" teacher="Aggregated" counselor="Full" />
            <RBACRow label="School Schedule" parent="Full" teacher="Full" counselor="Full" />
            <RBACRow label="Clinical Alerts" parent="Full" teacher="None" counselor="Full" />
            <RBACRow label="Gamification Stats" parent="Full" teacher="None" counselor="None" />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AISection() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
          <Brain size={24} />
        </div>
        <h2 className="text-2xl font-serif">Ethical AI Framework</h2>
      </div>

      <div className="prose prose-sm max-w-none text-text-muted space-y-6">
        <div className="p-6 bg-surface-2 rounded-3xl border border-border">
          <h3 className="text-lg font-serif text-text-main mb-4 flex items-center gap-2">
            <Scale size={20} className="text-amber-600" />
            Non-Clinical Disclaimer
          </h3>
          <p>
            MindBridge AI (powered by Gemini) is a <strong>decision-support tool</strong>, not a diagnostic service. It identifies patterns and anomalies to assist human caregivers but does not provide clinical diagnoses or medical advice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-bold text-text-main flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              What AI Does
            </h4>
            <ul className="text-xs space-y-2 list-disc pl-4">
              <li>Identifies behavioral shifts from baseline</li>
              <li>Correlates school stress with mood</li>
              <li>Provides empathetic parent summaries</li>
              <li>Flags potential risks for human review</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-text-main flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600" />
              What AI Does NOT Do
            </h4>
            <ul className="text-xs space-y-2 list-disc pl-4">
              <li>Replace professional therapy</li>
              <li>Prescribe medication or treatments</li>
              <li>Make autonomous clinical decisions</li>
              <li>Predict future behavior with 100% certainty</li>
            </ul>
          </div>
        </div>

        <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
          <h4 className="font-bold text-amber-800 mb-2">Bias Mitigation</h4>
          <p className="text-xs">
            We continuously audit our AI prompts to prevent socio-economic, racial, or gender bias in behavioral analysis. Our models are tuned to prioritize child safety while maintaining cultural sensitivity.
          </p>
        </div>
      </div>
    </div>
  );
}

function ForecastingSection() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
          <LineChart size={24} />
        </div>
        <h2 className="text-2xl font-serif">Risk Forecasting Logic</h2>
      </div>

      <div className="space-y-6">
        <div className="p-6 bg-surface-2 rounded-3xl border border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Target size={18} className="text-purple-600" />
            Core Prediction Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RuleCard 
              title="Academic Clustering"
              rule="2+ high-difficulty events (exams/deadlines) within 48 hours."
              impact="Increases risk level by 1 stage."
            />
            <RuleCard 
              title="Sleep Debt Accumulation"
              rule="Sleep scores of 4+ for 3 consecutive days."
              impact="Predicts high risk for irritability."
            />
            <RuleCard 
              title="Mood Volatility"
              rule="Mood fluctuations > 2 points within a 72-hour window."
              impact="Predicts emotional dysregulation risk."
            />
            <RuleCard 
              title="Positive Buffering"
              rule="High social engagement + good sleep quality."
              impact="Maintains low risk despite academic load."
            />
          </div>
        </div>

        <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100">
          <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Info size={18} />
            Example Predictions
          </h3>
          <div className="space-y-4">
            <ExampleBox 
              scenario="Math Exam on Monday + History Project on Tuesday"
              prediction="Medium Risk"
              logic="Triggered 'Academic Clustering' rule. Predicted stress increase."
            />
            <ExampleBox 
              scenario="3 nights of poor sleep + High mood scores"
              prediction="Medium Risk"
              logic="Triggered 'Sleep Debt' rule. High mood may be masking fatigue."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationsSection() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
          <Lightbulb size={24} />
        </div>
        <h2 className="text-2xl font-serif">Personalized Recommendation Engine</h2>
      </div>

      <div className="space-y-6">
        <div className="p-6 bg-surface-2 rounded-3xl border border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" />
            Adaptive Logic Principles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RuleCard 
              title="Context-Awareness"
              rule="Analyzes school schedule to suggest relaxation before exams."
              impact="Reduces acute academic anxiety."
            />
            <RuleCard 
              title="Data-Driven Sleep"
              rule="Triggers 'Wind-down' suggestions when sleep quality dips."
              impact="Improves physical and emotional resilience."
            />
            <RuleCard 
              title="Positive Reinforcement"
              rule="Suggests celebratory activities when mood trends upward."
              impact="Reinforces healthy behavioral patterns."
            />
            <RuleCard 
              title="Age-Appropriate"
              rule="Filters activities based on child's developmental stage."
              impact="Ensures high engagement and safety."
            />
          </div>
        </div>

        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Info size={18} />
            Recommendation Examples
          </h3>
          <div className="space-y-4">
            <ExampleBox 
              scenario="Exam tomorrow + High stress score"
              prediction="Strategy: 10-Minute Box Breathing"
              logic="Prioritizes immediate stress reduction before high-stakes events."
            />
            <ExampleBox 
              scenario="3 days of improving mood + High social engagement"
              prediction="Activity: Family Board Game Night"
              logic="Reinforces positive social trends and rewards emotional progress."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleCard({ title, rule, impact }: { title: string; rule: string; impact: string }) {
  return (
    <div className="p-4 bg-white rounded-2xl border border-border">
      <h4 className="text-xs font-bold text-purple-600 uppercase mb-2">{title}</h4>
      <p className="text-xs text-text-main font-medium mb-1">{rule}</p>
      <p className="text-[10px] text-text-dim italic">{impact}</p>
    </div>
  );
}

function ExampleBox({ scenario, prediction, logic }: { scenario: string; prediction: string; logic: string }) {
  return (
    <div className="p-4 bg-white/50 rounded-2xl border border-purple-200">
      <p className="text-[10px] font-bold text-purple-800 uppercase mb-1">Scenario</p>
      <p className="text-xs font-medium mb-2">{scenario}</p>
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] font-bold text-text-dim uppercase">Prediction</p>
          <p className="text-xs font-bold text-purple-700">{prediction}</p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-text-dim uppercase">Logic Evidence</p>
          <p className="text-xs text-text-muted">{logic}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-surface-2 rounded-3xl border border-border hover:border-accent/30 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-accent mb-4 shadow-sm">
        {icon}
      </div>
      <h4 className="font-bold text-sm mb-2">{title}</h4>
      <p className="text-xs text-text-dim leading-relaxed">{description}</p>
    </div>
  );
}

function ConsentItem({ title, description, status }: { title: string; description: string; status: string }) {
  return (
    <div className="flex items-start gap-4 p-6 bg-surface-2 rounded-3xl border border-border">
      <div className="mt-1">
        <CheckCircle2 className="text-accent" size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold text-sm">{title}</h4>
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent-light px-2 py-0.5 rounded-full">
            {status}
          </span>
        </div>
        <p className="text-xs text-text-dim leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function RBACRow({ label, parent, teacher, counselor }: { label: string; parent: string; teacher: string; counselor: string }) {
  return (
    <tr className="hover:bg-surface-2 transition-colors">
      <td className="py-4 text-sm font-medium text-text-main">{label}</td>
      <td className="py-4 text-xs">
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-bold">{parent}</span>
      </td>
      <td className="py-4 text-xs">
        <span className={cn(
          "px-2 py-1 rounded-md font-bold",
          teacher === 'None' ? "bg-red-50 text-red-600" : "bg-amber-100 text-amber-700"
        )}>{teacher}</span>
      </td>
      <td className="py-4 text-xs">
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-bold">{counselor}</span>
      </td>
    </tr>
  );
}
