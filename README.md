# 五行穿衣指南 🔮

五行穿衣 + 天气预报，部署在 Cloudflare Pages 上。

## 功能

- ✅ 基于干支历法的五行穿衣排序
- ✅ 实时天气数据（和风天气API）
- ✅ 24小时逐时预报
- ✅ 穿衣建议（温度+五行）
- ✅ 响应式移动端适配
- ✅ GitHub 自动部署

## 项目结构

```
wuxing-weather/
├── index.html          # 前端页面
├── functions/
│   └── api.js          # 后端API (Pages Function)
├── package.json
├── wrangler.toml
├── .gitignore
└── README.md
```

## 部署步骤

### 方式一：GitHub 自动部署（推荐）

1. **上传代码到 GitHub**

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/wuxing-weather.git
git push -u origin main
```

2. **在 Cloudflare Dashboard 创建 Pages 项目**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 Workers & Pages
   - 创建项目 → 连接 GitHub 仓库
   - 选择仓库 `wuxing-weather`
   - 构建设置留空（不需要构建命令）
   - 部署

3. **配置环境变量**
   - 在 Pages 项目设置中 → 环境变量
   - 添加：
     - `QWEATHER_KEY` = 你的API Key
     - `QWEATHER_HOST` = 你的API Host

### 方式二：命令行部署

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 部署
npm run deploy
```

## API接口

### 获取每日数据

```
GET /api?location=101010100
```

**参数：**
- `location`: 城市ID（如 101010100=北京）

**返回：**
```json
{
  "code": "200",
  "date": "2026年5月20日",
  "ganZhi": { "gan": "甲", "zhi": "午" },
  "wuXingName": "火",
  "wuXing": [...],
  "weather": { "temp": "24", "text": "多云", ... },
  "hourly": [...],
  "advice": [...]
}
```

## 五行穿衣算法

| 排序 | 关系 | 说明 |
|------|------|------|
| 吉 | 我生者 | 泄秀生财 |
| 次吉 | 同我者 | 比肩相助 |
| 平 | 克我者 | 有压力但可承受 |
| 较差 | 生我者 | 有依赖性 |
| 不宜 | 我克者 | 消耗过大 |

## 支持城市

北京、上海、广州、深圳、杭州、南京、成都、重庆、武汉、西安等12个主要城市。

## License

MIT
