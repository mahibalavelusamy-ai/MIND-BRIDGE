import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  UserCircle, 
  ClipboardCheck, 
  BarChart3, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Moon, 
  Sun,
  ChevronRight,
  ChevronDown,
  Plus,
  Settings,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Heart,
  Users,
  Shield,
  LineChart,
  Lightbulb,
  Link,
  Lock,
  Eye,
  EyeOff,
  ChevronUp,
  Search,
  CheckCircle2,
  ShoppingCart,
  CalendarDays
} from 'lucide-react';
import { cn, getGradientForChild } from './lib/utils';
import { Child, Alert } from './types';
import { 
  auth, 
  db, 
  loginWithGoogle,
  handleGoogleRedirectResult, 
  logout as firebaseLogout, 
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  OperationType,
  handleFirestoreError,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  writeBatch,
  clearAppPersistence,
  orderBy
} from './lib/firebase';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ProfileSettingsModal from './components/ProfileSettingsModal';
import ChildProfile from './components/ChildProfile';
import Assessment from './components/Assessment';
import Reports from './components/Reports';
import Alerts from './components/Alerts';
import SchoolDashboard from './components/SchoolDashboard';
import ProfileVaultModal from './components/ProfileVaultModal';

import WellnessShop from './components/WellnessShop';
import ScheduleAI from './components/ScheduleAI';

type Page = 'landing' | 'user-type' | 'login' | 'app';
type Tab = 'home' | 'profile' | 'assessment' | 'reports' | 'alerts' | 'shop' | 'schedule';

const APP_VERSION = "1.2.0";

const useDataMigration = (user: any, children: Child[], alerts: Alert[], setChildren: React.Dispatch<React.SetStateAction<Child[]>>) => {
  useEffect(() => {
    if (!user) return;
    const runMigration = async () => {
      try {
        const storedVersion = localStorage.getItem('appVersion');
        if (storedVersion === APP_VERSION) return;

        const batch = writeBatch(db);
        let hasUpdates = false;

        const updatedChildren = [...children];

        for (let i = 0; i < updatedChildren.length; i++) {
          const child = updatedChildren[i];
          if (child.pinSet === undefined || child.creditsEarned === undefined) {
             const childRef = doc(db, 'children', child.id);
             batch.update(childRef, { 
               pinSet: child.pinSet ?? false, 
               creditsEarned: child.creditsEarned ?? 10 
             });
             updatedChildren[i] = { ...child, pinSet: child.pinSet ?? false, creditsEarned: child.creditsEarned ?? 10 };
             hasUpdates = true;
          }
        }

        for (const alert of alerts) {
          if (alert.read === undefined) {
             const alertRef = doc(db, 'alerts', alert.id);
             batch.update(alertRef, { read: false });
             hasUpdates = true;
          }
        }
        
        if (hasUpdates) {
          await batch.commit();
          setChildren(updatedChildren);
        }
        
        localStorage.setItem('appVersion', APP_VERSION);
      } catch (error) {
         console.error("Migration failed", error);
         console.warn(`Action Required: Add ${window.location.origin} to Firebase Authorized Domains.`);
      }
    };
    
    if (children.length > 0 || alerts.length > 0) {
        runMigration();
    }
  }, [user, children, alerts, setChildren]);
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') !== 'light';
    }
    return true;
  });
  const [user, setUser] = useState<any>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [pinModalProfile, setPinModalProfile] = useState<Child | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState<{ show: boolean; level: number; childName: string }>({ show: false, level: 0, childName: '' });
  const [creditsToast, setCreditsToast] = useState<{show: boolean; amount: number}>({show: false, amount: 0});
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  

  const [privacyBlur, setPrivacyBlur] = useState(false);

  // Profile Creation UI state
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', age: '', grade: '', avatar: '👦', gender: 'male' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Email Auth
  const [emailAuth, setEmailAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authErrorContent, setAuthErrorContent] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainScrollRef = React.useRef<HTMLElement>(null);

  // Privacy: State Purge
  const clearState = () => {
    setSelectedChild(null);
    setChildren([]);
    setAlerts([]);
    setIsAuthenticatedSession(false);
  };

  useDataMigration(user, children, alerts, setChildren);

  useEffect(() => {
    const handleGlobalError = (event: Event) => {
      const customEvent = event as CustomEvent;
      let errorMessage = "An unexpected error occurred.";
      
      if (customEvent.detail && customEvent.detail.error) {
        const errStr = customEvent.detail.error;
        if (errStr.includes('Missing or insufficient permissions') || errStr.includes('permission-denied')) {
          errorMessage = "You don't have permission to access this data.";
        } else if (errStr.includes('offline') || errStr.includes('network')) {
          errorMessage = "You appear to be offline. Please check your internet connection.";
        } else if (errStr.includes('quota')) {
          errorMessage = "The application has reached its usage limit. Please try again later.";
        } else {
          errorMessage = errStr;
        }
      }
      
      setErrorToast({ show: true, message: errorMessage });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 6000);
    };

    window.addEventListener('firestore-error', handleGlobalError);
    return () => window.removeEventListener('firestore-error', handleGlobalError);
  }, []);

  useEffect(() => {
    handleGoogleRedirectResult().catch((error) => {
      console.error("Redirect result error on mount:", error);
      setAuthErrorContent(error?.message || "Google sign-in failed. Please try again.");
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setSelectedChild(null); // Strict Auth State Handling: Enforce Profile Gateway routing on refresh/load
      setIsAuthenticatedSession(false);
      if (firebaseUser) {
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          // New user logic (requires choosing role)
          setUser({ uid: firebaseUser.uid, requiresRole: true });
          setCurrentPage(prev => (prev === 'landing' ? 'landing' : 'user-type'));
        } else {
          setUser(userDoc.data());
          // Only automatically jump to 'app' if we are on 'login' or 'user-type'
          // If we are on 'landing', let the user click 'Get Started' to enter the app.
          setCurrentPage(prev => (prev === 'landing' ? 'landing' : 'app'));
        }
      } else {
        setUser(null);
        setCurrentPage('login');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.requiresRole) return;

    // Listen for children
    const childrenQuery = query(collection(db, 'children'), where('parentId', '==', auth.currentUser?.uid));
    const unsubscribeChildren = onSnapshot(childrenQuery, (snapshot) => {
      const childrenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child));
      
      setChildren(childrenData);
      
      if (selectedChild) {
        const updatedSelected = childrenData.find(c => c.id === selectedChild.id);
        if (updatedSelected) {
          setSelectedChild(updatedSelected);
        } else if (snapshot.size > 0 && childrenData.length > 0) {
          // Only reset if we actually have data but the child is truly missing
          setSelectedChild(null);
          setActiveTab('home');
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'children'));

    // Listen for alerts - Strictly filter by childId for session isolation
    const alertsConstraints: any[] = [];
    
    if (user.role === 'teacher' || user.role === 'clinician') {
      if (selectedChild) {
        alertsConstraints.push(where('childId', 'in', [selectedChild.id, 'all']));
      } else {
        // Fallback for teachers with no selected child, just don't fetch alerts to avoid blanket read issues
        alertsConstraints.push(where('childId', '==', 'no-op'));
      }
    } else {
      alertsConstraints.push(where('parentId', '==', auth.currentUser?.uid));
      if (selectedChild) {
        alertsConstraints.push(where('childId', 'in', [selectedChild.id, 'all']));
      }
    }
    
    alertsConstraints.push(orderBy('timestamp', 'desc'));

    const alertsQuery = query(
      collection(db, 'alerts'), 
      ...alertsConstraints
    );
    const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      setAlerts(alertsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'alerts'));

    return () => {
      unsubscribeChildren();
      unsubscribeAlerts();
    };
  }, [user, selectedChild?.id]);

  const hasCheckedStreak = React.useRef(false);

  useEffect(() => {
    if (!user || children.length === 0 || hasCheckedStreak.current) return;
    
    let isSubscribed = true;

    const checkStreaks = async () => {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const today = new Date(todayDateStr);

      // Create an array of update promises
      const resetPromises = children.map(async (c) => {
        if (c.streak && c.streak > 0 && c.lastAssessmentTimestamp) {
          const lastDateStr = new Date(c.lastAssessmentTimestamp).toISOString().split('T')[0];
          const lastDate = new Date(lastDateStr);
          const diffTime = today.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            hasCheckedStreak.current = true; // Mark as checked if we found ANY child to reset
            try {
              if (isSubscribed) {
                await updateDoc(doc(db, 'children', c.id), { streak: 0 });
              }
            } catch (error) {
              console.error("Failed to reset streak for child", c.id, error);
            }
          }
        }
      });
      
      // If we didn't mark it true during the loop but we have children, mark it done.
      hasCheckedStreak.current = true;
      
      await Promise.all(resetPromises);
    };

    checkStreaks();

    return () => {
      isSubscribed = false;
    };
  }, [user, children]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleMarkRead = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), { read: true });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'alerts');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    const originalAlerts = [...alerts];
    
    // 1. Optimistic Update
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    
    try {
      // 2. Hard Delete from Firestore
      await deleteDoc(doc(db, 'alerts', alertId));
    } catch (error) {
      // 3. Revert on failure
      setAlerts(originalAlerts);
      setErrorToast({ show: true, message: 'Failed to resolve alert. Please check your connection.' });
      handleFirestoreError(error, OperationType.DELETE, 'alerts');
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorContent('');
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, emailAuth, passwordAuth);
      } else {
        await signInWithEmailAndPassword(auth, emailAuth, passwordAuth);
      }
    } catch (error: any) {
      if (error.code === 'auth/weak-password') {
        setAuthErrorContent('Password must be at least 8 characters and include a number and special character');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthErrorContent('This email is already registered.');
      } else if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
        setAuthErrorContent('Invalid email or password.');
      } else {
        setAuthErrorContent(error.message);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed", error);
        setAuthErrorContent(error?.message || "Google sign-in failed. Please try again.");
      }
    }
  };

  const handleUserTypeSelect = async (role: string) => {
    if (!auth.currentUser) return;
    const userData = {
      uid: auth.currentUser.uid,
      name: auth.currentUser.displayName || 'User',
      email: auth.currentUser.email || '',
      role: role,
      organization: '',
      creditsEarned: 10
    };
    await setDoc(doc(db, 'users', auth.currentUser.uid), userData);
    setUser(userData);
    setCurrentPage('app');
  };

  const [isAuthenticatedSession, setIsAuthenticatedSession] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleAssessmentError = React.useCallback((msg: string) => {
    setErrorToast({ show: msg !== '', message: msg });
  }, []);

  // Persistence Logic: Lock session after 30 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticatedSession) return;
    
    const updateActivity = () => {
      localStorage.setItem('auth_expiry_childId', (Date.now() + 30 * 60 * 1000).toString());
    };
    
    const checkExpiry = setInterval(() => {
      const expiry = localStorage.getItem('auth_expiry_childId');
      if (expiry && Date.now() > parseInt(expiry)) {
        setIsAuthenticatedSession(false);
        localStorage.removeItem('auth_expiry_childId');
      }
    }, 60000);

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);
    updateActivity(); // Init

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(checkExpiry);
    };
  }, [isAuthenticatedSession]);

  const handleProfileSelect = (child: Child) => {
    if (child.pin) {
      setPinModalProfile(child);
      setEnteredPin('');
      setPinError('');
      setIsShaking(false);
    } else {
      setSelectedChild(child);
      setIsAuthenticatedSession(true);
      localStorage.setItem('auth_expiry_childId', (Date.now() + 30 * 60 * 1000).toString());
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinModalProfile && enteredPin === pinModalProfile.pin) {
      setSelectedChild(pinModalProfile);
      setPinModalProfile(null);
      setEnteredPin('');
      setIsAuthenticatedSession(true);
      setIsShaking(false);
      localStorage.setItem('auth_expiry_childId', (Date.now() + 30 * 60 * 1000).toString());
    } else {
      setPinError('Incorrect PIN');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500); // 500ms shake duration
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSavingProfile(true);
    try {
      await addDoc(collection(db, 'children'), {
        ...newProfile,
        age: parseInt(newProfile.age),
        parentId: auth.currentUser.uid,
        riskLevel: 'low',
        moodScore: 7.0,
        stressLevel: 'Low',
        notes: '',
        lastCheckIn: 'Never',
        gems: 10,
        creditsEarned: 10,
        streak: 0,
        level: 1,
        pin: null,
        pinSet: false
      });
      setIsCreatingProfile(false);
      setNewProfile({ name: '', age: '', grade: '', avatar: '👦', gender: 'male' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'children');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    clearState();
    await firebaseLogout();
  };

  const handleStart = () => {
    if (user) {
      if (user.requiresRole) {
        setCurrentPage('user-type');
      } else {
        setCurrentPage('app');
      }
    } else {
      setCurrentPage('login');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentPage === 'landing') {
    return <LandingPage onStart={handleStart} />;
  }

  if (currentPage === 'user-type') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
        <div className="max-w-xl w-full text-center">
          <h2 className="text-3xl font-serif mb-2">Who are you?</h2>
          <p className="text-text-muted mb-8">Select your account type to continue</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button 
              onClick={() => handleUserTypeSelect('parent')}
              className="p-8 bg-surface border-2 border-border rounded-xl hover:border-accent transition-all text-center group flex flex-col justify-between"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform hidden sm:block">👨‍👩‍👧</div>
              <h3 className="font-semibold mb-1">Parent</h3>
              <p className="text-xs text-text-muted">Monitor child wellbeing</p>
            </button>
            <button 
              onClick={() => handleUserTypeSelect('teacher')}
              className="p-8 bg-surface border-2 border-border rounded-xl hover:border-accent transition-all text-center group flex flex-col justify-between"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform hidden sm:block">🏫</div>
              <h3 className="font-semibold mb-1">Teacher</h3>
              <p className="text-xs text-text-muted">Classroom wellness</p>
            </button>
            <button 
              onClick={() => handleUserTypeSelect('school_admin')}
              className="p-8 bg-surface border-2 border-border rounded-xl hover:border-accent transition-all text-center group flex flex-col justify-between"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform hidden sm:block">🏢</div>
              <h3 className="font-semibold mb-1">School Admin</h3>
              <p className="text-xs text-text-muted">Institution intelligence</p>
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (currentPage === 'login') {
    return (
      <div className="min-h-screen flex bg-bg">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-serif mb-2">{isSignUpMode ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="text-text-muted">{isSignUpMode ? 'Sign up to start using MindBridge' : 'Sign in to MindBridge to continue'}</p>
            </div>
            
            <form onSubmit={handleEmailAuthSubmit} className="space-y-4 mb-6">
              {authErrorContent && (
                <div className="p-3 bg-alert-500/10 border border-alert-500/20 rounded-xl text-alert-500 text-sm">
                  {authErrorContent}
                </div>
              )}
              <input
                type="email"
                placeholder="Email address"
                required
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent text-text-main"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={passwordAuth}
                onChange={(e) => setPasswordAuth(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent text-text-main"
              />
              <button type="submit" className="w-full bg-surface-2 text-text-main border border-border p-3 rounded-xl font-medium hover:bg-border transition-colors">
                {isSignUpMode ? 'Sign Up with Email' : 'Sign In with Email'}
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-bg text-text-muted">Or</span>
              </div>
            </div>

            <div className="space-y-4">
              <button onClick={handleLogin} className="w-full bg-accent text-bg p-3 rounded-xl font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
                Continue with Google →
              </button>
            </div>
            
            <div className="mt-8 flex flex-col items-center gap-2">
              <button 
                onClick={() => { setIsSignUpMode(!isSignUpMode); setAuthErrorContent(''); }} 
                className="text-text-muted text-sm hover:text-accent transition-colors"
              >
                {isSignUpMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
              <button onClick={() => setCurrentPage('landing')} className="text-text-dim text-sm hover:underline mt-4">← Back to Home</button>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-1 bg-accent-light items-center justify-center p-12">
          <div className="max-w-sm">
            <div className="text-5xl mb-6">🌱</div>
            <h2 className="text-3xl font-serif mb-4">Every child deserves to feel heard</h2>
            <p className="text-text-muted leading-relaxed">MindBridge gives caregivers the tools to detect, understand, and respond to children's mental health needs — before a crisis occurs.</p>
          </div>
        </div>
      </div>
    );
  }

  // PREMIUM GATEWAY UI
  if (currentPage === 'app' && !selectedChild && user?.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-text-main p-6 relative overflow-hidden animate-fade-in">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-50 animate-glow"></div>
        
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
          <div className="text-accent mb-12 flex justify-center">
             <div className="text-4xl font-sans font-bold text-text-main neon-text-blue">Mind<span className="text-accent neon-text">Bridge</span></div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-sans mb-16 text-center tracking-tight text-white font-light">
            Who's exploring today?
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {children.map(child => (
              <motion.button
                key={child.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleProfileSelect(child)}
                className="flex flex-col items-center group cursor-pointer"
              >
                <div className={cn(
                  "w-32 h-32 md:w-40 md:h-40 rounded-[2rem] border border-border group-hover:neon-border shadow-2xl flex items-center justify-center text-6xl mb-4 transition-all duration-300 relative overflow-hidden bg-surface-2",
                  child.age >= 18 ? getGradientForChild(child.id) : "from-slate-700 to-slate-900"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {child.age >= 18 ? <span className="font-sans text-text-main relative z-10">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : <span className="relative z-10">{child.avatar || '👧'}</span>}
                </div>
                <span className="text-slate-400 font-medium text-xl group-hover:text-accent transition-colors duration-300 group-hover:neon-text">{child.name}</span>
              </motion.button>
            ))}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreatingProfile(true)}
              className="flex flex-col items-center group cursor-pointer opacity-70 hover:opacity-100"
            >
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-surface/50 backdrop-blur-sm border-2 border-dashed border-border group-hover:neon-border flex items-center justify-center text-4xl mb-4 transition-all duration-300">
                <Plus className="text-slate-400 group-hover:text-accent transition-colors duration-300" size={48} />
              </div>
              <span className="text-slate-400 font-medium text-xl group-hover:text-accent transition-colors duration-300 group-hover:neon-text">Add Profile</span>
            </motion.button>
          </div>
          
        </div>
        
        {/* Subtle Sign Out at bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <button onClick={handleLogout} className="text-text-dim hover:text-text-main transition-colors font-medium text-sm">
            Sign Out
          </button>
        </div>

        {/* Profile Creation Modal */}
        {isCreatingProfile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-[2rem] border border-gray-700 shadow-2xl max-w-lg w-full mx-4 backdrop-blur-xl relative overflow-hidden">
               <div className="flex justify-between items-center mb-6 text-text-main">
                 <h3 className="text-2xl font-serif">Create Profile</h3>
                 <button onClick={() => setIsCreatingProfile(false)} className="text-text-dim hover:text-text-main"><X size={24} /></button>
               </div>
               <form onSubmit={handleCreateProfile} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <input required placeholder="Name" className="p-3 rounded-xl border border-border text-sm bg-surface-2 text-text-main placeholder-text-muted" value={newProfile.name} onChange={e => setNewProfile({...newProfile, name: e.target.value})} />
                   <input required type="number" placeholder="Age" className="p-3 rounded-xl border border-border text-sm bg-surface-2 text-text-main placeholder-text-muted" value={newProfile.age} onChange={e => {
                     const age = parseInt(e.target.value);
                     let grade = newProfile.grade;
                     let gender = newProfile.gender;
                     let avatar = newProfile.avatar;
                     if (!isNaN(age)) {
                       if (age >= 18) {
                         grade = 'College/University';
                         if (gender === 'other') gender = 'male'; 
                       }
                       if (age > 5 && avatar === '👶') {
                         avatar = '👦'; 
                       }
                     }
                     setNewProfile({...newProfile, age: e.target.value, grade, gender, avatar});
                   }} />
                   <select 
                      value={newProfile.gender || 'male'} 
                      onChange={e => setNewProfile({...newProfile, gender: e.target.value as any})}
                      className="p-3 rounded-xl border border-border text-sm bg-surface-2 text-text-main"
                    >
                      <option value="male">Boy</option>
                      <option value="female">Girl</option>
                      {(parseInt(newProfile.age) < 18 || !newProfile.age) && <option value="other">Other</option>}
                    </select>
                    <select 
                      value={newProfile.avatar || '👦'} 
                      onChange={e => setNewProfile({...newProfile, avatar: e.target.value})}
                      className="p-3 rounded-xl border border-border text-sm bg-surface-2 text-text-main"
                    >
                      <option value="👦">👦 Boy</option>
                      <option value="👧">👧 Girl</option>
                      {(parseInt(newProfile.age) <= 5 || !newProfile.age) && <option value="👶">👶 Toddler</option>}
                    </select>
                </div>
                <div className="mt-4">
                    <input 
                    placeholder="Grade" 
                    className={cn("w-full p-3 rounded-xl border border-border text-sm bg-surface-2 text-text-main placeholder-text-muted", parseInt(newProfile.age) >= 18 && "opacity-60 cursor-not-allowed")} 
                    value={newProfile.grade} 
                    onChange={e => setNewProfile({...newProfile, grade: e.target.value})} 
                    disabled={parseInt(newProfile.age) >= 18}
                  />
                </div>
                <button type="submit" disabled={isSavingProfile} className="w-full bg-accent text-bg dark:text-bg py-3 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all mt-6 disabled:opacity-50">
                  {isSavingProfile ? "Creating..." : "Save Profile"}
                </button>
               </form>
            </div>
          </div>
        )}

      {/* Global PIN Modal Duplicate for Gateway Early Return */}
      <AnimatePresence>
        {pinModalProfile && (
          <ProfileVaultModal
            child={pinModalProfile}
            enteredPin={enteredPin}
            setEnteredPin={setEnteredPin}
            pinError={pinError}
            isShaking={isShaking}
            onCancel={() => { setPinModalProfile(null); setPinError(''); setEnteredPin(''); }}
            onSubmit={handlePinSubmit}
            onRequestAdminReset={() => alert('An email has been sent to the account administrator/parent with instructions to reset this PIN.')}
          />
        )}
      </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-row bg-bg text-text-main">
      {/* Sidebar - Fixed Position Navigation */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-40 w-64 h-full border-r flex flex-col transition-transform duration-300 lg:translate-x-0 shadow-xl overflow-hidden",
        isDarkMode ? "bg-[#050505] border-zinc-800" : "bg-white border-slate-200",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Live Status Risk Indicator */}
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between shadow-sm">
          <div className="text-2xl font-serif font-bold text-white tracking-widest hidden lg:block">Mind<span className="text-emerald-500">Bridge</span></div>
          {/* Mobile close button */}
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-surface-2 rounded-lg text-text-muted">
             <X size={20} />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-2 rounded-full border border-border">
             <div className={cn(
               "w-2 h-2 rounded-full animate-pulse-soft",
               alerts.length > 0 && alerts.some(a => !a.read) ? "bg-red-500" : "bg-emerald-500"
             )} />
             <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Live</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 sidebar-scroll">
          
          {/* Mobile Profile Display */}
          <div className="lg:hidden mb-6 flex flex-col gap-4">
             {selectedChild && user?.role !== 'teacher' && (
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-3 p-3 bg-surface-2 border border-border rounded-xl"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-sm font-bold border border-emerald-500/50">
                    {selectedChild.age >= 18 ? selectedChild.name.charAt(0).toUpperCase() : selectedChild.avatar}
                  </div>
                  <span className="font-medium text-sm text-white">{selectedChild.name}</span>
                </button>
             )}
          </div>

          <div>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">Monitor</p>
             <nav className="space-y-1">
               <SidebarLink icon={<LayoutDashboard size={18} />} label={['teacher', 'school_admin'].includes(user?.role) ? "School Overview" : "Dashboard"} active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} />
               {['teacher', 'school_admin'].includes(user?.role) && <SidebarLink icon={<Users size={18} />} label="Classes" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} />}
               <SidebarLink
                 icon={<CalendarDays size={18} />}
                 label="Master Schedule"
                 active={activeTab === 'schedule'}
                 onClick={() => { setActiveTab('schedule'); setIsSidebarOpen(false); }}
               />
             </nav>
          </div>

          <div>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">Assessment & Analysis</p>
             <nav className="space-y-1">
               {!['teacher', 'school_admin'].includes(user?.role) && selectedChild && (
                 <>
                   <SidebarLink
                     icon={<ClipboardCheck size={18} />}
                     label={user?.role === 'student' ? "My Journey" : "Check-in"}
                     active={activeTab === 'assessment'}
                     onClick={() => { setActiveTab('assessment'); setIsSidebarOpen(false); }}
                   />
                   <SidebarLink
                     icon={<ShoppingCart size={18} />}
                     label="Wellness Shop"
                     active={activeTab === 'shop'}
                     onClick={() => { setActiveTab('shop'); setIsSidebarOpen(false); }}
                   />
                   <SidebarLink 
                     icon={<BarChart3 size={18} />} 
                     label={user?.role === 'student' ? "My Growth" : "Wellness Reports"} 
                     active={activeTab === 'reports'} 
                     onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} 
                   />
                 </>
               )}
               {['teacher', 'school_admin'].includes(user?.role) && (
                 <SidebarLink 
                   icon={<BarChart3 size={18} />} 
                   label="Classroom Analytics" 
                   active={activeTab === 'reports'} 
                   onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} 
                 />
               )}
             </nav>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="mt-auto p-4 border-t border-zinc-800/50 bg-black/40">
           {selectedChild && !['teacher', 'school_admin'].includes(user?.role) && (
              <button 
               onClick={() => setIsProfileSettingsOpen(true)} 
               className="w-full mb-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border text-slate-600 dark:text-zinc-400 font-medium hover:bg-surface-2 hover:text-slate-900 dark:hover:text-zinc-100 transition-all text-sm"
              >
                 <Settings size={16} />
                 Profile Settings
              </button>
           )}
           
           <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800/50">
             <button 
               onClick={() => setPrivacyBlur(!privacyBlur)}
               title="Privacy Blur"
               className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition-all text-cyan-500 drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]"
             >
               {privacyBlur ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
             </button>

             <button 
               onClick={() => setIsDarkMode(!isDarkMode)} 
               title="Toggle Theme"
               className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition-all text-amber-500 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]"
             >
               {isDarkMode ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
             </button>

             {selectedChild && !['teacher', 'school_admin'].includes(user?.role) && (
               <button 
                 onClick={() => setSelectedChild(null)} 
                 title="Switch Profile"
                 className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition-all text-accent drop-shadow-[0_0_4px_rgba(0,255,136,0.4)]"
               >
                 <UserCircle size={20} strokeWidth={2.5} />
               </button>
             )}

             <button 
               onClick={handleLogout} 
               title="Sign Out"
               className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition-all text-alert-500 drop-shadow-[0_0_4px_rgba(255,51,102,0.4)]"
             >
               <LogOut size={20} strokeWidth={2.5} />
             </button>
           </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Workspace */}
      <main 
        ref={mainScrollRef}
        onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 200)}
        className={cn(
          "flex-1 overflow-y-auto scroll-smooth relative flex flex-col",
          activeTab === 'assessment' ? "bg-white dark:bg-black" : "bg-bg",
          privacyBlur && "privacy-blur-active"
        )}
      >
        <header className={cn(
          "sticky top-0 z-20 backdrop-blur-md border-b border-border p-4 px-6 flex items-center justify-between",
          activeTab === 'assessment' ? "bg-white/90 dark:bg-black/90" : "bg-bg/90"
        )}>
            <div className="flex items-center gap-4">
               <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-text-main">
                 <Menu size={24} />
               </button>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                  onClick={() => setActiveTab('alerts')}
                  className="relative p-2.5 bg-surface-2 border border-border rounded-full text-text-muted hover:text-text-main hover:bg-surface transition-colors"
                 >
                   <Bell size={20} />
                   {alerts.filter(a => !a.read).length > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-alert-500 rounded-full border-2 border-surface animate-pulse-soft" />
                   )}
                 </button>
            </div>
        </header>

        <div className="p-4 md:p-8 flex-1 pb-20">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedChild?.id || 'none'}-${activeTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {selectedChild && selectedChild.pin && !isAuthenticatedSession && activeTab !== 'home' && user?.role !== 'teacher' ? (
                <div className="flex flex-col items-center justify-center p-20 animate-fade-in text-center h-full">
                  <div className="w-24 h-24 bg-surface border border-border rounded-3xl flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden mx-auto">
                     <div className="absolute inset-0 bg-accent/10"></div>
                     <Lock size={40} className="text-accent relative z-10" />
                  </div>
                  <h2 className="text-4xl font-serif mb-4 text-text-main">Vault Locked</h2>
                  <p className="text-text-muted mb-8 max-w-md mx-auto text-lg">
                    Access to {selectedChild.name}'s protected data requires authentication.
                  </p>
                  <button 
                    onClick={() => setPinModalProfile(selectedChild)} 
                    className="mx-auto bg-accent text-bg px-8 py-4 rounded-xl font-bold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 flex items-center gap-3"
                  >
                    <Shield size={20} />
                    Unlock Session
                  </button>
                </div>
              ) : (
                <>
                  {activeTab === 'home' && (
                    ['teacher', 'school_admin'].includes(user?.role) ? (
                      <SchoolDashboard user={user} initialTab="overview" privacyBlur={privacyBlur} />
                    ) : (
                      <Dashboard 
                        user={user} 
                        children={children} 
                        alerts={selectedChild && selectedChild.id !== 'temp_new' ? alerts.filter(a => a.childId === selectedChild.id || a.childId === 'all') : alerts} 
                        onViewProfile={(child) => { handleProfileSelect(child); }}
                        selectedChild={selectedChild}
                        setActiveTab={setActiveTab}
                        privacyBlur={privacyBlur}
                      />
                    )
                  )}
              {activeTab === 'profile' && (
                ['teacher', 'school_admin'].includes(user?.role) ? (
                  <SchoolDashboard user={user} initialTab="classes" privacyBlur={privacyBlur} />
                ) : selectedChild ? (
                  <ChildProfile 
                    child={selectedChild} 
                    onUpdate={(updated) => setSelectedChild(updated)}
                    onStartAssessment={() => setActiveTab('assessment')}
                    onDelete={() => { setSelectedChild(null); setActiveTab('home'); }}
                  />
                ) : (
                  <div className="text-center py-20">
                    <p className="text-text-muted text-lg">No profile selected.</p>
                    <p className="text-text-dim text-sm mt-2">Go back to the dashboard and select a child profile to continue.</p>
                    <button onClick={() => setActiveTab('home')} className="mt-6 px-6 py-2 bg-accent text-bg rounded-xl font-medium hover:bg-accent-hover transition-colors">
                      Go to Dashboard
                    </button>
                  </div>
                )
              )}
              {activeTab === 'assessment' && (
                selectedChild ? (
                  <Assessment 
                    child={selectedChild}
                    onError={handleAssessmentError}
                    onNavigateHome={() => setActiveTab('home')}
                    onComplete={(newLevel, childName, rewardAmount) => {
                      const currentLevel = selectedChild?.level || 1;
                      if (newLevel && newLevel > currentLevel) {
                        setLevelUpToast({ show: true, level: newLevel, childName: childName || 'Child' });
                        setTimeout(() => setLevelUpToast({ show: false, level: 0, childName: '' }), 5000);
                      } else {
                        setCreditsToast({ show: true, amount: rewardAmount || 10 });
                        setTimeout(() => setCreditsToast({ show: false, amount: 0 }), 5000);
                      }
                    }}
                  />
                ) : (
                  <div className="text-center py-20">
                    <p className="text-text-muted">Please select a profile first.</p>
                  </div>
                )
              )}
              {activeTab === 'reports' && (
                user?.role === 'teacher' ? (
                  <SchoolDashboard user={user} initialTab="analytics" />
                ) : (
                  <Reports children={selectedChild ? [selectedChild] : []} selectedChild={selectedChild} />
                )
              )}
              {activeTab === 'alerts' && (
                <Alerts 
                  alerts={selectedChild ? alerts.filter(a => a.childId === selectedChild.id || a.childId === 'all') : alerts} 
                  onDismiss={handleResolveAlert} 
                  onMarkRead={handleMarkRead}
                />
              )}
              {activeTab === 'schedule' && (
                <ScheduleAI />
              )}
              {activeTab === 'shop' && selectedChild && (
                <WellnessShop
                  isOpen={true}
                  onClose={() => setActiveTab('home')}
                  child={selectedChild}
                />
              )}
              {!selectedChild && activeTab !== 'home' && activeTab !== 'reports' && activeTab !== 'alerts' && activeTab !== 'assessment' && activeTab !== 'shop' && activeTab !== 'schedule' && (
                <div className="text-center py-20">
                  <p className="text-text-muted">Please add a child first from the dashboard.</p>
                  <button onClick={() => setActiveTab('home')} className="text-accent font-medium mt-2">Go to Dashboard</button>
                </div>
              )}
              </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Scroll To Top */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-8 right-8 z-50 p-3 bg-accent text-bg shadow-lg shadow-accent/20 rounded-full hover:bg-accent-hover transition-colors"
            >
              <ChevronUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
      {/* Level Up Toast */}
      <AnimatePresence>
        {levelUpToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-accent text-bg px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20"
          >
            <div className="text-4xl animate-bounce">🎉</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Level Up!</p>
              <p className="font-serif text-lg">{levelUpToast.childName} reached Level {levelUpToast.level}</p>
            </div>
            <button onClick={() => setLevelUpToast({ ...levelUpToast, show: false })} className="ml-4 p-1 hover:bg-bg/10 rounded-lg">
              <X size={20} />
            </button>
          </motion.div>
        )}
        {creditsToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-bg px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-4 border-2 border-emerald-400"
          >
            <div className="text-2xl"><CheckCircle2 size={32} /></div>
            <div>
              <p className="font-bold text-lg">Check-in Verified</p>
              <p className="text-sm font-medium opacity-90">+{creditsToast.amount} Credits Earned!</p>
            </div>
            <button onClick={() => setCreditsToast({ show: false, amount: 0 })} className="ml-4 p-1 hover:bg-bg/10 rounded-lg">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {errorToast.show && !!errorToast.message && (
          <motion.div 
            id="error-toast-container"
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-alert-50 text-alert-700 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-alert-200"
          >
            <div className="text-alert-500">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Error</p>
              <p className="font-medium text-sm">{errorToast.message}</p>
            </div>
            <button onClick={() => setErrorToast({ ...errorToast, show: false })} className="ml-4 p-1 hover:bg-alert-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>



      {isProfileSettingsOpen && selectedChild && (
        <ProfileSettingsModal
          child={selectedChild}
          userRole={user?.role}
          onClose={() => setIsProfileSettingsOpen(false)}
          onDelete={() => {
             setSelectedChild(null);
             setIsProfileSettingsOpen(false);
             setActiveTab('home');
          }}
        />
      )}
      


      {/* Global PIN Modal */}
      <AnimatePresence>
        {pinModalProfile && (
          <ProfileVaultModal
            child={pinModalProfile}
            enteredPin={enteredPin}
            setEnteredPin={setEnteredPin}
            pinError={pinError}
            isShaking={isShaking}
            onCancel={() => { setPinModalProfile(null); setPinError(''); setEnteredPin(''); }}
            onSubmit={handlePinSubmit}
            onRequestAdminReset={() => alert('An email has been sent to the account administrator/parent with instructions to reset this PIN.')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick, badge }: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative overflow-hidden group",
        active ? "bg-emerald-500/10 text-emerald-400" : "text-text-muted hover:bg-surface-2 hover:text-text-main"
      )}
    >
      {active && (
         <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_#10b981]" />
      )}
      <span className={cn("transition-colors", active ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-400")}>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_8px_#ef4444]">
          {badge}
        </span>
      )}
    </button>
  );
}

