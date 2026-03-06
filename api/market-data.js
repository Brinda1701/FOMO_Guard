/**
 * 市场数据获取模块
 * 提供真实的金融数据接口或高保真 Mock 数据
 */

/**
 * 获取市场数据（14 天 K 线数据）
 * @param {string} symbol - 股票代码或公司名称
 * @returns {Promise<Array>} K 线数据数组
 */
export async function fetchMarketData(symbol) {
  // 尝试使用真实 API（如果配置了）
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (apiKey) {
    try {
      return await fetchFromAlphaVantage(symbol, apiKey);
    } catch (error) {
      console.warn('[MarketData] Alpha Vantage 失败，使用 Mock 数据:', error.message);
    }
  }
  
  // 返回高保真 Mock 数据
  return generateRealisticMockData(symbol);
}

/**
 * 从 Alpha Vantage 获取真实数据
 * @param {string} symbol 
 * @param {string} apiKey 
 * @returns {Promise<Array>}
 */
async function fetchFromAlphaVantage(symbol, apiKey) {
  const symbolMap = {
    '特斯拉': 'TSLA',
    '苹果': 'AAPL',
    '微软': 'MSFT',
    '英伟达': 'NVDA',
    '谷歌': 'GOOGL',
    '亚马逊': 'AMZN',
    '茅台': '600519.SS',
    '比亚迪': '002594.SZ',
    '宁德时代': '300750.SZ'
  };
  
  const apiSymbol = symbolMap[symbol] || symbol.toUpperCase();
  
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${apiSymbol}&outputsize=compact&apikey=${apiKey}`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'FOMOGuard/1.0' }
  });
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }
  
  const data = await response.json();
  const timeSeries = data['Time Series (Daily)'];
  
  if (!timeSeries) {
    throw new Error('No time series data');
  }
  
  // 转换为标准格式（取最近 14 天）
  const klineData = [];
  const dates = Object.keys(timeSeries).slice(0, 14);
  
  for (const date of dates) {
    const day = timeSeries[date];
    klineData.push({
      date,
      open: parseFloat(day['1. open']),
      high: parseFloat(day['2. high']),
      low: parseFloat(day['3. low']),
      close: parseFloat(day['4. close']),
      volume: parseInt(day['5. volume'])
    });
  }
  
  return klineData.reverse(); // 按时间正序排列
}

/**
 * 生成高保真 Mock 数据（基于公司名称生成逼真的量价数据）
 * @param {string} symbol - 公司名称或代码
 * @returns {Array} K 线数据数组
 */
export function generateRealisticMockData(symbol) {
  // 基于公司名称生成种子，确保同一公司每次生成的数据一致
  const seed = generateSeed(symbol);
  const rng = createSeededRandom(seed);
  
  // 不同行业有不同的波动特征
  const sectorVolatility = getSectorVolatility(symbol);
  
  // 生成基准价格（不同公司有不同的价格区间）
  const basePrice = getBasePrice(symbol);
  
  // 生成 14 天数据
  const klineData = [];
  let currentPrice = basePrice * (0.8 + rng() * 0.4); // 初始价格在基准的 80%-120%
  
  // 生成一个趋势（上涨、下跌或震荡）
  const trend = (rng() - 0.5) * 0.02; // -1% 到 +1% 的日趋势
  
  const now = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 跳过周末（简化处理）
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }
    
    // 每日波动
    const dailyVolatility = sectorVolatility * (0.5 + rng() * 1.5);
    const change = trend + (rng() - 0.5) * dailyVolatility;
    
    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + rng() * 0.02);
    const low = Math.min(open, close) * (1 - rng() * 0.02);
    
    // 成交量（与价格变动相关）
    const baseVolume = getBaseVolume(symbol);
    const volumeMultiplier = 1 + Math.abs(change) * 10; // 大幅变动时成交量放大
    const volume = Math.round(baseVolume * volumeMultiplier * (0.5 + rng() * 1.5));
    
    klineData.push({
      date: date.toISOString().split('T')[0],
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume
    });
    
    currentPrice = close;
  }
  
  return klineData;
}

/**
 * 计算技术指标（RSI、MA 等）
 * @param {Array} klineData - K 线数据
 * @returns {Object} 技术指标对象
 */
export function calculateTechnicalIndicators(klineData) {
  if (klineData.length < 14) {
    return calculateSimpleIndicators(klineData);
  }
  
  // 计算 RSI (14 日)
  const rsi = calculateRSI(klineData, 14);
  
  // 计算 MA (5 日、10 日、20 日)
  const ma5 = calculateMA(klineData, 5);
  const ma10 = calculateMA(klineData, 10);
  const ma20 = calculateMA(klineData, 20);
  
  // 计算 MACD
  const macd = calculateMACD(klineData);
  
  // 计算布林带
  const bollinger = calculateBollinger(klineData, 20);
  
  // 计算成交量均线
  const volMA5 = calculateMA(klineData.map(d => d.volume), 5);
  const volMA10 = calculateMA(klineData.map(d => d.volume), 10);
  
  const latestClose = klineData[klineData.length - 1].close;
  
  return {
    rsi: rsi.toFixed(2),
    ma5: roundPrice(ma5),
    ma10: roundPrice(ma10),
    ma20: roundPrice(ma20),
    macd: macd.toFixed(4),
    signal: macd.signal.toFixed(4),
    histogram: macd.histogram.toFixed(4),
    upperBand: roundPrice(bollinger.upper),
    middleBand: roundPrice(bollinger.middle),
    lowerBand: roundPrice(bollinger.lower),
    volMA5: Math.round(volMA5),
    volMA10: Math.round(volMA10),
    latestClose: roundPrice(latestClose),
    priceVsMA5: ((latestClose - ma5) / ma5 * 100).toFixed(2) + '%',
    priceVsMA10: ((latestClose - ma10) / ma10 * 100).toFixed(2) + '%',
    priceVsMA20: ((latestClose - ma20) / ma20 * 100).toFixed(2) + '%'
  };
}

/**
 * 计算 RSI
 */
function calculateRSI(data, period = 14) {
  let gains = 0;
  let losses = 0;
  
  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * 计算 MA
 */
function calculateMA(data, period) {
  const prices = data.slice(-period).map(d => d.close);
  return prices.reduce((a, b) => a + b, 0) / period;
}

/**
 * 计算 MACD
 */
function calculateMACD(data) {
  const ema12 = calculateEMA(data.map(d => d.close), 12);
  const ema26 = calculateEMA(data.map(d => d.close), 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.8; // 简化
  const histogram = macd - signal;
  return { macd, signal, histogram };
}

/**
 * 计算 EMA
 */
function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * 计算布林带
 */
function calculateBollinger(data, period = 20) {
  const prices = data.slice(-period).map(d => d.close);
  const middle = prices.reduce((a, b) => a + b, 0) / period;
  
  const squaredDiffs = prices.map(p => Math.pow(p - middle, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: middle + 2 * stdDev,
    middle,
    lower: middle - 2 * stdDev
  };
}

/**
 * 计算简单指标（数据不足 14 天时）
 */
function calculateSimpleIndicators(data) {
  if (data.length === 0) {
    return { rsi: 50, ma5: 0, ma10: 0, latestClose: 0 };
  }
  
  const latestClose = data[data.length - 1].close;
  const ma5 = data.length >= 5 ? calculateMA(data, 5) : latestClose;
  const ma10 = data.length >= 10 ? calculateMA(data, 10) : latestClose;
  
  // 简化 RSI
  let rsi = 50;
  if (data.length >= 2) {
    const change = latestClose - data[0].close;
    rsi = change > 0 ? 50 + Math.min(50, change / latestClose * 1000) : 50 - Math.min(50, -change / latestClose * 1000);
  }
  
  return {
    rsi: rsi.toFixed(2),
    ma5: roundPrice(ma5),
    ma10: roundPrice(ma10),
    latestClose: roundPrice(latestClose)
  };
}

/**
 * 生成种子（基于字符串）
 */
function generateSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * 创建种子随机数生成器
 */
function createSeededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * 获取行业波动率
 */
function getSectorVolatility(symbol) {
  const volatileSectors = ['特斯拉', '科技', '芯片', 'AI', 'TSLA', 'NVDA', 'AMD'];
  const stableSectors = ['银行', '保险', '公用事业', '茅台', 'JPM', 'BAC'];
  
  for (const sector of volatileSectors) {
    if (symbol.includes(sector)) return 0.035;
  }
  for (const sector of stableSectors) {
    if (symbol.includes(sector)) return 0.015;
  }
  return 0.025; // 默认
}

/**
 * 获取基准价格
 */
function getBasePrice(symbol) {
  if (symbol.includes('特斯拉') || symbol.includes('TSLA')) return 250;
  if (symbol.includes('苹果') || symbol.includes('AAPL')) return 180;
  if (symbol.includes('微软') || symbol.includes('MSFT')) return 400;
  if (symbol.includes('英伟达') || symbol.includes('NVDA')) return 800;
  if (symbol.includes('茅台') || symbol.includes('600519')) return 1700;
  if (symbol.includes('比亚迪') || symbol.includes('002594')) return 250;
  if (symbol.includes('宁德') || symbol.includes('300750')) return 200;
  return 50 + Math.random() * 200;
}

/**
 * 获取基准成交量
 */
function getBaseVolume(symbol) {
  if (symbol.includes('特斯拉') || symbol.includes('TSLA')) return 50000000;
  if (symbol.includes('苹果') || symbol.includes('AAPL')) return 40000000;
  if (symbol.includes('茅台') || symbol.includes('600519')) return 5000000;
  return 10000000 + Math.random() * 20000000;
}

/**
 * 价格四舍五入
 */
function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

/**
 * 格式化 K 线数据为字符串（用于 Prompt）
 */
export function formatKlineDataForPrompt(klineData, indicators) {
  const header = '日期       | 开盘    | 收盘    | 最高    | 最低    | 成交量';
  const separator = '─'.repeat(55);
  
  const rows = klineData.map(day => 
    `${day.date} | ${day.open.toFixed(2).padStart(6)} | ${day.close.toFixed(2).padStart(6)} | ${day.high.toFixed(2).padStart(6)} | ${day.low.toFixed(2).padStart(6)} | ${(day.volume / 10000).toFixed(0).padStart(5)}万`
  );
  
  const indicatorText = `
技术指标:
- RSI(14): ${indicators.rsi} ${indicators.rsi > 70 ? '(超买)' : indicators.rsi < 30 ? '(超卖)' : '(中性)'}`;
  
  if (indicators.ma5) {
    return `${header}\n${separator}\n${rows.join('\n')}\n${separator}\n${indicatorText}
- MA5: ${indicators.ma5} (当前价格 ${indicators.priceVsMA5})
- MA10: ${indicators.ma10} (当前价格 ${indicators.priceVsMA10})
- MA20: ${indicators.ma20} (当前价格 ${indicators.priceVsMA20})
- MACD: ${indicators.macd}, Signal: ${indicators.signal}, Histogram: ${indicators.histogram}
- 布林带：上轨${indicators.upperBand}, 中轨${indicators.middleBand}, 下轨${indicators.lowerBand}
- 成交量：5 日均量${(indicators.volMA5 / 10000).toFixed(0)}万，10 日均量${(indicators.volMA10 / 10000).toFixed(0)}万`;
  }
  
  return `${header}\n${separator}\n${rows.join('\n')}\n${separator}\n${indicatorText}`;
}
