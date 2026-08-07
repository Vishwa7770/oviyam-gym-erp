import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const isPostgres = process.env.DATABASE_URL ? true : false;

// Generate unique invoice number: INV-YYYYMMDD-XXXX
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const countRes = await query("SELECT COUNT(*) AS count FROM payments WHERE invoice_number LIKE $1", [`INV-${dateStr}-%`]);
  const count = parseInt(countRes[0]?.count || countRes[0]?.['COUNT(*)'] || '0');
  const sequence = String(count + 1).padStart(4, '0');

  return `INV-${dateStr}-${sequence}`;
}

// ----------------- membership_plans CRUD -----------------

// GET /api/memberships/plans - List all membership plans (Protected)
router.get('/plans', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await query('SELECT * FROM membership_plans ORDER BY status ASC, id DESC');
    return res.json(plans);
  } catch (error) {
    console.error('Fetch membership plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch membership plans' });
  }
});

// POST /api/memberships/plans - Create a membership plan (Protected, Admin Only)
router.post('/plans', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan_name, duration, price, description, status } = req.body;

    if (!plan_name || !duration || price === undefined) {
      return res.status(400).json({ error: 'Plan name, duration, and price are required.' });
    }

    let insertedId: number | null = null;
    if (isPostgres) {
      const result = await query(
        `INSERT INTO membership_plans (plan_name, duration, price, description, status) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [plan_name.trim(), duration, parseFloat(String(price)), description || '', status || 'Active']
      );
      insertedId = result[0]?.id || null;
    } else {
      await query(
        `INSERT INTO membership_plans (plan_name, duration, price, description, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        [plan_name.trim(), duration, parseFloat(String(price)), description || '', status || 'Active']
      );
      const rowidRes = await query('SELECT last_insert_rowid() AS id');
      insertedId = rowidRes[0]?.id || null;
    }

    return res.status(201).json({ message: 'Plan created successfully', planId: insertedId });
  } catch (error) {
    console.error('Create plan error:', error);
    return res.status(500).json({ error: 'Failed to create membership plan' });
  }
});

// PUT /api/memberships/plans/:id - Update membership plan (Protected, Admin Only)
router.put('/plans/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { plan_name, duration, price, description, status } = req.body;

    if (!plan_name || !duration || price === undefined) {
      return res.status(400).json({ error: 'Plan name, duration, and price are required.' });
    }

    await query(
      `UPDATE membership_plans 
       SET plan_name = $1, duration = $2, price = $3, description = $4, status = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6`,
      [plan_name.trim(), duration, parseFloat(String(price)), description || '', status || 'Active', id]
    );

    return res.json({ message: 'Plan updated successfully' });
  } catch (error) {
    console.error('Update plan error:', error);
    return res.status(500).json({ error: 'Failed to update membership plan' });
  }
});

// DELETE /api/memberships/plans/:id - Delete membership plan (Protected, Admin Only)
router.delete('/plans/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM membership_plans WHERE id = $1', [id]);
    return res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    return res.status(500).json({ error: 'Failed to delete membership plan' });
  }
});

// ----------------- Renewal workflow -----------------

// GET /api/memberships/history/:memberId - Fetch subscription history for a member
router.get('/history/:memberId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const history = await query(
      `SELECT mh.*, mp.plan_name, mp.duration 
       FROM member_memberships mh
       LEFT JOIN membership_plans mp ON mh.plan_id = mp.id
       WHERE mh.member_id = $1 
       ORDER BY mh.id DESC`,
      [memberId]
    );
    return res.json(history);
  } catch (error) {
    console.error('Fetch membership history error:', error);
    return res.status(500).json({ error: 'Failed to fetch membership history' });
  }
});

// POST /api/memberships/renew - Renew member membership (Protected, Admin Only)
router.post('/renew', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { member_id, plan_id, start_date, end_date, price, discount, amount_paid, payment_mode, remarks } = req.body;

    if (!member_id || !plan_id || !start_date || !end_date || price === undefined || amount_paid === undefined || !payment_mode) {
      return res.status(400).json({ error: 'Missing required renewal parameters.' });
    }

    // 1. Expire all previous memberships for this member
    await query("UPDATE member_memberships SET status = 'Expired' WHERE member_id = $1", [member_id]);

    // 2. Insert new membership record
    let newMembershipId: number | null = null;
    if (isPostgres) {
      const resMembership = await query(
        `INSERT INTO member_memberships (member_id, plan_id, start_date, end_date, price, status) 
         VALUES ($1, $2, $3, $4, $5, 'Active') RETURNING id`,
        [member_id, plan_id, start_date, end_date, parseFloat(String(price))]
      );
      newMembershipId = resMembership[0]?.id || null;
    } else {
      await query(
        `INSERT INTO member_memberships (member_id, plan_id, start_date, end_date, price, status) 
         VALUES ($1, $2, $3, $4, $5, 'Active')`,
        [member_id, plan_id, start_date, end_date, parseFloat(String(price))]
      );
      const rowidRes = await query('SELECT last_insert_rowid() AS id');
      newMembershipId = rowidRes[0]?.id || null;
    }

    if (!newMembershipId) throw new Error("Failed to insert member membership");

    // Fetch plan details to sync members table
    const planRes = await query('SELECT plan_name, duration FROM membership_plans WHERE id = $1', [plan_id]);
    const planName = planRes[0]?.plan_name || 'Custom Plan';
    const planDuration = planRes[0]?.duration || 'Custom';

    // 3. Update members main record
    await query(
      `UPDATE members 
       SET active_membership_id = $1, 
           membership_plan = $2, 
           membership_duration = $3, 
           membership_expiry_date = $4,
           status = 'Active'
       WHERE member_id = $5`,
      [newMembershipId, planName, planDuration, end_date, member_id]
    );

    // 4. Calculate pricing, discount and payment status
    const itemPrice = parseFloat(String(price));
    const itemDiscount = parseFloat(String(discount || 0));
    const finalAmount = Math.max(0, itemPrice - itemDiscount);
    const paidAmount = parseFloat(String(amount_paid));
    const pendingAmount = Math.max(0, finalAmount - paidAmount);

    let paymentStatus = 'Paid';
    if (paidAmount === 0) {
      paymentStatus = 'Pending';
    } else if (pendingAmount > 0) {
      paymentStatus = 'Partial';
    }

    const invoiceNumber = await generateInvoiceNumber();
    const todayStr = new Date().toISOString().split('T')[0];

    // 5. Insert payment invoice record
    await query(
      `INSERT INTO payments (
        invoice_number, member_id, membership_id, amount, discount, final_amount, paid_amount, pending_amount, 
        payment_date, payment_mode, payment_status, transaction_id, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        invoiceNumber,
        member_id,
        newMembershipId,
        itemPrice,
        itemDiscount,
        finalAmount,
        paidAmount,
        pendingAmount,
        todayStr,
        payment_mode,
        paymentStatus,
        req.body.transaction_id || '',
        remarks || ''
      ]
    );

    return res.status(201).json({
      message: 'Membership renewed successfully',
      membershipId: newMembershipId,
      invoiceNumber
    });

  } catch (error) {
    console.error('Renew membership error:', error);
    return res.status(500).json({ error: 'Failed to renew membership' });
  }
});

export default router;
