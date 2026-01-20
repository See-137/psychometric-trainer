# Psychometric Trainer - Deploy Script
# Run this to deploy updates to production

param(
    [switch]$SkipBuild,
    [switch]$InvalidateCache
)

$ErrorActionPreference = "Stop"

$BUCKET = "psychometric-trainer-app-383349724213"
$DISTRIBUTION_ID = "E1F3Y3ECGYQV9N"
$APP_DIR = $PSScriptRoot

Write-Host "🚀 Deploying Psychometric Trainer..." -ForegroundColor Cyan

# Build (unless skipped)
if (-not $SkipBuild) {
    Write-Host "📦 Building app..." -ForegroundColor Yellow
    Push-Location $APP_DIR
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    Pop-Location
    Write-Host "✅ Build complete" -ForegroundColor Green
}

# Sync to S3
Write-Host "☁️ Uploading to S3..." -ForegroundColor Yellow
aws s3 sync "$APP_DIR/dist/" "s3://$BUCKET/" --delete
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ S3 sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Upload complete" -ForegroundColor Green

# Invalidate CloudFront cache (optional but recommended for updates)
if ($InvalidateCache) {
    Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Yellow
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    Write-Host "✅ Cache invalidation started" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "🌐 URL: https://di20bc9opj8ns.cloudfront.net" -ForegroundColor Cyan
