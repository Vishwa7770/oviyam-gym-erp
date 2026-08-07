import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/attendance/stats - Attendance KPIs & Dashboard data (Protected)
router.get('/stats', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Today's stats
    const todayLogs = await query('SELECT status, COUNT(*) as count FROM attendance WHERE recorded_date = $1 GROUP BY status', [today]);
    
    let todayPresent = 0;
    let todayAbsent = 0;
    let todayLate = 0;

    todayLogs.forEach((row: any) => {
      if (row.status === 'Present') todayPresent = parseInt(row.count || '0');
      else if (row.status === 'Absent') todayAbsent = parseInt(row.count || '0');
      else if (row.status === 'Late') todayLate = parseInt(row.count || '0');
    });

    const activeRes = await query("SELECT COUNT(*) as count FROM members WHERE status = 'Active'");
    const activeMembers = parseInt(activeRes[0]?.count || activeRes[0]?.['COUNT(*)'] || '0');

    // Calculate Rate: (Present + Late) / Active members
    const checkedInCount = todayPresent + todayLate;
    const attendanceRate = activeMembers > 0 
      ? Math.round((checkedInCount / activeMembers) * 100) 
      : 0;

    // 2. Weekly Attendance (past 7 days checkin trend)
    const weeklyList: Array<{ date: string; day: string; count: number }> = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = daysOfWeek[d.getDay()];
      weeklyList.push({ date: dateStr, day: dayLabel, count: 0 });
    }

    const weekRes = await query(`
      SELECT recorded_date, COUNT(*) as count 
      FROM attendance 
      WHERE recorded_date >= $1 AND status IN ('Present', 'Late') 
      GROUP BY recorded_date
    `, [weeklyList[0].date]);

    weeklyList.forEach(w => {
      const matched = weekRes.find((row: any) => String(row.recorded_date).substring(0, 10) === w.date);
      if (matched) {
        w.count = parseInt(matched.count || '0');
      }
    });

    // 3. Monthly Attendance (past 30 days total)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const monthRes = await query(`
      SELECT COUNT(*) as count 
      FROM attendance 
      WHERE recorded_date >= $1 AND status IN ('Present', 'Late')
    `, [thirtyDaysAgoStr]);
    const monthlyAttendance = parseInt(monthRes[0]?.count || monthRes[0]?.['COUNT(*)'] || '0');

    // 4. Most Regular Leaderboard (Top 5 members in last 30 days)
    const regularRes = await query(`
      SELECT a.member_id, m.full_name, m.mobile_number, COUNT(*) as count 
      FROM attendance a 
      JOIN members m ON a.member_id = m.member_id 
      WHERE a.recorded_date >= $1 AND a.status IN ('Present', 'Late') 
      GROUP BY a.member_id, m.full_name, m.mobile_number 
      ORDER BY count DESC 
      LIMIT 5
    `, [thirtyDaysAgoStr]);

    const mostRegular = regularRes.map((r: any) => ({
      member_id: r.member_id,
      full_name: r.full_name,
      mobile_number: r.mobile_number,
      count: parseInt(r.count || '0')
    }));

    // 5. Members Missing for 7+ Days
    const allActive = await query("SELECT member_id, full_name, mobile_number, join_date FROM members WHERE status = 'Active'");
    const lastVisits = await query(`
      SELECT member_id, MAX(recorded_date) as last_visit 
      FROM attendance 
      WHERE status IN ('Present', 'Late') 
      GROUP BY member_id
    `);

    const lastVisitMap: { [key: string]: string } = {};
    lastVisits.forEach((row: any) => {
      lastVisitMap[row.member_id] = String(row.last_visit).substring(0, 10);
    });

    const missingMembers: any[] = [];
    const todayDateObj = new Date();

    allActive.forEach((m: any) => {
      const lastVisitDateStr = lastVisitMap[m.member_id] || m.join_date;
      const lastVisitObj = new Date(lastVisitDateStr);
      
      const diffTime = Math.abs(todayDateObj.getTime() - lastVisitObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 7) {
        missingMembers.push({
          member_id: m.member_id,
          full_name: m.full_name,
          mobile_number: m.mobile_number,
          last_visit: lastVisitMap[m.member_id] ? formatDate(lastVisitMap[m.member_id]) : 'Never (New Join)',
          days_missing: diffDays
        });
      }
    });

    // Sort by days missing DESC
    missingMembers.sort((a, b) => b.days_missing - a.days_missing);

    return res.json({
      todayPresent,
      todayAbsent,
      todayLate,
      attendanceRate,
      weeklyAttendance: weeklyList,
      monthlyAttendance,
      mostRegular,
      missingMembers: missingMembers.slice(0, 5) // Top 5 missing
    });
  } catch (error) {
    console.error('Fetch attendance stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
});

// GET /api/attendance/history - Filtered list of attendance (Protected)
router.get('/history', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      status,
      date,
      month,
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
      whereClause += ` AND (m.full_name LIKE $${paramCounter} OR a.member_id LIKE $${paramCounter} OR m.mobile_number LIKE $${paramCounter})`;
      params.push(`%${String(search).trim()}%`);
      paramCounter++;
    }

    if (status && String(status) !== 'All') {
      whereClause += ` AND a.status = $${paramCounter}`;
      params.push(String(status));
      paramCounter++;
    }

    if (date) {
      whereClause += ` AND a.recorded_date = $${paramCounter}`;
      params.push(String(date));
      paramCounter++;
    }

    if (month) {
      whereClause += ` AND a.recorded_date LIKE $${paramCounter}`;
      params.push(`${String(month)}%`);
      paramCounter++;
    }

    // Get count
    const countRes = await query(`
      SELECT COUNT(*) as count 
      FROM attendance a 
      JOIN members m ON a.member_id = m.member_id 
      ${whereClause}
    `, params);
    const total = parseInt(countRes[0]?.count || countRes[0]?.['COUNT(*)'] || '0');

    // Get list
    const dataQuery = `
      SELECT a.*, m.full_name, m.mobile_number, m.membership_plan 
      FROM attendance a 
      JOIN members m ON a.member_id = m.member_id 
      ${whereClause} 
      ORDER BY a.recorded_date DESC, a.created_at DESC 
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
    console.error('Fetch attendance history error:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance logs' });
  }
});

// POST /api/attendance - Log / Mark daily checkin (Protected, Upsert support)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { member_id, status, time_in, time_out, recorded_date } = req.body;

    if (!member_id || !status) {
      return res.status(400).json({ error: 'Member ID and check-in status are required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const logDate = recorded_date || todayStr;
    const trainerName = req.user?.username || 'Admin';

    // Simple default time_in format if omitted
    let defaultTimeIn = time_in;
    if (!defaultTimeIn && status !== 'Absent') {
      const now = new Date();
      let hours = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      defaultTimeIn = `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
    }

    // Check-in Upsert check
    const existing = await query(
      'SELECT id FROM attendance WHERE member_id = $1 AND recorded_date = $2',
      [member_id, logDate]
    );

    if (existing.length > 0) {
      // Update checkin
      await query(
        `UPDATE attendance 
         SET status = $1, time_in = $2, time_out = $3, trainer = $4 
         WHERE id = $5`,
        [status, defaultTimeIn || '', time_out || '', trainerName, existing[0].id]
      );
      return res.json({ success: true, message: 'Attendance record updated successfully' });
    } else {
      // Insert checkin
      await query(
        `INSERT INTO attendance (
          member_id, recorded_date, status, time_in, time_out, trainer
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [member_id, logDate, status, defaultTimeIn || '', time_out || '', trainerName]
      );
      return res.json({ success: true, message: 'Attendance marked successfully' });
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    return res.status(500).json({ error: 'Failed to record check-in' });
  }
});

// DELETE /api/attendance/:id - Delete checkin record (Protected)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM attendance WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

// GET /api/attendance/member/:id - Individual member stats & history logs (Protected)
router.get('/member/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const logs = await query('SELECT * FROM attendance WHERE member_id = $1 ORDER BY recorded_date DESC', [id]);

    let present = 0;
    let absent = 0;
    let late = 0;

    logs.forEach((row: any) => {
      if (row.status === 'Present') present++;
      else if (row.status === 'Absent') absent++;
      else if (row.status === 'Late') late++;
    });

    const totalDays = logs.length;
    const presentDays = present + late;
    const attendanceRate = totalDays > 0 
      ? Math.round((presentDays / totalDays) * 100) 
      : 100; // default to 100 if new client

    const lastVisitLog = logs.find((l: any) => l.status === 'Present' || l.status === 'Late');
    const lastVisit = lastVisitLog ? formatDate(lastVisitLog.recorded_date) : 'Never';

    return res.json({
      stats: {
        totalPresent: present,
        totalAbsent: absent,
        totalLate: late,
        attendanceRate,
        lastVisit
      },
      logs
    });
  } catch (error) {
    console.error('Fetch member attendance error:', error);
    return res.status(500).json({ error: 'Failed to retrieve check-in logs' });
  }
});

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default router;
