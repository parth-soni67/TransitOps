-- Drop tables if they exist (for easy reseeding / migrations in dev)
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS fuel_logs;
DROP TABLE IF EXISTS maintenance_logs;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL -- 'Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst'
);

-- Vehicles table
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    name_model VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'Semi-Truck', 'Box Truck', 'Cargo Van'
    max_load_capacity NUMERIC NOT NULL, -- in kg
    odometer NUMERIC NOT NULL DEFAULT 0,
    acquisition_cost NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Available', -- 'Available', 'On Trip', 'In Shop', 'Retired'
    region VARCHAR(100) NOT NULL
);

-- Drivers table
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_category VARCHAR(50) NOT NULL,
    license_expiry_date DATE NOT NULL,
    contact_number VARCHAR(100) NOT NULL,
    safety_score NUMERIC NOT NULL DEFAULT 100, -- 0-100 scale
    status VARCHAR(50) NOT NULL DEFAULT 'Available' -- 'Available', 'On Trip', 'Off Duty', 'Suspended'
);

-- Trips table
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id INT REFERENCES drivers(id) ON DELETE SET NULL,
    cargo_weight NUMERIC NOT NULL,
    planned_distance NUMERIC NOT NULL,
    final_odometer NUMERIC,
    fuel_consumed NUMERIC,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Dispatched', 'Completed', 'Cancelled'
    revenue NUMERIC DEFAULT 0 -- optional field for ROI calculations
);

-- Maintenance Logs table
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost NUMERIC NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' -- 'active', 'closed'
);

-- Fuel Logs table
CREATE TABLE fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_id INT REFERENCES trips(id) ON DELETE SET NULL,
    liters NUMERIC NOT NULL,
    cost NUMERIC NOT NULL,
    date DATE NOT NULL
);

-- Expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- e.g., 'Insurance', 'Tolls', 'Permits'
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    notes TEXT
);
