# 天穹天气 · Skycast Weather

一个中文优先的天气仪表盘：中文城市搜索、实时天气、24 小时趋势、未来 5 天预报、空气质量，以及接入 DeepSeek 的 AI 天气助手。

[在线体验](https://www.wethdbd.top/) · [GitHub Pages](https://cochyu.github.io/Weather-Dashboard/) · [项目源码](https://github.com/cochyu/Weather-Dashboard)

![天穹天气桌面端预览](assets/img/preview-desktop.jpg)

## ✨ 功能

- **中文城市搜索**：内置 60+ 常用中文城市坐标，同时接入 OpenWeather 中文地名；输入「北京」「杭州」「伦敦」都能查。
- **实时天气**：温度、体感、天气现象、最高/最低温、湿度、风力、气压、能见度、云量、露点。
- **24 小时趋势**：按 3 小时颗粒度展示未来时段、天气图标、气温和降水概率。
- **未来 5 天**：每日天气、温度区间条、降水概率，一眼看出升降温与雨天。
- **日照轨迹**：日出日落、白昼时长、太阳当前在天空中的位置。
- **空气质量**：AQI 等级环、PM2.5 / PM10、健康建议。
- **DeepSeek 天气助手**：结合当前城市实时数据回答穿衣、带伞、运动、出行、空气质量等问题。
- **本地智能简报**：没有配置 AI 时也能生成可执行的天气建议，不会出现空白面板。
- **细节体验**：动态天气主题、响应式布局、摄氏度/华氏度切换、城市收藏、最近搜索、定位、键盘操作、减少动效支持。

## 🖥 预览

| 桌面端 | 移动端 |
| --- | --- |
| ![桌面端](assets/img/preview-desktop.jpg) | ![移动端](assets/img/preview-mobile.jpg) |

## 🧱 技术栈

- 原生 HTML / CSS / JavaScript（ES Modules，无前端框架、无构建步骤）
- [OpenWeather API](https://openweathermap.org/)：实时天气、5 天预报、空气质量、中文地名
- [Open-Meteo](https://open-meteo.com/)：OpenWeather 暂不可用时的免 Key 兜底数据源
- [DeepSeek API](https://www.deepseek.com/)：AI 天气助手
- Node.js 原生 HTTP 服务：本地开发与自托管 AI 代理
- Cloudflare Worker：生产环境 DeepSeek 安全代理（可选）
- GitHub Pages：静态站点托管

## 🔐 API Key 隔离设计

这是本项目最重要的工程约束：

| 服务 | Key 存放位置 | 是否进入前端 | 说明 |
| --- | --- | --- | --- |
| OpenWeather | `assets/js/config.js` | 是 | 免费天气 Key，浏览器直接请求天气接口 |
| DeepSeek | `.env` / Cloudflare Secret | **否** | 只由服务端代理读取，前端只请求 `/api/ai` |

- 前端没有任何 DeepSeek Key。
- `server/server.mjs` 和 `worker/worker.js` 共用 `shared/ai-core.mjs`，系统提示词、上下文格式、DeepSeek 调用和错误处理只维护一份。
- AI 接口有来源白名单、请求体校验、上下文裁剪和简单频率限制。
- 如果访客想使用自己的 DeepSeek Key，可在页面右上角「设置」中填写；Key 只保存在该浏览器的 `localStorage`，由浏览器直接请求 DeepSeek，不会上传到本仓库。
- GitHub Pages 是纯静态托管，**无法安全保存服务端 Key**。因此线上默认使用本地智能简报，部署 Worker 后才会显示「DeepSeek 在线」。

> 请不要把 `.env`、`worker/.dev.vars` 或真实 DeepSeek Key 提交到 Git。仓库已通过 `.gitignore` 排除这些文件。

## 🚀 本地运行

要求 Node.js 20+。

```bash
git clone https://github.com/cochyu/Weather-Dashboard.git
cd Weather-Dashboard
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

编辑 `.env`：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
PORT=8787
```

启动：

```bash
npm run dev
```

打开 <http://127.0.0.1:8787>。本地服务会同时托管页面和 `/api/ai`，页面会自动显示「DeepSeek 在线」。

语法检查：

```bash
npm run check
```

## ☁️ 部署到 GitHub Pages

项目没有构建步骤，直接把仓库根目录发布到 Pages 即可。

1. 将代码推送到 `main` 分支。
2. 仓库 **Settings → Pages**：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
3. 等待 Pages 构建完成，访问 <https://cochyu.github.io/Weather-Dashboard/>。
4. 仓库内的 `CNAME` 已绑定自定义域名 `www.wethdbd.top`，如不需要可删除。

## 🤖 让线上站点接入 DeepSeek（推荐）

GitHub Pages 不能运行 Node 服务，所以生产环境需要把 `worker/` 部署到 Cloudflare Workers（免费额度足够个人使用）。

```bash
# 首次使用会打开浏览器登录 Cloudflare
npx wrangler login

# 部署代理
npx wrangler deploy -c worker/wrangler.toml

# 写入服务端 Secret（不会出现在代码或前端）
npx wrangler secret put DEEPSEEK_API_KEY -c worker/wrangler.toml
```

部署完成后会得到一个类似这样的地址：

```text
https://weather-dashboard-ai.<your-subdomain>.workers.dev/api/ai
```

打开线上站点，点击右上角齿轮 → 在「DeepSeek 代理地址」中粘贴该地址 → **保存并测试**。状态变成「DeepSeek 在线」即可。

也可以把地址写进 `assets/js/config.js` 的 `ai.proxyUrl`，这样所有访客都会使用同一个代理：

```js
ai: {
  proxyUrl: 'https://weather-dashboard-ai.xxx.workers.dev/api/ai',
  model: 'deepseek-chat',
  allowByok: true,
  maxHistory: 8
}
```

Worker 的允许来源在 `worker/wrangler.toml` 的 `ALLOWED_ORIGINS` 中配置，默认已包含：

- `https://cochyu.github.io`
- `https://www.wethdbd.top`
- `https://wethdbd.top`
- 本地 `localhost:8787` / `127.0.0.1:8787`

## 🩺 数据源兜底

OpenWeather 的免费 Key 有时会遇到 401（新 Key 未激活）或临时不可达。本项目在 `assets/js/api.js` 中做了两层处理：

1. 优先请求 OpenWeather，保留完整的中文天气描述、空气质量和 5 天预报。
2. 如果当前天气请求失败，自动切换到 Open-Meteo（免 Key），把返回数据归一化成 OpenWeather 的数据结构；页面底部会显示「Open-Meteo 备用源」。
3. 中文城市搜索在 OpenWeather 地理编码失败时，也会回退到 Open-Meteo Geocoding。

要更换 OpenWeather Key，只改 `assets/js/config.js` 中的 `openWeather.apiKey` 即可；也可以把旧 Key 放进 `fallbackKeys` 数组作为备用。

## 📁 项目结构

```text
Weather-Dashboard/
├─ index.html                 # 页面骨架
├─ assets/
│  ├─ css/style.css           # 视觉系统、响应式、动效
│  ├─ js/
│  │  ├─ app.js               # 页面状态与交互
│  │  ├─ api.js               # OpenWeather / Open-Meteo 数据层
│  │  ├─ ai.js                # AI 对话、设置、本地智能简报
│  │  ├─ cities.js            # 中文城市库与搜索结果整理
│  │  ├─ icons.js             # 内联 SVG 天气图标与 UI 图标
│  │  ├─ config.js            # 公开前端配置（只放 OpenWeather Key）
│  │  └─ utils.js             # 时间、温度、风、AQI、文本渲染工具
│  └─ img/                    # README 预览图
├─ server/server.mjs          # 本地开发 / 自托管服务器 + AI 代理
├─ shared/ai-core.mjs         # Node 与 Worker 共用的 DeepSeek 逻辑
├─ worker/                    # Cloudflare Worker 生产代理
├─ .env.example               # 服务端环境变量模板
├─ CNAME                      # GitHub Pages 自定义域名
└─ package.json
```

## 🧠 AI 助手如何工作

1. 页面把当前城市、实时天气、未来时段、5 天预报、空气质量整理成精简的 JSON 上下文。
2. 请求同源 `/api/ai`（本地 Node）或已配置的 Worker 地址。
3. 服务端把上下文转成中文提示词，调用 DeepSeek `deepseek-chat`，返回纯文本。
4. 前端用安全的轻量 Markdown 渲染器展示回复，不直接插入未转义的 HTML。
5. 没有 AI 服务时，前端使用同一份天气上下文生成规则化简报，保证页面始终可用。

## 📌 说明

- 天气数据来自 OpenWeather，备用数据来自 Open-Meteo；AI 内容由 DeepSeek 生成，仅供参考。
- 页面不包含广告、追踪脚本或第三方统计。
- 如果遇到 Key 失效，请先在 OpenWeather 控制台确认 Key 已激活、未受限；再检查 `assets/js/config.js`。
- 建议定期轮换 API Key，尤其是曾经在聊天、截图或日志中出现过的 Key。

## License

MIT
