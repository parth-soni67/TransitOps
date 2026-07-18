const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkRole } = require('../middleware/auth');

// GET /api/maintenance - List all maintenance records
router.get('/', authenticateToken, async (req, res) => {
  const { status, vehicle_id } = req.query;
  let queryText = `
    SELECT m.*, v.registration_number, v.name_model as vehicle_name
    FROM maintenance_logs m
    LEFT JOIN vehicles v ON m.vehicle_id = v.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (status) {
    queryParams.push(status);
    queryText += ` AND m.status = $${queryParams.length}`;
  }
  if (vehicle_id) {
    queryParams.push(vehicle_id);
    queryText += ` AND m.vehicle_id = $${queryParams.length}`;
  }

  queryText += ' ORDER BY m.id DESC';

  try {
    const result = await db.query(queryText, queryParams);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/maintenance - Create active maintenance record (Rule 9)
router.post('/', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { vehicle_id, description, cost, date } = req.body;

  if (!vehicle_id || !description || cost === undefined || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch vehicle status
    const vehicleRes = await client.query('SELECT status FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    const vehicle = vehicleRes.rows[0];

    // Check if vehicle is Retired
    if (vehicle.status === 'Retired') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot perform maintenance on a Retired vehicle' });
    }

    // 1. Create Maintenance Record
    const result = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, description, cost, date, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [vehicle_id, description, cost, date]
    );

    // 2. Set vehicle status -> In Shop (Rule 9)
    await client.query(
      "UPDATE vehicles SET status = 'In Shop' WHERE id = $1",
      [vehicle_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error during maintenance log creation' });
  } finally {
    client.release();
  }
});

// PATCH /api/maintenance/:id/close - Close active maintenance record (Rule 10)
router.patch('/:id/close', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch maintenance log
    const logRes = await client.query('SELECT vehicle_id, status FROM maintenance_logs WHERE id = $1', [req.params.id]);
    if (logRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Maintenance log not found' });
    }
    const log = logRes.rows[0];

    if (log.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Maintenance record is already closed' });
    }

    // Fetch vehicle status
    const vehicleRes = await client.query('SELECT status FROM vehicles WHERE id = $1', [log.vehicle_id]);
    const vehicle = vehicleRes.rows[0];

    // 1. Update Maintenance Log status -> closed
    const result = await client.query(
      "UPDATE maintenance_logs SET status = 'closed' WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    // 2. Close maintenance record: vehicle -> Available unless vehicle is Retired (Rule 10)
    if (vehicle.status !== 'Retired') {
      await client.query(
        "UPDATE vehicles SET status = 'Available' WHERE id = $1",
        [log.vehicle_id]
      );
    }

    await client.query('COMMIT');
    res.json({ data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error during maintenance log closing' });
  } finally {
    client.release();
  }
});

// PUT /api/maintenance/:id - Edit an existing maintenance log
router.put('/:id', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { description, cost, date } = req.body;

  if (!description || cost === undefined || !date) {
    return res.status(400).json({ error: 'Missing required fields: description, cost, date' });
  }

  try {
    const logRes = await db.query('SELECT id FROM maintenance_logs WHERE id = $1', [req.params.id]);
    if (logRes.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance log not found' });
    }

    const result = await db.query(
      `UPDATE maintenance_logs
       SET description = $1, cost = $2, date = $3
       WHERE id = $4
       RETURNING *`,
      [description, Number(cost), date, req.params.id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while updating maintenance log' });
  }
});

module.exports = router;

