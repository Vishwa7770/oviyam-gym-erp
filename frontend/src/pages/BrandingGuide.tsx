import React, { useState } from 'react';
import { 
  BookOpen, HelpCircle, HardDrive, Key, 
  Terminal, ShieldCheck, FileText, ChevronRight,
  Play, MessageSquare, Bug, Phone, Mail, Award
} from 'lucide-react';

export const BrandingGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quick' | 'admin' | 'trainer' | 'backup' | 'install' | 'faq' | 'support'>('quick');

  // Support states
  const [bugDesc, setBugDesc] = useState('');
  const [bugSeverity, setBugSeverity] = useState('Low');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  const [featTitle, setFeatTitle] = useState('');
  const [featDesc, setFeatDesc] = useState('');
  const [featSubmitted, setFeatSubmitted] = useState(false);

  const handleBugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDesc.trim()) return;
    setBugSubmitted(true);
    setTimeout(() => {
      setBugSubmitted(false);
      setBugDesc('');
    }, 3000);
  };

  const handleFeatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featTitle.trim()) return;
    setFeatSubmitted(true);
    setTimeout(() => {
      setFeatSubmitted(false);
      setFeatTitle('');
      setFeatDesc('');
    }, 3000);
  };

  const menu = [
    { id: 'quick', label: 'Quick Start Guide', icon: BookOpen },
    { id: 'admin', label: 'Administrator Manual', icon: ShieldCheck },
    { id: 'trainer', label: 'Trainer Coach Manual', icon: Key },
    { id: 'backup', label: 'Backup & Recovery Guide', icon: HardDrive },
    { id: 'install', label: 'Installation System Guide', icon: Terminal },
    { id: 'faq', label: 'Frequently Asked Questions', icon: HelpCircle },
    { id: 'support', label: 'Customer Support Hub', icon: MessageSquare }
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs text-white">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Help & Documentation Center</h2>
        <p className="text-slate-400 text-xs mt-1">
          Explore configuration settings, user manuals, and recovery guides for the Gym Tracker platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column Navigation Tabs */}
        <div className="md:col-span-1 space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            );
          })}
        </div>

        {/* Right Column Content View */}
        <div className="md:col-span-3 glass-card rounded-3xl p-6 border space-y-6">
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-base font-extrabold flex items-center gap-1.5 text-primary">
                  <BookOpen className="w-5 h-5" />
                  Quick Start Guide
                </h3>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Welcome to the Gym Tracker platform! This platform helps you run your gym operations, handle client registrations, track monthly payments, log daily attendance, and build custom diets.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-white block mb-1">1. Set Up Your Gym Info</span>
                  <span className="text-slate-400">Navigate to <strong>Settings</strong> to customize your gym name, logo branding, working hours, and billing currency prefix.</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-white block mb-1">2. Add Membership Tiers</span>
                  <span className="text-slate-400">Add options like Monthly, 3-Months, and Annual plans under the <strong>Memberships</strong> tab.</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-white block mb-1">3. Onboard Clients</span>
                  <span className="text-slate-400">Click <strong>Add Member</strong> to fill in details, assign a membership, select a trainer, and print an initial receipt.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-base font-extrabold flex items-center gap-1.5 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                  Administrator Manual
                </h3>
              </div>
              <p className="text-slate-300 leading-relaxed">
                As an Admin, you have unrestricted access to all modules, financial reporting databases, settings panels, backups, and trainer configurations.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                  <span className="font-bold text-white block">Key Admin Duties:</span>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                    <li>Create and edit Trainer coach credentials.</li>
                    <li>Audit administrative logs under the <strong>Activity Logs</strong> ledger.</li>
                    <li>Update client support phone lines and tax numbers.</li>
                    <li>Delete incorrect payment ledger entries.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trainer' && (
            <div className="space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-base font-extrabold flex items-center gap-1.5 text-primary">
                  <Key className="w-5 h-5" />
                  Trainer Coach Manual
                </h3>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Trainers can log in using their credentials (e.g. email, phone, or ID as username). Their view restricts billing/settings tabs to secure business financials.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                  <span className="font-bold text-white block">Key Trainer Duties:</span>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                    <li>Check-in client members using the <strong>Attendance</strong> checklist.</li>
                    <li>Create custom <strong>Workout Routines</strong> and <strong>Diet Plans</strong>.</li>
                    <li>Record client physical metrics (weight, body fat percentage) in member profiles to display progress curves.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-base font-extrabold flex items-center gap-1.5 text-primary">
                  <HardDrive className="w-5 h-5" />
                  Backup & Recovery Guide
                </h3>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Our system runs automated daily database snapshots to protect your records. You can also trigger manual backup snapshots anytime before performing system changes.
              </p>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
                <strong>WARNING:</strong> Reverting to a previous database snapshot will overwrite all current progress, check-ins, and invoices since the backup date. Perform restorations only in emergency cases.
              </div>
              <div className="space-y-2 text-slate-400">
                <span className="font-bold text-white block">How to restore database:</span>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <strong>Settings</strong> and find the <strong>Database Backup</strong> panel.</li>
                  <li>Click <strong>Restore</strong> next to your target backup.</li>
                  <li>Confirm the action in the browser dialog. The application will reload automatically.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-base font-extrabold flex items-center gap-1.5 text-primary">
                  <Terminal className="w-5 h-5" />
                  Installation System Guide
                </h3>
              </div>
              <p className="text-slate-300 leading-relaxed">
                The platform can run locally or be hosted on cloud servers (e.g. AWS, Heroku, DigitalOcean).
              </p>
              <div className="bg-black/45 p-4 rounded-xl font-mono text-[10px] text-slate-300 space-y-2 border border-white/5">
                <div>
                  <span className="text-primary"># 1. Install packages</span>
                  <br />npm install
                </div>
                <div>
                  <span className="text-primary"># 2. Configure environment variables (.env)</span>
                  <br />PORT=5000
                  <br />DATABASE_URL=postgres://user:pass@host/db  # Optional (Defaults to local SQLite)
                </div>
                <div>
                  <span className="text-primary"># 3. Launch Development Server</span>
                  <br />npm run dev
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-base font-extrabold flex items-center gap-1.5 text-primary">
                  <HelpCircle className="w-5 h-5" />
                  Frequently Asked Questions
                </h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="font-bold text-white block">Q: Can I change the currency symbol?</span>
                  <span className="text-slate-400">A: Yes, head to Settings and select your preferred symbol (₹, $, €, £) from the dropdown. It updates across all dashboards and invoices.</span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-white block">Q: What happens if a trainer forgets their password?</span>
                  <span className="text-slate-400">A: An administrator can reset any trainer's password by editing their profile under the <strong>Trainers</strong> page.</span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-white block">Q: Does the system notify me of expiring memberships?</span>
                  <span className="text-slate-400">A: Yes! The system alerts you via the top navigation bell for any memberships expiring within 7 days.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-base font-extrabold flex items-center gap-1.5 text-primary">
                  <MessageSquare className="w-5 h-5" />
                  Customer Support Hub
                </h3>
              </div>

              {/* Video Tutorial Placeholder */}
              <div className="space-y-2">
                <span className="font-bold text-white block">Video Tutorials & Walkthroughs</span>
                <div className="w-full h-44 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                  <div className="w-12 h-12 rounded-full bg-primary/20 group-hover:bg-primary/30 flex items-center justify-center text-primary cursor-pointer border border-primary/20 transition-all scale-100 group-hover:scale-105 shadow-md">
                    <Play className="w-5 h-5 fill-primary ml-0.5" />
                  </div>
                  <span className="text-[10px] text-slate-300 font-bold mt-3 block">Video Guide: Dashboard Overview</span>
                  <span className="text-[8px] text-slate-500 block">Duration: 4 mins • 1080p HD</span>
                </div>
              </div>

              {/* Forms side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Report Bug */}
                <form onSubmit={handleBugSubmit} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Bug className="w-4 h-4 text-primary" />
                    Report a Bug
                  </span>
                  
                  {bugSubmitted ? (
                    <div className="py-8 text-center text-emerald-400 font-bold">
                      ✔ Bug report submitted! Thank you.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold tracking-wide">Bug Severity</label>
                        <select 
                          value={bugSeverity} 
                          onChange={(e) => setBugSeverity(e.target.value)} 
                          className="w-full h-8 px-2.5 rounded glass-input text-white border-white/10"
                        >
                          <option value="Low">Low - Cosmetic Issue</option>
                          <option value="Medium">Medium - System Glitch</option>
                          <option value="High">High - Blocked Operation</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold tracking-wide">Description</label>
                        <textarea
                          placeholder="Describe what occurred and steps to reproduce..."
                          value={bugDesc}
                          onChange={(e) => setBugDesc(e.target.value)}
                          className="w-full h-20 p-2 rounded glass-input text-white border-white/10 text-[10px]"
                          required
                        />
                      </div>
                      <button type="submit" className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-bold rounded cursor-pointer">
                        Submit Bug Report
                      </button>
                    </>
                  )}
                </form>

                {/* Feature Request */}
                <form onSubmit={handleFeatSubmit} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Request a Feature
                  </span>

                  {featSubmitted ? (
                    <div className="py-8 text-center text-emerald-400 font-bold">
                      ✔ Feature request recorded!
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold tracking-wide">Feature Title</label>
                        <input
                          type="text"
                          placeholder="e.g. WhatsApp integration"
                          value={featTitle}
                          onChange={(e) => setFeatTitle(e.target.value)}
                          className="w-full h-8 px-2 rounded glass-input text-white border-white/10"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold tracking-wide">Details</label>
                        <textarea
                          placeholder="Explain how this feature would improve your workflows..."
                          value={featDesc}
                          onChange={(e) => setFeatDesc(e.target.value)}
                          className="w-full h-20 p-2 rounded glass-input text-white border-white/10 text-[10px]"
                        />
                      </div>
                      <button type="submit" className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-bold rounded cursor-pointer">
                        Submit Request
                      </button>
                    </>
                  )}
                </form>
              </div>

              {/* Support Contacts */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wide block">Call Support Desk</span>
                    <span className="font-bold text-white text-xs block mt-0.5">+91 9345895731</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wide block">Email Helpdesk</span>
                    <span className="font-bold text-white text-xs block mt-0.5">support@oviyam.com</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
