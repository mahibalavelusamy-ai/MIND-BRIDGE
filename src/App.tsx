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
  CalendarDays,
  Wind,
  Share2
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
  getDocs,
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
import ProfileVaultModal from './components/ProfileVaultModal';
import CaretakerDashboard from './components/CaretakerDashboard';

import Connections from './components/Connections';

import WellnessShop from './components/WellnessShop';
import ScheduleAI from './components/ScheduleAI';
import AdminDashboard from './components/AdminDashboard';

type Page = 'landing' | 'user-type' | 'login' | 'app';
export type Tab = 'home' | 'profile' | 'assessment' | 'reports' | 'notifications' | 'shop' | 'schedule' | 'connections' | 'admin';

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
             const childRef = doc(db, 'students', child.id);
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
             const alertRef = doc(db, 'notifications', alert.id);
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
  const [currentPage, setCurrentPage] = useState<Page>('landing');
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

  const processAuthError = async (msg: string) => {
    setAuthErrorContent(msg);
    sessionStorage.clear();
    localStorage.removeItem('auth_expiry_childId');
    try {
      await firebaseLogout();
      await clearAppPersistence();
    } catch (e) {}
  };

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
      processAuthError(error?.message || "Google sign-in failed. Please try again.");
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
          const pendingRole = sessionStorage.getItem('pendingRole');
          if (pendingRole === 'admin') {
             if (firebaseUser.email !== 'mahibala2501@gmail.com') {
                 await processAuthError(`Access Denied: You do not have administrator privileges.`);
                 return;
             }
             const userData = {
               uid: firebaseUser.uid,
               name: firebaseUser.displayName || 'Admin',
               email: firebaseUser.email || '',
               role: 'admin',
               organization: '',
               creditsEarned: 0
             };
             await setDoc(doc(db, 'users', firebaseUser.uid), userData);
             setUser(userData);
             setCurrentPage('app');
             setTimeout(() => setActiveTab('admin'), 0);
          } else if (pendingRole === 'student') {
             const userData = {
               uid: firebaseUser.uid,
               name: firebaseUser.displayName || 'Student',
               email: firebaseUser.email || '',
               role: 'student',
               organization: '',
               creditsEarned: 10
             };
             await setDoc(doc(db, 'users', firebaseUser.uid), userData);
             try {
               await setDoc(doc(db, 'students', firebaseUser.uid), {
                 name: firebaseUser.displayName || 'Student',
                 avatar: '👤',
                 age: 18,
                 grade: 'College',
                 gender: 'other',
                 parentId: firebaseUser.uid,
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
             } catch (err) {}
             setUser(userData);
             setCurrentPage('app');
          } else if (pendingRole === 'caretaker') {
             const userData = {
               uid: firebaseUser.uid,
               name: firebaseUser.displayName || 'Caretaker',
               email: firebaseUser.email || '',
               role: 'caretaker',
               organization: '',
               creditsEarned: 0
             };
             await setDoc(doc(db, 'users', firebaseUser.uid), userData);
             setUser(userData);
             setCurrentPage('app');
          } else {
             setUser({ uid: firebaseUser.uid, requiresRole: true });
             setCurrentPage('user-type');
          }
        } else {
          const userData = userDoc.data();
          const pendingRole = sessionStorage.getItem('pendingRole');
          
          if (pendingRole === 'admin') {
             if (firebaseUser.email !== 'mahibala2501@gmail.com') {
                 await processAuthError(`Access Denied: You do not have administrator privileges.`);
                 setCurrentPage('login');
                 return;
             }
             setTimeout(() => setActiveTab('admin'), 0);
          } else if (pendingRole && userData.role !== pendingRole) {
              await processAuthError(`Role mismatch: Your account is registered as a ${userData.role}, but you tried to log in as a ${pendingRole}.`);
              setCurrentPage('login');
              return;
          }

          setUser(userData);
          setCurrentPage('app');
        }
      } else {
        setUser(null);
        setCurrentPage('landing');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.requiresRole) return;

    let unsubChildren: () => void = () => {};
    let unsubRel: (() => void) | undefined;
    
    if (user.role === 'caretaker') {
      const relQuery = query(collection(db, 'relationships'), where('caretakerId', '==', auth.currentUser?.uid), where('status', '==', 'approved'));
      unsubRel = onSnapshot(relQuery, async (snapshot) => {
        const studentIds = snapshot.docs.map(d => d.data().studentId);
        if (studentIds.length > 0) {
          const studentsQuery = query(collection(db, 'students'), where('parentId', 'in', studentIds));
          const stuSnap = await getDocs(studentsQuery);
          const childrenData = stuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child));
          setChildren(childrenData);
          if (!selectedChild && childrenData.length > 0) {
            setSelectedChild(childrenData[0]);
          } else if (selectedChild) {
             const updated = childrenData.find(c => c.id === selectedChild.id);
             if (updated) setSelectedChild(updated);
             else setSelectedChild(null);
          }
        } else {
          setChildren([]);
          setSelectedChild(null);
        }
      });
    } else if (user.role === 'student') {
      const childrenQuery = query(collection(db, 'students'), where('parentId', '==', auth.currentUser?.uid));
      unsubChildren = onSnapshot(childrenQuery, (snapshot) => {
        const childrenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child));
        
        setChildren(childrenData);
        
        if (childrenData.length > 0 && !selectedChild) {
           setSelectedChild(childrenData[0]);
           setIsAuthenticatedSession(true);
        } else if (selectedChild) {
          const updatedSelected = childrenData.find(c => c.id === selectedChild.id);
          if (updatedSelected) {
            setSelectedChild(updatedSelected);
          } else if (snapshot.size > 0 && childrenData.length > 0) {
            // Only reset if we actually have data but the child is truly missing
            setSelectedChild(null);
            setActiveTab('home');
          }
        }
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));
    }

    return () => {
      unsubChildren();
      if (unsubRel) unsubRel();
    };
  }, [user, selectedChild?.id]);

  useEffect(() => {
    if (!user || user.requiresRole) return;

    // Listen for alerts - Strictly filter by childId for session isolation
    const alertsConstraints: any[] = [];
    
    if (user.role === 'teacher' || user.role === 'clinician' || user.role === 'caretaker') {
      if (selectedChild) {
        alertsConstraints.push(where('childId', 'in', [selectedChild.id, 'all']));
      } else if (children && children.length > 0) {
        // Fallback to fetch all related students' alerts if possible
        const ids = children.map(c => c.id).slice(0, 9); // 'in' limits to 10
        ids.push('all');
        alertsConstraints.push(where('childId', 'in', ids));
      } else {
        // Fallback for teachers/caretakers with no selected child/children
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
      collection(db, 'notifications'), 
      ...alertsConstraints
    );
    const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      setAlerts(alertsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'));

    return () => {
      unsubscribeAlerts();
    };
  }, [user, selectedChild?.id, children]);

  const hasCheckedStreak = React.useRef(false);

  useEffect(() => {
    if (!user || children.length === 0 || hasCheckedStreak.current) return;
    
    let isSubscribed = true;

    const checkStreaks = async () => {
      const now = new Date();
      const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const resetPromises = children.map(async (c) => {
        if (c.streak && c.streak > 0 && c.lastAssessmentTimestamp) {
          const lastDate = new Date(c.lastAssessmentTimestamp);
          const localLastDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
          
          const diffTime = localToday.getTime() - localLastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            hasCheckedStreak.current = true;
            try {
              if (isSubscribed) {
                await updateDoc(doc(db, 'students', c.id), { streak: 0 });
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
      await updateDoc(doc(db, 'notifications', alertId), { read: true });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    const originalAlerts = [...alerts];
    
    // 1. Optimistic Update
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    
    try {
      // 2. Hard Delete from Firestore
      await deleteDoc(doc(db, 'notifications', alertId));
    } catch (error) {
      // 3. Revert on failure
      setAlerts(originalAlerts);
      setErrorToast({ show: true, message: 'Failed to resolve alert. Please check your connection.' });
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
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
        processAuthError('Password must be at least 8 characters and include a number and special character');
      } else if (error.code === 'auth/email-already-in-use') {
        processAuthError('This email is already registered.');
      } else if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
        processAuthError('Invalid email or password.');
      } else {
        processAuthError(error.message);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
        console.error("Login failed", error);
        processAuthError(error?.message || "Google sign-in failed. Please try again.");
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

    if (role === 'student') {
      try {
        await setDoc(doc(db, 'students', auth.currentUser.uid), {
          name: auth.currentUser.displayName || 'Student',
          avatar: '👤',
          age: 18,
          grade: 'College',
          gender: 'other',
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
      } catch (err) {
        console.error("Failed to provision student profile", err);
      }
    }

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
    setSelectedChild(child);
    setIsAuthenticatedSession(true);
    localStorage.setItem('auth_expiry_childId', (Date.now() + 30 * 60 * 1000).toString());
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      await addDoc(collection(db, 'students'), {
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
      handleFirestoreError(error, OperationType.CREATE, 'students');
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
    return (
       <LandingPage onSelectRole={(role) => {
         sessionStorage.setItem('pendingRole', role);
         setCurrentPage('login');
       }} />
    );
  }

  if (currentPage === 'user-type') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
        <div className="max-w-xl w-full text-center">
          <h2 className="text-3xl font-serif mb-2">Who are you?</h2>
          <p className="text-text-muted mb-8">Select your account type to continue</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => handleUserTypeSelect('student')}
              className="p-8 bg-surface border-2 border-border rounded-xl hover:border-accent transition-all text-center group flex flex-col justify-between"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform hidden sm:block">🎓</div>
              <h3 className="font-semibold mb-1">Student</h3>
              <p className="text-xs text-text-muted">My wellness journey</p>
            </button>
            <button 
              onClick={() => handleUserTypeSelect('caretaker')}
              className="p-8 bg-surface border-2 border-border rounded-xl hover:border-accent transition-all text-center group flex flex-col justify-between"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform hidden sm:block">🛡️</div>
              <h3 className="font-semibold mb-1">Caretaker</h3>
              <p className="text-xs text-text-muted">Monitor student wellbeing</p>
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (currentPage === 'login') {
    return (
      <div className="min-h-screen flex bg-bg relative overflow-hidden animate-fade-in">
        <div className="flex-1 flex items-center justify-center p-8 z-10">
          <div className="max-w-md w-full glass-card p-10 bg-surface/60 border-border/50">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-serif mb-3 text-text-main tracking-tight">{isSignUpMode ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="text-text-muted">{isSignUpMode ? 'Sign up to start using Mind Bridge' : 'Sign in to Mind Bridge to continue'}</p>
            </div>
            
            <form onSubmit={handleEmailAuthSubmit} className="space-y-5 mb-8">
              {authErrorContent && (
                <div className="p-4 bg-alert-500/10 border border-alert-500/20 rounded-xl text-alert-500 text-sm font-medium flex flex-col gap-2">
                  <span>{authErrorContent}</span>
                  <button type="button" onClick={() => window.location.reload()} className="underline text-xs hover:text-alert-400 self-start">
                     Refresh App
                  </button>
                </div>
              )}
              <input
                type="email"
                placeholder="Email address"
                required
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                className="w-full bg-surface-2/50 border border-border rounded-xl px-5 py-4 focus:outline-none focus:border-accent text-text-main hover:border-border/80 transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={passwordAuth}
                onChange={(e) => setPasswordAuth(e.target.value)}
                className="w-full bg-surface-2/50 border border-border rounded-xl px-5 py-4 focus:outline-none focus:border-accent text-text-main hover:border-border/80 transition-colors"
              />
              <button type="submit" className="w-full bg-surface-2 text-text-main border border-border p-4 rounded-xl font-bold hover:bg-border transition-colors shadow-sm">
                {isSignUpMode ? 'Sign Up with Email' : 'Sign In with Email'}
              </button>
            </form>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/80"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-text-muted font-medium">Or</span>
              </div>
            </div>

            <div className="space-y-4">
              <button onClick={handleLogin} className="w-full bg-accent text-bg p-4 rounded-xl font-bold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
                Continue with Google
              </button>
            </div>
            
            <div className="mt-10 flex flex-col items-center gap-2">
              <button 
                onClick={() => { setIsSignUpMode(!isSignUpMode); setAuthErrorContent(''); }} 
                className="text-text-muted text-sm hover:text-accent transition-colors font-medium"
              >
                {isSignUpMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
              <button onClick={() => setCurrentPage('landing')} className="text-text-dim text-sm hover:underline mt-4">← Back to Home</button>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-1 bg-accent-light items-center justify-center p-12">
          <div className="max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30 shadow-sm mb-6">
                 <Wind className="text-accent" size={24} />
            </div>
            <h2 className="text-3xl font-serif mb-4 text-text-main">Calm intelligence for your wellness journey</h2>
            <p className="text-text-muted leading-relaxed">Mind Bridge gives individuals and caretakers the tools to detect, understand, and respond to mental health needs — building emotional resilience.</p>
          </div>
        </div>
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
          <div className="text-2xl font-serif font-bold text-white tracking-widest hidden lg:block">Mind <span className="text-emerald-500">Bridge</span></div>
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
             {user && (
                <div className="flex items-center gap-3 p-3 bg-surface-2 border border-border rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-sm font-bold border border-emerald-500/50">
                    {user.name && user.name.length > 0 ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="font-medium text-sm text-white">{user.name}</span>
                </div>
             )}
          </div>

          {user?.role !== 'admin' && (
            <div>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">Monitor</p>
               <nav className="space-y-1">
                 <SidebarLink icon={<LayoutDashboard size={18} />} label={user?.role === 'caretaker' ? "Caretaker Portal" : "Dashboard"} active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} />
                 {user?.role === 'student' && (
                   <SidebarLink
                     icon={<CalendarDays size={18} />}
                     label="Master Schedule"
                     active={activeTab === 'schedule'}
                     onClick={() => { setActiveTab('schedule'); setIsSidebarOpen(false); }}
                   />
                 )}
                 {user?.role === 'student' && (
                   <SidebarLink
                     icon={<Share2 size={18} />}
                     label="Connections"
                     active={activeTab === 'connections'}
                     onClick={() => { setActiveTab('connections'); setIsSidebarOpen(false); }}
                   />
                 )}
               </nav>
            </div>
          )}

          {auth.currentUser?.email === 'mahibala2501@gmail.com' && (
            <div>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">System</p>
               <nav className="space-y-1">
                 <SidebarLink
                   icon={<Shield size={18} />}
                   label="Admin Portal"
                   active={activeTab === 'admin'}
                   onClick={() => { setActiveTab('admin'); setIsSidebarOpen(false); }}
                 />
               </nav>
            </div>
          )}

          {user?.role !== 'admin' && (
            <div>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">Assessment & Analysis</p>
               <nav className="space-y-1">
                 {user?.role === 'student' && (
                   <>
                     <SidebarLink
                       icon={<ClipboardCheck size={18} />}
                       label={"My Journey"}
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
                       label={"My Growth"} 
                       active={activeTab === 'reports'} 
                       onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} 
                     />
                   </>
                 )}
               </nav>
            </div>
          )}
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
                 {user?.role !== 'admin' && (
                 <button 
                  onClick={() => setActiveTab('notifications')}
                  className="relative p-2.5 bg-surface-2 border border-border rounded-full text-text-muted hover:text-text-main hover:bg-surface transition-colors"
                  title={user?.role === 'student' ? 'Inbox' : 'Alerts'}
                 >
                   <Bell size={20} />
                   {alerts.filter(a => !a.read).length > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-alert-500 rounded-full border-2 border-surface animate-pulse-soft" />
                   )}
                 </button>
                 )}
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
                <>
                  {activeTab === 'home' && (
                    user?.role === 'caretaker' ? (
                      <CaretakerDashboard onViewProfile={(child) => { handleProfileSelect(child); setActiveTab('reports'); }} />
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
                selectedChild ? (
                  <ChildProfile 
                    child={selectedChild} 
                    onUpdate={(updated) => setSelectedChild(updated)}
                    onStartAssessment={() => setActiveTab('assessment')}
                    onDelete={() => { setSelectedChild(null); setActiveTab('home'); }}
                  />
                ) : (
                  <div className="text-center py-20">
                    <p className="text-text-muted text-lg">No profile selected.</p>
                    <p className="text-text-dim text-sm mt-2">Go back to the dashboard and select a profile to continue.</p>
                    <button onClick={() => setActiveTab('home')} className="mt-6 px-6 py-2 bg-accent text-bg rounded-xl font-medium hover:bg-accent-hover transition-colors">
                      Go to Dashboard
                    </button>
                  </div>
                )
              )}
              {activeTab === 'connections' && (
                <Connections user={user} />
              )}
              {activeTab === 'admin' && (
                <AdminDashboard />
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
                <Reports children={selectedChild ? [selectedChild] : []} selectedChild={selectedChild} />
              )}
              {activeTab === 'notifications' && (
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
              {!selectedChild && activeTab !== 'home' && activeTab !== 'reports' && activeTab !== 'notifications' && activeTab !== 'assessment' && activeTab !== 'shop' && activeTab !== 'schedule' && (
                <div className="text-center py-20">
                  <p className="text-text-muted">Please add a child first from the dashboard.</p>
                  <button onClick={() => setActiveTab('home')} className="text-accent font-medium mt-2">Go to Dashboard</button>
                </div>
              )}
              </>
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
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
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
            onRequestAdminReset={() => alert('An email has been sent to the account administrator/caretaker with instructions to reset this PIN.')}
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

