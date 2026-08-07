import React from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw, LogOut, Lock } from 'lucide-react';

interface ErrorViewProps {
  type: '404' | '403' | 'session_expired' | 'network_error';
  onResolve?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ type, onResolve }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center p-6 text-xs text-white">
      <div className="absolute inset-0 bg-radial-gradient from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-md w-full glass-card border border-white/10 rounded-3xl p-8 text-center space-y-5 shadow-xl relative">
        {type === '404' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-pulse">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight">404 - Page Not Found</h2>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                The requested URL route does not exist or has been shifted permanently.
              </p>
            </div>
            <button
              onClick={onResolve || (() => window.location.hash = '#/')}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition"
            >
              Return to Dashboard
            </button>
          </>
        )}

        {type === '403' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight">403 - Access Restrained</h2>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Your role credentials lack sufficient clearance permissions to access this administrative module.
              </p>
            </div>
            <button
              onClick={onResolve || (() => window.location.hash = '#/')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-white/10 cursor-pointer transition"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {type === 'session_expired' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <LogOut className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight">Session Terminated</h2>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                You have been signed out due to terminal inactivity or expired token credentials.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition"
            >
              Sign In Again
            </button>
          </>
        )}

        {type === 'network_error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 animate-spin">
              <RefreshCw className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight">System Connection Offline</h2>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Unable to contact the backend database server. Please check your network and make sure the server process is alive.
              </p>
            </div>
            <button
              onClick={onResolve || (() => window.location.reload())}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </>
        )}
      </div>
    </div>
  );
};
