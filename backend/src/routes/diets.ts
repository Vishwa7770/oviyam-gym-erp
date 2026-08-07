import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const isPostgres = process.env.DATABASE_URL ? true : false;

// GET /api/diets - Fetch all diet plans (Protected)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await query('SELECT * FROM diet_plans ORDER BY id DESC');
    return res.json(plans);
  } catch (error) {
    console.error('Fetch diets error:', error);
    return res.status(500).json({ error: 'Failed to fetch diet plans' });
  }
});

// POST /api/diets - Create a new diet plan (Protected)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan_name, goal, calories, protein, carbohydrates, fats, water_intake, trainer_notes, meals } = req.body;

    if (!plan_name || !goal || meals === undefined) {
      return res.status(400).json({ error: 'Plan name, goal, and meals split are required.' });
    }

    const mealsStr = typeof meals === 'string' ? meals : JSON.stringify(meals);
    let insertedId: number | null = null;

    if (isPostgres) {
      const result = await query(
        `INSERT INTO diet_plans (plan_name, goal, calories, protein, carbohydrates, fats, water_intake, trainer_notes, meals) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          plan_name.trim(),
          goal,
          parseInt(String(calories || 0)),
          parseInt(String(protein || 0)),
          parseInt(String(carbohydrates || 0)),
          parseInt(String(fats || 0)),
          parseFloat(String(water_intake || 0)),
          trainer_notes || '',
          mealsStr
        ]
      );
      insertedId = result[0]?.id || null;
    } else {
      await query(
        `INSERT INTO diet_plans (plan_name, goal, calories, protein, carbohydrates, fats, water_intake, trainer_notes, meals) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          plan_name.trim(),
          goal,
          parseInt(String(calories || 0)),
          parseInt(String(protein || 0)),
          parseInt(String(carbohydrates || 0)),
          parseInt(String(fats || 0)),
          parseFloat(String(water_intake || 0)),
          trainer_notes || '',
          mealsStr
        ]
      );
      const rowidRes = await query('SELECT last_insert_rowid() AS id');
      insertedId = rowidRes[0]?.id || null;
    }

    return res.status(201).json({ 
      message: 'Diet plan created successfully',
      planId: insertedId 
    });
  } catch (error) {
    console.error('Create diet error:', error);
    return res.status(500).json({ error: 'Failed to create diet plan' });
  }
});

// PUT /api/diets/:id - Update an existing diet plan (Protected)
router.put('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { plan_name, goal, calories, protein, carbohydrates, fats, water_intake, trainer_notes, meals } = req.body;

    if (!plan_name || !goal || meals === undefined) {
      return res.status(400).json({ error: 'Plan name, goal, and meals split are required.' });
    }

    const mealsStr = typeof meals === 'string' ? meals : JSON.stringify(meals);

    await query(
      `UPDATE diet_plans 
       SET plan_name = $1, goal = $2, calories = $3, protein = $4, carbohydrates = $5, fats = $6, water_intake = $7, trainer_notes = $8, meals = $9, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $10`,
      [
        plan_name.trim(),
        goal,
        parseInt(String(calories || 0)),
        parseInt(String(protein || 0)),
        parseInt(String(carbohydrates || 0)),
        parseInt(String(fats || 0)),
        parseFloat(String(water_intake || 0)),
        trainer_notes || '',
        mealsStr,
        id
      ]
    );

    return res.json({ message: 'Diet plan updated successfully' });
  } catch (error) {
    console.error('Update diet error:', error);
    return res.status(500).json({ error: 'Failed to update diet plan' });
  }
});

// DELETE /api/diets/:id - Delete a diet plan (Protected)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM diet_plans WHERE id = $1', [id]);
    // Also reset any members assigned to this diet plan
    await query('UPDATE members SET diet_plan_id = NULL, diet_start_date = NULL, diet_end_date = NULL WHERE diet_plan_id = $1', [id]);
    return res.json({ message: 'Diet plan deleted successfully' });
  } catch (error) {
    console.error('Delete diet error:', error);
    return res.status(500).json({ error: 'Failed to delete diet plan' });
  }
});

export default router;
