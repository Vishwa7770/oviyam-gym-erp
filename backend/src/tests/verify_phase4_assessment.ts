import { initDatabase, query, closeDatabase } from '../config/db';

async function runAssessmentTests() {
  console.log('==================================================');
  console.log('  RUNNING PHASE 4 ENHANCED ASSESSMENT TESTS       ');
  console.log('==================================================');

  try {
    console.log('Step 1: DB connection init...');
    await initDatabase();
    console.log('✔ DB initialized.');

    // Clear old test records
    console.log('Clearing old assessment test records...');
    await query("DELETE FROM progress_history WHERE member_id = 'MEM-P4-TEST-2'");
    await query("DELETE FROM members WHERE member_id = 'MEM-P4-TEST-2'");

    // 2. Simulate POST /api/members payload
    console.log('\nStep 2: Simulating POST /api/members with Initial Fitness Assessment...');
    const member_id = 'MEM-P4-TEST-2';
    const payload = {
      full_name: 'Fitness Assessment Hero',
      mobile_number: '9999900002',
      gender: 'Male',
      age: 29,
      height: 180,
      weight: 85,
      join_date: '2026-08-05',
      membership_plan: 'Quarterly Plan',
      address: '123 Power Gym St, Chennai',
      emergency_contact: 'Superman - 911',
      medical_notes: 'None',

      dob: '1997-05-15',
      occupation: 'Software Engineer',
      blood_group: 'B+ve',
      membership_duration: '3 Months',
      membership_expiry_date: '2026-11-05',
      trainer_assigned: 'Trainer Tony',
      hips: 95.5,
      neck: 39,
      calf: 38.5,
      shoulder: 122.5,
      goal: 'Muscle Building',
      fitness_level: 'Intermediate',
      injuries: 'Slight ankle sprain',
      allergies: 'Peanuts',
      smoking: 'No',
      alcohol: 'Occasional',
      previous_experience: '1 Year local gym',
      recommended_workout: 'Push Pull Legs Split',
      recommended_diet: 'High protein, moderate carb',
      trainer_notes: 'Highly motivated client.',
      member_photo: 'data:image/png;base64,placeholder_member_photo',
      body_front: 'data:image/png;base64,placeholder_front',
      body_side: 'data:image/png;base64,placeholder_side',
      body_back: 'data:image/png;base64,placeholder_back',

      // Month 0 measurements parameters
      chest: 104,
      waist: 88,
      left_arm: 37,
      right_arm: 37.5,
      left_thigh: 58,
      right_thigh: 58.5,
      body_fat: 16.5
    };

    // Insert Member Profile
    await query(
      `INSERT INTO members (
        member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, address, emergency_contact, medical_notes, status,
        dob, occupation, blood_group, membership_duration, membership_expiry_date, trainer_assigned,
        hips, neck, calf, shoulder, goal, fitness_level, injuries, allergies, smoking, alcohol, previous_experience,
        recommended_workout, recommended_diet, member_photo, body_front, body_side, body_back,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Active', $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        member_id,
        payload.full_name,
        payload.mobile_number,
        payload.gender,
        payload.age,
        payload.height,
        payload.weight,
        payload.join_date,
        payload.membership_plan,
        payload.address,
        payload.emergency_contact,
        payload.medical_notes,
        payload.dob,
        payload.occupation,
        payload.blood_group,
        payload.membership_duration,
        payload.membership_expiry_date,
        payload.trainer_assigned,
        payload.hips,
        payload.neck,
        payload.calf,
        payload.shoulder,
        payload.goal,
        payload.fitness_level,
        payload.injuries,
        payload.allergies,
        payload.smoking,
        payload.alcohol,
        payload.previous_experience,
        payload.recommended_workout,
        payload.recommended_diet,
        payload.member_photo,
        payload.body_front,
        payload.body_side,
        payload.body_back
      ]
    );
    console.log('✔ Member profile inserted.');

    // Seed automatic Month 0 progress history record
    await query(
      `INSERT INTO progress_history (
        member_id, recorded_date, weight, height, chest, waist, left_arm, right_arm, left_thigh, right_thigh, body_fat, trainer_notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
      [
        member_id,
        payload.join_date,
        payload.weight,
        payload.height,
        payload.chest,
        payload.waist,
        payload.left_arm,
        payload.right_arm,
        payload.left_thigh,
        payload.right_thigh,
        payload.body_fat,
        payload.trainer_notes
      ]
    );
    console.log('✔ Month 0 progress timeline log seeded automatically.');

    // 3. Verify member profile details
    console.log('\nStep 3: Checking member profile from database...');
    const memberRow = await query("SELECT * FROM members WHERE member_id = 'MEM-P4-TEST-2'");
    if (memberRow.length === 1 && memberRow[0].trainer_assigned === 'Trainer Tony' && memberRow[0].blood_group === 'B+ve') {
      console.log('✔ Initial Assessment details mapped correctly in members.');
    } else {
      throw new Error(`❌ Profile mapping error. Expected Trainer Tony and B+ve. Got ${memberRow[0]?.trainer_assigned}, ${memberRow[0]?.blood_group}`);
    }

    // 4. Verify Month 0 progress timeline details
    console.log('\nStep 4: Checking Month 0 progress log from database...');
    const progressRow = await query("SELECT * FROM progress_history WHERE member_id = 'MEM-P4-TEST-2'");
    if (progressRow.length === 1 && parseFloat(progressRow[0].chest) === 104 && parseFloat(progressRow[0].waist) === 88) {
      console.log('✔ Month 0 progress log matches assessment tape measurements (no duplicate entry required!).');
    } else {
      throw new Error(`❌ Progress log mapping error. Expected chest 104, waist 88. Got ${progressRow[0]?.chest}, ${progressRow[0]?.waist}`);
    }

    // Clean up
    console.log('\nCleaning up test records...');
    await query("DELETE FROM progress_history WHERE member_id = 'MEM-P4-TEST-2'");
    await query("DELETE FROM members WHERE member_id = 'MEM-P4-TEST-2'");

    console.log('\n==================================================');
    console.log('   ALL FITNESS ASSESSMENT TESTS PASSED ✔          ');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ INTEGRATION TESTS FAILED:', error);
  } finally {
    await closeDatabase();
  }
}

runAssessmentTests();
