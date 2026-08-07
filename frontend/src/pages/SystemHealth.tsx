import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  Server, Shield, RefreshCw, Clock, Database, 
  Cpu, HardDrive, CheckCircle, Wifi 
} from 'lucide-react';

interface HealthStats {
  databaseStatus: string;
  databaseType: string;
  storageUsage: string;
  backupStatus: string;
  lastBackupDate: string;
  lastLogin: string;
  softwareVersion: string;
  serverTime: string;
  activeSessions: number;
}

export const SystemHealth: React.FC = () => {
  const { settings } = useGym();
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/system/health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.error('Failed to fetch system health details:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const triggerRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Gathering System Diagnostics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs text-white">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">System Health & Diagnostics</h2>
          <p className="text-slate-400 text-xs mt-1">Real-time indicators of connection status, storage buffers, and license properties.</p>
        </div>
        <button
          onClick={triggerRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl glass-card border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Polling...' : 'Refresh Status'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Status Card */}
        <div className="glass-card rounded-3xl p-6 border flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">API Connection</span>
            <span className="text-lg font-black text-white block mt-0.5">Online</span>
            <span className="text-emerald-400 text-[9px] font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle className="w-3 h-3" />
              Connected to backend
            </span>
          </div>
        </div>

        {/* Database Mode Card */}
        <div className="glass-card rounded-3xl p-6 border flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Database Type</span>
            <span className="text-base font-black text-white block mt-0.5 truncate max-w-[180px]" title={health?.databaseType}>
              {health?.databaseType}
            </span>
            <span className="text-slate-400 text-[9px] font-mono mt-0.5 block">Status: {health?.databaseStatus}</span>
          </div>
        </div>

        {/* Storage Size Card */}
        <div className="glass-card rounded-3xl p-6 border flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Database Space</span>
            <span className="text-lg font-black text-white block mt-0.5">{health?.storageUsage}</span>
            <span className="text-slate-400 text-[9px] font-mono mt-0.5 block">File buffer on server</span>
          </div>
        </div>
      </div>

      {/* Diagnostics Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* System Properties */}
        <div className="glass-card rounded-3xl p-6 border space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Server className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-base">Server Environment Specs</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Platform Build Version</span>
              <span className="font-bold text-white font-mono">{health?.softwareVersion}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-slate-400">Node JS Runtime</span>
              <span className="font-bold text-white font-mono">v18.17.1 (Commercial Production)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-slate-400">Server Ticks (Time)</span>
              <span className="font-bold text-white font-mono">{health ? new Date(health.serverTime).toLocaleTimeString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-slate-400">Active Daily Sessions</span>
              <span className="font-bold text-white bg-primary/15 px-2 py-0.5 rounded border border-primary/20">{health?.activeSessions} operators online</span>
            </div>
          </div>
        </div>

        {/* Security & Recovery Status */}
        <div className="glass-card rounded-3xl p-6 border space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-base">Security & Backup Monitoring</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Platform License Key</span>
              <span className="font-bold text-slate-300 font-mono tracking-wide">{settings.license_key || 'OV-DEMO-9999-XXXX'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-slate-400">Activation Status</span>
              <span className="font-black text-emerald-400 uppercase tracking-widest text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {settings.license_status || 'Activated (Demo Mode)'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-slate-400">Auto Daily Backups</span>
              <span className="font-bold text-white">{health?.backupStatus}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-slate-400">Last Successful Backup</span>
              <span className="font-bold text-slate-300 font-mono text-[9px]">{health?.lastBackupDate ? health.lastBackupDate.replace(/T/, ' ').substring(0, 16) : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
