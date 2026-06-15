# 🎨 StickerHub — LiveChat Sticker App

Ứng dụng sticker tích hợp LiveChat với Admin Panel quản lý và hệ thống thu phí.

## 🚀 Cách chạy

### Yêu cầu
- Node.js >= 14 (tải tại https://nodejs.org)

### Khởi động server

```bash
# 1. Vào thư mục dự án
cd sticker-app

# 2. Chạy server
node server.js
```

### Truy cập ứng dụng

| Trang | URL |
|-------|-----|
| 👤 User App (sticker picker) | http://localhost:3000 |
| 🔧 Admin Panel | http://localhost:3000/admin |
| 📡 API | http://localhost:3000/api/packs |

---

## 📁 Cấu trúc thư mục

```
sticker-app/
├── server.js          # Backend Node.js (không cần npm install)
├── package.json
├── data.json          # Database JSON (tự tạo khi chạy lần đầu)
├── assets/
│   └── stickers/      # File sticker upload vào đây
├── user/
│   └── index.html     # Giao diện người dùng / LiveChat widget
└── admin/
    └── index.html     # Admin Panel quản lý
```

---

## 🔧 Tính năng

### Admin Panel
- ✅ Tạo / sửa / xóa Sticker Pack
- ✅ Upload sticker (PNG, GIF, WebP, JPEG) kéo thả
- ✅ Phân loại Free / Premium
- ✅ Đặt giá theo tháng (USD)
- ✅ Xóa từng sticker
- ✅ Xem thống kê: packs, stickers, subscriptions, doanh thu
- ✅ Quản lý subscriptions

### User App (LiveChat Widget)
- ✅ Giao diện chat giả lập LiveChat
- ✅ Picker sticker theo pack
- ✅ Gửi sticker vào chat
- ✅ 3 sticker đầu xem miễn phí (preview), còn lại khóa
- ✅ Đăng ký Monthly / Yearly để mở khóa full
- ✅ Hiển thị banner kêu gọi đăng ký
- ✅ Sau đăng ký, mở khóa toàn bộ sticker

---

## 📡 API Endpoints

```
GET    /api/packs                         # Lấy tất cả packs
POST   /api/packs                         # Tạo pack mới
PUT    /api/packs/:id                     # Cập nhật pack
DELETE /api/packs/:id                     # Xóa pack

POST   /api/packs/:id/stickers            # Upload sticker (multipart)
DELETE /api/packs/:packId/stickers/:id    # Xóa sticker

POST   /api/subscribe                     # Đăng ký subscription
GET    /api/subscriptions?userId=         # Lấy subs theo user

GET    /api/stats                         # Thống kê tổng quan
```

---

## 🔌 Tích hợp vào LiveChat thực tế

1. Deploy server lên VPS / Cloud Run
2. Đăng ký app tại https://developers.livechat.com
3. Cấu hình LiveChat App Widget trỏ vào URL của bạn
4. Tích hợp LiveChat OAuth để xác thực người dùng thật
5. Kết nối LiveChat Billing API để thu phí qua hệ thống LiveChat

---

## 💡 Mở rộng thêm

- [ ] Tích hợp LiveChat OAuth 2.0
- [ ] Kết nối LiveChat Billing API (thanh toán thực)
- [ ] Search sticker theo tag/tên
- [ ] Sticker "Recently Used"
- [ ] Sticker "Favorites"
- [ ] Thêm nhiều tiền tệ (VND, EUR...)
- [ ] Thông báo khi pack mới ra mắt
