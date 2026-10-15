import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Inbox, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MessageSquare, 
  Filter, 
  Plus, 
  ArrowRight,
  ShieldAlert,
  Search
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { TriageCase, TriageService } from '../services/counselor/triageService';

export default function CounselorTriageQueue() {
  const { triageCases, updateTriageCase, addTriageCase, selectedChild } = useAppStore();
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const [newNote, setNewNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const metrics = TriageService.calculateMetrics(triageCases);

  const filteredCases = triageCases
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .filter(c => searchQuery === '' || c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || c.triggerReason.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleStatusChange = (triageCase: TriageCase, newStatus: TriageCase['status']) => {
    const updated = TriageService.updateCaseStatus(triageCase, newStatus);
    updateTriageCase(updated);
    if (selectedCase?.id === triageCase.id) {
      setSelectedCase(updated);
    }
  };

  const handleAddNote = () => {
    if (!selectedCase || !newNote.trim()) return;
    const updated = TriageService.updateCaseStatus(selectedCase, selectedCase.status, newNote.trim());
    updateTriageCase(updated);
    setSelectedCase(updated);
    setNewNote('');
  };

  const handleSetFollowUp = () => {
    if (!selectedCase || !followUpDate) return;
    const updated = TriageService.setFollowUp(selectedCase, followUpDate);
    updateTriageCase(updated);
    setSelectedCase(updated);
    setFollowUpDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Inbox className="text-accent" size={24} />
            Counselor Triage & Clinical Follow-up
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Prioritized intake queue for students experiencing acute stress, academic clustering, or behavioral shifts.
          </p>
        </div>

        {/* Quick Add Demo Trigger */}
        <button
          onClick={() => {
            const studentName = selectedChild?.name || 'Aarav Sharma';
            const studentId = selectedChild?.id || 'demo-student';
            const newCase = TriageService.createCase(
              studentId,
              studentName,
              'Manual counselor observation: elevated test anxiety and fatigue',
              'medium'
            );
            addTriageCase(newCase);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/40 text-accent rounded-xl text-xs font-semibold hover:bg-accent/30 transition-colors"
        >
          <Plus size={14} />
          Create Intake Case
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-surface border border-border rounded-xl">
          <span className="text-[11px] uppercase tracking-wider text-text-muted">Total Cases</span>
          <p className="text-xl font-bold text-text-main mt-1">{metrics.total}</p>
        </div>
        <div className="p-3.5 bg-surface border border-border rounded-xl">
          <span className="text-[11px] uppercase tracking-wider text-alert-400">New Intake</span>
          <p className="text-xl font-bold text-alert-400 mt-1">{metrics.newCount}</p>
        </div>
        <div className="p-3.5 bg-surface border border-border rounded-xl">
          <span className="text-[11px] uppercase tracking-wider text-warning-400">In Progress</span>
          <p className="text-xl font-bold text-warning-400 mt-1">{metrics.inProgressCount}</p>
        </div>
        <div className="p-3.5 bg-surface border border-border rounded-xl">
          <span className="text-[11px] uppercase tracking-wider text-accent">Resolved</span>
          <p className="text-xl font-bold text-accent mt-1">{metrics.resolvedCount}</p>
        </div>
        <div className="p-3.5 bg-surface border border-border rounded-xl">
          <span className="text-[11px] uppercase tracking-wider text-alert-500">Critical Priority</span>
          <p className="text-xl font-bold text-alert-500 mt-1">{metrics.criticalCount}</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {(['all', 'new', 'in_progress', 'resolved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                filterStatus === tab
                  ? 'bg-accent text-bg shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-2'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search student or trigger..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Cases List and Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List */}
        <div className="lg:col-span-7 space-y-3">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center bg-surface border border-border rounded-xl">
              <Inbox size={32} className="mx-auto text-text-dim mb-2" />
              <p className="text-sm text-text-muted">No triage cases found for this filter.</p>
            </div>
          ) : (
            filteredCases.map(c => {
              const isSelected = selectedCase?.id === c.id;
              const severityColor =
                c.severity === 'critical' ? 'text-alert-500 bg-alert-500/15 border-alert-500/40' :
                c.severity === 'high' ? 'text-warning-400 bg-warning-400/15 border-warning-400/40' :
                c.severity === 'medium' ? 'text-accent bg-accent/15 border-accent/40' :
                'text-text-muted bg-surface-2 border-border';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface border-accent shadow-[0_0_15px_rgba(0,255,204,0.15)]'
                      : 'bg-surface border-border hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-main">{c.studentName}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${severityColor}`}>
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-snug">{c.triggerReason}</p>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      c.status === 'new' ? 'bg-alert-500/15 text-alert-400' :
                      c.status === 'in_progress' ? 'bg-warning-400/15 text-warning-400' :
                      'bg-accent/15 text-accent'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-dim">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Created: {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    {c.followUpDate && (
                      <span className="flex items-center gap-1 text-accent font-medium">
                        <Calendar size={12} />
                        Follow-up: {c.followUpDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Case Workspace */}
        <div className="lg:col-span-5">
          {selectedCase ? (
            <div className="p-5 bg-surface border border-border rounded-xl space-y-5 sticky top-24">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-base text-text-main">{selectedCase.studentName}</h3>
                  <span className="text-xs text-text-dim font-mono">Case ID: {selectedCase.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['new', 'in_progress', 'resolved'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedCase, st)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                        selectedCase.status === st
                          ? 'bg-accent text-bg'
                          : 'bg-surface-2 text-text-muted hover:text-text-main'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger description */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Trigger Reason</span>
                <p className="text-xs text-text-main mt-1 bg-surface-2 p-3 rounded-lg border border-border">
                  {selectedCase.triggerReason}
                </p>
              </div>

              {/* Clinical Notes Trail */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-2">
                  <MessageSquare size={13} className="text-accent" />
                  Counselor Session Notes ({selectedCase.notes.length})
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 bg-bg/50 p-2.5 rounded-lg border border-border text-xs">
                  {selectedCase.notes.map((note, i) => (
                    <div key={i} className="p-2 bg-surface rounded border border-border text-text-muted text-[11px]">
                      {note}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Note Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Append clinical note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent"
                />
                <button
                  onClick={handleAddNote}
                  className="px-3 py-1.5 bg-accent text-bg rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors"
                >
                  Save
                </button>
              </div>

              {/* Schedule Follow-up Date */}
              <div className="pt-2 border-t border-border flex items-center gap-2">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-xs text-text-main focus:outline-none focus:border-accent"
                />
                <button
                  onClick={handleSetFollowUp}
                  className="px-3 py-1.5 bg-surface-2 border border-border hover:bg-surface text-accent rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Calendar size={13} />
                  Set Follow-Up
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-surface border border-border rounded-xl">
              <p className="text-xs text-text-muted">Select a triage case from the list to view notes, update status, and set clinical follow-up dates.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
