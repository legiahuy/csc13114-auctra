# Railway Deployment Fix

## Issue
Railway build failed with error:
```
sh: tsc: not found
exit code: 127
```

## Root Cause
The Dockerfile was installing only production dependencies (`npm ci --only=production`) in the build stage, but TypeScript (`tsc`) is a devDependency needed to compile the code.

## Solution
Updated `backend/Dockerfile` line 11:
- **Before**: `RUN npm ci --only=production && \`
- **After**: `RUN npm ci && \`

This ensures all dependencies (including devDependencies like TypeScript) are installed during the build stage.

## Additional Files Created
- `backend/railway.json` - Railway-specific configuration for Dockerfile builds

## How to Deploy

### Option 1: Push to GitHub
```bash
git add backend/Dockerfile backend/railway.json
git commit -m "fix: install devDependencies for Railway build"
git push origin main
```
Railway will automatically detect the changes and redeploy.

### Option 2: Railway CLI
```bash
cd backend
railway up
```

## Verification
After deployment, check:
1. Build logs show TypeScript compilation succeeding
2. Health check endpoint responds: `https://your-app.railway.app/health`
3. API documentation accessible: `https://your-app.railway.app/api-docs`
