import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  ClipboardList, Search, RefreshCw, Filter, 
  User, Shield, Calendar, Clock, Database, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityLog {
  id: number;
  recorded_date: string;
  recorded_time: string;
  user_identity: string;
  action: string;
  module: string;
}

export const ActivityLogs: React.FC = () => {
  const { settings } = useGym();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/activity-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        setError('Failed to fetch activity audit logs.');
      }
    } catch (err) {
      setError('Connection error. Could not retrieve system logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) || 
                          log.user_identity.toLowerCase().includes(search.toLowerCase());
    const matchesModule = moduleFilter === '' || log.module === moduleFilter;
    const matchesUser = userFilter === '' || log.user_identity.toLowerCase().includes(userFilter.toLowerCase());
    return matchesSearch && matchesModule && matchesUser;
  });

  const getModuleColor = (mod: string) => {
    switch (mod) {
      case 'Auth': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'Member': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Trainer': return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
      case 'Payment': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Attendance': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'System': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'Auth': return Shield;
      case 'System': return Database;
      case 'Member': return User;
      default: return ClipboardList;
    }
  };

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header Panel */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            System Activity Audit Logs
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time track record of critical administrative operations on the {settings.gym_name} database.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl glass-card border hover:bg-white/5 flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-primary" />
          Refresh Audit Logs
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Filters Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action details or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-white text-xs border-white/10"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-white text-xs border-white/10 cursor-pointer appearance-none"
          >
            <option value="">All Action Modules</option>
            <option value="Auth">Auth & Login</option>
            <option value="Member">Member Registry</option>
            <option value="Trainer">Trainer Registry</option>
            <option value="Attendance">Attendance Checks</option>
            <option value="Payment">Invoice Payments</option>
            <option value="System">System Backups & General</option>
          </select>
        </div>

        <div className="relative">
          <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by operator username..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-white text-xs border-white/10"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-card rounded-3xl border overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-slate-400 text-xs">Querying database audit logs...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider bg-white/2">
                  <th className="p-4 pl-6 w-36">Timestamp</th>
                  <th className="p-4 w-28 text-center">Module</th>
                  <th className="p-4 w-36">Operator</th>
                  <th className="p-4">Action Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => {
                  const Icon = getModuleIcon(log.module);
                  return (
                    <tr key={log.id} className="hover:bg-white/2 text-slate-200 transition-colors">
                      <td className="p-4 pl-6 font-mono text-slate-400 text-[10px] space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {log.recorded_date}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {log.recorded_time}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getModuleColor(log.module)}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white flex items-center gap-2 mt-2">
                        <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] uppercase border border-primary/20">
                          {log.user_identity.substring(0, 2)}
                        </div>
                        {log.user_identity}
                      </td>
                      <td className="p-4 font-medium text-slate-300">
                        {log.action}
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-16 text-center text-slate-400 italic">
                      No system activity audit records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
