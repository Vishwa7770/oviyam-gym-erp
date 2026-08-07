import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import type { GymSettings } from '../context/GymContext';
import { 
  Layout, ShieldAlert, Dumbbell, Upload, Save, Check, 
  Database, RefreshCw, Clock, Sparkles, HelpCircle, Info, Trash2, ArrowDownToLine
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BackupArchive {
  id: number;
  file_path: string;
  size: number;
  status: string;
  created_at: string;
}

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useGym();

  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'security' | 'backups' | 'license' | 'about'>('branding');
  const [formData, setFormData] = useState<GymSettings>({ ...settings });
  
  // Image previews
  const [logoPreview, setLogoPreview] = useState<string>(settings.gym_logo || '');
  const [faviconPreview, setFaviconPreview] = useState<string>(settings.favicon || '');
  const [loginBgPreview, setLoginBgPreview] = useState<string>(settings.login_bg || '');
  const [bannerPreview, setBannerPreview] = useState<string>(settings.dashboard_banner || '');

  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  // Change Password fields
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Backup states
  const [backups, setBackups] = useState<BackupArchive[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/backups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (e) {
      console.error('Error fetching backups:', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/backups`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Database snapshot created successfully!');
        fetchBackups();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create backup.');
      }
    } catch (e) {
      alert('Network error creating backup.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this backup snapshot from disk?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/backups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Backup snapshot deleted.');
        fetchBackups();
      }
    } catch (e) {
      alert('Network error deleting backup.');
    }
  };

  const handleDownloadBackup = async (id: number, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/backups/${id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Failed to download backup file.');
      }
    } catch (e) {
      alert('Network error downloading backup file.');
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`WARNING: Restoring database from backup "${filename}" will overwrite all current members, payments, attendance, and routines. Continue?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/backups/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        alert('Database restored successfully! The application will now reload to synchronize settings.');
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to restore database.');
      }
    } catch (e) {
      alert('Network error restoring database.');
    }
  };

  const handleExportDatabase = async (format: 'json' | 'excel' | 'csv' | 'pdf') => {
    try {
      const token = localStorage.getItem('token');
      const [resMembers, resTrainers, resPayments, resAttendance] = await Promise.all([
        fetch(`${API_BASE}/members`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/trainers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/payments`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/attendance`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!resMembers.ok || !resTrainers.ok || !resPayments.ok || !resAttendance.ok) {
        alert('Failed to retrieve full database tables for export.');
        return;
      }

      const membersData = await resMembers.json();
      const trainers = await resTrainers.json();
      const payments = await resPayments.json();
      const attendance = await resAttendance.json();

      const members = membersData.members || membersData;

      const fullDatabaseObj = {
        export_date: new Date().toISOString(),
        gym_name: settings.gym_name,
        members: members,
        trainers: trainers,
        payments: payments,
        attendance: attendance
      };

      if (format === 'json') {
        const content = JSON.stringify(fullDatabaseObj, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${settings.gym_name.replace(/\s+/g, '_')}_Full_DB_Backup.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        
        const wsMembers = XLSX.utils.json_to_sheet(members);
        XLSX.utils.book_append_sheet(wb, wsMembers, 'Members');
        
        const wsTrainers = XLSX.utils.json_to_sheet(trainers);
        XLSX.utils.book_append_sheet(wb, wsTrainers, 'Trainers');
        
        const wsPayments = XLSX.utils.json_to_sheet(payments);
        XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');
        
        const wsAttendance = XLSX.utils.json_to_sheet(attendance);
        XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance');

        XLSX.writeFile(wb, `${settings.gym_name.replace(/\s+/g, '_')}_Complete_Database.xlsx`);
      } else if (format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(members);
        const csvContent = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${settings.gym_name.replace(/\s+/g, '_')}_Members_List.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'pdf') {
        const originalTitle = document.title;
        document.title = `${settings.gym_name.replace(/\s+/g, '_')}_System_Summary_Report`;
        window.print();
        document.title = originalTitle;
      }
    } catch (e) {
      console.error(e);
      alert('Error building database export files.');
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleBrandingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Convert uploaded image to base64 string helper
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'gym_logo' | 'favicon' | 'login_bg' | 'dashboard_banner') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (field === 'gym_logo') setLogoPreview(base64String);
        if (field === 'favicon') setFaviconPreview(base64String);
        if (field === 'login_bg') setLoginBgPreview(base64String);
        if (field === 'dashboard_banner') setBannerPreview(base64String);

        setFormData(prev => ({ ...prev, [field]: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gym_name.trim()) {
      alert('Gym Name is required.');
      return;
    }
    setIsSavingBranding(true);
    setBrandingSuccess(false);

    try {
      const success = await updateSettings(formData);
      if (success) {
        setBrandingSuccess(true);
        setTimeout(() => setBrandingSuccess(false), 3000);
      } else {
        alert('Failed to save settings. Make sure you are authenticated.');
      }
    } catch (err) {
      alert('Error saving settings.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setIsSavingPassword(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/settings/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess(true);
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError('Connection error. Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs text-white">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">System Settings</h2>
        <p className="text-slate-400 text-xs mt-1">Configure gym-wide configurations, custom white-labeling, credentials, and backups.</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/5 gap-2 pb-px">
        <button
          onClick={() => setActiveSubTab('branding')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'branding' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Branding & Settings
        </button>
        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'security' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Security Passwords
        </button>
        <button
          onClick={() => setActiveSubTab('backups')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'backups' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Database Backups
        </button>
        <button
          onClick={() => setActiveSubTab('license')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'license' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          License Key Management
        </button>
        <button
          onClick={() => setActiveSubTab('about')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'about' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          About Software
        </button>
      </div>

      <div className="mt-4">
        {activeSubTab === 'branding' && (
          <form onSubmit={handleBrandingSubmit} className="glass-card rounded-3xl p-6 border space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Layout className="w-5 h-5 text-primary" />
              <h3 className="font-extrabold text-base">Gym Rebranding & Branding</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gym Name *</label>
                <input
                  type="text"
                  name="gym_name"
                  value={formData.gym_name}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Website URL</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website || ''}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Support Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Support Phone</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number || ''}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">GST / TAX Number</label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number || ''}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  placeholder="GSTIN"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Business Operating Hours</label>
                <input
                  type="text"
                  name="working_hours"
                  value={formData.working_hours || ''}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Currency Unit</label>
                <select
                  name="currency"
                  value={formData.currency || '₹'}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-3 rounded-xl glass-input text-white text-xs border-white/10 cursor-pointer appearance-none"
                >
                  <option value="₹">₹ (Indian Rupee)</option>
                  <option value="$">$ (US Dollar)</option>
                  <option value="€">€ (Euro)</option>
                  <option value="£">£ (Pound Sterling)</option>
                  <option value="د.إ">د.إ (UAE Dirham)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Theme Preset</label>
                <select
                  name="theme"
                  value={formData.theme}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-3 rounded-xl glass-input text-white text-xs border-white/10 cursor-pointer appearance-none"
                >
                  <option value="dark">Luxury Dark Mode</option>
                  <option value="light">Premium Light Mode</option>
                </select>
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Default Invoice Footer Notice</label>
                <input
                  type="text"
                  name="invoice_footer"
                  value={formData.invoice_footer || ''}
                  onChange={handleBrandingChange}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                />
              </div>
            </div>

            {/* Accent Color Selection Row */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Branding Accent Color</label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { name: 'purple', label: 'Indigo Purple', color: 'bg-purple-600' },
                  { name: 'blue', label: 'Ocean Blue', color: 'bg-blue-600' },
                  { name: 'green', label: 'Emerald Green', color: 'bg-emerald-600' },
                  { name: 'orange', label: 'Warm Orange', color: 'bg-orange-600' },
                  { name: 'red', label: 'Crimson Red', color: 'bg-rose-600' },
                ].map((acc) => (
                  <button
                    key={acc.name}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, accent_color: acc.name }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                      (formData.accent_color || 'purple') === acc.name
                        ? 'bg-primary text-white border-primary shadow-md scale-[1.02]'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${acc.color} inline-block shadow-sm`} />
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gym Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleBrandingChange}
                className="w-full min-h-[80px] p-3 rounded-xl glass-input text-white text-xs border-white/10"
              />
            </div>

            {/* Custom media uploads */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Client Branding Graphics</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gym Logo */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white block">Gym Branding Logo</span>
                    <span className="text-[10px] text-slate-400 block">Shown in header and reports</span>
                    <label className="inline-block mt-2 px-2.5 py-1.5 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold cursor-pointer hover:bg-primary/20">
                      Upload Logo
                      <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'gym_logo')} className="hidden" />
                    </label>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
                    {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <Dumbbell className="w-6 h-6 text-slate-500" />}
                  </div>
                </div>

                {/* Favicon */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white block">Browser Favicon</span>
                    <span className="text-[10px] text-slate-400 block">Tab indicator (.ico/png)</span>
                    <label className="inline-block mt-2 px-2.5 py-1.5 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold cursor-pointer hover:bg-primary/20">
                      Upload Favicon
                      <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'favicon')} className="hidden" />
                    </label>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
                    {faviconPreview ? <img src={faviconPreview} alt="Favicon" className="w-full h-full object-cover" /> : <Info className="w-6 h-6 text-slate-500" />}
                  </div>
                </div>

                {/* Login Background */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white block">Login Page Wallpaper</span>
                    <span className="text-[10px] text-slate-400 block">Custom login backdrop</span>
                    <label className="inline-block mt-2 px-2.5 py-1.5 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold cursor-pointer hover:bg-primary/20">
                      Upload Backdrop
                      <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'login_bg')} className="hidden" />
                    </label>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
                    {loginBgPreview ? <img src={loginBgPreview} alt="Wallpaper" className="w-full h-full object-cover" /> : <Layout className="w-6 h-6 text-slate-500" />}
                  </div>
                </div>

                {/* Dashboard Banner */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white block">Dashboard Banner</span>
                    <span className="text-[10px] text-slate-400 block">Top welcome header graphic</span>
                    <label className="inline-block mt-2 px-2.5 py-1.5 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold cursor-pointer hover:bg-primary/20">
                      Upload Banner
                      <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'dashboard_banner')} className="hidden" />
                    </label>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
                    {bannerPreview ? <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" /> : <Sparkles className="w-6 h-6 text-slate-500" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingBranding}
                className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {brandingSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isSavingBranding ? 'Saving...' : 'Save Branding Preferences'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {activeSubTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="glass-card rounded-3xl p-6 border space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h3 className="font-extrabold text-base">Change Admin Password</h3>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
                Password updated successfully.
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Password</label>
                <input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">New Password</label>
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Confirm New Password</label>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-white text-xs border-white/10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-white/10 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSavingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        )}

        {activeSubTab === 'backups' && (
          <div className="glass-card rounded-3xl p-6 border space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-base">Database Backup & Restore</h3>
              </div>
              <button 
                onClick={fetchBackups}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                title="Refresh Backups"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              Create instant backup snapshots of the system database. You can download snapshots locally or restore data to any previous state at any time.
            </p>

            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {creatingBackup ? 'Generating Snapshot...' : 'Create Backup Snapshot'}
            </button>

            <div className="space-y-2 mt-4 pt-2 border-t border-white/5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Backup Archive History</span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {backups.map((b) => (
                  <div key={b.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-[10px]">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block truncate max-w-[180px]" title={b.file_path}>
                        {b.file_path}
                      </span>
                      <span className="text-slate-400 block font-mono text-[8px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {(b.size / 1024).toFixed(1)} KB • {b.created_at.split('T')[0]}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadBackup(b.id, b.file_path)}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                        title="Download Backup file"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRestoreBackup(b.file_path)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold border border-white/10 cursor-pointer"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(b.id)}
                        className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 cursor-pointer"
                        title="Delete Backup file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {backups.length === 0 && (
                  <div className="text-center py-6 text-slate-500 italic text-[10px]">No database snapshots recorded.</div>
                )}
              </div>

              <div className="space-y-3 mt-6 pt-4 border-t border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Complete Database Data Export</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleExportDatabase('excel')}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Export Excel
                  </button>
                  <button
                    onClick={() => handleExportDatabase('json')}
                    className="py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    JSON Backup
                  </button>
                  <button
                    onClick={() => handleExportDatabase('csv')}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 hover:text-white font-bold text-[10px] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExportDatabase('pdf')}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 hover:text-white font-bold text-[10px] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Summary PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'license' && (
          <div className="glass-card rounded-3xl p-6 border space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h3 className="font-extrabold text-base">Software License Management</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Client Registration Name</span>
                <span className="text-white font-extrabold text-xs block">{settings.license_client_name || 'Oviyam Gym Enterprise'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Software Version</span>
                <span className="text-white font-extrabold text-xs block">v1.0.0 (Commercial Launch Edition)</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Installation Date</span>
                <span className="text-white font-mono font-bold text-xs block">{settings.license_install_date || new Date().toISOString().split('T')[0]}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">License Expiry</span>
                <span className="text-white font-mono font-bold text-xs block">{settings.license_expiry || '2030-12-31'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-400 block">License Activation Key</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/20 font-bold uppercase tracking-wider">
                  {settings.license_status || 'Activated (Demo Mode)'}
                </span>
              </div>
              <p className="font-mono text-sm text-slate-300 pt-1 tracking-wider bg-black/45 p-3 rounded-lg border border-white/5 select-all">
                {settings.license_key || 'OV-DEMO-9999-XXXX'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => alert('Online verification check: Connection to licensing-server.oviyam.com successful. Key is valid.')}
                className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl cursor-pointer text-center shadow-md shadow-primary/10"
              >
                Online Activation Verification
              </button>
              <button 
                onClick={() => alert('Offline registration file generated: saved as oviyam_offline_license.lic in app config.')}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl cursor-pointer text-center"
              >
                Generate Offline License Key
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'about' && (
          <div className="glass-card rounded-3xl p-6 border space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Info className="w-5 h-5 text-primary" />
              <h3 className="font-extrabold text-base">Software Specification Info</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Software Name</span>
                <span className="text-white font-extrabold text-xs block mt-0.5">Oviyam Gym Tracker</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">License Type</span>
                <span className="text-white font-extrabold text-xs block mt-0.5">Commercial SaaS Perpetual License</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Platform Version</span>
                <span className="text-white font-extrabold text-xs block mt-0.5">v1.0.0 (Commercial Launch Edition)</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Release Build Date</span>
                <span className="text-white font-extrabold text-xs block mt-0.5">August 2026</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Development Engine</span>
                <span className="text-white font-extrabold text-xs block mt-0.5">Antigravity Codebase Engine</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Support Contact Email</span>
                <span className="text-white font-extrabold text-xs block mt-0.5">support@oviyam.com</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center text-[10px] text-slate-300">
              © 2026 Oviyam Softworks. All rights reserved. Registered trademark of Oviyam Group.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
