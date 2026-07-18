# TransitOps — Task List (8-Hour Build Plan)

Check items off as Antigravity/you complete them. Ordered so the acceptance script (`04_spec.md` §6) becomes runnable as early as possible, then hardens outward.

## Phase 0 — Setup (30 min)
- [x] Scaffold `/frontend` (Vite + React + Tailwind) and `/backend` (Express or FastAPI)
- [x] Set up PostgreSQL (docker-compose) and run initial migration for all entities (spec §2)
- [x] Wire JWT auth: signup/login endpoint, password hashing, role claim
- [x] Drop in Stitch-exported `LoginPage.jsx`, connect its form submit to the login endpoint, redirect to `/dashboard` on success

## Phase 1 — Core CRUD (90 min)
- [x] Vehicle Registry: list, create, edit, unique registration_number validation (rule 1)
- [x] Driver Management: list, create, edit, license expiry stored correctly
- [x] RBAC middleware applied to all routes above (Fleet Manager → Vehicles, Safety Officer → Drivers)

## Phase 2 — Trip Lifecycle (2 hrs) — highest priority, most rules live here
- [x] Trip creation form: source, destination, vehicle (filtered to `Available`, rule 2), driver (filtered to `Available` + valid license, rule 3), cargo weight, planned distance
- [x] Cargo weight ≤ max load capacity validation (rule 5)
- [x] Prevent double-assignment of vehicle/driver already `On Trip` (rule 4)
- [x] Dispatch action: atomic transaction — trip → Dispatched, vehicle → On Trip, driver → On Trip (rule 6)
- [x] Complete action: requires final odometer + fuel consumed; atomic reset to Available (rule 7)
- [x] Cancel action (from Dispatched): atomic reset to Available (rule 8)
- [x] Run the full acceptance script (spec §6, steps 1–7) end-to-end and confirm it passes

## Phase 3 — Maintenance & Fuel/Expenses (75 min)
- [x] Maintenance record creation: active record → vehicle status In Shop (rule 9), auto-removes from dispatch pool
- [x] Maintenance close: vehicle → Available unless Retired (rule 10)
- [x] Fuel log entry (liters, cost, date, vehicle)
- [x] Expense log entry (category, amount, date, vehicle)
- [x] Per-vehicle Operational Cost rollup (Fuel + Maintenance + Expenses)

## Phase 4 — Dashboard & Reports (75 min)
- [x] Dashboard KPIs: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %
- [x] Dashboard filters: vehicle type, status, region
- [x] Reports: Fuel Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI (confirm Revenue field decision — spec §5)
- [x] CSV export on Reports

## Phase 5 — Polish & Demo Prep (45 min)
- [x] Apply `02_design_guide.md` tokens consistently across all screens (status badge colors, buttons, cards)
- [x] Responsive check on mobile widths for every screen, not just login
- [x] Seed demo data matching the acceptance script for a clean live walkthrough
- [x] Run through the 10 business rules deliberately trying to break each one — confirm all are rejected server-side

## Bonus (only if all above is done with time remaining)
- [x] Driver self-service profile & fleet removal option
- [ ] PDF export for reports
- [ ] Email reminders for expiring driver licenses
- [ ] Vehicle document uploads
- [x] Global search/filter/sort
- [ ] Dark mode (discarded by user request)
