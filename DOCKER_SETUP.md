# Hướng dẫn Setup Database

## ⚡ Cách 1: Dùng Supabase (Cloud Database - Khuyến nghị)

### Bước 1: Tạo Supabase Project

1. Truy cập [Supabase](https://supabase.com) và đăng ký/đăng nhập
2. Tạo một project mới
3. Đợi project được khởi tạo (mất vài phút)

### Bước 2: Lấy Connection String

1. Vào **Project Settings** > **Database**
2. Tìm phần **Connection string** > **URI**
3. Copy connection string, có dạng:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

### Bước 3: Cấu hình Backend

1. Tạo file `.env` từ `.env.example`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Thêm connection string vào file `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@your-project-ref.supabase.co:5432/postgres
   DB_SSL=true
   ```

3. **Lưu ý**: Thay `[YOUR-PASSWORD]` bằng password bạn đã set khi tạo project

### Bước 4: Chạy Backend

```bash
cd backend
npm run dev
```

Backend sẽ tự động kết nối với Supabase và tạo các bảng khi chạy lần đầu.

### Bước 5: Seed Data (Tùy chọn)

```bash
npm run seed
```

---

## 🐳 Cách 2: Dùng Docker Compose (Local Database)

### Bước 1: Khởi động PostgreSQL container

Từ thư mục gốc của project:

```bash
docker-compose up -d
```

Lệnh này sẽ:

- Tải image PostgreSQL 15 (nếu chưa có)
- Tạo container với tên `online-auction-db`
- Tạo database `online_auction` tự động
- Expose port 5432
- Tạo volume để lưu data (data sẽ không mất khi restart container)

### Bước 2: Kiểm tra container đang chạy

```bash
docker ps
```

Bạn sẽ thấy container `online-auction-db` đang chạy.

### Bước 3: Kiểm tra kết nối database

```bash
# Vào container và test kết nối
docker exec -it online-auction-db psql -U postgres -d online_auction -c "SELECT version();"
```

### Bước 4: Cấu hình backend

File `.env` trong thư mục `backend` đã được cấu hình sẵn với:

- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=online_auction`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`

### Bước 5: Chạy backend

```bash
cd backend
npm run dev
```

Backend sẽ tự động tạo các bảng trong database khi chạy lần đầu (vì có `sequelize.sync({ alter: true })` trong development mode).

## Các lệnh Docker hữu ích

### Xem logs

```bash
docker-compose logs -f postgres
```

### Dừng database

```bash
docker-compose down
```

### Dừng và xóa data (⚠️ Cẩn thận: sẽ mất hết data)

```bash
docker-compose down -v
```

### Restart database

```bash
docker-compose restart postgres
```

### Vào PostgreSQL shell

```bash
docker exec -it online-auction-db psql -U postgres -d online_auction
```

## Cách 2: Dùng Docker trực tiếp (không dùng docker-compose)

Nếu không muốn dùng docker-compose:

```bash
# Chạy PostgreSQL container
docker run --name online-auction-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=online_auction \
  -p 5432:5432 \
  -d postgres:15-alpine

# Kiểm tra
docker ps
```

## Troubleshooting

### Port 5432 đã được sử dụng

Nếu port 5432 đã bị chiếm, bạn có thể:

1. Đổi port trong `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432" # Đổi 5432 thành 5433
   ```
2. Cập nhật `DB_PORT=5433` trong file `.env`

### Container không start

```bash
# Xem logs để biết lỗi
docker-compose logs postgres

# Xóa container cũ và tạo lại
docker-compose down
docker-compose up -d
```

### Reset database hoàn toàn

```bash
docker-compose down -v
docker-compose up -d
```

## Seed data (sau khi backend chạy thành công)

```bash
cd backend
npm run seed
```

Sẽ tạo:

### Users (6 accounts)

- **Admin**: admin@auction.com / admin123
- **Seller 1**: seller1@auction.com / seller123 (Nguyễn Văn A, Rating: 80%)
- **Seller 2**: seller2@auction.com / seller123 (Trần Thị B, Rating: 90%)
- **Bidder 1**: bidder1@auction.com / bidder123 (Lê Văn C, Rating: 80%)
- **Bidder 2**: bidder2@auction.com / bidder123 (Phạm Thị D, Rating: 90%)
- **Bidder 3**: bidder3@auction.com / bidder123 (Hoàng Văn E, Rating: 70%)

### Categories (6 categories, 2 cấp)

- Điện tử
  - Điện thoại di động
  - Máy tính xách tay
- Thời trang
  - Giày
  - Đồng hồ

### Products (5 sản phẩm)

- iPhone 15 Pro Max 256GB (Điện thoại)
- Samsung Galaxy S24 Ultra 512GB (Điện thoại)
- MacBook Pro 14 inch M3 Pro (Laptop)
- Nike Air Jordan 1 Retro High OG (Giày)
- Rolex Submariner Date 126610LN (Đồng hồ)

### Bids

- Mỗi sản phẩm có 5-10 lượt đấu giá (tổng 25-50 bids)
