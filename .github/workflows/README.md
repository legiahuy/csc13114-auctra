# GitHub Actions Workflows

This directory contains CI/CD workflows for the Online Auction Platform.

## Workflows

### 1. Backend CI (`backend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (backend changes only)
- Pull requests to `main` or `develop` (backend changes only)

**What it does:**
- Runs on Node.js 18.x and 20.x
- Installs dependencies
- Performs TypeScript type checking
- Builds the application
- Runs tests (if available)
- Uploads build artifacts

### 2. Frontend CI (`frontend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (frontend changes only)
- Pull requests to `main` or `develop` (frontend changes only)

**What it does:**
- Runs on Node.js 18.x and 20.x
- Installs dependencies
- Performs TypeScript type checking
- Runs ESLint
- Builds the application
- Runs tests (if available)
- Uploads build artifacts

### 3. Deployment (`deploy.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger via GitHub Actions UI

**What it does:**
- Deploys backend to Railway
- Deploys frontend to Vercel (after backend deployment)
- Sends deployment status notification

## Required GitHub Secrets

Configure these secrets in your repository settings (Settings > Secrets and variables > Actions):

### Railway Deployment
- `RAILWAY_TOKEN` - Railway API token
  - Get from: Railway Dashboard > Account Settings > Tokens
- `RAILWAY_BACKEND_URL` - Your Railway backend URL (e.g., `https://your-app.railway.app`)

### Vercel Deployment
- `VERCEL_TOKEN` - Vercel API token
  - Get from: Vercel Dashboard > Settings > Tokens
- `VERCEL_APP_URL` - Your Vercel app URL (e.g., `https://your-app.vercel.app`)

### Environment Variables
- `VITE_API_URL` - Backend API URL for frontend
- `VITE_RECAPTCHA_SITE_KEY` - reCAPTCHA site key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (optional)

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with its corresponding value

## Manual Deployment

To manually trigger a deployment:

1. Go to Actions tab in your repository
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select the branch (usually `main`)
5. Click "Run workflow"

## Monitoring Workflows

- View workflow runs in the Actions tab
- Each workflow shows detailed logs for debugging
- Failed workflows will show error messages
- Artifacts are retained for 7 days

## Troubleshooting

### Backend CI Fails
- Check TypeScript errors in the logs
- Ensure all dependencies are in `package.json`
- Verify build script works locally

### Frontend CI Fails
- Check ESLint errors
- Ensure environment variables are set
- Verify build works locally with `npm run build`

### Deployment Fails
- Verify all secrets are correctly set
- Check Railway/Vercel dashboard for errors
- Ensure Railway CLI and Vercel CLI are up to date
- Check that environment variables are configured on the platforms

## Best Practices

1. **Always test locally** before pushing
2. **Use feature branches** for development
3. **Create pull requests** for code review
4. **Wait for CI to pass** before merging
5. **Monitor deployments** after merging to main
