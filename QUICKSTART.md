# Quick Start Guide - CI/CD Setup

This is a quick reference for setting up CI/CD for the Online Auction Platform.

## ⚡ Quick Setup (5 Minutes)

### 1. GitHub Secrets (Required)

Go to: `GitHub Repo > Settings > Secrets and variables > Actions`

Add these secrets:

| Secret Name | Where to Get It | Required For |
|-------------|----------------|--------------|
| `RAILWAY_TOKEN` | Railway Dashboard > Account Settings > Tokens | Backend deployment |
| `RAILWAY_BACKEND_URL` | After deploying to Railway | Frontend config |
| `VERCEL_TOKEN` | Vercel Dashboard > Settings > Tokens | Frontend deployment |
| `VERCEL_APP_URL` | After deploying to Vercel | Documentation |
| `VITE_API_URL` | Same as RAILWAY_BACKEND_URL | Frontend build |
| `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA | Frontend build |

### 2. Deploy Backend (Railway)

```bash
# 1. Go to railway.app
# 2. New Project > Deploy from GitHub
# 3. Select your repo
# 4. Settings > Set root directory to "backend"
# 5. Add environment variables (see DEPLOYMENT.md)
# 6. Deploy!
```

### 3. Deploy Frontend (Vercel)

```bash
# 1. Go to vercel.com
# 2. New Project > Import Git Repository
# 3. Set root directory to "frontend"
# 4. Add environment variables
# 5. Deploy!
```

### 4. Test CI/CD

```bash
# Make a small change
git checkout -b test/ci
echo "# Test" >> README.md
git add . && git commit -m "test: CI pipeline"
git push origin test/ci

# Create PR and watch workflows run!
```

## 📁 Files Created

- ✅ `.github/workflows/backend-ci.yml` - Backend CI
- ✅ `.github/workflows/frontend-ci.yml` - Frontend CI
- ✅ `.github/workflows/deploy.yml` - Auto deployment
- ✅ `backend/Dockerfile` - Backend container
- ✅ `frontend/Dockerfile` - Frontend container
- ✅ `frontend/nginx.conf` - Nginx config
- ✅ `docker-compose.yml` - Local development
- ✅ `DEPLOYMENT.md` - Full deployment guide
- ✅ `CONTRIBUTING.md` - Contribution guidelines
- ✅ `README.md` - Updated documentation

## 🐳 Test Locally with Docker

```bash
# Start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3001
# Backend: http://localhost:3000
# API Docs: http://localhost:3000/api-docs
```

## 🚀 What Happens Now?

1. **Every Push/PR** → CI workflows run automatically
2. **Merge to Main** → Auto-deploy to Railway + Vercel
3. **Health Checks** → Verify deployments succeeded

## 📚 Full Documentation

- **Setup**: See [README.md](file:///Users/bonpaul/Downloads/Github/csc13114-online-auction/README.md)
- **Deployment**: See [DEPLOYMENT.md](file:///Users/bonpaul/Downloads/Github/csc13114-online-auction/DEPLOYMENT.md)
- **Contributing**: See [CONTRIBUTING.md](file:///Users/bonpaul/Downloads/Github/csc13114-online-auction/CONTRIBUTING.md)
- **Workflows**: See [.github/workflows/README.md](file:///Users/bonpaul/Downloads/Github/csc13114-online-auction/.github/workflows/README.md)

## ⚠️ Important Notes

- CI workflows only run on changes to their respective directories
- Deployment only runs on push to `main` branch
- All secrets must be configured for deployment to work
- Docker requires `.env` files for local development

## 🆘 Need Help?

See the troubleshooting sections in:
- [DEPLOYMENT.md](file:///Users/bonpaul/Downloads/Github/csc13114-online-auction/DEPLOYMENT.md) - Deployment issues
- [.github/workflows/README.md](file:///Users/bonpaul/Downloads/Github/csc13114-online-auction/.github/workflows/README.md) - CI/CD issues
