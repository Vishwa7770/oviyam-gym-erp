import React, { useState, useEffect } from 'react';
import { API_BASE } from '../context/GymContext';
import { Search, TrendingUp, Calendar, History, Scale, Check } from 'lucide-react';

interface SearchMember {
  member_id: string;
  full_name: string;
  mobile_number: string;
  weight: number;
  height: number;
  membership_plan: string;
  status: string;
}

interface MiniProgressLog {
  id: number;
  recorded_date: string;
  weight: number;
  height: number;
  trainer_notes: string;
}

export const ProgressTracking: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMember[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState<SearchMember | null>(null);
  const [recentLogs, setRecentLogs] = useState<MiniProgressLog[]>([]);
  
  const [logForm, setLogForm] = useState({
    recorded_date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    trainer_notes: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const searchMembers = async (queryStr: string) => {
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members?search=${queryStr}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.members);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      searchMembers(searchQuery);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const selectMember = async (member: SearchMember) => {
    setSelectedMember(member);
    setSuccess(false);
    setLogForm({
      recorded_date: new Date().toISOString().split('T')[0],
      weight: String(member.weight),
      height: String(member.height),
      trainer_notes: ''
    });

    // Fetch their history logs
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members/${member.member_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentLogs(data.progressHistory.slice(0, 3)); // Grab last 3 entries
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !logForm.weight || !logForm.height) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members/${selectedMember.member_id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(logForm)
      });

      if (res.ok) {
        setSuccess(true);
        // Refresh recent logs
        const historyRes = await fetch(`${API_BASE}/members/${selectedMember.member_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (historyRes.ok) {
          const data = await historyRes.json();
          setRecentLogs(data.progressHistory.slice(0, 3));
          
          // Update selected member current weight/height locally
          setSelectedMember({
            ...selectedMember,
            weight: parseFloat(logForm.weight),
            height: parseFloat(logForm.height)
          });
        }
        
        setLogForm(prev => ({ ...prev, trainer_notes: '' }));
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert('Failed to submit weight details.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Progress Tracking</h2>
        <p className="text-muted-foreground text-sm mt-1">Quick-log member weight updates and track training checkpoints.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Search and select */}
        <div className="space-y-4 md:col-span-1">
          <div className="glass-card rounded-2xl p-5 border space-y-3">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider pl-1">Find Member</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type member name or ID..."
                className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-sm"
              />
            </div>

            {loadingSearch && (
              <div className="text-center py-4 text-xs text-muted-foreground">Searching members...</div>
            )}

            {!loadingSearch && searchResults.length > 0 && (
              <div className="divide-y divide-black/5 dark:divide-white/5 max-h-60 overflow-y-auto">
                {searchResults.map(m => (
                  <button
                    key={m.member_id}
                    onClick={() => selectMember(m)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 cursor-pointer mt-1 ${
                      selectedMember?.member_id === m.member_id 
                        ? 'bg-primary text-white scale-[1.01]' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="font-bold text-sm leading-none">{m.full_name}</span>
                    <div className="flex justify-between text-xs opacity-75">
                      <span>{m.member_id}</span>
                      <span>{m.mobile_number}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loadingSearch && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground italic">No members match search query.</div>
            )}
          </div>
        </div>

        {/* Right column: Log details form */}
        <div className="md:col-span-2">
          {selectedMember ? (
            <div className="space-y-6">
              {/* Member Summary Header */}
              <div className="glass-card rounded-2xl p-5 border border-white/20 dark:border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">{selectedMember.full_name}</h3>
                  <span className="font-mono text-xs text-muted-foreground">{selectedMember.member_id}</span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-muted-foreground block">Current Stats</span>
                  <span className="font-black text-sm text-primary">{selectedMember.weight} kg / {selectedMember.height} cm</span>
                </div>
              </div>

              {/* Logger form & history */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-5 border space-y-4">
                  <h4 className="font-bold text-sm text-muted-foreground uppercase pl-1">New Log details</h4>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground pl-1">Record Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="date"
                        value={logForm.recorded_date}
                        onChange={(e) => setLogForm({ ...logForm, recorded_date: e.target.value })}
                        className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground pl-1">Weight (kg)</label>
                      <input
                        type="number"
                        value={logForm.weight}
                        onChange={(e) => setLogForm({ ...logForm, weight: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl glass-input text-sm font-bold text-primary"
                        step="0.1"
                        min="5"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground pl-1">Height (cm)</label>
                      <input
                        type="number"
                        value={logForm.height}
                        onChange={(e) => setLogForm({ ...logForm, height: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                        step="0.1"
                        min="10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground pl-1">Session notes</label>
                    <textarea
                      value={logForm.trainer_notes}
                      onChange={(e) => setLogForm({ ...logForm, trainer_notes: e.target.value })}
                      placeholder="Add weight stats or feedback..."
                      className="w-full min-h-[80px] p-3 rounded-xl glass-input text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {success ? (
                      <>
                        <Check className="w-4 h-4" />
                        Log Saved Successfully!
                      </>
                    ) : (
                      <>
                        <Scale className="w-4 h-4" />
                        {submitting ? 'Saving...' : 'Save Weight Entry'}
                      </>
                    )}
                  </button>
                </form>

                {/* History Timeline */}
                <div className="glass-card rounded-3xl p-5 border space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-muted-foreground uppercase pl-1 flex items-center gap-1.5">
                      <History className="w-4 h-4" />
                      Recent progress points
                    </h4>
                    
                    <div className="space-y-3 mt-4 overflow-y-auto max-h-[220px]">
                      {recentLogs.length > 0 ? (
                        recentLogs.map(log => (
                          <div key={log.id} className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-muted-foreground">{formatDate(log.recorded_date)}</span>
                              <span className="font-extrabold text-primary">{log.weight} kg / {log.height} cm</span>
                            </div>
                            {log.trainer_notes && (
                              <p className="text-muted-foreground italic mt-1 line-clamp-2">{log.trainer_notes}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center py-6">No progress logs recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center border h-[240px] flex flex-col justify-center items-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-bold text-base">Select a Member to Track Progress</p>
              <p className="text-xs text-muted-foreground mt-1">Search for a client in the left-hand column to begin logging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
