import React from 'react';
import { Printer, Calendar, Heart, Shield, CheckCircle2, ArrowLeft } from 'lucide-react';
import { WeeklyWellbeingReportData, WeeklyReportService } from '../services/reports/weeklyReportService';
import { Child } from '../types';

interface WeeklyWellbeingPrintViewProps {
  student: Child;
  onBack?: () => void;
}

export default function WeeklyWellbeingPrintView({
  student,
  onBack
}: WeeklyWellbeingPrintViewProps) {
  const report: WeeklyWellbeingReportData = WeeklyReportService.generateWeeklyReport(student);

  const handlePrint = () => {
    WeeklyReportService.triggerPrint();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden during native print) */}
      <div className="print:hidden flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-surface-2 border border-border rounded-lg text-text-muted hover:text-text-main transition-colors"
              title="Return to reports"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-text-main">Weekly Longitudinal Wellbeing Report</h2>
            <p className="text-xs text-text-muted">Print or export to PDF for clinical records or parent debriefs.</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-bg rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors shadow-md"
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      {/* Printable Report Document Container */}
      <div className="bg-surface print:bg-white print:text-black p-8 md:p-10 rounded-2xl border border-border print:border-none shadow-xl print:shadow-none max-w-4xl mx-auto space-y-8 font-sans">
        {/* Document Header */}
        <div className="border-b border-border print:border-gray-300 pb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-accent inline-block" />
              <span className="text-xs font-bold uppercase tracking-widest text-accent print:text-gray-800">Mind Bridge System</span>
            </div>
            <h1 className="text-2xl font-black text-text-main print:text-black mt-2">Executive Student Wellbeing Summary</h1>
            <p className="text-xs text-text-muted print:text-gray-600 mt-1">Multi-factor emotional, behavioral, and academic schedule synthesis.</p>
          </div>

          <div className="text-right text-xs text-text-dim print:text-gray-600 space-y-1">
            <div><span className="font-semibold">Report ID:</span> <span className="font-mono text-accent print:text-black">{report.reportId}</span></div>
            <div><span className="font-semibold">Week:</span> {report.weekRange}</div>
            <div><span className="font-semibold">Date Generated:</span> {report.generatedDate}</div>
          </div>
        </div>

        {/* Student Demographics Header */}
        <div className="p-4 bg-surface-2 print:bg-gray-50 rounded-xl border border-border print:border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-text-dim print:text-gray-500 uppercase tracking-wider text-[10px]">Student Name</span>
            <p className="font-bold text-text-main print:text-black text-sm mt-0.5">{report.student.name}</p>
          </div>
          <div>
            <span className="text-text-dim print:text-gray-500 uppercase tracking-wider text-[10px]">Grade & Section</span>
            <p className="font-bold text-text-main print:text-black text-sm mt-0.5">{report.student.grade}</p>
          </div>
          <div>
            <span className="text-text-dim print:text-gray-500 uppercase tracking-wider text-[10px]">Age</span>
            <p className="font-bold text-text-main print:text-black text-sm mt-0.5">{report.student.age} Years</p>
          </div>
          <div>
            <span className="text-text-dim print:text-gray-500 uppercase tracking-wider text-[10px]">Current Risk Tier</span>
            <p className="font-bold text-accent print:text-black text-sm mt-0.5 capitalize">{student.riskLevel || 'Low'} Risk</p>
          </div>
        </div>

        {/* KPI Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-surface-2 print:bg-gray-100 rounded-xl border border-border print:border-gray-200">
            <span className="text-[10px] uppercase tracking-wider text-text-dim print:text-gray-600">Wellbeing Index</span>
            <p className="text-2xl font-black text-accent print:text-black mt-1">{report.summaryMetrics.wellbeingScore}/100</p>
          </div>
          <div className="p-4 bg-surface-2 print:bg-gray-100 rounded-xl border border-border print:border-gray-200">
            <span className="text-[10px] uppercase tracking-wider text-text-dim print:text-gray-600">Average Mood Score</span>
            <p className="text-2xl font-black text-text-main print:text-black mt-1">{report.summaryMetrics.averageMood}/10</p>
          </div>
          <div className="p-4 bg-surface-2 print:bg-gray-100 rounded-xl border border-border print:border-gray-200">
            <span className="text-[10px] uppercase tracking-wider text-text-dim print:text-gray-600">Average Stress</span>
            <p className="text-2xl font-black text-warning-400 print:text-black mt-1">{report.summaryMetrics.averageStress}</p>
          </div>
          <div className="p-4 bg-surface-2 print:bg-gray-100 rounded-xl border border-border print:border-gray-200">
            <span className="text-[10px] uppercase tracking-wider text-text-dim print:text-gray-600">Streak & Consistency</span>
            <p className="text-2xl font-black text-text-main print:text-black mt-1">{report.summaryMetrics.streakDays} Days</p>
          </div>
        </div>

        {/* 7-Day Trajectory Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted print:text-gray-700 flex items-center gap-2">
            <Calendar size={15} />
            7-Day Longitudinal Telemetry Log
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border print:border-gray-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 print:bg-gray-200 text-text-muted print:text-gray-700 font-semibold border-b border-border print:border-gray-300">
                <tr>
                  <th className="p-3">Day / Date</th>
                  <th className="p-3">Mood Score (1-10)</th>
                  <th className="p-3">Stress Rating</th>
                  <th className="p-3">Mindfulness / Focus</th>
                  <th className="p-3">Trajectory Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-gray-200">
                {report.dailyTrajectory.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-2/40 print:hover:bg-transparent">
                    <td className="p-3 font-semibold text-text-main print:text-black">{row.day} ({row.date})</td>
                    <td className="p-3 font-mono text-accent print:text-black font-bold">{row.mood.toFixed(1)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-surface print:bg-gray-100 border border-border print:border-gray-300 text-[11px]">
                        {row.stress}
                      </span>
                    </td>
                    <td className="p-3 text-text-dim print:text-gray-700">{row.focusMinutes} mins</td>
                    <td className="p-3 text-accent print:text-green-700 font-medium">✓ Stable</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Observations & Correlations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-surface-2 print:bg-gray-50 rounded-xl border border-border print:border-gray-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-main print:text-black flex items-center gap-1.5">
              <Shield size={14} className="text-accent print:text-gray-800" />
              Academic & Environmental Correlations
            </h4>
            <ul className="space-y-2 text-xs text-text-muted print:text-gray-700 list-disc list-inside">
              {report.academicCorrelations.map((c, i) => (
                <li key={i} className="leading-relaxed">{c}</li>
              ))}
            </ul>
          </div>

          <div className="p-5 bg-surface-2 print:bg-gray-50 rounded-xl border border-border print:border-gray-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-main print:text-black flex items-center gap-1.5">
              <Heart size={14} className="text-accent print:text-gray-800" />
              Clinical Protective Buffers
            </h4>
            <ul className="space-y-2 text-xs text-text-muted print:text-gray-700 list-disc list-inside">
              {report.clinicalObservations.map((obs, i) => (
                <li key={i} className="leading-relaxed">{obs}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actionable Recommendations */}
        <div className="p-5 bg-accent/10 print:bg-gray-100 rounded-xl border border-accent/30 print:border-gray-300 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent print:text-black flex items-center gap-1.5">
            <CheckCircle2 size={16} />
            Targeted Action Recommendations
          </h4>
          <div className="space-y-2 text-xs text-text-main print:text-gray-800">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-bold text-accent print:text-black font-mono">0{i + 1}.</span>
                <p className="leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document Footer */}
        <div className="border-t border-border print:border-gray-300 pt-6 text-[10px] text-text-dim print:text-gray-500 flex items-center justify-between">
          <span>Mind Bridge System • Confidential Healthcare & Educational Telemetry</span>
          <span>Verified Non-Clinical Decision Support Protocol</span>
        </div>
      </div>
    </div>
  );
}
