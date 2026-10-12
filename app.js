// ⚠️ 部署 Worker 后，把这里替换成你的 Cloudflare Worker 地址
const API_BASE = "https://your-worker-name.your-subdomain.workers.dev";

const $ = (id) => document.getElementById(id);

const cityInput = $("cityInput");
const searchBtn = $("searchBtn");
const suggestionsEl = $("suggestions");
const statusEl = $("status");
const weatherCard = $("weatherCard");

// ========== 工具函数 ==========
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.remove("hidden");
  statusEl.classList.toggle("error", isError);
}

function hideStatus() {
  statusEl.classList.add("hidden");
}

function clearSuggestions() {
  suggestionsEl.innerHTML = "";
  suggestionsEl.classList.add("hidden");
}

// ========== API 调用（都走自己的 Worker 代理）==========
async function fetchGeo(query) {
  const res = await fetch(
    `${API_BASE}/api/geo?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error("地理编码请求失败");
  return res.json();
}

async function fetchWeather(lat, lon) {
  const res = await fetch(
    `${API_BASE}/api/weather?lat=${lat}&lon=${lon}`
  );
  if (!res.ok) throw new Error("天气查询失败");
  return res.json();
}

// ========== 渲染天气卡片 ==========
function renderWeather(data, location) {
  const name = [location.local_names?.zh || location.name, location.country]
    .filter(Boolean)
    .join(" · ");

  $("cityName").textContent = name;
  $("weatherDesc").textContent = data.weather[0].description;
  $("temp").textContent = `${Math.round(data.main.temp)}°C`;
  $("feelsLike").textContent = `${Math.round(data.main.feels_like)}°C`;
  $("humidity").textContent = `${data.main.humidity}%`;
  $("windSpeed").textContent = `${data.wind.speed} m/s`;
  $("pressure").textContent = `${data.main.pressure} hPa`;

  $("weatherIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  $("weatherIcon").alt = data.weather[0].description;

  weatherCard.classList.remove("hidden");
}

// ========== 主搜索流程 ==========
async function doSearch() {
  const query = cityInput.value.trim();
  if (!query) return;

  clearSuggestions();
  weatherCard.classList.add("hidden");
  showStatus("查询中…");
  searchBtn.disabled = true;

  try {
    // 1. 中文城市名 → 经纬度
    const locations = await fetchGeo(query);

    if (!locations || locations.length === 0) {
      showStatus("未找到该城市，请换个名称试试（如：北京,CN）", true);
      return;
    }

    // 2. 只有一个结果，直接查天气
    if (locations.length === 1) {
      await loadWeather(locations[0]);
      return;
    }

    // 3. 多个结果，让用户选
    hideStatus();
    suggestionsEl.classList.remove("hidden");
    locations.forEach((loc) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      const zhName = loc.local_names?.zh || loc.name;
      item.innerHTML = `${zhName}<span class="country">${loc.state ? loc.state + ", " : ""}${loc.country}</span>`;
      item.addEventListener("click", async () => {
        clearSuggestions();
        showStatus("查询中…");
        await loadWeather(loc);
      });
      suggestionsEl.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    showStatus("查询失败，请稍后重试", true);
  } finally {
    searchBtn.disabled = false;
  }
}

async function loadWeather(location) {
  try {
    const data = await fetchWeather(location.lat, location.lon);
    hideStatus();
    renderWeather(data, location);
  } catch (err) {
    console.error(err);
    showStatus("天气查询失败，请稍后重试", true);
  }
}

// ========== 事件绑定 ==========
searchBtn.addEventListener("click", doSearch);
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});
