import React, { useState } from 'react';
import { Child } from '../types';
import { db, doc, updateDoc, collection, addDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { Link, CheckCircle, School, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SchoolSyncProps {
  children: Child[];
}

const PLATFORMS = [
  { id: 'mycamu', name: 'MyCamu', description: 'Sync schedules, announcements, and grades.', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200', icon: <Smartphone size={24} /> },
  { id: 'canvas', name: 'Canvas', description: 'Sync assignments, due dates, and courses.', color: 'bg-red-100 text-red-700', border: 'border-red-200', icon: <School size={24} /> },
  { id: 'google_classroom', name: 'Google Classroom', description: 'Sync class streams and homework.', color: 'bg-green-100 text-green-700', border: 'border-green-200', icon: <School size={24} /> },
];

export default function SchoolSync({ children }: SchoolSyncProps) {
  const [connectingPlatform, setConnectingPlatform] = useState<{ childId: string, platformId: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ childId: string, status: 'success' | 'error', message: string } | null>(null);

  const handleConnect = async (child: Child, platformId: string) => {
    setConnectingPlatform({ childId: child.id, platformId });
    setSyncStatus(null);

    try {
      // Simulate OAuth / API Connection Delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      // 1. Update Child Document with connected platform
      const childRef = doc(db, 'children', child.id);
      const currentPlatforms = child.connectedPlatforms || [];
      if (!currentPlatforms.includes(platformId)) {
        await updateDoc(childRef, {
          connectedPlatforms: [...currentPlatforms, platformId]
        });
      }

      // 2. Simulate fetching and saving schedule data from the platform
      const mockSchedules = [
        {
          childId: child.id,
          title: 'Mathematics Mid-Term',
          type: 'exam',
          day: 'Wednesday',
          time: '10:00 AM',
          subject: 'Math',
          difficulty: 'high',
          source: platformId
        },
        {
          childId: child.id,
          title: 'Science Project Due',
          type: 'assignment',
          day: 'Friday',
          time: '11:59 PM',
          subject: 'Science',
          difficulty: 'medium',
          source: platformId
        },
        {
          childId: child.id,
          title: 'Parent-Teacher Meeting',
          type: 'event',
          day: 'Monday',
          time: '04:00 PM',
          subject: 'General',
          difficulty: 'low',
          source: platformId
        }
      ];

      for (const schedule of mockSchedules) {
        await addDoc(collection(db, 'schoolSchedules'), schedule);
      }

      setSyncStatus({ childId: child.id, status: 'success', message: `Successfully connected to ${PLATFORMS.find(p => p.id === platformId)?.name} and synced 3 new items.` });
      
      // Clear status after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000);

    } catch (error) {
      console.error("Error connecting platform:", error);
      setSyncStatus({ childId: child.id, status: 'error', message: 'Failed to connect. Please try again.' });
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (child: Child, platformId: string) => {
    try {
      const childRef = doc(db, 'children', child.id);
      const currentPlatforms = child.connectedPlatforms || [];
      await updateDoc(childRef, {
        connectedPlatforms: currentPlatforms.filter(p => p !== platformId)
      });
    } catch (error) {
      console.error("Error disconnecting platform:", error);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="page-header">
        <h1 className="text-4xl font-serif tracking-tight flex items-center gap-3">
          <Link className="text-accent" size={36} />
          School Integrations
        </h1>
        <p className="text-text-muted mt-1">Connect your child's school portal to automatically sync schedules, exams, and announcements.</p>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-border rounded-[2rem]">
          <School size={48} className="mx-auto text-text-dim mb-4 opacity-20" />
          <h3 className="text-xl font-serif font-bold mb-2">No Children Added</h3>
          <p className="text-text-muted">Add a child from the dashboard to set up school integrations.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {children.map(child => (
            <div key={child.id} className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center text-3xl">
                  {child.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold">{child.name}'s Integrations</h2>
                  <p className="text-sm text-text-muted">Manage connected school platforms</p>
                </div>
              </div>

              {syncStatus && syncStatus.childId === child.id && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl mb-6 flex items-start gap-3",
                    syncStatus.status === 'success' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                  )}
                >
                  {syncStatus.status === 'success' ? <CheckCircle size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                  <p className="text-sm font-medium">{syncStatus.message}</p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PLATFORMS.map(platform => {
                  const isConnected = child.connectedPlatforms?.includes(platform.id);
                  const isConnectingThis = connectingPlatform?.childId === child.id && connectingPlatform?.platformId === platform.id;

                  return (
                    <div key={platform.id} className={cn(
                      "p-6 rounded-3xl border transition-all flex flex-col justify-between",
                      isConnected ? "bg-surface-2 border-border" : "bg-white border-border hover:border-accent/30"
                    )}>
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", platform.color)}>
                            {platform.icon}
                          </div>
                          {isConnected && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-100 px-3 py-1 rounded-full">
                              <CheckCircle size={12} /> Connected
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-lg mb-2">{platform.name}</h4>
                        <p className="text-sm text-text-muted leading-relaxed mb-6">{platform.description}</p>
                      </div>
                      
                      <div>
                        {isConnected ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleConnect(child, platform.id)}
                              disabled={isConnectingThis}
                              className="flex-1 py-3 bg-white border border-border rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-surface-2 transition-all"
                            >
                              {isConnectingThis ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                              Sync Now
                            </button>
                            <button 
                              onClick={() => handleDisconnect(child, platform.id)}
                              className="px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleConnect(child, platform.id)}
                            disabled={isConnectingThis}
                            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-accent-hover transition-all shadow-sm disabled:opacity-70"
                          >
                            {isConnectingThis ? (
                              <>
                                <RefreshCw size={16} className="animate-spin" /> Connecting...
                              </>
                            ) : (
                              <>
                                <Link size={16} /> Connect {platform.name}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
