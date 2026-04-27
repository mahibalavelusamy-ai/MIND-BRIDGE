import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Bell, Info, Trash2, CheckCircle2, Check, Loader2, BellRing, BellOff } from 'lucide-react';
import { Alert } from '../types';
import { cn } from '../lib/utils';
import { db, collection, query, onSnapshot, orderBy } from '../lib/firebase';

interface AlertsProps {
  alerts: Alert[];
  onDismiss: (id: string) => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
}

export default function Alerts({ alerts, onDismiss, onMarkRead }: AlertsProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [readingIds, setReadingIds] = useState<Set<string>>(new Set());
  const [notifsEnabled, setNotifsEnabled] = useState(
    localStorage.getItem('notificationsEnabled') === 'true'
  );

  useEffect(() => {
    // Setting up the notification listener inside Alerts.tsx as requested
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Only trigger notifications if enabled and granted
      if (notifsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Check if read is false, and ensure it's a new alert (not old data loaded on mount)
            const isRecent = data.timestamp ? (new Date().getTime() - new Date(data.timestamp).getTime() < 1000 * 60) : true;
            if (!data.read && isRecent) {
              new Notification(data.title || 'New Alert', {
                body: data.description ? data.description.substring(0, 100) + '...' : 'A clinical concern requires your attention.',
                icon: '/favicon.ico'
              });
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [notifsEnabled]);

  const toggleNotifications = async () => {
    if (!notifsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          localStorage.setItem('notificationsEnabled', 'true');
          setNotifsEnabled(true);
        } else {
          alert("Notification permission denied. Please enable them in your browser settings.");
        }
      } else {
        alert("Your browser does not support notifications.");
      }
    } else {
      localStorage.setItem('notificationsEnabled', 'false');
      setNotifsEnabled(false);
    }
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.type === filter);

  const handleDismiss = async (id: string) => {
    try {
      setResolvingIds(prev => new Set(prev).add(id));
      await onDismiss(id);
    } catch (error) {
      alert("Failed to resolve alert. Please try again.");
      console.error(error);
    } finally {
      setResolvingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      setReadingIds(prev => new Set(prev).add(id));
      await onMarkRead(id);
    } catch (error) {
      console.error(error);
    } finally {
      setReadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown time';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(d);
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif tracking-tight flex items-center gap-3">
            Alert Center
            {alerts.filter(a => !a.read).length > 0 && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
          </h1>
          <p className="text-text-muted mt-1">Real-time mental health notifications and expert recommendations.</p>
        </div>
        <button
          onClick={toggleNotifications}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm",
            notifsEnabled 
              ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
              : "bg-surface-2 text-text-muted border hover:text-text-main border-border"
          )}
        >
          {notifsEnabled ? <BellRing size={16} /> : <BellOff size={16} />}
          {notifsEnabled ? "Push Notifications Enabled" : "Enable Push Notifications"}
        </button>
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
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-32 text-center glass-card"
            >
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-accent">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-serif">All clear!</h3>
              <p className="text-sm text-text-dim mt-2 max-w-sm mx-auto">No active alerts requiring your attention right now. Your child is stable and well.</p>
            </motion.div>
          ) : (
            filteredAlerts.map(alert => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative flex flex-col md:flex-row gap-6 p-8 glass-card transition-all",
                  alert.type === 'critical' ? "shadow-[0_8px_32px_rgba(220,38,38,0.15)]" : 
                  alert.type === 'warning' ? "shadow-[0_8px_32px_rgba(217,119,6,0.15)]" : 
                  "",
                  alert.read ? "opacity-60" : "opacity-100"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  alert.type === 'critical' ? "bg-red-100 text-red-600 border border-red-200" : 
                  alert.type === 'warning' ? "bg-amber-100 text-amber-600 border border-amber-200" : 
                  "bg-blue-100 text-blue-600 border border-blue-200"
                )}>
                  {alert.type === 'critical' ? <AlertCircle size={28} /> : 
                   alert.type === 'warning' ? <Bell size={28} /> : 
                   <Info size={28} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <h4 className={cn(
                      "text-xl font-serif font-semibold",
                      alert.type === 'critical' ? "text-red-800" : 
                      alert.type === 'warning' ? "text-amber-800" : 
                      "text-blue-800"
                    )}>{alert.title}</h4>
                    <div className="flex items-center gap-2">
                       {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" title="Unread" />
                       )}
                       <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit",
                        alert.type === 'critical' ? "bg-red-200 text-red-800" : 
                        alert.type === 'warning' ? "bg-amber-200 text-amber-800" : 
                        "bg-blue-200 text-blue-800"
                      )}>
                        {alert.type} Priority
                      </span>
                    </div>
                  </div>
                  <p className="text-base text-text-muted leading-relaxed mb-6">
                    {alert.description}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border">
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
                      Detected {formatDate(alert.timestamp)}
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {!alert.read && (
                        <button 
                          onClick={() => handleMarkRead(alert.id)}
                          disabled={readingIds.has(alert.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-surface-2 border border-border text-text-main text-xs font-bold rounded-xl hover:bg-white hover:text-accent disabled:opacity-50 transition-all shadow-sm"
                        >
                          {readingIds.has(alert.id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                          Mark as Read
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleDismiss(alert.id)}
                        disabled={resolvingIds.has(alert.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-surface-2 border border-border text-text-main text-xs font-bold rounded-xl hover:bg-white hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {resolvingIds.has(alert.id) ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 
                        {resolvingIds.has(alert.id) ? "Resolving..." : "Resolve"}
                      </button>
                      
                      {alert.type === 'critical' && (
                        <button className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
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

