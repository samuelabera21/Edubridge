# ============================================================
# EduBridge Dev Setup Script (PowerShell)
# Run once after cloning: .\setup.ps1
# Works on Windows PowerShell and PowerShell Core
# ============================================================

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  EduBridge - Dev Environment Setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$EnvFile = ".env"
$EnvExample = ".env.example"
$BackendEnv = "backend\.env"

# --- Step 1: Create .env from .env.example if missing ---
if (Test-Path $EnvFile) {
    Write-Host "  .env already exists - skipping creation." -ForegroundColor Green
} else {
    Write-Host "  Creating .env from .env.example..." -ForegroundColor Yellow

    # Read template
    $content = Get-Content $EnvExample -Raw

    # Generate random POSTGRES_PASSWORD (32 hex chars)
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $pgPassBytes = New-Object byte[] 16
    $rng.GetBytes($pgPassBytes)
    $pgPass = [System.BitConverter]::ToString($pgPassBytes) -replace '-', ''

    # Generate random BETTER_AUTH_SECRET (64 hex chars)
    $authSecretBytes = New-Object byte[] 32
    $rng.GetBytes($authSecretBytes)
    $authSecret = [System.BitConverter]::ToString($authSecretBytes) -replace '-', ''

    $defaultPass = "Admin@1234"

    # Replace blank values
    $content = $content -replace "(?m)^POSTGRES_PASSWORD=.*$", "POSTGRES_PASSWORD=$pgPass"
    $content = $content -replace "(?m)^BETTER_AUTH_SECRET=.*$", "BETTER_AUTH_SECRET=$authSecret"
    $content = $content -replace "(?m)^DEFAULT_INITIAL_PASSWORD=.*$", "DEFAULT_INITIAL_PASSWORD=$defaultPass"

    # Write .env
    Set-Content -Path $EnvFile -Value $content -NoNewline

    Write-Host "  .env created with auto-generated secrets." -ForegroundColor Green
    Write-Host ""
    Write-Host "  POSTGRES_PASSWORD        = $pgPass" -ForegroundColor DarkGray
    Write-Host "  BETTER_AUTH_SECRET       = (hidden - see .env)" -ForegroundColor DarkGray
    Write-Host "  DEFAULT_INITIAL_PASSWORD = $defaultPass" -ForegroundColor DarkGray
}

Write-Host ""

# --- Step 2: Sync backend/.env with generated credentials ---
# Parse .env values
$envValues = @{}
Get-Content $EnvFile | Where-Object { $_ -match "^[^#].*=.*" } | ForEach-Object {
    $parts = $_ -split "=", 2
    $envValues[$parts[0].Trim()] = $parts[1].Trim()
}

$pgUser     = $envValues["POSTGRES_USER"]
$pgPass     = $envValues["POSTGRES_PASSWORD"]
$pgDb       = $envValues["POSTGRES_DB"]
$dbPort     = $envValues["DB_PORT"]
$authSec    = $envValues["BETTER_AUTH_SECRET"]

$backendEnvContent = @"
DATABASE_URL="postgresql://${pgUser}:${pgPass}@localhost:${dbPort}/${pgDb}"
BETTER_AUTH_SECRET="${authSec}"
BETTER_AUTH_URL="http://localhost:5000"
POSTGRES_USER=${pgUser}
POSTGRES_PASSWORD=${pgPass}
POSTGRES_DB=${pgDb}
DEFAULT_INITIAL_PASSWORD=${defaultPass}
ADMIN_PASSWORD=${defaultPass}
"@

Set-Content -Path $BackendEnv -Value $backendEnvContent
Write-Host "  backend/.env synced with database credentials." -ForegroundColor Green

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Setup complete! Now run:" -ForegroundColor Cyan
Write-Host "    docker compose up" -ForegroundColor White
Write-Host ""
Write-Host "  Then log in at: http://localhost:3001" -ForegroundColor White
Write-Host "  Email    : admin@edubridge.local" -ForegroundColor White
Write-Host "  Password : Admin@1234" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
