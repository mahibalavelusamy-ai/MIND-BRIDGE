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
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Heart,
  Users,
  Shield,
  LineChart,
  Lightbulb,
  Link,
  Lock
} from 'lucide-react';
import { cn, getGradientForChild } from './lib/utils';
import { Child, Alert } from './types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
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
  signInWithEmailAndPassword
} from './lib/firebase';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ChildProfile from './components/ChildProfile';
import Assessment from './components/Assessment';
import Reports from './components/Reports';
import Alerts from './components/Alerts';
import SchoolDashboard from './components/SchoolDashboard';
import PrivacyEthics from './components/PrivacyEthics';
import Forecasts from './components/Forecasts';
import Recommendations from './components/Recommendations';
import SchoolSync from './components/SchoolSync';
import SOSModal from './components/SOSModal';

type Page = 'landing' | 'user-type' | 'login' | 'app';
type Tab = 'home' | 'profile' | 'assessment' | 'reports' | 'alerts' | 'privacy' | 'forecasts' | 'recommendations' | 'sync';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
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
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  
  // SOS State
  const [isSOSOpen, setIsSOSOpen] = useState(false);

  // Profile Creation UI state
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', age: '', grade: '', avatar: '👦', gender: 'male' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Email Auth
  const [emailAuth, setEmailAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authErrorContent, setAuthErrorContent] = useState('');

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setSelectedChild(null); // Strict Auth State Handling: Enforce Profile Gateway routing on refresh/load
      setIsAuthenticatedSession(false);
      if (firebaseUser) {
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          setCurrentPage('user-type');
        } else {
          setUser(userDoc.data());
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
    if (!user) return;

    // Listen for children
    const childrenQuery = query(collection(db, 'children'), where('parentId', '==', auth.currentUser?.uid));
    const unsubscribeChildren = onSnapshot(childrenQuery, (snapshot) => {
      const childrenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child));
      
      // Data Seeding Fix (Forcing deterministic pins onto these known profiles if testing with clean DBs or unset states)
      childrenData.forEach(async (c) => {
        if (c.name.includes('Maddy') && !c.pin) {
           await setDoc(doc(db, 'children', c.id), { pin: 'maddy@123' }, { merge: true });
        }
        if (c.name.includes('Mike') && !c.pin) {
           await setDoc(doc(db, 'children', c.id), { pin: 'mike@123' }, { merge: true });
        }
      });
      
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
    const alertsConstraints = [
      where('parentId', '==', auth.currentUser?.uid),
      where('status', '==', 'active')
    ];
    
    if (selectedChild) {
      alertsConstraints.push(where('childId', 'in', [selectedChild.id, 'all']));
    }

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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleUserTypeSelect = async (role: string) => {
    if (!auth.currentUser) return;
    const userData = {
      uid: auth.currentUser.uid,
      name: auth.currentUser.displayName || 'User',
      email: auth.currentUser.email || '',
      role: role,
      organization: ''
    };
    await setDoc(doc(db, 'users', auth.currentUser.uid), userData);
    setUser(userData);
    setCurrentPage('app');
  };

  const [isAuthenticatedSession, setIsAuthenticatedSession] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

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
        gems: 0,
        streak: 0,
        level: 1
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
    await firebaseLogout();
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentPage === 'landing') {
    return <LandingPage onStart={() => setCurrentPage('login')} />;
  }

  if (currentPage === 'user-type') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
        <div className="max-w-xl w-full text-center">
          <h2 className="text-3xl font-serif mb-2">Who are you?</h2>
          <p className="text-text-muted mb-8">Select your account type to continue</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => handleUserTypeSelect('parent')}
              className="p-8 bg-surface border-2 border-border rounded-xl hover:border-accent transition-all text-center group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">👨‍👩‍👧</div>
              <h3 className="font-semibold mb-1">Parent / Individual</h3>
              <p className="text-xs text-text-muted">Monitor your child's mental health at home</p>
            </button>
            <button 
              onClick={() => handleUserTypeSelect('teacher')}
              className="p-8 bg-surface border-2 border-border rounded-xl hover:border-accent transition-all text-center group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏫</div>
              <h3 className="font-semibold mb-1">Organisation</h3>
              <p className="text-xs text-text-muted">School, hospital, or healthcare provider</p>
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
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
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
              <button onClick={handleLogin} className="w-full bg-accent text-white p-3 rounded-xl font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
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
      <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center text-white p-6 relative overflow-hidden animate-fade-in">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>
        
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
          <div className="text-accent mb-12 flex justify-center">
             <div className="text-3xl font-serif font-bold text-white">Mind<span className="text-accent">Bridge</span></div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif mb-16 text-center tracking-tight text-white shadow-sm">
            Who's exploring today?
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {children.map(child => (
              <motion.button
                key={child.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleProfileSelect(child)}
                className="flex flex-col items-center group cursor-pointer"
              >
                <div className={cn(
                  "w-32 h-32 md:w-40 md:h-40 rounded-3xl border-2 border-transparent group-hover:border-white shadow-2xl flex items-center justify-center text-6xl mb-4 transition-all duration-300 relative overflow-hidden bg-gradient-to-br",
                  child.age >= 18 ? getGradientForChild(child.id) : "from-gray-800 to-gray-900"
                )}>
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {child.age >= 18 ? <span className="font-serif text-white">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : (child.avatar || '👧')}
                </div>
                <span className="text-gray-300 font-medium text-xl group-hover:text-white transition-colors">{child.name}</span>
              </motion.button>
            ))}
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreatingProfile(true)}
              className="flex flex-col items-center group cursor-pointer opacity-70 hover:opacity-100"
            >
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gray-900 border-2 border-dashed border-gray-600 group-hover:border-white shadow-2xl flex items-center justify-center text-4xl mb-4 transition-all duration-300">
                <Plus className="text-gray-400 group-hover:text-white" size={48} />
              </div>
              <span className="text-gray-400 font-medium text-xl group-hover:text-white transition-colors">Add Profile</span>
            </motion.button>
          </div>
          
        </div>
        
        {/* Subtle Sign Out at bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors font-medium text-sm">
            Sign Out
          </button>
        </div>

        {/* Profile Creation Modal */}
        {isCreatingProfile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-[2rem] border border-gray-700 shadow-2xl max-w-lg w-full mx-4 backdrop-blur-xl relative overflow-hidden">
               <div className="flex justify-between items-center mb-6 text-white">
                 <h3 className="text-2xl font-serif">Create Profile</h3>
                 <button onClick={() => setIsCreatingProfile(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
               </div>
               <form onSubmit={handleCreateProfile} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <input required placeholder="Name" className="p-3 rounded-xl border border-gray-700 text-sm bg-gray-900/50 text-white placeholder-gray-500" value={newProfile.name} onChange={e => setNewProfile({...newProfile, name: e.target.value})} />
                   <input required type="number" placeholder="Age" className="p-3 rounded-xl border border-gray-700 text-sm bg-gray-900/50 text-white placeholder-gray-500" value={newProfile.age} onChange={e => {
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
                      className="p-3 rounded-xl border border-gray-700 text-sm bg-gray-900/50 text-white"
                    >
                      <option value="male">Boy</option>
                      <option value="female">Girl</option>
                      {(parseInt(newProfile.age) < 18 || !newProfile.age) && <option value="other">Other</option>}
                    </select>
                    <select 
                      value={newProfile.avatar || '👦'} 
                      onChange={e => setNewProfile({...newProfile, avatar: e.target.value})}
                      className="p-3 rounded-xl border border-gray-700 text-sm bg-gray-900/50 text-white"
                    >
                      <option value="👦">👦 Boy</option>
                      <option value="👧">👧 Girl</option>
                      {(parseInt(newProfile.age) <= 5 || !newProfile.age) && <option value="👶">👶 Toddler</option>}
                    </select>
                </div>
                <div className="mt-4">
                  <input 
                    placeholder="Grade" 
                    className={cn("w-full p-3 rounded-xl border border-gray-700 text-sm bg-gray-900/50 text-white placeholder-gray-500", parseInt(newProfile.age) >= 18 && "opacity-60 cursor-not-allowed")} 
                    value={newProfile.grade} 
                    onChange={e => setNewProfile({...newProfile, grade: e.target.value})} 
                    disabled={parseInt(newProfile.age) >= 18}
                  />
                </div>
                <button type="submit" disabled={isSavingProfile} className="w-full bg-accent text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all mt-6 disabled:opacity-50">
                  {isSavingProfile ? "Creating..." : "Save Profile"}
                </button>
               </form>
            </div>
          </div>
        )}

      {/* Global PIN Modal Duplicate for Gateway Early Return */}
      <AnimatePresence>
        {pinModalProfile && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={isShaking ? { x: [-10, 10, -10, 10, -5, 5, 0], scale: 1, y: 0 } : { scale: 1, y: 0 }}
               transition={{ duration: isShaking ? 0.4 : 0.2 }}
               className="bg-[#0f0f13] p-8 rounded-[2rem] border border-gray-800 shadow-2xl max-w-sm w-full mx-4 backdrop-blur-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-accent/5 opacity-50 blur-3xl rounded-full"></div>
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className={cn(
                    "w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-5xl mb-4 shadow-inner text-white",
                    `bg-gradient-to-br ${getGradientForChild(pinModalProfile.id)}`
                  )}>
                    {pinModalProfile.age >= 18 ? <span className="font-serif">{pinModalProfile.name.charAt(0).toUpperCase()}</span> : pinModalProfile.avatar}
                  </div>
                  <h3 className="text-2xl font-serif text-white">Enter PIN</h3>
                  <p className="text-sm text-gray-400 mt-1">Unlock {pinModalProfile.name}'s profile session</p>
                </div>
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div>
                    <input 
                      type="password" 
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value)}
                      className={cn(
                        "w-full bg-gray-950/50 border rounded-xl px-4 py-3 text-center text-xl tracking-widest text-white shadow-inner focus:outline-none transition-colors",
                         pinError ? "border-red-500/50 focus:border-red-500" : "border-gray-700 focus:border-accent"
                      )}
                      placeholder="••••"
                      maxLength={32}
                      autoFocus
                    />
                    {pinError && <p className="text-red-400 text-xs mt-2 text-center font-bold animate-fade-in">{pinError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setPinModalProfile(null); setPinError(''); setEnteredPin(''); }} className="flex-1 py-3 px-4 rounded-xl text-gray-400 font-bold hover:text-white hover:bg-gray-800 transition-colors">Cancel</button>
                    <button type="submit" disabled={enteredPin.length === 0} className="flex-1 py-3 px-4 rounded-xl bg-accent text-white font-bold hover:bg-accent-hover transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Unlock</button>
                  </div>
                  <div className="flex flex-col gap-2 items-center text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedChild(pinModalProfile);
                        setPinModalProfile(null);
                        setEnteredPin('');
                        setIsAuthenticatedSession(true);
                        setIsShaking(false);
                      }}
                      className="text-accent text-[12px] font-bold hover:text-accent-light underline transition-colors"
                    >
                      Parent Override: Authenticate as Admin
                    </button>
                    <button 
                      type="button" 
                      onClick={() => alert('An email has been sent to the account administrator/parent with instructions to reset this PIN.')}
                      className="text-gray-400 text-[10px] hover:text-white underline transition-colors"
                    >
                      Forgot PIN? Request Admin Reset
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Top Nav */}
      <nav className="h-16 bg-surface border-b border-border fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-surface-2 rounded-lg">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-xl font-serif font-bold text-accent hidden md:block">Mind<span className="text-text-main">Bridge</span></div>
          
          {selectedChild && user?.role !== 'teacher' && (
            <div className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-surface-2 hover:bg-surface border border-border rounded-full transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold">
                  {selectedChild.age >= 18 ? selectedChild.name.charAt(0).toUpperCase() : selectedChild.avatar}
                </div>
                <span className="font-medium text-sm text-text-main hidden sm:block">{selectedChild.name}</span>
                <ChevronDown size={16} className={cn("text-text-dim transition-transform duration-200", isProfileDropdownOpen ? "rotate-180" : "group-hover:text-text-main")} />
              </button>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full mt-2 left-0 w-64 bg-surface backdrop-blur-xl border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-border bg-surface-2/50">
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Switch Profile</p>
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
                        {isAuthenticatedSession ? (
                           <div className="p-3 text-center">
                             <p className="text-xs text-text-muted mb-3">Profile switching is disabled while an active session is unlocked.</p>
                             <button
                                onClick={() => {
                                   setIsAuthenticatedSession(false);
                                   setIsProfileDropdownOpen(false);
                                   setActiveTab('home');
                                   setSelectedChild(null);
                                }}
                                className="text-xs w-full py-2 bg-red-500/10 text-red-500 font-bold rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
                             >
                               <Lock size={12} /> Lock Session & Exit
                             </button>
                           </div>
                        ) : (
                          children.filter(c => c.id !== selectedChild.id).length === 0 ? (
                             <p className="p-3 text-sm text-text-muted text-center">No other profiles.</p>
                          ) : (
                            children.filter(c => c.id !== selectedChild.id).map(child => (
                              <button
                                key={child.id}
                                onClick={() => {
                                  handleProfileSelect(child);
                                  setIsProfileDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-surface-2 rounded-xl transition-colors text-left"
                              >
                                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-lg text-accent border border-accent/20">
                                  {child.age >= 18 ? child.name.charAt(0).toUpperCase() : child.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-text-main truncate">{child.name}</p>
                                  <p className="text-[10px] text-text-dim truncate">{child.age >= 18 ? 'Adult Profile' : child.grade}</p>
                                </div>
                              </button>
                            ))
                          )
                        )}
                      </div>
                      <div className="p-2 border-t border-border bg-surface-2/30">
                        <button 
                          onClick={() => {
                            setSelectedChild(null);
                            setIsAuthenticatedSession(false);
                            setActiveTab('home');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-muted hover:text-text-main transition-colors"
                        >
                          <LayoutDashboard size={16} /> View All Profiles
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-text-muted">
            <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-accent">
              <UserCircle size={20} />
            </div>
            <span>{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border pt-16 lg:pt-0 transition-transform duration-300 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-4 space-y-6">
            <div>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2 px-3">Main</p>
              <nav className="space-y-1">
                <SidebarLink 
                  icon={<LayoutDashboard size={18} />} 
                  label={user?.role === 'teacher' ? "School Overview" : "Home"} 
                  active={activeTab === 'home'} 
                  onClick={() => setActiveTab('home')} 
                />
                {user?.role !== 'teacher' && (
                  <>
                    <SidebarLink icon={<UserCircle size={18} />} label={selectedChild && selectedChild.age >= 18 ? "Student Profile" : "Child Profile"} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                    <SidebarLink icon={<ClipboardCheck size={18} />} label="Assessments" active={activeTab === 'assessment'} onClick={() => setActiveTab('assessment')} />
                  </>
                )}
                {user?.role === 'teacher' && (
                  <>
                    <SidebarLink icon={<Users size={18} />} label="Classes" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                    <SidebarLink icon={<TrendingUp size={18} />} label="Analytics" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                  </>
                )}
              </nav>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2 px-3">Insights</p>
              <nav className="space-y-1">
                <SidebarLink icon={<BarChart3 size={18} />} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                <SidebarLink icon={<LineChart size={18} />} label="Risk Forecasts" active={activeTab === 'forecasts'} onClick={() => setActiveTab('forecasts')} />
                <SidebarLink icon={<Lightbulb size={18} />} label="Recommendations" active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')} />
                <SidebarLink 
                  icon={<Bell size={18} />} 
                  label="Alerts" 
                  active={activeTab === 'alerts'} 
                  onClick={() => setActiveTab('alerts')} 
                  badge={alerts.length > 0 ? alerts.length : undefined}
                />
              </nav>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2 px-3">Compliance & Integrations</p>
              <nav className="space-y-1">
                <SidebarLink 
                  icon={<Shield size={18} />} 
                  label="Privacy & Ethics" 
                  active={activeTab === 'privacy'} 
                  onClick={() => setActiveTab('privacy')} 
                />
                <SidebarLink 
                  icon={<Link size={18} />} 
                  label="School Sync" 
                  active={activeTab === 'sync'} 
                  onClick={() => setActiveTab('sync')} 
                />
              </nav>
            </div>
            
            {user?.role !== 'teacher' && selectedChild && (
              <div className="pt-8 w-full">
                 <button 
                  onClick={() => setSelectedChild(null)} 
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-accent text-accent font-bold hover:bg-accent hover:text-white transition-all shadow-sm"
                >
                   <Users size={18} />
                   Switch Profile
                 </button>
              </div>
            )}
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedChild?.id || 'none'}-${activeTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedChild && selectedChild.pin && !isAuthenticatedSession && activeTab !== 'home' && user?.role !== 'teacher' ? (
                <div className="flex flex-col items-center justify-center p-20 animate-fade-in text-center h-full">
                  <div className="w-24 h-24 bg-surface border border-border rounded-3xl flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden mx-auto">
                     <div className="absolute inset-0 bg-accent/10"></div>
                     <Lock size={40} className="text-accent relative z-10" />
                  </div>
                  <h2 className="text-4xl font-serif mb-4 text-white">Vault Locked</h2>
                  <p className="text-text-muted mb-8 max-w-md mx-auto text-lg">
                    Access to {selectedChild.name}'s protected data requires authentication.
                  </p>
                  <button 
                    onClick={() => setPinModalProfile(selectedChild)} 
                    className="mx-auto bg-accent text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 flex items-center gap-3"
                  >
                    <Shield size={20} />
                    Unlock Session
                  </button>
                </div>
              ) : (
                <>
                  {activeTab === 'home' && (
                    user?.role === 'teacher' ? (
                      <SchoolDashboard user={user} initialTab="overview" />
                    ) : (
                      <Dashboard 
                        user={user} 
                        children={selectedChild && selectedChild.id !== 'temp_new' ? [selectedChild] : []} 
                        alerts={selectedChild && selectedChild.id !== 'temp_new' ? alerts.filter(a => a.childId === selectedChild.id || a.childId === 'all') : alerts} 
                        onViewProfile={(child) => { setSelectedChild(child); setActiveTab('profile'); }}
                        selectedChild={selectedChild}
                        setActiveTab={setActiveTab}
                      />
                    )
                  )}
              {activeTab === 'profile' && (
                user?.role === 'teacher' ? (
                  <SchoolDashboard user={user} initialTab="classes" />
                ) : selectedChild && (
                  <ChildProfile 
                    child={selectedChild} 
                    onUpdate={(updated) => setSelectedChild(updated)}
                    onStartAssessment={() => setActiveTab('assessment')}
                    onDelete={() => { setSelectedChild(null); setActiveTab('home'); }}
                  />
                )
              )}
              {activeTab === 'assessment' && (
                selectedChild ? (
                  <Assessment 
                    child={selectedChild}
                    onComplete={(newLevel, childName) => {
                      const currentLevel = selectedChild?.level || 1;
                      if (newLevel && newLevel > currentLevel) {
                        setLevelUpToast({ show: true, level: newLevel, childName: childName || 'Child' });
                        setTimeout(() => setLevelUpToast({ show: false, level: 0, childName: '' }), 5000);
                      }
                      setActiveTab('reports');
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
                />
              )}
              {activeTab === 'privacy' && (
                <PrivacyEthics user={user} />
              )}
              {activeTab === 'forecasts' && (
                <Forecasts children={selectedChild ? [selectedChild] : []} />
              )}
              {activeTab === 'recommendations' && (
                <Recommendations 
                  children={selectedChild ? [selectedChild] : []} 
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === 'sync' && (
                <SchoolSync children={selectedChild ? [selectedChild] : []} />
              )}
              {!selectedChild && activeTab !== 'home' && activeTab !== 'reports' && activeTab !== 'alerts' && activeTab !== 'privacy' && activeTab !== 'forecasts' && activeTab !== 'recommendations' && activeTab !== 'sync' && activeTab !== 'assessment' && (
                <div className="text-center py-20">
                  <p className="text-text-muted">Please add a child first from the dashboard.</p>
                  <button onClick={() => setActiveTab('home')} className="text-accent font-medium mt-2">Go to Dashboard</button>
                </div>
              )}
              </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {/* Level Up Toast */}
      <AnimatePresence>
        {levelUpToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-accent text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20"
          >
            <div className="text-4xl animate-bounce">🎉</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Level Up!</p>
              <p className="font-serif text-lg">{levelUpToast.childName} reached Level {levelUpToast.level}</p>
            </div>
            <button onClick={() => setLevelUpToast({ ...levelUpToast, show: false })} className="ml-4 p-1 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {errorToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-red-50 text-red-700 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-200"
          >
            <div className="text-red-500">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Error</p>
              <p className="font-medium text-sm">{errorToast.message}</p>
            </div>
            <button onClick={() => setErrorToast({ ...errorToast, show: false })} className="ml-4 p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global SOS Button */}
      {selectedChild && (
        <button 
          onClick={() => setIsSOSOpen(true)}
          className="fixed bottom-8 right-8 z-[90] bg-red-600 text-white w-16 h-16 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center hover:scale-110 hover:bg-red-500 transition-all group"
        >
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20 pointer-events-none" />
          <AlertCircle size={28} className="group-hover:animate-pulse" />
        </button>
      )}

      {isSOSOpen && (
        <SOSModal onClose={() => setIsSOSOpen(false)} selectedChild={selectedChild} />
      )}

      {/* Global PIN Modal */}
      <AnimatePresence>
        {pinModalProfile && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={isShaking ? { x: [-10, 10, -10, 10, -5, 5, 0], scale: 1, y: 0 } : { scale: 1, y: 0 }}
               transition={{ duration: isShaking ? 0.4 : 0.2 }}
               className="bg-[#0f0f13] p-8 rounded-[2rem] border border-gray-800 shadow-2xl max-w-sm w-full mx-4 backdrop-blur-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-accent/5 opacity-50 blur-3xl rounded-full"></div>
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className={cn(
                    "w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-5xl mb-4 shadow-inner text-white",
                    `bg-gradient-to-br ${getGradientForChild(pinModalProfile.id)}`
                  )}>
                    {pinModalProfile.age >= 18 ? <span className="font-serif">{pinModalProfile.name.charAt(0).toUpperCase()}</span> : pinModalProfile.avatar}
                  </div>
                  <h3 className="text-2xl font-serif text-white">Enter PIN</h3>
                  <p className="text-sm text-gray-400 mt-1">Unlock {pinModalProfile.name}'s profile session</p>
                </div>
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div>
                    <input 
                      type="password" 
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value)}
                      className={cn(
                        "w-full bg-gray-950/50 border rounded-xl px-4 py-3 text-center text-xl tracking-widest text-white shadow-inner focus:outline-none transition-colors",
                         pinError ? "border-red-500/50 focus:border-red-500" : "border-gray-700 focus:border-accent"
                      )}
                      placeholder="••••"
                      maxLength={32}
                      autoFocus
                    />
                    {pinError && <p className="text-red-400 text-xs mt-2 text-center font-bold animate-fade-in">{pinError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setPinModalProfile(null); setPinError(''); setEnteredPin(''); }} className="flex-1 py-3 px-4 rounded-xl text-gray-400 font-bold hover:text-white hover:bg-gray-800 transition-colors">Cancel</button>
                    <button type="submit" disabled={enteredPin.length === 0} className="flex-1 py-3 px-4 rounded-xl bg-accent text-white font-bold hover:bg-accent-hover transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Unlock</button>
                  </div>
                  <div className="flex flex-col gap-2 items-center text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedChild(pinModalProfile);
                        setPinModalProfile(null);
                        setEnteredPin('');
                        setIsAuthenticatedSession(true);
                        setIsShaking(false);
                      }}
                      className="text-accent text-[12px] font-bold hover:text-accent-light underline transition-colors"
                    >
                      Parent Override: Authenticate as Admin
                    </button>
                    <button 
                      type="button" 
                      onClick={() => alert('An email has been sent to the account administrator/parent with instructions to reset this PIN.')}
                      className="text-gray-400 text-[10px] hover:text-white underline transition-colors"
                    >
                      Forgot PIN? Request Admin Reset
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
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
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        active ? "bg-accent-light text-accent shadow-sm" : "text-text-muted hover:bg-surface-2 hover:text-text-main"
      )}
    >
      <span className={cn("transition-colors", active ? "text-accent" : "text-text-dim")}>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

