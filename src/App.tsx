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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState<{ show: boolean; level: number; childName: string }>({ show: false, level: 0, childName: '' });

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
        if (!selectedChild) {
          setSelectedChild(childrenData[0]);
        } else {
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
  }, [user, children.length]);

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

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Top Nav */}
      <nav className="h-16 bg-surface border-b border-border fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-surface-2 rounded-lg">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-xl font-serif font-bold text-accent">Mind<span className="text-text-main">Bridge</span></div>
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
              key={activeTab}
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
                    children={children} 
                    alerts={alerts} 
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
              {activeTab === 'assessment' && selectedChild && (
                <Assessment 
                  child={selectedChild} 
                  onComplete={(newLevel) => {
                    const currentLevel = selectedChild.level || 1;
                    if (newLevel && newLevel > currentLevel) {
                      setLevelUpToast({ show: true, level: newLevel, childName: selectedChild.name });
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
                  <Reports children={children} selectedChild={selectedChild} />
                )
              )}
              {activeTab === 'alerts' && (
                <Alerts alerts={alerts} onDismiss={(id) => setAlerts(alerts.filter(a => a.id !== id))} />
              )}
              {activeTab === 'privacy' && (
                <PrivacyEthics user={user} />
              )}
              {activeTab === 'forecasts' && (
                <Forecasts children={children} />
              )}
              {activeTab === 'recommendations' && (
                <Recommendations children={children} />
              )}
              {activeTab === 'sync' && (
                <SchoolSync children={children} />
              )}
              {!selectedChild && activeTab !== 'home' && activeTab !== 'reports' && activeTab !== 'alerts' && activeTab !== 'privacy' && activeTab !== 'forecasts' && activeTab !== 'recommendations' && activeTab !== 'sync' && (
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

