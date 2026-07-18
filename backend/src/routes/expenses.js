const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkRole } = require('../middleware/auth');

// GET /api/expenses/fuel - List all fuel logs
router.get('/fuel', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT f.*, v.registration_number, v.name_model as vehicle_name 
      FROM fuel_logs f
      LEFT JOIN vehicles v ON f.vehicle_id = v.id
      ORDER BY f.date DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expenses/fuel - Create fuel log (Admin or Driver)
router.post('/fuel', authenticateToken, checkRole(['Admin', 'Driver']), async (req, res) => {
  const { vehicle_id, trip_id, liters, cost, date } = req.body;

  if (!vehicle_id || !liters || !cost || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vehicle_id, trip_id || null, liters, cost, date]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/other - List all other expenses
router.get('/other', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*, v.registration_number, v.name_model as vehicle_name
      FROM expenses e
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      ORDER BY e.date DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expenses/other - Create other expense (Admin only)
router.post('/other', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { vehicle_id, category, amount, date, notes } = req.body;

  if (!vehicle_id || !category || !amount || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO expenses (vehicle_id, category, amount, date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vehicle_id, category, amount, date, notes || '']
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/rollup - Operational Cost Rollup per Vehicle (Sum of fuel + maintenance + other)
router.get('/rollup', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
          v.id,
          v.registration_number,
          v.name_model,
          v.acquisition_cost,
          COALESCE(f.total_fuel, 0) AS total_fuel_cost,
          COALESCE(m.total_maintenance, 0) AS total_maintenance_cost,
          COALESCE(e.total_expense, 0) AS total_other_expense_cost,
          (COALESCE(f.total_fuel, 0) + COALESCE(m.total_maintenance, 0) + COALESCE(e.total_expense, 0)) AS total_operational_cost
      FROM vehicles v
      LEFT JOIN (
          SELECT vehicle_id, SUM(cost) AS total_fuel FROM fuel_logs GROUP BY vehicle_id
      ) f ON v.id = f.vehicle_id
      LEFT JOIN (
          SELECT vehicle_id, SUM(cost) AS total_maintenance FROM maintenance_logs GROUP BY vehicle_id
      ) m ON v.id = m.vehicle_id
      LEFT JOIN (
          SELECT vehicle_id, SUM(amount) AS total_expense FROM expenses GROUP BY vehicle_id
      ) e ON v.id = e.vehicle_id
      ORDER BY total_operational_cost DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
