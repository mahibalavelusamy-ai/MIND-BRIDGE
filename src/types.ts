export interface Child {
  id: string;
  name: string;
  age: number;
  grade: string;
  avatar: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastCheckIn: string;
  moodScore: number;
  stressLevel: 'Low' | 'Moderate' | 'High';
  notes: string;
  gems?: number;
  streak?: number;
  level?: number;
  consentToSchoolSharing?: boolean;
  connectedPlatforms?: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: string;
  teacher: string;
  studentCount: number;
  avgMood: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SchoolStats {
  totalStudents: number;
  atRiskCount: number;
  avgMood: number;
  moodTrend: number;
}

export interface ClassMoodData {
  day: string;
  classId: string;
  avgScore: number;
}

export interface AssessmentQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  childId: string;
}

export interface PredictiveRisk {
  childId: string;
  predictedRisk: 'low' | 'medium' | 'high';
  confidence: number;
  predictedTriggers: string[];
  preemptiveActions: string[];
  evidence: string[];
  horizonDays: number;
  timestamp: string;
}

export interface MoodData {
  day: string;
  score: number;
  childName: string;
}

export interface RootCauseAnalysis {
  id: string;
  childId: string;
  timestamp: string;
  primaryFactor: string;
  contributingFactors: string[];
  evidence: string[];
  explanation: string;
  confidence: number;
}

export interface BehavioralPattern {
  id: string;
  childId: string;
  type: 'cyclical' | 'trend' | 'behavioral';
  title: string;
  description: string;
  frequency: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface Anomaly {
  id: string;
  childId: string;
  timestamp: string;
  metric: string;
  deviation: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  id: string;
  childId: string;
  timestamp: string;
  type: 'activity' | 'resource' | 'strategy';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  context: string; // e.g., "Upcoming Exam", "Low Sleep Trend"
  actionLabel: string;
}

export interface SelfCheck {
  id: string;
  childId: string;
  timestamp: string;
  mood: number; // 1-5 (1: 😊, 3: 😐, 5: 😢)
  note: string;
  tags: string[];
}
