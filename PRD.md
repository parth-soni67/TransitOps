# TransitOps — Product Requirements Document

**Product:** TransitOps — Smart Transport Operations Platform
**Type:** Hackathon Build (8-hour scope)
**Status:** Draft v1.0
**Owner:** [Your Name]
**Last Updated:** 2026-07-16

---

## 1. Overview

### 1.1 Problem Statement
Many logistics companies still run transport operations on spreadsheets and paper logbooks. This causes scheduling conflicts, underutilized vehicles, missed maintenance windows, expired driver licenses going unnoticed, inaccurate expense tracking, and poor operational visibility for management.

### 1.2 Product Vision
TransitOps is a centralized web platform that digitizes the complete lifecycle of transport operations — vehicle registration, driver management, trip dispatching, maintenance, fuel/expense logging, and analytics — while enforcing business rules automatically so invalid operational states (e.g., dispatching a retired vehicle) become impossible.

### 1.3 Goals
- Replace manual/spreadsheet-based fleet tracking with a single source of truth.
- Enforce operational business rules at the system level, not via manual discipline.
- Give each role (Fleet Manager, Driver, Safety Officer, Financial Analyst) a relevant, focused view.
- Surface real-time KPIs and cost/efficiency analytics.

### 1.4 Non-Goals (for this build)
- Native mobile apps (responsive web only).
- Real-time GPS tracking / live map telemetry.
- Payroll or HR management beyond driver profile basics.
- Multi-tenant/organization switching (single-org scope for hackathon).

---

## 2. Target Users & Roles (RBAC)

| Role | Primary Responsibilities | Key Permissions |
|---|---|---|
| **Fleet Manager** | Oversees fleet assets, maintenance, vehicle lifecycle, operational efficiency | Full CRUD on Vehicles, Maintenance; view all dashboards/reports |
| **Driver** | Creates trips, assigns vehicle/driver, monitors active deliveries | Create/manage Trips; view own trips and assigned vehicle |
| **Safety Officer** | Ensures driver compliance, license validity, safety scores | Full CRUD on Drivers; view compliance dashboard |
| **Financial Analyst** | Reviews expenses, fuel consumption, maintenance costs, profitability | View/export Reports & Analytics; CRUD on Fuel Logs/Expenses |

RBAC must gate both UI visibility (nav items, actions) and backend endpoint access — a role should not be able to call an API it can't see in the UI.

---

## 3. Functional Requirements

### 3.1 Authentication
- Email + password login; authenticated session required for all app access (no anonymous routes except login).
- Role assignment per user; role determines available modules/actions (RBAC).
- Logout and session expiry handling.

### 3.2 Dashboard
KPI cards (computed live from underlying data, not hardcoded):
- Active Vehicles
- Available Vehicles
- Vehicles in Maintenance
- Active Trips
- Pending Trips
- Drivers On Duty
- Fleet Utilization (%) — e.g., (Vehicles On Trip / Total Active Vehicles) × 100

Filters: Vehicle Type, Status, Region.

### 3.3 Vehicle Registry
Fields: Registration Number (**unique**), Vehicle Name/Model, Type, Maximum Load Capacity, Odometer, Acquisition Cost, Status.

Status enum: `Available | On Trip | In Shop | Retired`

CRUD required. Registration Number uniqueness enforced at DB and form-validation level.

### 3.4 Driver Management
Fields: Name, License Number, License Category, License Expiry Date, Contact Number, Safety Score, Status.

Status enum: `Available | On Trip | Off Duty | Suspended`

CRUD required. System must be able to identify expired licenses (compare License Expiry Date to current date).

### 3.5 Trip Management
Create trip by selecting: Source, Destination, Available Vehicle, Available Driver, Cargo Weight, Planned Distance.

Trip lifecycle (state machine): `Draft → Dispatched → Completed → Cancelled`

- **Draft → Dispatched**: only allowed if all dispatch validations pass (see §4). On success, vehicle & driver status → `On Trip`.
- **Dispatched → Completed**: requires final odometer reading and fuel consumed; vehicle & driver status → `Available`.
- **Dispatched → Cancelled**: vehicle & driver status restored → `Available`.
- **Draft → Cancelled**: allowed with no side effects (nothing was dispatched yet).

### 3.6 Maintenance
- Create maintenance records against a vehicle (type of work, date, cost, notes, active/closed status).
- Creating an **active** maintenance record automatically sets vehicle status → `In Shop`, which removes it from the vehicle-selection pool in Trip creation.
- Closing a maintenance record restores vehicle status → `Available`, **unless** the vehicle is `Retired`.

### 3.7 Fuel & Expense Management
- Fuel logs: liters, cost, date, linked vehicle (and optionally trip).
- Other expenses: tolls, maintenance-related costs, etc., linked to a vehicle.
- System auto-computes **Total Operational Cost per vehicle** = Fuel Cost + Maintenance Cost (+ other logged expenses).

### 3.8 Reports & Analytics
Metrics to compute and display:
- **Fuel Efficiency** = Distance / Fuel consumed
- **Fleet Utilization** = % of fleet actively On Trip over a period
- **Operational Cost** = Fuel + Maintenance (+ expenses) per vehicle / fleet-wide
- **Vehicle ROI** = (Revenue − (Maintenance + Fuel)) / Acquisition Cost

Export: CSV required; PDF export is a bonus/optional item.

---

## 4. Business Rules (must be enforced server-side, not just UI)

| # | Rule |
|---|---|
| 1 | Vehicle registration number must be unique. |
| 2 | Vehicles with status `Retired` or `In Shop` must never appear in dispatch/trip vehicle selection. |
| 3 | Drivers with an expired license or status `Suspended` cannot be assigned to a trip. |
| 4 | A vehicle or driver already `On Trip` cannot be assigned to another trip. |
| 5 | Cargo Weight on a trip must not exceed the selected vehicle's Maximum Load Capacity. |
| 6 | Dispatching a trip (Draft → Dispatched) automatically sets vehicle **and** driver status to `On Trip`. |
| 7 | Completing a trip automatically resets vehicle **and** driver status to `Available`. |
| 8 | Cancelling a dispatched trip restores vehicle **and** driver status to `Available`. |
| 9 | Creating an active maintenance record automatically sets vehicle status to `In Shop`. |
| 10 | Closing a maintenance record restores vehicle status to `Available`, unless the vehicle is `Retired`. |

These rules should be implemented as backend validation/transaction logic so no client can bypass them via direct API calls.

---

## 5. Example End-to-End Workflow (acceptance scenario)

1. Register vehicle `Van-05`, max capacity 500 kg, status `Available`.
2. Register driver `Alex` with a valid (non-expired) license.
3. Create a trip with Cargo Weight = 450 kg.
4. System validates 450 kg ≤ 500 kg → dispatch allowed.
5. On dispatch, `Van-05` and `Alex` both flip to `On Trip`.
6. Complete the trip: enter final odometer + fuel consumed.
7. System sets both `Van-05` and `Alex` back to `Available`.
8. Create a maintenance record (Oil Change) for `Van-05` → status auto-changes to `In Shop`, hidden from dispatch pool.
9. Reports/Dashboard reflect updated operational cost and fuel efficiency from the trip and fuel log.

This scenario should be the primary smoke test / demo script.

---

## 6. Data Model (Expected Entities)

Minimum entities: **Users, Roles, Vehicles, Drivers, Trips, Maintenance Logs, Fuel Logs, Expenses**

Suggested relational shape:

- **User** — id, name, email, password_hash, role_id
- **Role** — id, name (`Fleet Manager | Driver | Safety Officer | Financial Analyst`)
- **Vehicle** — id, registration_number (unique), name/model, type, max_load_capacity, odometer, acquisition_cost, status, region
- **Driver** — id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status
- **Trip** — id, source, destination, vehicle_id (FK), driver_id (FK), cargo_weight, planned_distance, final_odometer, fuel_consumed, status, created_by, timestamps
- **MaintenanceLog** — id, vehicle_id (FK), type/description, cost, date, status (active/closed)
- **FuelLog** — id, vehicle_id (FK), trip_id (FK, nullable), liters, cost, date
- **Expense** — id, vehicle_id (FK), category (toll, other), amount, date, notes

Indexes: unique index on `Vehicle.registration_number`; FK indexes on vehicle_id/driver_id across Trip, MaintenanceLog, FuelLog, Expense.

---

## 7. Deliverables (Mandatory)

- [ ] Responsive web interface
- [ ] Authentication with RBAC
- [ ] CRUD for Vehicles and Drivers
- [ ] Trip Management with validations (all 10 business rules enforced)
- [ ] Automatic status transitions (vehicle/driver on dispatch, complete, cancel, maintenance)
- [ ] Maintenance workflow
- [ ] Fuel & Expense tracking
- [ ] Dashboard with KPIs
- [ ] Charts and visual analytics
- [ ] CSV export for reports

## 8. Bonus Features (Stretch, if time allows)

- PDF export for reports
- Email reminders for expiring driver licenses
- Vehicle document management (upload/store registration, insurance docs)
- Search, filters, and sorting across all list views
- Dark mode

Reference mockup: https://link.excalidraw.com/l/65VNwvy7c4X/1FHGDNgD2td

---

## 9. Suggested Tech Stack (adjust to your team's stack)

- **Frontend:** React (Vite) + Tailwind, chart library (Recharts/Chart.js) for analytics
- **Backend:** Node.js/Express or FastAPI — REST API with role-based middleware
- **Database:** PostgreSQL (relational, needed for FK integrity + unique constraints)
- **Auth:** JWT-based session auth, bcrypt password hashing, role claim in token
- **Deployment (for demo):** single deployable app or Docker Compose (frontend + backend + Postgres)

---

## 10. Success Criteria (Definition of Done for the hackathon)

1. A user can log in and see only the nav/actions their role permits.
2. The full workflow in §5 can be executed end-to-end without manual DB edits.
3. All 10 business rules in §4 are verifiably enforced (attempting to violate each one is blocked with a clear error).
4. Dashboard KPIs update correctly after trips/maintenance/fuel logs change.
5. Reports page shows Fuel Efficiency, Fleet Utilization, Operational Cost, and Vehicle ROI with correct formulas, and supports CSV export.

---

## 11. Open Questions / Assumptions to Confirm

- Is "Region" on the Vehicle a free-text field or a fixed list? (Spec only requires it as a dashboard filter.)
- Where does "Revenue" for Vehicle ROI come from — is it entered per trip, or a manual field per vehicle? (Not specified in source doc — needs a decision before building Reports.)
- Should Safety Score be manually entered/edited by the Safety Officer, or system-calculated from trip history? Source doc treats it as a stored field only.
- Single organization/tenant assumed for this build; multi-tenancy out of scope.
