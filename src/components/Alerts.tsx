import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Bell, Info, Trash2, CheckCircle2, Check, Loader2, BellRing, BellOff, Settings, X } from 'lucide-react';
import { Alert } from '../types';
import { cn } from '../lib/utils';
import { db, collection, query, onSnapshot, getDocs, orderBy, where, auth, updateDoc, addDoc, doc, deleteDoc } from '../lib/firebase';

interface AlertsProps {
  alerts: Alert[];
  onDismiss: (id: string) => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
}

export default function Alerts({ alerts, onDismiss, onMarkRead }: AlertsProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState({
    critical: Number(localStorage.getItem('alert_threshold_critical') ?? 80),
    warning: Number(localStorage.getItem('alert_threshold_warning') ?? 50),
    info: Number(localStorage.getItem('alert_threshold_info') ?? 0)
  });
  
  const handleThresholdChange = (type: 'critical' | 'warning' | 'info', value: number) => {
    setThresholds(prev => ({ ...prev, [type]: value }));
    localStorage.setItem(`alert_threshold_${type}`, value.toString());
  };

  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  const handleAcceptConnection = async (alert: any) => {
    if (!alert.caretakerId || !auth.currentUser) return;
    try {
      setAcceptingIds(prev => new Set(prev).add(alert.id));
      
      // Update the relationship
      const relQuery = query(
        collection(db, 'relationships'), 
        where('caretakerId', '==', alert.caretakerId), 
        where('studentId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const snap = await getDocs(relQuery);
      const updates = snap.docs.map(d => updateDoc(d.ref, { status: 'approved' }));
      await Promise.all(updates);
      
      // Notify the caretaker
      await addDoc(collection(db, 'alerts'), {
        type: 'info',
        title: 'Connection Accepted',
        description: `Student ${auth.currentUser.email} has accepted your monitoring request.`,
        parentId: alert.caretakerId,
        childId: auth.currentUser?.uid || 'all',
        timestamp: new Date().toISOString(),
        status: 'active'
      });

      // Dismiss the request alert
      await handleDismiss(alert.id);
      
    } catch (error) {
      console.error(error);
      alert('Failed to accept connection.');
    } finally {
      setAcceptingIds(prev => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };
  const [readingIds, setReadingIds] = useState<Set<string>>(new Set());
  const [notifsEnabled, setNotifsEnabled] = useState(
    localStorage.getItem('notificationsEnabled') === 'true'
  );
  
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Only trigger notifications if enabled and granted
    if (notifsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      alerts.forEach((alert) => {
        // Check if read is false, and ensure it's a new alert (not old data loaded on mount)
        const isRecent = alert.timestamp ? (new Date().getTime() - new Date(alert.timestamp).getTime() < 1000 * 60 * 5) : true;
        
        // Use a simple tracking mechanism using localStorage or session to avoid duplicate notifications
        const notifiedKey = `notified_${alert.id}`;
        if (!alert.read && isRecent && !sessionStorage.getItem(notifiedKey)) {
          new Notification(alert.title || 'New Alert', {
            body: alert.description ? alert.description.substring(0, 100) + '...' : 'A clinical concern requires your attention.',
            icon: '/favicon.ico'
          });
          sessionStorage.setItem(notifiedKey, 'true');
        }
      });
    }
  }, [alerts, notifsEnabled]);

  const toggleNotifications = async () => {
    if (!notifsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          localStorage.setItem('notificationsEnabled', 'true');
          setNotifsEnabled(true);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
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
    <div className="space-y-8 animate-fade-in pb-12 relative">
      <AnimatePresence>
        {showToast && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-surface-2 border-2 border-emerald-500/50 text-emerald-400 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm"
           >
             <CheckCircle2 size={18} />
             Notifications successfully enabled!
           </motion.div>
        )}
      </AnimatePresence>
      <div className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif tracking-tight flex items-center gap-3 text-text-main">
            {auth.currentUser && auth.currentUser.uid === alerts[0]?.parentId ? "Inbox / Requests" : "Alert Center"}
            {alerts.filter(a => !a.read).length > 0 && <span className="w-3 h-3 bg-alert-500 rounded-full animate-pulse shadow-md" />}
          </h1>
          <p className="text-text-muted mt-1">Real-time notifications and expert recommendations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border bg-surface-2 text-text-muted hover:text-text-main border-border hover:border-accent"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={toggleNotifications}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border",
              notifsEnabled 
                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/50"
                : "bg-surface-2 text-text-muted hover:text-text-main border-border hover:border-accent"
            )}
          >
            {notifsEnabled ? <BellRing size={16} /> : <BellOff size={16} />}
            {notifsEnabled ? "Push Notifications Enabled" : "Enable Push Notifications"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-surface-2 border border-border rounded-2xl mb-6 relative mt-4">
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-main p-1"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-serif font-bold text-text-main mb-2 flex items-center gap-2">
                <Settings size={20} className="text-accent" />
                Notification Threshold Settings
              </h3>
              <p className="text-sm text-text-dim mb-6 max-w-2xl">
                Define the minimum risk-score required for alerts of each severity level to appear in your inbox or trigger push notifications. (Alerts generated from assessments with scores below their respective thresholds will be suppressed).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-alert-500 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Critical Alerts
                    </label>
                    <span className="text-sm font-mono text-alert-500">{thresholds.critical}+</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={thresholds.critical} 
                    onChange={(e) => handleThresholdChange('critical', parseInt(e.target.value))}
                    className="w-full accent-alert-500" 
                  />
                  <p className="text-xs text-text-muted">High priority clinical interventions and severe risk warnings.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-alert-400 flex items-center gap-2">
                      <Bell size={16} />
                      Warning Alerts
                    </label>
                    <span className="text-sm font-mono text-alert-400">{thresholds.warning}+</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={thresholds.warning} 
                    onChange={(e) => handleThresholdChange('warning', parseInt(e.target.value))}
                    className="w-full accent-alert-400" 
                  />
                  <p className="text-xs text-text-muted">Moderate behavioral observations and schedule deviations.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-accent flex items-center gap-2">
                      <Info size={16} />
                      Info Alerts
                    </label>
                    <span className="text-sm font-mono text-accent">{thresholds.info}+</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={thresholds.info} 
                    onChange={(e) => handleThresholdChange('info', parseInt(e.target.value))}
                    className="w-full accent-accent" 
                  />
                  <p className="text-xs text-text-muted">General wellness updates, connection requests, and helpful insights.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 p-1.5 bg-surface border border-border rounded-2xl w-fit shadow-sm">
        {(['all', 'critical', 'warning', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
              filter === f ? "border-accent bg-accent text-bg shadow-lg shadow-accent/20" : "border-border text-text-dim hover:text-text-main hover:border-accent/50 bg-surface-2"
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
                  "group relative flex flex-col md:flex-row gap-6 p-8 bg-surface-2 border border-border border-l-4 transition-all rounded-[2rem]",
                  alert.type === 'critical' ? "border-l-alert-500 shadow-lg hover:border-alert-500/50" : 
                  alert.type === 'warning' ? "border-l-alert-300 shadow-md hover:border-alert-300/50" : 
                  "border-l-accent shadow-sm hover:border-accent/50",
                  alert.read ? "opacity-60" : "opacity-100"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                  alert.type === 'critical' ? "bg-alert-100 text-alert-600 border-alert-200" : 
                  alert.type === 'warning' ? "bg-alert-50 text-alert-500 border-alert-100" : 
                  "bg-accent-light text-accent border-accent/20"
                )}>
                  {alert.type === 'critical' ? <AlertCircle size={28} /> : 
                   alert.type === 'warning' ? <Bell size={28} /> : 
                   <Info size={28} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <h4 className="text-xl font-serif font-bold text-text-main">
                      {alert.title}
                    </h4>
                    <div className="flex items-center gap-2">
                       {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-sm" title="Unread" />
                       )}
                       <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit",
                        alert.type === 'critical' ? "bg-alert-200 text-alert-700" : 
                        alert.type === 'warning' ? "bg-alert-100 text-alert-600" : 
                        "bg-accent-light text-accent"
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
                          className="flex items-center gap-1.5 px-4 py-2 bg-surface-2 border border-border text-text-main text-xs font-bold rounded-xl hover:bg-bg hover:text-accent disabled:opacity-50 transition-all shadow-sm"
                        >
                          {readingIds.has(alert.id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                          Mark as Read
                        </button>
                      )}
                      
                      {!alert.isConnectionRequest && (
                        <button 
                          onClick={() => handleDismiss(alert.id)}
                          disabled={resolvingIds.has(alert.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-surface-2 border border-border text-text-main text-xs font-bold rounded-xl hover:bg-bg hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          {resolvingIds.has(alert.id) ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 
                          {resolvingIds.has(alert.id) ? "Resolving..." : "Resolve"}
                        </button>
                      )}
                      
                      {alert.type === 'critical' && !alert.isConnectionRequest && (
                        <button className="px-5 py-2 bg-alert-600 text-bg text-xs font-bold rounded-xl hover:bg-alert-700 transition-all shadow-lg shadow-alert-600/20">
                          Take Immediate Action
                        </button>
                      )}
                      
                      {alert.isConnectionRequest && (
                         <div className="flex gap-2">
                           <button 
                             onClick={() => handleDismiss(alert.id)}
                             disabled={resolvingIds.has(alert.id)}
                             className="flex items-center gap-1.5 px-6 py-2 bg-surface border border-alert-500/50 text-alert-500 text-xs font-bold rounded-xl hover:bg-alert-500/10 disabled:opacity-50 transition-all shadow-sm"
                           >
                             Deny
                           </button>
                           <button 
                             onClick={() => handleAcceptConnection(alert)}
                             disabled={acceptingIds.has(alert.id)}
                             className="flex items-center gap-1.5 px-6 py-2 bg-accent text-bg text-xs font-bold rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-all shadow-sm"
                           >
                             {acceptingIds.has(alert.id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                             Accept Connection
                           </button>
                         </div>
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

