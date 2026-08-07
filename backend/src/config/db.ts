import pg from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const isPostgres = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

let pgPool: pg.Pool | null = null;
let sqliteDb: any = null;

export async function initDatabase() {
  if (isPostgres) {
    console.log('Initializing production PostgreSQL connection...');
    pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    // Test connection
    const client = await pgPool.connect();
    client.release();
    console.log('PostgreSQL connected successfully.');
  } else {
    console.log('DATABASE_URL not found. Initializing local SQLite database...');
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir);
    }
    const dbPath = path.join(dbDir, 'gym.db');
    sqliteDb = new sqlite3.Database(dbPath);
    console.log(`SQLite database opened successfully at: ${dbPath}`);
  }

  await createTables();
}

export async function query(text: string, params?: any[]): Promise<any[]> {
  if (isPostgres) {
    if (!pgPool) throw new Error('PostgreSQL pool not initialized');
    // Replace SQLite parameter markers (?) with PostgreSQL ($1, $2...)
    let pgText = text;
    if (params && params.length > 0) {
      let count = 1;
      pgText = text.replace(/\?/g, () => `$${count++}`);
    }
    const res = await pgPool.query(pgText, params);
    return res.rows;
  } else {
    if (!sqliteDb) throw new Error('SQLite database not initialized');
    // Replace PostgreSQL parameter markers ($1, $2...) with SQLite (?)
    // and align parameters array to the correct order of '?' placeholders
    const matches = text.match(/\$\d+/g) || [];
    const sqliteParams = matches.map(m => {
      const idx = parseInt(m.substring(1)) - 1;
      return params ? params[idx] : undefined;
    });
    // Fallback if query uses sqlite-style '?' parameters
    const finalParams = matches.length > 0 ? sqliteParams : (params || []);
    const sqliteText = text.replace(/\$\d+/g, '?');
    
    return new Promise((resolve, reject) => {
      sqliteDb.all(sqliteText, finalParams, (err: any, rows: any[]) => {
        if (err) {
          console.error(`SQLite Error executing query: ${sqliteText}`, err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}

export async function closeDatabase() {
  if (isPostgres) {
    if (pgPool) {
      await pgPool.end();
      console.log('PostgreSQL connection pool closed.');
    }
  } else {
    if (sqliteDb) {
      await new Promise<void>((resolve, reject) => {
        sqliteDb.close((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('SQLite database closed.');
    }
  }
}

async function migrateSqliteColumns() {
  // 1. progress_history columns
  const columns = await query("PRAGMA table_info(progress_history)");
  const colNames = columns.map((col: any) => col.name);
  
  const columnsToMigrate = [
    { name: 'chest', type: 'REAL DEFAULT 0' },
    { name: 'waist', type: 'REAL DEFAULT 0' },
    { name: 'left_arm', type: 'REAL DEFAULT 0' },
    { name: 'right_arm', type: 'REAL DEFAULT 0' },
    { name: 'left_thigh', type: 'REAL DEFAULT 0' },
    { name: 'right_thigh', type: 'REAL DEFAULT 0' },
    { name: 'body_fat', type: 'REAL DEFAULT NULL' },
    { name: 'photo_front', type: "TEXT DEFAULT ''" },
    { name: 'photo_side', type: "TEXT DEFAULT ''" },
    { name: 'photo_back', type: "TEXT DEFAULT ''" }
  ];

  for (const col of columnsToMigrate) {
    if (!colNames.includes(col.name)) {
      console.log(`Migrating SQLite column: adding ${col.name} to progress_history...`);
      await query(`ALTER TABLE progress_history ADD COLUMN ${col.name} ${col.type}`);
    }
  }

  // 2. members columns
  const memColumns = await query("PRAGMA table_info(members)");
  const memColNames = memColumns.map((col: any) => col.name);
  
  const memColsToMigrate = [
    { name: 'dob', type: "TEXT DEFAULT ''" },
    { name: 'occupation', type: "TEXT DEFAULT ''" },
    { name: 'blood_group', type: "TEXT DEFAULT ''" },
    { name: 'membership_duration', type: "TEXT DEFAULT ''" },
    { name: 'membership_expiry_date', type: "TEXT DEFAULT ''" },
    { name: 'trainer_assigned', type: "TEXT DEFAULT ''" },
    { name: 'hips', type: "REAL DEFAULT 0" },
    { name: 'neck', type: "REAL DEFAULT 0" },
    { name: 'calf', type: "REAL DEFAULT 0" },
    { name: 'shoulder', type: "REAL DEFAULT 0" },
    { name: 'goal', type: "TEXT DEFAULT ''" },
    { name: 'fitness_level', type: "TEXT DEFAULT ''" },
    { name: 'injuries', type: "TEXT DEFAULT ''" },
    { name: 'allergies', type: "TEXT DEFAULT ''" },
    { name: 'smoking', type: "TEXT DEFAULT ''" },
    { name: 'alcohol', type: "TEXT DEFAULT ''" },
    { name: 'previous_experience', type: "TEXT DEFAULT ''" },
    { name: 'recommended_workout', type: "TEXT DEFAULT ''" },
    { name: 'recommended_diet', type: "TEXT DEFAULT ''" },
    { name: 'member_photo', type: "TEXT DEFAULT ''" },
    { name: 'body_front', type: "TEXT DEFAULT ''" },
    { name: 'body_side', type: "TEXT DEFAULT ''" },
    { name: 'body_back', type: "TEXT DEFAULT ''" },
    { name: 'workout_plan_id', type: "INTEGER DEFAULT NULL" },
    { name: 'workout_start_date', type: "TEXT DEFAULT ''" },
    { name: 'workout_end_date', type: "TEXT DEFAULT ''" },
    { name: 'diet_plan_id', type: "INTEGER DEFAULT NULL" },
    { name: 'diet_start_date', type: "TEXT DEFAULT ''" },
    { name: 'diet_end_date', type: "TEXT DEFAULT ''" },
    { name: 'active_membership_id', type: "INTEGER DEFAULT NULL" }
  ];

  for (const col of memColsToMigrate) {
    if (!memColNames.includes(col.name)) {
      console.log(`Migrating SQLite column: adding ${col.name} to members...`);
      await query(`ALTER TABLE members ADD COLUMN ${col.name} ${col.type}`);
    }
  }

  // 3. gym_settings columns
  const settingsColumns = await query("PRAGMA table_info(gym_settings)");
  const settingsColNames = settingsColumns.map((col: any) => col.name);
  if (!settingsColNames.includes('accent_color')) {
    console.log(`Migrating SQLite column: adding accent_color to gym_settings...`);
    await query(`ALTER TABLE gym_settings ADD COLUMN accent_color TEXT DEFAULT 'purple'`);
  }
  if (!settingsColNames.includes('working_hours')) {
    console.log(`Migrating SQLite column: adding working_hours to gym_settings...`);
    await query(`ALTER TABLE gym_settings ADD COLUMN working_hours TEXT DEFAULT '06:00 AM - 10:00 PM'`);
  }
  if (!settingsColNames.includes('currency')) {
    console.log(`Migrating SQLite column: adding currency to gym_settings...`);
    await query(`ALTER TABLE gym_settings ADD COLUMN currency TEXT DEFAULT '₹'`);
  }
  if (!settingsColNames.includes('backup_settings')) {
    console.log(`Migrating SQLite column: adding backup_settings to gym_settings...`);
    await query(`ALTER TABLE gym_settings ADD COLUMN backup_settings TEXT DEFAULT ''`);
  }
  if (!settingsColNames.includes('notification_settings')) {
    console.log(`Migrating SQLite column: adding notification_settings to gym_settings...`);
    await query(`ALTER TABLE gym_settings ADD COLUMN notification_settings TEXT DEFAULT ''`);
  }
  if (!settingsColNames.includes('website')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN website TEXT DEFAULT ''`);
  }
  if (!settingsColNames.includes('gst_number')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN gst_number TEXT DEFAULT ''`);
  }
  if (!settingsColNames.includes('invoice_footer')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN invoice_footer TEXT DEFAULT 'Thank you for training with us!'`);
  }
  if (!settingsColNames.includes('favicon')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN favicon TEXT DEFAULT ''`);
  }
  if (!settingsColNames.includes('login_bg')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN login_bg TEXT DEFAULT ''`);
  }
  if (!settingsColNames.includes('dashboard_banner')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN dashboard_banner TEXT DEFAULT ''`);
  }
  if (!settingsColNames.includes('setup_completed')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN setup_completed INTEGER DEFAULT 0`);
  }
  if (!settingsColNames.includes('license_key')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN license_key TEXT DEFAULT 'OV-DEMO-9999-XXXX'`);
  }
  if (!settingsColNames.includes('license_status')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN license_status TEXT DEFAULT 'Activated (Demo Mode)'`);
  }
  if (!settingsColNames.includes('license_client_name')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN license_client_name TEXT DEFAULT 'Oviyam Gym Enterprise'`);
  }
  if (!settingsColNames.includes('license_expiry')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN license_expiry TEXT DEFAULT '2030-12-31'`);
  }
  if (!settingsColNames.includes('license_install_date')) {
    await query(`ALTER TABLE gym_settings ADD COLUMN license_install_date TEXT DEFAULT '2026-08-07'`);
  }

  // 4. members trainer_id column
  const memCols = await query("PRAGMA table_info(members)");
  const memColNamesList = memCols.map((col: any) => col.name);
  if (!memColNamesList.includes('trainer_id')) {
    console.log(`Migrating SQLite column: adding trainer_id to members...`);
    await query(`ALTER TABLE members ADD COLUMN trainer_id TEXT DEFAULT NULL`);
  }

  // 5. activity_logs IP column
  const logCols = await query("PRAGMA table_info(activity_logs)");
  const logColNames = logCols.map((col: any) => col.name);
  if (!logColNames.includes('ip_address')) {
    console.log(`Migrating SQLite column: adding ip_address to activity_logs...`);
    await query(`ALTER TABLE activity_logs ADD COLUMN ip_address TEXT DEFAULT '127.0.0.1'`);
  }
}

async function createTables() {
  if (isPostgres) {
    // PostgreSQL Table Creation
    await query(`
      CREATE TABLE IF NOT EXISTS gym_settings (
        id INT PRIMARY KEY DEFAULT 1,
        gym_name VARCHAR(100) NOT NULL DEFAULT 'Oviyam Gym',
        gym_logo TEXT DEFAULT '',
        address TEXT DEFAULT '',
        phone_number VARCHAR(20) DEFAULT '',
        email VARCHAR(100) DEFAULT '',
        theme VARCHAR(20) DEFAULT 'dark',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS members (
        member_id VARCHAR(50) PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        mobile_number VARCHAR(20) UNIQUE NOT NULL,
        gender VARCHAR(20) NOT NULL,
        age INT NOT NULL,
        height NUMERIC(5,2) NOT NULL,
        weight NUMERIC(5,2) NOT NULL,
        join_date DATE NOT NULL,
        membership_plan VARCHAR(100) NOT NULL,
        address TEXT DEFAULT '',
        emergency_contact VARCHAR(50) DEFAULT '',
        medical_notes TEXT DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        
        dob VARCHAR(20) DEFAULT '',
        occupation VARCHAR(100) DEFAULT '',
        blood_group VARCHAR(20) DEFAULT '',
        membership_duration VARCHAR(50) DEFAULT '',
        membership_expiry_date VARCHAR(20) DEFAULT '',
        trainer_assigned VARCHAR(100) DEFAULT '',
        hips NUMERIC(5,2) DEFAULT 0,
        neck NUMERIC(5,2) DEFAULT 0,
        calf NUMERIC(5,2) DEFAULT 0,
        shoulder NUMERIC(5,2) DEFAULT 0,
        goal VARCHAR(100) DEFAULT '',
        fitness_level VARCHAR(50) DEFAULT '',
        injuries TEXT DEFAULT '',
        allergies TEXT DEFAULT '',
        smoking VARCHAR(20) DEFAULT '',
        alcohol VARCHAR(20) DEFAULT '',
        previous_experience TEXT DEFAULT '',
        recommended_workout TEXT DEFAULT '',
        recommended_diet TEXT DEFAULT '',
        member_photo TEXT DEFAULT '',
        body_front TEXT DEFAULT '',
        body_side TEXT DEFAULT '',
        body_back TEXT DEFAULT '',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS progress_history (
        id SERIAL PRIMARY KEY,
        member_id VARCHAR(50) REFERENCES members(member_id) ON DELETE CASCADE,
        recorded_date DATE NOT NULL,
        weight NUMERIC(5,2) NOT NULL,
        height NUMERIC(5,2) NOT NULL,
        chest NUMERIC(5,2) DEFAULT 0,
        waist NUMERIC(5,2) DEFAULT 0,
        left_arm NUMERIC(5,2) DEFAULT 0,
        right_arm NUMERIC(5,2) DEFAULT 0,
        left_thigh NUMERIC(5,2) DEFAULT 0,
        right_thigh NUMERIC(5,2) DEFAULT 0,
        body_fat NUMERIC(5,2) DEFAULT NULL,
        trainer_notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS generated_reports (
        id SERIAL PRIMARY KEY,
        report_name VARCHAR(150) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        filters TEXT DEFAULT '',
        generated_date VARCHAR(20) NOT NULL,
        generated_by VARCHAR(50) NOT NULL,
        report_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        member_id VARCHAR(50) REFERENCES members(member_id) ON DELETE CASCADE,
        recorded_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        time_in VARCHAR(20) DEFAULT '',
        time_out VARCHAR(20) DEFAULT '',
        trainer VARCHAR(50) NOT NULL DEFAULT 'Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_member_date UNIQUE (member_id, recorded_date)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(100) NOT NULL,
        goal VARCHAR(50) NOT NULL,
        fitness_level VARCHAR(50) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        schedule TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS diet_plans (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(100) NOT NULL,
        goal VARCHAR(50) NOT NULL,
        calories INT DEFAULT 0,
        protein INT DEFAULT 0,
        carbohydrates INT DEFAULT 0,
        fats INT DEFAULT 0,
        water_intake NUMERIC(5,2) DEFAULT 0,
        trainer_notes TEXT DEFAULT '',
        meals TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(100) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        description TEXT DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS member_memberships (
        id SERIAL PRIMARY KEY,
        member_id VARCHAR(50) NOT NULL,
        plan_id INT REFERENCES membership_plans(id),
        start_date VARCHAR(20) NOT NULL,
        end_date VARCHAR(20) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        member_id VARCHAR(50) NOT NULL,
        membership_id INT REFERENCES member_memberships(id),
        amount NUMERIC(10,2) NOT NULL,
        discount NUMERIC(10,2) DEFAULT 0,
        final_amount NUMERIC(10,2) NOT NULL,
        paid_amount NUMERIC(10,2) NOT NULL,
        pending_amount NUMERIC(10,2) NOT NULL,
        payment_date VARCHAR(20) NOT NULL,
        payment_mode VARCHAR(20) NOT NULL,
        payment_status VARCHAR(20) NOT NULL,
        transaction_id VARCHAR(100) DEFAULT '',
        remarks TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate PG columns if they do not exist
    const pgCols = [
      { name: 'chest', type: 'NUMERIC(5,2) DEFAULT 0' },
      { name: 'waist', type: 'NUMERIC(5,2) DEFAULT 0' },
      { name: 'left_arm', type: 'NUMERIC(5,2) DEFAULT 0' },
      { name: 'right_arm', type: 'NUMERIC(5,2) DEFAULT 0' },
      { name: 'left_thigh', type: 'NUMERIC(5,2) DEFAULT 0' },
      { name: 'right_thigh', type: 'NUMERIC(5,2) DEFAULT 0' },
      { name: 'body_fat', type: 'NUMERIC(5,2) DEFAULT NULL' },
      { name: 'photo_front', type: "TEXT DEFAULT ''" },
      { name: 'photo_side', type: "TEXT DEFAULT ''" },
      { name: 'photo_back', type: "TEXT DEFAULT ''" }
    ];
    for (const col of pgCols) {
      await query(`ALTER TABLE progress_history ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    }

    const pgMemberCols = [
      { name: 'dob', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'occupation', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'blood_group', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'membership_duration', type: "VARCHAR(50) DEFAULT ''" },
      { name: 'membership_expiry_date', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'trainer_assigned', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'hips', type: "NUMERIC(5,2) DEFAULT 0" },
      { name: 'neck', type: "NUMERIC(5,2) DEFAULT 0" },
      { name: 'calf', type: "NUMERIC(5,2) DEFAULT 0" },
      { name: 'shoulder', type: "NUMERIC(5,2) DEFAULT 0" },
      { name: 'goal', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'fitness_level', type: "VARCHAR(50) DEFAULT ''" },
      { name: 'injuries', type: "TEXT DEFAULT ''" },
      { name: 'allergies', type: "TEXT DEFAULT ''" },
      { name: 'smoking', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'alcohol', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'previous_experience', type: "TEXT DEFAULT ''" },
      { name: 'recommended_workout', type: "TEXT DEFAULT ''" },
      { name: 'recommended_diet', type: "TEXT DEFAULT ''" },
      { name: 'member_photo', type: "TEXT DEFAULT ''" },
      { name: 'body_front', type: "TEXT DEFAULT ''" },
      { name: 'body_side', type: "TEXT DEFAULT ''" },
      { name: 'body_back', type: "TEXT DEFAULT ''" },
      { name: 'workout_plan_id', type: "INT DEFAULT NULL" },
      { name: 'workout_start_date', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'workout_end_date', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'diet_plan_id', type: "INT DEFAULT NULL" },
      { name: 'diet_start_date', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'diet_end_date', type: "VARCHAR(20) DEFAULT ''" },
      { name: 'active_membership_id', type: "INT DEFAULT NULL" }
    ];
    for (const col of pgMemberCols) {
      await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    }

    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT 'purple'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS working_hours VARCHAR(100) DEFAULT '06:00 AM - 10:00 PM'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT '₹'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS backup_settings TEXT DEFAULT ''`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS notification_settings TEXT DEFAULT ''`);
    await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS trainer_id VARCHAR(50)`);

    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS website TEXT DEFAULT ''`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS gst_number TEXT DEFAULT ''`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS invoice_footer TEXT DEFAULT 'Thank you for training with us!'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS favicon TEXT DEFAULT ''`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS login_bg TEXT DEFAULT ''`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS dashboard_banner TEXT DEFAULT ''`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS setup_completed INT DEFAULT 0`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS license_key TEXT DEFAULT 'OV-DEMO-9999-XXXX'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS license_status TEXT DEFAULT 'Activated (Demo Mode)'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS license_client_name TEXT DEFAULT 'Oviyam Gym Enterprise'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS license_expiry TEXT DEFAULT '2030-12-31'`);
    await query(`ALTER TABLE gym_settings ADD COLUMN IF NOT EXISTS license_install_date TEXT DEFAULT CURRENT_DATE`);
    await query(`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50) DEFAULT '127.0.0.1'`);

    await query(`CREATE INDEX IF NOT EXISTS idx_members_name ON members(full_name)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_number)`);

    await query(`
      CREATE TABLE IF NOT EXISTS trainers (
        id SERIAL PRIMARY KEY,
        trainer_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        mobile_number VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        gender VARCHAR(20) NOT NULL,
        experience INT NOT NULL,
        specialization VARCHAR(150) NOT NULL,
        qualification VARCHAR(150) NOT NULL,
        joining_date VARCHAR(20) NOT NULL,
        salary NUMERIC(10,2) DEFAULT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        profile_photo TEXT DEFAULT '',
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        is_read INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        recorded_date VARCHAR(20) NOT NULL,
        recorded_time VARCHAR(20) NOT NULL,
        user_identity VARCHAR(100) NOT NULL,
        action TEXT NOT NULL,
        module VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id SERIAL PRIMARY KEY,
        file_path TEXT NOT NULL,
        size INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    // SQLite Table Creation (Use inline statement runs)
    await query(`
      CREATE TABLE IF NOT EXISTS gym_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1) DEFAULT 1,
        gym_name TEXT NOT NULL DEFAULT 'Oviyam Gym',
        gym_logo TEXT DEFAULT '',
        address TEXT DEFAULT '',
        phone_number TEXT DEFAULT '',
        email TEXT DEFAULT '',
        theme TEXT DEFAULT 'dark',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS members (
        member_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        mobile_number TEXT UNIQUE NOT NULL,
        gender TEXT NOT NULL,
        age INTEGER NOT NULL,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        join_date TEXT NOT NULL,
        membership_plan TEXT NOT NULL,
        address TEXT DEFAULT '',
        emergency_contact TEXT DEFAULT '',
        medical_notes TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Active',

        dob TEXT DEFAULT '',
        occupation TEXT DEFAULT '',
        blood_group TEXT DEFAULT '',
        membership_duration TEXT DEFAULT '',
        membership_expiry_date TEXT DEFAULT '',
        trainer_assigned TEXT DEFAULT '',
        hips REAL DEFAULT 0,
        neck REAL DEFAULT 0,
        calf REAL DEFAULT 0,
        shoulder REAL DEFAULT 0,
        goal TEXT DEFAULT '',
        fitness_level TEXT DEFAULT '',
        injuries TEXT DEFAULT '',
        allergies TEXT DEFAULT '',
        smoking TEXT DEFAULT '',
        alcohol TEXT DEFAULT '',
        previous_experience TEXT DEFAULT '',
        recommended_workout TEXT DEFAULT '',
        recommended_diet TEXT DEFAULT '',
        member_photo TEXT DEFAULT '',
        body_front TEXT DEFAULT '',
        body_side TEXT DEFAULT '',
        body_back TEXT DEFAULT '',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS progress_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT REFERENCES members(member_id) ON DELETE CASCADE,
        recorded_date TEXT NOT NULL,
        weight REAL NOT NULL,
        height REAL NOT NULL,
        chest REAL DEFAULT 0,
        waist REAL DEFAULT 0,
        left_arm REAL DEFAULT 0,
        right_arm REAL DEFAULT 0,
        left_thigh REAL DEFAULT 0,
        right_thigh REAL DEFAULT 0,
        body_fat REAL DEFAULT NULL,
        trainer_notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS generated_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_name TEXT NOT NULL,
        report_type TEXT NOT NULL,
        filters TEXT DEFAULT '',
        generated_date TEXT NOT NULL,
        generated_by TEXT NOT NULL,
        report_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT REFERENCES members(member_id) ON DELETE CASCADE,
        recorded_date TEXT NOT NULL,
        status TEXT NOT NULL,
        time_in TEXT DEFAULT '',
        time_out TEXT DEFAULT '',
        trainer TEXT NOT NULL DEFAULT 'Admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(member_id, recorded_date)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_name TEXT NOT NULL,
        goal TEXT NOT NULL,
        fitness_level TEXT NOT NULL,
        duration TEXT NOT NULL,
        schedule TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS diet_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_name TEXT NOT NULL,
        goal TEXT NOT NULL,
        calories INTEGER DEFAULT 0,
        protein INTEGER DEFAULT 0,
        carbohydrates INTEGER DEFAULT 0,
        fats INTEGER DEFAULT 0,
        water_intake REAL DEFAULT 0,
        trainer_notes TEXT DEFAULT '',
        meals TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_name TEXT NOT NULL,
        duration TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS member_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL,
        plan_id INTEGER REFERENCES membership_plans(id),
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        member_id TEXT NOT NULL,
        membership_id INTEGER REFERENCES member_memberships(id),
        amount REAL NOT NULL,
        discount REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        paid_amount REAL NOT NULL,
        pending_amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_mode TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        transaction_id TEXT DEFAULT '',
        remarks TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS trainers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trainer_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        mobile_number TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        gender TEXT NOT NULL,
        experience INTEGER NOT NULL,
        specialization TEXT NOT NULL,
        qualification TEXT NOT NULL,
        joining_date TEXT NOT NULL,
        salary REAL DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        profile_photo TEXT DEFAULT '',
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recorded_date TEXT NOT NULL,
        recorded_time TEXT NOT NULL,
        user_identity TEXT NOT NULL,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        size INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Success',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await migrateSqliteColumns();

    // Create search optimization indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_members_name ON members(full_name)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_number)`);
  }

  // Ensure default gym settings record exists
  const settingsCount = await query('SELECT COUNT(*) as count FROM gym_settings');
  const countVal = parseInt(settingsCount[0]?.count || settingsCount[0]?.['COUNT(*)'] || '0');
  
  if (countVal === 0) {
    if (isPostgres) {
      await query(`
        INSERT INTO gym_settings (id, gym_name, theme) 
        VALUES (1, 'Oviyam Gym', 'dark')
        ON CONFLICT (id) DO NOTHING
      `);
    } else {
      await query(`
        INSERT OR IGNORE INTO gym_settings (id, gym_name, theme) 
        VALUES (1, 'Oviyam Gym', 'dark')
      `);
    }
  }

  // Seed demo data dynamically to avoid circular dependencies
  const { seedDemoData } = require('./seeder');
  await seedDemoData();
}
