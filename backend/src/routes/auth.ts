import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from './activity_logs';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgymtrackerkey';

// In-memory rate limiting map for logins
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');

    // Rate Limiting Check
    const nowTime = Date.now();
    const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    if (attempt.count >= 5 && (nowTime - attempt.lastAttempt) < 60000) {
      return res.status(429).json({ error: 'Too many failed login attempts. Locked for 1 minute.' });
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Support Demo Login (Part 1)
    if (normalizedUsername === 'demo') {
      const token = jwt.sign(
        { id: 9999, username: 'Demo User', role: 'demo' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      loginAttempts.delete(ip);
      await logActivity('Demo User', 'Logged in as Demo User', 'Auth', ip);
      return res.json({
        token,
        admin: {
          id: 9999,
          username: 'Demo User',
          role: 'demo'
        }
      });
    }

    let userRecord: any = null;
    let userRole: 'admin' | 'trainer' = 'admin';

    // 1. Check Admins table
    const admins = await query('SELECT * FROM admins WHERE username = $1', [normalizedUsername]);
    if (admins.length > 0) {
      userRecord = admins[0];
      userRole = 'admin';
    } else {
      // 2. Check Trainers table
      const trainers = await query(
        'SELECT * FROM trainers WHERE LOWER(email) = $1 OR mobile_number = $2 OR trainer_id = $3', 
        [normalizedUsername, normalizedUsername, username.trim()]
      );
      if (trainers.length > 0) {
        userRecord = trainers[0];
        userRole = 'trainer';
      }
    }

    if (!userRecord) {
      // Increment failed count
      attempt.count++;
      attempt.lastAttempt = nowTime;
      loginAttempts.set(ip, attempt);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatch = await bcrypt.compare(password, userRecord.password_hash);
    if (!passwordMatch) {
      // Increment failed count
      attempt.count++;
      attempt.lastAttempt = nowTime;
      loginAttempts.set(ip, attempt);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Clear rate limits on successful login
    loginAttempts.delete(ip);

    const token = jwt.sign(
      { 
        id: userRecord.id, 
        username: userRole === 'admin' ? userRecord.username : userRecord.full_name, 
        role: userRole 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Write audit log
    await logActivity(
      userRole === 'admin' ? userRecord.username : userRecord.full_name,
      'Logged in successfully',
      'Auth',
      ip
    );

    return res.json({
      token,
      admin: {
        id: userRecord.id,
        username: userRole === 'admin' ? userRecord.username : userRecord.full_name,
        role: userRole
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile route
router.get('/me', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    return res.json({ admin: req.user });
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
