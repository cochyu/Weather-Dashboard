/* 天穹天气 · DeepSeek 天气助手（Cloudflare Worker 代理 + 本地简报兜底） */

import { CONFIG } from './config.js';
import { aqiMeta, formatTemp } from './utils.js';

export const aiState = {
  mode: 'local', // proxy | local
  status: 'idle', // idle | checking | online | local
  proxyUrl: '',
  healthUrl: '',
  model: CONFIG.ai.model,
  message: '',
  lastError: null
};

function trimSlash(value = '') {
  return String(value).trim().replace(/\/+$/, '');
}

export function deriveHealthUrl(proxyUrl) {
  if (!proxyUrl) return '';
  try {
    const url = new URL(proxyUrl, window.location.href);
    if (url.pathname.endsWith('/api/ai')) {
      url.pathname = url.pathname.replace(/\/api\/ai$/, '/api/health');
    } else if (url.pathname.endsWith('/ai')) {
      url.pathname = url.pathname.replace(/\/ai$/, '/health');
    } else if (url.pathname.endsWith('/')) {
      url.pathname += 'health';
    } else {
      url.pathname += '/health';
    }
    url.search = '';
    return url.toString();
  } catch {
    return '';
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeProxy(proxyUrl, timeoutMs = 6000) {
  const healthUrl = deriveHealthUrl(proxyUrl);
  if (!healthUrl) return { ok: false, configured: false, message: '服务地址格式不正确' };
  try {
    const response = await fetchWithTimeout(healthUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    }, timeoutMs);
    if (!response.ok) {
      return {
        ok: false,
        configured: false,
        status: response.status,
        message: response.status === 404 ? '该地址没有 AI 服务' : `服务返回 ${response.status}`
      };
    }
    const data = await response.json().catch(() => ({}));
    return {
      ok: true,
      configured: Boolean(data.configured),
      model: data.model || CONFIG.ai.model,
      message: data.configured ? 'DeepSeek 已连接' : '代理在线，但未配置 DeepSeek Key'
    };
  } catch (error) {
    return {
      ok: false,
      configured: false,
      message: error?.name === 'AbortError' ? '连接超时' : '无法连接该地址'
    };
  }
}

export async function initAI({ force = false } = {}) {
  if (aiState.status === 'checking' && !force) return aiState;
  aiState.status = 'checking';
  aiState.lastError = null;

  // 清理旧版本可能保存在浏览器里的 AI 代理/Key 配置。
  try {
    localStorage.removeItem('wd_ai_key');
    localStorage.removeItem('wd_ai_proxy');
  } catch {
    /* 隐私模式下忽略 */
  }

  const proxyUrl = trimSlash(CONFIG.ai.proxyUrl);
  aiState.proxyUrl = proxyUrl;
  aiState.healthUrl = deriveHealthUrl(proxyUrl);

  if (proxyUrl) {
    const result = await probeProxy(proxyUrl);
    if (result.ok && result.configured) {
      aiState.mode = 'proxy';
      aiState.status = 'online';
      aiState.model = result.model || CONFIG.ai.model;
      aiState.message = 'DeepSeek 在线';
      return aiState;
    }
    aiState.lastError = result.message;
  }

  aiState.mode = 'local';
  aiState.status = 'local';
  aiState.message = '本地简报';
  return aiState;
}

async function askProxy(question, context, history) {
  const response = await fetchWithTimeout(aiState.proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        ...(history || []).slice(-CONFIG.ai.maxHistory),
        { role: 'user', content: question }
      ],
      context
    })
  }, 50000);

  if (!response.ok) {
    let message = '';
    try {
      const payload = await response.json();
      message = payload?.error || payload?.message || '';
    } catch {
      /* ignore */
    }
    throw new Error(message || `AI 服务返回 ${response.status}`);
  }

  const data = await response.json();
  if (!data?.reply) throw new Error('AI 服务没有返回内容');
  return { reply: String(data.reply), mode: 'proxy', model: data.model || CONFIG.ai.model };
}

export async function askAI(question, context, history = []) {
  if (aiState.mode === 'proxy' && aiState.proxyUrl) {
    return askProxy(question, context, history);
  }
  await new Promise((resolve) => setTimeout(resolve, 420));
  return { reply: localAnswer(question, context), mode: 'local', model: 'local-briefing' };
}

/* ── 本地智能简报 ─────────────────────────────────────────── */

function temp(celsius) {
  return formatTemp(celsius, 'C');
}

function rangeText(low, high) {
  return `${temp(low)} ~ ${temp(high)}`;
}

function popText(pop) {
  return `${Math.round((Number(pop) || 0) * 100)}%`;
}

function maxHourlyPop(context) {
  return Math.max(0, ...(context.hourly || []).map((item) => Number(item.pop) || 0));
}

function clothingAdvice(context) {
  const feels = Number(context.current?.feelsC);
  const low = Number(context.today?.lowC);
  const high = Number(context.today?.highC);
  const spread = Number.isFinite(high) && Number.isFinite(low) ? high - low : 0;
  let base;
  if (feels >= 31) base = '短袖、短裤或轻薄裙装，注意防晒和补水';
  else if (feels >= 25) base = '短袖或薄衬衫，室内空调房可备一件薄外套';
  else if (feels >= 19) base = '长袖 T 恤、薄衬衫，早晚可加一件轻薄外套';
  else if (feels >= 13) base = '夹克、风衣或薄毛衣，适合叠穿';
  else if (feels >= 6) base = '厚外套、大衣或薄羽绒，注意保暖';
  else if (feels >= 0) base = '羽绒服或厚棉服，围巾和手套可以安排上';
  else base = '厚羽绒服、帽子、围巾和手套，尽量减少长时间户外停留';
  if (spread >= 9) base += `；今天温差约 ${Math.round(spread)}°C，建议分层穿搭`;
  return base;
}

function umbrellaAdvice(context) {
  const pop = Math.max(maxHourlyPop(context), Number(context.today?.popMax) || 0);
  const kind = context.current?.kind || '';
  const rainy = ['rain', 'storm', 'snow'].includes(kind);
  if (rainy || pop >= 0.6) {
    return {
      need: true,
      text: `需要带伞。未来时段降水概率最高约 ${popText(pop)}，遇到阵雨时路面湿滑，通勤多留 5-10 分钟。`
    };
  }
  if (pop >= 0.35) {
    return {
      need: 'maybe',
      text: `可以带一把折叠伞。降水概率约 ${popText(pop)}，不算高，但有备无患。`
    };
  }
  return {
    need: false,
    text: `大概率不用带伞。未来时段降水概率约 ${popText(pop)}，以${context.current?.desc || '当前天气'}为主。`
  };
}

function activityAdvice(context) {
  const aqi = Number(context.air?.aqi || 0);
  const wind = Number(context.current?.windSpeedMs || 0);
  const kind = context.current?.kind || '';
  if (['storm', 'rain', 'snow'].includes(kind)) {
    return '建议改为室内运动。当前有降水，路面湿滑，跑步和骑行体验较差。';
  }
  if (aqi >= 4) {
    return `空气质量为${aqiMeta(aqi).label}，建议减少户外运动，改为室内轻量训练。`;
  }
  if (wind >= 9) {
    return `风速约 ${wind.toFixed(1)} m/s，风感明显，骑行和羽毛球等户外项目要谨慎。`;
  }
  if (aqi === 3) {
    return '空气质量轻度污染，敏感人群建议降低运动强度，普通人可选择短时户外活动。';
  }
  return '天气条件适合户外活动。建议先做 5-10 分钟热身，运动后及时补水。';
}

function airAdvice(context) {
  if (!context.air) return '空气质量数据暂时不可用，出门前可以再查看一次。';
  const meta = aqiMeta(context.air.aqi);
  return `空气质量${meta.label}，AQI 等级 ${context.air.aqi}/5，PM2.5 约 ${Math.round(context.air.pm25 ?? 0)} µg/m³。${meta.advice}`;
}

function forecastLine(context) {
  const daily = context.daily || [];
  const tomorrow = daily[1];
  const dayAfter = daily[2];
  if (!tomorrow) return '未来几天的预报数据还在路上。';
  let text = `明天${tomorrow.label === '明天' ? '' : tomorrow.label}${tomorrow.desc}，${rangeText(tomorrow.lowC, tomorrow.highC)}，降水概率 ${popText(tomorrow.pop)}`;
  if (dayAfter) {
    text += `；后天${dayAfter.desc}，${rangeText(dayAfter.lowC, dayAfter.highC)}。`;
  } else {
    text += '。';
  }
  return text;
}

function currentSummary(context) {
  const c = context.current || {};
  return `${context.city?.name || '当前城市'}现在${c.desc || '天气未知'}，${temp(c.tempC)}，体感${temp(c.feelsC)}。今天${rangeText(context.today?.lowC, context.today?.highC)}，湿度 ${Math.round(c.humidity || 0)}%，${c.windDir || '风向未知'} ${Math.round(c.windScale || 0)} 级。`;
}

export function buildBrief(context) {
  const umbrella = umbrellaAdvice(context);
  const lines = [
    `**${context.city?.name || '当前城市'}** ${currentSummary(context).replace(`${context.city?.name || '当前城市'}现在`, '现在')}`,
    `- **穿衣**：${clothingAdvice(context)}。`,
    `- **带伞**：${umbrella.text}`,
    `- **空气**：${airAdvice(context)}`
  ];
  return lines.join('\n');
}

export function localAnswer(question, context) {
  const q = String(question || '');
  const umbrella = umbrellaAdvice(context);
  const intro = `${context.city?.name || '这里'}现在${context.current?.desc || '天气未知'}，${temp(context.current?.tempC)}，体感${temp(context.current?.feelsC)}。`;

  if (/穿|衣|冷|热|外套|羽绒|短袖|温度/.test(q)) {
    return `${intro}\n\n**穿衣建议**\n- ${clothingAdvice(context)}。\n- 今天${rangeText(context.today?.lowC, context.today?.highC)}，${umbrella.need === true ? '同时记得带伞。' : '按体感调整即可。'}`;
  }

  if (/伞|雨|降水|下不下|淋/.test(q)) {
    return `${intro}\n\n**带伞判断**\n- ${umbrella.text}\n- 未来几小时降水概率最高约 ${popText(maxHourlyPop(context))}，出门前可以再看一眼雷达图。`;
  }

  if (/跑|运动|骑行|户外|散步|露营|爬山/.test(q)) {
    return `${intro}\n\n**运动建议**\n- ${activityAdvice(context)}\n- 当前${context.current?.windDir || '风向未知'} ${Math.round(context.current?.windScale || 0)} 级，能见度约 ${Number(context.current?.visibilityKm || 0).toFixed(1)} km。`;
  }

  if (/空气|雾霾|pm|过敏|污染|aqi/i.test(q)) {
    return `${intro}\n\n**空气质量**\n- ${airAdvice(context)}\n- 如果嗓子不舒服，减少高强度户外活动，回家后及时清洁面部。`;
  }

  if (/明天|后天|未来|周末|几天|预报/.test(q)) {
    return `${intro}\n\n**未来预报**\n- ${forecastLine(context)}\n- 预报会随时间调整，临出门前建议再刷新一次。`;
  }

  if (/风|台风|大风/.test(q)) {
    return `${intro}\n\n**风力情况**\n- 当前${context.current?.windDir || '风向未知'}，约 ${Math.round(context.current?.windScale || 0)} 级（${Number(context.current?.windSpeedMs || 0).toFixed(1)} m/s）。\n- ${Number(context.current?.windSpeedMs || 0) >= 8 ? '风感明显，骑车和撑伞都要注意安全。' : '风力总体温和，正常出行影响不大。'}`;
  }

  return `${intro}\n\n**今天的重点**\n- **穿衣**：${clothingAdvice(context)}。\n- **带伞**：${umbrella.text}\n- **空气**：${airAdvice(context)}\n- **运动**：${activityAdvice(context)}\n\n${forecastLine(context)}`;
}

export function briefSourceLabel() {
  // 今日简报始终由本地规则生成，避免把模板内容误称为 AI 解读。
  return '本地智能';
}
