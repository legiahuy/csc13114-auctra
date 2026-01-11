<!-- title: AUCTRA -->
<br />
<div align="center">
  <h1 align="center">Auctra</h1>
  <p align="center">
    A modern online auction platform designed for seamless user experience
  </p>
  <a href="https://csc13114-auctra.vercel.app/">Go to Auctra!</a>
</div>

## Overview

Auctra is a comprehensive, full-stack online auction platform featuring real-time bidding, automated notifications, secure payments, and role-based access control. Built with modern technologies and best practices, it provides a seamless experience for buyers and sellers.

## Description

Auctra solves the challenge of creating a reliable and engaging online auction environment. It supports multiple user roles including Guests, Bidders, Sellers, and Administrators. The platform leverages real-time technologies to ensure instant bid updates and chat functionality. With a focus on security and usability, Auctra implements robust authentication, payment processing via Stripe, and a responsive design suitable for all devices.

## Information & Contact

- Course: University of Science, VNU-HCM - CSC13114
- Project: Auctra - Online Auction Platform
- Team Members:

| No. | Student ID | Full Name    | Email                     |
| --- | ---------- | ------------ | ------------------------- |
| 1   | 22127152   | Lê Gia Huy   | lghuy22@clc.fitus.edu.vn  |
| 2   | 22127203   | Võ Ngọc Khoa | vnkhoa22@clc.fitus.edu.vn |

## Screenshots

![Homepage](screenshots/homepage.png)
_Homepage: Featured auctions and navigation_

![Product Details](screenshots/product_detail.png)
_Product Details: Comprehensive view with images, description, and bid history_

![Bidding Interface](screenshots/bidding.png)
_Bidding Interface: Real-time bid placement modal_

![Seller Dashboard](screenshots/seller_dashboard.png)
_Seller Dashboard: Product management and sales tracking_

![Admin Dashboard](screenshots/admin_dashboard.png)
_Admin Dashboard: System metrics and user management_

## Features

### Core Features

1. **User Management & Roles**

   - **Guest Users**: Browse categories, search products, view details.
   - **Bidders**: Place bids, auto-bidding, watch lists, Q&A with sellers.
   - **Sellers**: Post auctions, manage products, reject bids, dashboard analytics.
   - **Administrators**: Manage categories, users, and platform settings.

2. **Product Discovery**

   - **Smart Search**: Full-text search with Vietnamese language support.
   - **Category Navigation**: 2-level hierarchy for organized browsing.
   - **Rich Details**: Comprehensive product info, images, and history.

3. **Bidding System**
   - **Live Bidding**: Real-time bid placement and updates.
   - **Auto-Bidding**: Set max bid for automated participation.
   - **Bid Extension**: Automatic time extension for last-minute bids.

### Advanced Features

1. **Real-Time Ecosystem**

   - **Notifications**: Instant alerts for bids, wins, and events via Socket.io and Email.
   - **Live Chat**: Direct messaging between buyers and sellers.
   - **Dynamic Updates**: Real-time dashboard and bid history updates.

2. **Security & Payments**
   - **Secure Payments**: 4-step order completion with Stripe integration.
   - **Authentication**: JWT-based access and refresh token system.
   - **Access Control**: Role-based permissions and verification.

### User Interface

- **Responsive Design**: Optimized for desktop, tablet, and mobile.
- **Modern UX**: Built with React and Tailwind CSS for a premium feel.
- **Internationalization**: Full Vietnamese language support.

### Quality Features

- **Performance**: Optimized load times and real-time responsiveness.
- **Reliability**: Comprehensive error handling and validation (Zod/Yup).
- **Scalability**: Docker containerization and cloud-ready architecture (Railway/Vercel).

## Tech Stack

### Frontend

![React][React] ![TypeScript][TypeScript] ![Vite][Vite] ![TailwindCSS][TailwindCSS]
![Zustand][Zustand] ![Stripe][Stripe] ![Socket.io][Socket]

### Backend

![Node.js][Node.js] ![Express][Express] ![PostgreSQL][PostgreSQL] ![Sequelize][Sequelize]
![Docker][Docker] ![JWT][JWT] ![SendGrid][SendGrid]

### Development Tools

![Git][Git] ![ESLint][ESLint] ![Prettier][Prettier]

<!-- MARKDOWN LINKS & IMAGES -->

[React]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Zustand]: https://img.shields.io/badge/Zustand-orange?style=for-the-badge&logo=redux&logoColor=white
[Stripe]: https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white
[Socket]: https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white
[Node.js]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Express]: https://img.shields.io/badge/Express.js-404D59?style=for-the-badge
[PostgreSQL]: https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white
[Sequelize]: https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white
[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[JWT]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white
[SendGrid]: https://img.shields.io/badge/SendGrid-3498DB?style=for-the-badge&logo=sendgrid&logoColor=white
[Git]: https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white
[ESLint]: https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white
[Prettier]: https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black

## Building and Usage

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ (or Supabase account)
- **Git**
- **Stripe Account** (for payments)
- **SendGrid Account** (for email notifications)

### Installation

**For detailed installation instructions, see [INSTALL_GUIDE.md](INSTALL_GUIDE.md)**

#### Quick Start (Docker - Recommended)

```bash
# Clone the repository
git clone https://github.com/legiahuy/csc13114-auctra.git
cd csc13114-auctra

# Start all services with Docker
docker-compose up -d --build

# Seed the database
docker-compose exec backend npm run seed:prod

# Access the application
# Frontend: http://localhost:3001
# Backend: http://localhost:3000
# API Docs: http://localhost:3000/api-docs
```

#### Manual Setup

1. **Backend Setup**

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run build
   npm run seed  # Seed database with sample data
   npm start     # Start production server
   ```

2. **Frontend Setup**

   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run build
   npm run preview  # Serve production build
   ```

3. **Access the Application**
   - Frontend: http://localhost:4173 (preview) or http://localhost:5173 (dev)
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs

### Test Accounts

After running the seed script (`npm run seed` or `npm run seed:prod`), you can use these test accounts:

#### Admin Account

- **Email**: `admin@auction.com`
- **Password**: `admin123`
- **Permissions**: Full platform administration

#### Seller Accounts (Password: `seller123`)

- `seller1@auction.com` - Alex Nguyen
- `seller2@auction.com` - Bella Tran
- `seller3@auction.com` - David Vo
- `seller4@auction.com` - Emma Do
- `seller5@auction.com` - Frank Luu

#### Bidder Accounts (Password: `bidder123`)

- `bidder1@auction.com` - Chris Le
- `bidder2@auction.com` - Diana Pham
- `bidder3@auction.com` - Ethan Hoang
- `bidder4@auction.com` - Fiona Bui
- `bidder5@auction.com` - George Dang
- `bidder6@auction.com` - Hannah Nguyen
- `bidder7@auction.com` - Ian Tran

### Seed Data Overview

The seed script creates a complete auction environment:

- **35 Products** across 5 categories (10 ended, 25 active)
- **5 Categories**: Electronics (Phones, Laptops), Fashion (Shoes, Watches), Home & Living (Furniture)
- **200+ Bids** with maxBid (proxy bidding) system
- **10 Completed Orders** with bidirectional reviews
- **20 Reviews** (buyer→seller, seller→buyer)
- **Realistic Data**: User ratings calculated from actual reviews, logical bid progression

All products have:

- Minimum 5 bids per product
- Valid Unsplash images
- Complete descriptions
- Bid history with timestamps

### Environment Variables

#### Backend (.env)

```bash
# Server
PORT=3000
NODE_ENV=development

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
DB_SSL=true

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
EMAIL_FROM=verified_sender@example.com

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=product-images

# Frontend
FRONTEND_URL=http://localhost:5173

# reCAPTCHA & Stripe
RECAPTCHA_SECRET_KEY=your-secret-key
STRIPE_SECRET_KEY=your-stripe-secret-key

#Grafana
LOKI_HOST=http://localhost:3100
```

#### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

**Note**: For detailed environment setup and Docker deployment, see [INSTALL_GUIDE.md](INSTALL_GUIDE.md)

### Docker Deployment

Run the entire stack with Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Stop services
docker-compose down
```

## Logging & Monitoring

The platform includes a comprehensive monitoring stack using **Loki**, and **Grafana**.

### Setup

**Setup Backend**: Ensure `LOKI_HOST=http://localhost:3100` is set in your `backend/.env`.

### Start Monitoring Stack

Run only the monitoring services using Docker Compose:

```bash
docker-compose up -d --no-deps prometheus loki grafana
```

### Access Dashboards

- **Grafana**: [http://localhost:3002](http://localhost:3002) (User/Pass: `admin`/`admin`)
- **Loki Explorer**: Inside Grafana, go to **Explore** and select **Loki** as the datasource.

## Project Structure

```
csc13114-auctra/
├── backend/                  # Express.js API Server
│   ├── src/
│   │   ├── config/          # Database & app configuration
│   │   ├── controllers/     # Route controllers (auth, product, bid, order, etc.)
│   │   ├── docs/            # Swagger API documentation
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Sequelize ORM models
│   │   ├── routes/          # API route definitions
│   │   ├── scripts/         # Database seed scripts
│   │   ├── services/        # Business logic & external services
│   │   ├── templates/       # Email templates
│   │   ├── utils/           # Helper functions & utilities
│   │   └── server.ts        # Express server entry point
│   ├── dist/                # Compiled JavaScript (production)
│   ├── logs/                # Application logs
│   ├── .env.example         # Environment variables template
│   ├── Dockerfile           # Backend container configuration
│   └── package.json         # Backend dependencies
│
├── frontend/                 # React Application
│   ├── src/
│   │   ├── api/             # API client & axios configuration
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Third-party library configurations
│   │   ├── pages/           # Page components (routes)
│   │   ├── store/           # Zustand state management
│   │   ├── App.tsx          # Main app component & routing
│   │   ├── main.tsx         # React entry point
│   │   └── index.css        # Global styles (Tailwind)
│   ├── public/              # Static assets
│   ├── dist/                # Production build output
│   ├── .env.example         # Environment variables template
│   ├── Dockerfile           # Frontend container configuration
│   └── package.json         # Frontend dependencies
│
├── monitoring/               # Observability stack
│   ├── grafana/             # Grafana dashboards & config
│   └── loki/                # Loki logging configuration
│
├── screenshots/              # Application screenshots
├── docker-compose.yml        # Multi-container orchestration
├── INSTALL_GUIDE.md         # Detailed installation guide
├── README.md                # Project documentation
└── LICENSE                  # MIT License
```
