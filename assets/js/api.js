/* 天穹天气 · 天气数据层（Cloudflare Worker 代理 + Open-Meteo 兜底） */

import { CONFIG } from './config.js';

const { weather } = CONFIG;

export class WeatherError extends Error {
  constructor(message, code = 'unknown', status = 0) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
    this.status = status;
  }
}

function apiBases() {
  return [weather.apiBase, weather.fallbackBase]
    .filter(Boolean)
    .filter((base, index, array) => array.indexOf(base) === index);
}

async function fetchTimed(url, options, outerSignal, timeoutMs = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    outerSignal.addEventListener('abort', onOuterAbort, { once: true });
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onOuterAbort);
  }
}

async function proxyJson(path, params = {}, signal) {
  const errors = [];

  for (const base of apiBases()) {
    const url = new URL(path, base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    let response;
    try {
      response = await fetchTimed(url.toString(), {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      }, signal);
    } catch (error) {
      // 外层取消（比如用户切换城市）不继续尝试；单次代理超时则尝试下一个地址。
      if (signal?.aborted) throw error;
      errors.push(new WeatherError('天气代理响应超时或无法连接。', 'network'));
      continue;
    }

    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.json();
        detail = payload?.error || payload?.message || '';
      } catch {
        /* ignore */
      }
      errors.push(new WeatherError(
        detail || `天气代理返回 ${response.status}`,
        'proxy_http',
        response.status
      ));
      continue;
    }

    return response.json();
  }

  throw errors[errors.length - 1] || new WeatherError('天气服务暂时不可用，请稍后再试。', 'proxy');
}

export async function fetchWeatherBundle(lat, lon, location, signal) {
  try {
    const bundle = await proxyJson('/api/weather', { lat, lon }, signal);
    if (!bundle?.current) {
      throw new WeatherError('天气代理没有返回当前天气。', 'empty_bundle');
    }
    return {
      current: bundle.current,
      forecast: bundle.forecast || null,
      air: bundle.air || null,
      source: bundle.source || 'openweather'
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;

    // Worker 全部不可达时的最后兜底：直接请求 Open-Meteo。
    // 在部分网络环境下 Open-Meteo 仍可访问；如果也不可达，页面会给出明确提示。
    try {
      const fallback = await fetchOpenMeteoBundle(lat, lon, location, signal);
      return { ...fallback, source: 'open-meteo' };
    } catch (fallbackError) {
      if (fallbackError?.name === 'AbortError') throw fallbackError;
      throw new WeatherError(
        error?.message || fallbackError?.message || '天气服务暂时不可用，请稍后再试。',
        'all_failed'
      );
    }
  }
}

export async function searchGeocode(query, signal) {
  try {
    const results = await proxyJson('/api/geocode', { q: query }, signal);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return searchGeocodeOpenMeteo(query, signal);
  }
}

export async function reverseGeocode(lat, lon, signal) {
  try {
    const result = await proxyJson('/api/reverse', { lat, lon }, signal);
    return result || null;
  } catch {
    return null;
  }
}

async function searchGeocodeOpenMeteo(query, signal) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({
    name: query,
    count: '8',
    language: 'zh',
    format: 'json'
  }).toString();

  const data = await fetchJson(url.toString(), signal);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .sort((a, b) => (Number(b.population) || 0) - (Number(a.population) || 0))
    .map((item) => ({
      name: item.name,
      local_names: { zh: item.name },
      country: item.country_code,
      state: item.admin1 || '',
      lat: item.latitude,
      lon: item.longitude,
      _population: item.population || 0
    }));
}

/* ── Open-Meteo 兜底与归一化 ───────────────────────────────── */

const WMO_CODES = {
  0: ['晴', 800, '01'],
  1: ['少云', 801, '02'],
  2: ['多云', 802, '03'],
  3: ['阴', 804, '04'],
  45: ['雾', 741, '50'],
  48: ['雾凇', 741, '50'],
  51: ['毛毛雨', 300, '09'],
  53: ['毛毛雨', 301, '09'],
  55: ['浓毛毛雨', 302, '09'],
  56: ['冻毛毛雨', 311, '09'],
  57: ['冻毛毛雨', 312, '09'],
  61: ['小雨', 500, '10'],
  63: ['中雨', 501, '10'],
  65: ['大雨', 502, '10'],
  66: ['冻雨', 511, '13'],
  67: ['强冻雨', 512, '13'],
  71: ['小雪', 600, '13'],
  73: ['中雪', 601, '13'],
  75: ['大雪', 602, '13'],
  77: ['雪粒', 611, '13'],
  80: ['阵雨', 520, '09'],
  81: ['强阵雨', 521, '09'],
  82: ['暴雨', 522, '09'],
  85: ['阵雪', 620, '13'],
  86: ['强阵雪', 621, '13'],
  95: ['雷暴', 200, '11'],
  96: ['雷暴伴冰雹', 201, '11'],
  99: ['强雷暴伴冰雹', 202, '11']
};

function wmoWeather(code, isDay = true) {
  const [description, id, icon] = WMO_CODES[Number(code)] || ['天气未知', 800, '01'];
  return {
    id,
    main: description,
    description,
    icon: `${icon}${isDay ? 'd' : 'n'}`
  };
}

function parseLocalIso(value, offsetSeconds = 0) {
  if (!value) return null;
  const ms = Date.parse(`${value}Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000) - Number(offsetSeconds || 0);
}

function nearestIndex(times, value) {
  if (!Array.isArray(times) || !times.length) return -1;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  times.forEach((time, index) => {
    const distance = Math.abs(Date.parse(`${time}Z`) - Date.parse(`${value}Z`));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new WeatherError('备用天气数据源暂时不可用。', 'fallback_http', response.status);
  }
  return response.json();
}

async function fetchOpenMeteoBundle(lat, lon, location = {}, signal) {
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
      'precipitation', 'weather_code', 'cloud_cover', 'pressure_msl',
      'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
    ].join(','),
    hourly: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation',
      'precipitation_probability', 'weather_code', 'cloud_cover', 'pressure_msl',
      'wind_speed_10m', 'wind_direction_10m', 'visibility'
    ].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'sunrise', 'sunset', 'precipitation_probability_max'
    ].join(','),
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: 'celsius',
    wind_speed_unit: 'ms',
    precipitation_unit: 'mm'
  }).toString();

  const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  airUrl.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone',
    timezone: 'auto'
  }).toString();

  const weather = await fetchJson(weatherUrl.toString(), signal);
  let airData = null;
  try {
    airData = await fetchJson(airUrl.toString(), signal);
  } catch {
    airData = null;
  }

  const offset = Number(weather.utc_offset_seconds) || 0;
  const current = weather.current || {};
  const hourly = weather.hourly || {};
  const daily = weather.daily || {};
  const currentIndex = nearestIndex(hourly.time, current.time);
  const currentWeather = wmoWeather(current.weather_code, current.is_day !== 0);
  const sunrise = parseLocalIso(daily.sunrise?.[0], offset);
  const sunset = parseLocalIso(daily.sunset?.[0], offset);
  const nowDt = parseLocalIso(current.time, offset) || Math.floor(Date.now() / 1000);
  const visibility = currentIndex >= 0 ? Number(hourly.visibility?.[currentIndex]) || 10000 : 10000;
  const precipitation = Number(current.precipitation) || 0;

  const normalizedCurrent = {
    coord: { lat: Number(lat), lon: Number(lon) },
    weather: [currentWeather],
    main: {
      temp: Number(current.temperature_2m),
      feels_like: Number(current.apparent_temperature),
      temp_min: Number(daily.temperature_2m_min?.[0] ?? current.temperature_2m),
      temp_max: Number(daily.temperature_2m_max?.[0] ?? current.temperature_2m),
      pressure: Number(current.pressure_msl),
      humidity: Number(current.relative_humidity_2m)
    },
    wind: {
      speed: Number(current.wind_speed_10m) || 0,
      deg: Number(current.wind_direction_10m) || 0,
      gust: Number(current.wind_gusts_10m) || undefined
    },
    clouds: { all: Number(current.cloud_cover) || 0 },
    visibility,
    rain: precipitation > 0 ? { '1h': precipitation } : undefined,
    dt: nowDt,
    timezone: offset,
    name: location.name || '当前位置',
    sys: {
      country: location.countryCode || '',
      sunrise,
      sunset
    },
    _source: 'open-meteo'
  };

  const list = [];
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  for (let index = 0; index < times.length; index += 3) {
    const dt = parseLocalIso(times[index], offset);
    if (!dt || dt < nowDt - 86400) continue;
    const temp = Number(hourly.temperature_2m?.[index]);
    const weatherItem = wmoWeather(hourly.weather_code?.[index], true);
    list.push({
      dt,
      dt_txt: `${times[index].replace('T', ' ')}:00`,
      main: {
        temp,
        temp_min: temp,
        temp_max: temp,
        feels_like: Number(hourly.apparent_temperature?.[index] ?? temp),
        pressure: Number(hourly.pressure_msl?.[index] ?? current.pressure_msl),
        humidity: Number(hourly.relative_humidity_2m?.[index] ?? current.relative_humidity_2m)
      },
      weather: [weatherItem],
      wind: {
        speed: Number(hourly.wind_speed_10m?.[index]) || 0,
        deg: Number(hourly.wind_direction_10m?.[index]) || 0
      },
      clouds: { all: Number(hourly.cloud_cover?.[index]) || 0 },
      pop: (Number(hourly.precipitation_probability?.[index]) || 0) / 100,
      rain: Number(hourly.precipitation?.[index]) > 0
        ? { '3h': Number(hourly.precipitation[index]) }
        : undefined
    });
  }

  const normalizedForecast = {
    city: {
      name: location.name || '当前位置',
      timezone: offset
    },
    list
  };

  let normalizedAir = null;
  if (airData?.current) {
    const aqi = usAqiToOpenWeather(airData.current.us_aqi);
    normalizedAir = {
      list: [{
        main: { aqi },
        components: {
          pm2_5: Number(airData.current.pm2_5) || 0,
          pm10: Number(airData.current.pm10) || 0,
          no2: Number(airData.current.nitrogen_dioxide) || 0,
          o3: Number(airData.current.ozone) || 0
        }
      }]
    };
  }

  return {
    current: normalizedCurrent,
    forecast: normalizedForecast,
    air: normalizedAir
  };
}

function usAqiToOpenWeather(aqi) {
  const value = Number(aqi);
  if (!Number.isFinite(value)) return 0;
  if (value <= 50) return 1;
  if (value <= 100) return 2;
  if (value <= 150) return 3;
  if (value <= 200) return 4;
  return 5;
}
