import React, { useState, useEffect } from 'react';
import { GymProvider, useGym, API_BASE } from './context/GymContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const MemberList = React.lazy(() => import('./pages/MemberList').then(m => ({ default: m.MemberList })));
const MemberRegistration = React.lazy(() => import('./pages/MemberRegistration').then(m => ({ default: m.MemberRegistration })));
const MemberProfile = React.lazy(() => import('./pages/MemberProfile').then(m => ({ default: m.MemberProfile })));
const ProgressTracking = React.lazy(() => import('./pages/ProgressTracking').then(m => ({ default: m.ProgressTracking })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Attendance = React.lazy(() => import('./pages/Attendance').then(m => ({ default: m.Attendance })));
const Memberships = React.lazy(() => import('./pages/Memberships').then(m => ({ default: m.Memberships })));
const Payments = React.lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Workouts = React.lazy(() => import('./pages/Workouts').then(m => ({ default: m.Workouts })));
const Diets = React.lazy(() => import('./pages/Diets').then(m => ({ default: m.Diets })));
const Trainers = React.lazy(() => import('./pages/Trainers').then(m => ({ default: m.Trainers })));
const ActivityLogs = React.lazy(() => import('./pages/ActivityLogs').then(m => ({ default: m.ActivityLogs })));
const SetupWizard = React.lazy(() => import('./pages/SetupWizard').then(m => ({ default: m.SetupWizard })));
const BrandingGuide = React.lazy(() => import('./pages/BrandingGuide').then(m => ({ default: m.BrandingGuide })));
const SystemHealth = React.lazy(() => import('./pages/SystemHealth').then(m => ({ default: m.SystemHealth })));
const ImportData = React.lazy(() => import('./pages/ImportData').then(m => ({ default: m.ImportData })));
import { Dumbbell, Bell, Search, Clock, LogOut, Check, Calendar, Shield, X, Trash } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading: authLoading, admin: user, logout } = useAuth();
  const { loading: gymLoading, settings } = useGym();
  
  // Navigation states
  const [currentView, setView] = useState<'dashboard' | 'members' | 'progress' | 'reports' | 'attendance' | 'settings' | 'workouts' | 'diets' | 'memberships' | 'payments' | 'trainers' | 'activity_logs' | 'help' | 'system_health' | 'import_data'>('dashboard');
  const [membersSubView, setMembersSubView] = useState<'list' | 'registration' | 'profile'>('list');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Communications between dashboard quick actions and member screens
  const [searchTrigger, setSearchTrigger] = useState<string>('');

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Global Search State
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>({
    members: [], trainers: [], invoices: [], workouts: [], diets: [], memberships: [], attendance: [], reports: []
  });

  // Capturing updates to Document Title and Favicon
  useEffect(() => {
    if (settings) {
      document.title = `${settings.gym_name || 'Oviyam Gym'} - Gym Management System`;
      
      if (settings.favicon) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.favicon;
      }
    }
  }, [settings]);

  // Terminal Auto-Logout Inactivity Monitor (15 Mins)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let timer: number;
    const resetTimer = () => {
      window.clearTimeout(timer);
      // Log out after 15 minutes of user inactivity (900000ms)
      timer = window.setTimeout(() => {
        alert("Session Expired: You have been automatically signed out due to 15 minutes of inactivity.");
        logout();
      }, 900000);
    };

    const monitoredEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    monitoredEvents.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      window.clearTimeout(timer);
      monitoredEvents.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated, logout]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => n.is_read === 0).length);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (e) {
      console.error('Error marking read:', e);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
        setShowNotificationsDropdown(false);
      }
    } catch (e) {
      console.error('Error marking all read:', e);
    }
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll for notifications
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle Search Input Changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (globalSearchQuery.length < 2) {
        setSearchResults({ members: [], trainers: [], invoices: [], workouts: [], diets: [], memberships: [], attendance: [], reports: [] });
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(globalSearchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [globalSearchQuery]);

  if (authLoading || gymLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl animate-pulse">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-400 text-xs tracking-wider uppercase font-semibold">Loading System Configuration...</span>
        </div>
      </div>
    );
  }

  // Force installation wizard if setup_completed is not done
  if (settings && !settings.setup_completed) {
    return <SetupWizard />;
  }

  // Render Login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  const navigateToResult = (type: 'member' | 'trainer' | 'invoice' | 'workout' | 'diet' | 'membership' | 'attendance' | 'report', targetId: any) => {
    setShowGlobalSearch(false);
    setGlobalSearchQuery('');
    setSearchResults({ members: [], trainers: [], invoices: [], workouts: [], diets: [], memberships: [], attendance: [], reports: [] });

    switch (type) {
      case 'member':
        setSelectedMemberId(targetId);
        setMembersSubView('profile');
        setView('members');
        break;
      case 'trainer':
        setView('trainers');
        break;
      case 'invoice':
        setView('payments');
        break;
      case 'workout':
        setView('workouts');
        break;
      case 'diet':
        setView('diets');
        break;
      case 'membership':
        setView('memberships');
        break;
      case 'attendance':
        setView('attendance');
        break;
      case 'report':
        setView('reports');
        break;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        setView={(v) => {
          setView(v);
          // When switching to members tab from sidebar, default to list view
          if (v === 'members') {
            setMembersSubView('list');
            setSelectedMemberId(null);
          }
        }} 
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 lg:pt-8 h-screen">
        <div className="max-w-7xl mx-auto h-full">

          {/* Premium Header Row */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/5 dark:border-white/5 no-print gap-4">
            
            {/* Clickable Search Placeholder */}
            <div 
              onClick={() => setShowGlobalSearch(true)}
              className="relative w-64 md:w-80 h-10 px-4 rounded-2xl glass-card border border-white/10 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-400 text-[11px]"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span>Search system-wide...</span>
              </div>
              <span className="font-mono text-[9px] bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10">Ctrl+K</span>
            </div>

            {/* Right widgets header */}
            <div className="flex items-center gap-3">
              
              {/* Notification Center */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className="p-2.5 rounded-2xl glass-card border border-white/10 hover:bg-black/5 dark:hover:bg-white/5 relative cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-foreground/80" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center border border-slate-950 shadow-sm animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotificationsDropdown && (
                  <div className="absolute right-0 mt-3 w-80 glass-panel border border-white/10 rounded-3xl shadow-premium z-50 overflow-hidden text-white bg-slate-950/95 backdrop-blur">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/2">
                      <span className="font-extrabold text-xs">Alert Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                      {notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-3 text-xs text-slate-300 transition-colors flex items-start gap-2.5 justify-between ${
                            n.is_read === 0 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/2'
                          }`}
                        >
                          <div className="space-y-0.5 flex-1 pr-1">
                            <p className="font-bold text-white text-[10px] flex items-center gap-1.5">
                              <Shield className="w-3 h-3 text-primary" />
                              {n.type}
                            </p>
                            <p className="text-[9px] text-slate-400 font-medium leading-tight">{n.message}</p>
                          </div>
                          
                          <div className="flex gap-1 items-center shrink-0">
                            {n.is_read === 0 && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="p-1 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-400/30 cursor-pointer"
                                title="Mark read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(n.id)}
                              className="p-1 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-red-500 hover:border-red-500/30 cursor-pointer"
                              title="Delete alert"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="p-8 text-center text-slate-500 italic">No alerts found. System status OK.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Identity Chip */}
              <div className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl border border-white/10 glass-card">
                <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black text-xs uppercase border border-primary/20">
                  {user?.username?.substring(0, 2) || 'AD'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-[10px] font-black leading-tight text-white">{user?.username || 'Administrator'}</p>
                  <p className="text-[8px] text-slate-400 leading-none capitalize mt-0.5 font-bold">{user?.role || 'Admin'}</p>
                </div>
              </div>

            </div>
          </div>

          {currentView === 'dashboard' && (
            <Dashboard 
              setView={(v) => {
                setView(v);
                if (v === 'members') {
                  setMembersSubView('list');
                }
              }}
              setSearchTrigger={(trigger) => {
                if (trigger === 'open-add-modal') {
                  setMembersSubView('registration');
                } else if (trigger === 'focus-search') {
                  setShowGlobalSearch(true);
                }
              }}
              onViewMemberProfile={(id) => {
                setSelectedMemberId(id);
                setMembersSubView('profile');
                setView('members');
              }}
            />
          )}

          {currentView === 'members' && (
            <>
              {membersSubView === 'list' && (
                <MemberList 
                  onViewMember={(id) => {
                    setSelectedMemberId(id);
                    setMembersSubView('profile');
                  }}
                  onAddMember={() => setMembersSubView('registration')}
                  searchTrigger={searchTrigger}
                  clearSearchTrigger={() => setSearchTrigger('')}
                />
              )}
              {membersSubView === 'registration' && (
                <MemberRegistration 
                  onCancel={() => setMembersSubView('list')}
                  onSuccess={(id) => {
                    setSelectedMemberId(id);
                    setMembersSubView('profile');
                  }}
                />
              )}
              {membersSubView === 'profile' && selectedMemberId && (
                <MemberProfile 
                  memberId={selectedMemberId}
                  onBack={() => setMembersSubView('list')}
                />
              )}
            </>
          )}

          {currentView === 'progress' && <ProgressTracking />}
          {currentView === 'attendance' && <Attendance />}
          {currentView === 'reports' && <Reports />}
          {currentView === 'settings' && <Settings />}
          {currentView === 'workouts' && <Workouts />}
          {currentView === 'diets' && <Diets />}
          {currentView === 'memberships' && <Memberships />}
          {currentView === 'payments' && <Payments />}
          {currentView === 'trainers' && <Trainers />}
          {currentView === 'activity_logs' && <ActivityLogs />}
          {currentView === 'help' && <BrandingGuide />}
          {currentView === 'system_health' && <SystemHealth />}
          {currentView === 'import_data' && <ImportData />}
        </div>
      </main>

      {/* Global Search Modal Overlay */}
      {showGlobalSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm pt-24">
          <div className="w-full max-w-2xl rounded-3xl glass-panel shadow-premium p-6 border border-white/10 relative text-white bg-slate-950/95">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <span className="font-extrabold text-sm flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" />
                Global Search Lookup
              </span>
              <button 
                onClick={() => {
                  setShowGlobalSearch(false);
                  setGlobalSearchQuery('');
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search members, trainers, invoices, routines, memberships or attendance..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl glass-input text-white text-xs border-white/10"
              autoFocus
            />

            {/* Results sections */}
            <div className="mt-4 max-h-[350px] overflow-y-auto space-y-4 pr-1 text-xs">
              
              {/* Members Section */}
              {searchResults.members && searchResults.members.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Members ({searchResults.members.length})</span>
                  <div className="space-y-1">
                    {searchResults.members.map((m: any) => (
                      <div 
                        key={m.member_id}
                        onClick={() => navigateToResult('member', m.member_id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{m.full_name}</span>
                          <span className="text-[9px] text-slate-400">ID: {m.member_id} • Plan: {m.membership_plan}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase ${
                          m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trainers Section */}
              {searchResults.trainers && searchResults.trainers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Trainers ({searchResults.trainers.length})</span>
                  <div className="space-y-1">
                    {searchResults.trainers.map((t: any) => (
                      <div 
                        key={t.trainer_id}
                        onClick={() => navigateToResult('trainer', t.trainer_id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{t.full_name}</span>
                          <span className="text-[9px] text-slate-400">Specialization: {t.specialization}</span>
                        </div>
                        <span className="text-[9px] font-bold text-primary">{t.trainer_id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices Section */}
              {searchResults.invoices && searchResults.invoices.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Invoices / Payments ({searchResults.invoices.length})</span>
                  <div className="space-y-1">
                    {searchResults.invoices.map((i: any) => (
                      <div 
                        key={i.invoice_number}
                        onClick={() => navigateToResult('invoice', null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">Invoice: {i.invoice_number}</span>
                          <span className="text-[9px] text-slate-400">Paid amount: {settings.currency || '₹'}{parseFloat(i.paid_amount).toFixed(2)} • Date: {i.payment_date}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase ${
                          i.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>{i.payment_status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Memberships Section */}
              {searchResults.memberships && searchResults.memberships.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Membership Plans ({searchResults.memberships.length})</span>
                  <div className="space-y-1">
                    {searchResults.memberships.map((m: any) => (
                      <div 
                        key={m.id}
                        onClick={() => navigateToResult('membership', m.id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{m.plan_name}</span>
                          <span className="text-[9px] text-slate-400">Duration: {m.duration} • Price: {settings.currency || '₹'}{m.price}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase ${
                          m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendance Section */}
              {searchResults.attendance && searchResults.attendance.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Attendance Logs ({searchResults.attendance.length})</span>
                  <div className="space-y-1">
                    {searchResults.attendance.map((a: any) => (
                      <div 
                        key={a.id}
                        onClick={() => navigateToResult('attendance', null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{a.full_name}</span>
                          <span className="text-[9px] text-slate-400">ID: {a.member_id} • Date: {a.recorded_date}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase ${
                          a.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports Section */}
              {searchResults.reports && searchResults.reports.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Generated Reports ({searchResults.reports.length})</span>
                  <div className="space-y-1">
                    {searchResults.reports.map((r: any) => (
                      <div 
                        key={r.id}
                        onClick={() => navigateToResult('report', null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{r.report_name}</span>
                          <span className="text-[9px] text-slate-400">Type: {r.report_type} • Date: {r.generated_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workouts Section */}
              {searchResults.workouts && searchResults.workouts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Workout Plans ({searchResults.workouts.length})</span>
                  <div className="space-y-1">
                    {searchResults.workouts.map((w: any) => (
                      <div 
                        key={w.id}
                        onClick={() => navigateToResult('workout', null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{w.plan_name}</span>
                          <span className="text-[9px] text-slate-400">Goal: {w.goal} • Level: {w.fitness_level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diet Section */}
              {searchResults.diets && searchResults.diets.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 uppercase block font-black tracking-wider">Diet Plans ({searchResults.diets.length})</span>
                  <div className="space-y-1">
                    {searchResults.diets.map((d: any) => (
                      <div 
                        key={d.id}
                        onClick={() => navigateToResult('diet', null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{d.plan_name}</span>
                          <span className="text-[9px] text-slate-400">Goal: {d.goal} • Target Calories: {d.calories} kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {globalSearchQuery.length >= 2 && 
               (!searchResults.members || searchResults.members.length === 0) && 
               (!searchResults.trainers || searchResults.trainers.length === 0) && 
               (!searchResults.invoices || searchResults.invoices.length === 0) && 
               (!searchResults.workouts || searchResults.workouts.length === 0) && 
               (!searchResults.diets || searchResults.diets.length === 0) && 
               (!searchResults.memberships || searchResults.memberships.length === 0) && 
               (!searchResults.attendance || searchResults.attendance.length === 0) && 
               (!searchResults.reports || searchResults.reports.length === 0) && (
                <div className="py-12 text-center text-slate-400 italic">No matches found for "{globalSearchQuery}".</div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <GymProvider>
      <AuthProvider>
        <React.Suspense fallback={
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-slate-400 text-xs tracking-wider uppercase font-semibold">Loading App Interface...</span>
            </div>
          </div>
        }>
          <AppContent />
        </React.Suspense>
      </AuthProvider>
    </GymProvider>
  );
}
