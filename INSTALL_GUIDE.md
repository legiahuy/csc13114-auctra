# Auctra Project Installation Guide

This guide describes how to deploy the Auctra platform locally using Docker Compose or manual setup. This is the recommended way to run the application for testing and grading.

---

## 📌 Note for Grading

> **Dear Lecturer/Grader**: To make the setup process easier for you, we have included pre-configured `.env` files in both the `backend/` and `frontend/` directories. These files are already set up with working configurations, so you can skip the environment variable setup step if you prefer.
>
> The **Quick Start** section below will guide you through launching the application. Thank you for your time in reviewing our project!

---

## Prerequisites

- **Docker & Docker Compose** installed on your machine (for Docker deployment)
- **Node.js 18+** and **npm** (for manual setup)
- **PostgreSQL 15+** (for manual setup, or use Docker)
- **Git** (optional, if cloning the repo)

## Quick Start (Docker Deployment - Recommended)

### 1. Start All Services

Run the following command in the project root directory:

```bash
docker-compose up -d --build
```

This will build and start:

- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:3001
- **Database**: PostgreSQL on port 5432
- **Monitoring**: Grafana (http://localhost:3002) & Loki (port 3100)

### 2. Wait for Services

Wait for about a few minutes for all containers to initialize (especially the database).

### 3. Seed the Database

To populate the database with initial users, products, and categories, run:

```bash
docker-compose exec backend npm run seed:prod
```

**What this creates:**

- 1 Admin account
- 5 Seller accounts (with ratings)
- 7 Bidder accounts (with ratings)
- 35 products across 5 categories
- 10 completed orders with bidirectional reviews
- 20 reviews (buyer→seller, seller→buyer)
- ~200+ bids with maxBid system
- Product questions and answers

### 4. Access the Application

Open your browser to: **http://localhost:3001**

---

## Manual Setup (Without Docker)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL and service credentials
npm run build
npm run seed  # Seed database
npm start     # Start production server (or npm run dev for development)
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with backend API URL
npm run build
npm run preview  # Serve production build (or npm run dev for development)
```

### Access

- Frontend: http://localhost:4173 (preview) or http://localhost:5173 (dev)
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

---

## Test Accounts

After running the seed script, you can log in with these test accounts:

### Admin Account

- **Email**: `admin@auction.com`
- **Password**: `admin123`
- **Access**: Full platform administration, user management, category management

### Seller Accounts

All sellers have password: `seller123`

| Email                 | Name        |
| --------------------- | ----------- |
| `seller1@auction.com` | Alex Nguyen |
| `seller2@auction.com` | Bella Tran  |
| `seller3@auction.com` | David Vo    |
| `seller4@auction.com` | Emma Do     |
| `seller5@auction.com` | Frank Luu   |

### Bidder Accounts

All bidders have password: `bidder123`

| Email                 | Name          |
| --------------------- | ------------- |
| `bidder1@auction.com` | Chris Le      |
| `bidder2@auction.com` | Diana Pham    |
| `bidder3@auction.com` | Ethan Hoang   |
| `bidder4@auction.com` | Fiona Bui     |
| `bidder5@auction.com` | George Dang   |
| `bidder6@auction.com` | Hannah Nguyen |
| `bidder7@auction.com` | Ian Tran      |

---

## Seed Data Overview

### Products (35 total)

- **10 Ended Products**: Have complete order history, bidirectional reviews
- **25 Active Products**: Currently accepting bids

### Categories (5 main categories)

1. **Electronics** (18 products)
   - Mobile Phones (10 products)
   - Laptops (8 products)
2. **Fashion** (14 products)
   - Shoes (8 products)
   - Watches (6 products)
3. **Home & Living** (5 products)
   - Furniture (5 products)

### Bidding System

- Each product has **5-10 bids** minimum
- All bids use **maxBid (proxy bidding)** system
- Bids are spread over time with realistic timestamps
- 3-5 unique bidders per product

### Reviews & Ratings

- **20 total reviews** (10 orders × 2 reviews each)
- **Bidirectional**: Both buyer and seller review each other
- User ratings are **calculated from actual reviews**
- 80% positive reviews from buyers, 85% from sellers

---

## Log Monitoring (Optional)

To view application logs via Grafana:

1. Open **http://localhost:3002**
2. Login with: `admin` / `admin`
3. Go to **Explore** → Select **Loki**
4. Run query: `{job="auction-api"}` to see backend logs

---

## Stopping the Application

### Stop all services:

```bash
docker-compose down
```

### Stop and remove volumes (reset database):

```bash
docker-compose down -v
```

---

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL container is running: `docker-compose ps`
- Check logs: `docker-compose logs db`
- Verify DATABASE_URL in backend/.env

### Seed Script Fails

- Ensure database is running and accessible
- Check backend logs: `docker-compose logs backend`
- Try running seed manually: `docker-compose exec backend npm run seed:prod`

### Frontend Can't Connect to Backend

- Verify VITE_API_URL in frontend/.env matches backend URL
- Check backend is running: `curl http://localhost:3000/health`
- Check CORS settings in backend

### Port Conflicts

If ports are already in use, modify `docker-compose.yml`:

- Frontend: Change `3001:80` to `YOUR_PORT:80`
- Backend: Change `3000:3000` to `YOUR_PORT:3000`
- Grafana: Change `3002:3000` to `YOUR_PORT:3000`

---

## Next Steps

1. **Explore the Platform**: Log in with test accounts and explore features
2. **Test Bidding**: Place bids on active products
3. **Test Seller Features**: Create new products as a seller
4. **Test Admin Features**: Manage users and categories as admin
5. **Review Documentation**: Check README.md for detailed feature list

For detailed API documentation, visit: **http://localhost:3000/api-docs**
