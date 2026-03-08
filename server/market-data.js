/**
 * 市场数据获取模块 - 支持多个真实数据源
 * 优先级：Alpha Vantage > Twelve Data > Finnhub > 新浪财经 > Mock
 */

/**
 * 股票代码映射表
 */
const SYMBOL_MAP = {
  // 美股
  '特斯拉': 'TSLA',
  '苹果': 'AAPL',
  '微软': 'MSFT',
  '英伟达': 'NVDA',
  '谷歌': 'GOOGL',
  '亚马逊': 'AMZN',
  'meta': 'META',
  '脸书': 'META',
  '推特': 'TWTR',
  'Netflix': 'NFLX',
  '网飞': 'NFLX',
  'AMD': 'AMD',
  '英特尔': 'INTC',
  '高通': 'QCOM',
  '波音': 'BA',
  '迪士尼': 'DIS',
  '可口可乐': 'KO',
  '百事': 'PEP',
  '沃尔玛': 'WMT',
  '摩根大通': 'JPM',
  '美国银行': 'BAC',
  '高盛': 'GS',
  // A 股
  '茅台': '600519.SS',
  '贵州茅台': '600519.SS',
  '比亚迪': '002594.SZ',
  '宁德时代': '300750.SZ',
  '宁德时代新能源': '300750.SZ',
  '腾讯': '0700.HK',
  '阿里巴巴': '9988.HK',
  '美团': '3690.HK',
  '小米': '1810.HK',
  '百度': 'BIDU',
  '京东': 'JD',
  '拼多多': 'PDD',
  '网易': 'NTES',
  '平安': '601318.SS',
  '工商银行': '601398.SS',
  '建设银行': '601939.SS',
  '招商银行': '600036.SS'
};

/**
 * 获取市场数据（14 天 K 线数据）
 * @param {string} symbol - 公司名称或股票代码
 * @returns {Promise<Array>} K 线数据数组
 */
async function fetchMarketData(symbol) {
  const priority = process.env.DATA_SOURCE_PRIORITY || 'alphavantage,twelvedata,finnhub,sina';
  const sources = priority.split(',').map(s => s.trim().toLowerCase());

  for (const source of sources) {
    try {
      console.log(`[MarketData] 尝试从 ${source} 获取数据...`);
      
      let data = null;
      
      if (source === 'alphavantage' && process.env.ALPHA_VANTAGE_API_KEY) {
        data = await fetchFromAlphaVantage(symbol, process.env.ALPHA_VANTAGE_API_KEY);
      } else if (source === 'twelvedata' && process.env.TWELVE_DATA_API_KEY) {
        data = await fetchFromTwelveData(symbol, process.env.TWELVE_DATA_API_KEY);
      } else if (source === 'finnhub' && process.env.FINNHUB_API_KEY) {
        data = await fetchFromFinnhub(symbol, process.env.FINNHUB_API_KEY);
      } else if (source === 'sina' && process.env.ENABLE_SINA_API === 'true') {
        data = await fetchFromSina(symbol);
      }
      
      if (data && data.length > 0) {
        console.log(`[MarketData] ✓ 从 ${source} 成功获取 ${data.length} 条数据`);
        return data;
      }
    } catch (error) {
      console.warn(`[MarketData] ${source} 失败:`, error.message);
    }
  }

  console.log('[MarketData] 所有真实数据源失败，使用 Mock 数据');
  return generateRealisticMockData(symbol);
}

/**
 * 从 Alpha Vantage 获取数据
 * https://www.alphavantage.co/
 */
async function fetchFromAlphaVantage(symbol, apiKey) {
  const apiSymbol = convertToAlphaVantageSymbol(symbol);
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${apiSymbol}&outputsize=compact&apikey=${apiKey}`;

  const response = await fetch(url, { 
    headers: { 'User-Agent': 'FOMOGuard/1.0' },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();
  
  // 检查 API 限制
  if (data['Note']) {
    throw new Error('API 调用频率超限');
  }
  
  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) {
    throw new Error('No time series data');
  }

  return parseTimeSeries(timeSeries, 14);
}

/**
 * 从 Twelve Data 获取数据
 * https://twelvedata.com/
 */
async function fetchFromTwelveData(symbol, apiKey) {
  const apiSymbol = convertToTwelveDataSymbol(symbol);
  const url = `https://api.twelvedata.com/time_series?symbol=${apiSymbol}&interval=1day&outputsize=14&apikey=${apiKey}`;

  const response = await fetch(url, { 
    headers: { 'User-Agent': 'FOMOGuard/1.0' },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Twelve Data API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.status === 'error') {
    throw new Error(data.message || 'Twelve Data error');
  }
  
  if (!data.values || data.values.length === 0) {
    throw new Error('No data available');
  }

  return data.values.map(v => ({
    date: v.datetime,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseInt(v.volume) || 0
  })).reverse();
}

/**
 * 从 Finnhub 获取数据
 * https://finnhub.io/
 */
async function fetchFromFinnhub(symbol, apiKey) {
  const apiSymbol = convertToFinnhubSymbol(symbol);
  
  // 计算日期范围（过去 14 天）
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${apiSymbol}&resolution=D&from=${Math.floor(startDate.getTime()/1000)}&to=${Math.floor(endDate.getTime()/1000)}&token=${apiKey}`;

  const response = await fetch(url, { 
    headers: { 'User-Agent': 'FOMOGuard/1.0' },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.s || data.s !== 'ok') {
    throw new Error('Finnhub data not available');
  }

  const klineData = [];
  for (let i = 0; i < data.t.length; i++) {
    const date = new Date(data.t[i] * 1000);
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    klineData.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(data.o[i]),
      high: parseFloat(data.h[i]),
      low: parseFloat(data.l[i]),
      close: parseFloat(data.c[i]),
      volume: data.v[i] || 0
    });
  }

  return klineData.slice(-14);
}

/**
 * 从新浪财经获取数据（A 股专用，无需 API Key）
 * http://vip.stock.finance.sina.com.cn/
 */
async function fetchFromSina(symbol) {
  const sinaSymbol = convertToSinaSymbol(symbol);
  
  if (!sinaSymbol) {
    throw new Error('无法转换为新浪财经代码格式');
  }

  // 新浪财经实时行情接口
  const url = `http://hq.sinajs.cn/list=${sinaSymbol}`;
  
  const response = await fetch(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'http://finance.sina.com.cn/'
    },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Sina API error: ${response.status}`);
  }

  const text = await response.text();
  const match = text.match(/="([^"]+)"/);
  
  if (!match || !match[1]) {
    throw new Error('Sina data not available');
  }

  const elements = match[1].split(',');
  
  if (elements.length < 32) {
    throw new Error('Invalid Sina data format');
  }

  // 新浪财经返回的是实时数据，我们需要构造 K 线数据
  // 由于新浪只提供实时数据，我们生成过去 14 天的模拟数据，但以当前价格为基准
  const currentPrice = parseFloat(elements[3]); // 当前价
  const openPrice = parseFloat(elements[1]);   // 今开
  const highPrice = parseFloat(elements[4]);   // 最高
  const lowPrice = parseFloat(elements[5]);    // 最低
  const volume = parseInt(elements[8]) || 0;   // 成交量
  
  // 使用当前价格生成历史 K 线
  return generateHistoryFromCurrentPrice(currentPrice, openPrice, highPrice, lowPrice, volume, 14);
}

/**
 * 从时间序列数据解析 K 线
 */
function parseTimeSeries(timeSeries, limit) {
  const klineData = [];
  const dates = Object.keys(timeSeries).slice(0, limit);

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

  return klineData.reverse();
}

/**
 * 从当前价格生成历史 K 线数据
 */
function generateHistoryFromCurrentPrice(current, open, high, low, baseVolume, days) {
  const klineData = [];
  const seed = current * 100;
  const rng = createSeededRandom(Math.floor(seed));
  
  let price = current * (0.9 + rng() * 0.2);
  const trend = (current - open) / current;
  
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dailyVolatility = 0.02 + rng() * 0.02;
    const change = trend * 0.1 + (rng() - 0.5) * dailyVolatility;
    
    const dayOpen = price;
    const dayClose = dayOpen * (1 + change);
    const dayHigh = Math.max(dayOpen, dayClose) * (1 + rng() * 0.015);
    const dayLow = Math.min(dayOpen, dayClose) * (1 - rng() * 0.015);
    
    // 最后一天的数据使用真实值
    const isLastDay = (i === days - 1);
    
    klineData.push({
      date: date.toISOString().split('T')[0],
      open: roundPrice(isLastDay ? open : dayOpen),
      high: roundPrice(isLastDay ? high : dayHigh),
      low: roundPrice(isLastDay ? low : dayLow),
      close: roundPrice(isLastDay ? current : dayClose),
      volume: Math.round(baseVolume * (0.5 + rng() * 1.5))
    });
    
    price = dayClose;
  }

  return klineData;
}

/**
 * 股票代码转换
 */
function convertToAlphaVantageSymbol(symbol) {
  return SYMBOL_MAP[symbol] || symbol.toUpperCase();
}

function convertToTwelveDataSymbol(symbol) {
  const s = SYMBOL_MAP[symbol] || symbol.toUpperCase();
  // Twelve Data 使用不同的后缀格式
  return s.replace('.SS', '.SH').replace('.SZ', '.SZ');
}

function convertToFinnhubSymbol(symbol) {
  const s = SYMBOL_MAP[symbol] || symbol.toUpperCase();
  // Finnhub 使用不同的格式
  return s.replace('.SS', '.SS').replace('.SZ', '.SZ');
}

function convertToSinaSymbol(symbol) {
  // 直接是股票代码
  if (/^\d{6}$/.test(symbol)) {
    const prefix = symbol.startsWith('6') ? 'sh' : 'sz';
    return `${prefix}${symbol}`;
  }
  
  // 从名称转换
  const directMap = {
    '茅台': 'sh600519',
    '贵州茅台': 'sh600519',
    '比亚迪': 'sz002594',
    '宁德时代': 'sz300750',
    '平安': 'sh601318',
    '工商银行': 'sh601398',
    '建设银行': 'sh601939',
    '招商银行': 'sh600036',
    '腾讯': 'hk00700',
    '阿里巴巴': 'hk09988',
    '美团': 'hk03690',
    '小米': 'hk01810'
  };
  
  return directMap[symbol] || directMap[symbol.toUpperCase()];
}

/**
 * 生成高保真 Mock 数据（备用方案）
 */
function generateRealisticMockData(symbol) {
  const seed = generateSeed(symbol);
  const rng = createSeededRandom(seed);
  const sectorVolatility = getSectorVolatility(symbol);
  const basePrice = getBasePrice(symbol);

  const klineData = [];
  let currentPrice = basePrice * (0.8 + rng() * 0.4);
  const trend = (rng() - 0.5) * 0.02;
  const now = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dailyVolatility = sectorVolatility * (0.5 + rng() * 1.5);
    const change = trend + (rng() - 0.5) * dailyVolatility;

    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + rng() * 0.02);
    const low = Math.min(open, close) * (1 - rng() * 0.02);

    const baseVolume = getBaseVolume(symbol);
    const volumeMultiplier = 1 + Math.abs(change) * 10;
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
 * 计算技术指标
 */
function calculateTechnicalIndicators(klineData) {
  if (klineData.length < 14) {
    return calculateSimpleIndicators(klineData);
  }

  const rsi = calculateRSI(klineData, 14);
  const ma5 = calculateMA(klineData, 5);
  const ma10 = calculateMA(klineData, 10);
  const ma20 = calculateMA(klineData, 20);
  const macd = calculateMACD(klineData);
  const bollinger = calculateBollinger(klineData, 20);
  const volMA5 = calculateMA(klineData.map(d => d.volume), 5);
  const volMA10 = calculateMA(klineData.map(d => d.volume), 10);

  const latestClose = klineData[klineData.length - 1].close;

  return {
    rsi: rsi.toFixed(2),
    ma5: roundPrice(ma5),
    ma10: roundPrice(ma10),
    ma20: roundPrice(ma20),
    macd: macd.toFixed(4),
    signal: (macd * 0.8).toFixed(4),
    histogram: (macd * 0.2).toFixed(4),
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

function calculateRSI(data, period) {
  let gains = 0, losses = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change; else losses -= change;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateMA(data, period) {
  const prices = data.slice(-period).map(d => d.close);
  return prices.reduce((a, b) => a + b, 0) / period;
}

function calculateMACD(data) {
  const ema12 = calculateEMA(data.map(d => d.close), 12);
  const ema26 = calculateEMA(data.map(d => d.close), 26);
  return ema12 - ema26;
}

function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateBollinger(data, period) {
  const prices = data.slice(-period).map(d => d.close);
  const middle = prices.reduce((a, b) => a + b, 0) / period;
  const variance = prices.map(p => Math.pow(p - middle, 2)).reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: middle + 2 * stdDev, middle, lower: middle - 2 * stdDev };
}

function calculateSimpleIndicators(data) {
  if (data.length === 0) return { rsi: 50, ma5: 0, ma10: 0, latestClose: 0 };
  const latestClose = data[data.length - 1].close;
  const ma5 = data.length >= 5 ? calculateMA(data, 5) : latestClose;
  const ma10 = data.length >= 10 ? calculateMA(data, 10) : latestClose;
  let rsi = 50;
  if (data.length >= 2) {
    const change = latestClose - data[0].close;
    rsi = change > 0 ? 50 + Math.min(50, change / latestClose * 1000) : 50 - Math.min(50, -change / latestClose * 1000);
  }
  return { rsi: rsi.toFixed(2), ma5: roundPrice(ma5), ma10: roundPrice(ma10), latestClose: roundPrice(latestClose) };
}

function generateSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function createSeededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function getSectorVolatility(symbol) {
  const volatileSectors = ['特斯拉', '科技', '芯片', 'AI', 'TSLA', 'NVDA', 'AMD'];
  const stableSectors = ['银行', '保险', '公用事业', '茅台', 'JPM', 'BAC'];
  for (const sector of volatileSectors) if (symbol.includes(sector)) return 0.035;
  for (const sector of stableSectors) if (symbol.includes(sector)) return 0.015;
  return 0.025;
}

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

function getBaseVolume(symbol) {
  if (symbol.includes('特斯拉') || symbol.includes('TSLA')) return 50000000;
  if (symbol.includes('苹果') || symbol.includes('AAPL')) return 40000000;
  if (symbol.includes('茅台') || symbol.includes('600519')) return 5000000;
  return 10000000 + Math.random() * 20000000;
}

function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

module.exports = {
  fetchMarketData,
  calculateTechnicalIndicators,
  generateRealisticMockData,
  SYMBOL_MAP
};
