# Trạng thái Implementation - Online Auction Platform

## ✅ Đã hoàn thành (Backend)

### Authentication & Authorization

- ✅ Đăng ký với OTP (backend logic)
- ✅ Đăng nhập với JWT (AccessToken + RefreshToken)
- ✅ Quên mật khẩu với OTP
- ✅ Đổi mật khẩu
- ✅ Middleware authentication & authorization

### Guest Features (Backend)

- ✅ Xem danh sách categories (2 cấp)
- ✅ Homepage với top 5 products (ending soon, most bids, highest price)
- ✅ Xem danh sách sản phẩm với phân trang
- ✅ Full-text search tiếng Việt không dấu
- ✅ Xem chi tiết sản phẩm
- ✅ Đăng ký tài khoản

### Bidder Features (Backend)

- ✅ Lưu vào watchlist
- ✅ Ra giá (bidding) với validation rating
- ✅ Xem lịch sử đấu giá (với mask tên)
- ✅ Hỏi người bán về sản phẩm
- ✅ Quản lý hồ sơ cá nhân (API)
- ✅ Xem điểm đánh giá
- ✅ Xin upgrade thành seller

### Seller Features (Backend)

- ✅ Đăng sản phẩm đấu giá
- ✅ Bổ sung mô tả sản phẩm (append)
- ✅ Từ chối lượt ra giá
- ✅ Trả lời câu hỏi
- ✅ Quản lý sản phẩm đang bán
- ✅ Đánh giá người thắng

### Admin Features (Backend)

- ✅ Quản lý categories (CRUD)
- ✅ Quản lý products (xóa sản phẩm)
- ✅ Quản lý users (CRUD)
- ✅ Dashboard với thống kê
- ✅ Duyệt upgrade requests

### System Features (Backend)

- ✅ Email notifications (tất cả events)
- ✅ Auto-bidding system
- ✅ Auction processor (tự động xử lý đấu giá kết thúc)
- ✅ Order management (4-step process)
- ✅ Chat system (API)

---

## ✅ Đã hoàn thành (Frontend)

### Basic Pages

- ✅ Homepage với top products
- ✅ Product listing với search & filter
- ✅ Product detail page (cơ bản)
- ✅ Login page
- ✅ Register page
- ✅ Layout với navigation

### Infrastructure

- ✅ React Router setup
- ✅ Zustand state management
- ✅ API client với axios
- ✅ Form validation với Formik
- ✅ Material-UI components

---

## ❌ Chưa implement (Frontend)

### 1. Profile Management Page (`ProfilePage.tsx`)

**Yêu cầu:**

- Đổi thông tin: email, họ tên, ngày sinh
- Đổi mật khẩu (có yêu cầu mật khẩu cũ)
- Xem điểm đánh giá và chi tiết các lần được đánh giá
- Xem danh sách sản phẩm yêu thích
- Xem danh sách sản phẩm đang tham gia đấu giá
- Xem danh sách sản phẩm đã thắng
- Đánh giá người bán (+1/-1 với nhận xét)

**API đã có:** ✅ Tất cả endpoints đã sẵn sàng

---

### 2. Watchlist Page (`WatchlistPage.tsx`)

**Yêu cầu:**

- Hiển thị danh sách sản phẩm đã lưu
- Xóa khỏi watchlist
- Click vào sản phẩm để xem chi tiết

**API đã có:** ✅ `/api/users/watchlist` (GET, POST, DELETE)

---

### 3. My Bids Page (`MyBidsPage.tsx`)

**Yêu cầu:**

- Hiển thị lịch sử đấu giá của user
- Hiển thị sản phẩm đang đấu giá
- Hiển thị sản phẩm đã thắng
- Link đến chi tiết sản phẩm

**API đã có:** ✅ `/api/users/bids`, `/api/users/won`

---

### 4. Seller Dashboard (`SellerDashboardPage.tsx`)

**Yêu cầu:**

- Xem danh sách sản phẩm đang đăng & còn hạn
- Xem danh sách sản phẩm đã có người thắng
- Form đăng sản phẩm mới:
  - Tên sản phẩm
  - Upload tối thiểu 3 ảnh
  - Giá khởi điểm
  - Bước giá
  - Giá mua ngay (optional)
  - Mô tả sản phẩm (WYSIWYG editor)
  - Checkbox: Có tự động gia hạn không?
- Cập nhật mô tả sản phẩm (append)
- Từ chối bid (từ product detail page)
- Trả lời câu hỏi (từ product detail page)
- Đánh giá người thắng

**API đã có:** ✅ Tất cả endpoints đã sẵn sàng

---

### 5. Admin Dashboard (`AdminDashboardPage.tsx`)

**Yêu cầu:**

- Biểu đồ về:
  - Số lượng sàn đấu giá mới
  - Doanh thu
  - Số lượng người dùng mới
  - Số lượng bidder nâng cấp seller mới
- Các thống kê khác
- Quản lý categories (CRUD)
- Quản lý products (xóa)
- Quản lý users (CRUD)
- Duyệt upgrade requests

**API đã có:** ✅ `/api/admin/dashboard`, các endpoints quản lý

---

### 6. Product Detail Page (Nâng cấp)

**Yêu cầu bổ sung:**

- Hiển thị đầy đủ thông tin:
  - Ảnh đại diện (size lớn)
  - Các ảnh phụ (ít nhất 3 ảnh) - gallery
  - Thông tin người bán & điểm đánh giá
  - Thông tin người đặt giá cao nhất & điểm đánh giá
  - Thời điểm đăng
  - Thời điểm kết thúc (relative time nếu < 3 ngày)
  - Mô tả chi tiết sản phẩm
  - Lịch sử câu hỏi và câu trả lời
  - 5 sản phẩm khác cùng chuyên mục
- Chức năng cho bidder:
  - Nút "Thêm vào watchlist" / "Xóa khỏi watchlist"
  - Form ra giá (với đề nghị giá hợp lệ)
  - Xem lịch sử đấu giá (với mask tên)
  - Form hỏi người bán
- Chức năng cho seller:
  - Nút "Từ chối bid" (cho từng bid)
  - Form trả lời câu hỏi
  - Form cập nhật mô tả sản phẩm
- Auto-bidding:
  - Checkbox "Đấu giá tự động"
  - Input "Giá tối đa" (nếu chọn auto-bid)

**API đã có:** ✅ Tất cả endpoints đã sẵn sàng

---

### 7. Order Completion Page (`OrderPage.tsx`) - QUAN TRỌNG

**Yêu cầu:**

- 4 bước hoàn tất đơn hàng:

  1. **Bước 1: Thanh toán**

     - Upload hình ảnh chứng từ thanh toán (hoặc nhập thông tin thanh toán)
     - Nút "Xác nhận thanh toán"
     - Chuyển trạng thái: `pending_payment` → `pending_address`

  2. **Bước 2: Gửi địa chỉ giao hàng**

     - Form nhập địa chỉ giao hàng
     - Nút "Xác nhận địa chỉ"
     - Chuyển trạng thái: `pending_address` → `pending_shipping`

  3. **Bước 3: Người bán xác nhận đã nhận tiền & gửi hóa đơn**

     - Upload hóa đơn vận chuyển
     - Nút "Xác nhận đã gửi hàng"
     - Chuyển trạng thái: `pending_shipping` → `pending_delivery`

  4. **Bước 4: Người mua xác nhận đã nhận hàng**
     - Nút "Xác nhận đã nhận hàng"
     - Chuyển trạng thái: `pending_delivery` → `completed`
     - Form đánh giá (+1/-1 với nhận xét)

- **Chat interface** giữa seller và buyer

  - Real-time chat với Socket.IO
  - Hiển thị lịch sử tin nhắn
  - Input gửi tin nhắn

- **Cancel order** (chỉ seller):

  - Nút "Hủy giao dịch"
  - Tự động đánh giá -1 cho buyer
  - Nhận xét: "Người thắng không thanh toán"

- **Thay đổi đánh giá:**
  - Cho phép seller và buyer thay đổi đánh giá (+/-) bất kỳ lúc nào

**API đã có:** ✅ `/api/orders/:orderId`, `/api/chat/:orderId`

**Cần implement:**

- Frontend UI cho 4 bước
- File upload cho hình ảnh thanh toán & hóa đơn
- Socket.IO client cho real-time chat
- Form đánh giá

---

### 8. Category Menu (Navigation)

**Yêu cầu:**

- Hiển thị danh sách categories 2 cấp trong menu
- Click vào category để chuyển sang màn hình danh sách sản phẩm
- Hiển thị trong Layout component

**API đã có:** ✅ `/api/categories`

---

### 9. Search & Filter (Nâng cấp)

**Yêu cầu bổ sung:**

- Filter theo category (dropdown)
- Sắp xếp: Thời gian kết thúc, Giá
- Highlight sản phẩm mới (trong vòng N phút)
- Hiển thị đầy đủ thông tin sản phẩm trong list:
  - Ảnh đại diện
  - Tên sản phẩm
  - Giá hiện tại
  - Thông tin bidder đang đặt giá cao nhất
  - Giá mua ngay (nếu có)
  - Ngày đăng sản phẩm
  - Thời gian còn lại
  - Số lượt ra giá

**API đã có:** ✅ `/api/products` với query params

---

### 10. Registration (Nâng cấp)

**Yêu cầu bổ sung:**

- reCAPTCHA integration
- OTP verification page (sau khi đăng ký)
- Form validation đầy đủ

**API đã có:** ✅ `/api/auth/register`, `/api/auth/verify-email`

---

### 11. Forgot Password Flow

**Yêu cầu:**

- Form nhập email
- OTP verification page
- Form reset password

**API đã có:** ✅ `/api/auth/forgot-password`, `/api/auth/reset-password`

---

### 12. Product Upload Images

**Yêu cầu:**

- Upload tối thiểu 3 ảnh khi đăng sản phẩm
- Preview images trước khi upload
- Xóa ảnh đã chọn

**API đã có:** ✅ Multer đã setup, cần implement frontend upload

---

### 13. WYSIWYG Editor

**Yêu cầu:**

- Rich text editor cho mô tả sản phẩm
- Hỗ trợ format text, images, links

**Cần:** Cài đặt thư viện (react-quill, draft-js, hoặc tương tự)

---

## ⚠️ Cần cải thiện (Backend)

### 1. reCAPTCHA Verification

- Hiện tại chỉ có comment, chưa implement thực tế
- Cần tích hợp Google reCAPTCHA API

### 2. OTP Storage

- Hiện tại OTP chỉ generate nhưng chưa lưu vào database
- Cần tạo model OTP hoặc lưu vào User model

### 3. File Upload

- Multer đã setup nhưng chưa có endpoint upload
- Cần tạo endpoint `/api/upload` hoặc tích hợp vào product creation

### 4. Relative Time Format

- Cần utility function format thời gian tương đối (3 ngày nữa, 10 phút nữa)

---

## 📋 Tóm tắt ưu tiên

### Priority 1 (Core Features)

1. **Order Completion Page** - Quan trọng nhất, 4 bước thanh toán
2. **Product Detail Page** - Nâng cấp đầy đủ tính năng
3. **Seller Dashboard** - Đăng sản phẩm, quản lý sản phẩm
4. **Profile Management** - Quản lý hồ sơ cá nhân

### Priority 2 (Important Features)

5. **Watchlist Page** - Danh sách yêu thích
6. **My Bids Page** - Lịch sử đấu giá
7. **Admin Dashboard** - Với charts và quản lý
8. **Category Menu** - Navigation

### Priority 3 (Enhancements)

9. **Search & Filter** - Nâng cấp
10. **Registration Flow** - OTP verification
11. **Forgot Password Flow** - Hoàn chỉnh
12. **File Upload** - Upload ảnh sản phẩm
13. **WYSIWYG Editor** - Rich text editor

---

## 📝 Notes

- **Payment Service**: Không cần tích hợp payment gateway thật, chỉ cần upload hình ảnh/chứng từ thanh toán và confirm
- **Socket.IO**: Backend đã setup, cần implement client-side cho chat
- **File Upload**: Backend đã có multer, cần tạo endpoint và frontend upload component
- **Tất cả API endpoints đã sẵn sàng**, chỉ cần implement frontend UI
