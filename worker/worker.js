/*
 * 天穹天气 · DeepSeek 安全代理（Cloudflare Worker）
 *
 * 部署：
 *   npx wrangler deploy -c worker/wrangler.toml
 *   npx wrangler secret put DEEPSEEK_API_KEY -c worker/wrangler.toml
 *
 * 部署后把 https://<worker>.<subdomain>.workers.dev/api/ai 填入网站的 AI 设置。
 */

import {
  AiProxyError,
  callDeepSeek,
  corsHeaders,
  parseAllowedOrigins
} from '../shared/ai-core.mjs';

const buckets = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (buckets.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) {
    buckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  buckets.set(ip, recent);
  return true;
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = parseAllowedOrigins(
      env.ALLOWED_ORIGINS
      || 'https://cochyu.github.io,https://www.wethdbd.top,https://wethdbd.top,http://localhost:8787,http://127.0.0.1:8787,http://localhost:5500,http://127.0.0.1:5500'
    );
    const cors = corsHeaders(origin, allowedOrigins);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return json({
        ok: true,
        service: 'weather-dashboard-ai',
        endpoints: {
          health: '/api/health',
          chat: 'POST /api/ai'
        }
      }, 200, cors);
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({
        ok: true,
        service: 'weather-dashboard-ai',
        configured: Boolean(env.DEEPSEEK_API_KEY),
        model: env.DEEPSEEK_MODEL || 'deepseek-chat'
      }, 200, cors);
    }

    if (url.pathname === '/api/ai' && request.method === 'POST') {
      if (origin && !cors['Access-Control-Allow-Origin']) {
        return json({ error: '当前来源不允许访问此 AI 服务。', code: 'origin_denied' }, 403);
      }
      if (!checkRateLimit(getClientIp(request))) {
        return json({ error: '请求太频繁，请休息一会儿再试。', code: 'rate_limited' }, 429, cors);
      }

      try {
        const body = await request.json();
        const result = await callDeepSeek({
          apiKey: env.DEEPSEEK_API_KEY,
          model: env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: body?.messages,
          context: body?.context
        });
        return json({
          reply: result.reply,
          model: result.model,
          usage: result.usage
        }, 200, cors);
      } catch (error) {
        const status = error instanceof AiProxyError ? error.status : 500;
        const code = error instanceof AiProxyError ? error.code : 'internal_error';
        console.error(`[ai] ${code}: ${error?.message || error}`);
        return json({
          error: error?.message || 'AI 服务暂时不可用。',
          code
        }, status, cors);
      }
    }

    return json({ error: '接口不存在。', code: 'not_found' }, 404, cors);
  }
};
