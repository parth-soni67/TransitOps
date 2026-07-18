const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkRole } = require('../middleware/auth');

// GET /api/trips - List all trips (Admin sees all; Driver sees only their own)
router.get('/', authenticateToken, async (req, res) => {
  const { status, vehicle_id, driver_id, limit } = req.query;
  let queryText = `
    SELECT t.*, v.registration_number, v.name_model as vehicle_name, d.name as driver_name
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN drivers d ON t.driver_id = d.id
    WHERE 1=1
  `;
  const queryParams = [];

  // Drivers only see trips assigned to them
  if (req.user.role === 'Driver') {
    try {
      // Find the driver record linked to this user's ID
      const myDriverRes = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1 LIMIT 1',
        [req.user.id]
      );
      if (myDriverRes.rows.length > 0) {
        queryParams.push(myDriverRes.rows[0].id);
        queryText += ` AND t.driver_id = $${queryParams.length}`;
      } else {
        // No matching driver record — return empty
        return res.json({ data: [] });
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  } else {
    if (status) {
      queryParams.push(status);
      queryText += ` AND t.status = $${queryParams.length}`;
    }
    if (vehicle_id) {
      queryParams.push(vehicle_id);
      queryText += ` AND t.vehicle_id = $${queryParams.length}`;
    }
    if (driver_id) {
      queryParams.push(driver_id);
      queryText += ` AND t.driver_id = $${queryParams.length}`;
    }
  }

  queryText += ' ORDER BY t.id DESC';

  if (limit && !isNaN(Number(limit))) {
    queryText += ` LIMIT ${parseInt(limit, 10)}`;
  }

  try {
    const result = await db.query(queryText, queryParams);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/trips - Create a trip (Admin only)
router.post('/', authenticateToken, checkRole(['Admin']), async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance } = req.body;

  if (!source || !destination || !vehicle_id || !driver_id || !cargo_weight || !planned_distance) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Fetch vehicle & driver info to check rules
    const vehicleRes = await db.query('SELECT status, max_load_capacity FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    const vehicle = vehicleRes.rows[0];

    const driverRes = await db.query('SELECT status, license_expiry_date FROM drivers WHERE id = $1', [driver_id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const driver = driverRes.rows[0];

    // Business Rule 2: Retired or In Shop vehicles never appear in trip dispatch selection (we enforce this during creation too)
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      return res.status(400).json({ error: `Vehicle is currently ${vehicle.status} and cannot be assigned` });
    }

    // Business Rule 3: Drivers with expired license or Suspended status cannot be assigned
    if (driver.status === 'Suspended') {
      return res.status(400).json({ error: 'Driver is currently Suspended' });
    }
    const expiryDate = new Date(driver.license_expiry_date);
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: 'Driver license is expired' });
    }

    // Business Rule 4: A vehicle/driver already On Trip cannot be assigned to another trip
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: 'Vehicle is already assigned to an active trip' });
    }
    if (driver.status === 'On Trip') {
      return res.status(400).json({ error: 'Driver is already assigned to an active trip' });
    }

    // Business Rule 5: Cargo Weight must not exceed the vehicle's max load capacity
    if (Number(cargo_weight) > Number(vehicle.max_load_capacity)) {
      return res.status(400).json({ error: `Cargo weight (${cargo_weight} kg) exceeds vehicle max capacity (${vehicle.max_load_capacity} kg)` });
    }

    const result = await db.query(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Draft')
       RETURNING *`,
      [source, destination, vehicle_id, driver_id, cargo_weight, planned_distance]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/trips/:id/dispatch - Dispatch Trip (Atomic Transaction) (Rule 6)
router.patch('/:id/dispatch', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch trip to get assigned vehicle and driver
    const tripRes = await client.query('SELECT vehicle_id, driver_id, status FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = tripRes.rows[0];

    if (trip.status !== 'Draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Trip is in ${trip.status} state and cannot be dispatched` });
    }

    // Validate that vehicle and driver are still available
    const vehicleRes = await client.query('SELECT status FROM vehicles WHERE id = $1', [trip.vehicle_id]);
    const driverRes = await client.query('SELECT status, license_expiry_date FROM drivers WHERE id = $1', [trip.driver_id]);

    if (vehicleRes.rows[0].status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Vehicle is not Available (current status: ${vehicleRes.rows[0].status})` });
    }

    const driver = driverRes.rows[0];
    if (driver.status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Driver is not Available (current status: ${driver.status})` });
    }
    if (new Date(driver.license_expiry_date) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Driver license has expired' });
    }

    // Perform updates atomically
    // 1. Update Trip -> Dispatched
    await client.query("UPDATE trips SET status = 'Dispatched' WHERE id = $1", [req.params.id]);
    // 2. Update Vehicle -> On Trip
    await client.query("UPDATE vehicles SET status = 'On Trip' WHERE id = $1", [trip.vehicle_id]);
    // 3. Update Driver -> On Trip
    await client.query("UPDATE drivers SET status = 'On Trip' WHERE id = $1", [trip.driver_id]);

    await client.query('COMMIT');
    res.json({ message: 'Trip dispatched successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error during dispatch transaction' });
  } finally {
    client.release();
  }
});

// PATCH /api/trips/:id/complete - Complete Trip (Atomic Transaction) (Rule 7)
router.patch('/:id/complete', authenticateToken, async (req, res) => {
  const { final_odometer, fuel_consumed, revenue, fuel_cost, expense_amount, expense_description } = req.body;

  if (final_odometer === undefined || fuel_consumed === undefined) {
    return res.status(400).json({ error: 'Final odometer and fuel consumed are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch trip
    const tripRes = await client.query('SELECT vehicle_id, driver_id, status, planned_distance FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = tripRes.rows[0];

    if (trip.status !== 'Dispatched') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Trip must be in Dispatched state to complete' });
    }

    // Validate final odometer is greater than current vehicle odometer
    const vehicleRes = await client.query('SELECT odometer FROM vehicles WHERE id = $1', [trip.vehicle_id]);
    const currentOdometer = Number(vehicleRes.rows[0].odometer);
    if (Number(final_odometer) <= currentOdometer) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Final odometer (${final_odometer}) must be greater than current vehicle odometer (${currentOdometer})` });
    }

    // Perform updates atomically
    // 1. Update Trip -> Completed, store final odometer, fuel, revenue
    await client.query(
      `UPDATE trips 
       SET status = 'Completed', final_odometer = $1, fuel_consumed = $2, revenue = $3
       WHERE id = $4`,
      [final_odometer, fuel_consumed, revenue || 0, req.params.id]
    );

    // 2. Update Vehicle -> Available, update its odometer to final_odometer
    await client.query(
      "UPDATE vehicles SET status = 'Available', odometer = $1 WHERE id = $2",
      [final_odometer, trip.vehicle_id]
    );

    // 3. Update Driver -> Available
    await client.query(
      "UPDATE drivers SET status = 'Available' WHERE id = $1::int",
      [trip.driver_id]
    );

    // Auto-create a Fuel Log for this trip if fuel was consumed or cost is provided
    if (Number(fuel_consumed) > 0 || Number(fuel_cost) > 0) {
      await client.query(
        `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date)
         VALUES ($1, $2, $3, $4, NOW()::date)`,
        [trip.vehicle_id, req.params.id, fuel_consumed || 0, fuel_cost || 0]
      );
    }

    // Auto-create an Expense entry for this trip if expense_amount is provided
    if (Number(expense_amount) > 0) {
      await client.query(
        `INSERT INTO expenses (vehicle_id, category, amount, date, notes)
         VALUES ($1, $2, $3, NOW()::date, $4)`,
        [trip.vehicle_id, 'Trip Expense', expense_amount, expense_description || `Expense for Trip #${req.params.id}`]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Trip completed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error during completion transaction' });
  } finally {
    client.release();
  }
});

// PATCH /api/trips/:id/cancel - Cancel Trip (Atomic Transaction) (Rule 8)
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch trip
    const tripRes = await client.query('SELECT vehicle_id, driver_id, status FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = tripRes.rows[0];

    // Cancel is allowed from Draft or Dispatched
    if (trip.status !== 'Draft' && trip.status !== 'Dispatched') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Trip in status ${trip.status} cannot be cancelled` });
    }

    // 1. Update Trip -> Cancelled
    await client.query("UPDATE trips SET status = 'Cancelled' WHERE id = $1", [req.params.id]);

    // If it was already dispatched, we must free up the vehicle and driver
    if (trip.status === 'Dispatched') {
      // 2. Update Vehicle -> Available
      await client.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [trip.vehicle_id]);
      // 3. Update Driver -> Available
      await client.query("UPDATE drivers SET status = 'Available' WHERE id = $1", [trip.driver_id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Trip cancelled successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error during cancellation transaction' });
  } finally {
    client.release();
  }
});

module.exports = router;
