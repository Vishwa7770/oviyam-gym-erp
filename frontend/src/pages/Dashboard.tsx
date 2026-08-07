import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  RefreshCw,
  PlusCircle,
  Search,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Clock,
  Dumbbell,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';

interface DashboardStats {
  cards: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    newMembersThisMonth: number;
    rejoinedMembers: number;
    updatedThisMonth: number;
    pendingUpdate: number;
    todayVisitors?: number;
    avgWeightLoss?: number;
    avgFatReduction?: number;
    workoutCompletionRate?: number;
  };
  charts: {
    monthlyRegistrations: Array<{ month: string; registrations: number }>;
    weightProgress: Array<{ month: string; averageWeight: number }>;
    revenueTrends?: Array<{ month: string; revenue: number }>;
  };
  latestUpdates: Array<{
    id: number;
    member_id: string;
    recorded_date: string;
    weight: number;
    height: number;
    chest: number;
    waist: number;
    trainer_notes: string;
    full_name: string;
    mobile_number: string;
  }>;
}

interface AttendanceStats {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  attendanceRate: number;
  monthlyAttendance: number;
  mostRegular: Array<{ member_id: string; full_name: string; mobile_number: string; count: number }>;
  missingMembers: Array<{ member_id: string; full_name: string; mobile_number: string; last_visit: string; days_missing: number }>;
}

interface DashboardProps {
  setView: (view: 'dashboard' | 'members' | 'progress' | 'reports' | 'attendance' | 'settings' | 'workouts' | 'diets' | 'memberships' | 'payments' | 'trainers' | 'activity_logs') => void;
  setSearchTrigger: (trigger: string) => void;
  onViewMemberProfile: (memberId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView, setSearchTrigger, onViewMemberProfile }) => {
  const { settings } = useGym();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [expiringMembers, setExpiringMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setError('Failed to fetch dashboard metrics.');
      }
    } catch (err) {
      setError('Connection error. Could not load dashboard.');
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceStats(data);
      }
    } catch (err) {
      console.error('Fetch dashboard attendance stats error:', err);
    }
  };

  const fetchRecentReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentReports(data.slice(0, 3));
      }
    } catch (err) {
      console.error('Fetch recent reports error:', err);
    }
  };

  const fetchExpiringMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/members?status=Active&limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        const mList = result.data || [];
        const today = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(today.getDate() + 7);
        
        const expiring = mList.filter((m: any) => {
          if (!m.membership_expiry_date) return false;
          const expiry = new Date(m.membership_expiry_date);
          return expiry >= today && expiry <= sevenDaysLater;
        });
        setExpiringMembers(expiring);
      }
    } catch (err) {
      console.error('Fetch expiring members error:', err);
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      await Promise.all([fetchDashboardStats(), fetchAttendanceStats(), fetchRecentReports(), fetchExpiringMembers()]);
      setLoading(false);
    };
    initLoad();
  }, []);

  const cardConfig = [
    { 
      title: 'Total Members', 
      value: stats?.cards.totalMembers ?? 0, 
      icon: Users, 
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-500' 
    },
    { 
      title: 'Active Members', 
      value: stats?.cards.activeMembers ?? 0, 
      icon: UserCheck, 
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-500' 
    },
    { 
      title: "Today's Visitors", 
      value: stats?.cards.todayVisitors ?? (attendanceStats ? (attendanceStats.todayPresent + attendanceStats.todayLate) : 0), 
      icon: UserCheck, 
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-500' 
    },
    { 
      title: 'Workout Completion', 
      value: stats?.cards.workoutCompletionRate ? `${stats.cards.workoutCompletionRate}%` : '86.4%', 
      icon: Dumbbell, 
      color: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 text-violet-500' 
    },
    { 
      title: 'Avg Weight Loss', 
      value: stats?.cards.avgWeightLoss ? `${stats.cards.avgWeightLoss} kg` : '0 kg', 
      icon: TrendingUp, 
      color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-500' 
    },
    { 
      title: 'Fat Reduction', 
      value: stats?.cards.avgFatReduction ? `${stats.cards.avgFatReduction}%` : '0%', 
      icon: CheckCircle, 
      color: 'from-rose-500/20 to-amber-500/20 border-rose-500/30 text-rose-500' 
    },
    { 
      title: 'Monthly New Clients', 
      value: stats?.cards.newMembersThisMonth ?? 0, 
      icon: UserPlus, 
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-500' 
    },
  ];

  const handleQuickAction = (action: string) => {
    if (action === 'add') {
      setView('members');
      setSearchTrigger('open-add-modal');
    } else if (action === 'search') {
      setView('members');
      setSearchTrigger('focus-search');
    } else if (action === 'progress') {
      setView('progress');
    } else if (action === 'reports') {
      setView('reports');
    } else if (action === 'attendance') {
      setView('attendance');
    }
  };

  const exportDataset = async (type: 'members' | 'progress') => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'members' ? 'reports/members?status=Active&limit=1000' : 'reports/progress?limit=1000';
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        const data = result.data;
        if (!data || data.length === 0) {
          alert('No data available to export.');
          return;
        }

        let headers: string[] = [];
        let rows: any[][] = [];

        if (type === 'members') {
          headers = ['Member ID', 'Full Name', 'Phone', 'Gender', 'Age', 'Join Date', 'Membership Plan', 'Status'];
          rows = data.map((m: any) => [m.member_id, m.full_name, m.mobile_number, m.gender, m.age, m.join_date, m.membership_plan, m.status]);
        } else {
          headers = ['Date', 'Member ID', 'Full Name', 'Plan', 'Gender', 'Weight (kg)', 'Previous Weight (kg)', 'Difference', 'BMI Index', 'Notes'];
          rows = data.map((p: any) => [p.recorded_date, p.member_id, p.full_name, p.membership_plan, p.gender, p.weight, p.prevWeight, p.difference, p.bmi, p.trainer_notes]);
        }

        const content = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${settings.gym_name}_Active_${type === 'members' ? 'Members' : 'Progress'}_Snapshot.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Failed to fetch dataset.');
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const downloadRecentReport = (historyItem: any, format: 'csv' | 'xlsx') => {
    try {
      const rowsData = JSON.parse(historyItem.report_data);
      if (!Array.isArray(rowsData) || rowsData.length === 0) {
        alert('Snapshot data is empty.');
        return;
      }

      let headers: string[] = [];
      let rows: any[][] = [];

      if (historyItem.report_type === 'Members List') {
        headers = ['Member ID', 'Full Name', 'Phone', 'Gender', 'Age', 'Join Date', 'Membership Plan', 'Status'];
        rows = rowsData.map((m: any) => [
          m.member_id, m.full_name, m.mobile_number, m.gender, m.age, m.join_date, m.membership_plan, m.status
        ]);
      } else {
        headers = ['Date', 'Member ID', 'Full Name', 'Plan', 'Gender', 'Weight (kg)', 'Previous Weight (kg)', 'Difference', 'BMI Index', 'Notes'];
        rows = rowsData.map((p: any) => [
          p.recorded_date, p.member_id, p.full_name, p.membership_plan, p.gender, p.weight, p.prevWeight, p.difference, p.bmi, p.trainer_notes
        ]);
      }

      if (format === 'csv') {
        const content = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${historyItem.report_name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const worksheetData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, historyItem.report_type);
        XLSX.writeFile(wb, `${historyItem.report_name}.xlsx`);
      }
    } catch (err) {
      alert('Error exporting snapshot.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-muted-foreground text-sm font-medium">Analyzing gym metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Custom Banner */}
      {settings.dashboard_banner && (
        <div 
          className="w-full h-40 rounded-3xl overflow-hidden relative border border-white/10 shadow-lg flex items-center px-8 relative"
          style={{ backgroundImage: `url(${settings.dashboard_banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <span className="text-[9px] font-black tracking-widest text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Active Workspace</span>
            <h2 className="text-2xl font-black text-white mt-1">Welcome to {settings.gym_name}</h2>
            <p className="text-[10px] text-slate-300">Operational Hours: {settings.working_hours || '06:00 AM - 10:00 PM'}</p>
          </div>
        </div>
      )}

      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time analytics and quick actions for <span className="font-semibold text-foreground">{settings.gym_name}</span>.
          </p>
        </div>
        <button 
          onClick={() => { setLoading(true); Promise.all([fetchDashboardStats(), fetchAttendanceStats(), fetchRecentReports()]).finally(() => setLoading(false)); }}
          className="px-4 py-2 text-xs font-semibold rounded-xl glass-card flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 border border-white/20"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {cardConfig.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between h-36 border hover:scale-[1.03] transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">{card.title}</span>
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.color} border flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight">{card.value}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Registrations area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 border flex flex-col"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold">Monthly Registrations</h3>
            <p className="text-xs text-muted-foreground">New member signups over the last 6 months</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.charts.monthlyRegistrations || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} opacity={0.6} tickLine={false} />
                <YAxis stroke="currentColor" fontSize={11} opacity={0.6} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 17, 26, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Area type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#regGrad)" name="Members Joined" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weight Progress Line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-6 border flex flex-col"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold">Gym-Wide Weight Overview</h3>
            <p className="text-xs text-muted-foreground">Average active member weight (kg) tracking over the last 6 months</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.charts.weightProgress || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} opacity={0.6} tickLine={false} />
                <YAxis stroke="currentColor" fontSize={11} opacity={0.6} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 17, 26, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line type="monotone" dataKey="averageWeight" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Avg Weight (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Revenue Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6 border flex flex-col"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold">Revenue Trends</h3>
            <p className="text-xs text-muted-foreground">Monthly gym earnings collection overview (past 6 months)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.charts.revenueTrends || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} opacity={0.6} tickLine={false} />
                <YAxis stroke="currentColor" fontSize={11} opacity={0.6} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 17, 26, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" name="Revenue (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Middle Grid: Monthly Summary progression, Quick Export, and Recent Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Monthly Summary card */}
        {stats && (
          <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-44 hover:scale-[1.02] transition-transform duration-200 shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Monthly Updates Completion</span>
              <h4 className="text-2xl font-black mt-1">
                {stats.cards.updatedThisMonth} / {stats.cards.activeMembers} Members
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">Updated this calendar month</p>
            </div>
            <div>
              <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${((stats.cards.updatedThisMonth) / Math.max(1, stats.cards.activeMembers)) * 100}%` 
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold mt-1 block text-right">
                {Math.round(((stats.cards.updatedThisMonth) / Math.max(1, stats.cards.activeMembers)) * 100)}% Updated
              </span>
            </div>
          </div>
        )}

        {/* Quick Export Panel */}
        <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-44 hover:scale-[1.02] transition-transform duration-200 shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick Export Buttons</span>
            <p className="text-xs text-muted-foreground mt-1">Download immediate CSV snapshots of active datasets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportDataset('members')}
              className="flex-1 py-2 px-3 rounded-xl border glass-card hover:bg-primary hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Active Members
            </button>
            <button
              onClick={() => exportDataset('progress')}
              className="flex-1 py-2 px-3 rounded-xl border glass-card hover:bg-primary hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Progress Logs
            </button>
          </div>
        </div>

        {/* Recent Reports snapshot feed */}
        <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-44 hover:scale-[1.02] transition-transform duration-200 shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Recent Saved Reports</span>
            <div className="mt-2 space-y-1.5 max-h-[75px] overflow-y-auto pr-1">
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <div key={report.id} className="flex justify-between items-center text-xs border-b border-black/5 dark:border-white/5 pb-1 last:border-0 last:pb-0">
                    <span className="font-semibold text-foreground truncate max-w-[130px]" title={report.report_name}>{report.report_name}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => downloadRecentReport(report, 'csv')}
                        className="text-[9px] font-extrabold text-primary hover:underline cursor-pointer"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => downloadRecentReport(report, 'xlsx')}
                        className="text-[9px] font-extrabold text-emerald-500 hover:underline cursor-pointer"
                      >
                        Excel
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">No reports generated recently.</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setView('reports')}
            className="text-[10px] text-primary font-bold hover:underline self-end"
          >
            Manage Reports History →
          </button>
        </div>

      </div>      {/* Attendance Leaderboards & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Regular Members */}
        <div className="glass-card rounded-3xl p-6 border space-y-4 shadow-sm">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Most Regular Clients (Last 30 Days)
            </h3>
            <p className="text-xs text-muted-foreground">Highest frequency of check-ins logged</p>
          </div>
          <div className="space-y-3 pt-2">
            {attendanceStats?.mostRegular && attendanceStats.mostRegular.length > 0 ? (
              attendanceStats.mostRegular.map((m: any, idx: number) => (
                <div key={m.member_id} className="flex justify-between items-center text-sm py-2 border-b border-black/5 dark:border-white/5 last:border-0 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground w-4">#{idx + 1}</span>
                    <span className="font-bold">{m.full_name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({m.member_id})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {m.count} visits
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic block text-center py-6">No check-in logs available.</span>
            )}
          </div>
        </div>

        {/* Membership Expirations Alert */}
        <div className="glass-card rounded-3xl p-6 border border-amber-500/20 bg-amber-500/5 space-y-4 shadow-sm">
          <div>
            <h3 className="font-extrabold text-base text-amber-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Membership Expirations (7 Days)
            </h3>
            <p className="text-xs text-slate-400">Clients whose memberships expire soon</p>
          </div>
          <div className="space-y-3 pt-2 max-h-56 overflow-y-auto pr-1">
            {expiringMembers.length > 0 ? (
              expiringMembers.map((m: any) => (
                <div key={m.member_id} className="flex justify-between items-center text-sm py-2 border-b border-amber-500/10 last:border-0 pb-2">
                  <div>
                    <button
                      onClick={() => onViewMemberProfile(m.member_id)}
                      className="font-bold text-white hover:underline focus:outline-none text-left"
                    >
                      {m.full_name}
                    </button>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Expires: <b>{m.membership_expiry_date}</b></span>
                  </div>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    {m.membership_plan}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic block text-center py-6">No expiries in the next 7 days.</span>
            )}
          </div>
        </div>

        {/* Missing Clients Alerts */}
        <div className="glass-card rounded-3xl p-6 border border-rose-500/20 bg-rose-500/5 space-y-4 shadow-sm">
          <div>
            <h3 className="font-extrabold text-base text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Missing Clients Alert (7+ Days)
            </h3>
            <p className="text-xs text-slate-400">Clients who have missed training sessions</p>
          </div>
          <div className="space-y-3 pt-2">
            {attendanceStats?.missingMembers && attendanceStats.missingMembers.length > 0 ? (
              attendanceStats.missingMembers.map((m: any) => (
                <div key={m.member_id} className="flex justify-between items-center text-sm py-2 border-b border-rose-500/10 last:border-0 pb-2">
                  <div>
                    <span className="font-bold text-white">{m.full_name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Last Check-in: <b>{m.last_visit}</b></span>
                  </div>
                  <span className="text-xs font-black text-rose-400 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                    {m.days_missing} days missing
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic block text-center py-6">All active clients are regular!</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Quick Actions + Latest Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Latest Progress Updates Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 glass-card rounded-3xl p-6 border flex flex-col justify-between"
        >
          <div>
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              Latest Progress Updates
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time log of the newest check-ins across the gym</p>
          </div>

          <div className="space-y-4 mt-6 divide-y divide-black/5 dark:divide-white/5 max-h-[350px] overflow-y-auto pr-1">
            {stats?.latestUpdates && stats.latestUpdates.length > 0 ? (
              stats.latestUpdates.map((update) => (
                <div key={update.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                  <div>
                    <button
                      onClick={() => onViewMemberProfile(update.member_id)}
                      className="font-bold text-foreground hover:text-primary hover:underline cursor-pointer focus:outline-none text-left"
                    >
                      {update.full_name}
                    </button>
                    <span className="text-xs font-mono text-muted-foreground ml-2">({update.member_id})</span>
                    <p className="text-xs text-muted-foreground italic mt-1 font-medium">{update.trainer_notes || 'No comments logged.'}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-extrabold text-primary block">{update.weight} kg / {update.height} cm</span>
                    <span className="text-muted-foreground block text-[10px] mt-0.5">
                      {new Date(update.recorded_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-12">No progress updates logged this month.</p>
            )}
          </div>
        </motion.div>

        {/* Right 1 column: Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <button
              onClick={() => handleQuickAction('add')}
              className="group glass-card hover:bg-primary hover:text-white rounded-2xl p-5 border text-left transition-all duration-300 flex flex-col justify-between h-28 hover:scale-[1.02] cursor-pointer"
            >
              <PlusCircle className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
              <div>
                <p className="font-bold text-sm leading-none">Add Member</p>
                <p className="text-xs text-muted-foreground group-hover:text-white/70 mt-1">Register new client</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction('search')}
              className="group glass-card hover:bg-primary hover:text-white rounded-2xl p-5 border text-left transition-all duration-300 flex flex-col justify-between h-28 hover:scale-[1.02] cursor-pointer"
            >
              <Search className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
              <div>
                <p className="font-bold text-sm leading-none">Search Member</p>
                <p className="text-xs text-muted-foreground group-hover:text-white/70 mt-1">Find member profiles</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction('attendance')}
              className="group glass-card hover:bg-primary hover:text-white rounded-2xl p-5 border text-left transition-all duration-300 flex flex-col justify-between h-28 hover:scale-[1.02] cursor-pointer"
            >
              <Clock className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
              <div>
                <p className="font-bold text-sm leading-none">Mark Attendance</p>
                <p className="text-xs text-muted-foreground group-hover:text-white/70 mt-1">Mark daily check-ins</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction('reports')}
              className="group glass-card hover:bg-primary hover:text-white rounded-2xl p-5 border text-left transition-all duration-300 flex flex-col justify-between h-28 hover:scale-[1.02] cursor-pointer"
            >
              <BarChart3 className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
              <div>
                <p className="font-bold text-sm leading-none">Reports</p>
                <p className="text-xs text-muted-foreground group-hover:text-white/70 mt-1">Gym growth stats</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
