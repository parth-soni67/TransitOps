# 🚛 TransitOps — Precision Logistics Management System

A full-stack fleet and logistics management platform built for transport companies to manage drivers, vehicles, trips, maintenance, fuel, and expenses in real time.

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (role-based: Admin / Driver) |

---

## ✨ Features

- **Driver Management** — Register drivers with licence details, safety scores, and unique login credentials
- **Vehicle Fleet** — Full fleet registry with status tracking (Available / On Trip / In Shop / Retired)
- **Trip Dispatch** — Create, dispatch, and complete trips with real-time driver & vehicle assignment
- **Fuel & Expenses** — Automatically captured at trip completion; viewable in the Expenses section
- **Maintenance Logs** — Open and close work orders; vehicles auto-set to "In Shop" status
- **Driver Portal** — Drivers see only their own trips and profile; can edit profile and change password
- **Reports** — Fleet utilisation, revenue, trip stats, and safety score summaries

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone the repo
```bash
git clone https://github.com/parth-soni67/TransitOps.git
cd TransitOps
```

### 2. Set up the database
```bash
# Create a PostgreSQL database named 'transitops'
# Then run the setup script:
psql -U postgres -f setup_database.ps1
```

### 3. Configure environment
```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
```

### 4. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Seed demo data (optional)
```bash
cd backend
node seed_demo.js
```

### 6. Start the app
```bash
# From root — start both backend and frontend:
# Backend (port 5000)
cd backend && npm start

# Frontend (port 5173)
cd frontend && npm run dev
```

Or use the included PowerShell launcher:
```powershell
.\start.ps1
```

---

## 👤 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@transitops.com | password123 |
| Driver | driver1@transitops.com | password123 |

---

## 📁 Project Structure

```
TransitOps/
├── backend/
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Auth middleware
│   │   └── db.js          # PostgreSQL connection
│   ├── seed_demo.js       # Demo data seeder
│   └── .env.example       # Environment template
├── frontend/
│   ├── src/
│   │   ├── pages/         # React page components
│   │   └── components/    # Shared UI components
│   └── vite.config.js
├── setup_database.ps1     # DB schema creation script
└── start.ps1              # One-click launcher
```

---

## 📄 License

MIT © 2025 TransitOps
