# Re-imports SARAS data into the local dev database while saras-details-bulk.js is still fetching.
# Every cycle: rebuild the CSV from everything fetched so far, then import with VALID_ROWS_ONLY + updateExisting
# (already-imported schools are updated, new ones created). Stops after a final pass once every fetch log says "done:".
# Usage: powershell -File saras-import-loop.ps1 -DataDir <dir with *.jsonl> -Logs <fetch log>,<fetch log> [-Minutes 15]
param(
    [Parameter(Mandatory)] [string] $DataDir,
    [Parameter(Mandatory)] [string[]] $Logs,
    [int] $Minutes = 15,
    [string] $RetrievedDate = '2026-10-24'
)
$backend = Join-Path $PSScriptRoot '..\..\backend'
$builder = Join-Path $PSScriptRoot 'build-saras-csv.js'
$csv = Join-Path $DataDir 'all.csv'

while ($true) {
    $finished = @($Logs | Where-Object { (Test-Path $_) -and (Select-String -Path $_ -Pattern '^done:' -Quiet) }).Count -eq $Logs.Count
    $inputs = (Get-ChildItem $DataDir -Filter '*.jsonl' | Where-Object { $_.Name -in 'central.jsonl', 'others.jsonl', 'up-b.jsonl' } | ForEach-Object FullName) -join ','
    # The builder splits output into files of at most 4,500 rows (the import limit is 5,000) and prints "FILE <path>".
    $files = @()
    node $builder $inputs $csv $RetrievedDate | ForEach-Object {
        if ($_ -match '^FILE (.+)$') { $files += $Matches[1] } else { $_ }
    }
    Push-Location $backend
    foreach ($file in $files) {
        "$(Get-Date -Format HH:mm) importing $(Split-Path $file -Leaf)"
        & .\mvnw.cmd -B -q spring-boot:test-run "-Dspring-boot.run.main-class=com.indiaschoolfinder.LocalCsvImport" `
            "-Dspring-boot.run.arguments=$file VALID_ROWS_ONLY true" 2>&1 |
            Select-String -Pattern '^IMPORT|^\s+row \d+|BusinessValidation|ERROR' | ForEach-Object { "$(Get-Date -Format HH:mm) $($_.Line)" }
    }
    Pop-Location
    if ($finished) { "final import done"; break }
    Start-Sleep -Seconds ($Minutes * 60)
}
