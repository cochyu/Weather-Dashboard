/* 天穹天气 · 通用工具 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function debounce(fn, wait = 220) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function pad(value) {
  return String(value).padStart(2, '0');
}

export function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·,，。.\-—_/\\]/g, '');
}

export function safeStorageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

export function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 隐私模式下忽略 */
  }
}

export function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/* ── 国家 / 地区 ───────────────────────────────────────────── */

const COUNTRY_NAMES = {
  CN: '中国', HK: '中国香港', MO: '中国澳门', TW: '中国台湾',
  US: '美国', GB: '英国', JP: '日本', KR: '韩国', KP: '朝鲜',
  FR: '法国', DE: '德国', IT: '意大利', ES: '西班牙', PT: '葡萄牙',
  RU: '俄罗斯', UA: '乌克兰', CA: '加拿大', AU: '澳大利亚', NZ: '新西兰',
  SG: '新加坡', MY: '马来西亚', TH: '泰国', VN: '越南', PH: '菲律宾',
  ID: '印度尼西亚', IN: '印度', PK: '巴基斯坦', BD: '孟加拉国',
  LK: '斯里兰卡', NP: '尼泊尔', MM: '缅甸', KH: '柬埔寨', LA: '老挝',
  MN: '蒙古', KZ: '哈萨克斯坦', UZ: '乌兹别克斯坦',
  BR: '巴西', MX: '墨西哥', AR: '阿根廷', CL: '智利', CO: '哥伦比亚',
  PE: '秘鲁', VE: '委内瑞拉', CU: '古巴',
  NL: '荷兰', BE: '比利时', CH: '瑞士', AT: '奥地利', SE: '瑞典',
  NO: '挪威', DK: '丹麦', FI: '芬兰', IS: '冰岛', IE: '爱尔兰',
  PL: '波兰', CZ: '捷克', HU: '匈牙利', RO: '罗马尼亚', BG: '保加利亚',
  GR: '希腊', TR: '土耳其', IL: '以色列', SA: '沙特阿拉伯',
  AE: '阿联酋', QA: '卡塔尔', KW: '科威特', IR: '伊朗', IQ: '伊拉克',
  EG: '埃及', ZA: '南非', NG: '尼日利亚', KE: '肯尼亚', MA: '摩洛哥',
  ET: '埃塞俄比亚', TZ: '坦桑尼亚'
};

export function countryName(code = '') {
  const upper = String(code).toUpperCase();
  return COUNTRY_NAMES[upper] || upper || '未知地区';
}

export function countryFlag(code = '') {
  const upper = String(code).toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🌐';
  return String.fromCodePoint(...[...upper].map((char) => 127397 + char.charCodeAt(0)));
}

const REGION_NAMES = {
  Beijing: '北京市', Shanghai: '上海市', Tianjin: '天津市', Chongqing: '重庆市',
  Guangdong: '广东省', Zhejiang: '浙江省', Jiangsu: '江苏省', Sichuan: '四川省',
  Hubei: '湖北省', Hunan: '湖南省', Fujian: '福建省', Shandong: '山东省',
  Henan: '河南省', Hebei: '河北省', Shanxi: '山西省', Shaanxi: '陕西省',
  Liaoning: '辽宁省', Jilin: '吉林省', Heilongjiang: '黑龙江省',
  Anhui: '安徽省', Jiangxi: '江西省', Yunnan: '云南省', Guizhou: '贵州省',
  Guangxi: '广西壮族自治区', Hainan: '海南省', Gansu: '甘肃省',
  Qinghai: '青海省', Ningxia: '宁夏回族自治区', Xinjiang: '新疆维吾尔自治区',
  Tibet: '西藏自治区', Xizang: '西藏自治区', 'Inner Mongolia': '内蒙古自治区',
  'Hong Kong': '香港特别行政区', Macau: '澳门特别行政区', Taiwan: '台湾省'
};

export function regionName(state = '', countryCode = '') {
  if (!state) return '';
  if (/[\u4e00-\u9fa5]/.test(state)) return state;
  if (REGION_NAMES[state]) return REGION_NAMES[state];
  if (String(countryCode).toUpperCase() === 'CN') return state;
  return state;
}

/* ── 坐标 / 距离 ───────────────────────────────────────────── */

export function distanceKm(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatCoord(lat, lon) {
  const latText = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonText = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latText} · ${lonText}`;
}

/* ── 温度 / 单位 ───────────────────────────────────────────── */

export function convertTemp(celsius, unit = 'C') {
  const value = unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;
  return Math.round(value);
}

export function formatTemp(celsius, unit = 'C', withUnit = true) {
  if (!Number.isFinite(Number(celsius))) return withUnit ? '--°' : '--';
  return `${convertTemp(Number(celsius), unit)}${withUnit ? '°' : ''}`;
}

export function tempValue(celsius, unit = 'C') {
  if (!Number.isFinite(Number(celsius))) return '--';
  return String(convertTemp(Number(celsius), unit));
}

export function unitLabel(unit = 'C') {
  return unit === 'F' ? '°F' : '°C';
}

/* ── 时间（使用 OpenWeather 时区偏移，避免依赖浏览器时区） ───── */

function shiftedDate(unixSeconds, offsetSeconds = 0) {
  return new Date((Number(unixSeconds) + Number(offsetSeconds)) * 1000);
}

export function formatLocalTime(unixSeconds, offsetSeconds = 0) {
  const date = shiftedDate(unixSeconds, offsetSeconds);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatLocalHour(unixSeconds, offsetSeconds = 0) {
  return pad(shiftedDate(unixSeconds, offsetSeconds).getUTCHours());
}

export function formatLocalDate(unixSeconds, offsetSeconds = 0) {
  const date = shiftedDate(unixSeconds, offsetSeconds);
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

export function formatShortDate(unixSeconds, offsetSeconds = 0) {
  const date = shiftedDate(unixSeconds, offsetSeconds);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function weekday(unixSeconds, offsetSeconds = 0) {
  return WEEKDAYS[shiftedDate(unixSeconds, offsetSeconds).getUTCDay()];
}

export function dateKey(unixSeconds, offsetSeconds = 0) {
  const date = shiftedDate(unixSeconds, offsetSeconds);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function localHour(unixSeconds, offsetSeconds = 0) {
  return shiftedDate(unixSeconds, offsetSeconds).getUTCHours();
}

export function localDayIndex(unixSeconds, offsetSeconds = 0) {
  return shiftedDate(unixSeconds, offsetSeconds).getUTCDay();
}

export function formatUpdated(timestampMs) {
  if (!timestampMs) return '--';
  const diff = Math.max(0, Date.now() - timestampMs);
  if (diff < 60 * 1000) return '刚刚';
  const date = new Date(timestampMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isNightAt(unixSeconds, offsetSeconds, sunrise, sunset) {
  const seconds = Number(unixSeconds);
  if (!sunrise || !sunset) {
    const hour = localHour(seconds, offsetSeconds);
    return hour < 6 || hour >= 19;
  }
  return seconds < sunrise || seconds >= sunset;
}

export function durationText(seconds) {
  const total = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) return `${minutes} 分钟`;
  return `${hours} 小时 ${minutes} 分`;
}

/* ── 风 / 湿度 / 空气质量 ─────────────────────────────────── */

const WIND_DIRECTIONS = [
  '北风', '东北偏北风', '东北风', '东北偏东风',
  '东风', '东南偏东风', '东南风', '东南偏南风',
  '南风', '西南偏南风', '西南风', '西南偏西风',
  '西风', '西北偏西风', '西北风', '西北偏北风'
];

export function windDirection(degrees) {
  if (!Number.isFinite(Number(degrees))) return '风向未知';
  const index = Math.round((((Number(degrees) % 360) + 360) % 360) / 22.5) % 16;
  return WIND_DIRECTIONS[index];
}

const BEAUFORT_LIMITS = [0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];

export function beaufort(speedMs) {
  const speed = Math.max(0, Number(speedMs) || 0);
  let scale = 0;
  for (let i = 0; i < BEAUFORT_LIMITS.length; i += 1) {
    if (speed >= BEAUFORT_LIMITS[i]) scale = i + 1;
  }
  return scale;
}

export function dewPoint(celsius, humidity) {
  const temp = Number(celsius);
  const rh = clamp(Number(humidity), 1, 100);
  if (!Number.isFinite(temp)) return null;
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * temp) / (b + temp) + Math.log(rh / 100);
  return (b * gamma) / (a - gamma);
}

const AQI_LEVELS = {
  1: { label: '优', color: '#6ee7b7', advice: '空气清新，适合开窗通风和户外活动。' },
  2: { label: '良', color: '#a3e635', advice: '空气质量可接受，敏感人群可适当减少长时间剧烈运动。' },
  3: { label: '轻度污染', color: '#fbbf24', advice: '敏感人群建议减少户外运动，普通人可正常活动。' },
  4: { label: '中度污染', color: '#fb923c', advice: '建议减少户外活动，外出佩戴口罩。' },
  5: { label: '重度污染', color: '#f87171', advice: '尽量留在室内，关闭门窗，敏感人群避免户外活动。' }
};

export function aqiMeta(aqi) {
  return AQI_LEVELS[Number(aqi)] || { label: '未知', color: '#94a3b8', advice: '空气质量数据暂不可用。' };
}

/* ── 天气现象 ─────────────────────────────────────────────── */

export function weatherKind(id, night = false) {
  const code = Number(id);
  if (code >= 200 && code < 300) return 'storm';
  if (code >= 300 && code < 600) return 'rain';
  if (code >= 600 && code < 700) return 'snow';
  if (code >= 700 && code < 800) return 'mist';
  if (code === 800) return night ? 'clear-night' : 'clear-day';
  if (code === 801 || code === 802) return night ? 'partly-night' : 'partly-day';
  return night ? 'cloudy-night' : 'cloudy';
}

export function weatherTheme(kind) {
  if (kind === 'storm') return 'storm';
  if (kind === 'rain') return 'rain';
  if (kind === 'snow') return 'snow';
  if (kind === 'mist') return 'mist';
  if (kind === 'clear-night' || kind === 'partly-night' || kind === 'cloudy-night') return 'night';
  if (kind === 'clear-day') return 'clear';
  return 'cloudy';
}

const DESC_FALLBACK = [
  [/clear sky/i, '晴'],
  [/few clouds/i, '少云'],
  [/scattered clouds/i, '多云'],
  [/broken clouds/i, '阴'],
  [/overcast clouds/i, '阴'],
  [/light rain/i, '小雨'],
  [/moderate rain/i, '中雨'],
  [/heavy intensity rain/i, '大雨'],
  [/shower rain/i, '阵雨'],
  [/thunderstorm/i, '雷暴'],
  [/light snow/i, '小雪'],
  [/snow/i, '雪'],
  [/mist/i, '薄雾'],
  [/fog/i, '雾'],
  [/haze/i, '霾']
];

export function localizeDescription(description = '') {
  const text = String(description).trim();
  if (!text) return '天气未知';
  if (/[\u4e00-\u9fa5]/.test(text)) return text;
  for (const [pattern, label] of DESC_FALLBACK) {
    if (pattern.test(text)) return label;
  }
  return text;
}

export function isRainyKind(kind) {
  return kind === 'rain' || kind === 'storm' || kind === 'snow';
}

export function weatherEmoji(kind) {
  return {
    'clear-day': '☀️',
    'clear-night': '🌙',
    'partly-day': '🌤️',
    'partly-night': '☁️',
    cloudy: '☁️',
    'cloudy-night': '☁️',
    rain: '🌧️',
    storm: '⛈️',
    snow: '❄️',
    mist: '🌫️'
  }[kind] || '🌡️';
}

/* ── 文本渲染 ─────────────────────────────────────────────── */

export function renderRichText(text = '') {
  const escaped = escapeHtml(text);
  const lines = escaped.split(/\r?\n/);
  const output = [];
  let listType = null;

  const closeList = () => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  };

  const inline = (line) => line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    const bullet = line.match(/^[-•*]\s+(.+)/);
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        output.push('<ul>');
        listType = 'ul';
      }
      output.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    if (numbered) {
      if (listType !== 'ol') {
        closeList();
        output.push('<ol>');
        listType = 'ol';
      }
      output.push(`<li>${inline(numbered[1])}</li>`);
      continue;
    }
    closeList();
    if (heading) {
      output.push(`<p class="rich-heading">${inline(heading[1])}</p>`);
    } else {
      output.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return output.join('');
}

export function toast(message, type = 'info', duration = 3600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
  el.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('is-visible'), duration);
}

export function plural(value, unit = '') {
  return `${value}${unit}`;
}
