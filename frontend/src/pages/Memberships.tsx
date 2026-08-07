import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  ClipboardList, Plus, Edit2, Trash2, DollarSign, Calendar, MessageSquare, Check, X, Search 
} from 'lucide-react';

interface MembershipPlan {
  id: number;
  plan_name: string;
  duration: string;
  price: number;
  description: string;
  status: 'Active' | 'Inactive';
}

interface PendingDue {
  id: number;
  invoice_number: string;
  member_id: string;
  full_name: string;
  mobile_number: string;
  plan_name: string;
  final_amount: number;
  paid_amount: number;
  pending_amount: number;
  due_date: string;
}

export const Memberships: React.FC = () => {
  const { settings } = useGym();
  
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [dues, setDues] = useState<PendingDue[]>([]);
  const [activeTab, setActiveTab] = useState<'plans' | 'dues'>('plans');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    duration: 'Monthly',
    price: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedDue, setSelectedDue] = useState<PendingDue | null>(null);
  const [collectForm, setCollectForm] = useState({
    amount: '',
    payment_mode: 'Cash',
    transaction_id: '',
    remarks: ''
  });

  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/memberships/plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDues = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/payments/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDues(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPlans(), fetchDues()]).finally(() => setLoading(false));
  }, []);

  const handleOpenPlanModal = (plan?: MembershipPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        plan_name: plan.plan_name,
        duration: plan.duration,
        price: String(plan.price),
        description: plan.description,
        status: plan.status
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        plan_name: '',
        duration: 'Monthly',
        price: '',
        description: '',
        status: 'Active'
      });
    }
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.plan_name || !planForm.price) return;

    try {
      const token = localStorage.getItem('token');
      const url = editingPlan 
        ? `${API_BASE}/memberships/plans/${editingPlan.id}` 
        : `${API_BASE}/memberships/plans`;
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...planForm,
          price: parseFloat(planForm.price)
        })
      });

      if (res.ok) {
        fetchPlans();
        setShowPlanModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save membership plan');
      }
    } catch (err) {
      alert('Error saving plan');
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/memberships/plans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch (err) {
      alert('Error deleting plan');
    }
  };

  const handleOpenCollectModal = (due: PendingDue) => {
    setSelectedDue(due);
    setCollectForm({
      amount: String(due.pending_amount),
      payment_mode: 'Cash',
      transaction_id: '',
      remarks: ''
    });
    setShowCollectModal(true);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue || !collectForm.amount) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/payments/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_number: selectedDue.invoice_number,
          paid_amount: parseFloat(collectForm.amount),
          payment_mode: collectForm.payment_mode,
          transaction_id: collectForm.transaction_id,
          remarks: collectForm.remarks
        })
      });

      if (res.ok) {
        fetchDues();
        setShowCollectModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record payment');
      }
    } catch (err) {
      alert('Error collecting dues');
    }
  };

  // Premade reminder message builder
  const handleContactWhatsApp = (due: PendingDue) => {
    const message = `Hi ${due.full_name}, this is a friendly reminder from ${settings.gym_name}. Your subscription balance of ₹${due.pending_amount.toFixed(2)} for the ${due.plan_name} plan is due on ${due.due_date}. Please pay off outstanding balances online or at the gym desk. Thank you!`;
    const cleanedPhone = due.mobile_number.replace(/\D/g, '');
    const finalPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredDues = dues.filter(d => 
    d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.mobile_number.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Memberships & Dues</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage membership packages and track pending client balances.</p>
        </div>
        
        {activeTab === 'plans' && (
          <button 
            onClick={() => handleOpenPlanModal()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/10 dark:border-white/5 pb-0.5 gap-2">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
            activeTab === 'plans' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Membership Packages ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('dues')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
            activeTab === 'dues' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Outstanding Dues ({dues.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : activeTab === 'plans' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="glass-card rounded-3xl p-6 border flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-250 relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground/90 leading-tight">{plan.plan_name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">{plan.duration} Duration</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                    plan.status === 'Active' 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {plan.status}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground/80 min-h-[40px] line-clamp-3 leading-relaxed">{plan.description || 'No package description details provided.'}</p>
                
                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-primary">₹{plan.price.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Package Price</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 border-t border-black/5 dark:border-white/5 pt-4">
                <button 
                  onClick={() => handleOpenPlanModal(plan)}
                  className="p-2 rounded-lg bg-black/5 dark:hover:bg-white/10 hover:bg-black/10 dark:bg-white/5 border border-white/10 transition-colors text-foreground/80 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDeletePlan(plan.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No membership plans created yet. Click "Create Plan" to define your packages.
            </div>
          )}
        </div>
      ) : (
        /* Dues cockpit */
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dues by client or invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-xs"
            />
          </div>

          <div className="glass-panel border rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase text-muted-foreground tracking-wider bg-black/5 dark:bg-white/2">
                  <th className="p-4 pl-6">Client Details</th>
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Package</th>
                  <th className="p-4 text-right">Invoice Balance</th>
                  <th className="p-4 text-right text-red-500">Amount Due</th>
                  <th className="p-4">Due Expiry</th>
                  <th className="p-4 pr-6 text-center">Desk Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDues.map(due => (
                  <tr key={due.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/2 dark:hover:bg-white/2 text-xs">
                    <td className="p-4 pl-6">
                      <span className="font-bold block text-foreground/90">{due.full_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{due.mobile_number}</span>
                    </td>
                    <td className="p-4 font-mono text-[11px] font-bold text-muted-foreground">{due.invoice_number}</td>
                    <td className="p-4 font-semibold">{due.plan_name}</td>
                    <td className="p-4 text-right font-semibold">₹{due.final_amount.toFixed(2)}</td>
                    <td className="p-4 text-right font-black text-red-500">₹{due.pending_amount.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-bold text-orange-500 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {due.due_date}
                      </span>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleContactWhatsApp(due)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-[10px] font-black tracking-wide cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Remind
                        </button>
                        <button
                          onClick={() => handleOpenCollectModal(due)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 text-[10px] font-black tracking-wide cursor-pointer"
                        >
                          <DollarSign className="w-3 h-3" />
                          Collect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDues.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No members with outstanding due balances found. Excellent client records!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Membership Plan Create/Edit Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-card border rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base">{editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}</h3>
              <button onClick={() => setShowPlanModal(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={planForm.plan_name ? handlePlanSubmit : (e) => e.preventDefault()} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Plan Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 3 Months Gold Plan"
                  value={planForm.plan_name}
                  onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duration Period *</label>
                  <select
                    value={planForm.duration}
                    onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                  >
                    <option value="Monthly">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                    <option value="Personal Training">Personal Training</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Plan Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2500"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Package Description</label>
                <textarea
                  placeholder="Describe details, restrictions, and accessibility perks..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full min-h-[80px] p-3 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</label>
                <select
                  value={planForm.status}
                  onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dues Collection / Manual Payments Modal */}
      {showCollectModal && selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-card border rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base">Collect Due Payments</h3>
                <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold">{selectedDue.invoice_number}</span>
              </div>
              <button onClick={() => setShowCollectModal(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-semibold">Total Outstanding Balance:</span>
              <span className="text-lg font-black text-red-500">₹{selectedDue.pending_amount.toFixed(2)}</span>
            </div>

            <form onSubmit={collectForm.amount ? handleCollectSubmit : (e) => e.preventDefault()} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedDue.pending_amount}
                  value={collectForm.amount}
                  onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs font-bold text-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment Mode *</label>
                  <select
                    value={collectForm.payment_mode}
                    onChange={(e) => setCollectForm({ ...collectForm, payment_mode: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transaction ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref 12345"
                    value={collectForm.transaction_id}
                    onChange={(e) => setCollectForm({ ...collectForm, transaction_id: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment Remarks</label>
                <textarea
                  placeholder="Notes (e.g. client paid via phone pe desk check)"
                  value={collectForm.remarks}
                  onChange={(e) => setCollectForm({ ...collectForm, remarks: e.target.value })}
                  className="w-full min-h-[60px] p-3 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
