import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  User, 
  Phone, 
  Calendar, 
  Dumbbell, 
  HeartPulse, 
  ArrowLeft, 
  Edit3, 
  Plus, 
  Activity, 
  MapPin, 
  AlertCircle,
  Clock,
  X,
  Trash2,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Camera,
  Award,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressLog {
  id: number;
  recorded_date: string;
  weight: number;
  height: number;
  chest: number;
  waist: number;
  left_arm: number;
  right_arm: number;
  left_thigh: number;
  right_thigh: number;
  body_fat: number | null;
  photo_front?: string;
  photo_side?: string;
  photo_back?: string;
  trainer_notes: string;
}

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
  address: string;
  emergency_contact: string;
  medical_notes: string;
  status: string;

  // Enhanced Assessment fields
  dob: string;
  occupation: string;
  blood_group: string;
  membership_duration: string;
  membership_expiry_date: string;
  trainer_assigned: string;
  hips: number;
  neck: number;
  calf: number;
  shoulder: number;
  goal: string;
  fitness_level: string;
  injuries: string;
  allergies: string;
  smoking: string;
  alcohol: string;
  previous_experience: string;
  recommended_workout: string;
  recommended_diet: string;
  trainer_notes: string;
  member_photo: string;
  body_front: string;
  body_side: string;
  body_back: string;
  chest?: number;
  waist?: number;
  left_arm?: number;
  right_arm?: number;
  left_thigh?: number;
  right_thigh?: number;
  body_fat?: number;

  workout_plan_id?: number | null;
  workout_plan_name?: string;
  workout_start_date?: string;
  workout_end_date?: string;
  diet_plan_id?: number | null;
  diet_plan_name?: string;
  diet_start_date?: string;
  diet_end_date?: string;
}

interface MemberProfileProps {
  memberId: string;
  onBack: () => void;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({ memberId, onBack }) => {
  const { settings } = useGym();
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab control: Overview, Initial Assessment, Monthly Progress, Progress History, Trainer Notes, Attendance History, Workout & Diet, Before & After, Billing
  const [activeTab, setActiveTab] = useState<'overview' | 'assessment' | 'progress' | 'history' | 'notes' | 'attendance' | 'workout_diet' | 'before_after' | 'billing'>('overview');
  
  // Edit member info
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<Member>>({});

  // Individual client attendance log states
  const [memberAttendance, setMemberAttendance] = useState<{
    stats: {
      totalPresent: number;
      totalAbsent: number;
      totalLate: number;
      attendanceRate: number;
      lastVisit: string;
    };
    logs: Array<{
      id: number;
      recorded_date: string;
      status: 'Present' | 'Absent' | 'Late';
      time_in: string;
      time_out: string;
      trainer: string;
    }>;
  } | null>(null);

  // Calendar states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11

  // Phase 5 & 6: Member Workout, Diet, and Billing states
  const [allWorkoutPlans, setAllWorkoutPlans] = useState<any[]>([]);
  const [allDietPlans, setAllDietPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState({
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    price: '',
    discount: '0',
    amount_paid: '',
    payment_mode: 'Cash',
    transaction_id: '',
    remarks: ''
  });
  
  // Progress log modal (Add & Edit)
  const [isOpenLogModal, setIsOpenLogModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [progressForm, setProgressForm] = useState({
    recorded_date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    chest: '0',
    waist: '0',
    left_arm: '0',
    right_arm: '0',
    left_thigh: '0',
    right_thigh: '0',
    body_fat: '',
    photo_front: '',
    photo_side: '',
    photo_back: '',
    trainer_notes: ''
  });

  const [showIdCardModal, setShowIdCardModal] = useState(false);

  const fetchMemberAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance/member/${memberId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMemberAttendance(data);
      }
    } catch (err) {
      console.error('Fetch member attendance error:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMember(data.member);
        setHistory(data.progressHistory);
        setProfileForm(data.member);
        await fetchMemberAttendance();
        await fetchWorkoutAndDietPlans();
        await fetchBillingDetails();
      } else {
        setError('Failed to load member profile details.');
      }
    } catch (err) {
      setError('Connection error. Could not retrieve profile data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkoutAndDietPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const workoutsRes = await fetch(`${API_BASE}/workouts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (workoutsRes.ok) {
        const wData = await workoutsRes.json();
        setAllWorkoutPlans(wData);
      }

      const dietsRes = await fetch(`${API_BASE}/diets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (dietsRes.ok) {
        const dData = await dietsRes.json();
        setAllDietPlans(dData);
      }
    } catch (err) {
      console.error('Fetch plans error:', err);
    }
  };

  const fetchBillingDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const subRes = await fetch(`${API_BASE}/memberships/history/${memberId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        const sData = await subRes.json();
        setSubscriptions(sData);
      }

      const payRes = await fetch(`${API_BASE}/payments?search=${memberId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (payRes.ok) {
        const pData = await payRes.json();
        setInvoices(pData);
      }
    } catch (err) {
      console.error('Fetch billing error:', err);
    }
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewForm.plan_id || !renewForm.amount_paid) {
      alert('Please select a plan and specify amount paid.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/memberships/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          member_id: memberId,
          plan_id: parseInt(renewForm.plan_id),
          start_date: renewForm.start_date,
          end_date: renewForm.end_date,
          price: parseFloat(renewForm.price),
          discount: parseFloat(renewForm.discount || '0'),
          paid_amount: parseFloat(renewForm.amount_paid),
          payment_mode: renewForm.payment_mode,
          transaction_id: renewForm.transaction_id,
          remarks: renewForm.remarks
        })
      });

      if (res.ok) {
        setShowRenewModal(false);
        fetchProfile();
        alert('Membership renewed successfully and invoice receipt created!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to renew membership');
      }
    } catch (err) {
      alert('Error renewing subscription');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [memberId]);

  // BMI helper
  const calculateBmiInfo = (wStr: string | number, hStr: string | number) => {
    const w = parseFloat(String(wStr));
    const h = parseFloat(String(hStr));
    if (isNaN(w) || isNaN(h) || h <= 0) return { bmi: 0, category: '—', color: 'text-muted-foreground bg-black/5 border-transparent' };

    const bmi = parseFloat((w / Math.pow(h / 100, 2)).toFixed(1));
    let category = 'Normal';
    let color = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

    if (bmi < 18.5) {
      category = 'Underweight';
      color = 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Overweight';
      color = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    } else if (bmi >= 30) {
      category = 'Obese';
      color = 'bg-red-500/10 text-red-500 border-red-500/20';
    }

    return { bmi, category, color };
  };

  // BMI for currently selected member stats
  const activeBmi = member ? calculateBmiInfo(member.weight, member.height) : null;

  // Weight comparison calculations
  const getWeightComparison = () => {
    if (!member) return { latest: 0, previous: 0, diff: 0, text: '—', color: 'text-muted-foreground' };
    
    const latest = history[0] ? parseFloat(String(history[0].weight)) : parseFloat(String(member.weight));
    const previous = history[1] ? parseFloat(String(history[1].weight)) : parseFloat(String(member.weight));
    const diff = parseFloat((latest - previous).toFixed(1));

    let text = `${diff} kg`;
    let color = 'text-slate-400 dark:text-slate-500';

    if (diff < 0) {
      text = `${diff} kg`;
      color = 'text-emerald-500'; 
    } else if (diff > 0) {
      text = `+${diff} kg`;
      color = 'text-red-500'; 
    } else {
      text = '0.0 kg';
    }

    return { latest, previous, diff, text, color };
  };

  const comparison = getWeightComparison();

  // Profile Edit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.full_name?.trim() || !profileForm.mobile_number?.trim()) {
      alert('Full Name and Mobile Number are required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      
      if (res.ok) {
        setIsEditingProfile(false);
        fetchProfile();
        alert('Member profile edited successfully.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update member.');
      }
    } catch (err) {
      alert('Error updating profile.');
    }
  };

  // Progress modal actions
  const openAddLogModal = () => {
    setModalMode('add');
    setEditingLogId(null);
    setProgressForm({
      recorded_date: new Date().toISOString().split('T')[0],
      weight: member ? String(member.weight) : '',
      height: member ? String(member.height) : '',
      chest: '0',
      waist: '0',
      left_arm: '0',
      right_arm: '0',
      left_thigh: '0',
      right_thigh: '0',
      body_fat: '',
      photo_front: '',
      photo_side: '',
      photo_back: '',
      trainer_notes: ''
    });
    setIsOpenLogModal(true);
  };

  const openEditLogModal = (log: ProgressLog) => {
    setModalMode('edit');
    setEditingLogId(log.id);
    setProgressForm({
      recorded_date: log.recorded_date,
      weight: String(log.weight),
      height: String(log.height),
      chest: String(log.chest),
      waist: String(log.waist),
      left_arm: String(log.left_arm),
      right_arm: String(log.right_arm),
      left_thigh: String(log.left_thigh),
      right_thigh: String(log.right_thigh),
      body_fat: log.body_fat ? String(log.body_fat) : '',
      photo_front: log.photo_front || '',
      photo_side: log.photo_side || '',
      photo_back: log.photo_back || '',
      trainer_notes: log.trainer_notes || ''
    });
    setIsOpenLogModal(true);
  };

  const openViewLogModal = (log: ProgressLog) => {
    setModalMode('view');
    setEditingLogId(log.id);
    setProgressForm({
      recorded_date: log.recorded_date,
      weight: String(log.weight),
      height: String(log.height),
      chest: String(log.chest),
      waist: String(log.waist),
      left_arm: String(log.left_arm),
      right_arm: String(log.right_arm),
      left_thigh: String(log.left_thigh),
      right_thigh: String(log.right_thigh),
      body_fat: log.body_fat ? String(log.body_fat) : '',
      photo_front: log.photo_front || '',
      photo_side: log.photo_side || '',
      photo_back: log.photo_back || '',
      trainer_notes: log.trainer_notes || ''
    });
    setIsOpenLogModal(true);
  };

  // Progress Add / Edit submit
  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressForm.recorded_date || !progressForm.weight || !progressForm.height) {
      alert('Please fill in Date, Weight, and Height.');
      return;
    }

    const w = parseFloat(progressForm.weight);
    const h = parseFloat(progressForm.height);
    if (w <= 0 || h <= 0) {
      alert('Weight and Height must be positive numbers.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      let res;
      if (modalMode === 'add') {
        res = await fetch(`${API_BASE}/members/${memberId}/progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(progressForm)
        });
      } else {
        res = await fetch(`${API_BASE}/members/${memberId}/progress/${editingLogId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(progressForm)
        });
      }

      if (res.ok) {
        setIsOpenLogModal(false);
        fetchProfile();
        alert(modalMode === 'add' ? 'Monthly progress logged successfully.' : 'Monthly progress updated.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit progress details.');
      }
    } catch (err) {
      alert('Network error. Failed to save details.');
    }
  };

  // Progress Log Delete
  const handleDeleteLog = async (logId: number, dateStr: string) => {
    const formatted = new Date(dateStr).toLocaleDateString('default', { month: 'long', year: 'numeric' });
    if (!window.confirm(`Are you sure you want to permanently delete the progress record for ${formatted}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members/${memberId}/progress/${logId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchProfile();
        alert('Progress record deleted successfully.');
      } else {
        alert('Failed to delete progress record.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    }
  };

  const handlePrintProfileReport = () => {
    const originalTitle = document.title;
    document.title = `${settings.gym_name}_${member?.full_name}_Progress_Report`;
    window.print();
    document.title = originalTitle;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatMonthYear = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } catch {
      return dateStr;
    }
  };

  const weightChartData = [...history]
    .reverse()
    .map(log => ({
      date: new Date(log.recorded_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      weight: parseFloat(String(log.weight))
    }));

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const monthsNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm max-w-md mx-auto text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="font-bold">{error || 'Member not found'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold">
          Back to List
        </button>
      </div>
    );
  }

  const currentChest = history[0] ? history[0].chest : 0;
  const currentWaist = history[0] ? history[0].waist : 0;
  const currentLeftArm = history[0] ? history[0].left_arm : 0;
  const currentRightArm = history[0] ? history[0].right_arm : 0;
  const currentLeftThigh = history[0] ? history[0].left_thigh : 0;
  const currentRightThigh = history[0] ? history[0].right_thigh : 0;
  const currentBodyFat = history[0] && history[0].body_fat !== null ? `${history[0].body_fat}%` : '—';

  return (
    <>
      {/* Individual Printable Member Report */}
      <div className="print-only print-layout space-y-6 p-8">
        <div className="flex justify-between items-center border-b border-black pb-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight">{settings.gym_name}</h1>
            <p className="text-xs mt-0.5">{settings.address || 'Gym Center Address'} • Ph: {settings.phone_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">MEMBER PROGRESS REPORT</h2>
            <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()} by Admin</p>
          </div>
        </div>

        {/* Personal Details */}
        <div className="grid grid-cols-2 gap-4 border border-black p-4 rounded-xl text-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-500">MEMBER ID</p>
            <p className="font-bold">{member.member_id}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500">FULL NAME</p>
            <p className="font-bold">{member.full_name}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500">MOBILE PHONE</p>
            <p className="font-bold">{member.mobile_number}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500">JOIN DATE</p>
            <p className="font-bold">{member.join_date}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500">ACTIVE PLAN</p>
            <p className="font-bold text-primary">{member.membership_plan}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500">GENDER / AGE</p>
            <p className="font-bold">{member.gender} / {member.age} yrs</p>
          </div>
        </div>

        {/* Progress Summary Cards */}
        <div className="grid grid-cols-3 gap-4 border border-black p-4 rounded-xl text-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-500">CURRENT WEIGHT</p>
            <p className="text-xl font-bold">{comparison.latest} kg</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500">BASELINE WEIGHT</p>
            <p className="text-xl font-bold">{member.weight} kg</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500">PROGRESSION DIFFERENCE</p>
            <p className="text-xl font-bold">{comparison.text}</p>
          </div>
        </div>

        {/* History Table */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider underline">Check-ins & Tape Measurements Logs</h3>
          <table className="w-full text-left border border-black mt-2">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="p-2 border border-black text-[10px] font-bold uppercase">Date</th>
                <th className="p-2 border border-black text-[10px] font-bold uppercase">Weight</th>
                <th className="p-2 border border-black text-[10px] font-bold uppercase">Chest</th>
                <th className="p-2 border border-black text-[10px] font-bold uppercase">Waist</th>
                <th className="p-2 border border-black text-[10px] font-bold uppercase">Arms (L/R)</th>
                <th className="p-2 border border-black text-[10px] font-bold uppercase">Thighs (L/R)</th>
                <th className="p-2 border border-black text-[10px] font-bold uppercase">Body Fat</th>
                <th className="p-2 border border-black text-[10px] font-bold uppercase">BMI</th>
              </tr>
            </thead>
            <tbody>
              {history.map(log => {
                const logBmi = calculateBmiInfo(log.weight, log.height);
                return (
                  <tr key={log.id} className="border-b border-black">
                    <td className="p-2 border border-black text-xs font-semibold">{log.recorded_date}</td>
                    <td className="p-2 border border-black text-xs">{log.weight} kg</td>
                    <td className="p-2 border border-black text-xs">{log.chest} cm</td>
                    <td className="p-2 border border-black text-xs">{log.waist} cm</td>
                    <td className="p-2 border border-black text-xs">{log.left_arm}/{log.right_arm} cm</td>
                    <td className="p-2 border border-black text-xs">{log.left_thigh}/{log.right_thigh} cm</td>
                    <td className="p-2 border border-black text-xs">{log.body_fat !== null ? `${log.body_fat}%` : '—'}</td>
                    <td className="p-2 border border-black text-xs">{logBmi.bmi} ({logBmi.category})</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Trainer notes history */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider underline">Trainer Recommendations</h3>
          <div className="space-y-3">
            {history.filter(l => l.trainer_notes).map(l => (
              <div key={l.id} className="border-b border-dashed border-slate-400 pb-2">
                <span className="text-[10px] text-slate-500 font-bold block">{l.recorded_date} Checkpoint</span>
                <p className="text-xs italic">"{l.trainer_notes}"</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-8 border-t border-black mt-12">
          <span>Printed on: {new Date().toLocaleString()}</span>
          <span>{settings.gym_name} Tracker Suite • Page 1 of 1</span>
        </div>
      </div>

      {/* Screen view interface (hidden on printing) */}
      <div className="no-print space-y-6">
        
        {/* Header Profile Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl glass-card hover:bg-black/5 dark:hover:bg-white/5 border transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              {member.member_photo && (
                <img src={member.member_photo} alt={member.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-sm" />
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-extrabold tracking-tight">{member.full_name}</h2>
                  <span className={`
                    px-2.5 py-0.5 rounded-full text-xs font-bold border
                    ${member.status === 'Active' 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'}
                  `}>
                    {member.status}
                  </span>
                </div>
                <p className="text-sm font-mono text-muted-foreground mt-0.5">ID: {member.member_id} • Ph: {member.mobile_number}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrintProfileReport}
              className="px-4 py-2.5 rounded-xl glass-card border hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 cursor-pointer text-emerald-500"
            >
              <Printer className="w-4 h-4" />
              Download Progress Report
            </button>
            <button
              onClick={() => setShowIdCardModal(true)}
              className="px-4 py-2.5 rounded-xl glass-card border hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 cursor-pointer text-indigo-400"
            >
              <Award className="w-4 h-4 text-indigo-400" />
              Print Member Card
            </button>
            <button
              onClick={openAddLogModal}
              className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Add Progress Log
            </button>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-4 py-2.5 rounded-xl glass-card border hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-primary" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Quick Comparison Widget */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4 border flex flex-col justify-between h-24 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Weight</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black">{comparison.latest} kg</span>
              <span className="text-xs text-muted-foreground">Latest Update</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border flex flex-col justify-between h-24 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Previous Weight</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black">{comparison.previous} kg</span>
              <span className="text-xs text-muted-foreground">Prior Record</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border flex flex-col justify-between h-24 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Difference</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-black ${comparison.color}`}>{comparison.text}</span>
              <span className="text-xs text-muted-foreground">Gym Progression</span>
            </div>
          </div>

          {activeBmi && (
            <div className="glass-card rounded-2xl p-4 border flex flex-col justify-between h-24 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">BMI Index</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black">{activeBmi.bmi}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${activeBmi.color}`}>
                  {activeBmi.category}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs navigation */}
        <div className="flex border-b border-black/5 dark:border-white/5 gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => { setActiveTab('overview'); setIsEditingProfile(false); }}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => { setActiveTab('assessment'); setIsEditingProfile(false); }}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'assessment' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Initial Assessment
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'progress' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly Progress
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Progress History Timeline
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Trainer Notes ({history.filter(log => log.trainer_notes).length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Attendance History
          </button>
          <button
            onClick={() => setActiveTab('workout_diet')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'workout_diet' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Workout & Diet Splits
          </button>
          <button
            onClick={() => setActiveTab('before_after')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'before_after' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Before & After Compare
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'billing' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Billing & Renewals
          </button>
        </div>

        {/* Tab content boxes */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {isEditingProfile ? (
                  <form onSubmit={handleProfileSubmit} className="glass-card rounded-3xl p-6 border space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 mb-2">
                      <h3 className="font-bold text-base">Edit Personal Details</h3>
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Full Name</label>
                        <input
                          type="text"
                          value={profileForm.full_name || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Mobile Phone</label>
                        <input
                          type="tel"
                          value={profileForm.mobile_number || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, mobile_number: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Gender</label>
                        <select
                          value={profileForm.gender || 'Male'}
                          onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Age</label>
                        <input
                          type="number"
                          value={profileForm.age || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, age: parseInt(e.target.value) })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                          min="1"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Emergency Contact</label>
                        <input
                          type="text"
                          value={profileForm.emergency_contact || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Status</label>
                        <select
                          value={profileForm.status || 'Active'}
                          onChange={(e) => setProfileForm({ ...profileForm, status: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Date of Birth</label>
                        <input
                          type="date"
                          value={profileForm.dob || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Occupation</label>
                        <input
                          type="text"
                          value={profileForm.occupation || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, occupation: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Blood Group</label>
                        <input
                          type="text"
                          value={profileForm.blood_group || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground uppercase">Trainer Assigned</label>
                        <input
                          type="text"
                          value={profileForm.trainer_assigned || 'None'}
                          onChange={(e) => setProfileForm({ ...profileForm, trainer_assigned: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-xs font-semibold">
                      <label className="text-muted-foreground uppercase">Residential Address</label>
                      <textarea
                        value={profileForm.address || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        className="w-full min-h-[80px] p-3 rounded-xl glass-input text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 rounded-xl glass-card border text-xs font-bold cursor-pointer">Cancel</button>
                      <button type="submit" className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-xs cursor-pointer shadow-sm">Save Profile</button>
                    </div>
                  </form>
                ) : (
                  <div className="glass-card rounded-3xl p-6 border space-y-6">
                    <div>
                      <h3 className="font-extrabold text-lg border-b pb-3 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                        <div className="flex justify-between md:justify-start gap-4">
                          <span className="text-muted-foreground font-semibold w-28">Gender:</span>
                          <span className="font-bold">{member.gender}</span>
                        </div>
                        <div className="flex justify-between md:justify-start gap-4">
                          <span className="text-muted-foreground font-semibold w-28">Age:</span>
                          <span className="font-bold">{member.age} years old</span>
                        </div>
                        <div className="flex justify-between md:justify-start gap-4 col-span-1 md:col-span-2">
                          <span className="text-muted-foreground font-semibold w-28">DOB:</span>
                          <span className="font-bold">{member.dob || '—'}</span>
                        </div>
                        <div className="flex justify-between md:justify-start gap-4 col-span-1 md:col-span-2">
                          <span className="text-muted-foreground font-semibold w-28">Occupation:</span>
                          <span className="font-bold">{member.occupation || '—'}</span>
                        </div>
                        <div className="flex justify-between md:justify-start gap-4 col-span-1 md:col-span-2">
                          <span className="text-muted-foreground font-semibold w-28">Blood Group:</span>
                          <span className="font-bold">{member.blood_group || '—'}</span>
                        </div>
                        <div className="flex justify-between md:justify-start gap-4 col-span-1 md:col-span-2">
                          <span className="text-muted-foreground font-semibold w-28">Mobile Phone:</span>
                          <span className="font-bold flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            {member.mobile_number}
                          </span>
                        </div>
                        <div className="flex justify-between md:justify-start gap-4 col-span-1 md:col-span-2">
                          <span className="text-muted-foreground font-semibold w-28">Emergency Contact:</span>
                          <span className="font-semibold">{member.emergency_contact || 'None registered'}</span>
                        </div>
                        <div className="flex justify-between md:justify-start gap-4 col-span-1 md:col-span-2">
                          <span className="text-muted-foreground font-semibold w-28">Address:</span>
                          <span className="font-medium text-foreground/80 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary mt-0.5" />
                            {member.address || 'No address specified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-lg border-b pb-3 mb-4 flex items-center gap-2">
                        <HeartPulse className="w-5 h-5 text-primary" />
                        Medical Profile
                      </h3>
                      <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 text-sm text-foreground/90 border border-white/5 min-h-[80px]">
                        {member.medical_notes ? (
                          <p className="whitespace-pre-line font-medium">{member.medical_notes}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No medical constraints or health conditions recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-3xl p-6 border space-y-5 h-fit">
                <h3 className="font-extrabold text-lg border-b pb-3 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  Membership Details
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-muted-foreground font-semibold">Active Plan</span>
                    <span className="font-bold text-primary">{member.membership_plan}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-muted-foreground font-semibold">Duration</span>
                    <span className="font-bold">{member.membership_duration || '1 Month'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-muted-foreground font-semibold">Join Date</span>
                    <span className="font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {formatDate(member.join_date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-muted-foreground font-semibold">Expiry Date</span>
                    <span className="font-semibold text-rose-500">{member.membership_expiry_date ? formatDate(member.membership_expiry_date) : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-muted-foreground font-semibold">Trainer Assigned</span>
                    <span className="font-bold">{member.trainer_assigned || 'None'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-muted-foreground font-semibold">Baseline Weight</span>
                    <span className="font-bold">{member.weight} kg</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground font-semibold">Baseline Height</span>
                    <span className="font-bold">{member.height} cm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assessment' && (
            <div className="space-y-6">
              
              {/* Photo Gallery Grid */}
              <div className="glass-card rounded-3xl p-6 border space-y-4">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Initial Body & Profile Photos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-white/10 rounded-2xl p-4 bg-white/5 flex flex-col items-center justify-between h-56 relative">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Member Profile</span>
                    {member.member_photo ? (
                      <img src={member.member_photo} alt="Profile" className="w-32 h-32 rounded-full object-cover border-2 border-primary" />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-black/20 dark:bg-white/5 flex items-center justify-center text-xs text-muted-foreground italic">No image</div>
                    )}
                  </div>
                  <div className="border border-white/10 rounded-2xl p-4 bg-white/5 flex flex-col items-center justify-between h-56 relative">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Front View</span>
                    {member.body_front ? (
                      <img src={member.body_front} alt="Body Front" className="w-24 h-32 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="w-24 h-32 rounded-lg bg-black/20 dark:bg-white/5 flex items-center justify-center text-xs text-muted-foreground italic">No image</div>
                    )}
                  </div>
                  <div className="border border-white/10 rounded-2xl p-4 bg-white/5 flex flex-col items-center justify-between h-56 relative">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Side View</span>
                    {member.body_side ? (
                      <img src={member.body_side} alt="Body Side" className="w-24 h-32 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="w-24 h-32 rounded-lg bg-black/20 dark:bg-white/5 flex items-center justify-center text-xs text-muted-foreground italic">No image</div>
                    )}
                  </div>
                  <div className="border border-white/10 rounded-2xl p-4 bg-white/5 flex flex-col items-center justify-between h-56 relative">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Back View</span>
                    {member.body_back ? (
                      <img src={member.body_back} alt="Body Back" className="w-24 h-32 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="w-24 h-32 rounded-lg bg-black/20 dark:bg-white/5 flex items-center justify-center text-xs text-muted-foreground italic">No image</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Physical Measurements Card */}
                <div className="glass-card rounded-3xl p-6 border space-y-6">
                  <h3 className="font-extrabold text-base border-b pb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Initial Measurements
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground block">HEIGHT</span>
                      <span>{member.height} cm</span>
                    </div>
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground block">WEIGHT</span>
                      <span>{member.weight} kg</span>
                    </div>
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground block">BODY FAT %</span>
                      <span>{member.body_fat !== undefined && member.body_fat !== null ? `${member.body_fat}%` : '—'}</span>
                    </div>
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground block">BMI INDEX</span>
                      <span>{activeBmi?.bmi || '—'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-4">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest block">Tape Measurements</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm font-semibold">
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Chest:</span>
                        <span>{member.chest || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Waist:</span>
                        <span>{member.waist || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Hips:</span>
                        <span>{member.hips || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Left Arm:</span>
                        <span>{member.left_arm || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Right Arm:</span>
                        <span>{member.right_arm || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Left Thigh:</span>
                        <span>{member.left_thigh || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Right Thigh:</span>
                        <span>{member.right_thigh || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Neck:</span>
                        <span>{member.neck || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Shoulder:</span>
                        <span>{member.shoulder || 0} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-muted-foreground">Calf:</span>
                        <span>{member.calf || 0} cm</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fitness Profile Card */}
                <div className="glass-card rounded-3xl p-6 border space-y-6">
                  <h3 className="font-extrabold text-base border-b pb-3 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-primary" />
                    Fitness Info & Habits
                  </h3>
                  <div className="space-y-4 text-sm font-semibold">
                    <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                      <span className="text-muted-foreground">Goal:</span>
                      <span className="text-primary font-bold">{member.goal || 'General Health'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                      <span className="text-muted-foreground">Fitness Level:</span>
                      <span>{member.fitness_level || 'Beginner'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                      <span className="text-muted-foreground">Smoking Habit:</span>
                      <span>{member.smoking || 'No'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                      <span className="text-muted-foreground">Alcohol Habit:</span>
                      <span>{member.alcohol || 'No'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Prior Experience:</span>
                      <span>{member.previous_experience || 'None'}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/5 text-xs font-semibold">
                    <div>
                      <span className="text-muted-foreground uppercase block text-[10px]">Injuries:</span>
                      <p className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 mt-1 font-medium">{member.injuries || 'None logged.'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase block text-[10px]">Allergies:</span>
                      <p className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 mt-1 font-medium">{member.allergies || 'None logged.'}</p>
                    </div>
                  </div>
                </div>

                {/* Trainer Assessment Details */}
                <div className="glass-card rounded-3xl p-6 border space-y-6">
                  <h3 className="font-extrabold text-base border-b pb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Trainer Assessment
                  </h3>
                  <div className="space-y-4 text-xs font-semibold">
                    <div>
                      <span className="text-muted-foreground uppercase block text-[10px]">Recommended Workout Split:</span>
                      <p className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-foreground font-bold mt-1 leading-relaxed whitespace-pre-line">
                        {member.recommended_workout || 'None prescribed.'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase block text-[10px]">Recommended Diet Type:</span>
                      <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-foreground font-bold mt-1 leading-relaxed whitespace-pre-line">
                        {member.recommended_diet || 'None prescribed.'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase block text-[10px]">Trainer Registration Notes:</span>
                      <p className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 font-medium italic mt-1 leading-relaxed whitespace-pre-line">
                        {member.trainer_notes || 'No baseline notes.'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border space-y-4">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Tape Measurements Dashboard (Latest month)
                  </h3>
                  <p className="text-xs text-muted-foreground">Log monthly tape metrics to track muscle gains and fat distributions.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">Chest</span>
                    <span className="text-lg font-black text-foreground">{currentChest} cm</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">Waist</span>
                    <span className="text-lg font-black text-foreground">{currentWaist} cm</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">Left Arm</span>
                    <span className="text-lg font-black text-foreground">{currentLeftArm} cm</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">Right Arm</span>
                    <span className="text-lg font-black text-foreground">{currentRightArm} cm</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">Left Thigh</span>
                    <span className="text-lg font-black text-foreground">{currentLeftThigh} cm</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">Right Thigh</span>
                    <span className="text-lg font-black text-foreground">{currentRightThigh} cm</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-1">
                    <span className="text-[10px] font-bold text-primary block uppercase">Body Fat %</span>
                    <span className="text-lg font-black text-primary">{currentBodyFat}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-3xl border overflow-hidden">
                <div className="p-5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex justify-between items-center">
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Monthly Logs Table
                  </h3>
                  <button
                    onClick={openAddLogModal}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Progress
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Date</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Weight (kg)</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Chest (cm)</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Waist (cm)</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">BMI Index</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Comments</th>
                        <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right w-44">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {history.map((log) => {
                        const bmiRes = calculateBmiInfo(log.weight, log.height);
                        return (
                          <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="p-4 font-semibold text-foreground/80">{formatMonthYear(log.recorded_date)}</td>
                            <td className="p-4 font-bold text-primary">{log.weight} kg</td>
                            <td className="p-4 font-medium">{log.chest} cm</td>
                            <td className="p-4 font-medium">{log.waist} cm</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${bmiRes.color}`}>
                                {bmiRes.bmi} ({bmiRes.category})
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground text-xs font-medium max-w-xs truncate">{log.trainer_notes || '—'}</td>
                            <td className="p-4 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => openViewLogModal(log)}
                                className="inline-flex p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditLogModal(log)}
                                className="inline-flex p-2 rounded-lg bg-primary/10 hover:bg-primary hover:text-white text-primary cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLog(log.id, log.recorded_date)}
                                className="inline-flex p-2 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-white text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card rounded-3xl p-6 border space-y-6">
                  <div>
                    <h3 className="font-extrabold text-base flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Metrics Progression Timeline
                    </h3>
                    <p className="text-xs text-muted-foreground">Chronological progressions with differentials mapped.</p>
                  </div>

                  <div className="relative border-l-2 border-primary/20 dark:border-white/5 ml-4 pl-6 space-y-8 py-2">
                    {history.map((log, idx) => {
                      const bmiRes = calculateBmiInfo(log.weight, log.height);
                      const prevLog = history[idx + 1];
                      const weightDiffVal = prevLog ? log.weight - prevLog.weight : 0;
                      const chestDiffVal = prevLog ? log.chest - prevLog.chest : 0;
                      const waistDiffVal = prevLog ? log.waist - prevLog.waist : 0;

                      const renderDiff = (diff: number, unit: string) => {
                        if (diff === 0) return null;
                        const text = diff < 0 ? `${diff.toFixed(1)} ${unit}` : `+${diff.toFixed(1)} ${unit}`;
                        const color = diff < 0 ? 'text-emerald-500' : 'text-red-500';
                        return <span className={`text-[10px] font-bold ml-1.5 ${color}`}>({text})</span>;
                      };

                      return (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-slate-50 dark:border-slate-950" />
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="font-extrabold text-base text-gradient">{formatMonthYear(log.recorded_date)}</span>
                              <span className="text-[10px] text-muted-foreground font-semibold">{formatDate(log.recorded_date)}</span>
                            </div>

                            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 space-y-3 text-sm">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Weight</span>
                                  <span className="font-extrabold text-foreground">{log.weight} kg</span>
                                  {renderDiff(weightDiffVal, 'kg')}
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Chest</span>
                                  <span className="font-extrabold text-foreground">{log.chest} cm</span>
                                  {renderDiff(chestDiffVal, 'cm')}
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Waist</span>
                                  <span className="font-extrabold text-foreground">{log.waist} cm</span>
                                  {renderDiff(waistDiffVal, 'cm')}
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">BMI</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${bmiRes.color}`}>
                                    {bmiRes.bmi}
                                  </span>
                                </div>
                              </div>

                              {log.trainer_notes && (
                                <div className="border-t border-black/5 dark:border-white/5 pt-2 mt-2">
                                  <span className="text-[9px] text-primary block font-bold uppercase">Trainer Note</span>
                                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{log.trainer_notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {history.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground italic">No progression checkpoints recorded.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card rounded-3xl p-6 border flex flex-col justify-between h-[360px]">
                  <div>
                    <h3 className="font-extrabold text-base flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Weight Trend
                    </h3>
                    <p className="text-xs text-muted-foreground">Visual weight progress logs</p>
                  </div>
                  <div className="h-[235px] w-full mt-4">
                    {weightChartData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                          <XAxis dataKey="date" stroke="currentColor" fontSize={10} opacity={0.6} tickLine={false} />
                          <YAxis stroke="currentColor" fontSize={10} opacity={0.6} tickLine={false} domain={['dataMin - 3', 'dataMax + 3']} />
                          <Tooltip contentStyle={{ background: 'rgba(15, 17, 26, 0.85)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Weight (kg)" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground italic border border-dashed rounded-2xl border-black/5 dark:border-white/5">
                        Log at least 2 checkpoints to see visual trend.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="glass-card rounded-3xl p-6 border space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-primary" />
                  Historical trainer comments
                </h3>
                <p className="text-xs text-muted-foreground">Permanent comments and fitness notes mapped newest first.</p>
              </div>

              <div className="space-y-4">
                {history.filter(log => log.trainer_notes).map((log) => (
                  <div key={log.id} className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 space-y-2 text-sm">
                    <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2 mb-1.5">
                      <span className="font-extrabold text-primary">{formatMonthYear(log.recorded_date)}</span>
                      <span className="text-xs text-muted-foreground font-semibold">{formatDate(log.recorded_date)}</span>
                    </div>
                    <p className="text-foreground/90 font-medium whitespace-pre-line leading-relaxed italic">
                      "{log.trainer_notes}"
                    </p>
                    <div className="text-[10px] text-muted-foreground flex gap-3 pt-1">
                      <span>Weight checkpoint: <b>{log.weight} kg</b></span>
                      <span>Waist: <b>{log.waist} cm</b></span>
                      <span>Body Fat: <b>{log.body_fat !== null ? `${log.body_fat}%` : '—'}</b></span>
                    </div>
                  </div>
                ))}

                {history.filter(log => log.trainer_notes).length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground italic">No feedback comments recorded.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && memberAttendance && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Stats column */}
              <div className="space-y-4">
                <div className="glass-card rounded-3xl p-6 border space-y-4 shadow-sm">
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Attendance Analytics
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase">Present Days</span>
                      <span className="text-xl font-black text-emerald-500">{memberAttendance.stats.totalPresent}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase">Late Checkins</span>
                      <span className="text-xl font-black text-amber-500">{memberAttendance.stats.totalLate}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 text-center col-span-2">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase">Absent Days</span>
                      <span className="text-xl font-black text-red-500">{memberAttendance.stats.totalAbsent}</span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2 text-sm border-t border-black/5 dark:border-white/5">
                    <div className="flex justify-between items-center py-1 font-semibold">
                      <span className="text-muted-foreground">Attendance Rate</span>
                      <span className="font-bold text-primary">{memberAttendance.stats.attendanceRate}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1 font-semibold">
                      <span className="text-muted-foreground">Last Checked Visit</span>
                      <span className="font-semibold">{memberAttendance.stats.lastVisit}</span>
                    </div>
                  </div>
                </div>

                {/* History logs scroll */}
                <div className="glass-card rounded-3xl p-6 border h-[300px] flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-extrabold text-sm border-b pb-2 mb-3">Attendance History Timeline</h3>
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {memberAttendance.logs.map(log => (
                        <div key={log.id} className="flex justify-between items-center text-xs pb-2 border-b border-black/5 dark:border-white/5 last:border-0 last:pb-0">
                          <div>
                            <span className="font-bold">{log.recorded_date}</span>
                            <span className="text-[9px] text-muted-foreground font-mono block">In: {log.time_in || '—'} • Out: {log.time_out || '—'}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border ${
                            log.status === 'Present' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : log.status === 'Late' 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                      {memberAttendance.logs.length === 0 && (
                        <span className="text-xs text-muted-foreground italic block text-center py-8">No visits logged.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Interactive Calendar (taking 2 columns) */}
              <div className="lg:col-span-2 glass-card rounded-3xl p-6 border space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Interactive Calendar View
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const m = currentMonth === 0 ? 11 : currentMonth - 1;
                        const y = currentMonth === 0 ? currentYear - 1 : currentYear;
                        setCurrentMonth(m);
                        setCurrentYear(y);
                      }}
                      className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-24 text-center mt-1.5">
                      {monthsNames[currentMonth]} {currentYear}
                    </span>
                    <button
                      onClick={() => {
                        const m = currentMonth === 11 ? 0 : currentMonth + 1;
                        const y = currentMonth === 11 ? currentYear + 1 : currentYear;
                        setCurrentMonth(m);
                        setCurrentYear(y);
                      }}
                      className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground uppercase border-b border-black/5 dark:border-white/5 pb-2">
                  <div>Su</div>
                  <div>Mo</div>
                  <div>Tu</div>
                  <div>We</div>
                  <div>Th</div>
                  <div>Fr</div>
                  <div>Sa</div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-xs">
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`cal-empty-${i}`} className="h-10 rounded-lg border border-transparent" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const matched = memberAttendance.logs.find(l => String(l.recorded_date).substring(0, 10) === dateStr);
                    
                    let bgClass = 'border-transparent hover:border-white/10';
                    if (matched) {
                      if (matched.status === 'Present') bgClass = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
                      else if (matched.status === 'Late') bgClass = 'bg-amber-500/20 text-amber-500 border-amber-500/30';
                      else if (matched.status === 'Absent') bgClass = 'bg-red-500/20 text-red-500 border-red-500/30';
                    }

                    return (
                      <div
                        key={`cal-day-${day}`}
                        className={`h-10 rounded-lg border flex flex-col items-center justify-center font-bold cursor-default ${bgClass}`}
                        title={matched ? `${matched.status} (In: ${matched.time_in || '—'})` : 'No Entry'}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'workout_diet' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              {/* Workout splits overview */}
              <div className="glass-card rounded-3xl p-6 border space-y-4">
                <div className="flex justify-between items-center border-b pb-3 mb-2">
                  <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground/90">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    Assigned Workout Routine Split
                  </h3>
                </div>
                
                {member.workout_plan_id ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-sm text-foreground/90">{member.workout_plan_name || 'Assigned Plan'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black border bg-primary/10 text-primary border-primary/20">
                          Active Routine
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Duration: {member.workout_start_date} to {member.workout_end_date}
                      </p>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {allWorkoutPlans.find(p => p.id === member.workout_plan_id) && 
                        Object.entries(JSON.parse(allWorkoutPlans.find(p => p.id === member.workout_plan_id).schedule)).map(([day, exercises]: any) => {
                          if (exercises.length === 0) return null;
                          return (
                            <div key={day} className="p-3 rounded-xl border border-white/5 bg-black/2 dark:bg-white/2 space-y-1.5">
                              <span className="font-bold text-[11px] text-primary">{day}</span>
                              <div className="space-y-1">
                                {exercises.map((ex: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-[10px]">
                                    <span className="font-semibold">{ex.exercise_name}</span>
                                    <span className="text-muted-foreground">{ex.sets}x{ex.reps} {ex.weight ? `(${ex.weight})` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground italic border border-dashed rounded-3xl border-white/10 p-6 space-y-3">
                    <p>No active workout split routine assigned to this member profile.</p>
                  </div>
                )}

                {/* Trainer assignment quick select */}
                <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Change / Assign Routine Split</label>
                  <div className="flex gap-2">
                    <select
                      id="workout-assign-select"
                      className="flex-1 h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10"
                      defaultValue={member.workout_plan_id || ''}
                      onChange={async (e) => {
                        const planId = e.target.value;
                        if (!planId) return;
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${API_BASE}/members/${memberId}/assign-workout`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            workout_plan_id: parseInt(planId),
                            start_date: new Date().toISOString().split('T')[0],
                            end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          })
                        });
                        if (res.ok) {
                          fetchProfile();
                          alert('Workout routine assigned successfully!');
                        }
                      }}
                    >
                      <option value="">-- Select Workout Plan --</option>
                      {allWorkoutPlans.map(p => (
                        <option key={p.id} value={p.id}>{p.plan_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Diet meal split overview */}
              <div className="glass-card rounded-3xl p-6 border space-y-4">
                <div className="flex justify-between items-center border-b pb-3 mb-2">
                  <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground/90">
                    <Activity className="w-5 h-5 text-primary" />
                    Assigned Diet & Nutrition Plan
                  </h3>
                </div>

                {member.diet_plan_id ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-sm text-foreground/90">{member.diet_plan_name || 'Assigned Diet'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black border bg-primary/10 text-primary border-primary/20">
                          Active Diet
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Duration: {member.diet_start_date} to {member.diet_end_date}
                      </p>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {allDietPlans.find(p => p.id === member.diet_plan_id) && 
                        Object.entries(JSON.parse(allDietPlans.find(p => p.id === member.diet_plan_id).meals)).map(([slot, foods]: any) => {
                          if (foods.length === 0) return null;
                          return (
                            <div key={slot} className="p-3 rounded-xl border border-white/5 bg-black/2 dark:bg-white/2 space-y-1.5">
                              <span className="font-bold text-[11px] text-primary">{slot}</span>
                              <div className="space-y-1">
                                {foods.map((food: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-[10px]">
                                    <span className="font-semibold">{food.food_name}</span>
                                    <span className="text-muted-foreground">{food.quantity} ({food.calories} kcal)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground italic border border-dashed rounded-3xl border-white/10 p-6 space-y-3">
                    <p>No active diet and meal nutrition template assigned to this member profile.</p>
                  </div>
                )}

                {/* Trainer assignment quick select */}
                <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Change / Assign Nutrition Plan</label>
                  <div className="flex gap-2">
                    <select
                      id="diet-assign-select"
                      className="flex-1 h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10"
                      defaultValue={member.diet_plan_id || ''}
                      onChange={async (e) => {
                        const planId = e.target.value;
                        if (!planId) return;
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${API_BASE}/members/${memberId}/assign-diet`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            diet_plan_id: parseInt(planId),
                            start_date: new Date().toISOString().split('T')[0],
                            end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          })
                        });
                        if (res.ok) {
                          fetchProfile();
                          alert('Diet nutrition plan assigned successfully!');
                        }
                      }}
                    >
                      <option value="">-- Select Diet Plan --</option>
                      {allDietPlans.map(p => (
                        <option key={p.id} value={p.id}>{p.plan_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'before_after' && (
            <div className="glass-card rounded-3xl p-6 border space-y-6 text-xs">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Baseline vs. Checkpoints comparison
                </h3>
                <p className="text-xs text-muted-foreground">Compare body composition changes from registration Month 0 to latest checkpoint.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Front View Photo', baseline: member.body_front, latest: history.find(l => l.photo_front)?.photo_front },
                  { label: 'Side Profile Photo', baseline: member.body_side, latest: history.find(l => l.photo_side)?.photo_side },
                  { label: 'Back Angle Photo', baseline: member.body_back, latest: history.find(l => l.photo_back)?.photo_back },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-black/5 dark:bg-white/2 border border-white/5 space-y-4">
                    <span className="font-black text-[11px] text-primary uppercase block border-b pb-1.5">{item.label}</span>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5 text-center">
                        <span className="text-[9px] text-slate-400 font-bold block">Baseline</span>
                        <div className="h-40 rounded-xl bg-black/10 border border-white/10 overflow-hidden flex items-center justify-center">
                          {item.baseline ? (
                            <img src={item.baseline} alt="Baseline" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-slate-500 italic">No baseline</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-center">
                        <span className="text-[9px] text-slate-400 font-bold block">Latest Checkpoint</span>
                        <div className="h-40 rounded-xl bg-black/10 border border-white/10 overflow-hidden flex items-center justify-center">
                          {item.latest ? (
                            <img src={item.latest} alt="Latest Checkpoint" className="w-full h-full object-cover animate-pulse" />
                          ) : (
                            <span className="text-[9px] text-slate-500 italic">No checkpoint yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
              
              {/* Left Column: subscription history & renew button */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card rounded-3xl p-6 border space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-extrabold text-sm flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Membership Subscription logs
                    </h3>

                    <button
                      onClick={async () => {
                        // Fetch plans to populate renewal dropdown
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch(`${API_BASE}/memberships/plans`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const activePlans = data.filter((p: any) => p.status === 'Active');
                            setAllDietPlans(activePlans); // Temp save plans inside allDietPlans state for dropdown mapping
                            if (activePlans.length > 0) {
                              const first = activePlans[0];
                              setRenewForm(prev => ({
                                ...prev,
                                plan_id: String(first.id),
                                price: String(first.price),
                                amount_paid: String(first.price),
                                start_date: new Date().toISOString().split('T')[0],
                                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days default
                              }));
                            }
                          }
                        } catch (e) {}
                        setShowRenewModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      Renew Membership
                    </button>
                  </div>

                  <div className="glass-panel border rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-wider bg-black/5 dark:bg-white/2">
                          <th className="p-3 pl-4">Plan Name</th>
                          <th className="p-3">Start Date</th>
                          <th className="p-3">Expiry Date</th>
                          <th className="p-3 text-right">Price</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.map(s => (
                          <tr key={s.id} className="border-b border-black/5 dark:border-white/5 last:border-0 text-xs">
                            <td className="p-3 pl-4 font-bold">{s.plan_name}</td>
                            <td className="p-3 font-mono">{s.start_date}</td>
                            <td className="p-3 font-mono font-bold text-orange-500">{s.end_date}</td>
                            <td className="p-3 text-right font-semibold">₹{s.price.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                s.status === 'Active' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {subscriptions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-muted-foreground italic">No historical subscription renewals found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Invoice payments list */}
              <div className="glass-card rounded-3xl p-6 border space-y-4">
                <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Ledger billing receipts
                </h3>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {invoices.map(p => (
                    <div key={p.id} className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[10px] font-black text-slate-400 block">{p.invoice_number}</span>
                          <span className="font-bold text-foreground/80">{p.plan_name || 'Subscription Plan'}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          p.payment_status === 'Paid' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {p.payment_status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1.5 border-t border-white/5">
                        <div>
                          <span className="text-muted-foreground block">Charged:</span>
                          <span className="font-bold">₹{p.final_amount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-emerald-500 block">Collected:</span>
                          <span className="font-black text-emerald-500">₹{p.paid_amount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-red-500 block">Balance:</span>
                          <span className="font-black text-red-500">₹{p.pending_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground italic">No historical invoices recorded.</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Subscription Renewal Modal Popup */}
          {showRenewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-md rounded-3xl glass-panel shadow-2xl p-6 border relative my-8 text-white">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div>
                    <h3 className="font-extrabold text-base">Renew Membership Package</h3>
                    <span className="text-xs text-slate-400">Client: {member.full_name}</span>
                  </div>
                  <button 
                    onClick={() => setShowRenewModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleRenewalSubmit} className="space-y-4 text-xs text-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Select Renewal Package *</label>
                    <select
                      value={renewForm.plan_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selected = allDietPlans.find(p => String(p.id) === val); // allDietPlans temporarily holds active plans list
                        if (selected) {
                          const date = new Date(renewForm.start_date);
                          let months = 1;
                          if (selected.duration.includes('Year') || selected.duration.includes('12')) months = 12;
                          else if (selected.duration.includes('6')) months = 6;
                          else if (selected.duration.includes('3')) months = 3;
                          date.setMonth(date.getMonth() + months);
                          
                          setRenewForm(prev => ({
                            ...prev,
                            plan_id: val,
                            price: String(selected.price),
                            amount_paid: String(selected.price - parseFloat(prev.discount || '0')),
                            end_date: date.toISOString().split('T')[0]
                          }));
                        }
                      }}
                      className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10 text-white"
                      required
                    >
                      <option value="">-- Select Renewal Plan --</option>
                      {allDietPlans.map(p => (
                        <option key={p.id} value={p.id}>{p.plan_name} (₹{p.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Renewal Start Date</label>
                      <input
                        type="date"
                        value={renewForm.start_date}
                        onChange={(e) => {
                          const sD = e.target.value;
                          setRenewForm(prev => ({ ...prev, start_date: sD }));
                        }}
                        className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold text-white"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Calculated Expiry</label>
                      <input
                        type="date"
                        value={renewForm.end_date}
                        className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold text-slate-400 bg-black/20 cursor-not-allowed"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center block">Price (₹)</label>
                      <input
                        type="text"
                        value={renewForm.price ? `₹${renewForm.price}` : '₹0'}
                        className="w-full h-11 px-2 rounded-xl glass-input text-xs font-bold text-center text-slate-400 bg-black/20 cursor-not-allowed"
                        disabled
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center block">Discount (₹)</label>
                      <input
                        type="number"
                        value={renewForm.discount}
                        onChange={(e) => {
                          const disc = parseFloat(e.target.value) || 0;
                          setRenewForm(prev => ({
                            ...prev,
                            discount: e.target.value,
                            amount_paid: String(Math.max(0, parseFloat(prev.price || '0') - disc))
                          }));
                        }}
                        className="w-full h-11 px-2 rounded-xl glass-input text-xs text-center text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center block">Paid (₹) *</label>
                      <input
                        type="number"
                        value={renewForm.amount_paid}
                        onChange={(e) => setRenewForm({ ...renewForm, amount_paid: e.target.value })}
                        className="w-full h-11 px-2 rounded-xl glass-input text-xs font-bold text-center text-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment Mode *</label>
                      <select
                        value={renewForm.payment_mode}
                        onChange={(e) => setRenewForm({ ...renewForm, payment_mode: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10 text-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / GPay</option>
                        <option value="Card">Credit/Debit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transaction ID (UPI Ref)</label>
                      <input
                        type="text"
                        placeholder="UPI / Card Ref Num"
                        value={renewForm.transaction_id}
                        onChange={(e) => setRenewForm({ ...renewForm, transaction_id: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Remarks</label>
                    <textarea
                      placeholder="Renewal payment notes..."
                      value={renewForm.remarks}
                      onChange={(e) => setRenewForm({ ...renewForm, remarks: e.target.value })}
                      className="w-full min-h-[60px] p-3 rounded-xl glass-input text-xs text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowRenewModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      Confirm Renewal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal form progress log */}
        {isOpenLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl rounded-3xl glass-panel shadow-premium p-6 border relative my-8"
            >
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 mb-5">
                <div>
                  <h3 className="font-extrabold text-lg flex items-center gap-1.5 text-white">
                    {modalMode === 'add' ? 'Log Monthly Progress Checkpoint' : modalMode === 'edit' ? 'Edit Progress Checkpoint' : 'Detailed Monthly Progress'}
                  </h3>
                  <span className="text-xs text-slate-400">Client: {member.full_name}</span>
                </div>
                <button 
                  onClick={() => setIsOpenLogModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProgressSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 pl-1 uppercase tracking-wider">Date *</label>
                    <input
                      type="date"
                      value={progressForm.recorded_date}
                      onChange={(e) => setProgressForm({ ...progressForm, recorded_date: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl glass-input text-white text-sm"
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 pl-1 uppercase tracking-wider">Weight (kg) *</label>
                    <input
                      type="number"
                      value={progressForm.weight}
                      onChange={(e) => setProgressForm({ ...progressForm, weight: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl glass-input text-white text-sm font-bold text-primary"
                      step="0.1"
                      min="5"
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 pl-1 uppercase tracking-wider">Height (cm) *</label>
                    <input
                      type="number"
                      value={progressForm.height}
                      onChange={(e) => setProgressForm({ ...progressForm, height: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl glass-input text-white text-sm"
                      step="0.1"
                      min="10"
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>
                </div>

                {progressForm.weight && progressForm.height && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Live Calculated BMI:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white">{calculateBmiInfo(progressForm.weight, progressForm.height).bmi}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${calculateBmiInfo(progressForm.weight, progressForm.height).color}`}>
                        {calculateBmiInfo(progressForm.weight, progressForm.height).category}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest pl-1">Tape Measurements (cm)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Chest</label>
                      <input
                        type="number"
                        value={progressForm.chest}
                        onChange={(e) => setProgressForm({ ...progressForm, chest: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg glass-input text-white text-sm"
                        step="0.1"
                        min="0"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Waist</label>
                      <input
                        type="number"
                        value={progressForm.waist}
                        onChange={(e) => setProgressForm({ ...progressForm, waist: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg glass-input text-white text-sm"
                        step="0.1"
                        min="0"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Left Arm</label>
                      <input
                        type="number"
                        value={progressForm.left_arm}
                        onChange={(e) => setProgressForm({ ...progressForm, left_arm: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg glass-input text-white text-sm"
                        step="0.1"
                        min="0"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Right Arm</label>
                      <input
                        type="number"
                        value={progressForm.right_arm}
                        onChange={(e) => setProgressForm({ ...progressForm, right_arm: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg glass-input text-white text-sm"
                        step="0.1"
                        min="0"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Left Thigh</label>
                      <input
                        type="number"
                        value={progressForm.left_thigh}
                        onChange={(e) => setProgressForm({ ...progressForm, left_thigh: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg glass-input text-white text-sm"
                        step="0.1"
                        min="0"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Right Thigh</label>
                      <input
                        type="number"
                        value={progressForm.right_thigh}
                        onChange={(e) => setProgressForm({ ...progressForm, right_thigh: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg glass-input text-white text-sm"
                        step="0.1"
                        min="0"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Body Fat % (Optional)</label>
                      <input
                        type="number"
                        value={progressForm.body_fat}
                        onChange={(e) => setProgressForm({ ...progressForm, body_fat: e.target.value })}
                        placeholder="e.g. 15.4"
                        className="w-full h-10 px-3 rounded-lg glass-input text-white text-sm"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                  </div>
                </div>

                {/* Checkpoint Photos Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest pl-1">Checkpoint Progress Photos</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {(['photo_front', 'photo_side', 'photo_back'] as const).map((field) => {
                      const label = field === 'photo_front' ? 'Front View' : field === 'photo_side' ? 'Side View' : 'Back View';
                      const preview = progressForm[field];
                      
                      return (
                        <div key={field} className="space-y-1.5 text-center">
                          <label className="text-[10px] text-slate-300 font-semibold uppercase block">{label}</label>
                          <div className="h-28 rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col items-center justify-center relative group">
                            {preview ? (
                              <>
                                <img src={preview} alt={label} className="w-full h-full object-cover" />
                                {modalMode !== 'view' && (
                                  <button
                                    type="button"
                                    onClick={() => setProgressForm(prev => ({ ...prev, [field]: '' }))}
                                    className="absolute top-1 right-1 p-1 bg-red-600/80 rounded-full text-white cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-2 text-slate-400">
                                <Camera className="w-5 h-5 mb-1 text-slate-500" />
                                <span className="text-[8px] uppercase tracking-wider">No Photo</span>
                                {modalMode !== 'view' && (
                                  <label className="mt-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[8px] font-bold cursor-pointer hover:bg-primary/20">
                                    Upload
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setProgressForm(prev => ({ ...prev, [field]: reader.result as string }));
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 pl-1 uppercase tracking-wider">Trainer feedback comments</label>
                  <textarea
                    value={progressForm.trainer_notes}
                    onChange={(e) => setProgressForm({ ...progressForm, trainer_notes: e.target.value })}
                    placeholder="Record cardio intensity adjustments, nutrition guidance, or notes on performance checkpoints..."
                    className="w-full min-h-[90px] p-3 rounded-xl glass-input text-white text-sm"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsOpenLogModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs cursor-pointer"
                  >
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-black text-xs cursor-pointer shadow-md"
                    >
                      Save Progress details
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Printable ID Card Modal */}
        {showIdCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-6 relative shadow-2xl">
              <button
                onClick={() => setShowIdCardModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <h3 className="text-base font-extrabold text-white">Printable Member ID Card</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Use a double-sided ID layout card print template.</p>
              </div>

              {/* ID Card Print Area Container */}
              <div id="id-card-printable-area" className="flex flex-col sm:flex-row gap-8 justify-center items-center p-4">
                
                {/* Front Side */}
                <div className="w-[300px] h-[190px] rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/30 p-4 flex flex-col justify-between shadow-lg relative overflow-hidden text-white shrink-0">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                  
                  {/* Header */}
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-black tracking-widest text-[10px] uppercase text-indigo-400">{settings.gym_name}</span>
                    <span className="text-[7px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-400/20 font-bold uppercase tracking-wider">MEMBER CARD</span>
                  </div>

                  {/* Body Info */}
                  <div className="flex gap-3 my-2 items-center">
                    <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {member.member_photo ? (
                        <img src={member.member_photo} alt={member.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm truncate max-w-[170px] text-white leading-tight">{member.full_name}</h4>
                      <div className="text-[9px] text-indigo-200">ID: <span className="font-mono font-bold">{member.member_id}</span></div>
                      <div className="text-[9px] text-slate-400 font-mono">Mob: {member.mobile_number}</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center text-[8px] text-slate-400 pt-1 border-t border-white/5">
                    <span>Issued: {member.join_date}</span>
                    <span className="font-bold text-indigo-400">{member.membership_plan}</span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="w-[300px] h-[190px] rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-white/10 p-4 flex flex-col justify-between shadow-lg relative overflow-hidden text-white shrink-0">
                  {/* Gym Logo watermark/back */}
                  <div className="text-center pt-2">
                    <h4 className="font-bold text-xs uppercase text-slate-200 tracking-wider">{settings.gym_name}</h4>
                    <p className="text-[8px] text-slate-400 leading-normal max-w-[220px] mx-auto mt-1 truncate">{settings.address || 'Gym Center Building Road'}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">Ph: {settings.phone_number} • Support: support@gym.com</p>
                  </div>

                  {/* QR & Barcode placeholder */}
                  <div className="flex justify-between items-end pt-2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white flex items-center justify-center rounded border p-0.5 shrink-0">
                        {/* Mock QR placeholder */}
                        <div className="w-full h-full bg-slate-200 flex flex-wrap gap-0.5 p-0.5">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[6px] text-slate-500 mt-1 block">Scan QR Code</span>
                    </div>

                    <div className="flex flex-col items-center gap-0.5">
                      {/* Barcode Mock */}
                      <div className="w-24 h-6 flex gap-[2px] items-stretch bg-slate-950 p-1 rounded border border-white/5">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div key={i} className="bg-slate-300" style={{ width: i % 3 === 0 ? '4px' : '1px' }} />
                        ))}
                      </div>
                      <span className="text-[6px] text-slate-500 font-mono tracking-widest">{member.member_id}</span>
                    </div>
                  </div>

                  <div className="text-center text-[7px] text-slate-500 border-t border-white/5 pt-1">
                    Powered by Oviyam Gym Software Suite v1.0.0
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => setShowIdCardModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const originalTitle = document.title;
                    document.title = `${settings.gym_name}_${member.full_name}_ID_Card`;
                    window.print();
                    document.title = originalTitle;
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print ID Card
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
