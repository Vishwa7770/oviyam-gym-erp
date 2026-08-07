import { initDatabase, query } from '../config/db';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('==================================================');
  console.log('    RUNNING PHASE 7 SYSTEM INTEGRATION TESTS      ');
  console.log('==================================================');

  try {
    // 1. Initialize Database
    console.log('Step 1: DB connection init and migrations...');
    await initDatabase();
    console.log('✔ DB initialized successfully.');

    // Clear old test values
    await query("DELETE FROM trainers WHERE trainer_id LIKE 'TRN-TEST%'");
    await query("DELETE FROM notifications WHERE message LIKE 'Test Notification%'");
    await query("DELETE FROM activity_logs WHERE user_identity = 'TestRunner'");

    // 2. Test Trainer Insertion
    console.log('Step 2: Testing Trainer table CRUD operations...');
    const salt = await bcrypt.genSalt(5);
    const hash = await bcrypt.hash('trainer123', salt);
    
    await query(
      `INSERT INTO trainers (trainer_id, full_name, mobile_number, email, gender, experience, specialization, qualification, joining_date, salary, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      ['TRN-TEST01', 'John Doe Trainer', '9876543210', 'johndoe@gym.com', 'Male', 5, 'Strength Coaching', 'B.Sc. Sports Science', '2026-08-07', 45000, hash]
    );
    console.log('✔ Trainer record inserted successfully.');

    const fetchTrainer = await query('SELECT * FROM trainers WHERE trainer_id = $1', ['TRN-TEST01']);
    if (fetchTrainer.length === 0) throw new Error('Trainer select failed.');
    console.log(`✔ Found Trainer: ${fetchTrainer[0].full_name} (${fetchTrainer[0].email})`);

    // 3. Test Member Trainer Assignment
    console.log('Step 3: Verifying Member Trainer Assignment mapping...');
    // Seed a test member
    await query("DELETE FROM members WHERE member_id = 'MEM-TEST01'");
    await query(
      `INSERT INTO members (member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      ['MEM-TEST01', 'Jane Member', '9998887770', 'Female', 26, 165, 58, '2026-08-07', 'Monthly', 'Active']
    );

    // Update assignment
    await query("UPDATE members SET trainer_id = $1, trainer_assigned = $2 WHERE member_id = $3", ['TRN-TEST01', 'John Doe Trainer', 'MEM-TEST01']);
    const checkMem = await query('SELECT trainer_id, trainer_assigned FROM members WHERE member_id = $1', ['MEM-TEST01']);
    if (checkMem[0]?.trainer_id !== 'TRN-TEST01') throw new Error('Member assignment mapping failed.');
    console.log(`✔ Assigned Trainer correctly: ${checkMem[0].trainer_assigned}`);

    // 4. Test Notification creation
    console.log('Step 4: Testing Notifications table insert/read operations...');
    await query("INSERT INTO notifications (type, message) VALUES ('TestType', 'Test Notification Alert Msg')");
    const fetchNotify = await query("SELECT * FROM notifications WHERE type = 'TestType'");
    if (fetchNotify.length === 0) throw new Error('Notification creation failed.');
    console.log(`✔ Generated Notification: ${fetchNotify[0].message}`);

    // Update read
    await query("UPDATE notifications SET is_read = 1 WHERE type = 'TestType'");
    const checkRead = await query("SELECT is_read FROM notifications WHERE type = 'TestType'");
    if (checkRead[0].is_read !== 1) throw new Error('Notification mark-as-read failed.');
    console.log('✔ Marked Notification as read.');

    // 5. Test Activity logs
    console.log('Step 5: Testing Audit Activity Logs...');
    await query(
      `INSERT INTO activity_logs (recorded_date, recorded_time, user_identity, action, module)
       VALUES ($1, $2, $3, $4, $5)`,
      ['2026-08-07', '20:00:00', 'TestRunner', 'Simulated execution checks', 'System']
    );
    const fetchLog = await query("SELECT * FROM activity_logs WHERE user_identity = 'TestRunner'");
    if (fetchLog.length === 0) throw new Error('Activity logging failed.');
    console.log(`✔ Action log parsed correctly: [${fetchLog[0].recorded_time}] ${fetchLog[0].action}`);

    // Clean up test records
    await query("DELETE FROM trainers WHERE trainer_id = 'TRN-TEST01'");
    await query("DELETE FROM members WHERE member_id = 'MEM-TEST01'");
    await query("DELETE FROM notifications WHERE type = 'TestType'");
    await query("DELETE FROM activity_logs WHERE user_identity = 'TestRunner'");
    console.log('✔ Cleanup of test data completed.');

    console.log('==================================================');
    console.log('      ALL PHASE 7 SYSTEM TESTS PASSED ✔           ');
    console.log('==================================================');
  } catch (error) {
    console.error('❌ PHASE 7 TESTS FAILED:', error);
    process.exit(1);
  }
}

runTests();
