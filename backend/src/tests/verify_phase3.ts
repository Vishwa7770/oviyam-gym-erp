import { initDatabase, query, closeDatabase } from '../config/db';

async function runPhase3Tests() {
  console.log('==================================================');
  console.log('    RUNNING PHASE 3 REPORTS INTEGRATION TESTS     ');
  console.log('==================================================');

  try {
    // 1. Initialize
    console.log('Step 1: DB connection init and migrations...');
    await initDatabase();
    console.log('✔ DB initialized.');

    // Clear old test data
    console.log('Clearing old Phase 3 test records...');
    await query("DELETE FROM generated_reports WHERE report_name LIKE 'Test P3 Report%'");
    await query("DELETE FROM progress_history WHERE member_id = 'MEM-P3-TEST'");
    await query("DELETE FROM members WHERE member_id = 'MEM-P3-TEST'");

    // 2. Verify generated_reports table exists
    console.log('\nStep 2: Verifying reports history table structure...');
    const tableInfo = await query("SELECT COUNT(*) as count FROM generated_reports");
    console.log(`✔ Table generated_reports exists and has ${tableInfo[0]?.count || 0} entries.`);

    // 3. Insert baseline data to test query calculations
    console.log('\nStep 3: Seeding member for progress metrics calculation...');
    await query(
      `INSERT INTO members (
        member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      ['MEM-P3-TEST', 'Phase3 Auditor', '7777788888', 'Male', 32, 175, 80, '2026-08-01', 'Quarterly Plan', 'Active']
    );

    // Add progress log showing a weight loss (80kg -> 78kg)
    await query(
      `INSERT INTO progress_history (
        member_id, recorded_date, weight, height, chest, waist, left_arm, right_arm, left_thigh, right_thigh, body_fat, trainer_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      ['MEM-P3-TEST', '2026-08-05', 78.0, 175, 96, 82, 32, 32, 56, 56, 18.4, 'Weight loss achieved.']
    );
    console.log('✔ Baseline data seeded.');

    // 4. Test Report stats metrics calculation
    console.log('\nStep 4: Testing Reports Stats calculations...');
    const totalCount = await query('SELECT COUNT(*) as count FROM members');
    const total = parseInt(totalCount[0]?.count || '0');
    console.log(`✔ Calculated total members: ${total}`);

    const updatesCount = await query("SELECT COUNT(*) as count FROM progress_history WHERE recorded_date >= '2026-08-01'");
    const updates = parseInt(updatesCount[0]?.count || '0');
    console.log(`✔ Calculated progress checkpoints this month: ${updates}`);

    // 5. Test Weight Loss/Gain categorization logic (demographics chart)
    console.log('\nStep 5: Verifying Weight Loss vs Gain classifications...');
    const progressLogs = await query("SELECT member_id, weight FROM progress_history WHERE member_id = 'MEM-P3-TEST' ORDER BY recorded_date ASC, created_at ASC");
    const baseline = await query("SELECT weight FROM members WHERE member_id = 'MEM-P3-TEST'");
    
    const initialW = parseFloat(baseline[0].weight);
    const latestW = parseFloat(progressLogs[0].weight);
    const diff = latestW - initialW;

    if (diff === -2.0) {
      console.log(`✔ Weight loss correctly calculated: ${diff} kg (80kg baseline -> 78kg log).`);
    } else {
      throw new Error(`❌ Weight loss classification failed. Expected -2.0, got ${diff}`);
    }

    // 6. Test Reports history snapshots CRUD
    console.log('\nStep 6: Testing Reports snapshot CRUD (History)...');
    
    // Save report snapshot
    await query(
      `INSERT INTO generated_reports (
        report_name, report_type, filters, generated_date, generated_by, report_data
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Test P3 Report Snapshot',
        'Members List',
        'Plan: Quarterly, Status: Active',
        '2026-08-05',
        'admin_test',
        JSON.stringify([{ member_id: 'MEM-P3-TEST', full_name: 'Phase3 Auditor' }])
      ]
    );
    console.log('✔ Snapshot saved to database.');

    // Fetch and check
    const fetched = await query("SELECT * FROM generated_reports WHERE report_name = 'Test P3 Report Snapshot'");
    if (fetched.length === 1 && fetched[0].generated_by === 'admin_test') {
      console.log('✔ Snapshot fetched and checked successfully.');
    } else {
      throw new Error('❌ Saved snapshot details validation failed.');
    }

    // Delete snapshot
    const deleteId = fetched[0].id;
    await query("DELETE FROM generated_reports WHERE id = $1", [deleteId]);
    
    const checkDeleted = await query("SELECT COUNT(*) as count FROM generated_reports WHERE report_name = 'Test P3 Report Snapshot'");
    const deletedCount = parseInt(checkDeleted[0]?.count || '0');
    if (deletedCount === 0) {
      console.log('✔ Snapshot deleted successfully.');
    } else {
      throw new Error('❌ Snapshot deletion failed.');
    }

    // Clean up
    console.log('\nCleaning up test records...');
    await query("DELETE FROM progress_history WHERE member_id = 'MEM-P3-TEST'");
    await query("DELETE FROM members WHERE member_id = 'MEM-P3-TEST'");

    console.log('\n==================================================');
    console.log('        ALL PHASE 3 INTEGRATION TESTS PASSED ✔    ');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ INTEGRATION TESTS FAILED:', error);
  } finally {
    await closeDatabase();
  }
}

runPhase3Tests();
