const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

// Create temp connection to default postgres database first to create transitops database if not exists
const tempPool = new Pool({
  connectionString: process.env.DATABASE_URL.replace('/transitops', '/postgres')
});

async function run() {
  console.log('Starting database setup...');
  try {
    // 1. Create transitops database if it doesn't exist
    await tempPool.query('CREATE DATABASE transitops').catch(err => {
      if (err.code === '42P04') {
        console.log('Database transitops already exists.');
      } else {
        throw err;
      }
    });
    await tempPool.end();

    // 2. Connect to the transitops database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    // 3. Read and run schema.sql
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Running schema.sql...');
    await pool.query(schemaSql);
    console.log('Schema created successfully.');

    // 4. Seed default users
    const users = [
      { name: 'Alice Admin', email: 'admin@transitops.com', password: 'password123', role: 'Admin' },
      { name: 'Bob Driver', email: 'driver@transitops.com', password: 'password123', role: 'Driver' }
    ];

    console.log('Seeding default users...');
    for (const u of users) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(u.password, salt);
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [u.name, u.email, hash, u.role]
      );
      console.log(`User ${u.email} created.`);
    }

    console.log('Database setup completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Database setup failed:', err);
    process.exit(1);
  }
}

run();
