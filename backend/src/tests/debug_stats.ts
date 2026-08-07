import { initDatabase, query } from '../config/db';

async function debugStats() {
  try {
    await initDatabase();
    console.log('DB Initialized.');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    console.log('1. Fetching total members...');
    const totalRes = await query('SELECT COUNT(*) as count FROM members');
    console.log('Total:', totalRes);

    console.log('2. Fetching today visitors...');
    const todayStr = new Date().toISOString().split('T')[0];
    const visitorsRes = await query('SELECT COUNT(*) as count FROM attendance WHERE recorded_date = $1', [todayStr]);
    console.log('Visitors:', visitorsRes);

    console.log('3. Fetching payments...');
    const allPayments = await query('SELECT payment_date, paid_amount FROM payments');
    console.log('Payments count:', allPayments.length);

    console.log('4. Fetching weight loss...');
    const weightLossRes = await query(`
      SELECT m.member_id, m.weight as baseline, p.weight as latest
      FROM members m
      JOIN progress_history p ON m.member_id = p.member_id
      WHERE p.id = (
        SELECT id FROM progress_history 
        WHERE member_id = m.member_id 
        ORDER BY recorded_date DESC, id DESC LIMIT 1
      )
    `);
    console.log('Weight loss rows:', weightLossRes.length);

    console.log('5. Fetching fat reduction...');
    const fatReductionRes = await query(`
      SELECT p1.member_id, p1.body_fat as first_fat, p2.body_fat as latest_fat
      FROM progress_history p1
      JOIN progress_history p2 ON p1.member_id = p2.member_id
      WHERE p1.id = (
        SELECT id FROM progress_history 
        WHERE member_id = p1.member_id AND body_fat IS NOT NULL
        ORDER BY recorded_date ASC, id ASC LIMIT 1
      )
      AND p2.id = (
        SELECT id FROM progress_history 
        WHERE member_id = p1.member_id AND body_fat IS NOT NULL
        ORDER BY recorded_date DESC, id DESC LIMIT 1
      )
    `);
    console.log('Fat reduction rows:', fatReductionRes.length);

    console.log('6. Done debug!');
  } catch (error) {
    console.error('❌ DEBUG STATS FAILED:', error);
  }
}

debugStats();
