# 🔌 Hướng dẫn tích hợp LiveChat

## Bước 1 — Thêm Client ID vào widget

Mở file `livechat-widget.html`, tìm dòng:
```js
const LC_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
```
Thay `YOUR_CLIENT_ID_HERE` bằng Client ID thực của bạn.

---

## Bước 2 — Cấu hình App trên LiveChat Developer Console

Vào https://developers.livechat.com/console → chọn app của bạn:

### 2a. Authorization
- **Client Type**: Server-side app (nếu có backend) hoặc JavaScript app
- **Redirect URI**: `http://YOUR_SERVER_URL/auth/callback`
- **Scopes cần thiết**:
  - `chats.conversation:write` — để gửi tin nhắn/sticker
  - `chats.conversation:read` — để đọc chat hiện tại

### 2b. Agent App Widget
- Vào tab **Building Blocks** → **Agent App Widgets**
- Click **Add widget**
- **Widget URL**: `http://YOUR_SERVER_URL/livechat` (hoặc URL public nếu deploy)
- **Placement**: chọn `MessageBox` (hiện dưới ô chat) hoặc `Details` (sidebar phải)
- Click **Save**

### 2c. Install app
- Vào tab **Private installation** → Install cho account của bạn
- Hoặc publish lên Marketplace để agent khác cài

---

## Bước 3 — Deploy server ra public URL

LiveChat cần URL **HTTPS public** để load widget. Các cách:

### Option A — ngrok (nhanh nhất, để test)
```bash
# Cài ngrok: https://ngrok.com/download
ngrok http 3000
# Copy URL dạng: https://xxxx.ngrok.io
```
Dùng URL ngrok làm Widget URL trong Developer Console.

### Option B — Deploy lên VPS/Cloud
```bash
# Cài PM2 để chạy nền
npm install -g pm2
pm2 start server.js --name stickerhub
pm2 save

# Cần HTTPS — dùng nginx + certbot hoặc Cloudflare tunnel
```

### Option C — Render.com (miễn phí)
1. Push code lên GitHub
2. Tạo Web Service trên render.com
3. Start command: `node server.js`
4. Lấy URL dạng `https://stickerhub.onrender.com`

---

## Bước 4 — Test widget

1. Mở LiveChat Agent App
2. Vào một cuộc chat bất kỳ
3. Widget StickerHub sẽ hiện ở sidebar hoặc MessageBox
4. Click sticker → gửi vào chat

---

## Biến môi trường (tuỳ chọn)

Tạo file `.env` trong thư mục dự án:
```
LC_CLIENT_ID=your_client_id_here
WIDGET_URL=https://your-public-url.com
PORT=3000
```

Cài dotenv:
```bash
npm install dotenv
```

Thêm vào đầu `server.js`:
```js
require('dotenv').config();
```

---

## Luồng hoạt động

```
Agent mở chat
    ↓
LiveChat load Widget URL (livechat-widget.html)
    ↓
SDK khởi tạo → lấy chatId hiện tại
    ↓
Widget gọi API /api/packs → hiện sticker
    ↓
Agent click sticker
    ↓
widget.putMessage() → gửi vào chat
    ↓
Khách hàng nhận được sticker 🎉
```
