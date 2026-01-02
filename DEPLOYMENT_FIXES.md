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
Railway containers were trying to connect to Supabase via IPv6. The previous fix (adding `family: 4` to dialectOptions) was not being respected because Sequelize prioritizes the connection string parameters over options in some cases.

### Solution
Completely refactored `backend/src/config/database.ts` to:
1. Manually parse the `DATABASE_URL` into components (host, port, user, password, database).
2. Pass these components explicitly to Sequelize.
3. Strict enforcement of `dialectOptions: { family: 4 }`.

This ensures the node process resolves the database hostname to an IPv4 address, creating a stable connection.

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
git diff backend/src/config/database.ts

# Commit and push
git add .
git commit -m "fix: robust database config for ipv4"
git push origin main
```

Railway will auto-deploy.
