import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Area,
  ReferenceArea
} from 'recharts';

const RefArea = ReferenceArea as any;
import { 
  Download, 
  Brain,
  Zap,
  Moon,
  Users,
  Smile,
  Calendar,
  TrendingUp,
  ChevronRight,
  Info,
  Filter
} from 'lucide-react';
import { Child, BehavioralPattern, Anomaly } from '../types';
import { cn } from '../lib/utils';
import { db, auth, collection, query, where, getDocs, orderBy, addDoc, handleFirestoreError, OperationType, limit } from '../lib/firebase';
import { detectBehavioralPatterns } from '../lib/patternService';
import { 
  Activity, 
  AlertTriangle, 
  Fingerprint, 
  Lock,
  BrainCircuit,
  Target,
  History,
  TrendingDown
} from 'lucide-react';
import { getGradientForChild } from '../lib/utils';
import { PredictiveRisk, RootCauseAnalysis } from '../types';
import { predictFutureRisk } from '../lib/predictiveService';

// ... 

interface ReportsProps {
  children: Child[];
  selectedChild: Child | null;
}

const COLORS = ['#2d7a5a', '#c47a1e', '#c0392b'];

export default function Reports({ children, selectedChild }: ReportsProps) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<BehavioralPattern[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [prediction, setPrediction] = useState<PredictiveRisk | null>(null);
  const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trends' | 'patterns' | 'history'>('trends');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (!selectedChild) {
      setAssessments([]);
      setSchedule([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Calculate start date
        let startDate: Date | null = null;
        if (timeframe === '7d') {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === '30d') {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        }

        // Fetch Assessments
        let qA;
        if (startDate) {
          qA = query(
            collection(db, 'assessments'), 
            where('childId', '==', selectedChild.id),
            where('timestamp', '>=', startDate.toISOString()),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
        } else {
          qA = query(
            collection(db, 'assessments'), 
            where('childId', '==', selectedChild.id),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
        }
        
        const snapA = await getDocs(qA);
        const assessmentData = snapA.docs.map(d => ({ id: d.id, ...(d.data() as object) }));
        setAssessments(assessmentData);

        // Fetch Patterns & Anomalies
        const { patterns: p, anomalies: a } = await detectBehavioralPatterns(selectedChild, assessmentData);
        setPatterns(p);
        setAnomalies(a);

        // Fetch Schedule
        const qS = query(collection(db, 'schoolSchedules'), where('childId', '==', selectedChild.id));
        const snapS = await getDocs(qS);
        setSchedule(snapS.docs.map(d => d.data()));

        // Fetch Root Cause Analysis
        const qRC = query(
          collection(db, 'rootCauseAnalyses'),
          where('childId', '==', selectedChild.id),
          where('parentId', '==', auth.currentUser?.uid),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snapRC = await getDocs(qRC);
        if (!snapRC.empty) {
          setRootCause(snapRC.docs[0].data() as RootCauseAnalysis);
        }

        // Generate/Fetch Prediction
        const pred = await predictFutureRisk(
          selectedChild.id, 
          assessmentData.slice(0, 7), 
          snapS.docs.map(d => d.data())
        );
        setPrediction(pred);

      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedChild?.id, timeframe]);

  const handleSetReminder = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // You could potentially schedule a real browser notification here if you had a service worker
        }
      }

      await addDoc(collection(db, 'alerts'), {
        type: 'info',
        title: 'Check-in Reminder',
        description: `Recommended morning check-in for ${selectedChild?.name || 'child'} to track sleep patterns.`,
        childId: selectedChild?.id || 'unknown_child',
        parentId: auth.currentUser?.uid || '',
        timestamp: new Date().toISOString(),
        status: 'active'
      });
      alert('Reminder set successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'alerts');
    }
  };

  if (!selectedChild) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        <div className="page-header">
          <h1 className="text-4xl font-serif tracking-tight">Health Reports</h1>
          <p className="text-text-muted mt-1">Select a child to see detailed analysis and trends.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map(child => (
            <div 
              key={child.id}
              className={cn(
                "bg-surface border border-border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all group cursor-pointer",
                child.riskLevel === 'high' && "border-red-200"
              )}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-3xl",
                  child.age >= 18 ? `text-white bg-gradient-to-br ${getGradientForChild(child.id)}` : "bg-accent-light"
                )}>
                  {child.age >= 18 ? <span className="font-serif">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : child.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold group-hover:text-accent transition-colors">{child.name}</h3>
                  <p className="text-xs text-text-dim uppercase font-bold tracking-widest">{child.age >= 18 ? 'College / University' : child.grade}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-text-muted font-medium">Current Status</span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    child.riskLevel === 'low' ? "bg-green-100 text-green-700" : 
                    child.riskLevel === 'medium' ? "bg-amber-100 text-amber-700" : 
                    "bg-red-100 text-red-700"
                  )}>
                    {child.riskLevel} Risk
                  </span>
                </div>
                
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000", child.riskLevel === 'low' ? "bg-accent" : "bg-red-500")} 
                    style={{ width: `${child.moodScore * 10}%` }} 
                  />
                </div>

                <div className="flex justify-between text-[10px] font-bold text-text-dim uppercase tracking-widest">
                  <span>Mood: {child.moodScore}/10</span>
                  <span>Stress: {child.stressLevel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const latestAssessment = assessments[0];
  
  const radarData = latestAssessment ? [
    { subject: 'Mood', A: 6 - latestAssessment.scores.mood, fullMark: 5 },
    { subject: 'Energy', A: 6 - latestAssessment.scores.energy, fullMark: 5 },
    { subject: 'Sleep', A: 6 - latestAssessment.scores.sleep, fullMark: 5 },
    { subject: 'Social', A: 6 - latestAssessment.scores.social, fullMark: 5 },
    { subject: 'Stress', A: 6 - latestAssessment.scores.stress, fullMark: 5 },
  ] : [
    { subject: 'Mood', A: 0, fullMark: 5 },
    { subject: 'Energy', A: 0, fullMark: 5 },
    { subject: 'Sleep', A: 0, fullMark: 5 },
    { subject: 'Social', A: 0, fullMark: 5 },
    { subject: 'Stress', A: 0, fullMark: 5 },
  ];

  const isAdult = selectedChild.age >= 18;
  const isSummaryMode = selectedChild.privacyLevel === 'summary';

  // Group assessments by date and calculate average score per day using a Map for grouping
  const trendData = React.useMemo(() => {
    if (assessments.length === 0) {
      return Array.from({ length: timeframe === '7d' ? 7 : 30 }).map((_, i) => ({
        date: `Day ${i + 1}`,
        wellness: 0,
        mood: 0,
        stress: 0
      }));
    }

    // Group by toLocaleDateString() as requested for accurate daily aggregation
    const dateGroups = new Map<string, any[]>();
    
    assessments.forEach(item => {
      const d = new Date(item.timestamp);
      const dateKey = d.toLocaleDateString();
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)?.push(item);
    });

    // Convert Map to array and calculate averages
    const allAggregatedData = Array.from(dateGroups.entries())
      .map(([dateKey, items]) => {
        const avgTotal = items.reduce((sum, i) => sum + (i.totalScore || 0), 0) / items.length;
        const avgMood = items.reduce((sum, i) => sum + (i.scores?.mood || 0), 0) / items.length;
        const avgStress = items.reduce((sum, i) => sum + (i.scores?.stress || 0), 0) / items.length;

        return {
          date: new Date(items[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          wellness: parseFloat((6 - avgTotal).toFixed(2)),
          mood: parseFloat((6 - avgMood).toFixed(2)),
          stress: parseFloat(avgStress.toFixed(2)),
          sortDate: items[0].timestamp // used for sorting
        };
      })
      .sort((a, b) => new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime());

    return timeframe === '7d' ? allAggregatedData.slice(-7) : timeframe === '30d' ? allAggregatedData.slice(-30) : allAggregatedData;
  }, [assessments, timeframe]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif tracking-tight">Health Reports — {selectedChild.name}</h1>
          <p className="text-text-muted mt-1">Deep dive into behavioral patterns and AI-driven insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2 bg-surface text-text-main border border-border hover:border-accent hover:text-accent rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            <Download size={16} />
            Export Report (PDF)
          </button>
          <div className="no-print flex bg-surface border border-border rounded-2xl p-1 shadow-sm">
            {(['7d', '30d', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  timeframe === t 
                    ? "bg-accent text-white shadow-lg shadow-accent/20" 
                    : "text-text-dim hover:text-text-main"
                )}
              >
                {t === '7d' ? 'This Week' : t === '30d' ? 'Last Month' : 'All Time'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md border border-white/40 rounded-2xl text-sm font-bold shadow-[0_8px_32px_rgba(45,122,90,0.1)] hover:bg-white/30 hover:border-white/50 transition-all text-text-main"
          >
            <Download size={18} /> Export Report (PDF)
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-surface border border-border rounded-2xl p-1 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('trends')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
            activeTab === 'trends' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-dim hover:text-text-main"
          )}
        >
          Wellness Trends
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
            activeTab === 'patterns' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-dim hover:text-text-main"
          )}
        >
          Patterns & Anomalies
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
            activeTab === 'history' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-dim hover:text-text-main"
          )}
        >
          Check-in History
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-dim font-medium">Analyzing data patterns...</p>
        </div>
      ) : activeTab === 'trends' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* AI Insights - Large Bento Box */}
          <div className="md:col-span-12 max-w-5xl mx-auto w-full bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent-light flex items-center justify-center text-accent">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="text-xl font-serif">AI Clinical Summary</h3>
                <p className="text-xs text-text-dim font-medium uppercase tracking-widest">Generated by Gemini AI</p>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-text-muted leading-relaxed bg-surface-2 p-6 rounded-3xl border border-border">
              {latestAssessment?.aiInsight && typeof latestAssessment.aiInsight === 'object' ? (
                <div className="space-y-4">
                  <p className="font-bold text-text-main text-base">{latestAssessment.aiInsight.status}</p>
                  <div className="mt-4">
                    <p className="text-xs font-bold text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                       <Zap size={14} /> Clinical Suggestions
                    </p>
                    <ul className="space-y-3">
                      {latestAssessment.aiInsight.recommendations?.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                          <span className="text-sm leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <ul className="space-y-4">
                  {(latestAssessment?.aiInsight || "No assessment data available yet. Complete a check-in to see AI insights.")
                    .toString() // Ensure it's a string for splitting
                    .split('\n')
                    .filter((line: string) => line.trim().length > 0)
                    .slice(0, 4)
                    .map((line: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                        <span>{line.replace(/^- /, '')}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          {/* Root-Cause Analysis */}
          <div className="md:col-span-12 max-w-5xl mx-auto w-full bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent-light text-accent rounded-2xl">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif">Root-Cause Analysis</h3>
                  <p className="text-sm text-text-muted">Multi-factor correlation engine results</p>
                </div>
              </div>
              {rootCause && (
                <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-xl w-fit">
                  <span className="text-[10px] font-bold text-text-dim uppercase">Confidence</span>
                  <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${(rootCause.confidence || 0) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold">{Math.round((rootCause.confidence || 0) * 100)}%</span>
                </div>
              )}
            </div>

            {rootCause ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="p-6 bg-surface-2 rounded-3xl border border-border">
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Primary Factor</p>
                    <h4 className="text-xl font-bold mb-4">{rootCause.primaryFactor}</h4>
                    <p className="text-text-muted leading-relaxed">{rootCause.explanation}</p>
                  </div>
                </div>

                <div className="bg-accent-light/10 border border-accent/20 rounded-3xl p-6">
                  <h4 className="font-bold text-accent mb-4 flex items-center gap-2">
                    <Zap size={18} />
                    Actionable Logic
                  </h4>
                  <ul className="space-y-3">
                    {rootCause.evidence.slice(0, 3).map((e, i) => (
                      <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-surface-2 rounded-3xl border border-dashed border-border italic text-text-dim">
                Gathering more data for root-cause analysis...
              </div>
            )}
          </div>

          {/* Predictive Outlook */}
          <div className="md:col-span-12 max-w-5xl mx-auto w-full bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-xl font-serif">Predictive Outlook</h3>
                <p className="text-sm text-text-muted">7-day risk forecasting model</p>
              </div>
            </div>

            {prediction ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-surface-2 rounded-3xl border border-border">
                  <h4 className="text-xs font-bold text-text-dim uppercase mb-4 flex items-center gap-2">
                    <Target size={14} /> Potential Triggers
                  </h4>
                  <ul className="space-y-2">
                    {prediction.predictedTriggers.map((t, i) => (
                      <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-text-dim mt-1.5 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 bg-surface-2 rounded-3xl border border-border">
                  <h4 className="text-xs font-bold text-text-dim uppercase mb-4 flex items-center gap-2">
                    <Zap size={14} /> Preemptive Actions
                  </h4>
                  <ul className="space-y-2">
                    {prediction.preemptiveActions.map((a, i) => (
                      <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-surface-2 rounded-3xl border border-dashed border-border italic text-text-dim">
                Insufficient data for reliable prediction model.
              </div>
            )}
          </div>

          {/* Key Metrics Sidebar */}
          <div className="md:col-span-4 space-y-6">
            <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-lg font-serif mb-6">Current Metrics</h3>
              <div className="space-y-6">
                <MetricProgress label="Mood Stability" value={latestAssessment ? (6 - latestAssessment.scores.mood) * 20 : 0} color="bg-accent" />
                <MetricProgress label="Sleep Quality" value={latestAssessment ? (6 - latestAssessment.scores.sleep) * 20 : 0} color="bg-blue-500" />
                <MetricProgress label="Social Engagement" value={latestAssessment ? (6 - latestAssessment.scores.social) * 20 : 0} color="bg-purple-500" />
                <MetricProgress label="Stress Resilience" value={latestAssessment ? (6 - latestAssessment.scores.stress) * 20 : 0} color="bg-amber-500" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-serif mb-2">Next Check-in</h3>
                <p className="text-sm text-text-muted mb-6">Recommended for tomorrow morning to track sleep patterns.</p>
                <button 
                  onClick={handleSetReminder}
                  className="w-full py-4 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-all shadow-lg shadow-accent/20"
                >
                  Set Reminder
                </button>
              </div>
              <Calendar className="absolute -bottom-4 -right-4 text-accent opacity-5" size={120} />
            </div>
          </div>

          {/* Detailed Charts */}
          <div className="md:col-span-12 grid md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-serif mb-8">Holistic Well-being</h3>
              <div className="h-[300px]">
                {assessments.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="var(--color-surface-2)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-dim)', fontSize: 12, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                      <Radar
                        name={selectedChild.name}
                        dataKey="A"
                        stroke="var(--color-accent)"
                        fill="var(--color-accent)"
                        fillOpacity={0.3}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid var(--color-border)', 
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-main)',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-dim bg-surface-2/50 rounded-2xl border border-dashed border-border p-6">
                    <Activity className="opacity-10 mb-2" size={48} />
                    <p className="text-sm font-medium">No assessment data available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-serif mb-8">Wellness Trend vs. Schedule</h3>
              <div className="h-[300px]">
                {assessments.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-dim)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-dim)' }} domain={[0, 5]} />
                      
                      {/* Highlight High Difficulty School Days */}
                      {schedule.filter(s => s.difficulty === 'High').map((s, i) => (
                        <React.Fragment key={`ref-${i}`}>
                          <RefArea 
                            x1={s.day} 
                            x2={s.day} 
                            fill="var(--color-accent-light)" 
                            fillOpacity={0.2}
                          />
                        </React.Fragment>
                      ))}

                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid var(--color-border)', 
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-main)',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                        }}
                      />
                      <Area type="monotone" dataKey="wellness" fill="var(--color-accent-light)" stroke="none" fillOpacity={0.2} />
                      <Line 
                        type="monotone" 
                        dataKey="wellness" 
                        stroke="var(--color-accent)" 
                        strokeWidth={4} 
                        dot={{ r: 5, fill: 'var(--color-accent)', strokeWidth: 2, stroke: 'var(--color-surface)' }} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-dim bg-surface-2/50 rounded-2xl border border-dashed border-border p-6">
                    <TrendingDown className="opacity-10 mb-2" size={48} />
                    <p className="text-sm font-medium">No trend data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'patterns' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Patterns Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-accent-light text-accent rounded-2xl">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif">Behavioral Patterns</h3>
                  <p className="text-xs text-text-dim">Detected cyclical and long-term trends</p>
                </div>
              </div>

              {selectedChild.privacyLevel === 'summary' ? (
                <div className="flex items-center gap-3 text-purple-400 bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                  <Lock size={20} />
                  <p className="text-sm font-medium">Detailed behavioral patterns are hidden due to privacy settings.</p>
                </div>
              ) : (
              <div className="space-y-4">
                {patterns.length > 0 ? patterns.map((p) => (
                  <div key={p.id} className="p-6 bg-surface-2 rounded-3xl border border-border group hover:border-accent/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                        p.impact === 'positive' ? "bg-green-100 text-green-700" : 
                        p.impact === 'negative' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {p.type}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-text-dim uppercase">Confidence</span>
                        <span className="text-xs font-bold text-accent">{Math.round(p.confidence * 100)}%</span>
                      </div>
                    </div>
                    <h4 className="font-bold mb-2">{p.title}</h4>
                    <p className="text-xs text-text-muted leading-relaxed mb-4">{p.description}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-text-dim uppercase">
                      <Activity size={12} />
                      Frequency: {p.frequency}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-text-muted italic">
                    Not enough data to detect patterns yet.
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Anomalies Section */}
            <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif">Statistical Anomalies</h3>
                  <p className="text-xs text-text-dim">Significant deviations from baseline</p>
                </div>
              </div>

              {selectedChild.privacyLevel === 'summary' ? (
                <div className="flex items-center gap-3 text-purple-400 bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                  <Lock size={20} />
                  <p className="text-sm font-medium">Anomaly detection data is hidden due to privacy settings.</p>
                </div>
              ) : (
              <div className="space-y-4">
                {anomalies.length > 0 ? anomalies.map((a) => (
                  <div key={a.id} className="p-6 bg-red-50/30 border border-red-100 rounded-3xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">Anomaly</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          a.severity === 'high' ? "bg-red-600 text-white" : "bg-red-100 text-red-700"
                        )}>
                          {a.severity} severity
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-text-dim uppercase">{new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-bold text-red-900 mb-1">Deviation in {a.metric}</p>
                    <p className="text-xs text-red-800/80 leading-relaxed">{a.description}</p>
                  </div>
                )) : (
                  <div className="text-center py-12 text-text-muted italic">
                    No significant anomalies detected in the current timeframe.
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <History size={24} />
              </div>
              <h3 className="text-xl font-serif">Assessment History</h3>
            </div>

            <div className="overflow-hidden border border-border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[10px]">Type</th>
                    <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[10px]">Wellness Score</th>
                    <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[10px]">Clinical Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assessments.length > 0 ? assessments.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{new Date(a.timestamp).toLocaleDateString()}</td>
                      <td className="px-6 py-4">Standard Check-in</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${(6 - (a.totalScore || 0)) * 20}%` }} />
                          </div>
                          <span className="font-bold">{Math.round((6 - (a.totalScore || 0)) * 20)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted truncate max-w-xs">
                        {typeof a.aiInsight === 'string' 
                          ? a.aiInsight.substring(0, 60) 
                          : a.aiInsight?.recommendations?.[0] || 'View full report for details'}...
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-text-dim italic">No assessment history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Disclaimer */}
      <div className="bg-surface border border-border rounded-[2rem] p-6 shadow-sm mt-8">
        <div className="flex items-start gap-3">
          <Brain className="text-accent shrink-0 mt-0.5" size={20} />
          <div className="text-xs text-text-muted leading-relaxed">
            <p className="font-bold text-text-main mb-1">AI Decision Support Notice</p>
            These reports use AI to identify behavioral patterns. AI insights are intended to complement, not replace, professional clinical judgment. Data is processed in accordance with our Privacy & Ethical Framework.
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricProgress({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs font-bold text-text-dim uppercase tracking-widest">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-1000", color)} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
}

