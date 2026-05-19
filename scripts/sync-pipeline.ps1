# sync-pipeline.ps1
# Copies the master pipeline JSON into the repo and pushes to GitHub.
# Vercel auto-deploys on push. App picks up new cards on next focus.
#
# Usage: pwsh scripts/sync-pipeline.ps1
# Or with custom source: pwsh scripts/sync-pipeline.ps1 -Source "C:\path\to\file.json"

param(
  [string]$Source = "C:\Users\azaol\Desktop\gsd_pipeline_import.json"
)

$dest = "C:\Users\azaol\GSDRolesTracker\public\pipeline.json"

if (-not (Test-Path $Source)) {
  Write-Error "Source file not found: $Source"
  exit 1
}

Copy-Item $Source $dest -Force
Write-Output "Copied $Source -> $dest"

Set-Location "C:\Users\azaol\GSDRolesTracker"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git add public/pipeline.json
git commit -m "sync: pipeline update $timestamp"
git push

Write-Output ""
Write-Output "Pipeline synced. Vercel deploying now (~30s). App will auto-refresh on next tab focus."
