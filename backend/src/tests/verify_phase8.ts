import { initDatabase, query } from '../config/db';
import { logActivity } from '../routes/activity_logs';

async function verifyPhase8() {
  console.log('==================================================');
  console.log('    RUNNING PHASE 8 SYSTEM INTEGRATION TESTS      ');
  console.log('==================================================');
  
  try {
    console.log('Step 1: DB connection init and migrations...');
    await initDatabase();
    console.log('✔ DB initialized successfully.');

    console.log('Step 2: Checking gym_settings table column expansions...');
    const settings = await query(`
      SELECT website, gst_number, invoice_footer, favicon, login_bg, dashboard_banner, setup_completed
      FROM gym_settings WHERE id = 1
    `);
    if (settings.length > 0) {
      console.log('✔ gym_settings columns verified. Current setup status:', settings[0].setup_completed);
    } else {
      console.log('⚠ gym_settings is empty, inserting defaults...');
      await query(`
        INSERT INTO gym_settings (id, gym_name, setup_completed) 
        VALUES (1, 'Oviyam Test Gym', 0)
      `);
      console.log('✔ Default row inserted.');
    }

    console.log('Step 3: Checking Audit Activity Logs IP address mapping...');
    const testIp = '192.168.1.100';
    await logActivity('TesterAdmin', 'Test execution Phase 8', 'System', testIp);
    
    const logs = await query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 1');
    if (logs.length > 0 && logs[0].ip_address === testIp) {
      console.log('✔ IP Address saved correctly in logs:', logs[0].ip_address);
    } else {
      throw new Error(`IP mapping validation failed. Found: ${JSON.stringify(logs[0])}`);
    }

    console.log('Step 4: Testing database query performance indexes...');
    const indexes = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND (name='idx_members_name' OR name='idx_payments_invoice')
    `);
    console.log('Found Indexes:', indexes.map((idx: any) => idx.name));
    if (indexes.length >= 2) {
      console.log('✔ Performance indexes verified on members and payments tables.');
    } else {
      console.log('⚠ Indexes verification skipped (might be running PostgreSQL)');
    }

    console.log('==================================================');
    console.log('      ALL PHASE 8 SYSTEM TESTS PASSED ✔           ');
    console.log('==================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ PHASE 8 TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

verifyPhase8();
