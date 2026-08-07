import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to log actions
export async function logActivity(userIdentity: string, action: string, module: string, ipAddress: string = '127.0.0.1') {
  try {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    await query(
      `INSERT INTO activity_logs (recorded_date, recorded_time, user_identity, action, module, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [today, time, userIdentity, action, module, ipAddress]
    );
  } catch (e) {
    console.error('Failed to log activity audit entry:', e);
  }
}

// GET /api/activity-logs - Retrieve logs history (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 500');
    return res.json(logs);
  } catch (error) {
    console.error('Fetch logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

export default router;
