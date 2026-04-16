import { Child, AssessmentQuestion, Alert, MoodData } from './types';

export const MOCK_CHILDREN: Child[] = [
  {
    id: '1',
    name: 'Arjun Sharma',
    age: 10,
    grade: 'Grade 5',
    avatar: '👦',
    riskLevel: 'low',
    lastCheckIn: 'Today',
    moodScore: 7.4,
    stressLevel: 'Low',
    notes: 'Arjun is a curious and active child. Plays football. Has been showing mild signs of exam-related stress over the past 2 weeks.'
  },
  {
    id: '2',
    name: 'Priya Sharma',
    age: 7,
    grade: 'Grade 2',
    avatar: '👧',
    riskLevel: 'high',
    lastCheckIn: 'Yesterday',
    moodScore: 3.8,
    stressLevel: 'High',
    notes: 'Priya has been more withdrawn lately. She seems less interested in her favorite activities.'
  }
];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  { id: '1', category: 'Mood', question: "How has your child been feeling overall this week?", options: ["🌟 Very happy and positive", "😊 Generally good", "😐 Mixed — some good, some bad", "😔 Mostly sad or low", "😫 Very upset or distressed"] },
  { id: '2', category: 'Energy', question: "How has your child's energy and motivation been?", options: ["⚡ Full of energy every day", "💪 Usually energetic", "😴 Some days tired", "📉 Often tired or low energy", "🛑 Exhausted most of the time"] },
  { id: '3', category: 'Sleep', question: "How well has your child been sleeping?", options: ["💤 Sleeping very well", "🌙 Mostly good sleep", "⏰ Occasional bad nights", "🔦 Frequently waking up", "🚫 Very poor sleep most nights"] },
  { id: '4', category: 'Social', question: "How comfortable does your child seem with friends and family?", options: ["🤝 Very social and happy", "👋 Mostly comfortable", "🚶 Sometimes withdrawn", "🏠 Often prefers to be alone", "🚪 Avoids all social interactions"] },
  { id: '5', category: 'Stress', question: "Have you noticed signs of stress or anxiety?", options: ["🧘 No signs at all", "🍃 Very mild occasionally", "🌪️ Moderate — manageable", "🌩️ Quite stressed frequently", "🌋 Severely stressed or anxious"] },
  { id: '6', category: 'Behavior', question: "How has your child's behavior been (e.g., tantrums, cooperation)?", options: ["✨ Very cooperative and calm", "👍 Generally well-behaved", "🗯️ Occasional outbursts", "💥 Frequent behavioral issues", "🔥 Very difficult to manage"] }
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'critical',
    title: 'High stress detected — Priya Sharma',
    description: 'AI analysis detected severe stress indicators across the last 3 assessments. Mood score dropped to 3.2/10.',
    timestamp: 'Today, 9:41 AM',
    childId: '2'
  },
  {
    id: 'a2',
    type: 'warning',
    title: 'Low mood score — Arjun Sharma',
    description: 'Arjun\'s mood score has dropped below the baseline (6.0) for 2 consecutive days.',
    timestamp: 'Yesterday, 4:15 PM',
    childId: '1'
  }
];

export const MOCK_MOOD_DATA: MoodData[] = [
  { day: 'Mon', score: 7, childName: 'Arjun' },
  { day: 'Tue', score: 6.5, childName: 'Arjun' },
  { day: 'Wed', score: 7.8, childName: 'Arjun' },
  { day: 'Thu', score: 7.2, childName: 'Arjun' },
  { day: 'Fri', score: 8, childName: 'Arjun' },
  { day: 'Sat', score: 6.8, childName: 'Arjun' },
  { day: 'Sun', score: 7.4, childName: 'Arjun' },
];
