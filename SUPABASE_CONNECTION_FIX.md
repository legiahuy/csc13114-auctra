# Critical: Supabase Database Connection Issue

## The Issue
Your deployment is failing with:
```
connect ENETUNREACH 2406:da1a:6b0:... (IPv6 address)
```
This confirms that **Railway is unable to connect to your Supabase database via IPv6.**

## The Cause
My automated script tried to find an IPv4 address for your database but failed. This strongly suggests that **your Supabase project is configured for IPv6-only direct connections**, which is the new default for Supabase.

Railway (and many Docker environments) does not fully support IPv6 egress by default.

## The Solution (Action Required)

You must switch to the **IPv4-compatible Connection Pooler**.

1. Log in to your **Supabase Dashboard**.
2. Go to **Settings** > **Database** > **Connection parameters**.
3. Look for **Connection Pooler** (or "Transaction Pooler").
4. Copy the URI. It will look like: 
   `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   
   *Note: Port is usually **6543**.*

5. Go to **Railway Dashboard** > **Variables**.
6. Update `DATABASE_URL` with this new Pooler URI (replace `[password]` with your actual password).
7. Redeploy.

**Why this works:** The Connection Pooler is hosted on AWS EC2 and provides a standard IPv4 address, which Railway can connect to reliably.
