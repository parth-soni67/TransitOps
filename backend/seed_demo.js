/**
 * seed_demo.js — One-shot demo data seeder for TransitOps hackathon.
 * Run: node seed_demo.js  (from backend/ directory)
 * Safe to re-run: clears only vehicles, drivers, trips, maintenance_logs, fuel_logs, expenses.
 * Does NOT wipe users.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Clear non-user tables (cascade handles child rows) ─────────────────
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM fuel_logs');
    await client.query('DELETE FROM maintenance_logs');
    await client.query('DELETE FROM trips');
    await client.query('DELETE FROM drivers');
    await client.query("DELETE FROM users WHERE role = 'Driver'");
    await client.query('DELETE FROM vehicles');

    // Reset sequences
    await client.query("SELECT setval('vehicles_id_seq', 1, false)");
    await client.query("SELECT setval('drivers_id_seq', 1, false)");
    await client.query("SELECT setval('trips_id_seq', 1, false)");
    await client.query("SELECT setval('maintenance_logs_id_seq', 1, false)");
    await client.query("SELECT setval('fuel_logs_id_seq', 1, false)");
    await client.query("SELECT setval('expenses_id_seq', 1, false)");

    // ── VEHICLES ───────────────────────────────────────────────────────────
    const vehicleRows = await client.query(`
      INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status, region)
      VALUES
        ('MH-12-AB-1234', 'Tata Prima 4925',      'Semi-Truck',  15000, 5000,   85000, 'Available', 'Maharashtra'),
        ('MH-12-XY-9999', 'Mahindra Blazo 49',    'Semi-Truck',  20000, 21000,  90000, 'Available', 'Maharashtra'),
        ('DL-1C-AB-2233', 'Ashok Leyland 3718',   'Semi-Truck',  18000, 13500,  78000, 'Available', 'Delhi NCR'),
        ('GJ-18-ZZ-7711', 'BharatBenz 3528R',     'Semi-Truck',  22000, 8200,   95000, 'Available', 'Gujarat'),
        ('KA-04-MN-5544', 'Tata LPT 1613',        'Box Truck',   8000,  31000,  55000, 'In Shop',   'Karnataka'),
        ('TN-22-CR-8876', 'Eicher Pro 3015',      'Cargo Van',   5000,  44200,  42000, 'Available', 'Tamil Nadu'),
        ('RJ-14-PQ-3312', 'Mahindra Furio 14',    'Box Truck',   9000,  17800,  58000, 'Retired',   'Rajasthan'),
        ('MH-43-VC-0019', 'Volvo FM 440',         'Semi-Truck',  25000, 2100,   140000,'Available', 'Maharashtra')
      RETURNING id
    `);

    const vIds = vehicleRows.rows.map(r => r.id);

    // ── DRIVERS ────────────────────────────────────────────────────────────
    const driversData = [
      { name: 'Ramesh Yadav', license_number: 'DL-001122', license_category: 'HMV', license_expiry_date: '2027-06-30', contact_number: '+91-9900112233', safety_score: 96, status: 'Available', email: 'ramesh@transitops.com' },
      { name: 'Suresh Patil', license_number: 'MH-334455', license_category: 'HMV', license_expiry_date: '2026-11-15', contact_number: '+91-9812345678', safety_score: 88, status: 'Available', email: 'suresh@transitops.com' },
      { name: 'Vikram Singh', license_number: 'DL-778899', license_category: 'HMV', license_expiry_date: '2025-03-20', contact_number: '+91-9988776655', safety_score: 72, status: 'Available', email: 'vikram@transitops.com' },
      { name: 'Anil Sharma', license_number: 'GJ-556677', license_category: 'HMV', license_expiry_date: '2028-02-28', contact_number: '+91-9765432100', safety_score: 99, status: 'Available', email: 'anil@transitops.com' },
      { name: 'Deepak Kumar', license_number: 'KA-223344', license_category: 'LMV', license_expiry_date: '2026-08-10', contact_number: '+91-9843210987', safety_score: 83, status: 'Available', email: 'deepak@transitops.com' },
      { name: 'Manoj Tiwari', license_number: 'TN-667788', license_category: 'HMV', license_expiry_date: '2024-12-31', contact_number: '+91-9654321098', safety_score: 65, status: 'Suspended', email: 'manoj@transitops.com' },
      { name: 'Kiran Reddy', license_number: 'RJ-112233', license_category: 'HMV', license_expiry_date: '2027-09-15', contact_number: '+91-9543210987', safety_score: 91, status: 'Available', email: 'kiran@transitops.com' }
    ];

    const salt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('password123', salt);

    const dIds = [];
    console.log('Seeding drivers and their unique user logins...');
    for (const d of driversData) {
      // 1. Create corresponding unique user account
      const userRes = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [d.name, d.email, defaultHash, 'Driver']
      );
      const userId = userRes.rows[0].id;

      // 2. Create driver linked to user
      const driverRes = await client.query(
        `INSERT INTO drivers (user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [userId, d.name, d.license_number, d.license_category, d.license_expiry_date, d.contact_number, d.safety_score, d.status]
      );
      dIds.push(driverRes.rows[0].id);
    }

    // ── TRIPS ──────────────────────────────────────────────────────────────
    // Mix of Completed, Draft, Dispatched, Cancelled for realistic demo
    const tripsRes = await client.query(`
      INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, final_odometer, fuel_consumed, revenue)
      VALUES
        ('Mumbai Port',       'Pune Warehouse',    ${vIds[0]}, ${dIds[0]}, 12000, 150,  'Completed', 5150,  60,   8500),
        ('Pune Warehouse',    'Nashik Distribution',${vIds[0]},${dIds[0]}, 10000, 210,  'Completed', 5360,  88,   11200),
        ('Delhi Hub',         'Agra Depot',        ${vIds[2]}, ${dIds[1]}, 14000, 220,  'Completed', 13720, 92,   13800),
        ('Agra Depot',        'Jaipur Terminal',   ${vIds[2]}, ${dIds[1]}, 9000,  250,  'Completed', 13970, 105,  14500),
        ('Ahmedabad Port',    'Surat Warehouse',   ${vIds[3]}, ${dIds[3]}, 18000, 280,  'Completed', 8480,  112,  17000),
        ('Chennai Port',      'Bangalore Hub',     ${vIds[5]}, ${dIds[4]}, 4000,  350,  'Completed', 44550, 95,   9800),
        ('Mumbai Port',       'Goa Warehouse',     ${vIds[1]}, ${dIds[0]}, 15000, 600,  'Completed', 21000, 150,  24000),
        ('Nashik Distribution','Aurangabad Depot', ${vIds[0]}, ${dIds[1]}, 8000,  180,  'Dispatched',NULL,  NULL, 0),
        ('Delhi Hub',         'Chandigarh Terminal',${vIds[2]},${dIds[2]}, 12000, 280,  'Draft',     NULL,  NULL, 0),
        ('Mumbai Port',       'Hyderabad Logistics',${vIds[7]},${dIds[6]}, 20000, 720,  'Draft',     NULL,  NULL, 0),
        ('Ahmedabad Port',    'Mumbai Port',       ${vIds[3]}, ${dIds[3]}, 5000,  530,  'Cancelled', NULL,  NULL, 0)
      RETURNING id, status, vehicle_id, driver_id
    `);

    // For dispatched trips, mark vehicle/driver as On Trip
    const dispatched = tripsRes.rows.filter(r => r.status === 'Dispatched');
    for (const t of dispatched) {
      await client.query("UPDATE vehicles SET status = 'On Trip' WHERE id = $1", [t.vehicle_id]);
      await client.query("UPDATE drivers SET status = 'On Trip' WHERE id = $1::int", [t.driver_id]);
    }
    // Driver 3 (Vikram Singh) license is expiring soon — make him Available but we'll keep the flag
    // Driver 6 (Manoj Tiwari) is Suspended — leave as is

    const tripIds = tripsRes.rows.map(r => r.id);

    // ── MAINTENANCE LOGS ───────────────────────────────────────────────────
    await client.query(`
      INSERT INTO maintenance_logs (vehicle_id, description, cost, date, status)
      VALUES
        (${vIds[4]}, 'Annual engine overhaul, brake pad replacement, and wheel alignment', 3800, '2026-07-10', 'active'),
        (${vIds[0]}, 'Oil change, filter replacement, tire rotation and pressure check',    850,  '2026-06-20', 'closed'),
        (${vIds[2]}, 'Gearbox repair and clutch plate replacement',                         2200, '2026-05-15', 'closed'),
        (${vIds[1]}, 'Full body paint, LED headlight upgrade, windshield replacement',       4100, '2026-04-01', 'closed'),
        (${vIds[5]}, 'Rear suspension repair and shock absorber replacement',                1200, '2026-07-05', 'closed')
    `);

    // ── FUEL LOGS (linked to completed trips) ──────────────────────────────
    // Trip 1 → vehicle 1, trip 7 → vehicle 2
    await client.query(`
      INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date)
      VALUES
        (${vIds[0]}, ${tripIds[0]},  60,  78,  '2026-07-01'),
        (${vIds[0]}, ${tripIds[1]},  88,  114, '2026-07-05'),
        (${vIds[2]}, ${tripIds[2]},  92,  120, '2026-06-15'),
        (${vIds[2]}, ${tripIds[3]},  105, 136, '2026-06-18'),
        (${vIds[3]}, ${tripIds[4]},  112, 145, '2026-06-22'),
        (${vIds[5]}, ${tripIds[5]},  95,  123, '2026-07-08'),
        (${vIds[1]}, ${tripIds[6]},  150, 195, '2026-07-14'),
        (${vIds[0]}, NULL,           70,  91,  '2026-07-12'),
        (${vIds[3]}, NULL,           90,  117, '2026-07-11')
    `);

    // ── EXPENSES ───────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO expenses (vehicle_id, category, amount, date, notes)
      VALUES
        (${vIds[0]}, 'Toll',              850,  '2026-07-01', 'Mumbai-Pune Expressway'),
        (${vIds[0]}, 'Toll',              1100, '2026-07-05', 'Nashik route highway tolls'),
        (${vIds[2]}, 'Toll',              920,  '2026-06-15', 'Yamuna Expressway'),
        (${vIds[3]}, 'Insurance',         8200, '2026-04-01', 'Annual comprehensive renewal'),
        (${vIds[1]}, 'Toll',              2100, '2026-07-14', 'Mumbai-Goa NH66 tolls'),
        (${vIds[5]}, 'Driver Allowance',  3200, '2026-07-08', '7-day Chennai-Bangalore run'),
        (${vIds[1]}, 'Parking',           450,  '2026-07-13', 'Overnight parking Kolhapur'),
        (${vIds[7]}, 'Insurance',         12000,'2026-07-01', 'Volvo FM comprehensive insurance'),
        (${vIds[0]}, 'Loading/Unloading', 1500, '2026-07-15', 'Port handling charges'),
        (${vIds[3]}, 'Toll',              1800, '2026-06-22', 'Vadodara Expressway')
    `);

    await client.query('COMMIT');
    console.log('✅ Demo seed complete!');
    console.log(`   Vehicles: ${vIds.length}`);
    console.log(`   Drivers:  ${dIds.length}`);
    console.log(`   Trips:    ${tripIds.length} (7 Completed, 1 Dispatched, 2 Draft, 1 Cancelled)`);
    console.log('   + Maintenance, Fuel, and Expense records');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
