import { initDatabase, query, closeDatabase } from '../config/db';

function prepareSqliteQuery(text: string, params: any[]): { sql: string; params: any[] } {
  const matches = text.match(/\$[0-9]+/g);
  if (!matches) {
    return { sql: text, params };
  }

  const newParams: any[] = [];
  const sql = text.replace(/\$([0-9]+)/g, (_, numStr) => {
    const idx = parseInt(numStr) - 1;
    newParams.push(params[idx]);
    return '?';
  });

  return { sql, params: newParams };
}

async function testDebug() {
  await initDatabase();
  try {
    console.log('Inserting a test member first...');
    await query("DELETE FROM members WHERE member_id = 'MEM-DEBUG'");
    await query(
      `INSERT INTO members (
        member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      ['MEM-DEBUG', 'Debug Member', '1234567890', 'Male', 30, 175, 75, '2026-08-01', 'Monthly Plan', 'Active']
    );

    console.log('\nCase A with Preprocessor:');
    const sql = `
      SELECT member_id, full_name, mobile_number 
      FROM members 
      WHERE 1=1 AND (full_name LIKE $1 OR mobile_number LIKE $1 OR member_id LIKE $1)
      LIMIT $2 OFFSET $3
    `;
    const params = ['%Debug%', 10, 0];
    
    // Process query for SQLite
    const processed = prepareSqliteQuery(sql, params);
    console.log('Processed SQL:', processed.sql);
    console.log('Processed Params:', processed.params);

    // Run query using direct SQLite database driver client
    const res = await query(processed.sql, processed.params);
    console.log('✔ Case A succeeded with Preprocessor! Row count:', res.length);

    await query("DELETE FROM members WHERE member_id = 'MEM-DEBUG'");
  } catch (err: any) {
    console.error('❌ Integration check failed:', err.message);
  } finally {
    await closeDatabase();
  }
}

testDebug();
