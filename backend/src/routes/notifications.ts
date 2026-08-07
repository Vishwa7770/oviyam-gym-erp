import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Scan engine to generate alerts dynamically
export async function scanAndGenerateNotifications() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Membership Expirations Checks
    const members = await query('SELECT member_id, full_name, membership_expiry_date, status, membership_plan, diet_plan_id FROM members');
    for (const m of members) {
      if (m.membership_expiry_date) {
        const expiry = new Date(m.membership_expiry_date);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0 && diffDays <= 7) {
          const msg = `Membership for ${m.full_name} (${m.member_id}) is expiring in ${diffDays} days (${m.membership_expiry_date}).`;
          const exists = await query('SELECT id FROM notifications WHERE message = $1 AND is_read = 0', [msg]);
          if (exists.length === 0) {
            await query("INSERT INTO notifications (type, message) VALUES ('Membership Expiring Soon', $1)", [msg]);
          }
        } else if (diffDays <= 0 && m.status === 'Active') {
          const msg = `Membership for ${m.full_name} (${m.member_id}) has expired on ${m.membership_expiry_date}.`;
          const exists = await query('SELECT id FROM notifications WHERE message = $1 AND is_read = 0', [msg]);
          if (exists.length === 0) {
            await query("INSERT INTO notifications (type, message) VALUES ('Membership Expired', $1)", [msg]);
          }
        }
      }

      // 2. Diet Plan Missing
      if (!m.diet_plan_id && m.status === 'Active') {
        const msg = `Diet meal plan is missing for active member ${m.full_name} (${m.member_id}).`;
        const exists = await query('SELECT id FROM notifications WHERE message = $1 AND is_read = 0', [msg]);
        if (exists.length === 0) {
          await query("INSERT INTO notifications (type, message) VALUES ('Diet Plan Missing', $1)", [msg]);
        }
      }
    }

    // 3. Payment Pending (Outstanding dues)
    const pendingPayments = await query(
      `SELECT p.invoice_number, p.pending_amount, m.full_name, p.member_id 
       FROM payments p 
       JOIN members m ON p.member_id = m.member_id 
       WHERE p.pending_amount > 0`
    );
    for (const p of pendingPayments) {
      const msg = `Outstanding dues of ₹${parseFloat(String(p.pending_amount)).toFixed(2)} pending for ${p.full_name} on Invoice ${p.invoice_number}.`;
      const exists = await query('SELECT id FROM notifications WHERE message = $1 AND is_read = 0', [msg]);
      if (exists.length === 0) {
        await query("INSERT INTO notifications (type, message) VALUES ('Payment Pending', $1)", [msg]);
      }
    }

    // 4. Member Absent for 7 Days
    const missingRes = await query(`
      SELECT m.member_id, m.full_name, MAX(a.recorded_date) as last_visit
      FROM members m
      JOIN attendance a ON m.member_id = a.member_id
      WHERE m.status = 'Active'
      GROUP BY m.member_id, m.full_name
    `);
    for (const r of missingRes) {
      if (r.last_visit) {
        const last = new Date(r.last_visit);
        const days = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 7) {
          const msg = `Member ${r.full_name} (${r.member_id}) has been absent for ${days} days. Last checked: ${r.last_visit}.`;
          const exists = await query('SELECT id FROM notifications WHERE message = $1 AND is_read = 0', [msg]);
          if (exists.length === 0) {
            await query("INSERT INTO notifications (type, message) VALUES ('Member Absent for 7 Days', $1)", [msg]);
          }
        }
      }
    }

  } catch (e) {
    console.error('Scan notification error:', e);
  }
}

// GET /api/notifications - List all notifications (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Run scan to capture latest issues
    await scanAndGenerateNotifications();

    const notifications = await query('SELECT * FROM notifications ORDER BY is_read ASC, id DESC LIMIT 100');
    return res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications list' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read (Protected)
router.put('/:id/read', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('UPDATE notifications SET is_read = 1 WHERE id = $1', [id]);
    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

// PUT /api/notifications/read-all - Mark all as read (Protected)
router.put('/read-all', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await query('UPDATE notifications SET is_read = 1');
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// DELETE /api/notifications/:id - Delete single notification (Protected)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM notifications WHERE id = $1', [id]);
    return res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// DELETE /api/notifications - Delete all notifications (Protected)
router.delete('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await query('DELETE FROM notifications');
    return res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    return res.status(500).json({ error: 'Failed to clear all notifications' });
  }
});

export default router;
