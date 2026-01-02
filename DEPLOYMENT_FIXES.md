# Deployment Fixes Summary

## Backend Issue: Permission Denied on Logs Directory

### Problem
```
Error: EACCES: permission denied, mkdir 'logs'
```

### Root Cause
Winston logger was trying to create a `logs` directory, but the Docker container runs as non-root user `nodejs` who doesn't have write permissions to `/app`.

### Solution
Updated `backend/src/config/logger.ts` to:
- **Production**: Use console transport (Railway captures stdout/stderr)
- **Development**: Use file transports to `logs/` directory

This is best practice for cloud deployments where logs are captured by the platform.

## Frontend Issue: auctra.svg Not Found (404)

### Problem
```
GET /auctra.svg - 404 Not Found
```

### Root Cause
The `auctra.svg` file was in the frontend root directory but not in the `public/` directory. Vite only serves files from the `public/` directory in production builds.

### Solution
Copied `auctra.svg` to `public/auctra.svg` so Vite includes it in the build output.

## Files Changed

### Backend
- `src/config/logger.ts` - Updated to use console transport in production

### Frontend
- Created `public/auctra.svg` - Moved SVG to public directory for Vite

## Deployment Steps

```bash
# Rebuild backend
cd backend
npm run build

# Rebuild frontend  
cd frontend
npm run build

# Commit and push
git add .
git commit -m "fix: logger permissions and SVG asset path"
git push origin main
```

Railway and Vercel will auto-deploy the fixes.
