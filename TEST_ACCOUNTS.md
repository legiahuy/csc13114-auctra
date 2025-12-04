# Test Accounts - Tài khoản Test

Sau khi chạy `npm run seed` trong thư mục `backend`, bạn có thể sử dụng các tài khoản sau để test:

## 🔑 Admin Account

**Quyền**: Quản trị viên (full access)

- **Email**: `admin@auction.com`
- **Password**: `admin123`
- **Full Name**: Admin User
- **Role**: admin

**Tính năng có thể test**:

- Quản lý categories
- Quản lý products (xóa sản phẩm)
- Quản lý users
- Xem dashboard với thống kê
- Duyệt upgrade requests từ bidders

---

## 👔 Seller Accounts

### Seller 1

- **Email**: `seller1@auction.com`
- **Password**: `seller123`
- **Full Name**: Nguyễn Văn A
- **Role**: seller
- **Rating**: 8/10 (80%)

**Sản phẩm đang bán**:

- iPhone 15 Pro Max 256GB
- MacBook Pro 14 inch M3 Pro
- Rolex Submariner Date 126610LN

**Tính năng có thể test**:

- Đăng sản phẩm mới
- Cập nhật mô tả sản phẩm
- Từ chối bids
- Trả lời câu hỏi từ bidders
- Xem danh sách sản phẩm đang bán
- Xem danh sách sản phẩm đã có người thắng
- Đánh giá người mua

### Seller 2

- **Email**: `seller2@auction.com`
- **Password**: `seller123`
- **Full Name**: Trần Thị B
- **Role**: seller
- **Rating**: 9/10 (90%)

**Sản phẩm đang bán**:

- Samsung Galaxy S24 Ultra 512GB
- Nike Air Jordan 1 Retro High OG

---

## 🛒 Bidder Accounts

### Bidder 1

- **Email**: `bidder1@auction.com`
- **Password**: `bidder123`
- **Full Name**: Lê Văn C
- **Role**: bidder
- **Rating**: 8/10 (80%)

**Tính năng có thể test**:

- Xem danh sách sản phẩm
- Thêm vào watchlist
- Ra giá (bidding)
- Xem lịch sử đấu giá
- Hỏi người bán về sản phẩm
- Quản lý hồ sơ cá nhân
- Xem điểm đánh giá
- Xin upgrade thành seller

### Bidder 2

- **Email**: `bidder2@auction.com`
- **Password**: `bidder123`
- **Full Name**: Phạm Thị D
- **Role**: bidder
- **Rating**: 9/10 (90%)

### Bidder 3

- **Email**: `bidder3@auction.com`
- **Password**: `bidder123`
- **Full Name**: Hoàng Văn E
- **Role**: bidder
- **Rating**: 7/10 (70%)

---

## 📊 Sample Data Overview

Sau khi seed, hệ thống có:

- **6 Users**: 1 admin, 2 sellers, 3 bidders
- **6 Categories** (2 cấp):
  - Điện tử
    - Điện thoại di động
    - Máy tính xách tay
  - Thời trang
    - Giày
    - Đồng hồ
- **5 Products**:
  1. iPhone 15 Pro Max 256GB (25,000,000 VNĐ)
  2. Samsung Galaxy S24 Ultra 512GB (22,000,000 VNĐ)
  3. MacBook Pro 14 inch M3 Pro (45,000,000 VNĐ)
  4. Nike Air Jordan 1 Retro High OG (5,000,000 VNĐ)
  5. Rolex Submariner Date 126610LN (800,000,000 VNĐ)
- **25-50 Bids**: Mỗi sản phẩm có 5-10 lượt đấu giá

---

## 🧪 Test Scenarios

### Scenario 1: Bidder đấu giá

1. Đăng nhập với `bidder1@auction.com`
2. Xem danh sách sản phẩm
3. Chọn một sản phẩm và ra giá
4. Thêm vào watchlist
5. Hỏi người bán về sản phẩm

### Scenario 2: Seller quản lý sản phẩm

1. Đăng nhập với `seller1@auction.com`
2. Xem danh sách sản phẩm đang bán
3. Cập nhật mô tả sản phẩm
4. Trả lời câu hỏi từ bidders
5. Từ chối một bid (nếu cần)

### Scenario 3: Admin quản lý

1. Đăng nhập với `admin@auction.com`
2. Xem dashboard
3. Quản lý categories
4. Quản lý users
5. Duyệt upgrade requests

---

## ⚠️ Lưu ý

- Tất cả passwords đều là: `admin123`, `seller123`, hoặc `bidder123`
- Tất cả users đã được verify email (`isEmailVerified: true`)
- Ratings đã được set sẵn để test logic kiểm tra rating khi bidding
- Seed script sẽ xóa toàn bộ data cũ và tạo lại từ đầu (`force: true`)
