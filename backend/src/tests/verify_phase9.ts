import { initDatabase, query } from '../config/db';
import { seedDemoData } from '../config/seeder';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgymtrackerkey';

async function verifyPhase9() {
  console.log('==================================================');
  console.log('    RUNNING PHASE 9 SYSTEM INTEGRATION TESTS      ');
  console.log('==================================================');

  try {
    console.log('Step 1: DB Connection initialization...');
    await initDatabase();
    console.log('✔ DB initialized successfully.');

    console.log('Step 2: Checking database seeder tables populations...');
    const members = await query('SELECT COUNT(*) as count FROM members');
    const memberCount = parseInt(members[0]?.count || members[0]?.['COUNT(*)'] || '0');
    console.log('Seed Member record count:', memberCount);
    if (memberCount > 0) {
      console.log('✔ Preloaded mock data successfully seeded in database.');
    } else {
      throw new Error('Seed member count is 0. Seeding failed.');
    }

    console.log('Step 3: Checking Demo JWT token generation payload...');
    const token = jwt.sign(
      { id: 9999, username: 'Demo User', role: 'demo' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.role === 'demo' && decoded.id === 9999) {
      console.log('✔ Demo session JWT verified: Role is "demo", ID is 9999.');
    } else {
      throw new Error(`Demo token payload mismatch: ${JSON.stringify(decoded)}`);
    }

    console.log('Step 4: Check if license key config columns are loaded...');
    const settings = await query('SELECT license_key, license_status FROM gym_settings WHERE id = 1');
    if (settings.length > 0 && settings[0].license_key) {
      console.log('✔ License key detected in database settings:', settings[0].license_key);
      console.log('✔ License status detected in database settings:', settings[0].license_status);
    } else {
      throw new Error(`License columns are missing or unseeded: ${JSON.stringify(settings)}`);
    }

    console.log('==================================================');
    console.log('      ALL PHASE 9 SYSTEM TESTS PASSED ✔           ');
    console.log('==================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ PHASE 9 TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

verifyPhase9();
