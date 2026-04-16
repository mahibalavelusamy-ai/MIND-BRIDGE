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
import { db, collection, query, where, getDocs, orderBy } from '../lib/firebase';
import { detectBehavioralPatterns } from '../lib/patternService';
import { Activity, AlertTriangle, Fingerprint } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trends' | 'patterns'>('trends');
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
            orderBy('timestamp', 'desc')
          );
        } else {
          qA = query(
            collection(db, 'assessments'), 
            where('childId', '==', selectedChild.id),
            orderBy('timestamp', 'desc')
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
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedChild?.id, timeframe]);

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
                <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center text-3xl">
                  {child.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold group-hover:text-accent transition-colors">{child.name}</h3>
                  <p className="text-xs text-text-dim uppercase font-bold tracking-widest">{child.grade}</p>
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
  ] : [];

  const trendData = assessments.slice(0, 7).reverse().map(a => ({
    date: new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    wellness: 6 - a.totalScore,
    mood: 6 - a.scores.mood,
    stress: a.scores.stress
  }));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif tracking-tight">Health Reports — {selectedChild.name}</h1>
          <p className="text-text-muted mt-1">Deep dive into behavioral patterns and AI-driven insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-surface border border-border rounded-2xl p-1 shadow-sm">
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
          <button className="flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-2xl text-sm font-bold hover:bg-surface-2 transition-all shadow-sm">
            <Download size={18} /> Export PDF
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
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-dim font-medium">Analyzing data patterns...</p>
        </div>
      ) : activeTab === 'trends' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* AI Insights - Large Bento Box */}
          <div className="md:col-span-8 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
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
              {latestAssessment?.aiInsight || "No assessment data available yet. Complete a check-in to see AI insights."}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="p-6 bg-accent-light/10 rounded-3xl border border-accent/10">
                <h4 className="font-bold text-accent text-sm mb-2 flex items-center gap-2">
                  <TrendingUp size={16} /> Key Trend
                </h4>
                <p className="text-sm text-text-muted">Mood has stabilized over the last 3 days despite increased academic load.</p>
              </div>
              <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                <h4 className="font-bold text-amber-700 text-sm mb-2 flex items-center gap-2">
                  <Info size={16} /> Recommendation
                </h4>
                <p className="text-sm text-text-muted">Consider a 15-minute 'unstructured play' session after school to lower cortisol.</p>
              </div>
            </div>
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
                <button className="w-full py-4 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-all shadow-lg shadow-accent/20">
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
              <div className="h-[350px]">
                {radarData.length > 0 ? (
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
                  <div className="flex items-center justify-center h-full text-text-dim italic">No data yet</div>
                )}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-serif mb-8">Wellness Trend vs. Schedule</h3>
              <div className="h-[350px]">
                {trendData.length > 0 ? (
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
                  <div className="flex items-center justify-center h-full text-text-dim italic">No data yet</div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
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

