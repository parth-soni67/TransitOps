# TransitOps — Functional Spec

Condensed, implementation-oriented version of the PRD. This is the file Antigravity should treat as the authoritative behavior spec.

## 1. Roles (RBAC)

| Role | Can do |
|---|---|
| Fleet Manager | Full CRUD Vehicles, Maintenance; view all dashboards/reports |
| Driver | Create/manage Trips; view own trips + assigned vehicle |
| Safety Officer | Full CRUD Drivers; view compliance dashboard |
| Financial Analyst | View/export Reports; CRUD Fuel Logs/Expenses |

Every API route must check role, not just the UI.

## 2. Entities & Fields

- **Vehicle**: registration_number (unique), name/model, type, max_load_capacity, odometer, acquisition_cost, status(`Available|On Trip|In Shop|Retired`), region
- **Driver**: name, license_number, license_category, license_expiry_date, contact_number, safety_score, status(`Available|On Trip|Off Duty|Suspended`)
- **Trip**: source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, final_odometer, fuel_consumed, status(`Draft|Dispatched|Completed|Cancelled`)
- **MaintenanceLog**: vehicle_id, description, cost, date, status(`active|closed`)
- **FuelLog**: vehicle_id, trip_id (nullable), liters, cost, date
- **Expense**: vehicle_id, category, amount, date, notes
- **User**: name, email, password_hash, role

## 3. Screens

1. Login (Stitch UI)
2. Dashboard — KPIs + filters (vehicle type, status, region)
3. Vehicle Registry — list + CRUD
4. Driver Management — list + CRUD
5. Trip Management — create/dispatch/complete/cancel flow
6. Maintenance — log creation, active/closed toggle
7. Fuel & Expenses — logging + per-vehicle cost rollup
8. Reports & Analytics — Fuel Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI, CSV export

## 4. Business Rules (server-enforced, non-negotiable)

1. Vehicle registration number is unique.
2. `Retired` or `In Shop` vehicles never appear in trip dispatch selection.
3. Drivers with expired license or `Suspended` status cannot be assigned to trips.
4. A vehicle/driver already `On Trip` cannot be assigned to another trip.
5. Cargo Weight must not exceed the vehicle's max load capacity.
6. Dispatch: trip → `Dispatched`, vehicle → `On Trip`, driver → `On Trip` (atomic).
7. Complete: trip → `Completed`, vehicle → `Available`, driver → `Available` (atomic), requires final odometer + fuel consumed.
8. Cancel (from Dispatched): vehicle → `Available`, driver → `Available` (atomic).
9. Create active maintenance record: vehicle → `In Shop` (atomic with record creation).
10. Close maintenance record: vehicle → `Available` unless vehicle is `Retired`.

## 5. Formulas (Reports)

- Fuel Efficiency = Distance / Fuel Consumed
- Fleet Utilization (%) = (Vehicles currently `On Trip` / Total non-Retired Vehicles) × 100
- Operational Cost (per vehicle) = Σ Fuel Cost + Σ Maintenance Cost + Σ Other Expenses
- Vehicle ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
  - **Open question:** Revenue source not defined in original brief. Default assumption for this build: add an optional `revenue` field on Trip (entered on completion); Vehicle ROI sums Trip revenue per vehicle. Confirm before building Reports — flagged in `06_tasks.md`.

## 6. Acceptance / Demo Script

1. Register vehicle `Van-05`, max capacity 500 kg, `Available`.
2. Register driver `Alex`, valid license.
3. Create trip, cargo 450 kg → validates ≤ 500 kg → dispatch allowed.
4. Vehicle + driver → `On Trip`.
5. Complete trip with final odometer + fuel consumed → both → `Available`.
6. Create maintenance record (Oil Change) → vehicle → `In Shop`, hidden from dispatch.
7. Dashboard/Reports reflect updated cost and efficiency.

This script is the primary smoke test — it should pass end-to-end with zero manual DB edits before anything else is considered "done."
