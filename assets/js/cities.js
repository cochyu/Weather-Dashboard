/* 天穹天气 · 中文城市库与搜索结果整理 */

import { CONFIG } from './config.js';
import {
  countryFlag,
  countryName,
  distanceKm,
  normalizeText,
  regionName
} from './utils.js';

/**
 * 常用中文城市坐标库。
 * 作用：即使 OpenWeather 的中文地名匹配不稳定，也能保证中文搜索可用；
 * 同时为「热门城市」「最近搜索」提供稳定的中文显示。
 */
export const CITY_PRESETS = [
  { name: '北京', en: 'Beijing', region: '北京市', country: '中国', countryCode: 'CN', lat: 39.9042, lon: 116.4074, aliases: ['北京市', 'beijing', '帝都'] },
  { name: '上海', en: 'Shanghai', region: '上海市', country: '中国', countryCode: 'CN', lat: 31.2304, lon: 121.4737, aliases: ['上海市', 'shanghai', '魔都'] },
  { name: '广州', en: 'Guangzhou', region: '广东省', country: '中国', countryCode: 'CN', lat: 23.1291, lon: 113.2644, aliases: ['广州市', 'guangzhou', '羊城'] },
  { name: '深圳', en: 'Shenzhen', region: '广东省', country: '中国', countryCode: 'CN', lat: 22.5431, lon: 114.0579, aliases: ['深圳市', 'shenzhen'] },
  { name: '杭州', en: 'Hangzhou', region: '浙江省', country: '中国', countryCode: 'CN', lat: 30.2741, lon: 120.1551, aliases: ['杭州市', 'hangzhou'] },
  { name: '成都', en: 'Chengdu', region: '四川省', country: '中国', countryCode: 'CN', lat: 30.5728, lon: 104.0668, aliases: ['成都市', 'chengdu'] },
  { name: '重庆', en: 'Chongqing', region: '重庆市', country: '中国', countryCode: 'CN', lat: 29.5630, lon: 106.5516, aliases: ['重庆市', 'chongqing', '山城'] },
  { name: '武汉', en: 'Wuhan', region: '湖北省', country: '中国', countryCode: 'CN', lat: 30.5928, lon: 114.3055, aliases: ['武汉市', 'wuhan'] },
  { name: '西安', en: 'Xi’an', region: '陕西省', country: '中国', countryCode: 'CN', lat: 34.3416, lon: 108.9398, aliases: ['西安市', 'xian', "xi'an", '长安'] },
  { name: '南京', en: 'Nanjing', region: '江苏省', country: '中国', countryCode: 'CN', lat: 32.0603, lon: 118.7969, aliases: ['南京市', 'nanjing', '金陵'] },
  { name: '苏州', en: 'Suzhou', region: '江苏省', country: '中国', countryCode: 'CN', lat: 31.2989, lon: 120.5853, aliases: ['苏州市', 'suzhou'] },
  { name: '天津', en: 'Tianjin', region: '天津市', country: '中国', countryCode: 'CN', lat: 39.0842, lon: 117.2009, aliases: ['天津市', 'tianjin'] },
  { name: '长沙', en: 'Changsha', region: '湖南省', country: '中国', countryCode: 'CN', lat: 28.2282, lon: 112.9388, aliases: ['长沙市', 'changsha'] },
  { name: '郑州', en: 'Zhengzhou', region: '河南省', country: '中国', countryCode: 'CN', lat: 34.7466, lon: 113.6254, aliases: ['郑州市', 'zhengzhou'] },
  { name: '青岛', en: 'Qingdao', region: '山东省', country: '中国', countryCode: 'CN', lat: 36.0671, lon: 120.3826, aliases: ['青岛市', 'qingdao'] },
  { name: '厦门', en: 'Xiamen', region: '福建省', country: '中国', countryCode: 'CN', lat: 24.4798, lon: 118.0894, aliases: ['厦门市', 'xiamen'] },
  { name: '福州', en: 'Fuzhou', region: '福建省', country: '中国', countryCode: 'CN', lat: 26.0745, lon: 119.2965, aliases: ['福州市', 'fuzhou'] },
  { name: '济南', en: 'Jinan', region: '山东省', country: '中国', countryCode: 'CN', lat: 36.6512, lon: 117.1201, aliases: ['济南市', 'jinan'] },
  { name: '合肥', en: 'Hefei', region: '安徽省', country: '中国', countryCode: 'CN', lat: 31.8206, lon: 117.2272, aliases: ['合肥市', 'hefei'] },
  { name: '昆明', en: 'Kunming', region: '云南省', country: '中国', countryCode: 'CN', lat: 25.0389, lon: 102.7183, aliases: ['昆明市', 'kunming', '春城'] },
  { name: '南宁', en: 'Nanning', region: '广西壮族自治区', country: '中国', countryCode: 'CN', lat: 22.8170, lon: 108.3665, aliases: ['南宁市', 'nanning'] },
  { name: '海口', en: 'Haikou', region: '海南省', country: '中国', countryCode: 'CN', lat: 20.0440, lon: 110.1999, aliases: ['海口市', 'haikou'] },
  { name: '三亚', en: 'Sanya', region: '海南省', country: '中国', countryCode: 'CN', lat: 18.2528, lon: 109.5119, aliases: ['三亚市', 'sanya'] },
  { name: '贵阳', en: 'Guiyang', region: '贵州省', country: '中国', countryCode: 'CN', lat: 26.6470, lon: 106.6302, aliases: ['贵阳市', 'guiyang'] },
  { name: '太原', en: 'Taiyuan', region: '山西省', country: '中国', countryCode: 'CN', lat: 37.8706, lon: 112.5489, aliases: ['太原市', 'taiyuan'] },
  { name: '石家庄', en: 'Shijiazhuang', region: '河北省', country: '中国', countryCode: 'CN', lat: 38.0428, lon: 114.5149, aliases: ['石家庄市', 'shijiazhuang'] },
  { name: '沈阳', en: 'Shenyang', region: '辽宁省', country: '中国', countryCode: 'CN', lat: 41.8057, lon: 123.4315, aliases: ['沈阳市', 'shenyang'] },
  { name: '大连', en: 'Dalian', region: '辽宁省', country: '中国', countryCode: 'CN', lat: 38.9140, lon: 121.6147, aliases: ['大连市', 'dalian'] },
  { name: '长春', en: 'Changchun', region: '吉林省', country: '中国', countryCode: 'CN', lat: 43.8171, lon: 125.3235, aliases: ['长春市', 'changchun'] },
  { name: '哈尔滨', en: 'Harbin', region: '黑龙江省', country: '中国', countryCode: 'CN', lat: 45.8038, lon: 126.5350, aliases: ['哈尔滨市', 'harbin', '冰城'] },
  { name: '呼和浩特', en: 'Hohhot', region: '内蒙古自治区', country: '中国', countryCode: 'CN', lat: 40.8426, lon: 111.7492, aliases: ['呼和浩特市', 'hohhot'] },
  { name: '乌鲁木齐', en: 'Urumqi', region: '新疆维吾尔自治区', country: '中国', countryCode: 'CN', lat: 43.8256, lon: 87.6168, aliases: ['乌鲁木齐市', 'urumqi'] },
  { name: '拉萨', en: 'Lhasa', region: '西藏自治区', country: '中国', countryCode: 'CN', lat: 29.6520, lon: 91.1721, aliases: ['拉萨市', 'lhasa'] },
  { name: '西宁', en: 'Xining', region: '青海省', country: '中国', countryCode: 'CN', lat: 36.6171, lon: 101.7782, aliases: ['西宁市', 'xining'] },
  { name: '兰州', en: 'Lanzhou', region: '甘肃省', country: '中国', countryCode: 'CN', lat: 36.0611, lon: 103.8343, aliases: ['兰州市', 'lanzhou'] },
  { name: '银川', en: 'Yinchuan', region: '宁夏回族自治区', country: '中国', countryCode: 'CN', lat: 38.4872, lon: 106.2309, aliases: ['银川市', 'yinchuan'] },
  { name: '南昌', en: 'Nanchang', region: '江西省', country: '中国', countryCode: 'CN', lat: 28.6820, lon: 115.8579, aliases: ['南昌市', 'nanchang'] },
  { name: '宁波', en: 'Ningbo', region: '浙江省', country: '中国', countryCode: 'CN', lat: 29.8683, lon: 121.5440, aliases: ['宁波市', 'ningbo'] },
  { name: '无锡', en: 'Wuxi', region: '江苏省', country: '中国', countryCode: 'CN', lat: 31.4912, lon: 120.3119, aliases: ['无锡市', 'wuxi'] },
  { name: '珠海', en: 'Zhuhai', region: '广东省', country: '中国', countryCode: 'CN', lat: 22.2707, lon: 113.5767, aliases: ['珠海市', 'zhuhai'] },
  { name: '佛山', en: 'Foshan', region: '广东省', country: '中国', countryCode: 'CN', lat: 23.0215, lon: 113.1214, aliases: ['佛山市', 'foshan'] },
  { name: '东莞', en: 'Dongguan', region: '广东省', country: '中国', countryCode: 'CN', lat: 23.0207, lon: 113.7518, aliases: ['东莞市', 'dongguan'] },
  { name: '香港', en: 'Hong Kong', region: '香港特别行政区', country: '中国', countryCode: 'HK', lat: 22.3193, lon: 114.1694, aliases: ['香港特别行政区', 'hongkong', 'hong kong'] },
  { name: '澳门', en: 'Macau', region: '澳门特别行政区', country: '中国', countryCode: 'MO', lat: 22.1987, lon: 113.5439, aliases: ['澳门特别行政区', 'macau', 'macao'] },
  { name: '台北', en: 'Taipei', region: '台湾省', country: '中国', countryCode: 'TW', lat: 25.0330, lon: 121.5654, aliases: ['台北市', 'taipei'] },
  { name: '高雄', en: 'Kaohsiung', region: '台湾省', country: '中国', countryCode: 'TW', lat: 22.6273, lon: 120.3014, aliases: ['高雄市', 'kaohsiung'] },
  { name: '丽江', en: 'Lijiang', region: '云南省', country: '中国', countryCode: 'CN', lat: 26.8721, lon: 100.2299, aliases: ['丽江市', 'lijiang'] },
  { name: '桂林', en: 'Guilin', region: '广西壮族自治区', country: '中国', countryCode: 'CN', lat: 25.2736, lon: 110.2900, aliases: ['桂林市', 'guilin'] },
  { name: '敦煌', en: 'Dunhuang', region: '甘肃省', country: '中国', countryCode: 'CN', lat: 40.1421, lon: 94.6619, aliases: ['敦煌市', 'dunhuang'] },
  { name: '喀什', en: 'Kashgar', region: '新疆维吾尔自治区', country: '中国', countryCode: 'CN', lat: 39.4704, lon: 75.9898, aliases: ['喀什市', 'kashgar'] },
  { name: '秦皇岛', en: 'Qinhuangdao', region: '河北省', country: '中国', countryCode: 'CN', lat: 39.9354, lon: 119.6005, aliases: ['秦皇岛市', 'qinhuangdao'] },
  { name: '烟台', en: 'Yantai', region: '山东省', country: '中国', countryCode: 'CN', lat: 37.4638, lon: 121.4479, aliases: ['烟台市', 'yantai'] },
  { name: '威海', en: 'Weihai', region: '山东省', country: '中国', countryCode: 'CN', lat: 37.5131, lon: 122.1204, aliases: ['威海市', 'weihai'] },
  { name: '常州', en: 'Changzhou', region: '江苏省', country: '中国', countryCode: 'CN', lat: 31.8107, lon: 119.9741, aliases: ['常州市', 'changzhou'] },
  { name: '温州', en: 'Wenzhou', region: '浙江省', country: '中国', countryCode: 'CN', lat: 27.9938, lon: 120.6994, aliases: ['温州市', 'wenzhou'] },
  { name: '绍兴', en: 'Shaoxing', region: '浙江省', country: '中国', countryCode: 'CN', lat: 30.0303, lon: 120.5802, aliases: ['绍兴市', 'shaoxing'] },
  { name: '嘉兴', en: 'Jiaxing', region: '浙江省', country: '中国', countryCode: 'CN', lat: 30.7461, lon: 120.7555, aliases: ['嘉兴市', 'jiaxing'] },
  { name: '泉州', en: 'Quanzhou', region: '福建省', country: '中国', countryCode: 'CN', lat: 24.8741, lon: 118.6757, aliases: ['泉州市', 'quanzhou'] },
  { name: '汕头', en: 'Shantou', region: '广东省', country: '中国', countryCode: 'CN', lat: 23.3541, lon: 116.6819, aliases: ['汕头市', 'shantou'] },
  { name: '湛江', en: 'Zhanjiang', region: '广东省', country: '中国', countryCode: 'CN', lat: 21.2707, lon: 110.3594, aliases: ['湛江市', 'zhanjiang'] }
];

export const HOT_CITY_NAMES = CONFIG.app.hotCities;

function scorePreset(city, query) {
  const q = normalizeText(query);
  const name = normalizeText(city.name);
  const aliases = [city.en, ...(city.aliases || [])].map(normalizeText);
  if (name === q || aliases.includes(q)) return 100;
  if (name.startsWith(q) || aliases.some((alias) => alias.startsWith(q))) return 80;
  if (name.includes(q) || aliases.some((alias) => alias.includes(q))) return 50;
  return 0;
}

export function searchPresets(query, limit = 6) {
  const q = String(query || '').trim();
  if (!q) return [];
  return CITY_PRESETS
    .map((city) => ({ city, score: scorePreset(city, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.city);
}

export function findExactPreset(query) {
  const q = normalizeText(query);
  if (!q) return null;
  return CITY_PRESETS.find((city) => {
    const candidates = [city.name, city.en, ...(city.aliases || [])].map(normalizeText);
    return candidates.includes(q);
  }) || null;
}

export function presetToLocation(city) {
  return {
    id: `preset-${city.lat.toFixed(3)}-${city.lon.toFixed(3)}`,
    name: city.name,
    localName: city.name,
    region: city.region,
    country: city.country,
    countryCode: city.countryCode,
    lat: city.lat,
    lon: city.lon,
    source: 'preset'
  };
}

export function geocodeToLocation(result, query = '') {
  const code = String(result.country || '').toUpperCase();
  const local = result.local_names || {};
  const name = local.zh
    || local['zh-Hans']
    || local.zh_Hans
    || result.name
    || query;
  const region = regionName(result.state || '', code);
  return {
    id: `geo-${Number(result.lat).toFixed(3)}-${Number(result.lon).toFixed(3)}`,
    name,
    localName: name,
    englishName: result.name || '',
    region,
    country: countryName(code),
    countryCode: code,
    lat: Number(result.lat),
    lon: Number(result.lon),
    source: 'geocode'
  };
}

export function searchResultMeta(location) {
  return [location.region, location.country]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(' · ');
}

export function locationKey(location) {
  if (!location) return '';
  return `${Number(location.lat).toFixed(2)},${Number(location.lon).toFixed(2)}`;
}

export function mergeLocations(presets, geocodes) {
  const merged = [];
  for (const location of [...presets, ...geocodes]) {
    const duplicate = merged.some((existing) => (
      distanceKm(existing, location) < 28
      && (normalizeText(existing.name).includes(normalizeText(location.name))
        || normalizeText(location.name).includes(normalizeText(existing.name)))
    ));
    if (!duplicate) merged.push(location);
  }
  return merged.slice(0, 8);
}

export function locationFromStored(value) {
  if (!value || !Number.isFinite(Number(value.lat)) || !Number.isFinite(Number(value.lon))) return null;
  return {
    id: value.id || locationKey(value),
    name: value.name || '未知城市',
    localName: value.localName || value.name || '未知城市',
    region: value.region || '',
    country: value.country || countryName(value.countryCode),
    countryCode: value.countryCode || '',
    lat: Number(value.lat),
    lon: Number(value.lon),
    source: value.source || 'stored'
  };
}

export function cityFlag(location) {
  return countryFlag(location?.countryCode || '');
}

export function hotCityLocations() {
  return HOT_CITY_NAMES
    .map((name) => findExactPreset(name))
    .filter(Boolean)
    .map(presetToLocation);
}
