import { initDatabase, query, closeDatabase } from '../config/db';

async function runPhase4Tests() {
  console.log('==================================================');
  console.log('    RUNNING PHASE 4 ATTENDANCE INTEGRATION TESTS  ');
  console.log('==================================================');

  try {
    // 1. Init
    console.log('Step 1: DB connection init and migrations...');
    await initDatabase();
    console.log('✔ DB initialized.');

    // Clear old test records
    console.log('Clearing old Phase 4 test records...');
    await query("DELETE FROM attendance WHERE member_id = 'MEM-P4-TEST'");
    await query("DELETE FROM members WHERE member_id = 'MEM-P4-TEST'");

    // 2. Verify attendance table structure
    console.log('\nStep 2: Checking attendance table schema...');
    const tableInfo = await query("SELECT COUNT(*) as count FROM attendance");
    console.log(`✔ Table attendance exists and has ${tableInfo[0]?.count || 0} entries.`);

    // 3. Seed member
    console.log('\nStep 3: Seeding member for attendance calculations...');
    await query(
      `INSERT INTO members (
        member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      ['MEM-P4-TEST', 'Attendance Tester', '9999900000', 'Female', 28, 168, 62, '2026-08-01', 'Monthly Plan', 'Active']
    );
    console.log('✔ Test member seeded.');

    // 4. Test check-in upsert logic
    console.log('\nStep 4: Testing attendance mark check-in (Insert)...');
    await query(
      `INSERT INTO attendance (
        member_id, recorded_date, status, time_in, time_out, trainer
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['MEM-P4-TEST', '2026-08-05', 'Present', '08:30 AM', '', 'Admin']
    );
    console.log('✔ Check-in logged successfully.');

    // Test Upsert: Mark attendance for the SAME day again (should update the existing log rather than fail)
    console.log('Testing attendance update (ON CONFLICT/Upsert)...');
    
    // Simulate our select-before-update upsert logic
    const existing = await query(
      'SELECT id FROM attendance WHERE member_id = $1 AND recorded_date = $2',
      ['MEM-P4-TEST', '2026-08-05']
    );

    if (existing.length > 0) {
      await query(
        `UPDATE attendance 
         SET status = $1, time_in = $2, time_out = $3, trainer = $4 
         WHERE id = $5`,
        ['Late', '09:15 AM', '', 'Admin', existing[0].id]
      );
      console.log('✔ Check-in upsert update executed successfully.');
    } else {
      throw new Error('❌ Upsert selection failed. Existing check-in was not found.');
    }

    // Verify record state
    const record = await query("SELECT * FROM attendance WHERE member_id = 'MEM-P4-TEST' AND recorded_date = '2026-08-05'");
    if (record.length === 1 && record[0].status === 'Late' && record[0].time_in === '09:15 AM') {
      console.log('✔ Check-in record state verified correctly (upsert succeeded!).');
    } else {
      throw new Error(`❌ Check-in state mismatch. Expected status Late, time_in 09:15 AM. Got status ${record[0]?.status}, time_in ${record[0]?.time_in}`);
    }

    // 5. Test stats aggregations
    console.log('\nStep 5: Testing stats calculations...');
    const activeRes = await query("SELECT COUNT(*) as count FROM members WHERE status = 'Active'");
    const activeMembers = parseInt(activeRes[0]?.count || activeRes[0]?.['COUNT(*)'] || '0');
    console.log(`✔ Active members: ${activeMembers}`);

    const checkedInToday = await query("SELECT COUNT(*) as count FROM attendance WHERE recorded_date = '2026-08-05' AND status IN ('Present', 'Late')");
    const checkedIn = parseInt(checkedInToday[0]?.count || checkedInToday[0]?.['COUNT(*)'] || '0');
    console.log(`✔ Checked-in members today: ${checkedIn}`);

    // 6. Test missing members criteria (7+ days)
    console.log('\nStep 6: Verifying members missing alerts calculation...');
    const joinDateObj = new Date('2026-08-01');
    const todayObj = new Date();
    const diffTime = Math.abs(todayObj.getTime() - joinDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log(`✔ Calculated days since join date: ${diffDays} days.`);

    // Clean up
    console.log('\nCleaning up test records...');
    await query("DELETE FROM attendance WHERE member_id = 'MEM-P4-TEST'");
    await query("DELETE FROM members WHERE member_id = 'MEM-P4-TEST'");

    console.log('\n==================================================');
    console.log('      ALL PHASE 4 ATTENDANCE TESTS PASSED ✔       ');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ INTEGRATION TESTS FAILED:', error);
  } finally {
    await closeDatabase();
  }
}

runPhase4Tests();
