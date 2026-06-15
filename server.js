const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'assets/stickers');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Init data store
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const init = {
      packs: [
        {
          id: 'pack_demo',
          name: 'Funny Faces',
          description: 'Hilarious expression stickers',
          price: 2.99,
          currency: 'USD',
          tier: 'premium',
          stickers: [],
          createdAt: Date.now()
        }
      ],
      subscriptions: [],
      users: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Parse multipart form data
function parseMultipart(body, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = body.indexOf(boundaryBuf) + boundaryBuf.length + 2;

  while (start < body.length) {
    const end = body.indexOf(boundaryBuf, start);
    if (end === -1) break;
    const part = body.slice(start, end - 2);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) { start = end + boundaryBuf.length + 2; continue; }
    const headers = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const ctMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
    parts.push({
      name: nameMatch ? nameMatch[1] : null,
      filename: filenameMatch ? filenameMatch[1] : null,
      contentType: ctMatch ? ctMatch[1].trim() : null,
      content
    });
    start = end + boundaryBuf.length + 2;
  }
  return parts;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
  };
  return types[ext] || 'application/octet-stream';
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
}

function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── Static files ──────────────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    let filePath;
    if (pathname === '/' || pathname === '/index.html') filePath = path.join(__dirname, 'user/index.html');
    else if (pathname === '/admin' || pathname === '/admin.html' || pathname === '/admin/') filePath = path.join(__dirname, 'admin/index.html');
    else if (pathname === '/livechat' || pathname === '/livechat-widget' || pathname === '/widget') filePath = path.join(__dirname, 'livechat-widget.html');
    else if (pathname === '/manifest.json') filePath = path.join(__dirname, 'manifest.json');
    else if (pathname.startsWith('/assets/')) filePath = path.join(__dirname, pathname);
    else {
      // Try user dir first, then admin
      const tryPaths = [
        path.join(__dirname, 'user', pathname),
        path.join(__dirname, 'admin', pathname),
        path.join(__dirname, pathname)
      ];
      filePath = tryPaths.find(p => fs.existsSync(p));
    }

    if (filePath && fs.existsSync(filePath)) {
      const mime = getMimeType(filePath);
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  // ── API Routes ─────────────────────────────────────────────────
  let body = Buffer.alloc(0);
  req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
  req.on('end', () => {
    const data = loadData();

    // GET /api/packs
    if (pathname === '/api/packs' && req.method === 'GET') {
      return json(res, data.packs);
    }

    // GET /api/packs/:id
    const packMatch = pathname.match(/^\/api\/packs\/([^/]+)$/);
    if (packMatch && req.method === 'GET') {
      const pack = data.packs.find(p => p.id === packMatch[1]);
      if (!pack) return json(res, { error: 'Not found' }, 404);
      return json(res, pack);
    }

    // POST /api/packs - Create pack
    if (pathname === '/api/packs' && req.method === 'POST') {
      const b = JSON.parse(body.toString());
      const pack = {
        id: 'pack_' + Date.now(),
        name: b.name,
        description: b.description || '',
        price: parseFloat(b.price) || 0,
        currency: b.currency || 'USD',
        tier: b.tier || 'free',
        stickers: [],
        createdAt: Date.now()
      };
      data.packs.push(pack);
      saveData(data);
      return json(res, pack, 201);
    }

    // PUT /api/packs/:id - Update pack
    if (packMatch && req.method === 'PUT') {
      const b = JSON.parse(body.toString());
      const idx = data.packs.findIndex(p => p.id === packMatch[1]);
      if (idx === -1) return json(res, { error: 'Not found' }, 404);
      data.packs[idx] = { ...data.packs[idx], ...b, id: data.packs[idx].id };
      saveData(data);
      return json(res, data.packs[idx]);
    }

    // DELETE /api/packs/:id
    if (packMatch && req.method === 'DELETE') {
      const idx = data.packs.findIndex(p => p.id === packMatch[1]);
      if (idx === -1) return json(res, { error: 'Not found' }, 404);
      // Delete sticker files
      data.packs[idx].stickers.forEach(s => {
        const fp = path.join(UPLOADS_DIR, s.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });
      data.packs.splice(idx, 1);
      saveData(data);
      return json(res, { success: true });
    }

    // POST /api/packs/:id/stickers - Upload sticker
    const stickerUploadMatch = pathname.match(/^\/api\/packs\/([^/]+)\/stickers$/);
    if (stickerUploadMatch && req.method === 'POST') {
      const packId = stickerUploadMatch[1];
      const packIdx = data.packs.findIndex(p => p.id === packId);
      if (packIdx === -1) return json(res, { error: 'Pack not found' }, 404);

      const ct = req.headers['content-type'] || '';
      const boundaryMatch = ct.match(/boundary=(.+)/);
      if (!boundaryMatch) return json(res, { error: 'No boundary' }, 400);

      const parts = parseMultipart(body, boundaryMatch[1]);
      const filePart = parts.find(p => p.filename);
      const namePart = parts.find(p => p.name === 'name');
      const tagsPart = parts.find(p => p.name === 'tags');

      if (!filePart) return json(res, { error: 'No file' }, 400);

      const ext = path.extname(filePart.filename).toLowerCase();
      const allowed = ['.png', '.gif', '.jpg', '.jpeg', '.webp'];
      if (!allowed.includes(ext)) return json(res, { error: 'Invalid file type' }, 400);

      const filename = `sticker_${Date.now()}${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), filePart.content);

      const sticker = {
        id: 'stk_' + Date.now(),
        filename,
        name: namePart ? namePart.content.toString().trim() : filePart.filename,
        tags: tagsPart ? tagsPart.content.toString().trim().split(',').map(t => t.trim()).filter(Boolean) : [],
        url: `/assets/stickers/${filename}`,
        uploadedAt: Date.now()
      };

      data.packs[packIdx].stickers.push(sticker);
      saveData(data);
      return json(res, sticker, 201);
    }

    // DELETE /api/packs/:packId/stickers/:stickerId
    const stickerDeleteMatch = pathname.match(/^\/api\/packs\/([^/]+)\/stickers\/([^/]+)$/);
    if (stickerDeleteMatch && req.method === 'DELETE') {
      const [, packId, stickerId] = stickerDeleteMatch;
      const packIdx = data.packs.findIndex(p => p.id === packId);
      if (packIdx === -1) return json(res, { error: 'Pack not found' }, 404);
      const sIdx = data.packs[packIdx].stickers.findIndex(s => s.id === stickerId);
      if (sIdx === -1) return json(res, { error: 'Sticker not found' }, 404);
      const filename = data.packs[packIdx].stickers[sIdx].filename;
      const fp = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      data.packs[packIdx].stickers.splice(sIdx, 1);
      saveData(data);
      return json(res, { success: true });
    }

    // POST /api/subscribe
    if (pathname === '/api/subscribe' && req.method === 'POST') {
      const b = JSON.parse(body.toString());
      const sub = {
        id: 'sub_' + Date.now(),
        userId: b.userId,
        packId: b.packId,
        plan: b.plan || 'monthly',
        status: 'active',
        startDate: Date.now(),
        endDate: b.plan === 'yearly' ? Date.now() + 365*24*3600*1000 : Date.now() + 30*24*3600*1000
      };
      data.subscriptions.push(sub);
      saveData(data);
      return json(res, sub, 201);
    }

    // GET /api/subscriptions?userId=
    if (pathname === '/api/subscriptions' && req.method === 'GET') {
      const userId = parsed.query.userId;
      const subs = userId ? data.subscriptions.filter(s => s.userId === userId) : data.subscriptions;
      return json(res, subs);
    }

    // GET /api/stats
    if (pathname === '/api/stats' && req.method === 'GET') {
      return json(res, {
        totalPacks: data.packs.length,
        totalStickers: data.packs.reduce((a, p) => a + p.stickers.length, 0),
        totalSubscriptions: data.subscriptions.length,
        activeSubscriptions: data.subscriptions.filter(s => s.status === 'active').length,
        revenue: data.subscriptions
          .filter(s => s.status === 'active')
          .reduce((a, s) => {
            const pack = data.packs.find(p => p.id === s.packId);
            return a + (pack ? pack.price : 0);
          }, 0).toFixed(2)
      });
    }

    // POST /api/packs/reorder
    if (pathname === '/api/packs/reorder' && req.method === 'POST') {
      const { order } = JSON.parse(body.toString());
      const packMap = Object.fromEntries(data.packs.map(p => [p.id, p]));
      data.packs = order.filter(id => packMap[id]).map(id => packMap[id]);
      saveData(data);
      return json(res, { success: true });
    }

    // GET /api/livechat/config
    if (pathname === '/api/livechat/config' && req.method === 'GET') {
      return json(res, {
        clientId: process.env.LC_CLIENT_ID || 'YOUR_CLIENT_ID',
        widgetUrl: process.env.WIDGET_URL || 'http://localhost:3000'
      });
    }

    json(res, { error: 'Route not found' }, 404);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎉 Sticker App Server running!`);
  console.log(`\n  👤 User App  → http://localhost:${PORT}`);
  console.log(`  🔧 Admin     → http://localhost:${PORT}/admin`);
  console.log(`  📡 API       → http://localhost:${PORT}/api/packs\n`);
});
