import React, { useState, useEffect } from 'react';
import { Child, PredictiveRisk } from '../types';
import { db, collection, query, where, getDocs, orderBy, limit } from '../lib/firebase';
import { predictFutureRisk } from '../lib/predictiveService';
import { LineChart as LineChartIcon, ShieldAlert, Info, Target, Zap, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface ForecastsProps {
  children: Child[];
}

export default function Forecasts({ children }: ForecastsProps) {
  const [forecasts, setForecasts] = useState<Record<string, PredictiveRisk>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllForecasts = async () => {
      setIsLoading(true);
      const newForecasts: Record<string, PredictiveRisk> = {};
      
      for (const child of children) {
        try {
          const qA = query(
            collection(db, 'assessments'), 
            where('childId', '==', child.id),
            orderBy('timestamp', 'desc'),
            limit(7)
          );
          const snapA = await getDocs(qA);
          const assessments = snapA.docs.map(d => d.data());

          const qS = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
          const snapS = await getDocs(qS);
          const scheduleData = snapS.docs.map(d => d.data());

          const pred = await predictFutureRisk(child.id, assessments, scheduleData);
          if (pred) {
            newForecasts[child.id] = pred;
          }
        } catch (error) {
          console.error(`Error fetching forecast for ${child.name}:`, error);
        }
      }
      
      setForecasts(newForecasts);
      setIsLoading(false);
    };

    if (children.length > 0) {
      fetchAllForecasts();
    } else {
      setIsLoading(false);
    }
  }, [children]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="page-header">
        <h1 className="text-4xl font-serif tracking-tight flex items-center gap-3">
          <LineChartIcon className="text-accent" size={36} />
          Risk Forecasts
        </h1>
        <p className="text-text-muted mt-1">Predictive mental health outlook for the next 7 days.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-surface border border-border rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-border rounded-[2rem]">
          <Activity size={48} className="mx-auto text-text-dim mb-4 opacity-20" />
          <h3 className="text-xl font-serif font-bold mb-2">No Children Added</h3>
          <p className="text-text-muted">Add a child from the dashboard to see their risk forecasts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {children.map(child => {
            const prediction = forecasts[child.id];
            
            return (
              <div key={child.id} className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center text-3xl">
                    {child.avatar}
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold">{child.name}</h2>
                    <p className="text-sm text-text-muted">7-Day Outlook</p>
                  </div>
                </div>

                {prediction ? (
                  <div className="space-y-6 relative z-10">
                    <div className={cn(
                      "p-6 rounded-2xl border flex items-center justify-between",
                      prediction.predictedRisk === 'low' ? "bg-green-50 border-green-100 text-green-700" :
                      prediction.predictedRisk === 'medium' ? "bg-amber-50 border-amber-100 text-amber-700" :
                      "bg-red-50 border-red-100 text-red-700"
                    )}>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1">Predicted Risk</p>
                        <p className="text-3xl font-serif font-bold capitalize">{prediction.predictedRisk}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-widest mb-1">Confidence</p>
                        <p className="text-3xl font-serif font-bold">{prediction.confidence}%</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-text-dim uppercase flex items-center gap-2">
                        <Info size={16} /> Model Evidence
                      </h4>
                      <ul className="space-y-2">
                        {prediction.evidence.map((e, i) => (
                          <li key={i} className="text-sm text-text-main leading-relaxed flex items-start gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-text-dim uppercase flex items-center gap-2">
                          <Target size={14} /> Potential Triggers
                        </h4>
                        <ul className="space-y-2">
                          {prediction.predictedTriggers.map((t, i) => (
                            <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-text-dim mt-2 shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-text-dim uppercase flex items-center gap-2">
                          <Zap size={14} /> Preemptive Actions
                        </h4>
                        <ul className="space-y-2">
                          {prediction.preemptiveActions.map((a, i) => (
                            <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-border rounded-2xl">
                    <ShieldAlert size={32} className="mx-auto text-text-dim mb-3 opacity-20" />
                    <p className="text-sm text-text-dim italic">Insufficient data to generate a forecast.</p>
                    <p className="text-xs text-text-muted mt-1">Complete more assessments to unlock predictions.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
