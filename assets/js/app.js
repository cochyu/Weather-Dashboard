/* 天穹天气 · 页面控制器 */

import { CONFIG } from './config.js';
import {
  fetchWeatherBundle,
  reverseGeocode,
  searchGeocode
} from './api.js';
import {
  CITY_PRESETS,
  findExactPreset,
  geocodeToLocation,
  hotCityLocations,
  locationFromStored,
  locationKey,
  mergeLocations,
  presetToLocation,
  searchPresets,
  searchResultMeta
} from './cities.js';
import {
  aiState,
  askAI,
  briefSourceLabel,
  buildBrief,
  initAI
} from './ai.js';
import { uiIcon, weatherIcon } from './icons.js';
import {
  $,
  $$,
  aqiMeta,
  beaufort,
  clamp,
  convertTemp,
  countryName,
  dateKey,
  debounce,
  dewPoint,
  durationText,
  escapeHtml,
  formatCoord,
  formatLocalDate,
  formatLocalTime,
  formatShortDate,
  formatTemp,
  formatUpdated,
  isNightAt,
  localHour,
  localizeDescription,
  normalizeText,
  readJson,
  regionName,
  renderRichText,
  safeStorageGet,
  safeStorageSet,
  tempValue,
  toast,
  unitLabel,
  weekday,
  weatherKind,
  weatherTheme,
  windDirection,
  writeJson
} from './utils.js';

const STORE_UNIT = 'wd_unit';
const STORE_RECENT = 'wd_recent';
const STORE_FAVORITES = 'wd_favorites';

const initialRecent = readJson(STORE_RECENT, []);
const initialFavorites = readJson(STORE_FAVORITES, []);

const state = {
  unit: safeStorageGet(STORE_UNIT, 'C') === 'F' ? 'F' : 'C',
  recent: Array.isArray(initialRecent) ? initialRecent : [],
  favorites: Array.isArray(initialFavorites) ? initialFavorites : [],
  weather: null,
  forecast: null,
  air: null,
  location: null,
  hourly: [],
  hourlySummary: '',
  daily: null,
  fetchedAt: 0,
  source: 'openweather',
  requestSeq: 0,
  weatherController: null,
  searchController: null,
  suggestions: [],
  activeSuggestion: -1,
  aiHistory: [],
  aiBusy: false,
  booted: false
};

const dom = {};

function cacheDom() {
  const ids = [
    'searchForm', 'cityInput', 'searchWrap', 'suggestions', 'geoBtn', 'unitToggle',
    'refreshBtn', 'favoriteBtn', 'cityName', 'cityMeta', 'localDate', 'tempValue',
    'degreeUnit', 'conditionText', 'feelsLike', 'heroNote', 'heroIcon', 'highLow',
    'heroHumidity', 'heroWind', 'updatedAt', 'aiStatus', 'briefSource', 'briefContent',
    'chatLog', 'quickPrompts', 'chatForm', 'chatInput', 'sendBtn', 'hourlyStrip',
    'hourlySummary', 'dailyList', 'dailySummary', 'metricGrid', 'metricsFoot',
    'sunVisual', 'sunriseTime', 'sunsetTime', 'sunStatus', 'daylightDuration',
    'aqiBadge', 'aqiBody', 'appLoader', 'toast', 'deepDiveBtn'
  ];
  ids.forEach((id) => {
    dom[id] = document.getElementById(id);
  });
  dom.heroCard = $('#currentCard');
}

function shortCityName(name = '') {
  const text = String(name).trim();
  if (!text) return '未知城市';
  const special = {
    香港特别行政区: '香港',
    澳门特别行政区: '澳门',
    新疆维吾尔自治区: '乌鲁木齐',
    西藏自治区: '拉萨',
    内蒙古自治区: '呼和浩特',
    广西壮族自治区: '南宁',
    宁夏回族自治区: '银川'
  };
  if (special[text]) return special[text];
  if (text.length > 2 && text.endsWith('市')) return text.slice(0, -1);
  return text;
}

function cityMetaText(location) {
  const parts = [location.region, location.country]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  return `${parts.join(' · ')} · ${formatCoord(location.lat, location.lon)}`;
}

function currentLocationKey() {
  return state.location ? locationKey(state.location) : '';
}

/* ── 初始化 ───────────────────────────────────────────────── */

async function boot() {
  cacheDom();
  bindEvents();
  applyUnitButton();
  updateFavoriteButton();

  initAI().then(() => {
    updateAIStatus();
    renderBriefIfReady();
  });

  await loadInitialCity();
  state.booted = true;
  hideBootLoader();
  document.body.classList.add('is-ready');
}

function hideBootLoader() {
  dom.appLoader?.classList.add('is-hidden');
}

async function loadInitialCity() {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get('city') || '').trim();

  if (query) {
    const preset = findExactPreset(query);
    if (preset) {
      await loadLocation(presetToLocation(preset), { replaceUrl: true });
      return;
    }
    await searchAndLoad(query, { replaceUrl: true, autoPick: true });
    return;
  }

  const recent = locationFromStored(state.recent[0]);
  if (recent) {
    await loadLocation(recent, { replaceUrl: false });
    return;
  }

  const beijing = findExactPreset('北京') || CITY_PRESETS[0];
  await loadLocation(presetToLocation(beijing), { replaceUrl: true });
}

/* ── 事件 ─────────────────────────────────────────────────── */

function bindEvents() {
  dom.searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = dom.cityInput.value.trim();
    if (state.activeSuggestion >= 0 && state.suggestions[state.activeSuggestion]) {
      chooseSuggestion(state.suggestions[state.activeSuggestion]);
      return;
    }
    searchAndLoad(query);
  });

  dom.cityInput?.addEventListener('input', () => {
    state.activeSuggestion = -1;
    paintActiveSuggestion();
  });

  dom.cityInput?.addEventListener('input', debounce(() => {
    const query = dom.cityInput.value.trim();
    if (!query) {
      showDefaultSuggestions();
      return;
    }
    queueSuggestions(query);
  }, 220));

  dom.cityInput?.addEventListener('focus', () => {
    if (!dom.cityInput.value.trim()) showDefaultSuggestions();
    else queueSuggestions(dom.cityInput.value.trim());
  });

  dom.cityInput?.addEventListener('keydown', handleSearchKeydown);

  dom.suggestions?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-suggestion-index]');
    if (!target) return;
    const index = Number(target.dataset.suggestionIndex);
    if (Number.isInteger(index) && state.suggestions[index]) {
      chooseSuggestion(state.suggestions[index]);
    }
  });

  document.addEventListener('click', (event) => {
    if (!dom.searchWrap?.contains(event.target)) closeSuggestions();
  });

  dom.geoBtn?.addEventListener('click', useMyLocation);
  dom.unitToggle?.addEventListener('click', toggleUnit);
  dom.refreshBtn?.addEventListener('click', () => {
    if (state.location) loadLocation(state.location, { replaceUrl: false });
  });
  dom.favoriteBtn?.addEventListener('click', toggleFavorite);

  dom.chatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    sendChat(dom.chatInput.value);
  });

  dom.chatInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChat(dom.chatInput.value);
    }
  });

  dom.chatInput?.addEventListener('input', () => {
    dom.chatInput.style.height = 'auto';
    dom.chatInput.style.height = `${Math.min(dom.chatInput.scrollHeight, 110)}px`;
  });

  dom.quickPrompts?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-prompt]');
    if (!button) return;
    sendChat(button.dataset.prompt);
  });

  dom.briefContent?.addEventListener('click', (event) => {
    if (event.target.closest('#deepDiveBtn')) {
      sendChat('请结合当前天气和未来预报，给我一份更详细的今日出行建议。');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSuggestions();
  });
}

function handleSearchKeydown(event) {
  const open = dom.suggestions && !dom.suggestions.hidden;
  if (!open) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!state.suggestions.length) return;
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    state.activeSuggestion = (state.activeSuggestion + direction + state.suggestions.length) % state.suggestions.length;
    paintActiveSuggestion();
  } else if (event.key === 'Enter' && state.activeSuggestion >= 0) {
    event.preventDefault();
    chooseSuggestion(state.suggestions[state.activeSuggestion]);
  } else if (event.key === 'Escape') {
    closeSuggestions();
  }
}

/* ── 搜索与建议 ───────────────────────────────────────────── */

function filterRelevantGeocodes(query, locations, hasPreset = false) {
  if (!/[\u4e00-\u9fa5]/.test(query)) return locations;
  const queryChars = [...new Set([...query].filter((char) => /[\u4e00-\u9fa5]/.test(char)))];
  const matching = locations.filter((location) => queryChars.some((char) => (
    [location.name, location.englishName, location.localName]
      .filter(Boolean)
      .some((text) => String(text).includes(char))
  )));
  // 有中文预设命中时，丢弃 OpenWeather 返回的无关模糊结果；
  // 没有预设时（例如「伦敦」），保留结果让用户选择。
  if (matching.length || hasPreset) return matching;
  return locations;
}

function closeSuggestions() {
  dom.suggestions.hidden = true;
  dom.cityInput?.setAttribute('aria-expanded', 'false');
  state.activeSuggestion = -1;
  paintActiveSuggestion();
}

function showDefaultSuggestions() {
  const recent = state.recent
    .map(locationFromStored)
    .filter(Boolean)
    .slice(0, CONFIG.app.maxRecent);
  const favorites = state.favorites
    .map(locationFromStored)
    .filter(Boolean)
    .slice(0, 4);
  const hot = hotCityLocations();

  const groups = [];
  if (recent.length) groups.push({ title: '最近搜索', items: recent });
  if (favorites.length) groups.push({ title: '我的收藏', items: favorites });
  groups.push({ title: '热门城市', items: hot });
  renderSuggestions(groups);
}

async function queueSuggestions(query) {
  if (state.searchController) state.searchController.abort();
  const controller = new AbortController();
  state.searchController = controller;

  const presets = searchPresets(query, 5).map(presetToLocation);
  if (presets.length) {
    renderSuggestions([{ title: '中文城市', items: presets }, { title: '搜索中…', loading: true }]);
  } else {
    renderSuggestions([{ title: '搜索中…', loading: true }]);
  }

  try {
    const raw = await searchGeocode(query, controller.signal);
    const geocodes = filterRelevantGeocodes(query, raw
      .map((item) => geocodeToLocation(item, query))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon)), presets.length > 0);
    const merged = mergeLocations(presets, geocodes);
    if (!merged.length) {
      renderSuggestions([{ title: '没有找到', empty: true, query }]);
      return;
    }
    renderSuggestions([{ title: `「${query}」的搜索结果`, items: merged }]);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (presets.length) {
      renderSuggestions([{ title: '中文城市', items: presets }]);
    } else {
      renderSuggestions([{ title: '搜索失败', empty: true, query, error: true }]);
    }
  }
}

function renderSuggestions(groups) {
  const flat = [];
  const html = [];

  for (const group of groups) {
    if (group.loading) {
      html.push(`<div class="suggestion-loading"><span class="mini-spinner"></span>正在查找城市…</div>`);
      continue;
    }
    if (group.empty) {
      html.push(`<div class="suggestion-empty">${group.error ? '搜索失败，请稍后重试' : `没有找到「${escapeHtml(group.query || '')}」<span>换个中文名或英文名试试</span>`}</div>`);
      continue;
    }
    if (!group.items?.length) continue;
    html.push(`<div class="suggestion-group"><span>${escapeHtml(group.title)}</span></div>`);
    for (const item of group.items) {
      const index = flat.length;
      flat.push(item);
      const meta = searchResultMeta(item);
      html.push(`<button class="suggestion-item" type="button" role="option" data-suggestion-index="${index}" aria-selected="false">
        <span class="suggestion-flag">${escapeHtml(item.countryCode === 'CN' ? '📍' : '🌐')}</span>
        <span class="suggestion-copy"><strong>${escapeHtml(shortCityName(item.name))}</strong><small>${escapeHtml(meta)}</small></span>
        <span class="suggestion-go">${uiIcon('arrow')}</span>
      </button>`);
    }
  }

  state.suggestions = flat;
  state.activeSuggestion = -1;
  dom.suggestions.innerHTML = html.join('');
  dom.suggestions.hidden = false;
  dom.cityInput?.setAttribute('aria-expanded', 'true');
  paintActiveSuggestion();
}

function paintActiveSuggestion() {
  if (!dom.suggestions) return;
  $$('.suggestion-item', dom.suggestions).forEach((element) => {
    const active = Number(element.dataset.suggestionIndex) === state.activeSuggestion;
    element.classList.toggle('is-active', active);
    element.setAttribute('aria-selected', String(active));
  });
}

function chooseSuggestion(location) {
  if (!location) return;
  dom.cityInput.value = shortCityName(location.name);
  closeSuggestions();
  loadLocation(location, { replaceUrl: true });
}

async function searchAndLoad(query, options = {}) {
  const text = String(query || '').trim();
  if (!text) {
    toast('输入一个城市名，例如「杭州」或「Tokyo」。', 'info');
    dom.cityInput.focus();
    return;
  }

  const exactPreset = findExactPreset(text);
  if (exactPreset) {
    closeSuggestions();
    await loadLocation(presetToLocation(exactPreset), { replaceUrl: true, ...options });
    return;
  }

  if (state.searchController) state.searchController.abort();
  const controller = new AbortController();
  state.searchController = controller;
  renderSuggestions([{ title: '搜索中…', loading: true }]);

  try {
    const raw = await searchGeocode(text, controller.signal);
    const presets = searchPresets(text, 4).map(presetToLocation);
    const geocodes = filterRelevantGeocodes(text, raw
      .map((item) => geocodeToLocation(item, text))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon)), presets.length > 0);
    const merged = mergeLocations(presets, geocodes);

    if (!merged.length) {
      renderSuggestions([{ title: '没有找到', empty: true, query: text }]);
      toast(`没有找到「${text}」，换个城市名试试。`, 'error');
      return;
    }

    const best = merged[0];
    const exact = [best.name, best.englishName, ...(best.aliases || [])]
      .filter(Boolean)
      .some((name) => normalizeText(name) === normalizeText(text));

    if (options.autoPick || merged.length === 1 || exact) {
      chooseSuggestion(best);
      return;
    }

    renderSuggestions([{ title: `「${text}」的搜索结果`, items: merged }]);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    renderSuggestions([{ title: '搜索失败', empty: true, query: text, error: true }]);
    toast(error?.message || '城市搜索失败，请稍后重试。', 'error');
  }
}

/* ── 定位 ─────────────────────────────────────────────────── */

async function useMyLocation() {
  if (!navigator.geolocation) {
    toast('当前浏览器不支持定位，请直接搜索城市。', 'error');
    return;
  }
  dom.geoBtn.classList.add('is-spinning');
  dom.geoBtn.disabled = true;
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000
      });
    });
    const { latitude, longitude } = position.coords;
    let location = null;
    try {
      const result = await reverseGeocode(latitude, longitude);
      if (result) location = geocodeToLocation(result);
    } catch {
      /* 逆地理失败时使用坐标兜底 */
    }
    if (!location) {
      location = {
        id: `gps-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
        name: '我的位置',
        localName: '我的位置',
        region: '',
        country: '',
        countryCode: '',
        lat: latitude,
        lon: longitude,
        source: 'gps'
      };
    }
    await loadLocation(location, { replaceUrl: true });
    toast(`已定位到${shortCityName(location.name)}。`, 'success');
  } catch (error) {
    const message = error?.code === 1
      ? '定位权限被拒绝，请在浏览器设置中允许定位。'
      : '定位失败，请直接搜索城市。';
    toast(message, 'error');
  } finally {
    dom.geoBtn.classList.remove('is-spinning');
    dom.geoBtn.disabled = false;
  }
}

/* ── 加载天气 ─────────────────────────────────────────────── */

async function loadLocation(location, { replaceUrl = true } = {}) {
  if (!location) return;
  if (state.weatherController) state.weatherController.abort();
  const requestId = ++state.requestSeq;
  const controller = new AbortController();
  state.weatherController = controller;
  const timeout = setTimeout(() => controller.abort(), 20000);

  setLoading(true);

  try {
    const bundle = await fetchWeatherBundle(location.lat, location.lon, location, controller.signal);
    if (requestId !== state.requestSeq) return;

    const { current, forecast, air, source } = bundle;
    const resolvedLocation = buildResolvedLocation(location, current);
    const hourly = buildHourly(current, forecast);
    const daily = buildDaily(current, forecast);
    const previousKey = state.location ? locationKey(state.location) : '';

    state.weather = current;
    state.forecast = forecast;
    state.air = air;
    state.location = resolvedLocation;
    state.hourly = hourly.items;
    state.hourlySummary = hourly.summary;
    state.daily = daily;
    state.fetchedAt = Date.now();
    state.source = source;

    renderAll();
    updateDataSource();
    saveRecent(resolvedLocation);
    if (replaceUrl) updateUrl(resolvedLocation);
    updateDocumentTitle(resolvedLocation);

    if (!state.booted || previousKey !== locationKey(resolvedLocation)) {
      resetChat();
    }

    if (!forecast) {
      toast('预报数据暂时不可用，已展示当前天气。', 'info');
    }
  } catch (error) {
    if (requestId !== state.requestSeq) return;
    if (error?.name === 'AbortError') {
      toast('请求超时，请检查网络后再试。', 'error');
    } else {
      toast(error?.message || '天气加载失败，请稍后重试。', 'error');
      if (dom.heroNote) dom.heroNote.textContent = '没有拿到最新观测数据，请稍后刷新。';
    }
  } finally {
    clearTimeout(timeout);
    if (requestId === state.requestSeq) {
      setLoading(false);
      hideBootLoader();
    }
  }
}

function buildResolvedLocation(location, current) {
  const preset = findExactPreset(location.name);
  const countryCode = current?.sys?.country || location.countryCode || '';
  const region = location.region || preset?.region || '';
  return {
    ...location,
    name: location.name || preset?.name || current?.name || '未知城市',
    localName: location.localName || location.name || current?.name || '未知城市',
    region,
    country: location.country || countryName(countryCode),
    countryCode,
    lat: current?.coord?.lat ?? location.lat,
    lon: current?.coord?.lon ?? location.lon,
    timezone: current?.timezone ?? 0
  };
}

function setLoading(loading) {
  document.body.classList.toggle('is-loading', loading);
  dom.refreshBtn?.classList.toggle('is-spinning', loading);
  dom.searchForm?.setAttribute('aria-busy', String(loading));
}

function updateUrl(location) {
  if (location?.source === 'gps' || location?.name === '我的位置') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('city', shortCityName(location.name));
    window.history.replaceState({}, '', url);
  } catch {
    /* ignore */
  }
}

function updateDocumentTitle(location) {
  document.title = `${shortCityName(location.name)} ${state.weather ? formatTemp(state.weather.main.temp, state.unit) : ''} · 天穹天气`;
}

function updateDataSource() {
  const element = document.getElementById('dataSource');
  if (!element) return;
  if (state.source === 'open-meteo') {
    element.textContent = 'Open-Meteo 备用源';
    element.classList.add('is-fallback');
    element.title = 'OpenWeather 主数据源暂时不可用，已自动切换到免 Key 的 Open-Meteo。';
  } else {
    element.textContent = '主数据源';
    element.classList.remove('is-fallback');
    element.title = '天气数据来自 OpenWeather。';
  }
}

/* ── 数据整理 ─────────────────────────────────────────────── */

function buildHourly(current, forecast) {
  const timezone = current.timezone || 0;
  const sunrise = current.sys?.sunrise;
  const sunset = current.sys?.sunset;
  const items = [];
  const nowKind = weatherKind(current.weather?.[0]?.id, isNightAt(current.dt, timezone, sunrise, sunset));
  const firstForecast = forecast?.list?.[0];

  items.push({
    label: '现在',
    time: '现在',
    dt: current.dt,
    tempC: current.main.temp,
    desc: localizeDescription(current.weather?.[0]?.description),
    pop: Number(firstForecast?.pop) || 0,
    kind: nowKind,
    isNow: true,
    windSpeedMs: current.wind?.speed || 0
  });

  for (const item of forecast?.list || []) {
    if (item.dt <= current.dt + 900) continue;
    if (items.length >= 8) break;
    items.push({
      label: formatLocalTime(item.dt, timezone),
      time: formatLocalTime(item.dt, timezone),
      dt: item.dt,
      tempC: item.main.temp,
      desc: localizeDescription(item.weather?.[0]?.description),
      pop: Number(item.pop) || 0,
      kind: weatherKind(item.weather?.[0]?.id, isNightAt(item.dt, timezone, sunrise, sunset)),
      isNow: false,
      windSpeedMs: item.wind?.speed || 0
    });
  }

  const wettest = items.reduce((best, item) => (item.pop > best.pop ? item : best), items[0]);
  const maxPop = wettest?.pop || 0;
  let summary = '未来 24 小时降水概率较低';
  if (maxPop >= 0.3) {
    summary = `${wettest.time} 前后降水概率最高 ${Math.round(maxPop * 100)}%`;
  } else if (items.some((item) => ['rain', 'storm', 'snow'].includes(item.kind))) {
    summary = '局地可能有短时降水';
  } else {
    const temps = items.map((item) => item.tempC);
    summary = `未来 24 小时 ${Math.round(Math.min(...temps))}° ~ ${Math.round(Math.max(...temps))}°`;
  }

  return { items, summary };
}

function buildDaily(current, forecast) {
  const timezone = current.timezone || 0;
  const todayKey = dateKey(current.dt, timezone);
  const tomorrowKey = dateKey(current.dt + 86400, timezone);
  const groups = new Map();

  for (const item of forecast?.list || []) {
    const key = dateKey(item.dt, timezone);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        items: [],
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        pop: 0,
        midday: item
      });
    }
    const group = groups.get(key);
    group.items.push(item);
    group.min = Math.min(group.min, item.main.temp_min ?? item.main.temp);
    group.max = Math.max(group.max, item.main.temp_max ?? item.main.temp);
    group.pop = Math.max(group.pop, Number(item.pop) || 0);
    const currentScore = Math.abs(localHour(item.dt, timezone) - 13);
    const bestScore = Math.abs(localHour(group.midday.dt, timezone) - 13);
    if (currentScore < bestScore) group.midday = item;
  }

  if (!groups.has(todayKey)) {
    groups.set(todayKey, {
      key: todayKey,
      items: [],
      min: current.main.temp_min ?? current.main.temp,
      max: current.main.temp_max ?? current.main.temp,
      pop: Number(forecast?.list?.[0]?.pop) || 0,
      midday: null,
      synthetic: true
    });
  }

  const todayGroup = groups.get(todayKey);
  if (todayGroup) {
    todayGroup.min = Math.min(todayGroup.min, current.main.temp_min ?? current.main.temp);
    todayGroup.max = Math.max(todayGroup.max, current.main.temp_max ?? current.main.temp);
    if (!todayGroup.midday) todayGroup.midday = null;
  }

  const items = Array.from(groups.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(0, 5)
    .map((group) => {
      const midday = group.midday;
      const kind = weatherKind(midday?.weather?.[0]?.id ?? current.weather?.[0]?.id, false);
      let label;
      if (group.key === todayKey) label = '今天';
      else if (group.key === tomorrowKey) label = '明天';
      else if (midday) label = weekday(midday.dt, timezone);
      else label = '未来';
      return {
        key: group.key,
        label,
        date: midday ? formatShortDate(midday.dt, timezone) : formatShortDate(current.dt, timezone),
        minC: group.min,
        maxC: group.max,
        pop: group.pop,
        desc: localizeDescription(midday?.weather?.[0]?.description || current.weather?.[0]?.description),
        kind,
        dt: midday?.dt || current.dt
      };
    });

  const highs = items.map((item) => item.maxC);
  const lows = items.map((item) => item.minC);
  const weekMin = Math.min(...lows);
  const weekMax = Math.max(...highs);
  const wettest = items.reduce((best, item) => (item.pop > best.pop ? item : best), items[0]);
  let summary = '未来 5 天天气相对平稳';
  if (wettest && wettest.pop >= 0.45) {
    summary = `${wettest.label}降水概率较高 ${Math.round(wettest.pop * 100)}%`;
  } else if (Number.isFinite(weekMax) && Number.isFinite(weekMin) && weekMax - weekMin >= 7) {
    summary = `最高温 ${Math.round(weekMax)}° / 最低温 ${Math.round(weekMin)}°`;
  }

  return { items, summary, weekMin, weekMax, todayKey };
}

/* ── 渲染 ─────────────────────────────────────────────────── */

function renderAll() {
  if (!state.weather || !state.location) return;
  renderCurrent();
  renderHourly();
  renderDaily();
  renderMetrics();
  renderSun();
  renderAqi();
  renderBriefIfReady();
  renderHeroNote();
  updateFavoriteButton();
}

function renderCurrent() {
  const current = state.weather;
  const location = state.location;
  const timezone = current.timezone || 0;
  const now = Date.now() / 1000;
  const kind = weatherKind(current.weather?.[0]?.id, isNightAt(now, timezone, current.sys?.sunrise, current.sys?.sunset));
  const today = state.daily?.items?.[0];

  dom.cityName.textContent = shortCityName(location.name);
  dom.cityMeta.textContent = cityMetaText(location);
  dom.localDate.textContent = `${formatLocalDate(now, timezone)} ${weekday(now, timezone)}`;
  dom.tempValue.textContent = tempValue(current.main.temp, state.unit);
  dom.degreeUnit.textContent = unitLabel(state.unit);
  dom.conditionText.textContent = localizeDescription(current.weather?.[0]?.description);
  dom.feelsLike.textContent = `体感 ${formatTemp(current.main.feels_like, state.unit)}`;
  dom.highLow.textContent = today
    ? `${formatTemp(today.maxC, state.unit)} / ${formatTemp(today.minC, state.unit)}`
    : `${formatTemp(current.main.temp_max, state.unit)} / ${formatTemp(current.main.temp_min, state.unit)}`;
  dom.heroHumidity.textContent = `${Math.round(current.main.humidity)}%`;
  dom.heroWind.textContent = `${beaufort(current.wind?.speed)} 级 · ${windDirection(current.wind?.deg).replace('风', '')}`;
  dom.updatedAt.textContent = formatUpdated(state.fetchedAt || Date.now());
  dom.heroIcon.innerHTML = weatherIcon(kind, 'lg');
  dom.heroCard.dataset.theme = weatherTheme(kind);
  dom.heroCard.setAttribute('aria-label', `${shortCityName(location.name)}当前天气：${localizeDescription(current.weather?.[0]?.description)}，${formatTemp(current.main.temp, state.unit)}`);
  document.body.dataset.theme = weatherTheme(kind);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', weatherTheme(kind) === 'night' ? '#080c1a' : '#0a1022');
}

function renderHeroNote() {
  if (!state.weather || !state.hourly.length) return;
  const current = state.weather;
  const air = normalizeAir(state.air);
  const upcoming = state.hourly.slice(0, 5);
  const wettest = upcoming.reduce((best, item) => (item.pop > best.pop ? item : best), upcoming[0]);
  const spread = (state.daily?.items?.[0]?.maxC ?? current.main.temp_max) - (state.daily?.items?.[0]?.minC ?? current.main.temp_min);
  const wind = Number(current.wind?.speed) || 0;

  let note;
  if (wettest && wettest.pop >= 0.55 && wettest.time !== '现在') {
    note = `${wettest.time} 前后降水概率约 ${Math.round(wettest.pop * 100)}%，出门记得带伞。`;
  } else if (air?.aqi >= 4) {
    note = '空气质量较差，建议减少户外活动，敏感人群尤其注意防护。';
  } else if (spread >= 9) {
    note = `昼夜温差约 ${Math.round(spread)}°，早晚记得添一件外套。`;
  } else if (wind >= 7) {
    note = `风力约 ${beaufort(wind)} 级，骑行和撑伞时注意安全。`;
  } else if (['clear-day', 'clear-night'].includes(weatherKind(current.weather?.[0]?.id, false))) {
    note = '天空比较通透，适合散步、拍照或开窗通风。';
  } else if (['rain', 'storm', 'snow'].includes(weatherKind(current.weather?.[0]?.id, false))) {
    note = '路面可能湿滑，通勤和骑行多留一点时间。';
  } else {
    note = '天气整体平稳，按体感安排今天的出行就好。';
  }
  dom.heroNote.textContent = note;
}

function renderHourly() {
  const items = state.hourly;
  if (!items.length) return;
  dom.hourlySummary.textContent = state.hourlySummary || '';
  dom.hourlyStrip.innerHTML = items.map((item, index) => `
    <div class="hour-card${item.isNow ? ' is-now' : ''}" role="listitem">
      <span class="hour-label">${escapeHtml(item.label)}</span>
      <div class="hour-icon">${weatherIcon(item.kind, 'sm')}</div>
      <strong class="hour-temp">${formatTemp(item.tempC, state.unit)}</strong>
      <span class="hour-desc">${escapeHtml(item.desc)}</span>
      <div class="pop-track" aria-hidden="true"><span style="width:${Math.round(item.pop * 100)}%"></span></div>
      <span class="hour-pop">${Math.round(item.pop * 100)}%</span>
    </div>
  `).join('');
}

function renderDaily() {
  const daily = state.daily;
  if (!daily?.items?.length) return;
  dom.dailySummary.textContent = daily.summary;
  const span = Math.max(1, daily.weekMax - daily.weekMin);
  dom.dailyList.innerHTML = daily.items.map((item, index) => {
    const left = clamp(((item.minC - daily.weekMin) / span) * 100, 0, 92);
    const width = clamp(((item.maxC - item.minC) / span) * 100, 6, 100 - left);
    return `
      <div class="day-row${index === 0 ? ' is-today' : ''}" role="listitem">
        <div class="day-date"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.date)}</span></div>
        <div class="day-icon">${weatherIcon(item.kind, 'sm')}</div>
        <div class="day-content">
          <div class="day-line">
            <strong>${escapeHtml(item.desc)}</strong>
            <span class="day-pop">${uiIcon('droplet')}${Math.round(item.pop * 100)}%</span>
          </div>
          <div class="range-line">
            <span class="range-low">${formatTemp(item.minC, state.unit)}</span>
            <div class="range-track" aria-hidden="true"><span style="left:${left}%;width:${width}%"></span></div>
            <span class="range-high">${formatTemp(item.maxC, state.unit)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderMetrics() {
  const current = state.weather;
  const humidity = Number(current.main.humidity);
  const wind = Number(current.wind?.speed) || 0;
  const pressure = Number(current.main.pressure);
  const visibilityKm = Number(current.visibility) / 1000;
  const dew = dewPoint(current.main.temp, humidity);

  const humiditySub = humidity < 30 ? '空气偏干，注意补水' : humidity > 70 ? '湿度偏高，体感黏腻' : '湿度适中，体感舒适';
  const pressureSub = pressure > 1020 ? '气压偏高，天气较稳定' : pressure < 1005 ? '气压偏低，注意天气变化' : '气压平稳';
  const visibilitySub = visibilityKm >= 10 ? '视野通透' : visibilityKm >= 5 ? '能见度一般' : '能见度较低，出行小心';
  const windSub = `${windDirection(current.wind?.deg)} · ${wind.toFixed(1)} m/s`;

  const metrics = [
    { icon: 'droplet', label: '湿度', value: `${Math.round(humidity)}%`, sub: humiditySub, tone: 'cyan' },
    { icon: 'wind', label: '风力', value: `${beaufort(wind)} 级`, sub: windSub, tone: 'violet' },
    { icon: 'gauge', label: '气压', value: `${Math.round(pressure)} hPa`, sub: pressureSub, tone: 'amber' },
    { icon: 'eye', label: '能见度', value: `${visibilityKm.toFixed(1)} km`, sub: visibilitySub, tone: 'blue' }
  ];

  dom.metricGrid.innerHTML = metrics.map((metric) => `
    <div class="metric">
      <span class="metric-icon tone-${metric.tone}">${uiIcon(metric.icon)}</span>
      <div><span>${metric.label}</span><strong>${metric.value}</strong><small>${metric.sub}</small></div>
    </div>
  `).join('');

  if (dom.metricsFoot) {
    dom.metricsFoot.innerHTML = `
      <span>${uiIcon('cloud')} 云量 <strong>${Math.round(current.clouds?.all || 0)}%</strong></span>
      <span>${uiIcon('thermometer')} 露点 <strong>${dew === null ? '--' : formatTemp(dew, state.unit)}</strong></span>
    `;
  }
}

function renderSun() {
  const current = state.weather;
  const timezone = current.timezone || 0;
  const sunrise = current.sys?.sunrise;
  const sunset = current.sys?.sunset;
  const now = Date.now() / 1000;

  if (!sunrise || !sunset) {
    dom.sunVisual.innerHTML = '<div class="empty-state">日照数据暂不可用</div>';
    dom.sunriseTime.textContent = '--';
    dom.sunsetTime.textContent = '--';
    dom.sunStatus.textContent = '--';
    dom.daylightDuration.textContent = '--';
    return;
  }

  const progress = clamp((now - sunrise) / Math.max(1, sunset - sunrise), 0, 1);
  const point = quadraticPoint(20, 125, 160, -35, 300, 125, progress);
  const dayLength = sunset - sunrise;
  const remaining = now < sunrise ? sunrise - now : sunset - now;

  dom.sunriseTime.textContent = formatLocalTime(sunrise, timezone);
  dom.sunsetTime.textContent = formatLocalTime(sunset, timezone);
  dom.daylightDuration.textContent = durationText(dayLength);
  dom.sunStatus.textContent = now < sunrise
    ? `距离日出 ${durationText(remaining)}`
    : now >= sunset
      ? '夜幕已降临'
      : `距离日落 ${durationText(remaining)}`;

  dom.sunVisual.innerHTML = `
    <svg class="sun-arc" viewBox="0 0 320 150" role="img" aria-label="太阳在天空中的运行轨迹">
      <defs>
        <linearGradient id="sunArcGrad" x1="20" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="var(--accent)"/>
          <stop offset="1" stop-color="var(--accent-2)"/>
        </linearGradient>
        <radialGradient id="sunDotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="var(--accent)" stop-opacity=".55"/>
          <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <line class="sun-horizon" x1="10" y1="125" x2="310" y2="125"/>
      <path class="sun-arc-bg" d="M20 125 Q160 -35 300 125"/>
      <path class="sun-arc-line" d="M20 125 Q160 -35 300 125" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - progress}"/>
      <circle cx="${point.x}" cy="${point.y}" r="20" fill="url(#sunDotGlow)"/>
      <circle class="sun-dot" cx="${point.x}" cy="${point.y}" r="6"/>
    </svg>
  `;
}

function quadraticPoint(x0, y0, x1, y1, x2, y2, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * x0 + 2 * inverse * t * x1 + t * t * x2,
    y: inverse * inverse * y0 + 2 * inverse * t * y1 + t * t * y2
  };
}

function normalizeAir(raw) {
  const item = raw?.list?.[0];
  if (!item) return null;
  const meta = aqiMeta(item.main?.aqi);
  return {
    aqi: Number(item.main?.aqi) || 0,
    label: meta.label,
    color: meta.color,
    advice: meta.advice,
    pm25: Number(item.components?.pm2_5) || 0,
    pm10: Number(item.components?.pm10) || 0,
    no2: Number(item.components?.no2) || 0,
    o3: Number(item.components?.o3) || 0
  };
}

function renderAqi() {
  const air = normalizeAir(state.air);
  if (!air) {
    dom.aqiBadge.textContent = '--';
    dom.aqiBadge.className = 'soft-badge';
    dom.aqiBody.innerHTML = '<div class="empty-state">空气质量数据暂不可用<span>稍后刷新再试</span></div>';
    return;
  }

  dom.aqiBadge.textContent = air.label;
  dom.aqiBadge.className = `soft-badge aqi-level-${air.aqi}`;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamp(air.aqi, 0, 5) / 5) * circumference;

  dom.aqiBody.innerHTML = `
    <div class="aqi-gauge" style="--aqi-color:${air.color};--aqi-dash:${dash};--aqi-circumference:${circumference}">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="aqi-track" cx="60" cy="60" r="${radius}"/>
        <circle class="aqi-fill" cx="60" cy="60" r="${radius}" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - dash}"/>
      </svg>
      <div class="aqi-center"><strong>${air.aqi}</strong><span>${air.label}</span></div>
    </div>
    <div class="aqi-copy">
      <div class="aqi-pm"><span>PM2.5<strong>${Math.round(air.pm25)}</strong><small>µg/m³</small></span><span>PM10<strong>${Math.round(air.pm10)}</strong><small>µg/m³</small></span></div>
      <p>${air.advice}</p>
      <small>OpenWeather 空气质量等级 · 1–5</small>
    </div>
  `;
}

function renderBriefIfReady() {
  if (!state.weather || !state.location) return;
  const context = buildAiContext();
  dom.briefContent.innerHTML = renderRichText(buildBrief(context));
  dom.briefSource.textContent = briefSourceLabel();
}

/* ── AI 上下文与对话 ─────────────────────────────────────── */

function buildAiContext() {
  const current = state.weather;
  const location = state.location;
  const air = normalizeAir(state.air);
  const timezone = current.timezone || 0;
  const now = Date.now() / 1000;
  const today = state.daily?.items?.[0];

  return {
    city: {
      name: shortCityName(location.name),
      region: location.region || '',
      country: location.country || '',
      lat: Number(location.lat.toFixed(4)),
      lon: Number(location.lon.toFixed(4))
    },
    current: {
      tempC: Math.round(current.main.temp * 10) / 10,
      feelsC: Math.round(current.main.feels_like * 10) / 10,
      desc: localizeDescription(current.weather?.[0]?.description),
      kind: weatherKind(current.weather?.[0]?.id, isNightAt(now, timezone, current.sys?.sunrise, current.sys?.sunset)),
      humidity: Math.round(current.main.humidity),
      pressure: Math.round(current.main.pressure),
      visibilityKm: Math.round(((current.visibility || 0) / 1000) * 10) / 10,
      windSpeedMs: Math.round((current.wind?.speed || 0) * 10) / 10,
      windDeg: Math.round(current.wind?.deg || 0),
      windDir: windDirection(current.wind?.deg),
      windScale: beaufort(current.wind?.speed),
      clouds: Math.round(current.clouds?.all || 0),
      precipitationMm: Math.round((current.rain?.['1h'] || current.snow?.['1h'] || 0) * 10) / 10,
      sunrise: formatLocalTime(current.sys?.sunrise, timezone),
      sunset: formatLocalTime(current.sys?.sunset, timezone),
      localTime: formatLocalTime(now, timezone),
      localDate: `${formatLocalDate(now, timezone)} ${weekday(now, timezone)}`
    },
    today: today ? {
      highC: Math.round(today.maxC),
      lowC: Math.round(today.minC),
      popMax: Number(today.pop) || 0,
      desc: today.desc
    } : null,
    air: air ? {
      aqi: air.aqi,
      label: air.label,
      pm25: Math.round(air.pm25),
      pm10: Math.round(air.pm10),
      no2: Math.round(air.no2),
      o3: Math.round(air.o3),
      advice: air.advice
    } : null,
    hourly: state.hourly.slice(0, 6).map((item) => ({
      time: item.time,
      tempC: Math.round(item.tempC),
      desc: item.desc,
      pop: Math.round(item.pop * 100) / 100,
      windSpeedMs: Math.round((item.windSpeedMs || 0) * 10) / 10
    })),
    daily: (state.daily?.items || []).map((item) => ({
      label: item.label,
      date: item.date,
      lowC: Math.round(item.minC),
      highC: Math.round(item.maxC),
      desc: item.desc,
      pop: Math.round(item.pop * 100) / 100,
      kind: item.kind
    }))
  };
}

function updateAIStatus() {
  if (!dom.aiStatus) return;
  dom.aiStatus.className = 'ai-status';
  if (aiState.status === 'checking') {
    dom.aiStatus.classList.add('is-checking');
    dom.aiStatus.innerHTML = '<i></i> 连接中';
  } else if (aiState.mode === 'proxy') {
    dom.aiStatus.classList.add('is-online');
    dom.aiStatus.innerHTML = '<i></i> DeepSeek 在线';
  } else {
    dom.aiStatus.classList.add('is-local');
    dom.aiStatus.innerHTML = '<i></i> 本地简报';
    dom.aiStatus.title = aiState.lastError || 'AI 服务暂不可用，已切换到本地智能简报';
  }
  if (dom.briefSource) dom.briefSource.textContent = briefSourceLabel();
  if (dom.sendBtn) dom.sendBtn.title = aiState.mode === 'local' ? '使用本地智能简报回答' : '发送给 DeepSeek';
}

function resetChat() {
  if (!dom.chatLog) return;
  state.aiHistory = [];
  dom.chatLog.innerHTML = '';
  const city = state.location ? shortCityName(state.location.name) : '当前城市';
  addMessage('assistant', `你好，我是**小穹**。已读取${city}的实时天气和未来 5 天预报。\n\n你可以问我穿衣、带伞、运动或出行安排。`, { animate: false });
}

function addMessage(role, content, { animate = true, meta = '' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `msg msg-${role}${animate ? ' msg-enter' : ''}`;
  if (role === 'assistant') {
    wrapper.innerHTML = `<div class="msg-body">${renderRichText(content)}</div>${meta ? `<span class="msg-meta">${escapeHtml(meta)}</span>` : ''}`;
  } else {
    wrapper.innerHTML = `<div class="msg-body">${renderRichText(content)}</div>`;
  }
  dom.chatLog.appendChild(wrapper);
  scrollChat();
  return wrapper;
}

function addTyping() {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-assistant msg-typing';
  wrapper.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-label">小穹正在分析天气</span>';
  dom.chatLog.appendChild(wrapper);
  scrollChat();
  return wrapper;
}

function scrollChat() {
  if (!dom.chatLog) return;
  window.requestAnimationFrame(() => {
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
  });
}

async function sendChat(rawQuestion) {
  const question = String(rawQuestion || '').trim();
  if (!question) return;
  if (!state.weather) {
    toast('天气数据还没加载完成，稍等一下再问。', 'info');
    return;
  }
  if (state.aiBusy) return;
  state.aiBusy = true;
  dom.chatInput.value = '';
  dom.chatInput.style.height = 'auto';
  dom.sendBtn.disabled = true;

  addMessage('user', question);
  state.aiHistory.push({ role: 'user', content: question });
  const typing = addTyping();
  const context = buildAiContext();

  try {
    const result = await askAI(question, context, state.aiHistory.slice(0, -1));
    typing.remove();
    const meta = result.mode === 'local' ? '本地智能简报 · AI 服务暂不可用' : `DeepSeek · ${result.model || 'deepseek-chat'}`;
    addMessage('assistant', result.reply, { meta });
    state.aiHistory.push({ role: 'assistant', content: result.reply });
    state.aiHistory = state.aiHistory.slice(-CONFIG.ai.maxHistory);
  } catch (error) {
    typing.remove();
    const message = error?.name === 'AbortError'
      ? '这次分析超时了，请再试一次。'
      : error?.message || 'AI 服务暂时不可用，请稍后再试。';
    addMessage('assistant', `抱歉，这次没有连接成功。\n\n${message}`, { meta: '你也可以继续使用上方本地天气简报' });
  } finally {
    state.aiBusy = false;
    dom.sendBtn.disabled = false;
    dom.chatInput.focus();
  }
}

/* ── 单位 / 收藏 / 最近搜索 ───────────────────────────────── */

function applyUnitButton() {
  if (!dom.unitToggle) return;
  dom.unitToggle.textContent = state.unit === 'F' ? '°F' : '°C';
  dom.unitToggle.setAttribute('aria-label', `切换温度单位，当前为${state.unit === 'F' ? '华氏度' : '摄氏度'}`);
}

function toggleUnit() {
  state.unit = state.unit === 'C' ? 'F' : 'C';
  safeStorageSet(STORE_UNIT, state.unit);
  applyUnitButton();
  renderAll();
  if (state.location) updateDocumentTitle(state.location);
}

function toggleFavorite() {
  if (!state.location) return;
  const key = locationKey(state.location);
  const exists = state.favorites.some((item) => locationKey(item) === key);
  if (exists) {
    state.favorites = state.favorites.filter((item) => locationKey(item) !== key);
    toast(`已取消收藏${shortCityName(state.location.name)}。`, 'info');
  } else {
    state.favorites = [
      {
        name: state.location.name,
        localName: state.location.localName,
        region: state.location.region,
        country: state.location.country,
        countryCode: state.location.countryCode,
        lat: state.location.lat,
        lon: state.location.lon
      },
      ...state.favorites
    ].slice(0, 8);
    toast(`已收藏${shortCityName(state.location.name)}。`, 'success');
  }
  writeJson(STORE_FAVORITES, state.favorites);
  updateFavoriteButton();
  if (!dom.cityInput.value.trim()) showDefaultSuggestions();
}

function updateFavoriteButton() {
  if (!dom.favoriteBtn) return;
  const active = state.location
    ? state.favorites.some((item) => locationKey(item) === locationKey(state.location))
    : false;
  dom.favoriteBtn.classList.toggle('is-active', active);
  dom.favoriteBtn.setAttribute('aria-pressed', String(active));
  dom.favoriteBtn.title = active ? '取消收藏' : '收藏城市';
}

function saveRecent(location) {
  const item = {
    name: location.name,
    localName: location.localName,
    region: location.region,
    country: location.country,
    countryCode: location.countryCode,
    lat: location.lat,
    lon: location.lon
  };
  state.recent = [
    item,
    ...state.recent.filter((existing) => locationKey(existing) !== locationKey(item))
  ].slice(0, CONFIG.app.maxRecent);
  writeJson(STORE_RECENT, state.recent);
}

/* ── 启动 ─────────────────────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
