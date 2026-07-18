# TransitOps — System Guide

Purpose: give Antigravity a single reference for how the system fits together before it starts generating code.

## 1. Architecture Overview

```
[React + Tailwind SPA] ──HTTP/JSON──> [REST API backend] ──SQL──> [PostgreSQL]
        │                                    │
   (Stitch login UI                    Role-based middleware
    + app shell)                       enforces business rules
```

- **Frontend:** React (Vite), Tailwind CSS. Login/landing page comes from Stitch export; all other screens built to match `02_design_guide.md`.
- **Backend:** Node.js/Express (or FastAPI — pick one and stay consistent) exposing a REST API. All business-rule validation (see `04_spec.md` §4) lives here, never only in the frontend.
- **Database:** PostgreSQL. Relational integrity (FKs, unique constraints) is required — this app depends on correct status transitions, not just display logic.
- **Auth:** JWT-based session, password hashing (bcrypt), role embedded in the token claim, checked on every protected route.

## 2. Folder Structure (suggested)

```
/transitops
  /frontend
    /src
      /components      → shared UI (buttons, badges, tables, KPI cards)
      /pages
        LoginPage.jsx   → Stitch export, lightly adapted for routing
        Dashboard.jsx
        Vehicles.jsx
        Drivers.jsx
        Trips.jsx
        Maintenance.jsx
        FuelExpenses.jsx
        Reports.jsx
      /lib              → api client, auth context, formatters
  /backend
    /src
      /routes           → auth, vehicles, drivers, trips, maintenance, fuel, expenses, reports
      /middleware        → auth.js (JWT verify), rbac.js (role gate)
      /services          → business-rule logic (status transitions, validations)
      /db                → migrations, models/schema
  /docs                  → this file set (system guide, spec, design guide, ai rules, tasks, loops)
```

## 3. Core Data Flow — Trip Dispatch (representative example)

1. Frontend `Trips.jsx` requests `GET /vehicles?status=Available` and `GET /drivers?status=Available&license=valid` to populate selection dropdowns.
2. User submits trip creation → `POST /trips` with vehicle_id, driver_id, cargo_weight, planned_distance, source, destination.
3. Backend `services/trips.js` validates: cargo ≤ vehicle max load, vehicle/driver both `Available`, driver license not expired/not suspended (spec §4, rules 1–5).
4. On dispatch action (`PATCH /trips/:id/dispatch`), backend runs a DB transaction: set trip status `Dispatched`, vehicle status `On Trip`, driver status `On Trip` — all three writes succeed or none do.
5. Same transactional pattern applies to Complete, Cancel, and Maintenance open/close actions (spec §4, rules 6–10).

This transactional, backend-enforced pattern is the most important architectural constraint in the whole project — treat every status change as a single atomic operation, never as three separate independent updates.

## 4. Environments

- **Local/dev:** single `docker-compose.yml` running frontend, backend, and Postgres — fastest path for an 8-hour build.
- **Demo:** same compose stack, seeded with the example workflow data (spec §5) so the judges/demo can walk through it live.

## 5. Non-Functional Requirements

- Responsive down to mobile width for all screens (not just login).
- API responses under ~300ms for list/detail views at demo data scale.
- No client-side-only enforcement of business rules — every rule in spec §4 must be re-validated server-side even if the UI already disabled the option.
