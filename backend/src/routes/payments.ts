import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/payments - Fetch payment list with filters (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCounter = 1;

    if (search && String(search).trim() !== '') {
      whereClause += ` AND (p.invoice_number LIKE $${paramCounter} OR m.full_name LIKE $${paramCounter} OR m.mobile_number LIKE $${paramCounter} OR m.member_id LIKE $${paramCounter})`;
      params.push(`%${String(search).trim()}%`);
      paramCounter++;
    }

    if (status && String(status) !== 'All') {
      whereClause += ` AND p.payment_status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (start_date && String(start_date).trim() !== '') {
      whereClause += ` AND p.payment_date >= $${paramCounter}`;
      params.push(start_date);
      paramCounter++;
    }

    if (end_date && String(end_date).trim() !== '') {
      whereClause += ` AND p.payment_date <= $${paramCounter}`;
      params.push(end_date);
      paramCounter++;
    }

    const paymentsList = await query(
      `SELECT p.*, m.full_name, m.mobile_number, m.member_id, mp.plan_name 
       FROM payments p
       JOIN members m ON p.member_id = m.member_id
       LEFT JOIN member_memberships mm ON p.membership_id = mm.id
       LEFT JOIN membership_plans mp ON mm.plan_id = mp.id
       ${whereClause}
       ORDER BY p.id DESC`,
      params
    );

    return res.json(paymentsList);
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({ error: 'Failed to fetch payment records' });
  }
});

// GET /api/payments/pending - Fetch members with outstanding balances (Protected)
router.get('/pending', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingList = await query(
      `SELECT p.*, m.full_name, m.mobile_number, m.member_id, mp.plan_name, mm.end_date as due_date
       FROM payments p
       JOIN members m ON p.member_id = m.member_id
       LEFT JOIN member_memberships mm ON p.membership_id = mm.id
       LEFT JOIN membership_plans mp ON mm.plan_id = mp.id
       WHERE p.pending_amount > 0
       ORDER BY mm.end_date ASC, p.id DESC`
    );
    return res.json(pendingList);
  } catch (error) {
    console.error('Fetch pending payments error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending dues' });
  }
});

// GET /api/payments/dashboard - Payments dashboard analytics summary (Protected)
router.get('/dashboard', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    // 1. Today's Revenue
    const todayRes = await query(
      "SELECT SUM(paid_amount) AS total FROM payments WHERE payment_date = $1",
      [todayStr]
    );
    const todayRevenue = parseFloat(todayRes[0]?.total || todayRes[0]?.['total'] || '0');

    // 2. Monthly Revenue
    const monthlyRes = await query(
      "SELECT SUM(paid_amount) AS total FROM payments WHERE payment_date LIKE $1",
      [`${currentMonthPrefix}-%`]
    );
    const monthlyRevenue = parseFloat(monthlyRes[0]?.total || monthlyRes[0]?.['total'] || '0');

    // 3. Pending Payments sum
    const pendingSumRes = await query(
      "SELECT SUM(pending_amount) AS total FROM payments WHERE pending_amount > 0"
    );
    const pendingPaymentsSum = parseFloat(pendingSumRes[0]?.total || pendingSumRes[0]?.['total'] || '0');

    // 4. Total membership sales
    const totalSalesRes = await query("SELECT COUNT(*) AS count FROM payments");
    const totalSales = parseInt(totalSalesRes[0]?.count || totalSalesRes[0]?.['COUNT(*)'] || '0');

    // 5. Most Popular Plan
    const popularRes = await query(
      `SELECT membership_plan AS plan_name, COUNT(*) AS count 
       FROM members 
       WHERE membership_plan != '' AND membership_plan IS NOT NULL 
       GROUP BY membership_plan 
       ORDER BY count DESC LIMIT 1`
    );
    const mostPopularPlan = popularRes[0]?.plan_name || 'N/A';

    // 6. Revenue Chart Data (past 6 months)
    const now = new Date();
    const monthsList: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsList.push({ label, key, revenue: 0 });
    }

    const allPayments = await query('SELECT payment_date, paid_amount FROM payments');
    allPayments.forEach((p: any) => {
      const dateStr = String(p.payment_date);
      const yearMonth = dateStr.substring(0, 7);
      const matched = monthsList.find(m => m.key === yearMonth);
      if (matched) {
        matched.revenue += parseFloat(p.paid_amount || 0);
      }
    });

    const revenueChart = monthsList.map(m => ({
      month: m.label,
      revenue: parseFloat(m.revenue.toFixed(2))
    }));

    // 7. Membership Distribution
    const distribution = await query(
      `SELECT membership_plan AS name, COUNT(*) AS value 
       FROM members 
       WHERE status = 'Active' AND membership_plan != '' AND membership_plan IS NOT NULL 
       GROUP BY membership_plan`
    );

    return res.json({
      todayRevenue,
      monthlyRevenue,
      pendingPaymentsSum,
      totalSales,
      mostPopularPlan,
      revenueChart,
      membershipDistribution: distribution
    });

  } catch (error) {
    console.error('Fetch payments dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments analytics dashboard' });
  }
});

// POST /api/payments/collect - Pay off outstanding dues for an invoice (Protected, Admin Only)
router.post('/collect', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoice_number, paid_amount, payment_mode, transaction_id, remarks } = req.body;

    if (!invoice_number || paid_amount === undefined || !payment_mode) {
      return res.status(400).json({ error: 'Invoice number, collection amount, and payment mode are required.' });
    }

    const paymentRes = await query("SELECT * FROM payments WHERE invoice_number = $1", [invoice_number]);
    if (paymentRes.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const payment = paymentRes[0];
    const prevPaid = parseFloat(payment.paid_amount);
    const prevPending = parseFloat(payment.pending_amount);
    const collectAmount = parseFloat(String(paid_amount));

    if (collectAmount <= 0) {
      return res.status(400).json({ error: 'Collection amount must be greater than zero.' });
    }

    if (collectAmount > prevPending) {
      return res.status(400).json({ error: `Collection amount exceeds pending due of ${prevPending}` });
    }

    const newPaid = prevPaid + collectAmount;
    const newPending = Math.max(0, prevPending - collectAmount);
    const newStatus = newPending === 0 ? 'Paid' : 'Partial';

    const appendRemarks = remarks 
      ? (payment.remarks ? `${payment.remarks} | Collection: ${remarks}` : `Collection: ${remarks}`)
      : payment.remarks;

    await query(
      `UPDATE payments 
       SET paid_amount = $1, pending_amount = $2, payment_status = $3, transaction_id = $4, remarks = $5 
       WHERE invoice_number = $6`,
      [newPaid, newPending, newStatus, transaction_id || payment.transaction_id || '', appendRemarks || '', invoice_number]
    );

    return res.json({
      message: 'Payment collection logged successfully',
      invoice_number,
      paid_amount: newPaid,
      pending_amount: newPending,
      payment_status: newStatus
    });

  } catch (error) {
    console.error('Collect dues error:', error);
    return res.status(500).json({ error: 'Failed to record payment collection' });
  }
});

export default router;
