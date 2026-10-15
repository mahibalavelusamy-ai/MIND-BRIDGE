import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-alert-500/15 border-b border-alert-500/30 text-alert-400 px-4 py-2.5 text-xs flex items-center justify-between z-50 sticky top-0 backdrop-blur-md"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-2.5 mx-auto">
          <WifiOff size={16} className="text-alert-500 shrink-0 animate-pulse" />
          <span className="font-medium">
            You are currently offline. Mind Bridge is operating in local cached mode. Actions will sync once reconnected.
          </span>
          <button
            onClick={() => window.location.reload()}
            className="ml-2 inline-flex items-center gap-1 underline hover:text-text-main text-[11px]"
            aria-label="Retry connection and reload"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
