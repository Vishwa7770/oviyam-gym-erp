import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  CreditCard, Search, Calendar, Filter, TrendingUp, DollarSign, 
  Award, Activity, Printer, Download, Eye, FileText, CheckCircle, AlertCircle, ArrowUpRight,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PaymentRecord {
  id: number;
  invoice_number: string;
  member_id: string;
  full_name: string;
  mobile_number: string;
  plan_name: string;
  amount: number;
  discount: number;
  final_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_date: string;
  payment_mode: string;
  payment_status: 'Paid' | 'Pending' | 'Partial';
  transaction_id: string;
  remarks: string;
}

interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  pendingPaymentsSum: number;
  totalSales: number;
  mostPopularPlan: string;
  revenueChart: { month: string; revenue: number }[];
  membershipDistribution: { name: string; value: number }[];
}

export const Payments: React.FC = () => {
  const { settings } = useGym();
  
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    monthlyRevenue: 0,
    pendingPaymentsSum: 0,
    totalSales: 0,
    mostPopularPlan: 'N/A',
    revenueChart: [],
    membershipDistribution: []
  });

  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    start_date: '',
    end_date: ''
  });

  const [loading, setLoading] = useState(true);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<PaymentRecord | null>(null);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status !== 'All') queryParams.append('status', filters.status);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const res = await fetch(`${API_BASE}/payments?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/payments/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPayments(), fetchStats()]).finally(() => setLoading(false));
  }, [filters]);

  const handleExportExcel = () => {
    const dataToExport = payments.map(p => ({
      'Invoice Number': p.invoice_number,
      'Client Name': p.full_name,
      'Mobile Number': p.mobile_number,
      'Membership Plan': p.plan_name,
      'Base Price': p.amount,
      'Discount Applied': p.discount,
      'Final Amount': p.final_amount,
      'Paid Amount': p.paid_amount,
      'Pending Dues': p.pending_amount,
      'Payment Date': p.payment_date,
      'Payment Mode': p.payment_mode,
      'Status': p.payment_status,
      'Transaction ID': p.transaction_id || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger Transactions');
    XLSX.writeFile(workbook, `ledger_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintInvoice = (invoice: PaymentRecord) => {
    setActiveInvoice(invoice);
    setShowInvoicePreview(true);
  };

  const triggerBrowserPrint = () => {
    const printContent = document.getElementById('printable-invoice-area');
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    // Reload page to restore react states
    window.location.reload();
  };

  const COLORS = ['#8884d8', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Payments & Ledger</h2>
          <p className="text-muted-foreground text-sm mt-1">Monitor gym finances, generate invoice receipts, and check revenue performance.</p>
        </div>

        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/95 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Ledger (Excel)
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Today's Revenue", value: `₹${stats.todayRevenue.toLocaleString()}`, desc: "Cash/UPI collected today", icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/10" },
          { title: "Monthly Revenue", value: `₹${stats.monthlyRevenue.toLocaleString()}`, desc: "Collected in current month", icon: TrendingUp, color: "text-primary bg-primary/10 border-primary/20" },
          { title: "Pending Dues", value: `₹${stats.pendingPaymentsSum.toLocaleString()}`, desc: "Total unpaid client balances", icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/10" },
          { title: "Most Popular Plan", value: stats.mostPopularPlan, desc: "Highest subscriber join count", icon: Award, color: "text-amber-500 bg-amber-500/10 border-amber-500/10" }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card rounded-3xl p-6 border flex items-center justify-between shadow-premium relative overflow-hidden hover:translate-y-[-2px] transition-all">
              <div className="space-y-1 max-w-[70%]">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">{kpi.title}</span>
                <span className="text-xl font-black text-foreground/90 truncate block">{kpi.value}</span>
                <span className="text-[9px] text-slate-400 block truncate">{kpi.desc}</span>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recharts Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 border space-y-4">
          <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Revenue Growth Trend (Past 6 Months)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 17, 26, 0.95)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff'
                  }} 
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Membership Distribution Pie Chart */}
        <div className="glass-card rounded-3xl p-6 border space-y-4">
          <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Membership Sales Shares
          </h3>
          <div className="h-64 w-full flex flex-col justify-between items-center">
            {stats.membershipDistribution.length > 0 ? (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.membershipDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.membershipDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-[10px] font-bold">
                  {stats.membershipDistribution.map((entry, index) => (
                    <span key={entry.name} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {entry.name}: {entry.value}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                No active plan distribution metrics.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Ledger Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Ledger Transaction Logs ({payments.length})
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice or client..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full sm:w-60 h-10 pl-10 pr-4 rounded-xl glass-input text-xs"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="h-10 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10"
            >
              <option value="All">All Invoices</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial Dues</option>
              <option value="Pending">Pending</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="h-10 px-2 rounded-xl glass-input font-bold"
              />
              <span>to</span>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="h-10 px-2 rounded-xl glass-input font-bold"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel border rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase text-muted-foreground tracking-wider bg-black/5 dark:bg-white/2">
                <th className="p-4 pl-6">Billing Client</th>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Plan Name</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Pending</th>
                <th className="p-4">Method</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/2 dark:hover:bg-white/2 text-xs">
                  <td className="p-4 pl-6 font-bold text-foreground/90">{p.full_name}</td>
                  <td className="p-4 font-mono font-bold text-muted-foreground text-[11px]">{p.invoice_number}</td>
                  <td className="p-4 font-mono font-semibold">{p.payment_date}</td>
                  <td className="p-4 font-semibold">{p.plan_name || 'Legacy Plan'}</td>
                  <td className="p-4 text-right font-semibold">₹{Number(p.final_amount).toFixed(2)}</td>
                  <td className="p-4 text-right font-black text-emerald-500">₹{Number(p.paid_amount).toFixed(2)}</td>
                  <td className="p-4 text-right font-bold text-red-500">₹{Number(p.pending_amount).toFixed(2)}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-white/10 font-bold uppercase text-[9px] tracking-wide">
                      {p.payment_mode}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                      p.payment_status === 'Paid' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : p.payment_status === 'Partial'
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <button
                      onClick={() => handlePrintInvoice(p)}
                      className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer"
                      title="View Invoice"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    No ledger transactions matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Receipt Modal Preview for Printing */}
      {showInvoicePreview && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white text-slate-900 border rounded-3xl p-8 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setShowInvoicePreview(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Print Area Container */}
            <div id="printable-invoice-area" className="p-4 space-y-6">
              <div className="flex justify-between items-start border-b pb-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black uppercase tracking-wider text-slate-800">{settings.gym_name}</h1>
                  <p className="text-[10px] text-slate-500 leading-normal">{settings.address || 'Gym Building Road, Chennai'}</p>
                  <p className="text-[10px] text-slate-500">Phone: {settings.phone_number || '9345895731'} | Email: {settings.email || 'support@gym.com'}</p>
                  {settings.gst_number && <p className="text-[9px] text-slate-600 font-bold mt-1">GSTIN: {settings.gst_number}</p>}
                </div>
                <div className="text-right space-y-1">
                  <span className="px-3 py-1 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[9px] tracking-widest">INVOICE RECEIPT</span>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-2">{activeInvoice.invoice_number}</p>
                  <p className="text-[10px] text-slate-500">Date: {activeInvoice.payment_date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Billed To (Member)</span>
                  <span className="font-extrabold text-sm text-slate-800 block">{activeInvoice.full_name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {activeInvoice.member_id}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">Mob: {activeInvoice.mobile_number}</span>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Billing Info</span>
                  <span className="font-bold text-slate-800 block">{activeInvoice.plan_name || 'Legacy Plan'}</span>
                  <span className="text-[10px] text-slate-500 block">Payment Mode: {activeInvoice.payment_mode}</span>
                  <span className="text-[10px] text-slate-500 block truncate">Txn ID: {activeInvoice.transaction_id || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase block border-b pb-1">Billing Summary</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Price:</span>
                    <span className="font-semibold">{settings.currency || '₹'}{Number(activeInvoice.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Discount Applied:</span>
                    <span className="font-bold text-red-500">-{settings.currency || '₹'}{Number(activeInvoice.discount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-sm">
                    <span>Final Payable Amount:</span>
                    <span>{settings.currency || '₹'}{Number(activeInvoice.final_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-600 text-sm">
                    <span>Total Amount Paid:</span>
                    <span>{settings.currency || '₹'}{Number(activeInvoice.paid_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-red-500">
                    <span>Dues Balance Pending:</span>
                    <span>{settings.currency || '₹'}{Number(activeInvoice.pending_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {activeInvoice.remarks && (
                <div className="text-[10px] text-slate-500 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold block">Remarks:</span>
                  {activeInvoice.remarks}
                </div>
              )}

              {settings.invoice_footer && (
                <div className="text-[9px] text-slate-500 text-center italic pt-2">
                  {settings.invoice_footer}
                </div>
              )}

              {/* QR Code Placeholder and Sign */}
              <div className="flex justify-between items-end pt-6 border-t">
                <div className="text-center space-y-1 border p-2 rounded-xl bg-slate-50">
                  <div className="w-16 h-16 bg-slate-200 flex items-center justify-center rounded-lg border border-slate-300">
                    <span className="text-[8px] font-black text-slate-500 tracking-tighter uppercase">QR CODE</span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono block">Scan for confirmation</span>
                </div>
                <div className="text-center w-36 border-t border-slate-400 pt-1 text-slate-700 text-[10px]">
                  <span className="font-bold uppercase tracking-wider block">Authorized Sign</span>
                  <span className="text-[8px] text-slate-400 font-mono">{settings.gym_name}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={triggerBrowserPrint}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
