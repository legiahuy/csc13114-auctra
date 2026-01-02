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
3. Updated `backend/src/config/logger.ts` to use console transport when `NODE_ENV=production`.

## Backend Issue 2: Supabase Connection Failure (ENETUNREACH)

### Problem
```
SequelizeConnectionError: connect ENETUNREACH 2406:da1a:6b0:...
```

### Root Cause
Railway containers persist in resolving Supabase domains to IPv6 addresses, which fail to connect due to network stack incompatibility. OS-level DNS resolution in Alpine Linux can be tricky.

### Solution
Implemented a **Robust DNS Override**:
1. **Enhanced `backend/resolve-db.js`**: Tries two different methods to find an IPv4 address:
   - `dns.resolve4()`: Queries DNS servers directly for A records.
   - `dns.lookup({ family: 4 })`: Queries system resolver (getaddrinfo), which usually works better in Alpine containers.
2. **Result logging**: Logs errors to stderr (invisible to variable capture) and only the valid IPv4 URL to stdout.
3. **Startup Injection**: `start.sh` captures this URL and injects it into `DATABASE_URL` before the app starts.

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
git diff backend/resolve-db.js

# Commit and push
git add .
git commit -m "fix: robust dns lookup for ipv4"
git push origin main
```

**Verification:**
Check Railway logs for: `✅ Database URL updated. Host: [IP_ADDRESS]`
