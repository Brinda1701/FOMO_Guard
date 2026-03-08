# 📈 真实 K 线数据接入指南

FOMOGuard 现在支持**真实的股票 K 线数据**！系统集成了多个免费数据源，按优先级自动切换。

---

## 🚀 快速开始

### 1. 获取 API Key（推荐方案）

#### 方案 A：Alpha Vantage（推荐 ⭐）
- **完全免费**，无需信用卡
- 支持全球股票（美股、A 股、港股）
- 限制：5 次/分钟，500 次/天

**获取步骤：**
1. 访问 https://www.alphavantage.co/support/#api-key
2. 填写表单（只需邮箱和用户名）
3. 立即获取 API Key（发送到邮箱）

**配置方法：**
```env
# .env.local
ALPHA_VANTAGE_API_KEY=你的 API_KEY
DATA_SOURCE_PRIORITY=alphavantage
```

---

#### 方案 B：Twelve Data（备选）
- 免费额度：800 次/天
- 数据质量好，更新及时

**获取步骤：**
1. 访问 https://twelvedata.com/pricing
2. 注册免费账号
3. 在 Dashboard 获取 API Key

**配置方法：**
```env
# .env.local
TWELVE_DATA_API_KEY=你的 API_KEY
DATA_SOURCE_PRIORITY=twelvedata
```

---

#### 方案 C：Finnhub（备选）
- 免费额度：60 次/分钟
- 支持 A 股、美股、港股

**获取步骤：**
1. 访问 https://finnhub.io/dashboard
2. 注册账号
3. 获取 API Key

**配置方法：**
```env
# .env.local
FINNHUB_API_KEY=你的 API_KEY
DATA_SOURCE_PRIORITY=finnhub
```

---

#### 方案 D：新浪财经（A 股专用，无需 API Key）
- **无需注册**，直接使用
- 仅限 A 股和港股
- 实时数据

**配置方法：**
```env
# .env.local
ENABLE_SINA_API=true
DATA_SOURCE_PRIORITY=sina
```

---

### 2. 配置多数据源故障转移

推荐配置多个数据源，系统会自动按顺序尝试：

```env
# .env.local
ALPHA_VANTAGE_API_KEY=你的 Alpha_Vantage_Key
TWELVE_DATA_API_KEY=你的 Twelve_Data_Key
ENABLE_SINA_API=true

# 优先级：Alpha Vantage → Twelve Data → 新浪财经 → Mock
DATA_SOURCE_PRIORITY=alphavantage,twelvedata,sina
```

---

## 📊 支持的市场

| 市场 | 代码示例 | 数据源支持 |
|------|---------|-----------|
| **美股** | TSLA, AAPL, NVDA | Alpha Vantage, Twelve Data, Finnhub |
| **A 股** | 600519.SS, 002594.SZ | Alpha Vantage, 新浪财经 |
| **港股** | 0700.HK, 9988.HK | Alpha Vantage, Twelve Data, 新浪财经 |
| **中概股** | BIDU, JD, PDD | Alpha Vantage, Twelve Data, Finnhub |

---

## 🔧 代码映射表

系统内置了常用股票的代码映射，直接使用中文名称即可：

```javascript
// 内置映射（部分）
const SYMBOL_MAP = {
  // 美股
  '特斯拉': 'TSLA',
  '苹果': 'AAPL',
  '微软': 'MSFT',
  '英伟达': 'NVDA',
  
  // A 股
  '茅台': '600519.SS',
  '比亚迪': '002594.SZ',
  '宁德时代': '300750.SZ',
  
  // 港股
  '腾讯': '0700.HK',
  '阿里巴巴': '9988.HK',
  '美团': '3690.HK'
};
```

---

## 🧪 测试数据接口

### 本地测试
```bash
# 1. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API Key

# 2. 启动后端
cd server
npm start

# 3. 测试 API
curl -X POST http://localhost:3000/api/market-data \
  -H "Content-Type: application/json" \
  -d '{"symbol": "TSLA"}'
```

### 预期响应
```json
{
  "success": true,
  "symbol": "TSLA",
  "data": [
    {
      "date": "2026-02-20",
      "open": 248.50,
      "high": 253.20,
      "low": 247.80,
      "close": 251.30,
      "volume": 45678900
    },
    // ... 更多数据
  ],
  "technicals": {
    "rsi": "58.42",
    "ma5": 249.80,
    "ma10": 245.60,
    "ma20": 242.30
  },
  "latestPrice": 251.30,
  "changePercent": 1.25,
  "timestamp": "2026-03-08T10:30:00.000Z"
}
```

---

## ⚠️ 常见问题

### Q1: API 调用失败怎么办？
系统会自动尝试下一个数据源。如果所有数据源都失败，会使用高保真 Mock 数据作为备用。

### Q2: Alpha Vantage 提示频率超限？
- 免费版本限制 5 次/分钟
- 解决方案：
  1. 降低调用频率
  2. 配置多个数据源故障转移
  3. 使用 Twelve Data 作为主数据源（800 次/天）

### Q3: A 股数据不准确？
- Alpha Vantage 的 A 股数据可能有延迟
- 推荐使用新浪财经数据源（实时数据）
- 配置：`DATA_SOURCE_PRIORITY=sina,alphavantage`

### Q4: 如何在 Vercel 部署时配置？

**重要：不要在 GitHub 上传 .env.local 文件！API Key 会泄露！**

正确做法是在 Vercel 后台配置环境变量：

#### 方法 A：Vercel 网页配置（推荐）
1. 访问 https://vercel.com/dashboard
2. 找到你的项目 → **Settings** → **Environment Variables**
3. 添加以下变量：
   - `ALPHA_VANTAGE_API_KEY` = `你的 API Key`
   - `DATA_SOURCE_PRIORITY` = `alphavantage,twelvedata,finnhub,sina`
   - `ENABLE_SINA_API` = `true`
4. 点击 **Save**
5. 重新部署项目（点击 **Deploy** 按钮）

#### 方法 B：使用 Vercel CLI
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 配置环境变量
vercel env add ALPHA_VANTAGE_API_KEY
vercel env add DATA_SOURCE_PRIORITY
vercel env add ENABLE_SINA_API

# 重新部署
vercel --prod
```

---

## 📝 数据源对比

| 数据源 | 免费额度 | 支持市场 | 延迟 | 推荐度 |
|--------|---------|---------|------|--------|
| Alpha Vantage | 500 次/天 | 全球 | 实时 | ⭐⭐⭐⭐⭐ |
| Twelve Data | 800 次/天 | 全球 | 实时 | ⭐⭐⭐⭐ |
| Finnhub | 60 次/分钟 | 全球 | 实时 | ⭐⭐⭐⭐ |
| 新浪财经 | 无限 | A 股/港股 | 实时 | ⭐⭐⭐⭐ (A 股专用) |
| Mock 数据 | 无限 | 模拟 | - | ⭐⭐ (备用) |

---

## 🔗 相关链接

- [Alpha Vantage 文档](https://www.alphavantage.co/documentation/)
- [Twelve Data 文档](https://twelvedata.com/docs)
- [Finnhub 文档](https://finnhub.io/docs/api)
- [新浪财经 API](http://vip.stock.finance.sina.com.cn/)

---

## 💡 最佳实践

1. **开发环境**：使用 Alpha Vantage（免费、简单）
2. **生产环境**：配置多个数据源故障转移
3. **A 股为主**：优先使用新浪财经
4. **美股为主**：优先使用 Alpha Vantage 或 Twelve Data

```env
# 推荐的生产环境配置
ALPHA_VANTAGE_API_KEY=xxx
TWELVE_DATA_API_KEY=yyy
ENABLE_SINA_API=true
DATA_SOURCE_PRIORITY=alphavantage,twelvedata,sina
```

---

**现在你的 K 线数据就是真实的了！** 🎉

如有问题，请查看控制台日志获取详细错误信息。
