Write-Host "Starting TransitOps Platform..." -ForegroundColor Cyan

# 1. Setup and start database
powershell -File .\setup_database.ps1

# 2. Start backend
Write-Host "Starting Express Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# 3. Start frontend
Write-Host "Starting Vite Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "TransitOps is running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Green
