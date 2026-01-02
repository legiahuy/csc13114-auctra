# Deployment Guide

This guide covers deploying the Online Auction Platform to production using Railway (backend) and Vercel (frontend).

## Prerequisites

- GitHub account with repository access
- Railway account ([railway.app](https://railway.app))
- Vercel account ([vercel.com](https://vercel.com))
- Supabase account for database ([supabase.com](https://supabase.com))
- Domain name (optional)

## Backend Deployment (Railway)

### 1. Initial Setup

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)
   - Connect your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect the Node.js backend

3. **Configure Root Directory**
   - Go to Settings > Service Settings
   - Set Root Directory to `backend`
   - Set Build Command to `npm run build`
   - Set Start Command to `npm start`

### 2. Environment Variables

Add these environment variables in Railway Dashboard > Variables:

```bash
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=your-supabase-connection-string
DB_SSL=true

# JWT
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@auction.com

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=product-images

# Frontend URL (update after deploying frontend)
FRONTEND_URL=https://your-app.vercel.app

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your-secret-key

# Stripe (optional)
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### 3. Deploy

- Railway will automatically deploy on push to main
- Or click "Deploy" in the Railway dashboard
- Monitor deployment logs for errors

### 4. Get Your Backend URL

- Find your Railway URL in the dashboard (e.g., `https://your-app.railway.app`)
- Save this for frontend configuration

## Frontend Deployment (Vercel)

### 1. Initial Setup

1. **Create Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Connect your GitHub account

2. **Import Project**
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the React app

3. **Configure Project**
   - Set Framework Preset to "Vite"
   - Set Root Directory to `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 2. Environment Variables

Add these in Vercel Dashboard > Settings > Environment Variables:

```bash
VITE_API_URL=https://your-app.railway.app
VITE_RECAPTCHA_SITE_KEY=your-site-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### 3. Deploy

- Click "Deploy"
- Vercel will build and deploy automatically
- Future pushes to main will auto-deploy

### 4. Update Backend FRONTEND_URL

- Copy your Vercel URL (e.g., `https://your-app.vercel.app`)
- Update `FRONTEND_URL` in Railway environment variables
- Redeploy backend

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database to be provisioned

### 2. Get Connection String

1. Go to Project Settings > Database
2. Copy the connection string
3. Replace `[YOUR-PASSWORD]` with your database password
4. Use this as `DATABASE_URL` in Railway

### 3. Run Migrations

Option 1: Local migration (recommended for first time)
```bash
cd backend
# Update .env with production DATABASE_URL
npm run seed
```

Option 2: Railway CLI
```bash
railway run npm run seed
```

### 4. Setup Storage

1. Go to Supabase Dashboard > Storage
2. Create a bucket named `product-images`
3. Set bucket to public
4. Copy the bucket URL for your app

## CI/CD Setup

### 1. Configure GitHub Secrets

Add these secrets in GitHub repository settings:

```
RAILWAY_TOKEN=your-railway-token
RAILWAY_BACKEND_URL=https://your-app.railway.app
VERCEL_TOKEN=your-vercel-token
VERCEL_APP_URL=https://your-app.vercel.app
VITE_API_URL=https://your-app.railway.app
VITE_RECAPTCHA_SITE_KEY=your-site-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

### 2. Get Railway Token

1. Go to Railway Dashboard
2. Account Settings > Tokens
3. Create new token
4. Copy and add to GitHub secrets

### 3. Get Vercel Token

1. Go to Vercel Dashboard
2. Settings > Tokens
3. Create new token
4. Copy and add to GitHub secrets

### 4. Enable Workflows

- Workflows are in `.github/workflows/`
- They will run automatically on push to main
- Monitor in GitHub Actions tab

## Custom Domain (Optional)

### Railway (Backend)

1. Go to Railway project settings
2. Click "Domains"
3. Add custom domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed
5. Update `VITE_API_URL` in Vercel

### Vercel (Frontend)

1. Go to Vercel project settings
2. Click "Domains"
3. Add custom domain (e.g., `yourdomain.com`)
4. Update DNS records as instructed
5. Update `FRONTEND_URL` in Railway

## Monitoring & Logs

### Railway
- View logs in Railway Dashboard > Deployments
- Set up log drains for external monitoring
- Monitor metrics in the Metrics tab

### Vercel
- View deployment logs in Vercel Dashboard
- Monitor analytics in the Analytics tab
- Set up error tracking (e.g., Sentry)

## Rollback Procedure

### Railway
1. Go to Deployments
2. Find previous successful deployment
3. Click "Redeploy"

### Vercel
1. Go to Deployments
2. Find previous deployment
3. Click "Promote to Production"

## Health Checks

Both services include health check endpoints:

- Backend: `https://your-app.railway.app/health`
- Frontend: `https://your-app.vercel.app/health`

Set up monitoring services (e.g., UptimeRobot) to ping these endpoints.

## Troubleshooting

### Backend Issues

**Build Fails:**
- Check TypeScript errors in logs
- Verify all dependencies are installed
- Check Node.js version compatibility

**Runtime Errors:**
- Check environment variables are set
- Verify database connection string
- Check logs for specific errors

**Database Connection:**
- Verify DATABASE_URL is correct
- Check Supabase project is active
- Ensure SSL is enabled

### Frontend Issues

**Build Fails:**
- Check ESLint errors
- Verify environment variables
- Check Vite configuration

**API Connection:**
- Verify VITE_API_URL is correct
- Check CORS settings on backend
- Verify backend is running

**Blank Page:**
- Check browser console for errors
- Verify build output directory
- Check routing configuration

## Security Checklist

- [ ] All secrets are in environment variables (not in code)
- [ ] JWT secrets are strong and unique
- [ ] Database password is strong
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced
- [ ] Security headers are set
- [ ] Dependencies are up to date

## Performance Optimization

1. **Enable Caching**
   - Configure CDN for static assets
   - Set appropriate cache headers

2. **Database Optimization**
   - Add indexes for frequently queried fields
   - Use connection pooling

3. **Frontend Optimization**
   - Enable gzip compression (done in nginx.conf)
   - Lazy load components
   - Optimize images

## Cost Estimation

### Railway (Backend)
- Free tier: $5 credit/month
- Hobby plan: $5/month
- Pro plan: $20/month

### Vercel (Frontend)
- Free tier: Unlimited for personal projects
- Pro plan: $20/month (for teams)

### Supabase (Database)
- Free tier: 500MB database, 1GB storage
- Pro plan: $25/month

**Total estimated cost:** $0-50/month depending on usage

## Support

- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
