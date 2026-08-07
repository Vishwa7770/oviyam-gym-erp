import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const isPostgres = process.env.DATABASE_URL ? true : false;

// GET /api/workouts - Fetch all workout plans (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await query('SELECT * FROM workout_plans ORDER BY id DESC');
    return res.json(plans);
  } catch (error) {
    console.error('Fetch workouts error:', error);
    return res.status(500).json({ error: 'Failed to fetch workout plans' });
  }
});

// POST /api/workouts - Create a new workout plan (Protected)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan_name, goal, fitness_level, duration, schedule } = req.body;

    if (!plan_name || !goal || !fitness_level || !duration || !schedule) {
      return res.status(400).json({ error: 'All fields (name, goal, level, duration, schedule) are required.' });
    }

    const scheduleStr = typeof schedule === 'string' ? schedule : JSON.stringify(schedule);
    let insertedId: number | null = null;

    if (isPostgres) {
      const result = await query(
        `INSERT INTO workout_plans (plan_name, goal, fitness_level, duration, schedule) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [plan_name.trim(), goal, fitness_level, duration, scheduleStr]
      );
      insertedId = result[0]?.id || null;
    } else {
      await query(
        `INSERT INTO workout_plans (plan_name, goal, fitness_level, duration, schedule) 
         VALUES ($1, $2, $3, $4, $5)`,
        [plan_name.trim(), goal, fitness_level, duration, scheduleStr]
      );
      const rowidRes = await query('SELECT last_insert_rowid() AS id');
      insertedId = rowidRes[0]?.id || null;
    }

    return res.status(201).json({ 
      message: 'Workout plan created successfully',
      planId: insertedId 
    });
  } catch (error) {
    console.error('Create workout error:', error);
    return res.status(500).json({ error: 'Failed to create workout plan' });
  }
});

// PUT /api/workouts/:id - Update an existing workout plan (Protected)
router.put('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { plan_name, goal, fitness_level, duration, schedule } = req.body;

    if (!plan_name || !goal || !fitness_level || !duration || !schedule) {
      return res.status(400).json({ error: 'All fields (name, goal, level, duration, schedule) are required.' });
    }

    const scheduleStr = typeof schedule === 'string' ? schedule : JSON.stringify(schedule);

    await query(
      `UPDATE workout_plans 
       SET plan_name = $1, goal = $2, fitness_level = $3, duration = $4, schedule = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6`,
      [plan_name.trim(), goal, fitness_level, duration, scheduleStr, id]
    );

    return res.json({ message: 'Workout plan updated successfully' });
  } catch (error) {
    console.error('Update workout error:', error);
    return res.status(500).json({ error: 'Failed to update workout plan' });
  }
});

// DELETE /api/workouts/:id - Delete a workout plan (Protected)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM workout_plans WHERE id = $1', [id]);
    // Also reset any members assigned to this workout plan
    await query('UPDATE members SET workout_plan_id = NULL, workout_start_date = NULL, workout_end_date = NULL WHERE workout_plan_id = $1', [id]);
    return res.json({ message: 'Workout plan deleted successfully' });
  } catch (error) {
    console.error('Delete workout error:', error);
    return res.status(500).json({ error: 'Failed to delete workout plan' });
  }
});

export default router;
