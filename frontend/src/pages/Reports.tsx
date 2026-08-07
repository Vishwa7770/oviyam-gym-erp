import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  Users, 
  UserCheck, 
  UserX, 
  UserPlus, 
  RefreshCw,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Trash2,
  Search,
  Filter,
  Save,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import * as XLSX from 'xlsx';

interface ReportStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  newMembersThisMonth: number;
  rejoinedMembers: number;
  updatesThisMonth: number;
}

interface DemographicsData {
  monthlyRegistrations: Array<{ month: string; registrations: number }>;
  membershipDistribution: Array<{ name: string; value: number }>;
  genderDistribution: Array<{ name: string; value: number }>;
  ageDistribution: Array<{ name: string; value: number }>;
  weightTrendDistribution: Array<{ name: string; value: number }>;
}

interface HistoryReport {
  id: number;
  report_name: string;
  report_type: string;
  filters: string;
  generated_date: string;
  generated_by: string;
  report_data: string;
  created_at: string;
}

export const Reports: React.FC = () => {
  const { settings } = useGym();
  
  // Tab controller: 'charts' | 'members' | 'progress' | 'history'
  const [activeTab, setActiveTab] = useState<'charts' | 'members' | 'progress' | 'history'>('charts');
  
  // Loading & metrics states
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [demographics, setDemographics] = useState<DemographicsData | null>(null);
  const [historyList, setHistoryList] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states (Members Report)
  const [memberFilter, setMemberFilter] = useState({
    search: '',
    status: 'All',
    membership_plan: 'All',
    gender: 'All',
    ageMin: '',
    ageMax: '',
    joinDateStart: '',
    joinDateEnd: '',
    page: 1,
    limit: 15
  });

  // Filtering states (Progress Report)
  const [progressFilter, setProgressFilter] = useState({
    search: '',
    plan: 'All',
    gender: 'All',
    weightTrend: 'All',
    dateStart: '',
    dateEnd: '',
    page: 1,
    limit: 15
  });

  // Datasets
  const [memberData, setMemberData] = useState<any[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPages, setMemberPages] = useState(1);
  const [memberLoading, setMemberLoading] = useState(false);

  const [progressData, setProgressData] = useState<any[]>([]);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressPages, setProgressPages] = useState(1);
  const [progressLoading, setProgressLoading] = useState(false);

  // Snapshot modal states
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  // Fetch KPI counters
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
      setError('Connection error. Could not retrieve stats.');
    }
  };

  // Fetch demographic charts
  const fetchDemographics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/demographics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDemographics(data);
      }
    } catch (err) {
      console.error('Fetch demographics error:', err);
      setError('Connection error. Could not build analytics.');
    }
  };

  // Fetch reports history log
  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setError('Connection error. Could not fetch reports list.');
    }
  };

  // Fetch Member Report data
  const fetchMemberReport = async () => {
    setMemberLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (memberFilter.search) queryParams.append('search', memberFilter.search);
      if (memberFilter.status !== 'All') queryParams.append('status', memberFilter.status);
      if (memberFilter.membership_plan !== 'All') queryParams.append('membership_plan', memberFilter.membership_plan);
      if (memberFilter.gender !== 'All') queryParams.append('gender', memberFilter.gender);
      if (memberFilter.ageMin) queryParams.append('ageMin', memberFilter.ageMin);
      if (memberFilter.ageMax) queryParams.append('ageMax', memberFilter.ageMax);
      if (memberFilter.joinDateStart) queryParams.append('joinDateStart', memberFilter.joinDateStart);
      if (memberFilter.joinDateEnd) queryParams.append('joinDateEnd', memberFilter.joinDateEnd);
      
      queryParams.append('page', String(memberFilter.page));
      queryParams.append('limit', String(memberFilter.limit));

      const res = await fetch(`${API_BASE}/reports/members?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setMemberData(result.data);
        setMemberTotal(result.pagination.total);
        setMemberPages(result.pagination.pages);
      }
    } catch (err) {
      console.error('Fetch members report error:', err);
    } finally {
      setMemberLoading(false);
    }
  };

  // Fetch Progress Report data
  const fetchProgressReport = async () => {
    setProgressLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (progressFilter.search) queryParams.append('search', progressFilter.search);
      if (progressFilter.plan !== 'All') queryParams.append('plan', progressFilter.plan);
      if (progressFilter.gender !== 'All') queryParams.append('gender', progressFilter.gender);
      if (progressFilter.weightTrend !== 'All') queryParams.append('weightTrend', progressFilter.weightTrend);
      if (progressFilter.dateStart) queryParams.append('dateStart', progressFilter.dateStart);
      if (progressFilter.dateEnd) queryParams.append('dateEnd', progressFilter.dateEnd);

      queryParams.append('page', String(progressFilter.page));
      queryParams.append('limit', String(progressFilter.limit));

      const res = await fetch(`${API_BASE}/reports/progress?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setProgressData(result.data);
        setProgressTotal(result.pagination.total);
        setProgressPages(result.pagination.pages);
      }
    } catch (err) {
      console.error('Fetch progress report error:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  // Trigger loads on mount
  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchDemographics(), fetchHistory()]);
      setLoading(false);
    };
    initLoad();
  }, []);

  // Sync data fetches on filters modifications
  useEffect(() => {
    if (activeTab === 'members') {
      fetchMemberReport();
    } else if (activeTab === 'progress') {
      fetchProgressReport();
    }
  }, [activeTab, memberFilter.page, progressFilter.page]);

  // Handle Search buttons
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'members') {
      setMemberFilter(prev => ({ ...prev, page: 1 }));
      fetchMemberReport();
    } else if (activeTab === 'progress') {
      setProgressFilter(prev => ({ ...prev, page: 1 }));
      fetchProgressReport();
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    if (activeTab === 'members') {
      setMemberFilter({
        search: '',
        status: 'All',
        membership_plan: 'All',
        gender: 'All',
        ageMin: '',
        ageMax: '',
        joinDateStart: '',
        joinDateEnd: '',
        page: 1,
        limit: 15
      });
    } else if (activeTab === 'progress') {
      setProgressFilter({
        search: '',
        plan: 'All',
        gender: 'All',
        weightTrend: 'All',
        dateStart: '',
        dateEnd: '',
        page: 1,
        limit: 15
      });
    }
  };

  // Export engines
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeTab === 'members') {
      headers = ['Member ID', 'Full Name', 'Phone', 'Gender', 'Age', 'Height (cm)', 'Weight (kg)', 'Join Date', 'Membership Plan', 'Status'];
      rows = memberData.map(m => [
        m.member_id, m.full_name, m.mobile_number, m.gender, m.age, m.height, m.weight, m.join_date, m.membership_plan, m.status
      ]);
      filename = `${settings.gym_name}_Members_Report.csv`;
    } else if (activeTab === 'progress') {
      headers = ['Date', 'Member ID', 'Full Name', 'Plan', 'Gender', 'Weight (kg)', 'Previous Weight (kg)', 'Difference', 'BMI Index', 'Notes'];
      rows = progressData.map(p => [
        p.recorded_date, p.member_id, p.full_name, p.membership_plan, p.gender, p.weight, p.prevWeight, p.difference, p.bmi, p.trainer_notes
      ]);
      filename = `${settings.gym_name}_Progress_Report.csv`;
    }

    if (rows.length === 0) {
      alert('No rows available in report dataset to export.');
      return;
    }

    const content = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let sheetName = '';
    let filename = '';

    if (activeTab === 'members') {
      headers = ['Member ID', 'Full Name', 'Phone', 'Gender', 'Age', 'Height (cm)', 'Weight (kg)', 'Join Date', 'Membership Plan', 'Status'];
      rows = memberData.map(m => [
        m.member_id, m.full_name, m.mobile_number, m.gender, m.age, m.height, m.weight, m.join_date, m.membership_plan, m.status
      ]);
      sheetName = 'Members List';
      filename = `${settings.gym_name}_Members_Report.xlsx`;
    } else if (activeTab === 'progress') {
      headers = ['Date', 'Member ID', 'Full Name', 'Plan', 'Gender', 'Weight (kg)', 'Previous Weight (kg)', 'Difference', 'BMI Index', 'Notes'];
      rows = progressData.map(p => [
        p.recorded_date, p.member_id, p.full_name, p.membership_plan, p.gender, p.weight, p.prevWeight, p.difference, p.bmi, p.trainer_notes
      ]);
      sheetName = 'Monthly Progress';
      filename = `${settings.gym_name}_Progress_Report.xlsx`;
    }

    if (rows.length === 0) {
      alert('No rows available in report dataset to export.');
      return;
    }

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const handlePrintReport = () => {
    const originalTitle = document.title;
    document.title = `${settings.gym_name} - Generated Report`;
    window.print();
    document.title = originalTitle;
  };

  // Save generated snapshot
  const handleSaveSnapshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) {
      alert('Please enter a name for the report snapshot.');
      return;
    }

    let report_type = '';
    let report_data: any[] = [];
    let filterString = '';

    if (activeTab === 'members') {
      report_type = 'Members List';
      report_data = memberData;
      filterString = `Plan: ${memberFilter.membership_plan}, Status: ${memberFilter.status}, Gender: ${memberFilter.gender}`;
    } else if (activeTab === 'progress') {
      report_type = 'Monthly Progress';
      report_data = progressData;
      filterString = `Plan: ${progressFilter.plan}, Gender: ${progressFilter.gender}, Weight: ${progressFilter.weightTrend}`;
    }

    if (report_data.length === 0) {
      alert('No rows available to save snapshot.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          report_name: snapshotName.trim(),
          report_type,
          filters: filterString,
          report_data
        })
      });

      if (res.ok) {
        setIsSnapshotModalOpen(false);
        setSnapshotName('');
        fetchHistory();
        alert('Report snapshot saved to history logs.');
      } else {
        alert('Failed to save snapshot.');
      }
    } catch (err) {
      alert('Connection error.');
    }
  };

  // Download snapshot from history
  const handleDownloadSnapshot = (historyItem: HistoryReport, format: 'csv' | 'xlsx') => {
    try {
      const rowsData = JSON.parse(historyItem.report_data);
      if (!Array.isArray(rowsData) || rowsData.length === 0) {
        alert('Snapshot data is empty or invalid.');
        return;
      }

      let headers: string[] = [];
      let rows: any[][] = [];

      if (historyItem.report_type === 'Members List') {
        headers = ['Member ID', 'Full Name', 'Phone', 'Gender', 'Age', 'Height (cm)', 'Weight (kg)', 'Join Date', 'Membership Plan', 'Status'];
        rows = rowsData.map(m => [
          m.member_id, m.full_name, m.mobile_number, m.gender, m.age, m.height, m.weight, m.join_date, m.membership_plan, m.status
        ]);
      } else {
        headers = ['Date', 'Member ID', 'Full Name', 'Plan', 'Gender', 'Weight (kg)', 'Previous Weight (kg)', 'Difference', 'BMI Index', 'Notes'];
        rows = rowsData.map(p => [
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
      alert('Error parsing or exporting snapshot data.');
    }
  };

  // Delete snapshot from history
  const handleDeleteSnapshot = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this report snapshot?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reports/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchHistory();
        alert('Report snapshot deleted successfully.');
      } else {
        alert('Failed to delete report snapshot.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    }
  };

  // Recharts cell colors
  const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-muted-foreground text-sm font-medium">Aggregating business insights...</span>
        </div>
      </div>
    );
  }

  // Card items configurations
  const cardConfig = [
    { title: 'Total Members', value: stats?.totalMembers ?? 0, icon: Users, desc: 'Registered portfolio', color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-500' },
    { title: 'Active Members', value: stats?.activeMembers ?? 0, icon: UserCheck, desc: 'Current active clients', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-500' },
    { title: 'Inactive Members', value: stats?.inactiveMembers ?? 0, icon: UserX, desc: 'Expired or paused', color: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-500' },
    { title: 'New Members', value: stats?.newMembersThisMonth ?? 0, icon: UserPlus, desc: 'Signups this month', color: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 text-violet-500' },
    { title: 'Rejoined Portfolio', value: stats?.rejoinedMembers ?? 0, icon: RefreshCw, desc: 'Reactivated accounts', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-500' },
    { title: 'Updates (Month)', value: stats?.updatesThisMonth ?? 0, icon: CheckCircle, desc: 'Logs recorded this month', color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      
      {/* Printable page layout structure */}
      <div className="print-only print-layout space-y-6 p-8">
        <div className="flex justify-between items-center border-b border-black pb-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight">{settings.gym_name}</h1>
            <p className="text-xs mt-0.5">{settings.address || 'Gym Center Address'} • Ph: {settings.phone_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">BUSINESS REPORT</h2>
            <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()} by Admin</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold underline">
            {activeTab === 'members' ? 'Active & Filtered Members List' : activeTab === 'progress' ? 'Monthly Progress Log Report' : 'Gym Performance Snapshot'}
          </h3>
          <p className="text-xs text-slate-600">This document presents real-time member records mapped from client databases.</p>
        </div>

        {activeTab === 'members' && (
          <table className="w-full text-left border border-black mt-4">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="p-2 border border-black text-xs font-bold uppercase">Member ID</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Full Name</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Phone</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Plan</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Gender</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Age</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Joined</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {memberData.map(m => (
                <tr key={m.member_id} className="border-b border-black">
                  <td className="p-2 border border-black text-xs">{m.member_id}</td>
                  <td className="p-2 border border-black text-xs font-bold">{m.full_name}</td>
                  <td className="p-2 border border-black text-xs">{m.mobile_number}</td>
                  <td className="p-2 border border-black text-xs">{m.membership_plan}</td>
                  <td className="p-2 border border-black text-xs">{m.gender}</td>
                  <td className="p-2 border border-black text-xs">{m.age}</td>
                  <td className="p-2 border border-black text-xs">{m.join_date}</td>
                  <td className="p-2 border border-black text-xs">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'progress' && (
          <table className="w-full text-left border border-black mt-4">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="p-2 border border-black text-xs font-bold uppercase">Date</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Client ID</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Full Name</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Weight (kg)</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Prev Weight</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Difference</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">BMI</th>
                <th className="p-2 border border-black text-xs font-bold uppercase">Trainer Notes</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map(p => (
                <tr key={p.id} className="border-b border-black">
                  <td className="p-2 border border-black text-xs">{p.recorded_date}</td>
                  <td className="p-2 border border-black text-xs">{p.member_id}</td>
                  <td className="p-2 border border-black text-xs font-bold">{p.full_name}</td>
                  <td className="p-2 border border-black text-xs">{p.weight} kg</td>
                  <td className="p-2 border border-black text-xs">{p.prevWeight} kg</td>
                  <td className="p-2 border border-black text-xs font-bold">{p.difference > 0 ? `+${p.difference}` : p.difference} kg</td>
                  <td className="p-2 border border-black text-xs">{p.bmi}</td>
                  <td className="p-2 border border-black text-xs italic">{p.trainer_notes || 'None logged'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-8 border-t border-black mt-12">
          <span>Printed on: {new Date().toLocaleString()}</span>
          <span>Oviyam Gym Tracking Suite • Page 1 of 1</span>
        </div>
      </div>

      {/* Screen view interface (hidden on printing) */}
      <div className="no-print space-y-6">
        
        {/* Header Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Reports & Business Insights</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Verify registrations, track monthly progress differentials, and export spreadsheets for client bookkeeping.
            </p>
          </div>
          <button 
            onClick={() => { setLoading(true); Promise.all([fetchStats(), fetchDemographics(), fetchHistory()]).finally(() => setLoading(false)); }}
            className="px-4 py-2 text-xs font-semibold rounded-xl glass-card flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 border border-white/20"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Analytics
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                  <span className="text-2xl font-black tracking-tight block">{card.value}</span>
                  <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">{card.desc}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Filters Panel (Only visible for Members / Progress tabs) */}
        {(activeTab === 'members' || activeTab === 'progress') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-6 border space-y-4"
          >
            <div className="flex items-center gap-2 border-b pb-3">
              <Filter className="w-4.5 h-4.5 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Advanced Filter Parameters</h3>
            </div>

            <form onSubmit={handleFilterSubmit} className="space-y-4">
              {activeTab === 'members' ? (
                /* Members Filter Controls */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Search Name / Phone</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={memberFilter.search}
                        onChange={(e) => setMemberFilter({ ...memberFilter, search: e.target.value })}
                        className="w-full h-10 pl-9 pr-4 rounded-xl glass-input text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Status</label>
                    <select
                      value={memberFilter.status}
                      onChange={(e) => setMemberFilter({ ...memberFilter, status: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Membership Plan</label>
                    <select
                      value={memberFilter.membership_plan}
                      onChange={(e) => setMemberFilter({ ...memberFilter, membership_plan: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                    >
                      <option value="All">All Plans</option>
                      <option value="Monthly Plan">Monthly Plan</option>
                      <option value="Quarterly Plan">Quarterly Plan</option>
                      <option value="Half-Yearly Plan">Half-Yearly Plan</option>
                      <option value="Annual Plan">Annual Plan</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Gender</label>
                    <select
                      value={memberFilter.gender}
                      onChange={(e) => setMemberFilter({ ...memberFilter, gender: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                    >
                      <option value="All">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Age Limits (Min - Max)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={memberFilter.ageMin}
                        onChange={(e) => setMemberFilter({ ...memberFilter, ageMin: e.target.value })}
                        className="w-1/2 h-10 px-3 rounded-xl glass-input text-xs"
                        min="1"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={memberFilter.ageMax}
                        onChange={(e) => setMemberFilter({ ...memberFilter, ageMax: e.target.value })}
                        className="w-1/2 h-10 px-3 rounded-xl glass-input text-xs"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 col-span-1 sm:col-span-2">
                    <label className="text-muted-foreground pl-0.5 font-bold">Join Date Range (Start - End)</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={memberFilter.joinDateStart}
                        onChange={(e) => setMemberFilter({ ...memberFilter, joinDateStart: e.target.value })}
                        className="w-1/2 h-10 px-3 rounded-xl glass-input text-xs"
                      />
                      <input
                        type="date"
                        value={memberFilter.joinDateEnd}
                        onChange={(e) => setMemberFilter({ ...memberFilter, joinDateEnd: e.target.value })}
                        className="w-1/2 h-10 px-3 rounded-xl glass-input text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Progress Filter Controls */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Search Name / ID</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search client..."
                        value={progressFilter.search}
                        onChange={(e) => setProgressFilter({ ...progressFilter, search: e.target.value })}
                        className="w-full h-10 pl-9 pr-4 rounded-xl glass-input text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Plan Type</label>
                    <select
                      value={progressFilter.plan}
                      onChange={(e) => setProgressFilter({ ...progressFilter, plan: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                    >
                      <option value="All">All Plans</option>
                      <option value="Monthly Plan">Monthly Plan</option>
                      <option value="Quarterly Plan">Quarterly Plan</option>
                      <option value="Half-Yearly Plan">Half-Yearly Plan</option>
                      <option value="Annual Plan">Annual Plan</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Gender</label>
                    <select
                      value={progressFilter.gender}
                      onChange={(e) => setProgressFilter({ ...progressFilter, gender: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                    >
                      <option value="All">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5 font-bold text-primary">Weight progression</label>
                    <select
                      value={progressFilter.weightTrend}
                      onChange={(e) => setProgressFilter({ ...progressFilter, weightTrend: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                    >
                      <option value="All">All Progressions</option>
                      <option value="loss">Weight Loss</option>
                      <option value="gain">Weight Gain</option>
                      <option value="no_change">No Change</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground pl-0.5">Date Range</label>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={progressFilter.dateStart}
                        onChange={(e) => setProgressFilter({ ...progressFilter, dateStart: e.target.value })}
                        className="w-1/2 h-10 px-2 rounded-xl glass-input text-[10px]"
                      />
                      <input
                        type="date"
                        value={progressFilter.dateEnd}
                        onChange={(e) => setProgressFilter({ ...progressFilter, dateEnd: e.target.value })}
                        className="w-1/2 h-10 px-2 rounded-xl glass-input text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/95 cursor-pointer shadow-sm shadow-primary/20"
                >
                  Search Database
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Tab switch navigation */}
        <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('charts')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'charts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Charts & Visual Analytics
            </button>
            <button
              onClick={() => { setActiveTab('members'); fetchMemberReport(); }}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Members Portfolio List
            </button>
            <button
              onClick={() => { setActiveTab('progress'); fetchProgressReport(); }}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'progress' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly Progress Logs
            </button>
            <button
              onClick={() => { setActiveTab('history'); fetchHistory(); }}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Reports History Archive
            </button>
          </div>

          {/* Export utility row (only visible in members or progress lists) */}
          {(activeTab === 'members' || activeTab === 'progress') && (
            <div className="pb-3 flex gap-2">
              <button
                onClick={handlePrintReport}
                className="px-3 py-1.5 rounded-lg glass-card border hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print A4
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg glass-card border hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-lg glass-card border hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                Export Excel
              </button>
              <button
                onClick={() => setIsSnapshotModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/95 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Snapshot
              </button>
            </div>
          )}
        </div>

        {/* Tab display boxes */}
        <div className="space-y-6">
          
          {/* TAB 1: Charts Dashboard */}
          {activeTab === 'charts' && demographics && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Chart 1: registrations */}
              <div className="glass-card rounded-3xl p-6 border flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Registrations Trend (6M)
                  </h3>
                  <p className="text-xs text-muted-foreground">Monthly growth distribution</p>
                </div>
                <div className="h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={demographics.monthlyRegistrations} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartRegGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="month" stroke="currentColor" fontSize={10} opacity={0.6} tickLine={false} />
                      <YAxis stroke="currentColor" fontSize={10} opacity={0.6} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'rgba(15, 17, 26, 0.85)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#chartRegGrad)" name="Signups" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Weight Changes status (Loss vs Gain) */}
              <div className="glass-card rounded-3xl p-6 border flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-primary" />
                    Progression Distributions (Loss vs Gain)
                  </h3>
                  <p className="text-xs text-muted-foreground">Active client status updates for the month</p>
                </div>
                <div className="h-[220px] w-full mt-4 flex items-center justify-center">
                  {demographics.weightTrendDistribution.some(x => x.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={demographics.weightTrendDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" /> {/* Loss: Green */}
                          <Cell fill="#ef4444" /> {/* Gain: Red */}
                          <Cell fill="#6b7280" /> {/* No Change: Gray */}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'rgba(15, 17, 26, 0.85)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Log monthly stats to see weight classifications.</span>
                  )}
                </div>
              </div>

              {/* Chart 3: Membership plans distributions */}
              <div className="glass-card rounded-3xl p-6 border flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-primary" />
                    Membership Plans Distribution
                  </h3>
                  <p className="text-xs text-muted-foreground">Breakdown of member plans portfolio</p>
                </div>
                <div className="h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographics.membershipDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                      >
                        {demographics.membershipDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(15, 17, 26, 0.85)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36} iconSize={9} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Gender Distribution */}
              <div className="glass-card rounded-3xl p-6 border flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-primary" />
                    Gender Distribution Ratio
                  </h3>
                  <p className="text-xs text-muted-foreground">Biological profile breakdown</p>
                </div>
                <div className="h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographics.genderDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {demographics.genderDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(15, 17, 26, 0.85)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36} iconSize={9} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 5: Age distribution */}
              <div className="glass-card rounded-3xl p-6 border flex flex-col justify-between h-[360px] md:col-span-2">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Age Distribution Segments
                  </h3>
                  <p className="text-xs text-muted-foreground">Member segmentation by age brackets</p>
                </div>
                <div className="h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographics.ageDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" stroke="currentColor" fontSize={10} opacity={0.6} tickLine={false} />
                      <YAxis stroke="currentColor" fontSize={10} opacity={0.6} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'rgba(15, 17, 26, 0.85)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Members Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Members Report Table */}
          {activeTab === 'members' && (
            <div className="glass-card rounded-3xl border overflow-hidden">
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex justify-between items-center">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Members Roster Dataset ({memberTotal} matched)
                </h3>
              </div>

              <div className="overflow-x-auto">
                {memberLoading ? (
                  <div className="py-16 text-center text-xs text-muted-foreground flex justify-center items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Fetching database records...</span>
                  </div>
                ) : memberData.length > 0 ? (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Member ID</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Full Name</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Phone</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Gender</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Age</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Plan type</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Joined date</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {memberData.map((row) => (
                        <tr key={row.member_id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-500">{row.member_id}</td>
                          <td className="p-4 font-bold">{row.full_name}</td>
                          <td className="p-4">{row.mobile_number}</td>
                          <td className="p-4">{row.gender}</td>
                          <td className="p-4">{row.age}</td>
                          <td className="p-4 font-medium text-primary">{row.membership_plan}</td>
                          <td className="p-4">{row.join_date}</td>
                          <td className="p-4">
                            <span className={`
                              px-2.5 py-0.5 rounded-full text-[10px] font-bold border
                              ${row.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}
                            `}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-16">No member records match the filter parameters.</p>
                )}
              </div>

              {/* Pagination controls */}
              {memberPages > 1 && (
                <div className="p-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Showing page {memberFilter.page} of {memberPages} ({memberTotal} total)</span>
                  <div className="flex gap-1">
                    <button
                      disabled={memberFilter.page <= 1}
                      onClick={() => setMemberFilter({ ...memberFilter, page: memberFilter.page - 1 })}
                      className="p-1.5 rounded-lg border glass-card hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={memberFilter.page >= memberPages}
                      onClick={() => setMemberFilter({ ...memberFilter, page: memberFilter.page + 1 })}
                      className="p-1.5 rounded-lg border glass-card hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Monthly Progress Report Table */}
          {activeTab === 'progress' && (
            <div className="glass-card rounded-3xl border overflow-hidden">
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex justify-between items-center">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Monthly Check-ins Dataset ({progressTotal} logs)
                </h3>
              </div>

              <div className="overflow-x-auto">
                {progressLoading ? (
                  <div className="py-16 text-center text-xs text-muted-foreground flex justify-center items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating logs differentials...</span>
                  </div>
                ) : progressData.length > 0 ? (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Date</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Member Name</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Weight (kg)</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Prev Weight</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Difference</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">BMI index</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Trainer Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {progressData.map((row) => {
                        let badgeColor = 'bg-slate-500/10 text-slate-500 border-slate-500/20';
                        let diffText = '0.0 kg';
                        
                        if (row.difference < 0) {
                          badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                          diffText = `${row.difference} kg`;
                        } else if (row.difference > 0) {
                          badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
                          diffText = `+${row.difference} kg`;
                        }

                        const heightInM = row.height / 100;
                        const bmiVal = heightInM > 0 ? parseFloat((row.weight / Math.pow(heightInM, 2)).toFixed(1)) : 0;
                        let bmiCategory = 'Normal';
                        let bmiBadge = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

                        if (bmiVal < 18.5) {
                          bmiCategory = 'Underweight';
                          bmiBadge = 'bg-sky-500/10 text-sky-500 border-sky-500/20';
                        } else if (bmiVal >= 25 && bmiVal < 30) {
                          bmiCategory = 'Overweight';
                          bmiBadge = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                        } else if (bmiVal >= 30) {
                          bmiCategory = 'Obese';
                          bmiBadge = 'bg-red-500/10 text-red-500 border-red-500/20';
                        }

                        return (
                          <tr key={row.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="p-4 font-semibold">{row.recorded_date}</td>
                            <td className="p-4">
                              <span className="font-bold">{row.full_name}</span>
                              <span className="text-xs font-mono text-muted-foreground ml-2">({row.member_id})</span>
                            </td>
                            <td className="p-4 font-bold text-primary">{row.weight} kg</td>
                            <td className="p-4 text-muted-foreground">{row.prevWeight} kg</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
                                {diffText}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bmiBadge}`}>
                                {bmiVal} ({bmiCategory})
                              </span>
                            </td>
                            <td className="p-4 text-xs font-medium italic text-muted-foreground max-w-xs truncate">{row.trainer_notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-16">No monthly check-ins match the filters.</p>
                )}
              </div>

              {/* Pagination controls */}
              {progressPages > 1 && (
                <div className="p-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Showing page {progressFilter.page} of {progressPages} ({progressTotal} total)</span>
                  <div className="flex gap-1">
                    <button
                      disabled={progressFilter.page <= 1}
                      onClick={() => setProgressFilter({ ...progressFilter, page: progressFilter.page - 1 })}
                      className="p-1.5 rounded-lg border glass-card hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={progressFilter.page >= progressPages}
                      onClick={() => setProgressFilter({ ...progressFilter, page: progressFilter.page + 1 })}
                      className="p-1.5 rounded-lg border glass-card hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Reports History Archive */}
          {activeTab === 'history' && (
            <div className="glass-card rounded-3xl border overflow-hidden">
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex justify-between items-center">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Snapshots Archive List ({historyList.length} saved)
                </h3>
              </div>

              <div className="overflow-x-auto">
                {historyList.length > 0 ? (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Report Title</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Type</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Applied Filters</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Generated Date</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Operator</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right w-44">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {historyList.map((item) => (
                        <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-foreground">{item.report_name}</td>
                          <td className="p-4 font-semibold text-primary text-xs">{item.report_type}</td>
                          <td className="p-4 text-xs text-muted-foreground font-medium">{item.filters || 'No filters applied'}</td>
                          <td className="p-4 font-medium">{item.generated_date}</td>
                          <td className="p-4 font-semibold text-slate-500">{item.generated_by}</td>
                          <td className="p-4 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => handleDownloadSnapshot(item, 'csv')}
                              className="inline-flex p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer text-xs font-bold gap-1 items-center"
                              title="Download CSV"
                            >
                              <Download className="w-3.5 h-3.5" />
                              CSV
                            </button>
                            <button
                              onClick={() => handleDownloadSnapshot(item, 'xlsx')}
                              className="inline-flex p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 cursor-pointer text-xs font-bold gap-1 items-center"
                              title="Download Excel Workbook"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              Excel
                            </button>
                            <button
                              onClick={() => handleDeleteSnapshot(item.id)}
                              className="inline-flex p-2 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-16">No report snapshots generated in history logs yet.</p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Save Snapshot Modal Dialog */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl glass-panel shadow-premium p-6 border border-white/10 relative"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h3 className="font-extrabold text-base text-white">Save Report Snapshot</h3>
              <button 
                onClick={() => setIsSnapshotModalOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSnapshotSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Snapshot Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Active Clients August 2026"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs font-bold"
                  required
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 block mt-1">This saves the currently filtered rows of data as a permanent snapshot.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-extrabold text-xs cursor-pointer shadow-md shadow-primary/20"
                >
                  Save Snapshot
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};

// Quick mock helper to avoid compilation issues in case X is missing
const X: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
