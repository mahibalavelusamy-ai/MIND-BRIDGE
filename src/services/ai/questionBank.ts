export interface BaseQuestion {
  id: string;
  category: string;
  text: string;
  options?: { label: string; value: number }[];
  isOpenEnded?: boolean;
}

export const QUESTION_BANK: BaseQuestion[] = [
  // Mood
  ...["How would you describe your mood today?", "What is your main emotion right now?", "How did you feel when you woke up this morning?", "How would you rate your patience today?", "Have you felt more happy or sad today?", "How balanced do your emotions feel today?", "How often did you smile today?", "How easily were you annoyed today?", "How peaceful do you feel right now?", "How would you describe your overall energy and mood?", "Did you experience any sudden mood changes today?", "How optimistic do you feel about tomorrow?", "How stressed did minor things make you feel today?", "How content are you with how today went?", "Did you feel mostly calm or anxious today?", "How energetic did you feel today?", "How relaxed did you feel in your free time?", "How hopeful do you feel right now?", "Did anything easily frustrate you today?", "How stable has your mood been today?"].map((text, i) => ({
    id: `mood_${i}`, category: 'mood', text, options: [
      { label: "Very Positive", value: 5 }, { label: "Positive", value: 4 }, { label: "Neutral", value: 3 }, { label: "Negative", value: 2 }, { label: "Very Negative", value: 1 }
    ]
  })),

  // Academic Stress
  ...["How stressful was your schoolwork today?", "Do you feel overwhelmed by your upcoming assignments?", "How difficult is it to keep up with classes right now?", "How worried are you about your grades?", "Did you feel pressured to perform well today?", "How much is homework affecting your free time?", "Do you feel capable of handling your school load?", "How stressed do exams or quizzes make you feel right now?", "Did you feel rushed to finish academic tasks today?", "How anxious do you feel about school tomorrow?"].map((text, i) => ({
    id: `acad_${i}`, category: 'academic_stress', text, options: [
      { label: "Not Stressful", value: 5 }, { label: "Slightly Stressful", value: 4 }, { label: "Moderately Stressful", value: 3 }, { label: "Very Stressful", value: 2 }, { label: "Extremely Stressful", value: 1 }
    ]
  })),

  // Sleep
  ...["How well did you sleep last night?", "Did you wake up feeling rested?", "How difficult was it to fall asleep?", "Did you wake up in the middle of the night?", "How would you rate your sleep quality?", "Did you feel sleepy during the day today?", "Do you feel like you need a nap?", "Is school related stress keeping you awake?", "How consistent is your sleep schedule this week?", "Did any screen time keep you awake?"].map((text, i) => ({
    id: `sleep_${i}`, category: 'sleep', text, options: [
      { label: "Very Well", value: 5 }, { label: "Well", value: 4 }, { label: "Okay", value: 3 }, { label: "Poorly", value: 2 }, { label: "Very Poorly", value: 1 }
    ]
  })),

  // Focus
  ...["How well could you concentrate today?", "Were you easily distracted during study time?", "How focused were you in your classes?", "Could you complete a task without breaking focus?", "How clear is your thinking today?", "Did you feel 'in the zone' at any point?", "How hard was it to pay attention?", "Did your mind wander often?", "How efficiently did you work today?", "How well did you retain information today?"].map((text, i) => ({
    id: `focus_${i}`, category: 'focus', text, options: [
      { label: "Extremely Focused", value: 5 }, { label: "Focused", value: 4 }, { label: "Normal", value: 3 }, { label: "Distracted", value: 2 }, { label: "Extremely Distracted", value: 1 }
    ]
  })),

  // Social
  ...["How connected did you feel with friends today?", "Did you enjoy talking with others today?", "Did you feel isolated from your peers?", "How well did you get along with classmates?", "Did you feel supported by friends today?", "How comfortable were you in group settings?", "Did you prefer being alone more than usual?", "Did anyone make you feel bad today?", "How easy was it to talk to others?", "Did you feel understood by the people around you?"].map((text, i) => ({
    id: `social_${i}`, category: 'social', text, options: [
      { label: "Very Connected", value: 5 }, { label: "Connected", value: 4 }, { label: "Neutral", value: 3 }, { label: "Isolated", value: 2 }, { label: "Very Isolated", value: 1 }
    ]
  })),
  
  // Motivation
  ...["How motivated are you to tackle tomorrow's tasks?", "Did you feel driven to complete your work today?", "How much effort did you put into your activities?", "Did you feel like giving up on a task today?", "How excited are you about your current goals?", "Did you procrastinate much today?", "How inspired do you feel?", "How easy was it to start your homework?","Do you feel purposeful in what you are learning?","How much do you care about finishing your tasks?"].map((text, i) => ({
    id: `motib_${i}`, category: 'motivation', text, options: [
      { label: "Highly Motivated", value: 5 }, { label: "Motivated", value: 4 }, { label: "Neutral", value: 3 }, { label: "Unmotivated", value: 2 }, { label: "Highly Unmotivated", value: 1 }
    ]
  })),

  // Confidence & Resilience
  ...["How confident do you feel in your abilities today?", "How well did you handle challenges today?", "Did a setback bother you for long?", "How much do you believe in yourself right now?", "Do you feel capable of solving your problems?", "How easily do you bounce back from mistakes?", "Did you doubt yourself today?", "How proud are you of your efforts today?", "Do you feel strong enough to handle stress?", "How comfortable are you standing up for yourself?"].map((text, i) => ({
    id: `conf_${i}`, category: 'confidence', text, options: [
      { label: "Very Confident", value: 5 }, { label: "Confident", value: 4 }, { label: "Neutral", value: 3 }, { label: "Unsure", value: 2 }, { label: "Very Unsure", value: 1 }
    ]
  })),

  // Digital Wellness
  ...["How would you rate your screen time today?", "Did social media make you feel anxious today?", "How easily could you step away from your devices?", "Did you feel overwhelmed by notifications today?", "How balanced was your digital life today?", "Did digital distractions interfere with your study?", "Did you compare yourself to others online today?", "How much time did you spend mindlessly scrolling?", "Did you feel pressured to reply to messages immediately?", "Did you take any screen breaks today?", "Did screen time affect your sleep last night?", "Did reading news or feeds make you feel stressed?", "How in control of your digital habits do you feel?", "Did you put your phone away during meals today?", "Did you feel eye strain from looking at screens?"].map((text, i) => ({
    id: `digw_${i}`, category: 'digital_wellness', text, options: [
      { label: "Optimal / No Issue", value: 5 }, { label: "Good", value: 4 }, { label: "Neutral", value: 3 }, { label: "Unhealthy", value: 2 }, { label: "Very Unhealthy", value: 1 }
    ]
  })),

  // Support System
  ...["Did you feel you had someone to talk to today?", "How well did your family or friends support you today?", "Did you feel heard when you shared your thoughts?", "How comfortable are you asking for help right now?", "Do you feel like people care about your wellbeing?", "Did you receive encouragement from anyone today?", "How easy is it for you to seek advice from an adult?", "Did anyone ask how you were doing today?", "Do you feel valued by your peer group?", "If you had a problem, do you know who to call?", "Did a mentor or teacher offer guidance today?", "How connected do you feel to your family today?", "Did someone do something nice for you today?", "How safe do you feel expressing your emotions to others?", "Did you feel a sense of belonging today?"].map((text, i) => ({
    id: `supp_${i}`, category: 'support_system', text, options: [
      { label: "Very Supported", value: 5 }, { label: "Supported", value: 4 }, { label: "Neutral", value: 3 }, { label: "Unsupported", value: 2 }, { label: "Very Unsupported", value: 1 }
    ]
  })),

  // Reflection (Open Ended)
  ...["What made you smile today?", "What challenged you today?", "What are you proud of today?", "What was the best part of your day?", "What would make tomorrow better?", "What did you learn about yourself today?", "What is one thing you are grateful for?", "Who helped you the most today?", "What was the hardest part of your day?", "What are you looking forward to this week?", "Is there something on your mind you want to share?", "What was your biggest win today?", "What is a positive thought you had today?", "Did anything surprising happen today?", "How did you manage a difficult situation today?"].map((text, i) => ({
    id: `ref_${i}`, category: 'reflection', text, isOpenEnded: true
  }))
];
