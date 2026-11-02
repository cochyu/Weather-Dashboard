/**
 * 天穹天气 · 前端公开配置
 *
 * 安全约定：
 * 1. 前端不保存 OpenWeather 或 DeepSeek 的任何 Key；
 * 2. 天气和 AI 都通过 Cloudflare Worker 代理；
 * 3. 自定义域名优先，workers.dev 仅作为备用。
 */
export const CONFIG = Object.freeze({
  weather: {
    // 浏览器只访问 Cloudflare，Worker 再访问 OpenWeather。
    apiBase: 'https://api.wethdbd.top',
    fallbackBase: 'https://weather-dashboard-ai.quixblazevow.workers.dev',
    lang: 'zh_cn',
    units: 'metric'
  },

  ai: {
    proxyUrl: 'https://api.wethdbd.top/api/ai',
    fallbackProxyUrl: 'https://weather-dashboard-ai.quixblazevow.workers.dev/api/ai',
    model: 'deepseek-chat',
    maxHistory: 8
  },

  app: {
    name: '天穹天气',
    edition: 'SKYCAST',
    version: '2.0.0',
    repoUrl: 'https://github.com/cochyu/Weather-Dashboard',
    defaultCity: {
      name: '北京',
      region: '北京市',
      country: '中国',
      countryCode: 'CN',
      lat: 39.9042,
      lon: 116.4074
    },
    hotCities: ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安'],
    maxRecent: 6
  }
});
