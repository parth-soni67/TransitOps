# TransitOps Database Setup and Startup Script
# This script extracts portable PostgreSQL, starts the database server in user-space, and runs seeding.

$ErrorActionPreference = "Stop"

$workspace = "c:\Users\sonip\OneDrive\Desktop\TransitOps"
Set-Location -Path $workspace

Write-Host "Checking for database binaries..." -ForegroundColor Cyan

$pgsqlPath = Join-Path $workspace "pgsql"
if (!(Test-Path $pgsqlPath)) {
    # 1. Wait for postgres-binaries.zip if it's still downloading
    $zipPath = Join-Path $workspace "postgres-binaries.zip"
    while (!(Test-Path $zipPath)) {
        Write-Host "Waiting for postgres-binaries.zip download to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }

    # Wait for file to be unlocked (finished downloading)
    $fileLock = $true
    while ($fileLock) {
        try {
            $fileStream = [System.IO.File]::Open($zipPath, 'Open', 'Read', 'None')
            $fileStream.Close()
            $fileLock = $false
        } catch {
            Write-Host "Waiting for download to complete..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }

    # 2. Extract binaries
    Write-Host "Extracting PostgreSQL binaries..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath $workspace
    Write-Host "Extraction completed." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL binaries already extracted." -ForegroundColor Green
}

# 3. Initialize database if data directory does not exist
$dataPath = Join-Path $pgsqlPath "data"
$initdbExe = Join-Path $pgsqlPath "bin\initdb.exe"
if (!(Test-Path $dataPath)) {
    Write-Host "Initializing PostgreSQL database cluster..." -ForegroundColor Cyan
    & $initdbExe -D $dataPath -U postgres -A trust
    Write-Host "Database cluster initialized." -ForegroundColor Green
} else {
    Write-Host "Database cluster already initialized." -ForegroundColor Green
}

# 4. Start PostgreSQL server if not already running
$pgctlExe = Join-Path $pgsqlPath "bin\pg_ctl.exe"
$logPath = Join-Path $pgsqlPath "postgres.log"

# Check if port 5432 is already in use
$portInUse = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "PostgreSQL (or another service) is already running on port 5432." -ForegroundColor Green
} else {
    Write-Host "Starting PostgreSQL server..." -ForegroundColor Cyan
    & $pgctlExe -D $dataPath -l $logPath start
    Start-Sleep -Seconds 3
    Write-Host "PostgreSQL server started." -ForegroundColor Green
}

# 5. Run database migration and seeding
Write-Host "Running database migrations and seeding..." -ForegroundColor Cyan
Set-Location -Path (Join-Path $workspace "backend")
node src/db/migrate.js

Write-Host "Database setup successfully finished!" -ForegroundColor Green
