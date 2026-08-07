import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/stats - KPI stats for Reports Dashboard (Protected)
router.get('/stats', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    const rejoinedRes = await query(`
      SELECT COUNT(DISTINCT member_id) as count 
      FROM progress_history 
      WHERE trainer_notes LIKE '%rejoin%' OR trainer_notes LIKE '%Rejoined%' OR trainer_notes LIKE '%re-joined%'
    `);
    const rejoined = parseInt(rejoinedRes[0]?.count || rejoinedRes[0]?.['COUNT(*)'] || '0');

    const updatesThisMonthRes = await query(`
      SELECT COUNT(*) as count 
      FROM progress_history 
      WHERE recorded_date >= $1
    `, [startOfMonth]);
    const updatesThisMonth = parseInt(updatesThisMonthRes[0]?.count || updatesThisMonthRes[0]?.['COUNT(*)'] || '0');

    return res.json({
      totalMembers: total,
      activeMembers: active,
      inactiveMembers: inactive,
      newMembersThisMonth: newThisMonth,
      rejoinedMembers: rejoined,
      updatesThisMonth
    });
  } catch (error) {
    console.error('Fetch reports stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports stats' });
  }
});

// GET /api/reports/demographics - Data aggregation for Charts (Protected)
router.get('/demographics', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    // 1. Monthly Registrations (Past 6 Months)
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

    // 2. Membership Distribution
    const membershipRes = await query('SELECT membership_plan, COUNT(*) as count FROM members GROUP BY membership_plan');
    const membershipDistribution = membershipRes.map((r: any) => ({
      name: r.membership_plan || 'Unknown',
      value: parseInt(r.count || '0')
    }));

    // 3. Gender Distribution
    const genderRes = await query('SELECT gender, COUNT(*) as count FROM members GROUP BY gender');
    const genderDistribution = genderRes.map((r: any) => ({
      name: r.gender || 'Other',
      value: parseInt(r.count || '0')
    }));

    // 4. Age Distribution
    const ageRes = await query('SELECT age FROM members');
    const ageBins = [
      { name: 'Under 20', value: 0 },
      { name: '20-29', value: 0 },
      { name: '30-39', value: 0 },
      { name: '40-49', value: 0 },
      { name: '50+', value: 0 }
    ];

    ageRes.forEach((row: any) => {
      const age = parseInt(row.age);
      if (age < 20) ageBins[0].value++;
      else if (age >= 20 && age <= 29) ageBins[1].value++;
      else if (age >= 30 && age <= 39) ageBins[2].value++;
      else if (age >= 40 && age <= 49) ageBins[3].value++;
      else if (age >= 50) ageBins[4].value++;
    });

    // 5. Weight Loss vs Gain Classification
    // Retrieve progress logs in chronological order
    const progressLogs = await query('SELECT member_id, weight, recorded_date, created_at FROM progress_history ORDER BY recorded_date ASC, created_at ASC');
    const membersBaseline = await query('SELECT member_id, weight FROM members');

    const memberWeightHistoryMap: { [key: string]: number[] } = {};
    
    // Add baseline registered weight first
    membersBaseline.forEach((m: any) => {
      memberWeightHistoryMap[m.member_id] = [parseFloat(m.weight)];
    });

    // Add progress logs weight points chronologically
    progressLogs.forEach((log: any) => {
      if (!memberWeightHistoryMap[log.member_id]) {
        memberWeightHistoryMap[log.member_id] = [];
      }
      memberWeightHistoryMap[log.member_id].push(parseFloat(log.weight));
    });

    let weightLossCount = 0;
    let weightGainCount = 0;
    let noChangeCount = 0;

    Object.keys(memberWeightHistoryMap).forEach((memberId) => {
      const weights = memberWeightHistoryMap[memberId];
      if (weights.length >= 2) {
        // Compare the latest log with the one right before it
        const latest = weights[weights.length - 1];
        const previous = weights[weights.length - 2];
        const diff = latest - previous;

        if (diff < 0) weightLossCount++;
        else if (diff > 0) weightGainCount++;
        else noChangeCount++;
      }
    });

    const weightTrendDistribution = [
      { name: 'Weight Loss', value: weightLossCount },
      { name: 'Weight Gain', value: weightGainCount },
      { name: 'No Change', value: noChangeCount }
    ];

    return res.json({
      monthlyRegistrations,
      membershipDistribution,
      genderDistribution,
      ageDistribution: ageBins,
      weightTrendDistribution
    });
  } catch (error) {
    console.error('Fetch reports demographics error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports demographics' });
  }
});

// GET /api/reports/members - Filtered & Paginated Members List (Protected)
router.get('/members', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      status,
      membership_plan,
      gender,
      ageMin,
      ageMax,
      joinDateStart,
      joinDateEnd,
      page = '1',
      limit = '50'
    } = req.query;

    const p = parseInt(String(page)) || 1;
    const l = parseInt(String(limit)) || 50;
    const offset = (p - 1) * l;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCounter = 1;

    if (search && String(search).trim() !== '') {
      whereClause += ` AND (full_name LIKE $${paramCounter} OR mobile_number LIKE $${paramCounter} OR member_id LIKE $${paramCounter})`;
      params.push(`%${String(search).trim()}%`);
      paramCounter++;
    }

    if (status && String(status) !== 'All') {
      whereClause += ` AND status = $${paramCounter}`;
      params.push(String(status));
      paramCounter++;
    }

    if (membership_plan && String(membership_plan) !== 'All') {
      whereClause += ` AND membership_plan = $${paramCounter}`;
      params.push(String(membership_plan));
      paramCounter++;
    }

    if (gender && String(gender) !== 'All') {
      whereClause += ` AND gender = $${paramCounter}`;
      params.push(String(gender));
      paramCounter++;
    }

    if (ageMin) {
      whereClause += ` AND age >= $${paramCounter}`;
      params.push(parseInt(String(ageMin)));
      paramCounter++;
    }

    if (ageMax) {
      whereClause += ` AND age <= $${paramCounter}`;
      params.push(parseInt(String(ageMax)));
      paramCounter++;
    }

    if (joinDateStart) {
      whereClause += ` AND join_date >= $${paramCounter}`;
      params.push(String(joinDateStart));
      paramCounter++;
    }

    if (joinDateEnd) {
      whereClause += ` AND join_date <= $${paramCounter}`;
      params.push(String(joinDateEnd));
      paramCounter++;
    }

    // Get count
    const countRes = await query(`SELECT COUNT(*) as count FROM members ${whereClause}`, params);
    const total = parseInt(countRes[0]?.count || countRes[0]?.['COUNT(*)'] || '0');

    // Get paginated list
    const dataQuery = `
      SELECT * FROM members 
      ${whereClause} 
      ORDER BY join_date DESC, created_at DESC 
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    const finalParams = [...params, l, offset];
    const data = await query(dataQuery, finalParams);

    return res.json({
      data,
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (error) {
    console.error('Fetch report members error:', error);
    return res.status(500).json({ error: 'Failed to fetch member report data' });
  }
});

// GET /api/reports/progress - Filtered & Paginated Monthly Progress logs (Protected)
router.get('/progress', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      plan,
      gender,
      weightTrend, // 'loss' | 'gain' | 'no_change'
      dateStart,
      dateEnd,
      page = '1',
      limit = '50'
    } = req.query;

    const p = parseInt(String(page)) || 1;
    const l = parseInt(String(limit)) || 50;

    // Fetch all members baselines
    const membersList = await query('SELECT member_id, full_name, weight, height, membership_plan, gender FROM members');
    
    // Fetch all logs
    const progressList = await query(`
      SELECT p.*, m.full_name, m.membership_plan, m.gender 
      FROM progress_history p 
      JOIN members m ON p.member_id = m.member_id 
      ORDER BY p.recorded_date DESC, p.created_at DESC
    `);

    // Build map for member baseline weights/heights
    const memberBaseMap: { [key: string]: { weight: number; height: number } } = {};
    membersList.forEach((m: any) => {
      memberBaseMap[m.member_id] = {
        weight: parseFloat(m.weight),
        height: parseFloat(m.height)
      };
    });

    // We process chronologically per member to associate current vs previous weights
    // Sort progress list oldest to newest for chronological tracking
    const chronoLogs = [...progressList].reverse();
    const memberLogsMap: { [key: string]: any[] } = {};

    chronoLogs.forEach((log: any) => {
      if (!memberLogsMap[log.member_id]) {
        memberLogsMap[log.member_id] = [];
      }
      memberLogsMap[log.member_id].push(log);
    });

    const reportRows: any[] = [];

    // Construct logs with previous weight differentials
    progressList.forEach((log: any) => {
      const mLogs = memberLogsMap[log.member_id] || [];
      const logIndex = mLogs.findIndex((x: any) => x.id === log.id);
      
      let prevWeight = 0;
      if (logIndex > 0) {
        // Prior log in history
        prevWeight = parseFloat(mLogs[logIndex - 1].weight);
      } else {
        // Baseline member weight
        prevWeight = memberBaseMap[log.member_id]?.weight || parseFloat(log.weight);
      }

      const currentWeight = parseFloat(log.weight);
      const diff = parseFloat((currentWeight - prevWeight).toFixed(1));
      
      const heightInMeters = parseFloat(log.height) / 100;
      const bmi = heightInMeters > 0 
        ? parseFloat((currentWeight / Math.pow(heightInMeters, 2)).toFixed(1)) 
        : 0;

      reportRows.push({
        id: log.id,
        member_id: log.member_id,
        full_name: log.full_name,
        membership_plan: log.membership_plan,
        gender: log.gender,
        recorded_date: log.recorded_date,
        weight: currentWeight,
        prevWeight,
        difference: diff,
        bmi,
        trainer_notes: log.trainer_notes,
        created_at: log.created_at
      });
    });

    // Apply filtering in JavaScript
    let filtered = reportRows;

    if (search && String(search).trim() !== '') {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter(row => 
        row.full_name.toLowerCase().includes(q) || 
        row.member_id.toLowerCase().includes(q)
      );
    }

    if (plan && String(plan) !== 'All') {
      filtered = filtered.filter(row => row.membership_plan === plan);
    }

    if (gender && String(gender) !== 'All') {
      filtered = filtered.filter(row => row.gender === gender);
    }

    if (dateStart) {
      filtered = filtered.filter(row => row.recorded_date >= dateStart);
    }

    if (dateEnd) {
      filtered = filtered.filter(row => row.recorded_date <= dateEnd);
    }

    if (weightTrend && String(weightTrend) !== 'All') {
      if (weightTrend === 'loss') {
        filtered = filtered.filter(row => row.difference < 0);
      } else if (weightTrend === 'gain') {
        filtered = filtered.filter(row => row.difference > 0);
      } else if (weightTrend === 'no_change') {
        filtered = filtered.filter(row => row.difference === 0);
      }
    }

    const total = filtered.length;
    const paginated = filtered.slice((p - 1) * l, p * l);

    return res.json({
      data: paginated,
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (error) {
    console.error('Fetch reports progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch progress report data' });
  }
});

// GET /api/reports/history - Fetch generated reports history (Protected)
router.get('/history', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await query('SELECT * FROM generated_reports ORDER BY created_at DESC');
    return res.json(history);
  } catch (error) {
    console.error('Fetch reports history error:', error);
    return res.status(500).json({ error: 'Failed to fetch generated reports list' });
  }
});

// POST /api/reports/history - Save a generated report (Protected)
router.post('/history', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report_name, report_type, filters, report_data } = req.body;
    
    if (!report_name || !report_type || !report_data) {
      return res.status(400).json({ error: 'Report name, type, and data are required.' });
    }

    const username = req.user?.username || 'admin';
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO generated_reports (
        report_name, report_type, filters, generated_date, generated_by, report_data
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        report_name.trim(),
        report_type,
        filters || '',
        today,
        username,
        typeof report_data === 'string' ? report_data : JSON.stringify(report_data)
      ]
    );

    return res.json({ success: true, message: 'Report saved to history successfully' });
  } catch (error) {
    console.error('Save report history error:', error);
    return res.status(500).json({ error: 'Failed to save generated report snapshot' });
  }
});

// DELETE /api/reports/history/:id - Delete a report from history (Protected)
router.delete('/history/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM generated_reports WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Report snapshot deleted successfully' });
  } catch (error) {
    console.error('Delete report history error:', error);
    return res.status(500).json({ error: 'Failed to delete report snapshot' });
  }
});

export default router;
