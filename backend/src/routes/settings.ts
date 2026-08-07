import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/settings - Fetch gym settings (Public, so login page can display branding)
router.get('/', async (req, res) => {
  try {
    const settings = await query(`
      SELECT gym_name, gym_logo, address, phone_number, email, theme, accent_color,
             working_hours, currency, website, gst_number, invoice_footer, favicon, login_bg, dashboard_banner, setup_completed
      FROM gym_settings WHERE id = 1
    `);
    if (settings.length === 0) {
      return res.json({
        gym_name: 'Oviyam Gym',
        gym_logo: '',
        address: '',
        phone_number: '',
        email: '',
        theme: 'dark',
        accent_color: 'purple',
        working_hours: '06:00 AM - 10:00 PM',
        currency: '₹',
        website: '',
        gst_number: '',
        invoice_footer: 'Thank you for training with us!',
        favicon: '',
        login_bg: '',
        dashboard_banner: '',
        setup_completed: 0
      });
    }
    return res.json(settings[0]);
  } catch (error) {
    console.error('Fetch settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update gym settings (Protected)
router.put('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      gym_name, gym_logo, address, phone_number, email, theme, accent_color,
      working_hours, currency, website, gst_number, invoice_footer, favicon, login_bg, dashboard_banner, setup_completed
    } = req.body;

    if (!gym_name) {
      return res.status(400).json({ error: 'Gym name is required' });
    }

    await query(
      `UPDATE gym_settings 
       SET gym_name = $1, gym_logo = $2, address = $3, phone_number = $4, email = $5, theme = $6, accent_color = $7,
           working_hours = $8, currency = $9, website = $10, gst_number = $11, invoice_footer = $12, favicon = $13, 
           login_bg = $14, dashboard_banner = $15, setup_completed = $16, updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      [
        gym_name, gym_logo || '', address || '', phone_number || '', email || '', theme || 'dark', accent_color || 'purple',
        working_hours || '06:00 AM - 10:00 PM', currency || '₹', website || '', gst_number || '', invoice_footer || '', 
        favicon || '', login_bg || '', dashboard_banner || '', setup_completed ? parseInt(String(setup_completed)) : 0
      ]
    );

    return res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/complete-setup - Client Setup Installation Wizard (Public)
router.post('/complete-setup', async (req, res) => {
  try {
    const { 
      gym_name, gym_logo, address, phone_number, email, theme, accent_color, 
      working_hours, currency, website, gst_number, invoice_footer, favicon,
      adminUsername, adminPassword, trainers, membershipPlans
    } = req.body;

    if (!gym_name) {
      return res.status(400).json({ error: 'Gym name is required for initialization' });
    }

    // 1. Update settings config
    await query(
      `UPDATE gym_settings 
       SET gym_name = $1, gym_logo = $2, address = $3, phone_number = $4, email = $5, theme = $6, accent_color = $7, 
           working_hours = $8, currency = $9, website = $10, gst_number = $11, invoice_footer = $12, favicon = $13, 
           setup_completed = 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      [
        gym_name, gym_logo || '', address || '', phone_number || '', email || '', theme || 'dark', accent_color || 'purple',
        working_hours || '06:00 AM - 10:00 PM', currency || '₹', website || '', gst_number || '', invoice_footer || 'Thank you for training with us!', 
        favicon || ''
      ]
    );

    // 2. Hash and update admin username & password
    if (adminUsername) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword || 'admin123', salt);
      const checkAdmins = await query('SELECT * FROM admins WHERE id = 1');
      if (checkAdmins.length > 0) {
        await query('UPDATE admins SET username = $1, password_hash = $2 WHERE id = 1', [adminUsername.trim().toLowerCase(), hash]);
      } else {
        await query('INSERT INTO admins (id, username, password_hash) VALUES (1, $1, $2)', [adminUsername.trim().toLowerCase(), hash]);
      }
    }

    // 3. Clear and seed default membership plans
    if (Array.isArray(membershipPlans) && membershipPlans.length > 0) {
      await query('DELETE FROM membership_plans');
      for (const plan of membershipPlans) {
        await query(
          'INSERT INTO membership_plans (plan_name, duration, price, description, status) VALUES ($1, $2, $3, $4, $5)',
          [plan.plan_name, plan.duration, parseFloat(plan.price), plan.description || '', 'Active']
        );
      }
    }

    // 4. Clear and seed default trainers
    if (Array.isArray(trainers) && trainers.length > 0) {
      await query('DELETE FROM trainers');
      for (const t of trainers) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(t.password || 'trainer123', salt);
        await query(
          `INSERT INTO trainers (trainer_id, full_name, mobile_number, email, gender, experience, specialization, qualification, joining_date, status, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [t.trainer_id || 'TRN-1001', t.full_name, t.mobile_number, t.email, t.gender || 'Male', parseInt(t.experience || '1'), t.specialization || '', t.qualification || '', new Date().toISOString().split('T')[0], 'Active', hash]
        );
      }
    }

    return res.json({ success: true, message: 'Setup completed successfully!' });
  } catch (error) {
    console.error('Complete setup error:', error);
    return res.status(500).json({ error: 'Failed to complete configuration setup wizard' });
  }
});

// PUT /api/settings/change-password - Change admin password (Protected)
router.put('/change-password', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const adminId = req.user?.id;
    const admins = await query('SELECT password_hash FROM admins WHERE id = $1', [adminId]);
    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admins[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query('UPDATE admins SET password_hash = $1 WHERE id = $2', [newHash, adminId]);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
