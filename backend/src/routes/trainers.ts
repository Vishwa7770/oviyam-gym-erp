import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logActivity } from './activity_logs';

const router = Router();
const isPostgres = process.env.DATABASE_URL ? true : false;

// Generate unique Trainer ID: TRN-XXXX
async function generateTrainerId(): Promise<string> {
  const countRes = await query("SELECT COUNT(*) AS count FROM trainers");
  const count = parseInt(countRes[0]?.count || countRes[0]?.['COUNT(*)'] || '0');
  const sequence = String(1001 + count);
  return `TRN-${sequence}`;
}

// GET /api/trainers - List all trainers (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trainersList = await query('SELECT * FROM trainers ORDER BY id DESC');
    
    // Fetch count of assigned members per trainer
    const enrichedTrainers = await Promise.all(trainersList.map(async (t) => {
      const assignedCountRes = await query(
        'SELECT COUNT(*) as count FROM members WHERE trainer_id = $1', 
        [t.trainer_id]
      );
      const count = parseInt(assignedCountRes[0]?.count || assignedCountRes[0]?.['COUNT(*)'] || '0');
      return { ...t, assigned_members_count: count };
    }));

    return res.json(enrichedTrainers);
  } catch (error) {
    console.error('Fetch trainers list error:', error);
    return res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

// GET /api/trainers/:trainerId - Detailed trainer profile & stats (Protected)
router.get('/:trainerId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trainerId } = req.params;
    const trainers = await query('SELECT * FROM trainers WHERE trainer_id = $1', [trainerId]);
    if (trainers.length === 0) {
      return res.status(404).json({ error: 'Trainer not found' });
    }
    const trainer = trainers[0];

    // Stats
    const totalMembersRes = await query('SELECT COUNT(*) as count FROM members WHERE trainer_id = $1', [trainerId]);
    const totalMembers = parseInt(totalMembersRes[0]?.count || totalMembersRes[0]?.['COUNT(*)'] || '0');

    const activeMembersRes = await query("SELECT COUNT(*) as count FROM members WHERE trainer_id = $1 AND status = 'Active'", [trainerId]);
    const activeMembers = parseInt(activeMembersRes[0]?.count || activeMembersRes[0]?.['COUNT(*)'] || '0');

    // Workout split and diet plan counts
    const workoutsRes = await query('SELECT COUNT(*) as count FROM workout_plans');
    const workoutsCount = parseInt(workoutsRes[0]?.count || workoutsRes[0]?.['COUNT(*)'] || '0');

    const dietsRes = await query('SELECT COUNT(*) as count FROM diet_plans');
    const dietsCount = parseInt(dietsRes[0]?.count || dietsRes[0]?.['COUNT(*)'] || '0');

    // Assigned members listing
    const membersList = await query(
      'SELECT member_id, full_name, mobile_number, status, membership_plan, join_date FROM members WHERE trainer_id = $1',
      [trainerId]
    );

    return res.json({
      trainer,
      stats: {
        totalMembers,
        activeMembers,
        workoutPlansCreated: workoutsCount,
        dietPlansCreated: dietsCount
      },
      members: membersList
    });
  } catch (error) {
    console.error('Fetch trainer profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch trainer profile details' });
  }
});

// POST /api/trainers - Create a new trainer (Protected, Admin Only)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      full_name, mobile_number, email, gender, experience, specialization, 
      qualification, joining_date, salary, status, profile_photo, password 
    } = req.body;

    if (!full_name || !mobile_number || !email || !experience || !password) {
      return res.status(400).json({ error: 'Full name, phone, email, experience, and password are required.' });
    }

    const trainerId = await generateTrainerId();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await query(
      `INSERT INTO trainers (
        trainer_id, full_name, mobile_number, email, gender, experience, specialization, 
        qualification, joining_date, salary, status, profile_photo, password_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        trainerId,
        full_name.trim(),
        mobile_number.trim(),
        email.toLowerCase().trim(),
        gender || 'Male',
        parseInt(experience),
        specialization || '',
        qualification || '',
        joining_date || new Date().toISOString().split('T')[0],
        salary ? parseFloat(String(salary)) : null,
        status || 'Active',
        profile_photo || '',
        passwordHash
      ]
    );

    await logActivity(req.user?.username || 'Admin', `Added Trainer ${full_name} (${trainerId})`, 'Trainer');

    return res.status(201).json({ message: 'Trainer created successfully', trainerId });
  } catch (error: any) {
    console.error('Create trainer error:', error);
    if (error.message?.includes('UNIQUE') || error.code === '23505') {
      return res.status(400).json({ error: 'Mobile number or email already exists for another trainer.' });
    }
    return res.status(500).json({ error: 'Failed to create trainer record' });
  }
});

// PUT /api/trainers/:trainerId - Edit trainer (Protected, Admin Only)
router.put('/:trainerId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trainerId } = req.params;
    const { 
      full_name, mobile_number, email, gender, experience, specialization, 
      qualification, joining_date, salary, status, profile_photo, password 
    } = req.body;

    if (!full_name || !mobile_number || !email || !experience) {
      return res.status(400).json({ error: 'Full name, phone, email, and experience are required.' });
    }

    let passwordUpdateClause = '';
    const params = [
      full_name.trim(), mobile_number.trim(), email.toLowerCase().trim(), gender || 'Male',
      parseInt(experience), specialization || '', qualification || '', joining_date || '',
      salary ? parseFloat(String(salary)) : null, status || 'Active', profile_photo || '', trainerId
    ];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      params.push(passwordHash);
      passwordUpdateClause = `, password_hash = $13`;
    }

    await query(
      `UPDATE trainers 
       SET full_name = $1, mobile_number = $2, email = $3, gender = $4, experience = $5, 
           specialization = $6, qualification = $7, joining_date = $8, salary = $9, 
           status = $10, profile_photo = $11 ${passwordUpdateClause}
       WHERE trainer_id = $12`,
      params
    );

    await logActivity(req.user?.username || 'Admin', `Updated Trainer ${full_name} (${trainerId})`, 'Trainer');

    return res.json({ message: 'Trainer updated successfully' });
  } catch (error) {
    console.error('Update trainer error:', error);
    return res.status(500).json({ error: 'Failed to update trainer details' });
  }
});

// PUT /api/trainers/:trainerId/assign - Assign members to trainer (Protected, Admin Only)
router.put('/:trainerId/assign', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trainerId } = req.params;
    const { member_ids } = req.body; // Expect array of member_ids

    if (!Array.isArray(member_ids)) {
      return res.status(400).json({ error: 'Member IDs must be an array.' });
    }

    // Get Trainer Details to set trainer_assigned text
    const trainerRes = await query('SELECT full_name FROM trainers WHERE trainer_id = $1', [trainerId]);
    const trainerName = trainerRes[0]?.full_name || '';

    // Clear previous assignments for this trainer
    await query("UPDATE members SET trainer_id = NULL, trainer_assigned = '' WHERE trainer_id = $1", [trainerId]);

    // Assign new members
    if (member_ids.length > 0) {
      for (const mId of member_ids) {
        await query(
          "UPDATE members SET trainer_id = $1, trainer_assigned = $2 WHERE member_id = $3",
          [trainerId, trainerName, mId]
        );
      }
    }

    await logActivity(req.user?.username || 'Admin', `Assigned ${member_ids.length} members to Trainer (${trainerId})`, 'Trainer');

    return res.json({ message: `Successfully assigned ${member_ids.length} members.` });
  } catch (error) {
    console.error('Assign members error:', error);
    return res.status(500).json({ error: 'Failed to assign members to trainer' });
  }
});

// DELETE /api/trainers/:trainerId - Delete trainer (Protected, Admin Only)
router.delete('/:trainerId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trainerId } = req.params;

    // Remove trainer links from members
    await query("UPDATE members SET trainer_id = NULL, trainer_assigned = '' WHERE trainer_id = $1", [trainerId]);

    // Delete trainer
    await query('DELETE FROM trainers WHERE trainer_id = $1', [trainerId]);

    await logActivity(req.user?.username || 'Admin', `Deleted Trainer (${trainerId})`, 'Trainer');

    return res.json({ message: 'Trainer deleted successfully.' });
  } catch (error) {
    console.error('Delete trainer error:', error);
    return res.status(500).json({ error: 'Failed to delete trainer.' });
  }
});

export default router;
