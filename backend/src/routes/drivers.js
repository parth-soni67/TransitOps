const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { authenticateToken, checkRole } = require('../middleware/auth');

// GET /api/drivers - List all drivers (accessible to all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  const { status, license_valid } = req.query;
  let queryText = `
    SELECT d.*, u.email 
    FROM drivers d
    LEFT JOIN users u ON d.user_id = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (status) {
    queryParams.push(status);
    queryText += ` AND d.status = $${queryParams.length}`;
  }

  // Filter for valid (unexpired) license if requested
  if (license_valid === 'true') {
    queryText += ` AND d.license_expiry_date > NOW()::date`;
  }

  queryText += ' ORDER BY d.id DESC';

  try {
    const result = await db.query(queryText, queryParams);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/drivers/:id - Get details of one driver
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT d.*, u.email 
       FROM drivers d 
       LEFT JOIN users u ON d.user_id = u.id 
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/drivers - Create new driver (Admin only)
router.post('/', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, email, password } = req.body;

  if (!name || !license_number || !license_category || !license_expiry_date || !contact_number || !email) {
    return res.status(400).json({ error: 'Missing required fields (including Email)' });
  }

  try {
    // Validate unique license_number
    const existingLic = await db.query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
    if (existingLic.rows.length > 0) {
      return res.status(400).json({ error: 'Driver license number must be unique' });
    }

    // Validate unique email in users table
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists in users registry' });
    }

    // Create user account first
    const finalPassword = password || 'password123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(finalPassword, salt);

    const userResult = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hash, 'Driver']
    );
    const userId = userResult.rows[0].id;

    // Create driver registry linking to user_id
    const result = await db.query(
      `INSERT INTO drivers (user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        name,
        license_number,
        license_category,
        license_expiry_date,
        contact_number,
        safety_score || 100,
        status || 'Available'
      ]
    );

    res.status(201).json({ data: { ...result.rows[0], email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/drivers/:id - Update driver details (Admin only)
router.put('/:id', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, email, password } = req.body;

  if (!name || !license_number || !license_category || !license_expiry_date || !contact_number || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Validate unique license_number (excluding current driver)
    const existing = await db.query('SELECT id FROM drivers WHERE license_number = $1 AND id != $2', [license_number, req.params.id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Driver license number must be unique' });
    }

    // Update driver registry details
    const result = await db.query(
      `UPDATE drivers
       SET name = $1, license_number = $2, license_category = $3, license_expiry_date = $4, contact_number = $5, safety_score = $6, status = $7
       WHERE id = $8
       RETURNING *`,
      [
        name,
        license_number,
        license_category,
        license_expiry_date,
        contact_number,
        safety_score,
        status,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = result.rows[0];

    // Update user account details if linked
    if (driver.user_id) {
      if (email) {
        // Validate unique email (excluding current user)
        const existingEmail = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, driver.user_id]);
        if (existingEmail.rows.length > 0) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        await db.query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, email, driver.user_id]);
      } else {
        await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, driver.user_id]);
      }

      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, driver.user_id]);
      }
    }

    res.json({ data: { ...driver, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/drivers/:id - Delete driver (Admin only)
router.delete('/:id', authenticateToken, checkRole(['Admin']), async (req, res) => {
  try {
    const driverRes = await db.query('SELECT user_id FROM drivers WHERE id = $1', [req.params.id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const userId = driverRes.rows[0].user_id;

    if (userId) {
      // Deleting the user will automatically cascade delete the driver record due to ON DELETE CASCADE
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
    } else {
      // Fallback if no user linked
      await db.query('DELETE FROM drivers WHERE id = $1', [req.params.id]);
    }

    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/drivers/:id/self - Driver updates their own profile (name, contact, license)
router.patch('/:id/self', authenticateToken, checkRole(['Driver']), async (req, res) => {
  try {
    // Verify this driver record belongs to the requesting user (by name match)
    const driverRes = await db.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const driver = driverRes.rows[0];
    const userFirstName = req.user.name?.split(' ')[0]?.toLowerCase();
    const driverFirstName = driver.name?.split(' ')[0]?.toLowerCase();
    if (userFirstName !== driverFirstName) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const { name, contact_number, license_number, license_category, license_expiry_date } = req.body;
    if (!name || !contact_number || !license_number || !license_category || !license_expiry_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `UPDATE drivers
       SET name = $1, contact_number = $2, license_number = $3, license_category = $4, license_expiry_date = $5
       WHERE id = $6
       RETURNING *`,
      [name, contact_number, license_number, license_category, license_expiry_date, req.params.id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/drivers/:id/offduty - Driver removes themselves from active fleet
router.patch('/:id/offduty', authenticateToken, checkRole(['Driver']), async (req, res) => {
  try {
    const driverRes = await db.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const driver = driverRes.rows[0];
    const userFirstName = req.user.name?.split(' ')[0]?.toLowerCase();
    const driverFirstName = driver.name?.split(' ')[0]?.toLowerCase();
    if (userFirstName !== driverFirstName) {
      return res.status(403).json({ error: 'You can only update your own status' });
    }

    if (driver.status === 'On Trip') {
      return res.status(400).json({ error: 'Cannot go Off Duty while On Trip. Complete your current trip first.' });
    }

    const result = await db.query(
      "UPDATE drivers SET status = 'Off Duty' WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    res.json({ message: 'Status updated to Off Duty', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/drivers/:id/password - Driver changes their own password
router.patch('/:id/password', authenticateToken, checkRole(['Driver']), async (req, res) => {
  try {
    const driverRes = await db.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const driver = driverRes.rows[0];
    const userFirstName = req.user.name?.split(' ')[0]?.toLowerCase();
    const driverFirstName = driver.name?.split(' ')[0]?.toLowerCase();
    if (userFirstName !== driverFirstName) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }
    if (!driver.user_id) {
      return res.status(400).json({ error: 'No user account linked to this driver' });
    }

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify current password
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [driver.user_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }
    const isMatch = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(new_password, salt);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, driver.user_id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
