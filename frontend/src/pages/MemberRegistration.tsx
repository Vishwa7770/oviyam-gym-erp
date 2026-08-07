import React, { useState, useEffect } from 'react';
import { API_BASE } from '../context/GymContext';
import { 
  User, 
  Phone, 
  AlertTriangle, 
  ArrowLeft, 
  HeartPulse, 
  UserCircle,
  FileText,
  Camera,
  Activity,
  Award
} from 'lucide-react';

interface MemberRegistrationProps {
  onCancel: () => void;
  onSuccess: (newMemberId: string) => void;
}

export const MemberRegistration: React.FC<MemberRegistrationProps> = ({ onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    gender: 'Male',
    age: '',
    height: '',
    weight: '',
    join_date: new Date().toISOString().split('T')[0],
    membership_plan: '',
    address: '',
    emergency_contact: '',
    medical_notes: '', // maps to medical conditions

    // Enhanced details
    dob: '',
    occupation: '',
    blood_group: '',
    membership_duration: '',
    membership_expiry_date: '',
    trainer_assigned: 'None',
    
    // Phase 5 Membership & Billing
    plan_id: '',
    amount_paid: '',
    discount: '0',
    payment_mode: 'Cash',
    transaction_id: '',
    
    // Tape measurements
    chest: '',
    waist: '',
    hips: '',
    left_arm: '',
    right_arm: '',
    left_thigh: '',
    right_thigh: '',
    neck: '',
    shoulder: '',
    calf: '',
    body_fat: '',
    bmi: '',

    // Fitness & Medical Details
    goal: 'General Health',
    fitness_level: 'Beginner',
    injuries: '',
    allergies: '',
    smoking: 'No',
    alcohol: 'No',
    previous_experience: '',

    // Trainer Assessment
    recommended_workout: '',
    recommended_diet: '',
    trainer_notes: '',

    // Base64 photos
    member_photo: '',
    body_front: '',
    body_side: '',
    body_back: ''
  });

  const [dbPlans, setDbPlans] = useState<{ id: number; plan_name: string; duration: string; price: number }[]>([]);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  // Fetch active plans from database
  useEffect(() => {
    const fetchActivePlans = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/memberships/plans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const activePlans = data.filter((p: any) => p.status === 'Active');
          setDbPlans(activePlans);
          
          if (activePlans.length > 0) {
            const first = activePlans[0];
            setSelectedPlanPrice(first.price);
            setFormData(prev => ({
              ...prev,
              plan_id: String(first.id),
              membership_plan: first.plan_name,
              membership_duration: first.duration,
              amount_paid: String(first.price)
            }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchActivePlans();
  }, []);

  const goals = [
    'Weight Loss',
    'Weight Gain',
    'Muscle Building',
    'Fat Loss',
    'Fitness',
    'Strength Training',
    'General Health'
  ];

  // Auto age calculator from DOB
  useEffect(() => {
    if (formData.dob) {
      const birth = new Date(formData.dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge > 0) {
        setFormData(prev => ({ ...prev, age: String(calculatedAge) }));
      }
    }
  }, [formData.dob]);

  // Auto expiry date calculator from duration
  useEffect(() => {
    if (formData.join_date && formData.membership_duration) {
      let months = 1;
      const durationText = formData.membership_duration.toLowerCase();
      if (durationText.includes('year') || durationText.includes('12')) {
        months = 12;
      } else if (durationText.includes('6')) {
        months = 6;
      } else if (durationText.includes('3') || durationText.includes('quarter')) {
        months = 3;
      } else if (durationText.includes('monthly') || durationText.includes('1') || durationText.includes('month')) {
        months = 1;
      } else {
        const match = durationText.match(/(\d+)/);
        if (match) months = parseInt(match[1]);
      }
      
      const date = new Date(formData.join_date);
      date.setMonth(date.getMonth() + months);
      setFormData(prev => ({
        ...prev,
        membership_expiry_date: date.toISOString().split('T')[0]
      }));
    }
  }, [formData.join_date, formData.membership_duration]);

  // Auto BMI calculator
  useEffect(() => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    if (w > 0 && h > 0) {
      const calculatedBmi = (w / Math.pow(h / 100, 2)).toFixed(1);
      setFormData(prev => ({ ...prev, bmi: calculatedBmi }));
    } else {
      setFormData(prev => ({ ...prev, bmi: '' }));
    }
  }, [formData.weight, formData.height]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Convert image to base64 helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [fieldName]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Core validations
    if (!formData.full_name.trim()) return setError('Full Name is required.');
    if (!formData.mobile_number.trim()) return setError('Mobile Number is required.');
    if (!formData.age || parseInt(formData.age) <= 0) return setError('Please enter a valid age.');
    if (!formData.height || parseFloat(formData.height) <= 0) return setError('Please enter a valid height.');
    if (!formData.weight || parseFloat(formData.weight) <= 0) return setError('Please enter a valid weight.');

    setError('');
    setWarning('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (res.status === 200 && data.alreadyExists) {
        setWarning(data.message);
        alert(`Duplicate Found: ${data.message} Opening their profile.`);
        onSuccess(data.member_id);
      } else if (res.ok || res.status === 211) {
        alert('Member Initial Assessment saved and Month 0 Progress registered!');
        onSuccess(data.member_id);
      } else {
        setError(data.error || 'Failed to save member assessment.');
      }
    } catch (err) {
      setError('Connection error. Failed to save assessment records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2.5 rounded-xl glass-card hover:bg-black/5 dark:hover:bg-white/5 border transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Initial Fitness Assessment</h2>
          <p className="text-muted-foreground text-sm mt-1">Register new member and record their baseline physical assessment.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {warning && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{warning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 pb-12">
        
        {/* Section 1: Personal Details */}
        <div className="glass-card rounded-3xl p-6 border border-white/20 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
            <UserCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-sm"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Mobile Number *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="Mobile phone"
                  className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-sm"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
                disabled={isSubmitting}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Age *</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Age"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                min="1"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Occupation</label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                placeholder="Job profile"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Blood Group</label>
              <input
                type="text"
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                placeholder="e.g. O+ve"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Emergency Contact Info</label>
              <input
                type="text"
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
                placeholder="Emergency Contact Name & Mobile"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Residential Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Full Address"
              className="w-full min-h-[70px] p-3 rounded-xl glass-input text-sm"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Section 2: Membership Details */}
        <div className="glass-card rounded-3xl p-6 border border-white/20 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Membership Plan & Billing Setup</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Join Date *</label>
              <input
                type="date"
                name="join_date"
                value={formData.join_date}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Select Membership Plan *</label>
              <select
                name="plan_id"
                value={formData.plan_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const selected = dbPlans.find(p => String(p.id) === val);
                  if (selected) {
                    setSelectedPlanPrice(selected.price);
                    setFormData(prev => ({
                      ...prev,
                      plan_id: val,
                      membership_plan: selected.plan_name,
                      membership_duration: selected.duration,
                      amount_paid: String(Math.max(0, selected.price - parseFloat(prev.discount || '0')))
                    }));
                  }
                }}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
                disabled={isSubmitting}
                required
              >
                <option value="">-- Choose Plan --</option>
                {dbPlans.map(p => (
                  <option key={p.id} value={p.id}>{p.plan_name} (₹{p.price})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Membership Duration</label>
              <input
                type="text"
                value={formData.membership_duration || 'Select Plan'}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm text-muted-foreground bg-black/5 dark:bg-white/5 cursor-not-allowed"
                disabled
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Membership Expiry Date</label>
              <input
                type="date"
                name="membership_expiry_date"
                value={formData.membership_expiry_date}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm text-muted-foreground bg-black/5 dark:bg-white/5 cursor-not-allowed"
                disabled
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Plan price (₹)</label>
              <input
                type="text"
                value={selectedPlanPrice ? `₹${selectedPlanPrice.toLocaleString()}` : '₹0'}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm text-muted-foreground bg-black/5 dark:bg-white/5 cursor-not-allowed"
                disabled
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Discount Amount (₹)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={(e) => {
                  const dVal = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    discount: e.target.value,
                    amount_paid: String(Math.max(0, selectedPlanPrice - dVal))
                  }));
                }}
                placeholder="0"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Amount Paid (₹) *</label>
              <input
                type="number"
                name="amount_paid"
                value={formData.amount_paid}
                onChange={handleChange}
                placeholder="0"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm font-bold text-primary"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Payment Mode *</label>
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
                disabled={isSubmitting}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Transaction ID (Optional)</label>
              <input
                type="text"
                name="transaction_id"
                value={formData.transaction_id}
                onChange={handleChange}
                placeholder="e.g. UPI Ref Number"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Assigned Trainer</label>
              <input
                type="text"
                name="trainer_assigned"
                value={formData.trainer_assigned}
                onChange={handleChange}
                placeholder="Trainer Name"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Initial Body Assessment */}
        <div className="glass-card rounded-3xl p-6 border border-white/20 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Initial Body Metrics Assessment</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Height (cm) *</label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="e.g. 175"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                min="10"
                step="0.1"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Weight (kg) *</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 70"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                min="5"
                step="0.1"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Body Fat %</label>
              <input
                type="number"
                name="body_fat"
                value={formData.body_fat}
                onChange={handleChange}
                placeholder="e.g. 18.2"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
                min="1"
                max="90"
                step="0.1"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">BMI (Auto)</label>
              <input
                type="text"
                value={formData.bmi}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm text-muted-foreground bg-black/5 dark:bg-white/5 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          {/* Tape measurements */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-primary uppercase pl-1 tracking-widest block">Tape Measurements (cm)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Chest</label>
                <input
                  type="number"
                  name="chest"
                  value={formData.chest}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Waist</label>
                <input
                  type="number"
                  name="waist"
                  value={formData.waist}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Hips</label>
                <input
                  type="number"
                  name="hips"
                  value={formData.hips}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Left Arm</label>
                <input
                  type="number"
                  name="left_arm"
                  value={formData.left_arm}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Right Arm</label>
                <input
                  type="number"
                  name="right_arm"
                  value={formData.right_arm}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Left Thigh</label>
                <input
                  type="number"
                  name="left_thigh"
                  value={formData.left_thigh}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Right Thigh</label>
                <input
                  type="number"
                  name="right_thigh"
                  value={formData.right_thigh}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Neck</label>
                <input
                  type="number"
                  name="neck"
                  value={formData.neck}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Shoulder</label>
                <input
                  type="number"
                  name="shoulder"
                  value={formData.shoulder}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-0.5">Calf</label>
                <input
                  type="number"
                  name="calf"
                  value={formData.calf}
                  onChange={handleChange}
                  placeholder="0.0"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Fitness & Habits info */}
        <div className="glass-card rounded-3xl p-6 border border-white/20 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
            <HeartPulse className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Fitness Profile & Habits</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Primary Goal</label>
              <select
                name="goal"
                value={formData.goal}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
              >
                {goals.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Fitness Level</label>
              <select
                name="fitness_level"
                value={formData.fitness_level}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Smoking</label>
              <select
                name="smoking"
                value={formData.smoking}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
                <option value="Occasional">Occasional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Alcohol</label>
              <select
                name="alcohol"
                value={formData.alcohol}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl glass-input text-sm appearance-none cursor-pointer"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
                <option value="Occasional">Occasional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Prior Gym Experience</label>
              <input
                type="text"
                name="previous_experience"
                value={formData.previous_experience}
                onChange={handleChange}
                placeholder="e.g. 6 Months, None"
                className="w-full h-11 px-4 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-semibold">
            <div className="space-y-1">
              <label className="text-muted-foreground uppercase text-xs">Medical Conditions</label>
              <textarea
                name="medical_notes"
                value={formData.medical_notes}
                onChange={handleChange}
                placeholder="Asthma, Diabetes, Heart Conditions, etc."
                className="w-full min-h-[80px] p-3 rounded-xl glass-input text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground uppercase text-xs">Injuries Details</label>
              <textarea
                name="injuries"
                value={formData.injuries}
                onChange={handleChange}
                placeholder="Back pain, Knee injuries, Sprains..."
                className="w-full min-h-[80px] p-3 rounded-xl glass-input text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground uppercase text-xs">Allergies details</label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="Food allergies, dust allergies, chemical..."
                className="w-full min-h-[80px] p-3 rounded-xl glass-input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Trainer Assessment & Prescription */}
        <div className="glass-card rounded-3xl p-6 border border-white/20 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Trainer Initial Assessment & Prescription</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-muted-foreground uppercase text-xs">Recommended Workout Program</label>
              <textarea
                name="recommended_workout"
                value={formData.recommended_workout}
                onChange={handleChange}
                placeholder="Cardio split, Hypertrophy split, Strength split..."
                className="w-full min-h-[90px] p-3 rounded-xl glass-input text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground uppercase text-xs">Recommended Nutrition Diet Plan</label>
              <textarea
                name="recommended_diet"
                value={formData.recommended_diet}
                onChange={handleChange}
                placeholder="High protein diet, Calorie deficit diet..."
                className="w-full min-h-[90px] p-3 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase pl-1">Trainer General Notes</label>
            <textarea
              name="trainer_notes"
              value={formData.trainer_notes}
              onChange={handleChange}
              placeholder="Starting checkpoints notes on fitness capacity..."
              className="w-full min-h-[80px] p-3 rounded-xl glass-input text-sm"
            />
          </div>
        </div>

        {/* Section 6: Photos Capture Uploads */}
        <div className="glass-card rounded-3xl p-6 border border-white/20 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Initial Assessment Photos Archive</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* 1. Member Profile Photo */}
            <div className="flex flex-col items-center justify-between border border-dashed border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition-colors h-48 relative">
              <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Member Photo</span>
              {formData.member_photo ? (
                <img src={formData.member_photo} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
              ) : (
                <Camera className="w-10 h-10 text-muted-foreground/60" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, 'member_photo')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="text-[9px] text-primary font-bold">Upload Photo</span>
            </div>

            {/* 2. Initial Body Front View */}
            <div className="flex flex-col items-center justify-between border border-dashed border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition-colors h-48 relative">
              <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Front Body View</span>
              {formData.body_front ? (
                <img src={formData.body_front} alt="Body Front" className="w-20 h-24 rounded-lg object-cover border border-white/20" />
              ) : (
                <Camera className="w-10 h-10 text-muted-foreground/60" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, 'body_front')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="text-[9px] text-primary font-bold">Upload Front</span>
            </div>

            {/* 3. Initial Body Side View */}
            <div className="flex flex-col items-center justify-between border border-dashed border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition-colors h-48 relative">
              <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Side Body View</span>
              {formData.body_side ? (
                <img src={formData.body_side} alt="Body Side" className="w-20 h-24 rounded-lg object-cover border border-white/20" />
              ) : (
                <Camera className="w-10 h-10 text-muted-foreground/60" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, 'body_side')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="text-[9px] text-primary font-bold">Upload Side</span>
            </div>

            {/* 4. Initial Body Back View */}
            <div className="flex flex-col items-center justify-between border border-dashed border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition-colors h-48 relative">
              <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Back Body View</span>
              {formData.body_back ? (
                <img src={formData.body_back} alt="Body Back" className="w-20 h-24 rounded-lg object-cover border border-white/20" />
              ) : (
                <Camera className="w-10 h-10 text-muted-foreground/60" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, 'body_back')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="text-[9px] text-primary font-bold">Upload Back</span>
            </div>
          </div>
        </div>

        {/* Actions panel */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl glass-card border font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/95 transition-all disabled:opacity-50 cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving Assessment...' : 'Save Member & Assessment'}
          </button>
        </div>

      </form>
    </div>
  );
};
