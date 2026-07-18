const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkRole } = require('../middleware/auth');
const adminOnly = checkRole(['Admin']);

// GET /api/reports/kpis - High-level metrics for dashboard
router.get('/kpis', authenticateToken, adminOnly, async (req, res) => {
  try {
    const activeVehiclesRes = await db.query("SELECT COUNT(*) FROM vehicles WHERE status = 'On Trip'");
    const availableVehiclesRes = await db.query("SELECT COUNT(*) FROM vehicles WHERE status = 'Available'");
    const maintenanceVehiclesRes = await db.query("SELECT COUNT(*) FROM vehicles WHERE status = 'In Shop'");
    const totalActiveRes = await db.query("SELECT COUNT(*) FROM vehicles WHERE status != 'Retired'");
    
    const activeTripsRes = await db.query("SELECT COUNT(*) FROM trips WHERE status = 'Dispatched'");
    const pendingTripsRes = await db.query("SELECT COUNT(*) FROM trips WHERE status = 'Draft'");
    const activeDriversRes = await db.query("SELECT COUNT(*) FROM drivers WHERE status = 'On Trip' OR status = 'Available'");

    const activeVehicles = parseInt(activeVehiclesRes.rows[0].count, 10);
    const availableVehicles = parseInt(availableVehiclesRes.rows[0].count, 10);
    const inMaintenance = parseInt(maintenanceVehiclesRes.rows[0].count, 10);
    const totalNonRetired = parseInt(totalActiveRes.rows[0].count, 10);

    const activeTrips = parseInt(activeTripsRes.rows[0].count, 10);
    const pendingTrips = parseInt(pendingTripsRes.rows[0].count, 10);
    const activeDrivers = parseInt(activeDriversRes.rows[0].count, 10);

    // Rule 53: Fleet Utilization (%) = (Vehicles currently On Trip / Total non-Retired Vehicles) * 100
    const utilization = totalNonRetired > 0 ? (activeVehicles / totalNonRetired) * 100 : 0;

    res.json({
      data: {
        activeVehicles,
        availableVehicles,
        inMaintenance,
        activeTrips,
        pendingTrips,
        activeDrivers,
        utilization
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/fuel-efficiency - Calculate fuel efficiency per vehicle
router.get('/fuel-efficiency', authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
          v.id, 
          v.registration_number, 
          v.name_model,
          v.type,
          COALESCE(SUM(t.planned_distance), 0) as total_distance,
          COALESCE(SUM(t.fuel_consumed), 0) as total_fuel,
          CASE WHEN COALESCE(SUM(t.fuel_consumed), 0) > 0 THEN SUM(t.planned_distance) / SUM(t.fuel_consumed) ELSE 0 END as fuel_efficiency
      FROM vehicles v
      LEFT JOIN trips t ON v.id = t.vehicle_id AND t.status = 'Completed'
      GROUP BY v.id
      ORDER BY fuel_efficiency DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/roi - Calculate ROI per vehicle
router.get('/roi', authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
          v.id,
          v.registration_number,
          v.name_model,
          v.type,
          v.acquisition_cost,
          COALESCE(tr.total_revenue, 0) as total_revenue,
          COALESCE(m.total_maintenance, 0) as total_maintenance,
          COALESCE(f.total_fuel, 0) as total_fuel,
          CASE 
              WHEN v.acquisition_cost > 0 THEN 
                  (COALESCE(tr.total_revenue, 0) - (COALESCE(m.total_maintenance, 0) + COALESCE(f.total_fuel, 0))) / v.acquisition_cost
              ELSE 0 
          END as roi
      FROM vehicles v
      LEFT JOIN (
          SELECT vehicle_id, SUM(revenue) as total_revenue FROM trips WHERE status = 'Completed' GROUP BY vehicle_id
      ) tr ON v.id = tr.vehicle_id
      LEFT JOIN (
          SELECT vehicle_id, SUM(cost) as total_maintenance FROM maintenance_logs GROUP BY vehicle_id
      ) m ON v.id = m.vehicle_id
      LEFT JOIN (
          SELECT vehicle_id, SUM(cost) as total_fuel FROM fuel_logs GROUP BY vehicle_id
      ) f ON v.id = f.vehicle_id
      ORDER BY roi DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
