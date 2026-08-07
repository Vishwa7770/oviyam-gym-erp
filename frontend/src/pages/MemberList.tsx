import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../context/GymContext';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Eye, Phone, Calendar, User } from 'lucide-react';

interface Member {
  member_id: string;
  full_name: string;
  mobile_number: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  join_date: string;
  membership_plan: string;
  status: string;
}

interface MemberListProps {
  onViewMember: (memberId: string) => void;
  onAddMember: () => void;
  searchTrigger: string;
  clearSearchTrigger: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({ 
  onViewMember, 
  onAddMember, 
  searchTrigger,
  clearSearchTrigger
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Available plans list
  const plans = ['Monthly Plan', 'Quarterly Plan', 'Half-Yearly Plan', 'Annual Plan', 'Premium VIP Plan'];

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        search,
        status,
        plan,
        page: String(page),
        limit: '10'
      });

      const res = await fetch(`${API_BASE}/members?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setTotalPages(data.pagination.totalPages);
        setTotalMembers(data.pagination.total);
      } else {
        setError('Failed to fetch members.');
      }
    } catch (err) {
      setError('Connection error. Could not retrieve member list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, status, plan]);

  // Handle outside actions triggered by Dashboard quick actions
  useEffect(() => {
    if (searchTrigger === 'focus-search') {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      clearSearchTrigger();
    } else if (searchTrigger === 'open-add-modal') {
      onAddMember();
      clearSearchTrigger();
    }
  }, [searchTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setPlan('all');
    setPage(1);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Gym Members</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Displaying {totalMembers} total member{totalMembers !== 1 ? 's' : ''} in the system.
          </p>
        </div>
        <button
          onClick={onAddMember}
          className="px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm shadow-md hover:bg-primary/95 transition-all duration-150 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add New Member
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-5 border border-white/20 dark:border-white/5 space-y-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, Name, or Mobile..."
              className="w-full h-11 pl-11 pr-4 rounded-xl glass-input text-sm"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full h-11 pl-9 pr-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={plan}
              onChange={(e) => { setPlan(e.target.value); setPage(1); }}
              className="flex-1 h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Membership Plans</option>
              {plans.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-5 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-750 transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
        
        {(search || status !== 'all' || plan !== 'all') && (
          <div className="flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : members.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-lg">No Members Found</p>
          <p className="text-sm text-muted-foreground mt-1">Try relaxing your search terms or add a new member.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden lg:block glass-card rounded-2xl border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Member ID</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Weight</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Plan</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Join Date</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {members.map((member) => (
                  <tr 
                    key={member.member_id}
                    onClick={() => onViewMember(member.member_id)}
                    className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono text-sm font-semibold">{member.member_id}</td>
                    <td className="p-4 font-bold text-sm">{member.full_name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{member.mobile_number}</td>
                    <td className="p-4 text-sm font-medium">{member.weight} kg</td>
                    <td className="p-4 text-sm font-medium">{member.membership_plan}</td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(member.join_date)}</td>
                    <td className="p-4">
                      <span className={`
                        px-2.5 py-1 rounded-full text-xs font-bold border
                        ${member.status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'}
                      `}>
                        {member.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onViewMember(member.member_id); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {members.map((member) => (
              <div 
                key={member.member_id}
                onClick={() => onViewMember(member.member_id)}
                className="glass-card rounded-2xl p-5 border flex flex-col justify-between gap-4 cursor-pointer hover:scale-[1.01] transition-transform"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-base leading-tight">{member.full_name}</h4>
                    <span className="font-mono text-xs text-muted-foreground">{member.member_id}</span>
                  </div>
                  <span className={`
                    px-2.5 py-0.5 rounded-full text-[10px] font-bold border
                    ${member.status === 'Active' 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'}
                  `}>
                    {member.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{member.mobile_number}</span>
                  </div>
                  <div className="text-right font-medium">
                    Plan: <span className="font-bold">{member.membership_plan}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(member.join_date)}</span>
                  </div>
                  <div className="text-right font-bold text-primary">
                    {member.weight} kg / {member.height} cm
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); onViewMember(member.member_id); }}
                  className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all text-center flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Open Profile
                </button>
              </div>
            ))}
          </div>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-muted-foreground">
                Page <span className="font-bold text-foreground">{page}</span> of <span className="font-bold text-foreground">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="p-2 rounded-xl glass-card border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-2 rounded-xl glass-card border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
