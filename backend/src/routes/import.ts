import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from './activity_logs';

const router = Router();

interface ImportPayload {
  members?: any[];
  attendance?: any[];
  payments?: any[];
  workouts?: any[];
  diets?: any[];
}

// POST /api/import/validate - Dry-run import spreadsheets and return validation warnings
router.post('/validate', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload: ImportPayload = req.body;
    const errors: string[] = [];
    const stats = { members: 0, attendance: 0, payments: 0, workouts: 0, diets: 0 };

    // 1. Validate Members
    if (Array.isArray(payload.members)) {
      for (let i = 0; i < payload.members.length; i++) {
        const m = payload.members[i];
        const row = i + 2; // spreadsheet 1-indexed header offset
        if (!m.member_id) errors.push(`Members Row ${row}: Missing Member ID`);
        if (!m.full_name) errors.push(`Members Row ${row}: Missing Full Name`);
        if (!m.mobile_number) errors.push(`Members Row ${row}: Missing Mobile Number`);
      }
      stats.members = payload.members.length;
    }

    // 2. Validate Attendance
    if (Array.isArray(payload.attendance)) {
      for (let i = 0; i < payload.attendance.length; i++) {
        const a = payload.attendance[i];
        const row = i + 2;
        if (!a.member_id) errors.push(`Attendance Row ${row}: Missing Member ID`);
        if (!a.recorded_date) errors.push(`Attendance Row ${row}: Missing Date`);
        if (!a.status) errors.push(`Attendance Row ${row}: Missing Status (Present/Absent/Late)`);
      }
      stats.attendance = payload.attendance.length;
    }

    // 3. Validate Payments
    if (Array.isArray(payload.payments)) {
      for (let i = 0; i < payload.payments.length; i++) {
        const p = payload.payments[i];
        const row = i + 2;
        if (!p.invoice_number) errors.push(`Payments Row ${row}: Missing Invoice Number`);
        if (!p.member_id) errors.push(`Payments Row ${row}: Missing Member ID`);
        if (isNaN(parseFloat(p.amount))) errors.push(`Payments Row ${row}: Invalid Amount`);
      }
      stats.payments = payload.payments.length;
    }

    // 4. Validate Workouts
    if (Array.isArray(payload.workouts)) {
      for (let i = 0; i < payload.workouts.length; i++) {
        const w = payload.workouts[i];
        const row = i + 2;
        if (!w.plan_name) errors.push(`Workouts Row ${row}: Missing Plan Name`);
        if (!w.goal) errors.push(`Workouts Row ${row}: Missing Goal`);
      }
      stats.workouts = payload.workouts.length;
    }

    // 5. Validate Diets
    if (Array.isArray(payload.diets)) {
      for (let i = 0; i < payload.diets.length; i++) {
        const d = payload.diets[i];
        const row = i + 2;
        if (!d.plan_name) errors.push(`Diets Row ${row}: Missing Plan Name`);
        if (d.calories && isNaN(parseInt(d.calories))) errors.push(`Diets Row ${row}: Invalid Calories count`);
      }
      stats.diets = payload.diets.length;
    }

    return res.json({
      success: errors.length === 0,
      errors,
      stats
    });

  } catch (error) {
    console.error('Import validation failed:', error);
    return res.status(500).json({ error: 'Failed to validate imported data' });
  }
});

// POST /api/import/commit - Save validated import records to DB (Protected)
router.post('/commit', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload: ImportPayload = req.body;
    let committed = 0;

    // 1. Commit Members
    if (Array.isArray(payload.members)) {
      for (const m of payload.members) {
        await query(
          `INSERT OR IGNORE INTO members (member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, address, emergency_contact, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [m.member_id, m.full_name, m.mobile_number, m.gender || 'Male', parseInt(m.age || '25'), parseFloat(m.height || '170'), parseFloat(m.weight || '70'), m.join_date || new Date().toISOString().split('T')[0], m.membership_plan || 'Monthly Basic', m.address || '', m.emergency_contact || '', m.status || 'Active']
        );
        committed++;
      }
    }

    // 2. Commit Attendance
    if (Array.isArray(payload.attendance)) {
      for (const a of payload.attendance) {
        await query(
          `INSERT INTO attendance (member_id, recorded_date, recorded_time, status)
           VALUES ($1, $2, $3, $4)`,
          [a.member_id, a.recorded_date, a.recorded_time || '08:00 AM', a.status || 'Present']
        );
        committed++;
      }
    }

    // 3. Commit Payments
    if (Array.isArray(payload.payments)) {
      for (const p of payload.payments) {
        await query(
          `INSERT OR IGNORE INTO payments (invoice_number, member_id, amount, discount, final_amount, paid_amount, pending_amount, payment_date, payment_mode, payment_status, transaction_id, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [p.invoice_number, p.member_id, parseFloat(p.amount), parseFloat(p.discount || '0'), parseFloat(p.final_amount || p.amount), parseFloat(p.paid_amount || p.amount), parseFloat(p.pending_amount || '0'), p.payment_date || new Date().toISOString().split('T')[0], p.payment_mode || 'Cash', p.payment_status || 'Paid', p.transaction_id || '', p.remarks || '']
        );
        committed++;
      }
    }

    // 4. Commit Workouts
    if (Array.isArray(payload.workouts)) {
      for (const w of payload.workouts) {
        await query(
          `INSERT INTO workout_plans (plan_name, goal, fitness_level, duration, notes, schedule)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [w.plan_name, w.goal || 'General Fitness', w.fitness_level || 'Beginner', w.duration || '30 Days', w.notes || '', w.schedule || '[]']
        );
        committed++;
      }
    }

    // 5. Commit Diets
    if (Array.isArray(payload.diets)) {
      for (const d of payload.diets) {
        await query(
          `INSERT INTO diet_plans (plan_name, goal, calories, protein, carbohydrates, fats, water_intake, trainer_notes, meals)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [d.plan_name, d.goal || 'General Fitness', parseInt(d.calories || '2000'), parseInt(d.protein || '120'), parseInt(d.carbohydrates || '200'), parseInt(d.fats || '60'), parseFloat(d.water_intake || '3'), d.trainer_notes || '', d.meals || '[]']
        );
        committed++;
      }
    }

    // Audit logs
    await logActivity(req.user?.username || 'Admin', `Committed bulk spreadsheet import of ${committed} rows`, 'System');

    return res.json({ success: true, message: `Import finalized. Saved ${committed} entries to database.` });

  } catch (error) {
    console.error('Import commit error:', error);
    return res.status(500).json({ error: 'Failed to write imported datasets to database' });
  }
});

export default router;
