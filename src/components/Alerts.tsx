import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Bell, Info, Trash2, CheckCircle2, Check } from 'lucide-react';
import { Alert } from '../types';
import { cn } from '../lib/utils';

interface AlertsProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export default function Alerts({ alerts, onDismiss }: AlertsProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.type === filter);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="page-header">
        <h1 className="text-4xl font-serif tracking-tight flex items-center gap-3">
          Alert Center
          {alerts.length > 0 && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
        </h1>
        <p className="text-text-muted mt-1">Real-time mental health notifications and expert recommendations.</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-surface border border-border rounded-2xl w-fit shadow-sm">
        {(['all', 'critical', 'warning', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              filter === f ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-dim hover:text-text-muted"
            )}
          >
            {f} ({f === 'all' ? alerts.length : alerts.filter(a => a.type === f).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-32 text-center bg-surface border border-border rounded-[2rem] shadow-sm"
            >
              <div className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-6 text-accent">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-serif">All clear!</h3>
              <p className="text-sm text-text-dim mt-2">No active alerts requiring your attention right now.</p>
            </motion.div>
          ) : (
            filteredAlerts.map(alert => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative flex flex-col md:flex-row gap-6 p-8 rounded-[2rem] border transition-all shadow-sm",
                  alert.type === 'critical' ? "bg-red-50/50 border-red-100" : 
                  alert.type === 'warning' ? "bg-amber-50/50 border-amber-100" : 
                  "bg-blue-50/50 border-blue-100"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  alert.type === 'critical' ? "bg-red-100 text-red-600" : 
                  alert.type === 'warning' ? "bg-amber-100 text-amber-600" : 
                  "bg-blue-100 text-blue-600"
                )}>
                  {alert.type === 'critical' ? <AlertCircle size={28} /> : 
                   alert.type === 'warning' ? <Bell size={28} /> : 
                   <Info size={28} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <h4 className={cn(
                      "text-xl font-serif",
                      alert.type === 'critical' ? "text-red-900" : 
                      alert.type === 'warning' ? "text-amber-900" : 
                      "text-blue-900"
                    )}>{alert.title}</h4>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit",
                      alert.type === 'critical' ? "bg-red-200 text-red-700" : 
                      alert.type === 'warning' ? "bg-amber-200 text-amber-700" : 
                      "bg-blue-200 text-blue-700"
                    )}>
                      {alert.type} Priority
                    </span>
                  </div>
                  <p className="text-base text-text-muted leading-relaxed mb-6">
                    {alert.description}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-black/5">
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
                      Detected {alert.timestamp}
                    </span>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => onDismiss(alert.id)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-surface border border-border text-text-main text-xs font-bold rounded-xl hover:bg-surface-2 transition-all shadow-sm"
                      >
                        <Check size={16} /> Mark as Resolved
                      </button>
                      {alert.type === 'critical' && (
                        <button className="px-6 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
                          Take Immediate Action
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
