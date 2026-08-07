import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/search - Unified Global Instant Search (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query.q ? String(req.query.q).toLowerCase().trim() : '';

    if (!q || q.length < 2) {
      return res.json({ members: [], trainers: [], invoices: [], workouts: [], diets: [], memberships: [], attendance: [], reports: [] });
    }

    const searchPattern = `%${q}%`;

    // 1. Search Members
    const members = await query(
      `SELECT member_id, full_name, mobile_number, status, membership_plan 
       FROM members 
       WHERE LOWER(full_name) LIKE $1 OR LOWER(member_id) LIKE $1 OR mobile_number LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    // 2. Search Trainers
    const trainers = await query(
      `SELECT trainer_id, full_name, mobile_number, specialization, status 
       FROM trainers 
       WHERE LOWER(full_name) LIKE $1 OR LOWER(trainer_id) LIKE $1 OR mobile_number LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    // 3. Search Payments/Invoices
    const invoices = await query(
      `SELECT invoice_number, member_id, paid_amount, payment_status, payment_date 
       FROM payments 
       WHERE LOWER(invoice_number) LIKE $1 OR LOWER(member_id) LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    // 4. Search Workouts
    const workouts = await query(
      `SELECT id, plan_name, goal, fitness_level 
       FROM workout_plans 
       WHERE LOWER(plan_name) LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    // 5. Search Diets
    const diets = await query(
      `SELECT id, plan_name, goal, calories 
       FROM diet_plans 
       WHERE LOWER(plan_name) LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    // 6. Search Memberships
    const memberships = await query(
      `SELECT id, plan_name, duration, price, status 
       FROM membership_plans 
       WHERE LOWER(plan_name) LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    // 7. Search Attendance
    const attendance = await query(
      `SELECT a.id, a.member_id, m.full_name, a.recorded_date, a.status 
       FROM attendance a 
       JOIN members m ON a.member_id = m.member_id 
       WHERE LOWER(m.full_name) LIKE $1 OR LOWER(a.member_id) LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    // 8. Search Reports
    const reports = await query(
      `SELECT id, report_name, report_type, generated_date 
       FROM generated_reports 
       WHERE LOWER(report_name) LIKE $1 OR LOWER(report_type) LIKE $1 
       LIMIT 5`,
      [searchPattern]
    );

    return res.json({
      members,
      trainers,
      invoices,
      workouts,
      diets,
      memberships,
      attendance,
      reports
    });

  } catch (error) {
    console.error('Global search error:', error);
    return res.status(500).json({ error: 'Global search execution failed' });
  }
});

export default router;
