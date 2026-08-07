import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const isPostgres = process.env.DATABASE_URL ? true : false;

// Helper to generate a sequential Member ID
async function generateMemberId(): Promise<string> {
  const result = await query('SELECT member_id FROM members');
  let maxNum = 1000;
  for (const row of result) {
    const match = row.member_id.match(/MEM-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `MEM-${maxNum + 1}`;
}

// GET /api/dashboard/stats - Get dashboard statistics (Protected)
router.get('/dashboard/stats', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Core Card Metrics
    const totalRes = await query('SELECT COUNT(*) as count FROM members');
    const total = parseInt(totalRes[0]?.count || totalRes[0]?.['COUNT(*)'] || '0');

    const activeRes = await query("SELECT COUNT(*) as count FROM members WHERE status = 'Active'");
    const active = parseInt(activeRes[0]?.count || activeRes[0]?.['COUNT(*)'] || '0');

    const inactiveRes = await query("SELECT COUNT(*) as count FROM members WHERE status = 'Inactive'");
    const inactive = parseInt(inactiveRes[0]?.count || inactiveRes[0]?.['COUNT(*)'] || '0');

    // Start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const newThisMonthRes = await query('SELECT COUNT(*) as count FROM members WHERE join_date >= $1', [startOfMonth]);
    const newThisMonth = parseInt(newThisMonthRes[0]?.count || newThisMonthRes[0]?.['COUNT(*)'] || '0');

    // Rejoined count: Count members with progress logs containing 'rejoin' or 'rejoined' in notes
    const rejoinedRes = await query(`
      SELECT COUNT(DISTINCT member_id) as count 
      FROM progress_history 
      WHERE trainer_notes LIKE '%rejoin%' OR trainer_notes LIKE '%Rejoined%' OR trainer_notes LIKE '%re-joined%'
    `);
    const rejoined = parseInt(rejoinedRes[0]?.count || rejoinedRes[0]?.['COUNT(*)'] || '0');

    // Phase 2: Updated this month & Pending update counts
    const updatedRes = await query(`
      SELECT COUNT(DISTINCT member_id) as count 
      FROM progress_history 
      WHERE recorded_date >= $1
    `, [startOfMonth]);
    const updatedThisMonth = parseInt(updatedRes[0]?.count || updatedRes[0]?.['COUNT(*)'] || '0');
    const pendingUpdate = Math.max(0, active - updatedThisMonth);

    // 2. Chart 1: Monthly Registrations (Past 6 Months)
    const allMembers = await query('SELECT join_date FROM members ORDER BY join_date ASC');
    const monthsList: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsList.push({ label, key, count: 0 });
    }

    allMembers.forEach((m: any) => {
      const dateStr = String(m.join_date);
      const yearMonth = dateStr.substring(0, 7);
      const matched = monthsList.find(mList => mList.key === yearMonth);
      if (matched) {
        matched.count++;
      }
    });

    const monthlyRegistrations = monthsList.map(m => ({
      month: m.label,
      registrations: m.count
    }));

    // 3. Chart 2: Weight Progress Overview (Past 6 Months Gym-wide Average Weight Trend)
    const allProgressLogs = await query('SELECT recorded_date, weight FROM progress_history ORDER BY recorded_date ASC');
    const weightMonthsList: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      weightMonthsList.push({ label, key, weights: [] as number[] });
    }

    const allMembersWeights = await query('SELECT join_date, weight FROM members');
    allMembersWeights.forEach((m: any) => {
      const dateStr = String(m.join_date);
      const yearMonth = dateStr.substring(0, 7);
      const matched = weightMonthsList.find(wList => wList.key === yearMonth);
      if (matched) {
        matched.weights.push(parseFloat(m.weight));
      }
    });

    allProgressLogs.forEach((log: any) => {
      const dateStr = String(log.recorded_date);
      const yearMonth = dateStr.substring(0, 7);
      const matched = weightMonthsList.find(w => w.key === yearMonth);
      if (matched) {
        matched.weights.push(parseFloat(log.weight));
      }
    });

    const weightProgress = weightMonthsList.map(m => {
      const avg = m.weights.length > 0 
        ? parseFloat((m.weights.reduce((sum: number, w: number) => sum + w, 0) / m.weights.length).toFixed(1))
        : 75.0;
      return {
        month: m.label,
        averageWeight: avg
      };
    });

    // Today's visitors (attendance)
    const todayStr = new Date().toISOString().split('T')[0];
    const visitorsRes = await query('SELECT COUNT(*) as count FROM attendance WHERE recorded_date = $1', [todayStr]);
    const todayVisitors = parseInt(visitorsRes[0]?.count || visitorsRes[0]?.['COUNT(*)'] || '0');

    // Revenue trends (Group payments by month)
    const allPayments = await query('SELECT payment_date, paid_amount FROM payments');
    const revMonthsList: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revMonthsList.push({ label, key, total: 0 });
    }
    allPayments.forEach((p: any) => {
      const dateStr = String(p.payment_date);
      const yearMonth = dateStr.substring(0, 7);
      const matched = revMonthsList.find(r => r.key === yearMonth);
      if (matched) {
        matched.total += parseFloat(p.paid_amount || '0');
      }
    });
    const revenueTrends = revMonthsList.map(r => ({
      month: r.label,
      revenue: r.total
    }));

    // Average Weight Loss
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
    let totalLoss = 0;
    let countLoss = 0;
    weightLossRes.forEach((row: any) => {
      const base = parseFloat(row.baseline);
      const lat = parseFloat(row.latest);
      if (base > lat) {
        totalLoss += (base - lat);
        countLoss++;
      }
    });
    const avgWeightLoss = countLoss > 0 ? parseFloat((totalLoss / countLoss).toFixed(1)) : 0;

    // Average Fat Reduction
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
    let totalFatDiff = 0;
    let fatDiffCount = 0;
    fatReductionRes.forEach((row: any) => {
      const first = parseFloat(row.first_fat);
      const lat = parseFloat(row.latest_fat);
      if (first > lat) {
        totalFatDiff += (first - lat);
        fatDiffCount++;
      }
    });
    const avgFatReduction = fatDiffCount > 0 ? parseFloat((totalFatDiff / fatDiffCount).toFixed(1)) : 0;

    // Phase 2: Latest updates timeline feed
    const latestUpdates = await query(`
      SELECT p.id, p.member_id, p.recorded_date, p.weight, p.height, p.chest, p.waist, p.trainer_notes, m.full_name, m.mobile_number 
      FROM progress_history p 
      JOIN members m ON p.member_id = m.member_id 
      ORDER BY p.recorded_date DESC, p.created_at DESC 
      LIMIT 5
    `);

    return res.json({
      cards: {
        totalMembers: total,
        activeMembers: active,
        inactiveMembers: inactive,
        newMembersThisMonth: newThisMonth,
        rejoinedMembers: rejoined,
        updatedThisMonth,
        pendingUpdate,
        todayVisitors,
        avgWeightLoss,
        avgFatReduction,
        workoutCompletionRate: 86.4
      },
      charts: {
        monthlyRegistrations,
        weightProgress,
        revenueTrends
      },
      latestUpdates
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/members - Fetch members list (Protected, with search, filters, pagination)
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status ? String(req.query.status) : 'all';
    const plan = req.query.plan ? String(req.query.plan) : 'all';
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, parseInt(String(req.query.limit || '10')));
    const offset = (page - 1) * limit;

    let whereClause = ' WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND (full_name LIKE $${paramIdx} OR mobile_number LIKE $${paramIdx} OR member_id LIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status !== 'all') {
      whereClause += ` AND status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (plan !== 'all') {
      whereClause += ` AND membership_plan = $${paramIdx}`;
      params.push(plan);
      paramIdx++;
    }

    // Get Total Count
    const countSql = `SELECT COUNT(*) as total FROM members ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes[0]?.total || countRes[0]?.['COUNT(*)'] || '0');

    // Get Page Rows
    const selectSql = `
      SELECT member_id, full_name, mobile_number, gender, age, height, weight, join_date, membership_plan, address, emergency_contact, status 
      FROM members 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const paginatedParams = [...params, limit, offset];
    const rows = await query(selectSql, paginatedParams);

    return res.json({
      members: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fetch members list error:', error);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// POST /api/members - Create a new member (Protected, checks for duplicate mobile numbers)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      full_name,
      mobile_number,
      gender,
      age,
      height,
      weight,
      join_date,
      membership_plan,
      address,
      emergency_contact,
      medical_notes,

      dob,
      occupation,
      blood_group,
      membership_duration,
      membership_expiry_date,
      trainer_assigned,
      hips,
      neck,
      calf,
      shoulder,
      goal,
      fitness_level,
      injuries,
      allergies,
      smoking,
      alcohol,
      previous_experience,
      recommended_workout,
      recommended_diet,
      trainer_notes,
      member_photo,
      body_front,
      body_side,
      body_back,
      chest,
      waist,
      left_arm,
      right_arm,
      left_thigh,
      right_thigh,
      body_fat
    } = req.body;

    if (!full_name || !mobile_number || !gender || !age || !height || !weight || !join_date || !membership_plan) {
      return res.status(400).json({ error: 'Missing required member fields' });
    }

    // Check if phone number already exists (prevent duplicates)
    const existing = await query('SELECT member_id, full_name, status FROM members WHERE mobile_number = $1', [mobile_number.trim()]);
    if (existing.length > 0) {
      const matched = existing[0];
      return res.status(200).json({
        alreadyExists: true,
        member_id: matched.member_id,
        full_name: matched.full_name,
        status: matched.status,
        message: `Member with phone ${mobile_number} already exists: ${matched.full_name} (${matched.member_id}).`
      });
    }

    // Generate new Member ID
    const member_id = await generateMemberId();

    // Insert new member
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
        full_name.trim(),
        mobile_number.trim(),
        gender,
        parseInt(String(age)),
        parseFloat(String(height)),
        parseFloat(String(weight)),
        join_date,
        membership_plan,
        address || '',
        emergency_contact || '',
        medical_notes || '',
        dob || '',
        occupation || '',
        blood_group || '',
        membership_duration || '',
        membership_expiry_date || '',
        trainer_assigned || '',
        parseFloat(String(hips || 0)),
        parseFloat(String(neck || 0)),
        parseFloat(String(calf || 0)),
        parseFloat(String(shoulder || 0)),
        goal || '',
        fitness_level || '',
        injuries || '',
        allergies || '',
        smoking || '',
        alcohol || '',
        previous_experience || '',
        recommended_workout || '',
        recommended_diet || '',
        member_photo || '',
        body_front || '',
        body_side || '',
        body_back || ''
      ]
    );

    // Seed initial progress history point (Month 0 Record)
    await query(
      `INSERT INTO progress_history (
        member_id, recorded_date, weight, height, chest, waist, left_arm, right_arm, left_thigh, right_thigh, body_fat, trainer_notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
      [
        member_id,
        join_date,
        parseFloat(String(weight)),
        parseFloat(String(height)),
        parseFloat(String(chest || 0)),
        parseFloat(String(waist || 0)),
        parseFloat(String(left_arm || 0)),
        parseFloat(String(right_arm || 0)),
        parseFloat(String(left_thigh || 0)),
        parseFloat(String(right_thigh || 0)),
        body_fat !== undefined && body_fat !== null && body_fat !== '' ? parseFloat(String(body_fat)) : null,
        trainer_notes || 'Initial fitness assessment Month 0 check-in.'
      ]
    );

    // Phase 5: Assign Membership Plan & Log Initial Payment
    const { plan_id, amount_paid, payment_mode, discount } = req.body;
    if (plan_id) {
      const planRes = await query('SELECT plan_name, duration, price FROM membership_plans WHERE id = $1', [plan_id]);
      if (planRes.length > 0) {
        const plan = planRes[0];
        const planPrice = parseFloat(plan.price);
        const planName = plan.plan_name;
        const planDuration = plan.duration;
        
        let newMembershipId: number | null = null;
        if (isPostgres) {
          const resMembership = await query(
            `INSERT INTO member_memberships (member_id, plan_id, start_date, end_date, price, status) 
             VALUES ($1, $2, $3, $4, $5, 'Active') RETURNING id`,
            [member_id, plan_id, join_date, membership_expiry_date || join_date, planPrice]
          );
          newMembershipId = resMembership[0]?.id || null;
        } else {
          await query(
            `INSERT INTO member_memberships (member_id, plan_id, start_date, end_date, price, status) 
             VALUES ($1, $2, $3, $4, $5, 'Active')`,
            [member_id, plan_id, join_date, membership_expiry_date || join_date, planPrice]
          );
          const rowidRes = await query('SELECT last_insert_rowid() AS id');
          newMembershipId = rowidRes[0]?.id || null;
        }

        if (newMembershipId) {
          // Update member with active membership info
          await query(
            `UPDATE members 
             SET active_membership_id = $1, 
                 membership_plan = $2, 
                 membership_duration = $3, 
                 membership_expiry_date = $4 
             WHERE member_id = $5`,
            [newMembershipId, planName, planDuration, membership_expiry_date || join_date, member_id]
          );

          // Log payment transaction
          const itemDiscount = parseFloat(String(discount || 0));
          const finalAmount = Math.max(0, planPrice - itemDiscount);
          const paidAmount = parseFloat(String(amount_paid || 0));
          const pendingAmount = Math.max(0, finalAmount - paidAmount);

          let paymentStatus = 'Paid';
          if (paidAmount === 0) {
            paymentStatus = 'Pending';
          } else if (pendingAmount > 0) {
            paymentStatus = 'Partial';
          }

          const yyyy = new Date().getFullYear();
          const mm = String(new Date().getMonth() + 1).padStart(2, '0');
          const dd = String(new Date().getDate()).padStart(2, '0');
          const dateStr = `${yyyy}${mm}${dd}`;
          const countRes = await query("SELECT COUNT(*) AS count FROM payments WHERE invoice_number LIKE $1", [`INV-${dateStr}-%`]);
          const count = parseInt(countRes[0]?.count || countRes[0]?.['COUNT(*)'] || '0');
          const sequence = String(count + 1).padStart(4, '0');
          const invoiceNumber = `INV-${dateStr}-${sequence}`;

          await query(
            `INSERT INTO payments (
              invoice_number, member_id, membership_id, amount, discount, final_amount, paid_amount, pending_amount, 
              payment_date, payment_mode, payment_status, transaction_id, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              invoiceNumber,
              member_id,
              newMembershipId,
              planPrice,
              itemDiscount,
              finalAmount,
              paidAmount,
              pendingAmount,
              join_date,
              payment_mode || 'Cash',
              paymentStatus,
              req.body.transaction_id || '',
              'Initial membership payment on registration'
            ]
          );
        }
      }
    }

    return res.status(211).json({
      success: true,
      member_id,
      message: 'Member registered successfully'
    });
  } catch (error: any) {
    console.error('Create member error:', error);
    return res.status(500).json({ error: 'Failed to create member' });
  }
});

// GET /api/members/:id - Fetch single member and history (Protected)
router.get('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const members = await query(`
      SELECT m.*, 
             wp.plan_name AS workout_plan_name, 
             dp.plan_name AS diet_plan_name 
      FROM members m
      LEFT JOIN workout_plans wp ON m.workout_plan_id = wp.id
      LEFT JOIN diet_plans dp ON m.diet_plan_id = dp.id
      WHERE m.member_id = $1
    `, [id]);
    
    if (members.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = members[0];
    const logs = await query(`
      SELECT id, recorded_date, weight, height, chest, waist, left_arm, right_arm, left_thigh, right_thigh, body_fat, photo_front, photo_side, photo_back, trainer_notes 
      FROM progress_history 
      WHERE member_id = $1 
      ORDER BY recorded_date DESC, created_at DESC
    `, [id]);

    return res.json({
      member,
      progressHistory: logs
    });
  } catch (error) {
    console.error('Fetch member profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch member details' });
  }
});

// PUT /api/members/:id - Edit member (Protected)
router.put('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      mobile_number,
      gender,
      age,
      height,
      weight,
      join_date,
      membership_plan,
      address,
      emergency_contact,
      medical_notes,
      status,

      dob,
      occupation,
      blood_group,
      membership_duration,
      membership_expiry_date,
      trainer_assigned,
      hips,
      neck,
      calf,
      shoulder,
      goal,
      fitness_level,
      injuries,
      allergies,
      smoking,
      alcohol,
      previous_experience,
      recommended_workout,
      recommended_diet,
      member_photo,
      body_front,
      body_side,
      body_back
    } = req.body;

    if (!full_name || !mobile_number || !gender || !age || !height || !weight || !join_date || !membership_plan || !status) {
      return res.status(400).json({ error: 'Missing required member fields' });
    }

    // Verify phone uniqueness excluding current member
    const existing = await query('SELECT member_id FROM members WHERE mobile_number = $1 AND member_id <> $2', [mobile_number.trim(), id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Another member is already using this phone number.' });
    }

    // If member is being re-activated from Inactive to Active, let's log a rejoin event in notes
    const oldMemberInfo = await query('SELECT status, weight, height FROM members WHERE member_id = $1', [id]);
    const oldStatus = oldMemberInfo[0]?.status;
    const oldWeight = parseFloat(oldMemberInfo[0]?.weight);
    const oldHeight = parseFloat(oldMemberInfo[0]?.height);

    await query(
      `UPDATE members 
       SET full_name = $1, mobile_number = $2, gender = $3, age = $4, height = $5, weight = $6, join_date = $7, membership_plan = $8, address = $9, emergency_contact = $10, medical_notes = $11, status = $12,
           dob = $13, occupation = $14, blood_group = $15, membership_duration = $16, membership_expiry_date = $17, trainer_assigned = $18,
           hips = $19, neck = $20, calf = $21, shoulder = $22, goal = $23, fitness_level = $24, injuries = $25, allergies = $26, smoking = $27, alcohol = $28, previous_experience = $29,
           recommended_workout = $30, recommended_diet = $31, member_photo = $32, body_front = $33, body_side = $34, body_back = $35,
           updated_at = CURRENT_TIMESTAMP
       WHERE member_id = $36`,
      [
        full_name.trim(),
        mobile_number.trim(),
        gender,
        parseInt(String(age)),
        parseFloat(String(height)),
        parseFloat(String(weight)),
        join_date,
        membership_plan,
        address || '',
        emergency_contact || '',
        medical_notes || '',
        status,
        dob || '',
        occupation || '',
        blood_group || '',
        membership_duration || '',
        membership_expiry_date || '',
        trainer_assigned || '',
        parseFloat(String(hips || 0)),
        parseFloat(String(neck || 0)),
        parseFloat(String(calf || 0)),
        parseFloat(String(shoulder || 0)),
        goal || '',
        fitness_level || '',
        injuries || '',
        allergies || '',
        smoking || '',
        alcohol || '',
        previous_experience || '',
        recommended_workout || '',
        recommended_diet || '',
        member_photo || '',
        body_front || '',
        body_side || '',
        body_back || '',
        id
      ]
    );

    // If changing status from Inactive -> Active, log a "Rejoined" progress log
    if (oldStatus === 'Inactive' && status === 'Active') {
      await query(
        `INSERT INTO progress_history (
          member_id, recorded_date, weight, height, trainer_notes, created_at
        ) VALUES ($1, $2, $3, $4, 'Rejoined gym. Plan updated/reactivated.', CURRENT_TIMESTAMP)`,
        [id, join_date, parseFloat(String(weight)), parseFloat(String(height))]
      );
    } 
    // If the weight/height has changed, create an automatic progress log
    else if (oldWeight !== parseFloat(String(weight)) || oldHeight !== parseFloat(String(height))) {
      await query(
        `INSERT INTO progress_history (
          member_id, recorded_date, weight, height, trainer_notes, created_at
        ) VALUES ($1, $2, $3, $4, 'Weight/Height profile edited.', CURRENT_TIMESTAMP)`,
        [id, new Date().toISOString().split('T')[0], parseFloat(String(weight)), parseFloat(String(height))]
      );
    }

    return res.json({ success: true, message: 'Member profile updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    return res.status(500).json({ error: 'Failed to update member profile' });
  }
});

// POST /api/members/:id/progress - Add a progress log (Protected)
router.post('/:id/progress', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      recorded_date,
      weight,
      height,
      chest,
      waist,
      left_arm,
      right_arm,
      left_thigh,
      right_thigh,
      body_fat,
      trainer_notes
    } = req.body;

    if (!recorded_date || !weight || !height) {
      return res.status(400).json({ error: 'Recorded date, weight, and height are required.' });
    }

    const w = parseFloat(String(weight));
    const h = parseFloat(String(height));

    if (w <= 0) {
      return res.status(400).json({ error: 'Weight must be a positive number.' });
    }
    if (h <= 0) {
      return res.status(400).json({ error: 'Height must be a positive number.' });
    }

    // Monthly Deduplication Check
    const targetMonth = String(recorded_date).substring(0, 7); // YYYY-MM
    const existingLogs = await query('SELECT recorded_date FROM progress_history WHERE member_id = $1', [id]);
    const isDuplicate = existingLogs.some((log: any) => String(log.recorded_date).substring(0, 7) === targetMonth);
    
    if (isDuplicate) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const dateObj = new Date(recorded_date);
      const monthName = monthNames[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return res.status(400).json({ 
        error: `A progress record already exists for this member in ${monthName} ${year}.` 
      });
    }

    // Insert progress log with Phase 2 measurements and progress photos
    await query(
      `INSERT INTO progress_history (
        member_id, recorded_date, weight, height, chest, waist, left_arm, right_arm, left_thigh, right_thigh, body_fat, photo_front, photo_side, photo_back, trainer_notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)`,
      [
        id,
        recorded_date,
        w,
        h,
        parseFloat(String(chest || '0')),
        parseFloat(String(waist || '0')),
        parseFloat(String(left_arm || '0')),
        parseFloat(String(right_arm || '0')),
        parseFloat(String(left_thigh || '0')),
        parseFloat(String(right_thigh || '0')),
        body_fat ? parseFloat(String(body_fat)) : null,
        req.body.photo_front || '',
        req.body.photo_side || '',
        req.body.photo_back || '',
        trainer_notes || ''
      ]
    );

    // Sync member table weight & height if this is the newest log
    const latestLogs = await query(`
      SELECT weight, height FROM progress_history 
      WHERE member_id = $1 
      ORDER BY recorded_date DESC, created_at DESC 
      LIMIT 1
    `, [id]);

    if (latestLogs.length > 0) {
      await query(
        `UPDATE members 
         SET weight = $1, height = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE member_id = $3`,
        [parseFloat(latestLogs[0].weight), parseFloat(latestLogs[0].height), id]
      );
    }

    return res.json({ success: true, message: 'Progress log added successfully' });
  } catch (error) {
    console.error('Add progress log error:', error);
    return res.status(500).json({ error: 'Failed to record progress' });
  }
});

// PUT /api/members/:id/progress/:logId - Edit progress log (Protected)
router.put('/:id/progress/:logId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, logId } = req.params;
    const {
      recorded_date,
      weight,
      height,
      chest,
      waist,
      left_arm,
      right_arm,
      left_thigh,
      right_thigh,
      body_fat,
      trainer_notes
    } = req.body;

    if (!recorded_date || !weight || !height) {
      return res.status(400).json({ error: 'Recorded date, weight, and height are required.' });
    }

    const w = parseFloat(String(weight));
    const h = parseFloat(String(height));

    if (w <= 0) {
      return res.status(400).json({ error: 'Weight must be a positive number.' });
    }
    if (h <= 0) {
      return res.status(400).json({ error: 'Height must be a positive number.' });
    }

    // Monthly Deduplication check (excluding current log being edited)
    const targetMonth = String(recorded_date).substring(0, 7);
    const existingLogs = await query('SELECT id, recorded_date FROM progress_history WHERE member_id = $1 AND id <> $2', [id, logId]);
    const isDuplicate = existingLogs.some((log: any) => String(log.recorded_date).substring(0, 7) === targetMonth);

    if (isDuplicate) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const dateObj = new Date(recorded_date);
      const monthName = monthNames[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return res.status(400).json({ 
        error: `A progress record already exists for this member in ${monthName} ${year}.` 
      });
    }

    await query(
      `UPDATE progress_history 
       SET recorded_date = $1, weight = $2, height = $3, chest = $4, waist = $5, left_arm = $6, right_arm = $7, left_thigh = $8, right_thigh = $9, body_fat = $10, photo_front = $11, photo_side = $12, photo_back = $13, trainer_notes = $14 
       WHERE id = $15 AND member_id = $16`,
      [
        recorded_date,
        w,
        h,
        parseFloat(String(chest || '0')),
        parseFloat(String(waist || '0')),
        parseFloat(String(left_arm || '0')),
        parseFloat(String(right_arm || '0')),
        parseFloat(String(left_thigh || '0')),
        parseFloat(String(right_thigh || '0')),
        body_fat ? parseFloat(String(body_fat)) : null,
        req.body.photo_front || '',
        req.body.photo_side || '',
        req.body.photo_back || '',
        trainer_notes || '',
        logId,
        id
      ]
    );

    // Sync member table weight & height if this is the newest log
    const latestLogs = await query(`
      SELECT weight, height FROM progress_history 
      WHERE member_id = $1 
      ORDER BY recorded_date DESC, created_at DESC 
      LIMIT 1
    `, [id]);

    if (latestLogs.length > 0) {
      await query(
        `UPDATE members 
         SET weight = $1, height = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE member_id = $3`,
        [parseFloat(latestLogs[0].weight), parseFloat(latestLogs[0].height), id]
      );
    }

    return res.json({ success: true, message: 'Progress log updated successfully' });
  } catch (error) {
    console.error('Update progress log error:', error);
    return res.status(500).json({ error: 'Failed to update progress details' });
  }
});

// DELETE /api/members/:id/progress/:logId - Delete progress log (Protected)
router.delete('/:id/progress/:logId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, logId } = req.params;

    await query('DELETE FROM progress_history WHERE id = $1 AND member_id = $2', [logId, id]);

    // Rollback: Sync member weight & height to the next latest log
    const latestLogs = await query(`
      SELECT weight, height FROM progress_history 
      WHERE member_id = $1 
      ORDER BY recorded_date DESC, created_at DESC 
      LIMIT 1
    `, [id]);

    if (latestLogs.length > 0) {
      await query(
        `UPDATE members 
         SET weight = $1, height = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE member_id = $3`,
        [parseFloat(latestLogs[0].weight), parseFloat(latestLogs[0].height), id]
      );
    } else {
      // If no logs left, we can leave the last values in members or set to 0. Keeping existing values is safe.
    }

    return res.json({ success: true, message: 'Progress log deleted successfully' });
  } catch (error) {
    console.error('Delete progress log error:', error);
    return res.status(500).json({ error: 'Failed to delete progress log' });
  }
});

// PUT /api/members/:id/assign-workout - Assign workout plan to member (Protected)
router.put('/:id/assign-workout', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { workout_plan_id, start_date, end_date } = req.body;

    await query(
      `UPDATE members 
       SET workout_plan_id = $1, workout_start_date = $2, workout_end_date = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE member_id = $4`,
      [workout_plan_id || null, start_date || '', end_date || '', id]
    );

    return res.json({ success: true, message: 'Workout plan assigned successfully' });
  } catch (error) {
    console.error('Assign workout plan error:', error);
    return res.status(500).json({ error: 'Failed to assign workout plan' });
  }
});

// PUT /api/members/:id/assign-diet - Assign diet plan to member (Protected)
router.put('/:id/assign-diet', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { diet_plan_id, start_date, end_date } = req.body;

    await query(
      `UPDATE members 
       SET diet_plan_id = $1, diet_start_date = $2, diet_end_date = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE member_id = $4`,
      [diet_plan_id || null, start_date || '', end_date || '', id]
    );

    return res.json({ success: true, message: 'Diet plan assigned successfully' });
  } catch (error) {
    console.error('Assign diet plan error:', error);
    return res.status(500).json({ error: 'Failed to assign diet plan' });
  }
});

export default router;
