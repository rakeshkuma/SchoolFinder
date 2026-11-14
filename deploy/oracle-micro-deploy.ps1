# Builds SchoolDhundo on this PC and puts it live on the Oracle web server (schooldhundo-web).
# Run from the repository root in PowerShell:
#   .\deploy\oracle-micro-deploy.ps1
# It builds the backend jar and the React site, uploads them with the nginx config, runs deploy/oracle-micro-web.sh
# on the server (which installs them and restarts the backend), and finally checks https://schooldhundo.in.
# New database migrations run by themselves when the backend starts. Secrets are never sent or printed here.
param(
    [string]$Server = "152.67.7.170",
    [string]$Key = "C:\Users\rakes\Documents\oracle-keys\ssh-key-2026-11-10.key",
    [switch]$SkipBuild
)
# Windows PowerShell 5.1 turns any stderr line of a native program (Maven's JDK warnings) into an error under "Stop",
# so failures are detected from each program's exit code instead.
$ErrorActionPreference = "Continue"
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" } }
$root = Split-Path -Parent $PSScriptRoot
$ssh = @("-i", $Key, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new")
$target = "ubuntu@$Server"

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

if (-not $SkipBuild) {
    Step "Building the backend"
    Push-Location "$root\backend"
    try { .\mvnw.cmd -B -q -DskipTests package; if ($LASTEXITCODE -ne 0) { throw "backend build failed" } } finally { Pop-Location }

    Step "Building the website"
    Push-Location "$root\frontend"
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw "frontend build failed" } } finally { Pop-Location }
}

$jar = Get-ChildItem "$root\backend\target\india-school-finder-backend-*.jar" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $jar) { throw "no backend jar in backend\target; run without -SkipBuild" }

Step "Uploading to $Server"
# sudo: folders uploaded from Windows can arrive read-only, which a plain rm cannot clear.
ssh @ssh $target "sudo rm -rf /tmp/schooldhundo && mkdir -p /tmp/schooldhundo"; Check "preparing the upload folder"
scp @ssh -q $jar.FullName "${target}:/tmp/schooldhundo/app.jar"; Check "uploading the backend"
scp @ssh -q -r "$root\frontend\dist" "${target}:/tmp/schooldhundo/www"; Check "uploading the website"
scp @ssh -q "$root\frontend\nginx.conf" "$root\frontend\security-headers.conf" "$root\deploy\oracle-micro-web.sh" "${target}:/tmp/schooldhundo/"
Check "uploading the server settings"

Step "Installing on the server (the backend takes about a minute to start)"
ssh @ssh $target "sed -i 's/\r$//' /tmp/schooldhundo/oracle-micro-web.sh && bash /tmp/schooldhundo/oracle-micro-web.sh > /tmp/web-setup.log 2>&1; code=`$?; tail -6 /tmp/web-setup.log; rm -f /tmp/schooldhundo/app.jar; exit `$code"
if ($LASTEXITCODE -ne 0) { throw "server setup failed; see /tmp/web-setup.log on the server" }

Step "Checking the live site"
$status = curl.exe -s -o NUL -m 30 -w "%{http_code}" https://schooldhundo.in/
Write-Host "https://schooldhundo.in -> HTTP $status"
