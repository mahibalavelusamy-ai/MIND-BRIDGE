import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Search,
  Download,
  Eye,
  EyeOff,
  ChevronRight,
  School,
  Activity,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { SchoolClass, SchoolStats } from '../types';
import { cn } from '../lib/utils';

const MOCK_CLASSES: SchoolClass[] = [
  { id: 'c1', name: 'Class 5-A', grade: 'Grade 5', teacher: 'Mrs. Smith', studentCount: 28, avgMood: 7.8, riskLevel: 'low' },
  { id: 'c2', name: 'Class 5-B', grade: 'Grade 5', teacher: 'Mr. Jones', studentCount: 26, avgMood: 6.2, riskLevel: 'medium' },
  { id: 'c3', name: 'Class 6-A', grade: 'Grade 6', teacher: 'Ms. Davis', studentCount: 30, avgMood: 4.5, riskLevel: 'high' },
  { id: 'c4', name: 'Class 6-B', grade: 'Grade 6', teacher: 'Mr. Wilson', studentCount: 29, avgMood: 8.1, riskLevel: 'low' },
  { id: 'c5', name: 'Class 7-A', grade: 'Grade 7', teacher: 'Mrs. Brown', studentCount: 25, avgMood: 6.9, riskLevel: 'medium' },
];

const MOCK_SCHOOL_STATS: SchoolStats = {
  totalStudents: 138,
  atRiskCount: 12,
  avgMood: 6.7,
  moodTrend: +0.3
};

const MOCK_HEATMAP_DATA = [
  { class: '5-A', Mon: 8, Tue: 7, Wed: 8, Thu: 9, Fri: 8 },
  { class: '5-B', Mon: 6, Tue: 6, Wed: 5, Thu: 7, Fri: 6 },
  { class: '6-A', Mon: 4, Tue: 5, Wed: 4, Thu: 3, Fri: 4 },
  { class: '6-B', Mon: 8, Tue: 9, Wed: 8, Thu: 8, Fri: 9 },
  { class: '7-A', Mon: 7, Tue: 6, Wed: 7, Thu: 6, Fri: 7 },
];

interface SchoolDashboardProps {
  user: any;
  initialTab?: 'overview' | 'classes' | 'analytics';
  privacyBlur?: boolean;
}

const COLORS = ['#2d7a5a', '#c47a1e', '#c0392b'];

export default function SchoolDashboard({ user, initialTab = 'overview', privacyBlur = false }: SchoolDashboardProps) {
  const [isAnonymized, setIsAnonymized] = useState(privacyBlur);
  const [activeView, setActiveView] = useState(initialTab);
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    setIsAnonymized(privacyBlur);
  }, [privacyBlur]);

  useEffect(() => {
    setActiveView(initialTab);
  }, [initialTab]);

  const displayClasses = user?.role === 'school_admin' ? MOCK_CLASSES : MOCK_CLASSES.slice(0, 3);

  const selectedClass = displayClasses.find(c => c.id === selectedClassId);

  const filteredClasses = displayClasses.filter(c => 
    (selectedGrade === 'All' || c.grade === selectedGrade) &&
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.teacher.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const riskDistribution = [
    { name: 'Low Risk', value: displayClasses.filter(c => c.riskLevel === 'low').length || 1 },
    { name: 'Medium Risk', value: displayClasses.filter(c => c.riskLevel === 'medium').length || 0 },
    { name: 'High Risk', value: displayClasses.filter(c => c.riskLevel === 'high').length || 0 },
  ];

  if (selectedClass) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        <button 
          onClick={() => setSelectedClassId(null)}
          className="flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-widest hover:underline"
        >
          ← Back to Overview
        </button>

        <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-accent-light flex items-center justify-center text-accent">
                <Users size={36} />
              </div>
              <div>
                <h2 className="text-3xl font-serif">{isAnonymized ? `Class ${selectedClass.id.slice(-1)}` : selectedClass.name}</h2>
                <p className="text-text-muted">{selectedClass.grade} • {isAnonymized ? "Anonymized Teacher" : selectedClass.teacher}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-4 bg-surface-2 rounded-2xl border border-border text-center min-w-[120px]">
                <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Avg Mood</p>
                <p className="text-2xl font-serif font-bold text-accent">{selectedClass.avgMood}/10</p>
              </div>
              <div className="p-4 bg-surface-2 rounded-2xl border border-border text-center min-w-[120px]">
                <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Risk Level</p>
                <p className={cn(
                  "text-2xl font-serif font-bold capitalize",
                  selectedClass.riskLevel === 'low' ? "text-alert-400" : selectedClass.riskLevel === 'medium' ? "text-alert-500" : "text-alert-600"
                )}>{selectedClass.riskLevel}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-xl font-serif mb-6">Class Mood Trend</h3>
            <div className="min-h-[350px] w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { day: 'Mon', score: 7.5 },
                  { day: 'Tue', score: 7.2 },
                  { day: 'Wed', score: 6.8 },
                  { day: 'Thu', score: 7.4 },
                  { day: 'Fri', score: 7.9 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 10]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="var(--color-accent)" fill="var(--color-accent-light)" fillOpacity={0.2} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-serif mb-6">Student Risk Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: 'High Risk (Immediate Action)', count: 2, color: 'bg-alert-500' },
                  { label: 'Medium Risk (Monitor)', count: 5, color: 'bg-alert-400' },
                  { label: 'Low Risk (Stable)', count: 21, color: 'bg-accent' },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-surface-2 rounded-2xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", item.color)} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="font-bold">{item.count} Students</span>
                  </div>
                ))}
              </div>
            </div>
            {user?.role === 'teacher' && (
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="font-sans font-bold text-sm mb-3 text-text-main flex items-center gap-2">
                  <Activity size={16} className="text-accent" />
                  Nudge System
                </h4>
                <div className="flex gap-2">
                  <button className="flex-1 bg-surface-2 hover:bg-border text-text-main text-xs font-bold py-2 px-3 rounded-xl border border-border transition-colors">
                    Send Encouragement
                  </button>
                  <button className="flex-1 bg-surface-2 hover:bg-border text-text-main text-xs font-bold py-2 px-3 rounded-xl border border-border transition-colors">
                    Planner Reminder
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-sans tracking-tight font-bold flex items-center gap-3 text-white">
            <School className="text-accent" size={36} />
            {user?.role === 'school_admin' ? 'School Admin Portal' : 'Teacher Portal'}
          </h1>
          <p className="text-text-muted mt-1">
            {user?.role === 'school_admin' ? 'Institutional overview of student mental health and behavioral trends.' : 'Classroom engagement, wellness monitoring, and early support orchestration.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface border border-border p-2 rounded-2xl shadow-sm">
          <button 
            onClick={() => setIsAnonymized(!isAnonymized)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              isAnonymized ? "bg-accent text-bg" : "bg-surface-2 text-text-dim hover:text-text-main"
            )}
          >
            {isAnonymized ? <EyeOff size={14} /> : <Eye size={14} />}
            {isAnonymized ? "Data Anonymized" : "Privacy Mode Off"}
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button className="p-2 hover:bg-surface-2 rounded-xl text-text-dim">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex bg-surface border border-border rounded-2xl p-1 shadow-sm w-fit">
        {(['overview', 'classes', 'analytics'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              activeView === v 
                ? "bg-accent text-bg shadow-lg shadow-accent/20" 
                : "text-text-dim hover:text-text-main"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            icon={<Users size={20} />} 
            label={user?.role === 'school_admin' ? "Total Students" : "My Students"} 
            value={user?.role === 'school_admin' ? MOCK_SCHOOL_STATS.totalStudents.toString() : "86"} 
            subValue={user?.role === 'school_admin' ? "Across 12 Classes" : "Across 3 Classes"}
            color="bg-indigo-500/10 text-indigo-400"
          />
          <StatCard 
            icon={<AlertTriangle size={20} />} 
            label="Students At Risk" 
            value={user?.role === 'school_admin' ? MOCK_SCHOOL_STATS.atRiskCount.toString() : "4"} 
            subValue="Requires Attention"
            color="bg-alert-500/20 text-alert-500"
            isUrgent={user?.role === 'school_admin' ? MOCK_SCHOOL_STATS.atRiskCount > 10 : false}
          />
          <StatCard 
            icon={<Activity size={20} />} 
            label={user?.role === 'school_admin' ? "Avg School Mood" : "Avg Class Mood"} 
            value={`${MOCK_SCHOOL_STATS.avgMood}/10`} 
            subValue={`${MOCK_SCHOOL_STATS.moodTrend > 0 ? '↑' : '↓'} ${Math.abs(MOCK_SCHOOL_STATS.moodTrend)} from last week`}
            color="bg-accent-light text-accent"
          />
          <StatCard 
            icon={<ShieldCheck size={20} />} 
            label="Data Protection" 
            value="Secure" 
            subValue="HIPAA / FERPA Ready"
            color="bg-accent-light text-accent"
          />
        </div>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Dashboard Analytics & Admin Alerts */}
        {(activeView === 'overview' || activeView === 'analytics') && (
          <>
            <div className="md:col-span-8 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-serif">Class Wellness Heatmap</h3>
                  <p className="text-xs text-text-dim">Daily average mood scores per class</p>
                </div>
                <div className="flex gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                    <span key={day} className="text-[10px] font-bold text-text-dim uppercase w-8 text-center">{day}</span>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                {MOCK_HEATMAP_DATA.map((row, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-20 text-xs font-bold text-text-muted">{isAnonymized ? `Class ${i+1}` : row.class}</div>
                    <div className="flex-1 flex gap-2">
                      {[row.Mon, row.Tue, row.Wed, row.Thu, row.Fri].map((score, j) => (
                        <div 
                          key={j}
                          className="flex-1 h-12 rounded-xl transition-all hover:scale-105 cursor-help relative group"
                          style={{ 
                            backgroundColor: score >= 8 ? 'var(--color-accent)' : 
                                             score >= 6 ? 'var(--color-accent-light)' : 
                                             score >= 4 ? '#f39c12' : '#e74c3c',
                            opacity: 0.2 + (score / 10) * 0.8
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-bg font-bold text-xs transition-opacity">
                            {score}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-[#e74c3c]" />
                  <span className="text-[10px] text-text-dim font-bold uppercase">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-[#f39c12]" />
                  <span className="text-[10px] text-text-dim font-bold uppercase">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-accent" />
                  <span className="text-[10px] text-text-dim font-bold uppercase">Healthy</span>
                </div>
              </div>
            </div>

            {user?.role === 'school_admin' && (
              <div className="md:col-span-4 bg-surface border border-border rounded-[2rem] p-8 shadow-sm flex flex-col">
                <h3 className="text-xl font-serif mb-6 text-white">Institutional Alerts</h3>
                <div className="space-y-4 flex-1">
                  <div className="bg-alert-500/10 border border-alert-500/20 p-4 rounded-xl">
                    <p className="text-xs font-bold text-alert-500 uppercase flex items-center gap-2 mb-1"><AlertTriangle size={14}/> Stress Spike</p>
                    <p className="text-sm text-text-main font-medium">Grade 9 shows elevated stress during assessment week.</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                    <p className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2 mb-1"><AlertTriangle size={14}/> Exam Overload</p>
                    <p className="text-sm text-text-main font-medium">3 classes report high burnout risk for upcoming midterms.</p>
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                    <p className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2 mb-1"><Activity size={14}/> Engagement Anomaly</p>
                    <p className="text-sm text-text-main font-medium">Class 5-B engagement dropped by 15% this week.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Risk Distribution */}
        {user?.role !== 'school_admin' && (activeView === 'overview' || activeView === 'analytics') && (
          <div className="md:col-span-4 bg-surface border border-border rounded-[2rem] p-8 shadow-sm flex flex-col">
            <h3 className="text-xl font-serif mb-8">Risk Distribution</h3>
            <div className="min-h-[350px] w-full h-[350px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-serif font-bold">{displayClasses.length}</span>
                <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest">Classes</span>
              </div>
            </div>
            <div className="space-y-3 mt-6">
              {riskDistribution.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-xs font-medium text-text-muted">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold">{d.value} Classes</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap View */}
        {activeView === 'analytics' && (
          <div className="md:col-span-12 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-2xl font-serif mb-2">Classroom Heatmap (Stress & Burnout)</h3>
            <p className="text-text-muted mb-8 text-sm">Aggregate tracking of recent risk patterns. Names remain isolated to maintain DPDP compliance.</p>
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest pl-4">Class Target</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest text-center">Mon</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest text-center">Tue</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest text-center">Wed</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest text-center">Thu</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest text-center">Fri</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_HEATMAP_DATA.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-3 pl-4 font-medium text-sm border-r border-border min-w-[120px]">
                        {isAnonymized ? `Class Target ${idx+1}` : `Class ${row.class}`}
                      </td>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => {
                        const val = (row as any)[day];
                        // Inverse color scaling (lower mood/higher stress is red)
                        const bgColor = val >= 8 ? 'bg-alert-50 text-alert-800' :
                                        val >= 6 ? 'bg-alert-100 text-alert-700' :
                                        'bg-alert-200 text-alert-900';
                        return (
                          <td key={day} className="px-1 text-center">
                            <div className={cn("py-3 rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-105", bgColor)}>
                              {val}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 flex justify-end items-center gap-4 text-[10px] font-bold text-text-dim uppercase tracking-widest">
                <span>Legend: </span>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-alert-200 rounded" /> High Risk</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-alert-100 rounded" /> Caution</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-alert-50 rounded" /> Stable</div>
              </div>
            </div>
          </div>
        )}

        {/* Class List & Analytics */}
        {(activeView === 'overview' || activeView === 'classes') && (
          <div className="md:col-span-12 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <h3 className="text-2xl font-serif">Class-Level Analytics</h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search classes or teachers..." 
                    className="pl-10 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-sm focus:border-accent outline-none transition-all w-64"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="px-4 py-2 bg-surface-2 border border-border rounded-xl text-sm outline-none"
                  value={selectedGrade}
                  onChange={e => setSelectedGrade(e.target.value)}
                >
                  <option value="All">All Grades</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest">Class Name</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest">Teacher</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest">Students</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest">Avg Mood</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest">Risk Status</th>
                    <th className="pb-4 text-[10px] font-bold text-text-dim uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClasses.map(cls => (
                    <tr key={cls.id} className="group hover:bg-surface-2 transition-colors">
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center text-accent">
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{isAnonymized ? `Class ${cls.id.slice(-1)}` : cls.name}</p>
                            <p className="text-[10px] text-text-dim uppercase font-bold">{cls.grade}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 text-sm text-text-muted">{isAnonymized ? "Anonymized" : cls.teacher}</td>
                      <td className="py-5 text-sm font-medium">{cls.studentCount}</td>
                      <td className="py-5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 w-24 bg-border rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                cls.avgMood >= 7 ? "bg-accent" : cls.avgMood >= 5 ? "bg-alert-400" : "bg-alert-500"
                              )}
                              style={{ width: `${cls.avgMood * 10}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{cls.avgMood}</span>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          cls.riskLevel === 'low' ? "bg-alert-50 text-alert-500" : 
                          cls.riskLevel === 'medium' ? "bg-alert-100 text-alert-600" : 
                          "bg-alert-100 text-alert-700"
                        )}>
                          {cls.riskLevel}
                        </span>
                      </td>
                      <td className="py-5 text-right">
                        <button 
                          onClick={() => setSelectedClassId(cls.id)}
                          className="p-2 text-text-dim hover:text-accent transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Privacy & Compliance Bento Box */}
        <div className="md:col-span-12 bg-surface border border-border rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-alert-50 text-alert-500 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-xl font-serif">Privacy & Compliance Controls</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <PrivacyToggle 
                label="Anonymize Student Names" 
                description="Replaces student names with unique identifiers in all school-level views."
                enabled={isAnonymized}
                onChange={setIsAnonymized}
              />
              <PrivacyToggle 
                label="Class-Level Aggregation" 
                description="Only show averaged data for classes. Individual student profiles are restricted."
                enabled={true}
                onChange={() => {}}
              />
              <PrivacyToggle 
                label="Counselor Access Only" 
                description="Restrict detailed mental health data to certified school counselors."
                enabled={false}
                onChange={() => {}}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color, isUrgent }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  subValue: string; 
  color: string;
  isUrgent?: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all group">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", color)}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-3xl font-serif font-bold", isUrgent && "text-alert-600")}>{value}</p>
      <p className="text-xs text-text-muted mt-2">{subValue}</p>
    </div>
  );
}

function PrivacyToggle({ label, description, enabled, onChange }: { label: string; description: string; enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">{label}</span>
        <button 
          onClick={() => onChange(!enabled)}
          className={cn(
            "w-12 h-6 rounded-full relative transition-all",
            enabled ? "bg-accent" : "bg-border"
          )}
        >
          <div className={cn(
            "absolute top-1 w-4 h-4 bg-bg rounded-full transition-all",
            enabled ? "left-7" : "left-1"
          )} />
        </button>
      </div>
      <p className="text-xs text-text-dim leading-relaxed">{description}</p>
    </div>
  );
}
