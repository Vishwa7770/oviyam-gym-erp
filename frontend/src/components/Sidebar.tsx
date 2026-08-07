import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGym } from '../context/GymContext';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Dumbbell,
  Calendar,
  CreditCard,
  ClipboardList,
  UtensilsCrossed,
  Award,
  HelpCircle,
  Server,
  UploadCloud
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: 'dashboard' | 'members' | 'progress' | 'reports' | 'attendance' | 'settings' | 'workouts' | 'diets' | 'memberships' | 'payments' | 'trainers' | 'activity_logs' | 'help' | 'system_health' | 'import_data') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { logout, admin } = useAuth();
  const { settings } = useGym();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', name: 'Members', icon: Users },
    { id: 'trainers', name: 'Trainers', icon: Award },
    { id: 'attendance', name: 'Attendance', icon: Calendar },
    { id: 'workouts', name: 'Workout Plans', icon: Dumbbell },
    { id: 'diets', name: 'Diet Plans', icon: UtensilsCrossed },
    { id: 'memberships', name: 'Memberships', icon: ClipboardList },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'progress', name: 'Progress Tracking', icon: TrendingUp },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'system_health', name: 'System Health', icon: Server },
    { id: 'import_data', name: 'Import Excel Data', icon: UploadCloud },
    { id: 'activity_logs', name: 'Activity Logs', icon: ClipboardList },
    { id: 'help', name: 'Help & Docs', icon: HelpCircle },
    { id: 'settings', name: 'Settings', icon: Settings },
  ] as const;

  const filteredMenuItems = menuItems.filter(item => {
    if (admin?.role === 'trainer') {
      return ['dashboard', 'members', 'attendance', 'workouts', 'diets', 'progress', 'help'].includes(item.id);
    }
    return true;
  });

  const handleNav = (viewId: 'dashboard' | 'members' | 'progress' | 'reports' | 'attendance' | 'settings' | 'workouts' | 'diets' | 'memberships' | 'payments' | 'trainers' | 'activity_logs' | 'help' | 'system_health' | 'import_data') => {
    setView(viewId);
    setIsOpen(false);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden w-full h-16 glass-panel fixed top-0 left-0 z-30 flex items-center justify-between px-4 border-b border-white/10 dark:border-white/5">
        <div className="flex items-center gap-2">
          {settings.gym_logo ? (
            <img src={settings.gym_logo} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <Dumbbell className="w-6 h-6 text-primary" />
          )}
          <span className="font-bold text-lg tracking-wide text-gradient">{settings.gym_name}</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-foreground/80 hover:text-foreground focus:outline-none"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Panel */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-panel border-r border-white/20 dark:border-white/5 
        flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Branding */}
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
          {settings.gym_logo ? (
            <img 
              src={settings.gym_logo} 
              alt="Gym Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-white/20" 
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="font-bold text-lg leading-tight tracking-wide text-gradient">{settings.gym_name}</h1>
            <span className="text-xs text-muted-foreground">Admin Workspace</span>
          </div>
          <button 
            className="lg:hidden ml-auto p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' 
                    : 'text-foreground/75 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground hover:translate-x-1'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-foreground/60'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* User Profile Summary & Logout */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {admin?.username ? admin.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-foreground/90 truncate">{admin?.username || 'Administrator'}</span>
              <span className="text-xs text-muted-foreground truncate">Owner</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Backdrop (for mobile) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}
    </>
  );
};
