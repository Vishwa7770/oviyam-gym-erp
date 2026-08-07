import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { initDatabase, query } from './config/db';
import authRouter from './routes/auth';
import settingsRouter from './routes/settings';
import membersRouter from './routes/members';
import reportsRouter from './routes/reports';
import attendanceRouter from './routes/attendance';
import workoutsRouter from './routes/workouts';
import dietsRouter from './routes/diets';
import membershipsRouter from './routes/memberships';
import paymentsRouter from './routes/payments';
import trainersRouter from './routes/trainers';
import notificationsRouter from './routes/notifications';
import backupsRouter from './routes/backups';
import activityLogsRouter from './routes/activity_logs';
import searchRouter from './routes/search';
import importRouter from './routes/import';
import healthRouter from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgymtrackerkey';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads for gym logo
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Demo Mode Interceptor (Part 1 - Read Only Lockout)
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Allow demo users to call login / logout / setup
    if (req.path.startsWith('/auth/login') || req.path.startsWith('/settings/complete-setup')) {
      return next();
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && decoded.role === 'demo') {
          console.log(`[DEMO MODE] Blocked mutation: ${req.method} ${req.originalUrl}`);
          return res.json({
            success: true,
            message: 'Demo Mode: Database modifications are simulated and not saved.',
            id: Math.floor(Math.random() * 1000)
          });
        }
      } catch (e) {
        // Let route auth handle token verification
      }
    }
  }
  next();
});

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/members', membersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/diets', dietsRouter);
app.use('/api/memberships', membershipsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/activity-logs', activityLogsRouter);
app.use('/api/search', searchRouter);
app.use('/api/import', importRouter);
app.use('/api/system', healthRouter);

// Seed default admin account if none exists
async function seedDefaultAdmin() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM admins');
    const count = parseInt(result[0]?.count || result[0]?.['COUNT(*)'] || '0');
    if (count === 0) {
      const defaultUser = 'admin';
      const defaultPass = 'admin123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(defaultPass, salt);
      await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [defaultUser, hash]);
      console.log(`Default admin created: Username: "${defaultUser}", Password: "${defaultPass}"`);
    }
  } catch (error) {
    console.error('Failed to seed default admin:', error);
  }
}

// Start Server
async function startServer() {
  try {
    // Connect and set up tables
    await initDatabase();
    
    // Seed default admin
    await seedDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`================================================`);
      console.log(`  OVIYAM GYM TRACKER BACKEND RUNNING ON PORT ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/api/health`);
      console.log(`================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
