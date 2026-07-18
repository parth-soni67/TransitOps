const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkRole } = require('../middleware/auth');

// GET /api/vehicles - List all vehicles (accessible to all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  const { status, type, region } = req.query;
  let queryText = 'SELECT * FROM vehicles WHERE 1=1';
  const queryParams = [];

  if (status) {
    queryParams.push(status);
    queryText += ` AND status = $${queryParams.length}`;
  }
  if (type) {
    queryParams.push(type);
    queryText += ` AND type = $${queryParams.length}`;
  }
  if (region) {
    queryParams.push(region);
    queryText += ` AND region = $${queryParams.length}`;
  }

  queryText += ' ORDER BY id DESC';

  try {
    const result = await db.query(queryText, queryParams);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/vehicles/:id - Get details of one vehicle
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/vehicles - Create new vehicle (Fleet Manager only)
router.post('/', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status, region } = req.body;

  if (!registration_number || !name_model || !type || !max_load_capacity || !acquisition_cost || !region) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate unique registration_number (Rule 1)
  try {
    const existing = await db.query('SELECT id FROM vehicles WHERE registration_number = $1', [registration_number]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Vehicle registration number must be unique' });
    }

    const result = await db.query(
      `INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status, region)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        registration_number,
        name_model,
        type,
        max_load_capacity,
        odometer || 0,
        acquisition_cost,
        status || 'Available',
        region
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/vehicles/:id - Update vehicle details (Fleet Manager only)
router.put('/:id', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status, region } = req.body;

  if (!registration_number || !name_model || !type || !max_load_capacity || !acquisition_cost || !region || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate unique registration_number (excluding current vehicle) (Rule 1)
  try {
    const existing = await db.query('SELECT id FROM vehicles WHERE registration_number = $1 AND id != $2', [registration_number, req.params.id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Vehicle registration number must be unique' });
    }

    const result = await db.query(
      `UPDATE vehicles 
       SET registration_number = $1, name_model = $2, type = $3, max_load_capacity = $4, odometer = $5, acquisition_cost = $6, status = $7, region = $8
       WHERE id = $9
       RETURNING *`,
      [
        registration_number,
        name_model,
        type,
        max_load_capacity,
        odometer,
        acquisition_cost,
        status,
        region,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/vehicles/:id - Delete / Retire vehicle (Fleet Manager only)
router.delete('/:id', authenticateToken, checkRole(['Admin']), async (req, res) => {
  try {
    // We can either delete it or set status to Retired. Let's delete it.
    const result = await db.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
