# Railway Health Check Troubleshooting

## Issue
Railway deployment succeeds but health check fails with "service unavailable" errors.

## Likely Causes

### 1. Missing Environment Variables ⚠️
The server requires these critical environment variables to start:
- `DATABASE_URL` - Supabase connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret

**Solution**: Configure these in Railway Dashboard > Variables

### 2. Database Connection Timeout
The server tries to connect to the database before starting (line 151 in server.ts). If the database is unreachable or credentials are wrong, the server won't start.

**Solution**: Verify Supabase connection string is correct

### 3. Port Binding
Railway assigns a dynamic PORT. The server should use `process.env.PORT`.

**Solution**: Already handled in server.ts line 47

## How to Fix

### Step 1: Configure Railway Environment Variables

Go to Railway Dashboard > Your Project > Variables and add:

```bash
# Required
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-chars

# Recommended
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
DB_SSL=true

# Optional (email features)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@auction.com

# Optional (Supabase storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=product-images

# Optional (reCAPTCHA)
RECAPTCHA_SECRET_KEY=your-secret-key
```

### Step 2: Verify Database Connection

Test your Supabase connection string:
1. Go to Supabase Dashboard > Settings > Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your actual database password
4. Ensure SSL is enabled (`?sslmode=require` or `DB_SSL=true`)

### Step 3: Check Railway Logs

After configuring variables, check the deployment logs:
```
Railway Dashboard > Deployments > Latest > Logs
```

Look for:
- ✅ "Database connection established successfully"
- ✅ "Server is running on port XXXX"
- ❌ Any error messages about missing variables or connection failures

### Step 4: Test Health Check Manually

Once deployed, test the health endpoint:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{"status":"OK","timestamp":"2026-01-02T..."}
```

## Quick Checklist

- [ ] DATABASE_URL configured in Railway
- [ ] JWT_SECRET configured (min 32 characters)
- [ ] JWT_REFRESH_SECRET configured (min 32 characters)
- [ ] Supabase database is accessible
- [ ] Database password is correct
- [ ] SSL is enabled for database connection
- [ ] Railway logs show successful database connection
- [ ] Health endpoint responds with 200 OK

## Common Errors

### "Unable to start server: SequelizeConnectionError"
- **Cause**: Database connection failed
- **Fix**: Verify DATABASE_URL and database credentials

### "JWT_SECRET is not defined"
- **Cause**: Missing environment variable
- **Fix**: Add JWT_SECRET to Railway variables

### "ECONNREFUSED"
- **Cause**: Cannot connect to database
- **Fix**: Check Supabase project is running and connection string is correct

## Need Help?

If issues persist:
1. Check Railway logs for specific error messages
2. Verify all environment variables are set
3. Test database connection from local machine
4. Ensure Supabase project is active and accessible
