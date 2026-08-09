import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query, closeDatabase, initDatabase } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from './activity_logs';

const router = Router();
const isPostgres = process.env.DATABASE_URL ? true : false;

// Helpers to get database folder
const dbDir = path.join(process.cwd(), 'data');
const backupsDir = path.join(dbDir, 'backups');

// Ensure backups folder exists
if (!isPostgres && !fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Auto trigger a daily database backup snapshot if last one is > 24 hours
async function autoTriggerDailyBackup() {
  try {
    if (isPostgres) return;
    const lastBackup = await query("SELECT created_at FROM backup_metadata ORDER BY id DESC LIMIT 1");
    if (lastBackup.length > 0) {
      const lastDate = new Date(lastBackup[0].created_at);
      const diffHours = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        return; // Up to date
      }
    }
    const dbPath = path.join(dbDir, 'gym.db');
    if (fs.existsSync(dbPath)) {
      const now = new Date();
      const stamp = now.toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
      const backupName = `auto_backup_${stamp}.db`;
      const backupPath = path.join(backupsDir, backupName);
      fs.copyFileSync(dbPath, backupPath);
      const stats = fs.statSync(backupPath);
      await query(
        `INSERT INTO backup_metadata (file_path, size, status) VALUES ($1, $2, 'Success')`,
        [backupName, stats.size]
      );
      await logActivity('System', `Auto Daily Backup ${backupName}`, 'System');
    }
  } catch (e) {
    console.error('Auto daily backup trigger failed:', e);
  }
}

// GET /api/backups - List backup archives (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await autoTriggerDailyBackup();
    const list = await query('SELECT * FROM backup_metadata ORDER BY id DESC');
    return res.json(list);
  } catch (error) {
    console.error('Fetch backups list error:', error);
    return res.status(500).json({ error: 'Failed to fetch backup lists' });
  }
});

// GET /api/backups/:id/download - Download backup archive file (Protected, Admin Only)
router.get('/:id/download', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT file_path FROM backup_metadata WHERE id = $1', [id]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Backup snapshot details not found.' });
    }
    const filename = result[0].file_path;
    const filePath = path.join(backupsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup archive file missing on server disk.' });
    }
    return res.download(filePath, filename);
  } catch (error) {
    console.error('Download backup file error:', error);
    return res.status(500).json({ error: 'Failed to download database snapshot' });
  }
});

// DELETE /api/backups/:id - Delete backup snapshot (Protected, Admin Only)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT file_path FROM backup_metadata WHERE id = $1', [id]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Backup snapshot details not found.' });
    }
    const filename = result[0].file_path;
    const filePath = path.join(backupsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await query('DELETE FROM backup_metadata WHERE id = $1', [id]);
    await logActivity(req.user?.username || 'Admin', `Deleted backup file ${filename}`, 'System');
    return res.json({ message: 'Backup file purged successfully.' });
  } catch (error) {
    console.error('Delete backup file error:', error);
    return res.status(500).json({ error: 'Failed to delete backup snapshot' });
  }
});

// POST /api/backups - Create a database backup snapshot (Protected, Admin Only)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgres) {
      return res.status(400).json({ error: 'Database snapshots are only supported on SQLite systems currently.' });
    }

    const dbPath = path.join(dbDir, 'gym.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Active database file not found' });
    }

    // Generate filename: backup_YYYYMMDD_HHMMSS.db
    const now = new Date();
    const stamp = now.toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
    const backupName = `backup_${stamp}.db`;
    const backupPath = path.join(backupsDir, backupName);

    // Safely copy database
    fs.copyFileSync(dbPath, backupPath);

    // Get size
    const stats = fs.statSync(backupPath);
    const sizeBytes = stats.size;

    // Log in database
    await query(
      `INSERT INTO backup_metadata (file_path, size, status) VALUES ($1, $2, 'Success')`,
      [backupName, sizeBytes]
    );

    await logActivity(req.user?.username || 'Admin', `Created DB Backup ${backupName} (${(sizeBytes / 1024).toFixed(1)} KB)`, 'System');

    return res.status(201).json({ message: 'Backup created successfully', filename: backupName });
  } catch (error) {
    console.error('Create backup error:', error);
    return res.status(500).json({ error: 'Failed to create backup snapshot' });
  }
});

// POST /api/backups/restore - Restore a database backup snapshot (Protected, Admin Only)
router.post('/restore', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Backup filename is required' });
    }

    if (isPostgres) {
      return res.status(400).json({ error: 'Database restore is only supported on SQLite systems.' });
    }

    const backupPath = path.join(backupsDir, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Selected backup file not found.' });
    }

    const dbPath = path.join(dbDir, 'gym.db');

    console.log(`[SYSTEM] Starting Database Restore from ${filename}...`);
    
    // 1. Close current connection handles to unlock file
    await closeDatabase();

    // 2. Perform file overwrite
    fs.copyFileSync(backupPath, dbPath);
    console.log(`[SYSTEM] Database file overwritten successfully.`);

    // 3. Re-initialize database connection handles
    await initDatabase();
    console.log(`[SYSTEM] Database re-opened cleanly.`);

    await logActivity(req.user?.username || 'Admin', `Restored Database Backup to ${filename}`, 'System');

    return res.json({ message: 'Database restored successfully!' });
  } catch (error) {
    console.error('Restore database error:', error);
    return res.status(500).json({ error: 'Failed to restore database backup' });
  }
});

export default router;
