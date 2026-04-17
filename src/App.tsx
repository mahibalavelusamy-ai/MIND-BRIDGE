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
  Link
} from 'lucide-react';
import { cn } from './lib/utils';
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
  deleteDoc,
  OperationType,
  handleFirestoreError
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
      setChildren(childrenData);
      
      if (childrenData.length > 0) {
        if (selectedChild) {
          const updatedSelected = childrenData.find(c => c.id === selectedChild.id);
          if (updatedSelected) {
            setSelectedChild(updatedSelected);
          }
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'children'));

    // Listen for alerts
    const alertsQuery = query(
      collection(db, 'alerts'), 
      where('parentId', '==', auth.currentUser?.uid),
      where('status', '==', 'active')
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

  const handleProfileSelect = (child: Child) => {
    if (child.pin) {
      setPinModalProfile(child);
      setEnteredPin('');
      setPinError('');
    } else {
      setSelectedChild(child);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinModalProfile && enteredPin === pinModalProfile.pin) {
      setSelectedChild(pinModalProfile);
      setPinModalProfile(null);
      setEnteredPin('');
    } else {
      setPinError('Incorrect PIN');
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
              <h2 className="text-3xl font-serif mb-2">Welcome Back</h2>
              <p className="text-text-muted">Sign in to MindBridge to continue</p>
            </div>
            <div className="space-y-4">
              <button onClick={handleLogin} className="w-full bg-accent text-white p-3 rounded-lg font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
                Sign In with Google →
              </button>
            </div>
            <button onClick={() => setCurrentPage('landing')} className="w-full mt-4 text-accent text-sm hover:underline">← Back</button>
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
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-transparent group-hover:border-accent shadow-2xl flex items-center justify-center text-6xl mb-4 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {child.age >= 18 ? <span className="font-serif text-white">{child.name ? child.name.charAt(0).toUpperCase() : '👤'}</span> : (child.avatar || '👧')}
                </div>
                <span className="text-gray-300 font-medium text-xl group-hover:text-white transition-colors">{child.name}</span>
              </motion.button>
            ))}
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // If they add a child, for now we can just route them to home 
                // where the empty state shows the 'Add Child' form or similar
                setActiveTab('home');
                setSelectedChild({ id: 'temp_new', name: 'New Profile', age: 0, avatar: '➕', parentId: user.uid } as any); // Hack to bypass gateway temporarily to reach dashboard
              }}
              className="flex flex-col items-center group cursor-pointer opacity-70 hover:opacity-100"
            >
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gray-900 border-2 border-dashed border-gray-600 group-hover:border-white shadow-2xl flex items-center justify-center text-4xl mb-4 transition-all duration-300">
                <Plus className="text-gray-400 group-hover:text-white" size={48} />
              </div>
              <span className="text-gray-400 font-medium text-xl group-hover:text-white transition-colors">Add Profile</span>
            </motion.button>
          </div>
          
          <div className="mt-24 space-x-6">
            <button onClick={handleLogout} className="px-6 py-2 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all font-medium text-sm">
              Sign Out
            </button>
          </div>
        </div>

        {pinModalProfile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-[2rem] border border-gray-700 shadow-2xl max-w-sm w-full mx-4 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 opacity-50 blur-3xl rounded-full"></div>
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-4xl mb-4 shadow-inner">
                    {pinModalProfile.age >= 18 ? <span className="font-serif text-white">{pinModalProfile.name.charAt(0).toUpperCase()}</span> : pinModalProfile.avatar}
                  </div>
                  <h3 className="text-2xl font-serif text-white">Enter PIN</h3>
                  <p className="text-sm text-gray-400 mt-1">Unlock {pinModalProfile.name}'s profile</p>
                </div>
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div>
                    <input 
                      type="password" 
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value)}
                      className="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white shadow-inner focus:outline-none focus:border-accent transition-colors"
                      placeholder="••••"
                      maxLength={4}
                      autoFocus
                    />
                    {pinError && <p className="text-red-400 text-xs mt-2 text-center font-bold animate-pulse">{pinError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setPinModalProfile(null)} className="flex-1 py-3 px-4 rounded-xl text-gray-400 font-bold hover:text-white hover:bg-gray-800 transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 py-3 px-4 rounded-xl bg-accent text-white font-bold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20">Unlock</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
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
                        {children.filter(c => c.id !== selectedChild.id).length === 0 ? (
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
                        )}
                      </div>
                      <div className="p-2 border-t border-border bg-surface-2/30">
                        <button 
                          onClick={() => {
                            setSelectedChild(null);
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
                    <SidebarLink icon={<UserCircle size={18} />} label="Child Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
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
              {activeTab === 'home' && (
                user?.role === 'teacher' ? (
                  <SchoolDashboard user={user} initialTab="overview" />
                ) : (
                  <Dashboard 
                    user={user} 
                    children={selectedChild && selectedChild.id !== 'temp_new' ? [selectedChild] : []} 
                    alerts={selectedChild && selectedChild.id !== 'temp_new' ? alerts.filter(a => a.childId === selectedChild.id || a.childId === 'all') : alerts} 
                    onViewProfile={(child) => { setSelectedChild(child); setActiveTab('profile'); }}
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
                  />
                )
              )}
              {activeTab === 'assessment' && (
                <Assessment 
                  childrenList={children} 
                  initialSelectedChildId={selectedChild?.id}
                  onComplete={(newLevel, childName) => {
                    const currentLevel = selectedChild?.level || 1;
                    if (newLevel && newLevel > currentLevel) {
                      setLevelUpToast({ show: true, level: newLevel, childName: childName || 'Child' });
                      setTimeout(() => setLevelUpToast({ show: false, level: 0, childName: '' }), 5000);
                    }
                    setActiveTab('reports');
                  }}
                />
              )}
              {activeTab === 'reports' && (
                user?.role === 'teacher' ? (
                  <SchoolDashboard user={user} initialTab="analytics" />
                ) : (
                  <Reports children={selectedChild ? [selectedChild] : []} selectedChild={selectedChild} />
                )
              )}
              {activeTab === 'alerts' && (
                <Alerts alerts={selectedChild ? alerts.filter(a => a.childId === selectedChild.id || a.childId === 'all') : alerts} onDismiss={async (id) => {
                  try {
                    await deleteDoc(doc(db, 'alerts', id));
                  } catch (error) {
                    handleFirestoreError(error, OperationType.DELETE, 'alerts');
                  }
                }} />
              )}
              {activeTab === 'privacy' && (
                <PrivacyEthics user={user} />
              )}
              {activeTab === 'forecasts' && (
                <Forecasts children={selectedChild ? [selectedChild] : []} />
              )}
              {activeTab === 'recommendations' && (
                <Recommendations children={selectedChild ? [selectedChild] : []} />
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

