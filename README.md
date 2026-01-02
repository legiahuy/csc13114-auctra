# 🏛️ Auctra - Sàn Đấu Giá Trực Tuyến

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)

A comprehensive, full-stack online auction platform featuring real-time bidding, automated notifications, secure payments, and role-based access control. Built with modern technologies and best practices.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Database Setup](#-database-setup)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 👤 Guest Users
- 🗂️ **Category Navigation** - Browse 2-level category hierarchy
- 🏠 **Homepage** - Featured and trending products
- 📄 **Product Listings** - Paginated product browsing
- 🔍 **Full-Text Search** - Vietnamese language support without diacritics
- 📦 **Product Details** - Comprehensive product information and bid history
- 📝 **User Registration** - Secure signup with OTP verification

### 🎯 Bidders
- ⭐ **Watch List** - Track favorite auctions
- 💰 **Live Bidding** - Real-time bid placement
- 🤖 **Auto-Bidding** - Automated bidding up to max amount
- 📊 **Bid History** - Complete bidding activity tracking
- 💬 **Q&A System** - Ask sellers questions about products
- 👤 **Profile Management** - Update personal information and preferences
- 📈 **Seller Upgrade** - Request seller privileges

### 🏪 Sellers
- ➕ **Product Posting** - Create auction listings with rich descriptions
- ✏️ **Product Management** - Update descriptions and details
- 🚫 **Bid Control** - Reject inappropriate bids
- 💬 **Answer Questions** - Respond to buyer inquiries
- 📊 **Dashboard** - Track sales and performance
- ⭐ **Rating System** - Build seller reputation

### 👨‍💼 Administrators
- 🗂️ **Category Management** - Create and organize categories
- 📦 **Product Oversight** - Monitor and manage all listings
- 👥 **User Management** - Manage user accounts and roles
- 📊 **Analytics Dashboard** - View platform statistics and metrics
- 🔧 **System Settings** - Configure platform parameters

### 🚀 System Features
- 📧 **Email Notifications** - Automated alerts for bids, wins, and updates
- ⏰ **Auto-Bid Extension** - Extend auctions when bids placed near end time
- 💳 **Payment Processing** - Secure 4-step order completion with Stripe
- 💬 **Real-Time Chat** - Socket.io powered messaging between buyers and sellers
- 🔐 **JWT Authentication** - Secure access and refresh token system
- 📱 **Responsive Design** - Mobile-friendly interface
- 🌐 **Internationalization** - Vietnamese language support

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Sequelize
- **Authentication**: JWT (Access + Refresh Tokens)
- **File Storage**: Supabase Storage
- **Email**: Nodemailer with MJML templates
- **Real-time**: Socket.io
- **Payment**: Stripe
- **Security**: Bcrypt, Helmet, Rate Limiting
- **API Docs**: Swagger/OpenAPI
- **Logging**: Winston with Loki integration
- **Monitoring**: Prometheus metrics

### Frontend
- **Framework**: React 18.2
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Forms**: React Hook Form + Formik
- **Validation**: Zod + Yup
- **UI Components**: Material-UI + Radix UI
- **Styling**: Tailwind CSS
- **Rich Text**: React Quill
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Payment**: Stripe React

### DevOps
- **CI/CD**: GitHub Actions
- **Containerization**: Docker + Docker Compose
- **Backend Hosting**: Railway
- **Frontend Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│  React Frontend │◄───────►│  Express API    │
│   (Vercel)      │  REST   │   (Railway)     │
│                 │         │                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ Socket.io                 │
         │                           │
         └───────────┬───────────────┘
                     │
         ┌───────────▼────────────┐
         │                        │
         │  PostgreSQL (Supabase) │
         │  Storage (Supabase)    │
         │                        │
         └────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ (or Supabase account)
- **Git**
- **Stripe Account** (for payments)
- **Gmail Account** (for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/legiahuy/csc13114-online-auction.git
   cd csc13114-online-auction
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your configuration
   npm run seed  # Seed database with sample data
   npm run dev   # Start development server
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev   # Start development server
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs

## ⚙️ Environment Configuration

### Backend (.env)

```bash
# Server
PORT=3000
NODE_ENV=development

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
DB_SSL=true

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@auction.com

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=product-images

# Frontend URL
FRONTEND_URL=http://localhost:5173

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your-secret-key

# Stripe (optional)
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000
VITE_RECAPTCHA_SITE_KEY=your-site-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

## 💾 Database Setup

### Using Supabase (Recommended)

1. Create a [Supabase](https://supabase.com) account
2. Create a new project
3. Copy the connection string from Settings > Database
4. Update `DATABASE_URL` in backend `.env`
5. Run migrations:
   ```bash
   cd backend
   npm run seed
   ```

### Local PostgreSQL

1. Install PostgreSQL 15+
2. Create database:
   ```bash
   createdb online_auction
   ```
3. Update `.env` with local credentials
4. Run migrations and seed:
   ```bash
   npm run seed
   ```

## 🧪 Test Accounts

After running `npm run seed`, use these accounts:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | admin@auction.com | admin123 | Full system access |
| **Seller 1** | seller1@auction.com | seller123 | Nguyễn Văn A (80% rating) |
| **Seller 2** | seller2@auction.com | seller123 | Trần Thị B (90% rating) |
| **Bidder 1** | bidder1@auction.com | bidder123 | Lê Văn C (80% rating) |
| **Bidder 2** | bidder2@auction.com | bidder123 | Phạm Thị D (90% rating) |
| **Bidder 3** | bidder3@auction.com | bidder123 | Hoàng Văn E (70% rating) |

### Sample Data
- 6 users (1 admin, 2 sellers, 3 bidders)
- 6 categories (2-level hierarchy)
- 5 products with full details
- 25-50 bids across products

## 📚 API Documentation

Interactive API documentation is available via Swagger UI:

- **Development**: http://localhost:3000/api-docs
- **Production**: https://your-api.railway.app/api-docs

### Key Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/products` - List products
- `POST /api/bids` - Place bid
- `GET /api/categories` - List categories
- `WebSocket /socket.io` - Real-time events

## 🚢 Deployment

### Backend (Railway)

1. **Create Railway Project**
   - Visit [Railway](https://railway.app)
   - Create new project from GitHub repo
   - Select `backend` directory

2. **Configure Environment Variables**
   - Add all variables from `.env`
   - Railway will auto-detect and deploy

3. **Database**
   - Use existing Supabase connection
   - Or add Railway PostgreSQL plugin

### Frontend (Vercel)

1. **Deploy to Vercel**
   - Visit [Vercel](https://vercel.com)
   - Import GitHub repository
   - Set root directory to `frontend`

2. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables**
   - Add `VITE_API_URL` with Railway backend URL
   - Add other `VITE_*` variables

### CI/CD

GitHub Actions workflows automatically:
- ✅ Run linting and type checking
- ✅ Build both backend and frontend
- ✅ Deploy to Railway and Vercel on push to main

See [.github/workflows/](.github/workflows/) for details.

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests (if configured)
npm run test:e2e
```

## 🐳 Docker

Run the entire stack with Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

Services:
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Project**: CSC13114 - Online Auction Platform
- **Institution**: University of Information Technology, VNU-HCM

## 🙏 Acknowledgments

- Material-UI for component library
- Supabase for database and storage
- Railway and Vercel for hosting
- All open-source contributors

---

**Built with ❤️ by the CSC13114 team**
