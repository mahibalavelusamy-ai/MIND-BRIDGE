import React, { useState, useEffect } from 'react';
import { Child, Recommendation } from '../types';
import { db, collection, query, where, getDocs, orderBy, limit } from '../lib/firebase';
import { generateRecommendations } from '../lib/recommendationService';
import { Lightbulb, ArrowRight, Coffee, Sparkles, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface RecommendationsProps {
  children: Child[];
  setActiveTab: (tab: any) => void;
}

export default function Recommendations({ children, setActiveTab }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Record<string, Recommendation[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllRecommendations = async () => {
      setIsLoading(true);
      const newRecs: Record<string, Recommendation[]> = {};
      
      for (const child of children) {
        try {
          const qA = query(
            collection(db, 'assessments'),
            where('childId', '==', child.id)
          );
          const snapA = await getDocs(qA);
          const assessments = snapA.docs
            .map(d => d.data())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);

          const qS = query(collection(db, 'schoolSchedules'), where('childId', '==', child.id));
          const snapS = await getDocs(qS);
          const schedule = snapS.docs.map(d => d.data());

          const recs = await generateRecommendations(child, assessments, schedule);
          newRecs[child.id] = recs;
        } catch (error) {
          console.error(`Error fetching recommendations for ${child.name}:`, error);
        }
      }
      
      setRecommendations(newRecs);
      setIsLoading(false);
    };

    if (children.length > 0) {
      fetchAllRecommendations();
    } else {
      setIsLoading(false);
    }
  }, [children]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="page-header">
        <h1 className="text-4xl font-serif tracking-tight flex items-center gap-3">
          <Lightbulb className="text-accent" size={36} />
          Personalized Recommendations
        </h1>
        <p className="text-text-muted mt-1">Adaptive strategies based on recent assessments and schedules.</p>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-surface border border-border rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-border rounded-[2rem]">
          <Activity size={48} className="mx-auto text-text-dim mb-4 opacity-20" />
          <h3 className="text-xl font-serif font-bold mb-2">No Children Added</h3>
          <p className="text-text-muted">Add a child from the dashboard to see personalized recommendations.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {children.map(child => {
            const recs = recommendations[child.id] || [];
            
            return (
              <div key={child.id} className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center text-3xl">
                    {child.avatar}
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold">{child.name}'s Action Plan</h2>
                    <p className="text-sm text-text-muted">Tailored strategies for current needs</p>
                  </div>
                </div>

                {recs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recs.map((rec) => (
                      <div key={rec.id} className="group p-6 bg-surface-2 rounded-3xl border border-border hover:border-accent/30 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                              rec.type === 'activity' ? "bg-blue-100 text-blue-700" :
                              rec.type === 'resource' ? "bg-purple-100 text-purple-700" :
                              "bg-orange-100 text-orange-700"
                            )}>
                              {rec.type}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase",
                              rec.priority === 'high' ? "text-red-500" : "text-text-dim"
                            )}>
                              {rec.priority} priority
                            </span>
                          </div>
                          <h4 className="font-bold text-lg mb-2 group-hover:text-accent transition-colors">{rec.title}</h4>
                          <p className="text-sm text-text-muted leading-relaxed mb-6">{rec.description}</p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-text-dim uppercase bg-white/50 p-3 rounded-xl border border-border">
                            <Coffee size={14} className="text-accent" />
                            <span className="flex-1 truncate" title={rec.context}>{rec.context}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (rec.actionLabel === 'Start Check-in') {
                                setActiveTab('assessment');
                              }
                            }}
                            className="w-full py-3 bg-white border border-border rounded-xl text-sm font-bold flex items-center justify-center gap-2 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-all shadow-sm"
                          >
                            {rec.actionLabel}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-border rounded-2xl">
                    <Sparkles size={32} className="mx-auto text-text-dim mb-3 opacity-20" />
                    <p className="text-sm text-text-dim italic">No specific recommendations at this time.</p>
                    <p className="text-xs text-text-muted mt-1">Keep logging data to receive personalized strategies.</p>
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
