# Online Auction Platform - Sàn Đấu Giá Trực Tuyến

A comprehensive online auction platform built with Node.js/Express backend and React frontend.

## Project Structure

```
onlineAuction/
├── backend/          # Node.js/Express RESTful API
├── frontend/         # React SPA
└── README.md
```

## Features

### Guest Users

- Category menu (2-level hierarchy)
- Homepage with top products
- Product listing with pagination
- Full-text search (Vietnamese without diacritics)
- Product details
- User registration with OTP

### Bidders

- Watch list
- Bidding system
- Bid history
- Ask seller questions
- Profile management
- Request seller upgrade

### Sellers

- Post auction products
- Update product descriptions
- Reject bids
- Answer questions
- Profile management

### Administrators

- Category management
- Product management
- User management
- Dashboard with statistics

### System Features

- Email notifications
- Auto-bidding system
- Payment process (4-step order completion)
- Real-time chat between seller and winner

## Tech Stack

### Backend

- Node.js + Express
- TypeScript
- PostgreSQL
- JWT (AccessToken + RefreshToken)
- Swagger documentation
- Email service (Nodemailer)
- Bcrypt for password hashing

### Frontend

- React + TypeScript
- React Router
- Formik / React Hook Form
- State management (Zustand/Redux)
- UI library (Material-UI or Tailwind CSS)

## Getting Started

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Environment Variables

See `.env.example` files in backend and frontend directories.

## Test Accounts (after running seed)

After running `npm run seed` in the backend directory, you can use these accounts:

### Admin

- **Email**: admin@auction.com
- **Password**: admin123

### Sellers

- **Seller 1**: seller1@auction.com / seller123 (Nguyễn Văn A, Rating: 80%)
- **Seller 2**: seller2@auction.com / seller123 (Trần Thị B, Rating: 90%)

### Bidders

- **Bidder 1**: bidder1@auction.com / bidder123 (Lê Văn C, Rating: 80%)
- **Bidder 2**: bidder2@auction.com / bidder123 (Phạm Thị D, Rating: 90%)
- **Bidder 3**: bidder3@auction.com / bidder123 (Hoàng Văn E, Rating: 70%)

## Sample Data

The seed script creates:

- 6 users (1 admin, 2 sellers, 3 bidders)
- 6 categories (2-level hierarchy)
- 5 products with full details
- 25-50 bids (5-10 bids per product)
