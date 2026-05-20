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
  
  // 排序：我生(吉)、同我(次吉)、克我(平)、生我(较差)、我克(不宜)
  const orderIndices = [
    (index + 1) % 5,      // 我生者 - 吉（火生土=2, 土生金=3...）
    index,                 // 同我者 - 次吉
    (index + 3) % 5,      // 克我者 - 平（水克火=4, 金克木=3...）
    (index - 1 + 5) % 5,  // 生我者 - 较差（木生火=0, 水生木=4...）
    (index + 2) % 5       // 我克者 - 不宜（火克金=3, 金克木=0...）
  ];
  
  return orderIndices.map((colorIdx, i) => ({
    color: COLORS[colorIdx],
    colorName: COLOR_NAMES[COLORS[colorIdx]],
    level: LEVELS[i],
    emoji: LEVEL_EMOJI[i],
    cssClass: LEVEL_CLASS[i]
  }));
}

function getAdvice(temp, wuxingOrder) {
  const luckyColor = wuxingOrder[0].colorName;
  const unluckyColor = wuxingOrder[4].colorName;
  
  let tempAdvice = '';
  if (temp <= 0) tempAdvice = '🧣 天气寒冷，建议穿厚外套、羽绒服';
  else if (temp <= 10) tempAdvice = '🧥 天气较冷，建议穿外套、毛衣';
  else if (temp <= 20) tempAdvice = '👔 天气适宜，建议穿薄外套、长袖';
  else if (temp <= 30) tempAdvice = '👕 天气较热，建议穿短袖、薄衣物';
  else tempAdvice = '🩳 天气炎热，建议穿轻薄透气衣物';
  
  return [
    tempAdvice,
    `✅ 今日宜穿：${luckyColor}`,
    `❌ 今日忌穿：${unluckyColor}`
  ];
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

// ============ Pages Function 入口 ============

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const location = url.searchParams.get('location') || '101010100';
  
  const now = new Date();
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const ganZhi = getGanZhi(beijingTime);
  const wuXing = getWuxingOrder(ganZhi.zhi);
  
  const [weatherData, hourlyData] = await Promise.all([
    getWeatherNow(location, env),
    getWeather24h(location, env)
  ]);
  
  if (weatherData.code !== '200') {
    return new Response(JSON.stringify({ code: '500', message: '天气API调用失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const temp = parseInt(weatherData.now.temp);
  const advice = getAdvice(temp, wuXing);
  
  return new Response(JSON.stringify({
    code: '200',
    date: `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日`,
    ganZhi,
    wuXingName: ZHI_WU_XING[ganZhi.zhi],
    wuXing,
    weather: weatherData.now,
    hourly: hourlyData.hourly || [],
    advice
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
