# Hướng dẫn cấu hình Email

## Vấn đề: Không nhận được email

Nếu bạn không nhận được email, hãy kiểm tra các bước sau:

## 1. Kiểm tra cấu hình trong file `.env`

Đảm bảo các biến môi trường sau được cấu hình đúng trong file `backend/.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@auction.com
FRONTEND_URL=http://localhost:3001
```

## 2. Cấu hình Gmail (nếu dùng Gmail)

### Bước 1: Bật 2-Step Verification
1. Vào [Google Account Security](https://myaccount.google.com/security)
2. Bật "2-Step Verification"

### Bước 2: Tạo App Password
1. Vào [App Passwords](https://myaccount.google.com/apppasswords)
2. Chọn "Mail" và "Other (Custom name)"
3. Nhập tên: "Online Auction"
4. Copy App Password (16 ký tự)
5. Dán vào `EMAIL_PASSWORD` trong file `.env`

**Lưu ý:** Không dùng mật khẩu Gmail thông thường, phải dùng App Password!

## 3. Kiểm tra logs

Khi gửi email, kiểm tra logs trong console để xem:
- Email có được cấu hình đúng không
- Có lỗi gì khi gửi không
- Message ID nếu gửi thành công

Logs sẽ hiển thị:
```
Đang gửi email đến seller@example.com...
Email config: HOST=smtp.gmail.com, PORT=587, USER=your-email@gmail.com
Email đã được gửi thành công đến seller@example.com
Message ID: <xxx@xxx>
```

## 4. Test email bằng endpoint Admin

Sử dụng endpoint test email (chỉ dành cho admin):

```bash
POST /api/admin/test-email
Headers: Authorization: Bearer <admin_token>
Body: {
  "email": "your-test-email@gmail.com"
}
```

Hoặc dùng curl:
```bash
curl -X POST http://localhost:3000/api/admin/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"email": "your-test-email@gmail.com"}'
```

## 5. Kiểm tra email trong Spam/Junk

Đôi khi email có thể bị gửi vào thư mục Spam. Hãy kiểm tra:
- Inbox
- Spam/Junk folder
- Promotions tab (nếu dùng Gmail)

## 6. Các lỗi thường gặp

### Lỗi: "Invalid login"
- **Nguyên nhân:** Dùng mật khẩu Gmail thay vì App Password
- **Giải pháp:** Tạo App Password và dùng nó

### Lỗi: "Connection timeout"
- **Nguyên nhân:** Firewall hoặc network block port 587
- **Giải pháp:** Kiểm tra firewall, thử port 465 với secure: true

### Lỗi: "Email không được cấu hình"
- **Nguyên nhân:** Thiếu biến môi trường EMAIL_*
- **Giải pháp:** Kiểm tra file `.env` và đảm bảo tất cả biến đã được set

## 7. Cấu hình cho các email provider khác

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

### Custom SMTP
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
```

## 8. Debug mode

Để bật debug mode (xem chi tiết hơn trong logs), đảm bảo:
```env
NODE_ENV=development
```

## 9. Kiểm tra email có được gọi không

Kiểm tra logs khi đặt câu hỏi:
- Nếu thấy "Đang gửi email đến..." → Email function được gọi
- Nếu không thấy gì → Có thể có lỗi trong controller

## 10. Liên hệ

Nếu vẫn không nhận được email sau khi kiểm tra tất cả các bước trên, hãy:
1. Kiểm tra logs chi tiết
2. Thử test email endpoint
3. Kiểm tra cấu hình SMTP với email client khác (như Thunderbird)

