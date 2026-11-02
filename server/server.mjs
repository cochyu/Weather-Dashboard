/*
 * 天穹天气 · 本地开发 / 自托管服务器
 *
 * 运行：npm run dev
 * 静态页面与 /api/ai 同源，DeepSeek Key 只存在于 .env。
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AiProxyError,
  callDeepSeek,
  corsHeaders,
  parseAllowedOrigins
} from '../shared/ai-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadLocalEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath) || typeof process.loadEnvFile !== 'function') return;
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn(`[env] 无法读取 .env：${error.message}`);
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const ALLOWED_ORIGINS = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS
  || 'http://localhost:8787,http://127.0.0.1:8787,http://localhost:5500,http://127.0.0.1:5500,https://cochyu.github.io,https://www.wethdbd.top,https://wethdbd.top'
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

const rateBuckets = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 30;

function applyRateLimit(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    rateBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return true;
}

function json(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

async function readJsonBody(req, limit = 32 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new AiProxyError('请求内容过大。', 'payload_too_large', 413);
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AiProxyError('请求格式不正确。', 'bad_json', 400);
  }
}

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local')
    .split(',')[0]
    .trim();
}

async function handleApi(req, res, url) {
  const origin = req.headers.origin || '';
  const cors = corsHeaders(origin, ALLOWED_ORIGINS);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return true;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    json(res, 200, {
      ok: true,
      service: 'weather-dashboard-ai',
      configured: Boolean(API_KEY),
      model: MODEL
    }, cors);
    return true;
  }

  if (url.pathname === '/api/ai' && req.method === 'POST') {
    if (origin && !cors['Access-Control-Allow-Origin']) {
      json(res, 403, { error: '当前来源不允许访问此 AI 服务。', code: 'origin_denied' });
      return true;
    }
    if (!applyRateLimit(getClientIp(req))) {
      json(res, 429, { error: '请求太频繁，请休息一会儿再试。', code: 'rate_limited' }, cors);
      return true;
    }

    try {
      const body = await readJsonBody(req);
      const result = await callDeepSeek({
        apiKey: API_KEY,
        model: MODEL,
        messages: body.messages,
        context: body.context
      });
      json(res, 200, {
        reply: result.reply,
        model: result.model,
        usage: result.usage
      }, cors);
    } catch (error) {
      const status = error instanceof AiProxyError ? error.status : 500;
      const code = error instanceof AiProxyError ? error.code : 'internal_error';
      console.error(`[ai] ${code}: ${error?.message || error}`);
      json(res, status, {
        error: error?.message || 'AI 服务暂时不可用。',
        code
      }, cors);
    }
    return true;
  }

  if (url.pathname.startsWith('/api/')) {
    json(res, 404, { error: '接口不存在。', code: 'not_found' }, cors);
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  // 本地预览服务器只暴露页面与 assets/，避免 .env、.git 等文件被误读。
  const isPublicAsset = pathname === '/index.html' || pathname.startsWith('/assets/');
  if (!isPublicAsset) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT + path.sep) || pathname.split('/').some((part) => part.startsWith('.'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    });
    res.end(body);
  } catch {
    if (!path.extname(pathname)) {
      try {
        const body = await readFile(path.join(ROOT, 'index.html'));
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(body);
        return;
      } catch {
        /* fall through */
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`);
  try {
    if (await handleApi(req, res, url)) return;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method Not Allowed');
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  天穹天气 · 本地开发服务器');
  console.log(`  http://${HOST}:${PORT}`);
  console.log(`  DeepSeek: ${API_KEY ? '已配置' : '未配置（页面会使用本地智能简报）'}`);
  console.log('');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
