import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Search, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  TrendingUp,
  X,
  Trash2,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

interface AttendanceLog {
  id: number;
  member_id: string;
  recorded_date: string;
  status: 'Present' | 'Absent' | 'Late';
  time_in: string;
  time_out: string;
  trainer: string;
  full_name: string;
  mobile_number: string;
  membership_plan: string;
}

interface StatsData {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  attendanceRate: number;
  weeklyAttendance: Array<{ date: string; day: string; count: number }>;
  monthlyAttendance: number;
  mostRegular: Array<{ member_id: string; full_name: string; mobile_number: string; count: number }>;
  missingMembers: Array<{ member_id: string; full_name: string; mobile_number: string; last_visit: string; days_missing: number }>;
}

export const Attendance: React.FC = () => {
  const { settings } = useGym();
  
  // Dashboard & stats loading states
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab views: 'dashboard' | 'mark' | 'history' | 'calendar'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mark' | 'history' | 'calendar'>('dashboard');

  // Mark check-in state
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedMemberStats, setSelectedMemberStats] = useState<any | null>(null);
  const [customTimeIn, setCustomTimeIn] = useState('');
  const [customTimeOut, setCustomTimeOut] = useState('');
  const [markLoading, setMarkLoading] = useState(false);

  // History filtering
  const [historyFilter, setHistoryFilter] = useState({
    search: '',
    status: 'All',
    date: '',
    month: '',
    page: 1,
    limit: 15
  });
  const [historyData, setHistoryData] = useState<AttendanceLog[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Calendar parameters
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [calendarCheckins, setCalendarCheckins] = useState<AttendanceLog[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState<{ day: number; logs: AttendanceLog[] } | null>(null);

  // Load KPI stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Fetch attendance stats error:', err);
      setError('Connection error. Failed to load stats.');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch Member details for marking attendance
  const handleSearchMember = async (val: string) => {
    setSearchMemberQuery(val);
    if (val.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/members?search=${encodeURIComponent(val)}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setMemberResults(result.data || []);
      }
    } catch (err) {
      console.error('Member lookup error:', err);
    }
  };

  const handleSelectMember = async (member: any) => {
    setSelectedMember(member);
    setMemberResults([]);
    setSearchMemberQuery('');
    
    // Fetch individual attendance stats
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance/member/${member.member_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedMemberStats(data);
      }
    } catch (err) {
      console.error('Fetch individual attendance error:', err);
    }
  };

  const handleMarkAttendance = async (status: 'Present' | 'Absent' | 'Late') => {
    if (!selectedMember) return;
    setMarkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          member_id: selectedMember.member_id,
          status,
          time_in: customTimeIn || undefined,
          time_out: customTimeOut || undefined
        })
      });

      if (res.ok) {
        alert(`Attendance marked as ${status} successfully.`);
        // Reload Stats
        fetchStats();
        // Refresh selected member stats
        handleSelectMember(selectedMember);
        // Clear time defaults
        setCustomTimeIn('');
        setCustomTimeOut('');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to submit check-in.');
      }
    } catch (err) {
      alert('Error connecting to check-in endpoints.');
    } finally {
      setMarkLoading(false);
    }
  };

  // Fetch History records
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (historyFilter.search) queryParams.append('search', historyFilter.search);
      if (historyFilter.status !== 'All') queryParams.append('status', historyFilter.status);
      if (historyFilter.date) queryParams.append('date', historyFilter.date);
      if (historyFilter.month) queryParams.append('month', historyFilter.month);
      
      queryParams.append('page', String(historyFilter.page));
      queryParams.append('limit', String(historyFilter.limit));

      const res = await fetch(`${API_BASE}/attendance/history?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setHistoryData(result.data);
        setHistoryTotal(result.pagination.total);
        setHistoryPages(result.pagination.pages);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyFilter.page, historyFilter.status, historyFilter.date, historyFilter.month]);

  const handleApplyHistorySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHistoryFilter(f => ({ ...f, page: 1 }));
    fetchHistory();
  };

  const handleDeleteHistory = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this check-in record?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Check-in log removed.');
        fetchHistory();
        fetchStats();
      }
    } catch (err) {
      alert('Error removing record.');
    }
  };

  // Fetch Calendar Month Check-ins
  const fetchCalendarCheckins = async () => {
    setCalendarLoading(true);
    try {
      const token = localStorage.getItem('token');
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const res = await fetch(`${API_BASE}/attendance/history?month=${monthStr}&limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setCalendarCheckins(result.data || []);
      }
    } catch (err) {
      console.error('Calendar check-ins fetch error:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarCheckins();
    }
  }, [activeTab, currentYear, currentMonth]);

  // Calendar Grid builder
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const monthsNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
    setSelectedDayDetails(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
    setSelectedDayDetails(null);
  };

  const getDayStatusColor = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const matched = calendarCheckins.filter(c => String(c.recorded_date).substring(0, 10) === dateStr);
    if (matched.length === 0) return 'border-transparent hover:border-white/20';

    // Priority color: If any 'Present', Green; if 'Late', Yellow; if only 'Absent', Red
    if (matched.some(c => c.status === 'Present')) return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/30';
    if (matched.some(c => c.status === 'Late')) return 'bg-amber-500/20 text-amber-500 border-amber-500/40 hover:bg-amber-500/30';
    return 'bg-red-500/20 text-red-500 border-red-500/40 hover:bg-red-500/30';
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const matched = calendarCheckins.filter(c => String(c.recorded_date).substring(0, 10) === dateStr);
    setSelectedDayDetails({
      day,
      logs: matched
    });
  };

  // CSV/Excel Exports
  const handleExportHistory = (format: 'csv' | 'xlsx') => {
    if (historyData.length === 0) {
      alert('No logged history available to export.');
      return;
    }
    const headers = ['Date', 'Member ID', 'Full Name', 'Phone', 'Plan', 'Status', 'Time In', 'Time Out', 'Trainer'];
    const rows = historyData.map(log => [
      log.recorded_date,
      log.member_id,
      log.full_name,
      log.mobile_number,
      log.membership_plan,
      log.status,
      log.time_in || '—',
      log.time_out || '—',
      log.trainer
    ]);

    if (format === 'csv') {
      const content = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${settings.gym_name}_Attendance_History.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Logs');
      XLSX.writeFile(wb, `${settings.gym_name}_Attendance_History.xlsx`);
    }
  };

  const handlePrintDailyReport = () => {
    const originalTitle = document.title;
    const filterTitle = historyFilter.date ? `_Daily_${historyFilter.date}` : '_History';
    document.title = `${settings.gym_name}_Attendance_Report${filterTitle}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="space-y-6">
      
      {/* Tab controls */}
      <div className="flex border-b border-black/5 dark:border-white/5 gap-4 overflow-x-auto whitespace-nowrap scrollbar-none no-print">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Attendance Dashboard
        </button>
        <button
          onClick={() => { setActiveTab('mark'); setSelectedMember(null); setSearchMemberQuery(''); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'mark' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Mark Check-ins
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Daily Logs & Archives
        </button>
        <button
          onClick={() => { setActiveTab('calendar'); setSelectedDayDetails(null); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Interactive Calendar
        </button>
      </div>

      {/* RENDER PAGES */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 no-print">
          
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          {/* Top KPIs Summary row */}
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : stats ? (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Present Today</span>
                    <UserCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-3xl font-black">{stats.todayPresent}</span>
                </div>

                <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Late Arrivals</span>
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-3xl font-black text-amber-500">{stats.todayLate}</span>
                </div>

                <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Absent Today</span>
                    <UserX className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-3xl font-black text-red-500">{stats.todayAbsent}</span>
                </div>

                <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Daily Attendance Rate</span>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-3xl font-black text-primary">{stats.attendanceRate}%</span>
                </div>

                <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-200 col-span-2 md:col-span-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Last 30 Days Visits</span>
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-3xl font-black">{stats.monthlyAttendance}</span>
                </div>
              </div>

              {/* Weekly bar visualizer */}
              <div className="glass-card rounded-3xl p-6 border">
                <div>
                  <h3 className="font-extrabold text-base">Weekly Attendance Tracker</h3>
                  <p className="text-xs text-muted-foreground">Logged gym check-ins for the last 7 calendar days</p>
                </div>
                <div className="flex items-end justify-between gap-2 h-36 mt-8 max-w-xl mx-auto px-4">
                  {stats.weeklyAttendance.map(w => {
                    const maxVal = Math.max(...stats.weeklyAttendance.map(x => x.count), 1);
                    const percent = (w.count / maxVal) * 100;
                    return (
                      <div key={w.date} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <span className="text-[10px] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white py-0.5 px-1.5 rounded-md -translate-y-1">
                          {w.count}
                        </span>
                        <div className="w-full bg-black/5 dark:bg-white/5 rounded-t-lg h-24 relative overflow-hidden flex items-end">
                          <div 
                            className="bg-primary rounded-t-lg w-full transition-all duration-500" 
                            style={{ height: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{w.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leaderboard and Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Most regular */}
                <div className="glass-card rounded-3xl p-6 border space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      Most Regular Clients (Last 30 Days)
                    </h3>
                    <p className="text-xs text-muted-foreground">Gym members with highest visit frequency counts</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {stats.mostRegular.length > 0 ? (
                      stats.mostRegular.map((m, idx) => (
                        <div key={m.member_id} className="flex items-center justify-between text-sm py-2 border-b border-black/5 dark:border-white/5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground w-4">#{idx + 1}</span>
                            <div>
                              <span className="font-bold">{m.full_name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono ml-2">({m.member_id})</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                            {m.count} check-ins
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic block text-center py-6">No check-ins logged.</span>
                    )}
                  </div>
                </div>

                {/* Missing alerts */}
                <div className="glass-card rounded-3xl p-6 border border-rose-500/20 bg-rose-500/5 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-rose-500 text-base flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                      Missing Active Clients (7+ Days)
                    </h3>
                    <p className="text-xs text-slate-400">Gym alerts for members who haven't visited in over a week</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {stats.missingMembers.length > 0 ? (
                      stats.missingMembers.map(m => (
                        <div key={m.member_id} className="flex items-center justify-between text-sm py-2 border-b border-rose-500/10 last:border-0 last:pb-0">
                          <div>
                            <span className="font-bold text-white">{m.full_name}</span>
                            <p className="text-[10px] text-slate-400">Last Visit: <b>{m.last_visit}</b></p>
                          </div>
                          <span className="text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                            {m.days_missing} days absent
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic block text-center py-6">All active members checked in recently!</span>
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-12">Failed to load statistics.</p>
          )}

        </div>
      )}

      {activeTab === 'mark' && (
        <div className="space-y-6 max-w-2xl mx-auto no-print">
          
          {/* Member lookup panel */}
          <div className="glass-card rounded-3xl p-6 border space-y-4 relative">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Find Gym Member
              </h3>
              <p className="text-xs text-muted-foreground">Search by Member ID, mobile number, or full name to check-in.</p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchMemberQuery}
                onChange={(e) => handleSearchMember(e.target.value)}
                placeholder="Type member ID, name, or phone number..."
                className="w-full h-12 px-4 pl-11 rounded-xl glass-input text-sm"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-4" />

              {/* Suggestions overlay */}
              {memberResults.length > 0 && (
                <div className="absolute top-13 left-0 right-0 z-10 glass-panel border rounded-xl overflow-hidden shadow-premium">
                  {memberResults.map(m => (
                    <button
                      key={m.member_id}
                      onClick={() => handleSelectMember(m)}
                      className="w-full p-3.5 text-left text-xs border-b border-white/5 hover:bg-white/5 last:border-0 flex justify-between items-center text-white cursor-pointer"
                    >
                      <div>
                        <span className="font-bold block">{m.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {m.member_id} • Phone: {m.mobile_number}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                        m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {m.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Member details & check-in buttons */}
          {selectedMember && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-6 border space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black uppercase">
                    {selectedMember.full_name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg leading-tight">{selectedMember.full_name}</h4>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {selectedMember.member_id} • {selectedMember.mobile_number}</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="text-muted-foreground block">Active Plan:</span>
                  <span className="font-extrabold text-primary">{selectedMember.membership_plan}</span>
                </div>
              </div>

              {/* Individual attendance statistics summary */}
              {selectedMemberStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-black/5 dark:bg-white/5 border border-white/5 rounded-2xl">
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Present Days</span>
                    <span className="text-base font-black text-emerald-500">{selectedMemberStats.stats.totalPresent}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Late Days</span>
                    <span className="text-base font-black text-amber-500">{selectedMemberStats.stats.totalLate}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Attendance Rate</span>
                    <span className="text-base font-black text-primary">{selectedMemberStats.stats.attendanceRate}%</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Last Check-in</span>
                    <span className="text-xs font-bold block mt-1">{selectedMemberStats.stats.lastVisit}</span>
                  </div>
                </div>
              )}

              {/* Optional Custom Time override */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground pl-1 uppercase tracking-wider">Time In (Optional)</label>
                  <input
                    type="text"
                    value={customTimeIn}
                    onChange={(e) => setCustomTimeIn(e.target.value)}
                    placeholder="e.g. 08:30 AM"
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground pl-1 uppercase tracking-wider">Time Out (Optional)</label>
                  <input
                    type="text"
                    value={customTimeOut}
                    onChange={(e) => setCustomTimeOut(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Checkin Buttons */}
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-xs font-bold text-muted-foreground uppercase pl-1 tracking-wider block">Mark Status</span>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    disabled={markLoading}
                    onClick={() => handleMarkAttendance('Present')}
                    className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm cursor-pointer transition-colors shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                  >
                    Present
                  </button>
                  <button
                    disabled={markLoading}
                    onClick={() => handleMarkAttendance('Late')}
                    className="h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm cursor-pointer transition-colors shadow-sm shadow-amber-500/20 disabled:opacity-50"
                  >
                    Late
                  </button>
                  <button
                    disabled={markLoading}
                    onClick={() => handleMarkAttendance('Absent')}
                    className="h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm cursor-pointer transition-colors shadow-sm shadow-red-500/20 disabled:opacity-50"
                  >
                    Absent
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* History filter header */}
          <div className="glass-card rounded-3xl p-6 border space-y-4 no-print">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Daily Logs & Archives
                </h3>
                <p className="text-xs text-muted-foreground">Search and audit chronological client check-ins.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleExportHistory('csv')}
                  className="px-3.5 py-2.5 rounded-xl border glass-card hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 cursor-pointer text-primary"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => handleExportHistory('xlsx')}
                  className="px-3.5 py-2.5 rounded-xl border glass-card hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 cursor-pointer text-emerald-500"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={handlePrintDailyReport}
                  className="px-3.5 py-2.5 rounded-xl border glass-card hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 cursor-pointer text-slate-300"
                >
                  <Printer className="w-4 h-4" />
                  Print Report
                </button>
              </div>
            </div>

            <form onSubmit={handleApplyHistorySearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold pt-2">
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase">Member Search</label>
                <input
                  type="text"
                  value={historyFilter.search}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, search: e.target.value })}
                  placeholder="ID or Name..."
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground uppercase">Status</label>
                <select
                  value={historyFilter.status}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, status: e.target.value, page: 1 })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground uppercase">Date Check-in</label>
                <input
                  type="date"
                  value={historyFilter.date}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, date: e.target.value, page: 1 })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground uppercase">Month Archive</label>
                <input
                  type="month"
                  value={historyFilter.month}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, month: e.target.value, page: 1 })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                />
              </div>
            </form>
          </div>

          {/* Printable Layout Title (Print mode only) */}
          <div className="print-only border-b border-black pb-4 mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight uppercase">{settings.gym_name}</h1>
            <p className="text-xs">{settings.address || 'Gym Address'} • Ph: {settings.phone_number}</p>
            <div className="flex justify-between items-center mt-6">
              <h2 className="text-lg font-bold">DAILY ATTENDANCE LOG REPORT</h2>
              <span className="text-xs text-slate-500 font-mono">
                Parameters: {historyFilter.date ? `Date: ${historyFilter.date}` : historyFilter.month ? `Month: ${historyFilter.month}` : 'All Time'} ({historyFilter.status} Statuses)
              </span>
            </div>
          </div>

          {/* Logs table list */}
          <div className="glass-card rounded-3xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-xs text-muted-foreground font-bold uppercase">
                    <th className="p-4 print-color-black">Date</th>
                    <th className="p-4 print-color-black">Member ID</th>
                    <th className="p-4 print-color-black">Full Name</th>
                    <th className="p-4 print-color-black">Plan Type</th>
                    <th className="p-4 print-color-black">Status</th>
                    <th className="p-4 print-color-black">Time In</th>
                    <th className="p-4 print-color-black">Time Out</th>
                    <th className="p-4 print-color-black">Trainer</th>
                    <th className="p-4 text-right w-24 no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs text-muted-foreground italic">
                        Refreshing attendance history...
                      </td>
                    </tr>
                  ) : historyData.length > 0 ? (
                    historyData.map(log => (
                      <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-foreground/80">{log.recorded_date}</td>
                        <td className="p-4 font-mono text-xs">{log.member_id}</td>
                        <td className="p-4">{log.full_name}</td>
                        <td className="p-4 text-xs text-muted-foreground">{log.membership_plan}</td>
                        <td className="p-4 text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            log.status === 'Present' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : log.status === 'Late' 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs">{log.time_in || '—'}</td>
                        <td className="p-4 font-mono text-xs">{log.time_out || '—'}</td>
                        <td className="p-4 text-xs text-muted-foreground">{log.trainer}</td>
                        <td className="p-4 text-right no-print">
                          <button
                            onClick={() => handleDeleteHistory(log.id)}
                            className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-white text-destructive cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-xs text-muted-foreground italic">
                        No check-in logs match selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {historyPages > 1 && (
              <div className="p-4 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex justify-between items-center text-xs font-semibold text-muted-foreground no-print">
                <span>Total records: <b>{historyTotal}</b></span>
                <div className="flex gap-2 items-center">
                  <button
                    disabled={historyFilter.page === 1}
                    onClick={() => setHistoryFilter({ ...historyFilter, page: historyFilter.page - 1 })}
                    className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {historyFilter.page} of {historyPages}</span>
                  <button
                    disabled={historyFilter.page === historyPages}
                    onClick={() => setHistoryFilter({ ...historyFilter, page: historyFilter.page + 1 })}
                    className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="print-only flex justify-between items-center text-[10px] text-slate-500 pt-8 border-t border-black mt-8">
            <span>Printed on: {new Date().toLocaleString()}</span>
            <span>{settings.gym_name} Tracking • Page 1 of 1</span>
          </div>

        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-6 max-w-4xl mx-auto no-print">
          
          {/* Calendar controller header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {monthsNames[currentMonth]} {currentYear}
              </h3>
              <p className="text-xs text-muted-foreground">Click any day to audit check-in list.</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCurrentMonth(new Date().getMonth()); setCurrentYear(new Date().getFullYear()); }}
                className="px-3 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar grid view */}
          {calendarLoading ? (
            <div className="flex justify-center py-20">
              <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-4">
              {/* Day names */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-2 text-sm">
                {/* Empty cells before month start */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 rounded-xl border border-transparent" />
                ))}

                {/* Days cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dayColorClass = getDayStatusColor(day);
                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => handleDayClick(day)}
                      className={`h-16 rounded-xl border flex flex-col justify-between p-2 text-left font-bold transition-all cursor-pointer ${dayColorClass}`}
                    >
                      <span className="leading-none">{day}</span>
                    </button>
                  );
                })}
              </div>

              {/* Calendar key */}
              <div className="flex gap-4 items-center justify-center text-[10px] text-muted-foreground font-bold uppercase pt-4 border-t border-white/5">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Absent</span>
              </div>
            </div>
          )}

          {/* Daily Details Modal */}
          {selectedDayDetails && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-6 border space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="font-extrabold text-base">
                  Check-ins on {monthsNames[currentMonth]} {selectedDayDetails.day}, {currentYear}
                </h4>
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  className="text-muted-foreground hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {selectedDayDetails.logs.length > 0 ? (
                  selectedDayDetails.logs.map(log => (
                    <div key={log.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <span className="font-bold block text-white text-sm">{log.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {log.member_id} • Time In: <b>{log.time_in || '—'}</b></span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                        log.status === 'Present' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : log.status === 'Late' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic block text-center py-4">No client check-ins logged for this day.</span>
                )}
              </div>
            </motion.div>
          )}

        </div>
      )}

    </div>
  );
};
