# Deployment Fixes Summary

## Backend Issue: Permission Denied on Logs Directory

### Problem
```
Error: EACCES: permission denied, mkdir 'logs'
```

### Root Cause
1. The application tries to write logs to `logs/` directory if `NODE_ENV` is not explicitly set to `production` (defaults to development mode).
2. The Docker container runs as non-root user `nodejs`, which does not have permission to create directories in `/app`.
3. The `logs` directory didn't exist in the image.

### Solution
Updated `backend/Dockerfile` to:
1. Explicitly create the `logs` directory: `RUN mkdir -p logs && chown -R nodejs:nodejs logs`
2. Force production mode: `ENV NODE_ENV=production`
3. Re-enable the `HEALTHCHECK` instruction.

This ensures that:
- The `logs` directory exists and is writable by the application user.
- The application defaults to production mode (using console logging) even if Railway variables are missing.

## Frontend Issue: auctra.svg Not Found (404)

### Problem
```
GET /auctra.svg - 404 Not Found
```

### Root Cause
The `auctra.svg` file was in the frontend root directory but not in the `public/` directory. Vite only serves files from the `public/` directory in production builds.

### Solution
Copied `auctra.svg` to `public/auctra.svg` so Vite includes it in the build output.

## Deployment Steps

```bash
# Verify changes
git diff backend/Dockerfile

# Commit and push
git add .
git commit -m "fix: docker permissions and node_env"
git push origin main
```

Railway will auto-deploy.
