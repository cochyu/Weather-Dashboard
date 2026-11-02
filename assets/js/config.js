/**
 * 天穹天气 · 前端公开配置
 *
 * 安全约定：
 * 1. OpenWeather Key 是免费天气 Key，供浏览器直连天气接口使用；
 * 2. DeepSeek Key 永远不要写在这里。它只应存在于 server/.env、
 *    Cloudflare Worker Secret 或用户自己浏览器的「本机 Key」设置中。
 */
export const CONFIG = Object.freeze({
  openWeather: {
    // 若你更换了 OpenWeather Key，只需替换这一行。
    apiKey: '57161eadf26deecd5ff64107ed3fb0a0',
    // 可追加备用 Key；遇到 401 时会自动尝试下一个。
    fallbackKeys: [],
    baseUrl: 'https://api.openweathermap.org',
    lang: 'zh_cn',
    units: 'metric'
  },

  ai: {
    /**
     * 推荐：部署 worker/ 后填入你的 Cloudflare Worker 地址，
     * 例如 https://weather-dashboard-ai.example.workers.dev/api/ai
     * 留空时，本地开发会自动连接同源 /api/ai；线上则使用本地智能简报。
     */
    proxyUrl: '',
    model: 'deepseek-chat',
    // 允许用户在浏览器里临时填写自己的 DeepSeek Key（仅保存在本机）。
    allowByok: true,
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
