import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const isPostgres = process.env.DATABASE_URL ? true : false;
const dbDir = path.join(process.cwd(), 'data');

// GET /api/system/health - Get platform status specifications (Protected)
router.get('/health', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let dbSize = 0;
    if (!isPostgres) {
      const dbPath = path.join(dbDir, 'gym.db');
      if (fs.existsSync(dbPath)) {
        dbSize = fs.statSync(dbPath).size;
      }
    }

    // Query backup count
    const backupResult = await query('SELECT COUNT(*) as count, MAX(created_at) as last_backup FROM backup_metadata');
    const backupsCount = parseInt(backupResult[0]?.count || backupResult[0]?.['COUNT(*)'] || '0');
    const lastBackupDate = backupResult[0]?.last_backup || 'N/A';

    // Query active sessions (count of logins in activity logs last 24h)
    const today = new Date().toISOString().split('T')[0];
    const sessionsResult = await query(
      "SELECT COUNT(DISTINCT user_identity) as count FROM activity_logs WHERE recorded_date = $1 AND action = 'Logged in successfully'",
      [today]
    );
    const activeSessions = parseInt(sessionsResult[0]?.count || sessionsResult[0]?.['COUNT(*)'] || '1');

    // Query last log audit
    const lastAudit = await query('SELECT user_identity, recorded_date, recorded_time FROM activity_logs ORDER BY id DESC LIMIT 1');
    const lastLoginUser = lastAudit.length > 0 
      ? `${lastAudit[0].user_identity} (${lastAudit[0].recorded_date} ${lastAudit[0].recorded_time})`
      : 'N/A';

    return res.json({
      databaseStatus: 'Healthy',
      databaseType: isPostgres ? 'PostgreSQL (Cloud)' : 'SQLite (Local File)',
      storageUsage: dbSize > 0 ? `${(dbSize / 1024).toFixed(1)} KB` : 'Cloud Managed',
      backupStatus: backupsCount > 0 ? `Active (${backupsCount} backups on disk)` : 'None Created',
      lastBackupDate,
      lastLogin: lastLoginUser,
      softwareVersion: 'v1.0.0 (Commercial Launch Edition)',
      serverTime: new Date().toISOString(),
      activeSessions: activeSessions > 0 ? activeSessions : 1
    });

  } catch (error) {
    console.error('System health check error:', error);
    return res.status(500).json({ error: 'System Health statistics lookup failed' });
  }
});

export default router;
