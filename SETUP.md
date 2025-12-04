# Hướng dẫn Setup - Online Auction Platform

## Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL >= 12.x
- npm hoặc yarn

## Cài đặt Backend

1. Di chuyển vào thư mục backend:

```bash
cd backend
```

2. Cài đặt dependencies:

```bash
npm install
```

3. Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

4. Cập nhật thông tin database trong file `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=online_auction
DB_USER=postgres
DB_PASSWORD=your_password
```

5. Tạo database:

```bash
createdb online_auction
```

6. Chạy seed data (tùy chọn):

```bash
npm run seed
```

7. Khởi động server:

```bash
npm run dev
```

Backend sẽ chạy tại `http://localhost:3000`
Swagger docs tại `http://localhost:3000/api-docs`

## Cài đặt Frontend

1. Di chuyển vào thư mục frontend:

```bash
cd frontend
```

2. Cài đặt dependencies:

```bash
npm install
```

3. Khởi động development server:

```bash
npm run dev
```

Frontend sẽ chạy tại `http://localhost:3001`

## Tài khoản mặc định (sau khi chạy seed)

### Admin

- **Email**: admin@auction.com
- **Password**: admin123
- **Role**: admin
- **Full Name**: Admin User

### Sellers

- **Seller 1**:

  - Email: seller1@auction.com
  - Password: seller123
  - Full Name: Nguyễn Văn A
  - Rating: 8/10 (80%)

- **Seller 2**:
  - Email: seller2@auction.com
  - Password: seller123
  - Full Name: Trần Thị B
  - Rating: 9/10 (90%)

### Bidders

- **Bidder 1**:

  - Email: bidder1@auction.com
  - Password: bidder123
  - Full Name: Lê Văn C
  - Rating: 8/10 (80%)

- **Bidder 2**:

  - Email: bidder2@auction.com
  - Password: bidder123
  - Full Name: Phạm Thị D
  - Rating: 9/10 (90%)

- **Bidder 3**:
  - Email: bidder3@auction.com
  - Password: bidder123
  - Full Name: Hoàng Văn E
  - Rating: 7/10 (70%)

## Dữ liệu mẫu (sau khi seed)

Sau khi chạy `npm run seed`, hệ thống sẽ có:

- **6 Users**: 1 admin, 2 sellers, 3 bidders
- **6 Categories** (2 cấp):
  - Điện tử
    - Điện thoại di động
    - Máy tính xách tay
  - Thời trang
    - Giày
    - Đồng hồ
- **5 Products** với đầy đủ thông tin:
  - iPhone 15 Pro Max 256GB (Điện thoại)
  - Samsung Galaxy S24 Ultra 512GB (Điện thoại)
  - MacBook Pro 14 inch M3 Pro (Laptop)
  - Nike Air Jordan 1 Retro High OG (Giày)
  - Rolex Submariner Date 126610LN (Đồng hồ)
- **25-50 Bids**: Mỗi sản phẩm có 5-10 lượt đấu giá

## Cấu trúc dự án

```
onlineAuction/
├── backend/          # Node.js/Express API
│   ├── src/
│   │   ├── config/   # Database, logger config
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/   # Auth, error handling
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Services (auction processor)
│   │   ├── utils/        # Utilities
│   │   └── scripts/      # Seed scripts
│   └── package.json
├── frontend/         # React SPA
│   ├── src/
│   │   ├── api/     # API client
│   │   ├── components/  # React components
│   │   ├── pages/   # Page components
│   │   ├── store/   # State management
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Tính năng đã triển khai

### Backend

- ✅ RESTful API với Express.js
- ✅ JWT Authentication (AccessToken + RefreshToken)
- ✅ Database models với Sequelize
- ✅ Email notifications
- ✅ Auto-bidding system
- ✅ Auction processor (xử lý đấu giá kết thúc)
- ✅ Swagger documentation
- ✅ Error handling & logging
- ✅ Rate limiting
- ✅ File upload (multer)

### Frontend

- ✅ React với TypeScript
- ✅ React Router
- ✅ Formik cho form validation
- ✅ Zustand cho state management
- ✅ Material-UI components
- ✅ API client với axios
- ✅ Authentication flow
- ✅ Homepage với top products
- ✅ Product listing & search
- ✅ Product detail page
- ✅ Login/Register pages

## Tính năng cần hoàn thiện

- [ ] Profile management pages
- [ ] Watchlist functionality
- [ ] Seller dashboard
- [ ] Admin dashboard với charts
- [ ] Order completion flow
- [ ] Real-time chat với Socket.IO
- [ ] Payment integration
- [ ] Image upload
- [ ] reCAPTCHA integration
- [ ] OAuth login (Google, Facebook, etc.)

## Lưu ý

- Đảm bảo PostgreSQL đang chạy trước khi start backend
- Cấu hình email trong `.env` để gửi email notifications
- Trong development, database sẽ tự động sync khi start server
- Seed script sẽ tạo sample data với 5 sản phẩm và bids
