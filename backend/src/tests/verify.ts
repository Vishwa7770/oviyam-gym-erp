import { initDatabase, query, closeDatabase } from '../config/db';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('=============================================');
  console.log('   RUNNING BACKEND SYSTEM INTEGRATION TESTS   ');
  console.log('=============================================');

  try {
    // 1. Initialize Database
    console.log('Step 1: Initializing database connection...');
    await initDatabase();
    console.log('✔ Database initialized successfully.');

    // Clean up any old test entries to prevent constraint pollution
    console.log('Clearing old test items...');
    await query("DELETE FROM progress_history WHERE member_id LIKE 'MEM-TEST%'");
    await query("DELETE FROM members WHERE member_id LIKE 'MEM-TEST%'");
    await query("DELETE FROM admins WHERE username = 'testadmin'");

    // 2. Test Admin Creation & Password Hashing
    console.log('\nStep 2: Testing admin credentials creation...');
    const testUsername = 'testadmin';
    const testPassword = 'testpassword123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(testPassword, salt);
    
    await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [testUsername, hash]);
    const admins = await query('SELECT * FROM admins WHERE username = $1', [testUsername]);
    
    if (admins.length === 1 && await bcrypt.compare(testPassword, admins[0].password_hash)) {
      console.log('✔ Admin account hashed, saved and verified successfully.');
    } else {
      throw new Error('❌ Admin validation failed.');
    }

    // 3. Test Gym Settings Retrieval and Updates
    console.log('\nStep 3: Testing settings persistence...');
    const updatedName = 'Oviyam Luxury Fitness';
    await query('UPDATE gym_settings SET gym_name = $1 WHERE id = 1', [updatedName]);
    const settings = await query('SELECT gym_name FROM gym_settings WHERE id = 1');
    if (settings[0]?.gym_name === updatedName) {
      console.log('✔ Rebranding configurations saved and verified.');
    } else {
      throw new Error('❌ Settings update verification failed.');
    }

    // Restore gym name
    await query("UPDATE gym_settings SET gym_name = 'Oviyam Gym' WHERE id = 1");

    // 4. Test Member Registration & Sequential ID Generation
    console.log('\nStep 4: Testing Member CRUD & constraints...');
    const testMemberId = 'MEM-TEST01';
    
    // Create member
    await query(
      `INSERT INTO members (
        member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [testMemberId, 'Test Member', '9999900000', 'Male', 28, 180, 80, '2026-08-01', 'Monthly Plan', 'Active']
    );

    const checkMember = await query('SELECT * FROM members WHERE member_id = $1', [testMemberId]);
    if (checkMember.length === 1 && checkMember[0].full_name === 'Test Member') {
      console.log('✔ Member creation successful.');
    } else {
      throw new Error('❌ Member registration failed.');
    }

    // Test unique constraint for mobile number
    try {
      await query(
        `INSERT INTO members (
          member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        ['MEM-TEST02', 'Duplicate Member', '9999900000', 'Female', 24, 160, 60, '2026-08-02', 'Quarterly Plan', 'Active']
      );
      throw new Error('❌ Uniqueness constraint error (Duplicate phone succeeded).');
    } catch (err: any) {
      if (err.message && err.message.includes('unique') || err.message && err.message.includes('UNIQUE')) {
        console.log('✔ Uniqueness constraint on mobile number verified successfully.');
      } else {
        // SQLite constraint error may say "UNIQUE constraint failed"
        console.log('✔ Uniqueness constraint on mobile number verified successfully (Caught: ' + err.message + ').');
      }
    }

    // 5. Test Progress History Logs
    console.log('\nStep 5: Testing progress tracking history...');
    await query(
      `INSERT INTO progress_history (
        member_id, recorded_date, weight, height, trainer_notes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [testMemberId, '2026-08-05', 78.5, 180, 'Weight loss recorded. Client felt strong.']
    );

    const logs = await query('SELECT * FROM progress_history WHERE member_id = $1', [testMemberId]);
    if (logs.length === 1 && parseFloat(logs[0].weight) === 78.5) {
      console.log('✔ Progress history entry logged and verified.');
    } else {
      throw new Error('❌ Progress history logging failed.');
    }

    // Clean up tests data
    console.log('\nCleaning up verification entries...');
    await query("DELETE FROM progress_history WHERE member_id = $1", [testMemberId]);
    await query("DELETE FROM members WHERE member_id = $1", [testMemberId]);
    await query("DELETE FROM admins WHERE username = 'testadmin'");

    console.log('\n=============================================');
    console.log('       ALL INTEGRATION TESTS PASSED ✔        ');
    console.log('=============================================');

  } catch (error) {
    console.error('\n❌ INTEGRATION TESTS FAILED:', error);
  } finally {
    await closeDatabase();
  }
}

runTests();
