# Deployment Fixes Summary

## Backend Issue 1: Permission Denied on Logs Directory
**Fixed**: Explicitly created `logs` directory in Dockerfile and set permissions.

## Backend Issue 2: Supabase Connection Failure (ENETUNREACH)
**Fixed**: Implemented robust DNS resolution script (`resolve-db.js`) to force IPv4 connection, bypassing Railway's IPv6 networking issues.

## Frontend Issue 1: auctra.svg Not Found (404)
**Fixed**: Copied `auctra.svg` to `public/` directory.

## Frontend Issue 2: 404 on Refresh/Deep Links (Vercel)
**Fixed**: Created `frontend/vercel.json` to rewrite all routes to `index.html` (SPA fallback).

## Final Deployment Steps

```bash
# Verify changes
git diff frontend/vercel.json

# Commit and push
git add .
git commit -m "fix: frontend routing on vercel"
git push origin main
```
