// 五行穿衣 + 天气 Cloudflare Pages Function

// ============ 五行穿衣算法 ============

const COLORS = ['绿', '红', '黄', '白', '黑'];
const COLOR_NAMES = {
  '绿': '绿色/青色', '红': '红色/紫色', '黄': '黄色/棕色',
  '白': '白色/金色', '黑': '黑色/蓝色'
};
const LEVELS = ['吉', '次吉', '平', '较差', '不宜'];
const LEVEL_EMOJI = ['🟢', '🔵', '🟡', '🟠', '🔴'];
const LEVEL_CLASS = ['lucky', 'good', 'neutral', 'poor', 'unlucky'];

const ZHI_WU_XING = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

const WU_XING_LIST = ['木', '火', '土', '金', '水'];

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const BASE_DATE = new Date('2024-01-01');

function getGanZhi(targetDate) {
  const diffTime = targetDate.getTime() - BASE_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const ganIndex = ((diffDays % 10) + 10) % 10;
  const zhiIndex = ((diffDays % 12) + 12) % 12;
  return { gan: TIAN_GAN[ganIndex], zhi: DI_ZHI[zhiIndex] };
}

function getWuxingOrder(zhi) {
  const wuXing = ZHI_WU_XING[zhi];
  const index = WU_XING_LIST.indexOf(wuXing);
  
  const orderIndices = [
    (index + 1) % 5,
    index,
    (index + 3) % 5,
    (index - 1 + 5) % 5,
    (index + 2) % 5
  ];
  
  return orderIndices.map((colorIdx, i) => ({
    color: COLORS[colorIdx],
    colorName: COLOR_NAMES[COLORS[colorIdx]],
    level: LEVELS[i],
    emoji: LEVEL_EMOJI[i],
    cssClass: LEVEL_CLASS[i]
  }));
}

function getAdvice(temp, wuxingOrder, isToday) {
  const luckyColor = wuxingOrder[0].colorName;
  const unluckyColor = wuxingOrder[4].colorName;
  const dayLabel = isToday ? '今日' : '当日';
  
  const advice = [
    `✅ ${dayLabel}宜穿：${luckyColor}`,
    `❌ ${dayLabel}忌穿：${unluckyColor}`
  ];

  if (Number.isFinite(temp)) {
    let tempAdvice = '';
    if (temp <= 0) tempAdvice = '🧣 天气寒冷，建议穿厚外套、羽绒服';
    else if (temp <= 10) tempAdvice = '🧥 天气较冷，建议穿外套、毛衣';
    else if (temp <= 20) tempAdvice = '👔 天气适宜，建议穿薄外套、长袖';
    else if (temp <= 30) tempAdvice = '👕 天气较热，建议穿短袖、薄衣物';
    else tempAdvice = '🩳 天气炎热，建议穿轻薄透气衣物';
    advice.unshift(tempAdvice);
  }

  return advice;
}

// ============ 天气API ============

async function getWeatherNow(location, env) {
  const url = `${env.QWEATHER_HOST}/v7/weather/now?location=${location}&key=${env.QWEATHER_KEY}`;
  const resp = await fetch(url);
  return resp.json();
}

async function getWeather24h(location, env) {
  const url = `${env.QWEATHER_HOST}/v7/weather/24h?location=${location}&key=${env.QWEATHER_KEY}`;
  const resp = await fetch(url);
  return resp.json();
}

async function getWeather7d(location, env) {
  const url = `${env.QWEATHER_HOST}/v7/weather/7d?location=${location}&key=${env.QWEATHER_KEY}`;
  const resp = await fetch(url);
  return resp.json();
}

// 通过经纬度获取城市信息
async function getCityByCoords(lon, lat, env) {
  const url = `${env.QWEATHER_HOST}/v2/city/lookup?location=${lon},${lat}&key=${env.QWEATHER_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.code === '200' && data.location && data.location.length > 0) {
    return data.location[0];
  }
  return null;
}

function getBeijingToday() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return {
    year: beijingTime.getUTCFullYear(),
    month: beijingTime.getUTCMonth() + 1,
    day: beijingTime.getUTCDate()
  };
}

function toDateKey(parts) {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

function parseDateParam(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getBeijingToday();
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return getBeijingToday();
  }

  return { year, month, day };
}

function toUtcDate(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function mapDailyWeather(day) {
  if (!day) return null;
  return {
    temp: `${day.tempMin}-${day.tempMax}`,
    feelsLike: '',
    text: day.textDay,
    humidity: day.humidity || '--',
    windDir: day.windDirDay || '',
    windScale: day.windScaleDay || '--',
    cloud: day.cloud || '--'
  };
}

// ============ Pages Function 入口 ============

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const locationParam = url.searchParams.get('location') || '101010100';
  const selectedParts = parseDateParam(url.searchParams.get('date'));
  const selectedDateKey = toDateKey(selectedParts);
  const todayKey = toDateKey(getBeijingToday());
  const selectedDate = toUtcDate(selectedParts);
  const isToday = selectedDateKey === todayKey;
  
  const ganZhi = getGanZhi(selectedDate);
  const wuXing = getWuxingOrder(ganZhi.zhi);
  
  // 判断是城市ID还是经纬度
  let location = locationParam;
  let cityName = '';
  let cityId = locationParam;
  
  if (locationParam.includes(',')) {
    // 经纬度查询
    const [lon, lat] = locationParam.split(',');
    const cityInfo = await getCityByCoords(lon, lat, env);
    if (cityInfo) {
      location = cityInfo.id;
      cityName = cityInfo.name;
      cityId = cityInfo.id;
    }
  }
  
  const [weatherData, hourlyData, dailyData] = await Promise.all([
    getWeatherNow(location, env),
    getWeather24h(location, env),
    getWeather7d(location, env)
  ]);
  
  if (weatherData.code !== '200') {
    return new Response(JSON.stringify({ code: '500', message: '天气API调用失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const dailyWeather = dailyData.daily?.find(day => day.fxDate === selectedDateKey);
  const weather = isToday ? weatherData.now : mapDailyWeather(dailyWeather);
  const hourly = isToday ? (hourlyData.hourly || []) : [];
  const temp = isToday
    ? parseInt(weatherData.now.temp)
    : dailyWeather
      ? Math.round((parseInt(dailyWeather.tempMax) + parseInt(dailyWeather.tempMin)) / 2)
      : null;
  const advice = getAdvice(temp, wuXing, isToday);
  
  return new Response(JSON.stringify({
    code: '200',
    date: `${selectedParts.year}年${selectedParts.month}月${selectedParts.day}日`,
    selectedDate: selectedDateKey,
    isToday,
    ganZhi,
    wuXingName: ZHI_WU_XING[ganZhi.zhi],
    wuXing,
    weather,
    weatherMode: isToday ? 'now' : weather ? 'daily' : 'none',
    hourly,
    advice,
    cityName: cityName || weatherData.now.obsCity || '',
    cityId
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
