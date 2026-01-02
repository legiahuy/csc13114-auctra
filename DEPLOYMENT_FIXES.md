# Deployment Fixes Summary

## Backend Issue 1: Permission Denied on Logs Directory

### Problem
```
Error: EACCES: permission denied, mkdir 'logs'
```

### Solution
Updated `backend/Dockerfile` to:
1. Explicitly create the `logs` directory and grant permissions to `nodejs` user.
2. Force `NODE_ENV=production` to ensure console logging is used.

## Backend Issue 2: Supabase Connection Failure (ENETUNREACH)

### Problem
```
SequelizeConnectionError: connect ENETUNREACH 2406:da1a:6b0:...
```

### Root Cause
Railway containers persist in resolving Supabase domains to IPv6 addresses, which fail to connect (ENETUNREACH). Neither Sequelize options nor node settings were sufficient to override the OS-level DNS preference.

### Solution
Implemented a **Hard Force IPv4** strategy:
1. Created `backend/resolve-db.js`: A script that uses Node's `dns.resolve4()` to resolve the Supabase hostname to an explicit IPv4 address.
2. Updated `backend/start.sh`: execution script now runs `resolve-db.js` first, and rewrites the `DATABASE_URL` environment variable with the resolved IPv4 address.
3. Updated `backend/Dockerfile` to include the new script.

This guarantees that the main application receives a connection string with an IPv4 address (e.g., `postgresql://...142.x.x.x:5432/...`) instead of a hostname, bypassing any DNS ambiguity.

## Frontend Issue: auctra.svg Not Found (404)

### Problem
```
GET /auctra.svg - 404 Not Found
```

### Solution
Copied `auctra.svg` to `public/auctra.svg`.

## Final Deployment Steps

```bash
# Verify changes
git diff backend/start.sh backend/resolve-db.js

# Commit and push
git add .
git commit -m "fix: hard resolve database hostname to ipv4"
git push origin main
```

Result: Network reachable. 🚀
