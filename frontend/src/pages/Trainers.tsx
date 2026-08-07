import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  Award, Search, PlusCircle, Trash2, Edit3, X, UserPlus, 
  Check, Mail, Phone, Calendar, Dumbbell, Shield, AlertCircle, 
  Camera, Briefcase, DollarSign, Activity, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Trainer {
  id: number;
  trainer_id: string;
  full_name: string;
  mobile_number: string;
  email: string;
  gender: string;
  experience: number;
  specialization: string;
  qualification: string;
  joining_date: string;
  salary: number | null;
  status: string;
  profile_photo: string;
  assigned_members_count?: number;
}

export const Trainers: React.FC = () => {
  const { settings } = useGym();
  
  // View states
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Subview states: 'list' | 'profile' | 'form'
  const [subView, setSubView] = useState<'list' | 'profile'>('list');
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [trainerDetails, setTrainerDetails] = useState<any>(null);

  // Form states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    email: '',
    gender: 'Male',
    experience: '',
    specialization: '',
    qualification: '',
    joining_date: new Date().toISOString().split('T')[0],
    salary: '',
    status: 'Active',
    profile_photo: '',
    password: ''
  });

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeMembersList, setActiveMembersList] = useState<any[]>([]);
  const [checkedMemberIds, setCheckedMemberIds] = useState<string[]>([]);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trainers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrainers(data);
      } else {
        setError('Failed to retrieve trainers registry list.');
      }
    } catch (err) {
      setError('Connection error. Could not connect to system backend.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerProfile = async (tId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trainers/${tId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrainerDetails(data);
        setSelectedTrainerId(tId);
        setSubView('profile');
      }
    } catch (e) {
      alert('Error fetching trainer details.');
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.mobile_number || !formData.email || !formData.experience) {
      alert('Please fill out all required fields.');
      return;
    }
    if (formMode === 'add' && !formData.password) {
      alert('Password is required for new trainer login setup.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const method = formMode === 'add' ? 'POST' : 'PUT';
      const endpoint = formMode === 'add' ? `${API_BASE}/trainers` : `${API_BASE}/trainers/${selectedTrainerId}`;
      
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          experience: parseInt(formData.experience),
          salary: formData.salary ? parseFloat(formData.salary) : null
        })
      });

      if (res.ok) {
        setIsFormModalOpen(false);
        fetchTrainers();
        if (selectedTrainerId) fetchTrainerProfile(selectedTrainerId);
        alert(formMode === 'add' ? 'Trainer registered successfully!' : 'Trainer details updated.');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit trainer record.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    }
  };

  const handleDeleteTrainer = async (tId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete Trainer ${name}? All linked members will be unassigned.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trainers/${tId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSubView('list');
        fetchTrainers();
        alert('Trainer profile deleted.');
      } else {
        alert('Failed to delete trainer profile.');
      }
    } catch (e) {
      alert('Connection error.');
    }
  };

  const openAssignModal = async (tId: string) => {
    try {
      const token = localStorage.getItem('token');
      // Fetch active members to assign
      const res = await fetch(`${API_BASE}/reports/members?status=Active&limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        const mList = result.data || [];
        setActiveMembersList(mList);

        // Fetch current assignments for this trainer
        const profileRes = await fetch(`${API_BASE}/trainers/${tId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const assignedIds = profileData.members.map((m: any) => m.member_id);
          setCheckedMemberIds(assignedIds);
        }

        setSelectedTrainerId(tId);
        setIsAssignModalOpen(true);
      }
    } catch (e) {
      alert('Failed to load active members checklist.');
    }
  };

  const handleSaveAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trainers/${selectedTrainerId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ member_ids: checkedMemberIds })
      });
      if (res.ok) {
        setIsAssignModalOpen(false);
        if (selectedTrainerId) fetchTrainerProfile(selectedTrainerId);
        fetchTrainers();
        alert('Trainer member assignments updated successfully!');
      } else {
        alert('Failed to save trainer member links.');
      }
    } catch (e) {
      alert('Connection error.');
    }
  };

  const handleToggleMemberChecked = (mId: string) => {
    if (checkedMemberIds.includes(mId)) {
      setCheckedMemberIds(checkedMemberIds.filter(id => id !== mId));
    } else {
      setCheckedMemberIds([...checkedMemberIds, mId]);
    }
  };

  const openAddTrainerModal = () => {
    setFormMode('add');
    setFormData({
      full_name: '',
      mobile_number: '',
      email: '',
      gender: 'Male',
      experience: '',
      specialization: '',
      qualification: '',
      joining_date: new Date().toISOString().split('T')[0],
      salary: '',
      status: 'Active',
      profile_photo: '',
      password: ''
    });
    setIsFormModalOpen(true);
  };

  const openEditTrainerModal = (t: any) => {
    setFormMode('edit');
    setFormData({
      full_name: t.full_name,
      mobile_number: t.mobile_number,
      email: t.email,
      gender: t.gender,
      experience: String(t.experience),
      specialization: t.specialization || '',
      qualification: t.qualification || '',
      joining_date: t.joining_date || '',
      salary: t.salary ? String(t.salary) : '',
      status: t.status,
      profile_photo: t.profile_photo || '',
      password: '' // Keep empty if not modifying
    });
    setIsFormModalOpen(true);
  };

  const filteredTrainers = trainers.filter(t => 
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.specialization.toLowerCase().includes(search.toLowerCase()) ||
    t.trainer_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header Row */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4 no-print">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Trainer & Instructor Registry
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Manage professional instructors, salary scales, login authorization, and client allocations.
          </p>
        </div>

        {subView === 'list' ? (
          <button
            onClick={openAddTrainerModal}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 font-bold shadow-md cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            Add Instructor
          </button>
        ) : (
          <button
            onClick={() => setSubView('list')}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold cursor-pointer transition-colors"
          >
            ← Back to List
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* List Subview */}
      {subView === 'list' && (
        <div className="space-y-4 no-print">
          {/* Search filters */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by instructor name, id, or specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-white text-xs border-white/10"
            />
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-slate-400 text-xs">Loading instructors...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrainers.map((t) => (
                <div key={t.id} className="glass-card rounded-3xl p-5 border border-white/5 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center">
                      {t.profile_photo ? (
                        <img src={t.profile_photo} alt={t.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <Award className="w-7 h-7 text-primary" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-[9px] font-black text-slate-400 tracking-wider block">{t.trainer_id}</span>
                      <h4 className="font-extrabold text-sm text-white leading-tight">{t.full_name}</h4>
                      <p className="text-[10px] text-primary font-bold">{t.specialization}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 py-4 my-2 border-y border-white/5">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Experience:</span>
                      <span className="font-semibold">{t.experience} Years</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Assigned:</span>
                      <span className="font-black text-emerald-400">{t.assigned_members_count || 0} Members</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                      t.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {t.status}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchTrainerProfile(t.trainer_id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold cursor-pointer border border-white/5"
                      >
                        Profile Profile
                      </button>
                      <button
                        onClick={() => openAssignModal(t.trainer_id)}
                        className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary cursor-pointer"
                        title="Allocate Clients"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTrainers.length === 0 && (
                <div className="col-span-3 py-16 text-center text-slate-400 italic">No trainers registered inside database.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trainer Profile Detail Subview */}
      {subView === 'profile' && trainerDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Profile info */}
          <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center shadow-lg relative group">
                {trainerDetails.trainer.profile_photo ? (
                  <img src={trainerDetails.trainer.profile_photo} alt={trainerDetails.trainer.full_name} className="w-full h-full object-cover" />
                ) : (
                  <Award className="w-12 h-12 text-primary animate-pulse" />
                )}
              </div>

              <div>
                <span className="font-mono text-[9px] font-black text-slate-500 tracking-wider">{trainerDetails.trainer.trainer_id}</span>
                <h3 className="text-lg font-black text-white">{trainerDetails.trainer.full_name}</h3>
                <p className="text-xs text-primary font-bold">{trainerDetails.trainer.specialization}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openEditTrainerModal(trainerDetails.trainer)}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit details
                </button>
                <button
                  onClick={() => handleDeleteTrainer(trainerDetails.trainer.trainer_id, trainerDetails.trainer.full_name)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-500 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-5 space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Phone Number</span>
                  <span className="font-bold">{trainerDetails.trainer.mobile_number}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Email Address</span>
                  <span className="font-bold">{trainerDetails.trainer.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Joining Date</span>
                  <span className="font-bold">{trainerDetails.trainer.joining_date}</span>
                </div>
              </div>

              {trainerDetails.trainer.salary !== null && (
                <div className="flex items-center gap-2.5 text-slate-300">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Monthly Salary Structure</span>
                    <span className="font-bold">₹{parseFloat(String(trainerDetails.trainer.salary)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-slate-300">
                <Briefcase className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Qualifications</span>
                  <span className="font-bold">{trainerDetails.trainer.qualification || 'Not Specfied'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Analytics & Assigned Members */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
                <span className="text-2xl font-black">{trainerDetails.stats.totalMembers}</span>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Members</span>
                <span className="text-2xl font-black text-emerald-400">{trainerDetails.stats.activeMembers}</span>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Workout Plans</span>
                <span className="text-2xl font-black text-primary">{trainerDetails.stats.workoutPlansCreated}</span>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Diet Plans</span>
                <span className="text-2xl font-black text-cyan-400">{trainerDetails.stats.dietPlansCreated}</span>
              </div>
            </div>

            {/* Members table card */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="font-extrabold text-sm text-white">Assigned Gym Clients</h4>
                <button
                  onClick={() => openAssignModal(trainerDetails.trainer.trainer_id)}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Allocate Members
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 bg-white/2">
                      <th className="p-3">Member ID</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Membership</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainerDetails.members.map((m: any) => (
                      <tr key={m.member_id} className="border-b border-white/5 hover:bg-white/2 last:border-0 text-slate-300">
                        <td className="p-3 font-mono text-[10px] font-bold">{m.member_id}</td>
                        <td className="p-3 font-bold text-white">{m.full_name}</td>
                        <td className="p-3 font-mono">{m.mobile_number}</td>
                        <td className="p-3">{m.membership_plan}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            m.status === 'Active' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {trainerDetails.members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">No members assigned to this trainer profile yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl glass-panel shadow-premium p-6 border relative my-8 text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h3 className="font-extrabold text-base flex items-center gap-1.5">
                <Award className="w-5 h-5 text-primary" />
                {formMode === 'add' ? 'Register New Gym Instructor' : 'Modify Instructor Profile'}
              </h3>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone Number *</label>
                  <input
                    type="text"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-white text-xs border-white/10 cursor-pointer appearance-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Experience (Years) *</label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Specialization (Focus Area)</label>
                  <input
                    type="text"
                    placeholder="e.g. Yoga, Crossfit, Strength, Cardio"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Qualifications</label>
                  <input
                    type="text"
                    placeholder="e.g. Certified Personal Trainer"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-white text-xs border-white/10 cursor-pointer appearance-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Login Password {formMode === 'edit' && '(Leave blank to keep current)'} *</label>
                  <input
                    type="password"
                    placeholder="Auth Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                    required={formMode === 'add'}
                  />
                </div>

                {/* Profile picture base64 uploader */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Profile Photo</label>
                  <div className="flex gap-2 items-center">
                    <div className="w-11 h-11 rounded-lg bg-white/5 border overflow-hidden flex items-center justify-center">
                      {formData.profile_photo ? (
                        <img src={formData.profile_photo} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <label className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs cursor-pointer flex-1 text-center">
                      Choose Image File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, profile_photo: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Instructor Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Members checklist modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl glass-panel shadow-premium p-6 border relative my-8 text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h3 className="font-extrabold text-base">Allocate Gym Clients</h3>
                <p className="text-[10px] text-slate-400">Link active members to this instructor for training splits assignment.</p>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {activeMembersList.map((m) => {
                const isChecked = checkedMemberIds.includes(m.member_id);
                return (
                  <div
                    key={m.member_id}
                    onClick={() => handleToggleMemberChecked(m.member_id)}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all duration-200 ${
                      isChecked 
                        ? 'bg-primary/10 border-primary text-white shadow-sm' 
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs">{m.full_name}</span>
                      <span className="text-[9px] font-mono text-slate-400 block mt-0.5">ID: {m.member_id} • Plan: {m.membership_plan}</span>
                    </div>

                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-primary border-primary' : 'border-white/20 bg-black/20'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                );
              })}
              {activeMembersList.length === 0 && (
                <div className="py-12 text-center text-slate-400 italic">No active members found to allocate.</div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-4">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Save Allocations ({checkedMemberIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
