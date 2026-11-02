/*
 * 天穹天气 · OpenWeather 反向代理
 *
 * 浏览器只访问 Cloudflare；OpenWeather Key 保存在 Worker Secret 中。
 * 这样中国大陆无法直连 api.openweathermap.org 时，天气仍可通过 Worker 获取。
 */

const OPENWEATHER_BASE = 'https://api.openweathermap.org';
const REQUEST_TIMEOUT_MS = 12000;
const WINDOW_MS = 10 * 60 * 1000;
const WEATHER_LIMIT = 180;
const GEOCODE_LIMIT = 90;

const buckets = new Map();

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

function checkRateLimit(request, scope, limit) {
  const key = `${scope}:${getClientIp(request)}`;
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
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

function numberParam(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateCoordinates(url) {
  const lat = numberParam(url.searchParams.get('lat'));
  const lon = numberParam(url.searchParams.get('lon'));
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }
  return { lat, lon };
}

async function fetchOpenWeather(path, params, apiKey) {
  if (!apiKey) {
    const error = new Error('服务端还没有配置 OpenWeather Key。');
    error.status = 503;
    throw error;
  }

  const url = new URL(path, OPENWEATHER_BASE);
  Object.entries({ ...params, appid: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.message || '';
      } catch {
        /* ignore */
      }
      const error = new Error(
        response.status === 401
          ? 'OpenWeather Key 无效或尚未激活。'
          : response.status === 429
            ? 'OpenWeather 请求过于频繁，请稍后再试。'
            : detail || `OpenWeather 返回 ${response.status}`
      );
      error.status = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('OpenWeather 请求超时。');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function originAllowed(request, cors) {
  const origin = request.headers.get('Origin') || '';
  return !origin || Boolean(cors['Access-Control-Allow-Origin']);
}

export async function handleWeatherRequest(request, env, url, cors) {
  if (request.method !== 'GET') {
    return json({ error: '只支持 GET 请求。', code: 'method_not_allowed' }, 405, cors);
  }
  if (!originAllowed(request, cors)) {
    return json({ error: '当前来源不允许访问天气服务。', code: 'origin_denied' }, 403);
  }

  const apiKey = env.OPENWEATHER_API_KEY;

  if (url.pathname === '/api/weather') {
    if (!checkRateLimit(request, 'weather', WEATHER_LIMIT)) {
      return json({ error: '天气请求太频繁，请稍后再试。', code: 'rate_limited' }, 429, cors);
    }
    const coords = validateCoordinates(url);
    if (!coords) {
      return json({ error: '经纬度参数不正确。', code: 'bad_coordinates' }, 400, cors);
    }

    const common = {
      lat: coords.lat,
      lon: coords.lon,
      units: 'metric',
      lang: 'zh_cn'
    };
    const [currentResult, forecastResult, airResult] = await Promise.allSettled([
      fetchOpenWeather('/data/2.5/weather', common, apiKey),
      fetchOpenWeather('/data/2.5/forecast', common, apiKey),
      fetchOpenWeather('/data/2.5/air_pollution', { lat: coords.lat, lon: coords.lon }, apiKey)
    ]);

    if (currentResult.status === 'rejected') {
      const error = currentResult.reason;
      return json({
        error: error?.message || 'OpenWeather 当前天气获取失败。',
        code: 'weather_unavailable'
      }, error?.status || 502, cors);
    }

    return json({
      current: currentResult.value,
      forecast: forecastResult.status === 'fulfilled' ? forecastResult.value : null,
      air: airResult.status === 'fulfilled' ? airResult.value : null,
      source: 'openweather'
    }, 200, {
      ...cors,
      'Cache-Control': 'public, max-age=120, s-maxage=120'
    });
  }

  if (url.pathname === '/api/geocode') {
    if (!checkRateLimit(request, 'geocode', GEOCODE_LIMIT)) {
      return json({ error: '城市搜索太频繁，请稍后再试。', code: 'rate_limited' }, 429, cors);
    }
    const query = String(url.searchParams.get('q') || '').trim();
    if (!query) {
      return json({ error: '缺少城市名。', code: 'missing_query' }, 400, cors);
    }
    try {
      const results = await fetchOpenWeather('/geo/1.0/direct', {
        q: query,
        limit: 8
      }, apiKey);
      return json(Array.isArray(results) ? results : [], 200, {
        ...cors,
        'Cache-Control': 'public, max-age=600, s-maxage=600'
      });
    } catch (error) {
      return json({
        error: error?.message || '城市搜索失败。',
        code: 'geocode_unavailable'
      }, error?.status || 502, cors);
    }
  }

  if (url.pathname === '/api/reverse') {
    const coords = validateCoordinates(url);
    if (!coords) {
      return json({ error: '经纬度参数不正确。', code: 'bad_coordinates' }, 400, cors);
    }
    try {
      const results = await fetchOpenWeather('/geo/1.0/reverse', {
        lat: coords.lat,
        lon: coords.lon,
        limit: 1
      }, apiKey);
      return json(Array.isArray(results) && results.length ? results[0] : null, 200, cors);
    } catch (error) {
      return json({
        error: error?.message || '反向地理编码失败。',
        code: 'reverse_unavailable'
      }, error?.status || 502, cors);
    }
  }

  return json({ error: '接口不存在。', code: 'not_found' }, 404, cors);
}
