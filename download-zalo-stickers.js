/**
 * Script tải sticker Zalo về máy và tự động thêm vào data.json
 * Chạy: node download-zalo-stickers.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const STICKERS_DIR = path.join(__dirname, 'assets/stickers');
const DATA_FILE = path.join(__dirname, 'data.json');

// ── Danh sách sticker Zalo cần tải ─────────────────────────
// Thêm/bớt eid tùy ý vào đây
const ZALO_PACKS = [
  {
    packName: 'Zalo Funny Pack',
    description: 'Sticker vui nhộn từ Zalo',
    tier: 'free',
    eids: [21516, 21517, 21518, 21519, 21520, 21521, 21522, 21523,
           21524, 21525, 21526, 21527, 21528, 21529, 21530, 21531]
  }
  // Thêm pack khác ở đây nếu cần:
  // {
  //   packName: 'Zalo Pack 2',
  //   description: 'Mô tả pack',
  //   tier: 'free',
  //   eids: [12345, 12346, ...]
  // }
];

// ── Helper: tải 1 file ──────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Referer': 'https://chat.zalo.me/'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

// ── Helper: sleep ───────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Main ────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(STICKERS_DIR)) fs.mkdirSync(STICKERS_DIR, { recursive: true });

  const data = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    : { packs: [], subscriptions: [], users: [] };

  let totalDownloaded = 0;
  let totalFailed = 0;

  for (const packDef of ZALO_PACKS) {
    console.log(`\n📦 Đang xử lý pack: ${packDef.packName}`);
    console.log(`   ${packDef.eids.length} stickers cần tải...\n`);

    const stickers = [];

    for (const eid of packDef.eids) {
      const url = `https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${eid}&size=130`;
      const filename = `zalo_${eid}.png`;
      const destPath = path.join(STICKERS_DIR, filename);

      // Skip nếu đã tải
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
        console.log(`  ✅ eid=${eid} (đã có, bỏ qua)`);
        stickers.push({
          id: `stk_zalo_${eid}`,
          filename,
          name: `Sticker ${eid}`,
          tags: ['zalo', 'funny'],
          url: `/assets/stickers/${filename}`,
          uploadedAt: Date.now()
        });
        totalDownloaded++;
        continue;
      }

      try {
        process.stdout.write(`  ⬇️  Đang tải eid=${eid}... `);
        await downloadFile(url, destPath);
        const size = fs.statSync(destPath).size;
        if (size < 500) {
          fs.unlinkSync(destPath);
          throw new Error('File quá nhỏ, có thể bị lỗi');
        }
        console.log(`✅ (${(size/1024).toFixed(1)} KB)`);
        stickers.push({
          id: `stk_zalo_${eid}`,
          filename,
          name: `Sticker ${eid}`,
          tags: ['zalo', 'funny'],
          url: `/assets/stickers/${filename}`,
          uploadedAt: Date.now()
        });
        totalDownloaded++;
      } catch (err) {
        console.log(`❌ Lỗi: ${err.message}`);
        totalFailed++;
      }

      // Delay nhẹ tránh bị rate limit
      await sleep(300);
    }

    if (stickers.length === 0) {
      console.log(`\n⚠️  Không tải được sticker nào cho pack này`);
      continue;
    }

    // Kiểm tra pack đã tồn tại chưa
    const existingIdx = data.packs.findIndex(p => p.name === packDef.packName);
    if (existingIdx >= 0) {
      // Merge stickers mới vào pack cũ (tránh trùng)
      const existingIds = new Set(data.packs[existingIdx].stickers.map(s => s.id));
      const newStickers = stickers.filter(s => !existingIds.has(s.id));
      data.packs[existingIdx].stickers.push(...newStickers);
      console.log(`\n🔄 Đã cập nhật pack "${packDef.packName}" (+${newStickers.length} sticker mới)`);
    } else {
      const newPack = {
        id: `pack_zalo_${Date.now()}`,
        name: packDef.packName,
        description: packDef.description,
        price: 0,
        currency: 'USD',
        tier: packDef.tier,
        stickers,
        createdAt: Date.now()
      };
      data.packs.push(newPack);
      console.log(`\n✨ Đã tạo pack mới "${packDef.packName}" với ${stickers.length} stickers`);
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  console.log('\n' + '─'.repeat(45));
  console.log(`🎉 Hoàn tất!`);
  console.log(`   ✅ Tải thành công : ${totalDownloaded} stickers`);
  console.log(`   ❌ Thất bại       : ${totalFailed} stickers`);
  console.log(`   📦 Tổng packs     : ${data.packs.length}`);
  console.log('\n💡 Khởi động lại server để thấy sticker mới:');
  console.log('   node server.js\n');
}

main().catch(err => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});

// ── Hướng dẫn nếu bị lỗi 403 ───────────────────────────────
// Nếu bị lỗi 403, thêm cookie từ trình duyệt:
// 1. Mở chat.zalo.me trên Chrome/Firefox
// 2. F12 → Network → click 1 sticker bất kỳ
// 3. Tìm request đến zalo-api.zadn.vn → copy header "cookie"
// 4. Paste vào biến COOKIE bên dưới trong file này:
//
// const COOKIE = 'zpw_sek=xxx; app.session=xxx; ...';
// Rồi thêm vào headers: { 'Cookie': COOKIE, ... }
