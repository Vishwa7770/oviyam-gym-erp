import React, { useState } from 'react';
import { 
  Building, Sparkles, Plus, Trash2, ShieldAlert, Check, 
  ArrowRight, ArrowLeft, Upload, Dumbbell, Award, Landmark,
  User, Key, ShieldCheck, CheckCircle
} from 'lucide-react';
import { API_BASE } from '../context/GymContext';

interface PlanSeed {
  plan_name: string;
  duration: string;
  price: string;
  description: string;
}

interface TrainerSeed {
  trainer_id: string;
  full_name: string;
  mobile_number: string;
  email: string;
  gender: string;
  experience: string;
  specialization: string;
  qualification: string;
  password?: string;
}

export const SetupWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states - Step 1: Gym Details
  const [gymName, setGymName] = useState('Oviyam Gym');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('06:00 AM - 10:00 PM');
  const [currency, setCurrency] = useState('₹');
  const [website, setWebsite] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('Thank you for training with us!');
  const [logo, setLogo] = useState('');
  const [favicon, setFavicon] = useState('');
  const [accentColor, setAccentColor] = useState('purple');
  const [theme, setTheme] = useState('dark');

  // Step 2: Create Admin Account
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Step 3: Membership Plans
  const [plans, setPlans] = useState<PlanSeed[]>([
    { plan_name: 'Monthly Tier', duration: '30 Days', price: '1200', description: 'Standard gym floor membership' },
    { plan_name: 'Quarterly split', duration: '90 Days', price: '3200', description: 'Save 10% on quarterly signups' },
    { plan_name: 'Personal Coaching', duration: '30 Days', price: '6000', description: '1-on-1 private trainer guidance' }
  ]);
  const [newPlan, setNewPlan] = useState<PlanSeed>({ plan_name: '', duration: '30 Days', price: '', description: '' });

  // Step 4: Add Trainers
  const [trainers, setTrainers] = useState<TrainerSeed[]>([
    { trainer_id: 'TRN-101', full_name: 'Alexander Stone', mobile_number: '9876543201', email: 'stone@gym.com', gender: 'Male', experience: '6', specialization: 'Bodybuilding & Hypertrophy', qualification: 'ISSA Certified Coach', password: 'trainer123' }
  ]);
  const [newTrainer, setNewTrainer] = useState<TrainerSeed>({
    trainer_id: 'TRN-102',
    full_name: '',
    mobile_number: '',
    email: '',
    gender: 'Male',
    experience: '2',
    specialization: '',
    qualification: '',
    password: 'trainer123'
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onloadend = () => setLogo(r.result as string);
      r.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onloadend = () => setFavicon(r.result as string);
      r.readAsDataURL(file);
    }
  };

  const addPlan = () => {
    if (!newPlan.plan_name || !newPlan.price) return;
    setPlans([...plans, newPlan]);
    setNewPlan({ plan_name: '', duration: '30 Days', price: '', description: '' });
  };

  const removePlan = (idx: number) => {
    setPlans(plans.filter((_, i) => i !== idx));
  };

  const addTrainer = () => {
    if (!newTrainer.full_name || !newTrainer.mobile_number || !newTrainer.email) return;
    setTrainers([...trainers, newTrainer]);
    setNewTrainer({
      trainer_id: `TRN-${Math.floor(100 + Math.random() * 900)}`,
      full_name: '',
      mobile_number: '',
      email: '',
      gender: 'Male',
      experience: '2',
      specialization: '',
      qualification: '',
      password: 'trainer123'
    });
  };

  const removeTrainer = (idx: number) => {
    setTrainers(trainers.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        gym_name: gymName,
        gym_logo: logo,
        address,
        phone_number: phone,
        email,
        theme,
        accent_color: accentColor,
        working_hours: hours,
        currency,
        website,
        gst_number: gstNumber,
        invoice_footer: invoiceFooter,
        favicon,
        adminUsername,
        adminPassword,
        trainers,
        membershipPlans: plans
      };

      const res = await fetch(`${API_BASE}/settings/complete-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Setup configuration wizard completed successfully! Enjoy your brand-new system.');
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete setup configuration.');
      }
    } catch (e) {
      alert('Connection error finalizing setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070e] flex flex-col justify-center items-center p-4 text-xs text-white">
      <div className="absolute inset-0 bg-radial-gradient from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-2xl glass-card border border-white/10 rounded-3xl p-8 relative space-y-6 shadow-2xl">
        {/* Header Indicator */}
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Oviyam Gym Installation Wizard</h1>
              <p className="text-[10px] text-slate-400">Deploy your client white-labeled workspace instantly</p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold">
            Step {step} of 5
          </div>
        </div>

        {/* Wizard Steps */}

        {/* Step 1: Gym Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-3">
              <h2 className="font-bold text-sm">Step 1: Gym Details & Branding</h2>
              <p className="text-[10px] text-slate-400">Configure base address, currency, support hours, and brand logos.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Gym Name *</label>
                <input 
                  type="text" 
                  value={gymName} 
                  onChange={(e) => setGymName(e.target.value)} 
                  className="w-full h-10 px-3 rounded-lg glass-input text-white border-white/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Address / Location</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="e.g. 12 Main St, Chennai"
                  className="w-full h-10 px-3 rounded-lg glass-input text-white border-white/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Phone Number</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full h-10 px-3 rounded-lg glass-input text-white border-white/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Support Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full h-10 px-3 rounded-lg glass-input text-white border-white/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Currency</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)} 
                  className="w-full h-10 px-2.5 rounded-lg glass-input text-white border-white/15"
                >
                  <option value="₹">₹ (INR)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Accent Style</label>
                <select 
                  value={accentColor} 
                  onChange={(e) => setAccentColor(e.target.value)} 
                  className="w-full h-10 px-2.5 rounded-lg glass-input text-white border-white/15"
                >
                  <option value="purple">Royal Purple</option>
                  <option value="blue">Electric Blue</option>
                  <option value="green">Emerald Green</option>
                  <option value="orange">Sunset Orange</option>
                </select>
              </div>

              {/* Logo uploaders */}
              <div className="space-y-2 col-span-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Gym Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <Building className="w-5 h-5 text-slate-500" />}
                    </div>
                    <label className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold cursor-pointer">
                      Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Favicon Tab Icon</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {favicon ? <img src={favicon} alt="Favicon" className="w-full h-full object-cover" /> : <Landmark className="w-5 h-5 text-slate-500" />}
                    </div>
                    <label className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold cursor-pointer">
                      Upload Favicon
                      <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Create Admin Account */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-3">
              <h2 className="font-bold text-sm">Step 2: Create Admin Account</h2>
              <p className="text-[10px] text-slate-400">Configure your primary administrator login credentials.</p>
            </div>

            <div className="max-w-md mx-auto space-y-4 p-6 rounded-2xl bg-white/5 border border-white/5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Admin Username *
                </label>
                <input 
                  type="text" 
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg glass-input text-white border-white/15"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-primary" />
                  Admin Password *
                </label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg glass-input text-white border-white/15"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Membership plans */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-3">
              <h2 className="font-bold text-sm">Step 3: Setup Membership Tiers</h2>
              <p className="text-[10px] text-slate-400">Initialize standard plans clients can purchase immediately.</p>
            </div>

            <div className="space-y-3">
              {/* Add plan inline */}
              <div className="grid grid-cols-4 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 items-end">
                <div className="space-y-1 col-span-2">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Plan Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Monthly Standard" 
                    value={newPlan.plan_name} 
                    onChange={(e) => setNewPlan({...newPlan, plan_name: e.target.value})}
                    className="w-full h-8 px-2.5 rounded glass-input text-white border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Duration</label>
                  <select 
                    value={newPlan.duration} 
                    onChange={(e) => setNewPlan({...newPlan, duration: e.target.value})}
                    className="w-full h-8 px-1.5 rounded glass-input text-white border-white/10"
                  >
                    <option value="30 Days">30 Days</option>
                    <option value="90 Days">90 Days</option>
                    <option value="180 Days">180 Days</option>
                    <option value="365 Days">365 Days</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Price ({currency})</label>
                  <div className="flex gap-1 items-center">
                    <input 
                      type="number" 
                      placeholder="Price" 
                      value={newPlan.price} 
                      onChange={(e) => setNewPlan({...newPlan, price: e.target.value})}
                      className="w-full h-8 px-2 rounded glass-input text-white border-white/10"
                    />
                    <button 
                      onClick={addPlan}
                      className="h-8 w-8 rounded bg-primary hover:bg-primary/95 text-white flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Plans list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {plans.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-white/5 border border-white/5 rounded-lg">
                    <div>
                      <span className="font-bold text-white block">{p.plan_name}</span>
                      <span className="text-[9px] text-slate-400">{p.duration} • {currency}{p.price}</span>
                    </div>
                    <button 
                      onClick={() => removePlan(idx)} 
                      className="p-1 rounded text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Trainers */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-3">
              <h2 className="font-bold text-sm">Step 4: Create Trainer Accounts</h2>
              <p className="text-[10px] text-slate-400">Register trainer coaches and setup their login access.</p>
            </div>

            <div className="space-y-3">
              {/* Add trainer inline */}
              <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 items-end">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Trainer ID</label>
                  <input 
                    type="text" 
                    value={newTrainer.trainer_id} 
                    disabled 
                    className="w-full h-8 px-2 rounded bg-black/35 text-slate-400 border-white/5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Coach Name" 
                    value={newTrainer.full_name} 
                    onChange={(e) => setNewTrainer({...newTrainer, full_name: e.target.value})}
                    className="w-full h-8 px-2 rounded glass-input text-white border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Mobile Number</label>
                  <input 
                    type="text" 
                    placeholder="Mobile" 
                    value={newTrainer.mobile_number} 
                    onChange={(e) => setNewTrainer({...newTrainer, mobile_number: e.target.value})}
                    className="w-full h-8 px-2 rounded glass-input text-white border-white/10"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="trainer@oviyam.com" 
                    value={newTrainer.email} 
                    onChange={(e) => setNewTrainer({...newTrainer, email: e.target.value})}
                    className="w-full h-8 px-2 rounded glass-input text-white border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Specialization</label>
                  <div className="flex gap-1 items-center">
                    <input 
                      type="text" 
                      placeholder="e.g. Strength" 
                      value={newTrainer.specialization} 
                      onChange={(e) => setNewTrainer({...newTrainer, specialization: e.target.value})}
                      className="w-full h-8 px-2 rounded glass-input text-white border-white/10"
                    />
                    <button 
                      onClick={addTrainer}
                      className="h-8 w-8 rounded bg-primary hover:bg-primary/95 text-white flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Trainers List */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {trainers.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-white/5 border border-white/5 rounded-lg">
                    <div>
                      <span className="font-bold text-white block">{t.full_name} <span className="text-[8px] text-primary">{t.trainer_id}</span></span>
                      <span className="text-[9px] text-slate-400">{t.specialization || 'General Coach'} • {t.email}</span>
                    </div>
                    <button 
                      onClick={() => removeTrainer(idx)} 
                      className="p-1 rounded text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Complete Installation */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-3">
              <h2 className="font-bold text-sm">Step 5: Complete Installation & License Activation</h2>
              <p className="text-[10px] text-slate-400">Review specifications and complete deployment configuration.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Product License Status
                </span>
                <p className="text-[10px] text-slate-300">
                  License key: <span className="font-mono font-bold text-white">OV-DEMO-9999-XXXX</span> • Status: <span className="text-emerald-400 font-bold">Activated (Demo Mode)</span>
                </p>
                <p className="text-[9px] text-slate-400 italic">
                  Installation Date: {new Date().toLocaleDateString()} • Software Version: v1.0.0 (Commercial Release)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="font-bold text-white block">Gym Setup Summary:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-400 text-[10px]">
                  <li>Gym Name: <span className="text-white font-bold">{gymName}</span></li>
                  <li>Admin Account: <span className="text-white font-bold">{adminUsername} (Created)</span></li>
                  <li>Membership Tier SeedCount: <span className="text-white font-bold">{plans.length} tiers configured</span></li>
                  <li>Trainers Account Count: <span className="text-white font-bold">{trainers.length} accounts configured</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Actions */}
        <div className="flex justify-between pt-4 border-t border-white/5">
          <button
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            disabled={step === 1 || loading}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(prev => Math.min(5, prev + 1))}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Finalizing Installation...' : 'Complete Installation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
