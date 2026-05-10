/**
 * CQUPT 安全组考核靶场 — Portal 服务
 * 职责：
 *   1. 管理最多 10 个靶场 Slot（基于独立 Docker 容器 + 独立 DB）
 *   2. 用户进入时重置对应 Slot 数据库（FROM TEMPLATE）并重启容器
 *   3. 校验 Cookie Session，将请求反代到对应 app-N:3000
 *   4. 心跳超时（默认 45s）自动释放 Slot 并重启容器
 */

import express        from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pg             from 'pg';
import { createServer } from 'http';
import { request as httpRequest } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MAX_SLOTS             = parseInt(process.env.MAX_SLOTS             || '10');
const SESSION_TIMEOUT_MS    = parseInt(process.env.SESSION_TIMEOUT_MIN   || '30') * 60 * 1000;
const HEARTBEAT_TIMEOUT_MS  = parseInt(process.env.HEARTBEAT_TIMEOUT_SEC || '45') * 1000;

// ─── IP 限速（防止 /enter 接口被刷）────────────────────────────────────────────
// 每个 IP 在 RATE_WINDOW_MS 内最多 RATE_MAX 次 /enter 请求
const RATE_MAX       = 3;
const RATE_WINDOW_MS = 5 * 60 * 1000;   // 5 分钟
const ipRateMap = new Map(); // ip -> [timestamp, ...]
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, times] of ipRateMap) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) ipRateMap.delete(ip);
    else ipRateMap.set(ip, fresh);
  }
}, 60_000);

function checkEnterRateLimit(req) {
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const times = (ipRateMap.get(ip) || []).filter(t => t > cutoff);
  if (times.length >= RATE_MAX) return false;
  times.push(now);
  ipRateMap.set(ip, times);
  return true;
}

// ─── Slot 状态 ────────────────────────────────────────────────────────────────
/** @type {Array<{id:number, status:'free'|'resetting'|'occupied', token:string|null, lastSeen:number|null, assignedAt:number|null, visitorNumber:number|null}>} */
const slots = Array.from({ length: MAX_SLOTS }, (_, i) => ({
  id: i + 1,
  status: 'free',
  token: null,
  lastSeen: null,
  assignedAt: null,
  visitorNumber: null,
}));

let totalVisitors = 0;

// ─── Cookie 工具 ──────────────────────────────────────────────────────────────
function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';')
      .map(c => c.trim().split('='))
      .filter(p => p.length >= 2)
      .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
  );
}

function getValidSlot(req) {
  const c      = parseCookies(req);
  const slotId = parseInt(c.range_slot);
  const token  = c.range_token;
  if (!slotId || !token) return null;
  const slot = slots.find(s => s.id === slotId && s.status === 'occupied' && s.token === token);
  if (!slot) return null;
  slot.lastSeen = Date.now();
  return slot;
}

function setCookies(res, slotId, token, visitorNumber, occupied) {
  const maxAge = Math.floor(SESSION_TIMEOUT_MS / 1000);
  const info = encodeURIComponent(JSON.stringify({ v: visitorNumber, t: occupied, m: MAX_SLOTS }));
  res.setHeader('Set-Cookie', [
    `range_slot=${slotId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
    `range_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
    // 可被 JS 读取（无 HttpOnly），用于水印展示
    `range_info=${info}; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
  ]);
}

function clearCookies(res) {
  res.setHeader('Set-Cookie', [
    'range_slot=; Path=/; Max-Age=0',
    'range_token=; Path=/; Max-Age=0',
    'range_info=; Path=/; Max-Age=0',
  ]);
}

// ─── Docker Engine API（通过 Unix socket）────────────────────────────────────
function dockerAPI(method, path) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { socketPath: '/var/run/docker.sock', path: `/v1.41${path}`, method },
      res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function restartSlotContainer(slotId) {
  const name = `cqupt-app-${slotId}`;
  const r = await dockerAPI('POST', `/containers/${name}/restart?t=10`);
  if (r.status !== 204) throw new Error(`Docker restart ${name} failed: HTTP ${r.status}`);
  console.log(`[Portal] Slot ${slotId}: container restarted ✓`);
}

async function waitForSlotReady(slotId, timeoutMs = 35_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://app-${slotId}:3000/api/system/status`);
      if (res.status < 500) return;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Slot ${slotId} not ready within ${timeoutMs}ms`);
}

/** 释放 slot 并异步重启容器（不阻塞响应）*/
function releaseSlot(slot, reason) {
  slot.status     = 'free';
  slot.token      = null;
  slot.lastSeen   = null;
  slot.assignedAt = null;
  console.log(`[Portal] Slot ${slot.id} released (${reason})`);
  // 异步重启容器，确保下次用户获得干净环境
  restartSlotContainer(slot.id).catch(err =>
    console.warn(`[Portal] Slot ${slot.id}: container restart after release failed:`, err.message)
  );
}

const proxies = {};

function getProxy(slotId) {
  if (!proxies[slotId]) {
    proxies[slotId] = createProxyMiddleware({
      target: `http://app-${slotId}:3000`,
      changeOrigin: true,
      ws: true,
      on: {
        error(err, req, res) {
          console.error(`[Portal] Proxy error slot ${slotId}:`, err.message);
          if (res && !res.headersSent) {
            res.status(502).send('靶场服务暂时不可用，请刷新重试');
          }
        },
      },
    });
  }
  return proxies[slotId];
}

// ─── Express 应用 ─────────────────────────────────────────────────────────────
const app = express();

// 1. 如果有有效 Session Cookie，直接反代到对应 Slot 的 App
app.use((req, res, next) => {
  if (req.path.startsWith('/_range/')) return next();   // Portal 自有 API，不代理
  const slot = getValidSlot(req);
  if (slot) return getProxy(slot.id)(req, res, next);
  next();   // 无有效 Session → 继续到 Portal 页面/API
});

// 2. Portal API & 静态资源
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Portal API ───────────────────────────────────────────────────────────────

app.get('/_range/status', (_req, res) => {
  const occupied  = slots.filter(s => s.status === 'occupied').length;
  const resetting = slots.filter(s => s.status === 'resetting').length;
  res.json({
    occupied,
    resetting,
    total: MAX_SLOTS,
    available: MAX_SLOTS - occupied - resetting,
    totalVisitors,
  });
});

async function resetSlotDb(slotId) {
  const client = new pg.Client({
    host:     process.env.DB_HOST     || 'postgres',
    port:     parseInt(process.env.DB_PORT || '5432'),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await client.connect();
  try {
    const dbName = `cqupt_slot_${slotId}`;
    // 断开所有现有连接
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    );
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await client.query(`CREATE DATABASE "${dbName}" TEMPLATE cqupt_template`);
    console.log(`[Portal] Slot ${slotId}: DB reset from template ✓`);
  } finally {
    await client.end();
  }
}

app.post('/_range/enter', async (req, res) => {
  if (!checkEnterRateLimit(req)) {
    return res.status(429).json({ error: 'RATE_LIMIT', message: '操作过于频繁，请 5 分钟后再试' });
  }
  const freeSlot = slots.find(s => s.status === 'free');
  if (!freeSlot) {
    return res.status(503).json({ error: 'FULL', message: `靶场人数已满（${MAX_SLOTS}/${MAX_SLOTS}），请稍后再试` });
  }

  totalVisitors++;
  const token         = Math.random().toString(36).slice(2) + Date.now().toString(36);
  freeSlot.status       = 'resetting';
  freeSlot.token        = token;
  freeSlot.visitorNumber = totalVisitors;

  try {
    await resetSlotDb(freeSlot.id);
    await restartSlotContainer(freeSlot.id);
    await waitForSlotReady(freeSlot.id);

    freeSlot.status     = 'occupied';
    freeSlot.assignedAt = Date.now();
    freeSlot.lastSeen   = Date.now();

    const occupied = slots.filter(s => s.status === 'occupied').length;
    setCookies(res, freeSlot.id, token, freeSlot.visitorNumber, occupied);
    res.json({
      ok: true,
      visitorNumber: freeSlot.visitorNumber,
      occupied,
    });
  } catch (err) {
    console.error(`[Portal] Reset failed slot ${freeSlot.id}:`, err.message);
    freeSlot.status = 'free';
    freeSlot.token  = null;
    freeSlot.visitorNumber = null;
    totalVisitors--;
    res.status(500).json({ error: 'RESET_FAILED', message: '环境初始化失败，请稍后重试' });
  }
});

app.post('/_range/heartbeat', (req, res) => {
  const { token } = req.body;
  const slot = slots.find(s => s.token === token && s.status === 'occupied');
  if (!slot) return res.status(404).json({ error: 'NOT_FOUND' });
  slot.lastSeen = Date.now();
  const remainingSec = Math.max(0, Math.floor((SESSION_TIMEOUT_MS - (Date.now() - slot.assignedAt)) / 1000));
  res.json({ ok: true, remainingSec });
});

app.post('/_range/exit', (req, res) => {
  const { token } = req.body;
  const slot = slots.find(s => s.token === token);
  if (slot) releaseSlot(slot, 'user exit');
  clearCookies(res);
  res.json({ ok: true });
});

// ─── 超时清理（每 15s 检查一次）─────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  slots
    .filter(s => s.status === 'occupied' && (
      now - s.lastSeen   > HEARTBEAT_TIMEOUT_MS  ||   // 心跳超时（用户关闭网页/无操作）
      now - s.assignedAt > SESSION_TIMEOUT_MS         // 会话最大时长超时
    ))
    .forEach(s => {
      const reason = (now - s.lastSeen > HEARTBEAT_TIMEOUT_MS) ? 'heartbeat timeout' : 'session max timeout';
      releaseSlot(s, reason);
    });
}, 15_000);

// ─── 启动 & WebSocket ──────────────────────────────────────────────────────────
const server = createServer(app);

// WebSocket 升级请求：根据 Cookie 路由到对应 Slot
server.on('upgrade', (req, socket, head) => {
  const slot = getValidSlot(req);
  if (slot) {
    const proxy = getProxy(slot.id);
    if (typeof proxy.upgrade === 'function') {
      proxy.upgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  } else {
    socket.destroy();
  }
});

server.listen(4000, () => {
  console.log(`[Portal] Ready on :4000 | slots=${MAX_SLOTS} | timeout=${SESSION_TIMEOUT_MS / 60000}min`);
});
