import { query } from './db';
import bcrypt from 'bcryptjs';

export async function seedDemoData() {
  try {
    console.log('[SEEDER] Seeding demo database tiers...');

    // 1. Seed admin if none exists
    const admins = await query('SELECT COUNT(*) as count FROM admins');
    const adminCount = parseInt(admins[0]?.count || admins[0]?.['COUNT(*)'] || '0');
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await query("INSERT INTO admins (username, password_hash) VALUES ('admin', $1)", [hash]);
      console.log('[SEEDER] Seeded default admin credentials (admin / admin123).');
    }

    // 2. Seed membership plans
    const mPlans = await query('SELECT COUNT(*) as count FROM membership_plans');
    const mCount = parseInt(mPlans[0]?.count || mPlans[0]?.['COUNT(*)'] || '0');
    if (mCount === 0) {
      await query(`
        INSERT INTO membership_plans (plan_name, duration, price, description, status) VALUES 
        ('Monthly Basic', '30 Days', 1200, 'Access to basic gym floor equipment', 'Active'),
        ('3-Month Special', '90 Days', 3200, 'Saves 10% on quarterly training packages', 'Active'),
        ('Premium Personal Coaching', '30 Days', 6000, 'Includes 1-on-1 private coach workout routines', 'Active')
      `);
      console.log('[SEEDER] Seeded default membership plans.');
    }

    // 3. Seed trainers
    const trainers = await query('SELECT COUNT(*) as count FROM trainers');
    const tCount = parseInt(trainers[0]?.count || trainers[0]?.['COUNT(*)'] || '0');
    if (tCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const coachPass = await bcrypt.hash('trainer123', salt);
      await query(`
        INSERT INTO trainers (trainer_id, full_name, mobile_number, email, gender, experience, specialization, qualification, joining_date, status, password_hash) VALUES 
        ('TRN-101', 'Alexander Stone', '9876543201', 'stone@gym.com', 'Male', 6, 'Bodybuilding & Hypertrophy', 'ISSA Certified Coach', '2026-01-15', 'Active', $1),
        ('TRN-102', 'Sarah Jenkins', '9876543202', 'sarah@gym.com', 'Female', 4, 'Yoga & Flexibility', 'RYT 200 Certified Teacher', '2026-02-10', 'Active', $1)
      `, [coachPass]);
      console.log('[SEEDER] Seeded trainers.');
    }

    // 4. Seed members
    const members = await query('SELECT COUNT(*) as count FROM members');
    const memCount = parseInt(members[0]?.count || members[0]?.['COUNT(*)'] || '0');
    if (memCount === 0) {
      await query(`
        INSERT INTO members (member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, address, status, trainer_id) VALUES 
        ('MEM-201', 'Liam Vance', '9876543001', 'Male', 28, 178, 82, '2026-06-01', 'Monthly Basic', 'Greenway Apts, block C', 'Active', 'TRN-101'),
        ('MEM-202', 'Emma Watson', '9876543002', 'Female', 24, 165, 59, '2026-07-15', '3-Month Special', 'Downtown Heights, flat 4B', 'Active', 'TRN-102'),
        ('MEM-203', 'Rohan Sharma', '9876543003', 'Male', 32, 182, 94, '2026-08-01', 'Premium Personal Coaching', 'Adyar Road, Chennai', 'Active', 'TRN-101')
      `);
      console.log('[SEEDER] Seeded members.');
    }

    // 5. Seed workouts
    const workouts = await query('SELECT COUNT(*) as count FROM workout_plans');
    const wCount = parseInt(workouts[0]?.count || workouts[0]?.['COUNT(*)'] || '0');
    if (wCount === 0) {
      const monSplit = JSON.stringify([
        { exercise_name: 'Bench Press', sets: 4, reps: 10, rest_seconds: 90 },
        { exercise_name: 'Incline Dumbbell Flys', sets: 3, reps: 12, rest_seconds: 60 },
        { exercise_name: 'Overhead Tricep Extension', sets: 3, reps: 15, rest_seconds: 60 }
      ]);
      await query(`
        INSERT INTO workout_plans (plan_name, goal, fitness_level, duration, schedule) VALUES 
        ('Push Routine Day', 'Muscle Building', 'Intermediate', '60 Days', $1),
        ('Cardio Shred Core', 'Weight Loss', 'Beginner', '30 Days', $1)
      `, [monSplit]);
      console.log('[SEEDER] Seeded workout routine sheets.');
    }

    // 6. Seed diets
    const diets = await query('SELECT COUNT(*) as count FROM diet_plans');
    const dCount = parseInt(diets[0]?.count || diets[0]?.['COUNT(*)'] || '0');
    if (dCount === 0) {
      const mealsSplit = JSON.stringify([
        { meal_time: '08:00 AM', meal_name: 'Breakfast', foods: 'Oats with whey protein, almonds, and banana', calories: 550, protein: 40, carbs: 70, fats: 12 },
        { meal_time: '01:00 PM', meal_name: 'Lunch', foods: 'Grilled chicken breast with brown rice and broccoli', calories: 650, protein: 55, carbs: 60, fats: 8 },
        { meal_time: '08:30 PM', meal_name: 'Dinner', foods: 'Salmon fillet with sweet potato and salad greens', calories: 600, protein: 45, carbs: 45, fats: 18 }
      ]);
      await query(`
        INSERT INTO diet_plans (plan_name, goal, calories, protein, carbohydrates, fats, water_intake, trainer_notes, meals) VALUES 
        ('High Protein Shred', 'Muscle Building', 1800, 140, 175, 38, 4.0, 'Maintain caloric deficit but hit protein target', $1),
        ('Lean Mass Gainer', 'Weight Gain', 2900, 160, 350, 65, 3.5, 'Increase carb intake pre-workout', $1)
      `, [mealsSplit]);
      console.log('[SEEDER] Seeded diet meals.');
    }

    // 7. Seed payments
    const payments = await query('SELECT COUNT(*) as count FROM payments');
    const pCount = parseInt(payments[0]?.count || payments[0]?.['COUNT(*)'] || '0');
    if (pCount === 0) {
      await query(`
        INSERT INTO payments (invoice_number, member_id, amount, discount, final_amount, paid_amount, pending_amount, payment_date, payment_mode, payment_status, transaction_id, remarks) VALUES 
        ('INV-2026-1001', 'MEM-201', 1200, 0, 1200, 1200, 0, '2026-06-01', 'Cash', 'Paid', 'TXN-90118276', 'Initial Monthly Basic'),
        ('INV-2026-1002', 'MEM-202', 3200, 200, 3000, 1500, 1500, '2026-07-15', 'UPI / Card', 'Partial', 'TXN-90118335', '50% balance pending quarterly tier')
      `);
      console.log('[SEEDER] Seeded invoices ledger.');
    }

    // 8. Seed attendance
    const attendance = await query('SELECT COUNT(*) as count FROM attendance');
    const aCount = parseInt(attendance[0]?.count || attendance[0]?.['COUNT(*)'] || '0');
    if (aCount === 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      await query(`
        INSERT INTO attendance (member_id, recorded_date, recorded_time, status) VALUES 
        ('MEM-201', $1, '07:15 AM', 'Present'),
        ('MEM-202', $1, '08:30 AM', 'Present'),
        ('MEM-203', $1, '06:00 PM', 'Late'),
        ('MEM-201', $2, '07:10 AM', 'Present'),
        ('MEM-202', $2, '08:45 AM', 'Present')
      `, [today, yesterday]);
      console.log('[SEEDER] Seeded check-in attendance logs.');
    }

    console.log('[SEEDER] Seeding database completed successfully ✔');
  } catch (e) {
    console.error('[SEEDER] Seeding failed:', e);
  }
}
