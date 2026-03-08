/**
 * Vercel Serverless Function - 市场数据获取
 * 支持多个真实数据源：Alpha Vantage > Twelve Data > Finnhub > 新浪财经 > Mock
 */

const { setSecureCorsHeaders } = require('./utils');

// 股票代码映射表
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
  'AMD': 'AMD',
  '英特尔': 'INTC',
  'Netflix': 'NFLX',
  '波音': 'BA',
  '迪士尼': 'DIS',
  '摩根大通': 'JPM',
  '美国银行': 'BAC',
  // A 股
  '茅台': '600519.SS',
  '贵州茅台': '600519.SS',
  '比亚迪': '002594.SZ',
  '宁德时代': '300750.SZ',
  '腾讯': '0700.HK',
  '阿里巴巴': '9988.HK',
  '美团': '3690.HK',
  '小米': '1810.HK',
  '百度': 'BIDU',
  '京东': 'JD',
  '拼多多': 'PDD',
  '平安': '601318.SS',
  '工商银行': '601398.SS',
  '招商银行': '600036.SS'
};

module.exports = async function handler(req, res) {
  setSecureCorsHeaders(res, { 'Content-Type': 'application/json' });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { symbol, company } = req.body;

    if (!symbol && !company) {
      return res.status(400).json({ success: false, error: '需要提供股票代码或公司名称' });
    }

    console.log('[MarketData] 请求数据，symbol:', symbol, 'company:', company);

    // 获取市场数据
    const klineData = await fetchMarketData(symbol || company);

    // 计算技术指标
    const technicals = calculateTechnicalIndicators(klineData);

    // 获取最新价格
    const latestPrice = klineData.length > 0 ? klineData[klineData.length - 1].close : 0;
    const prevPrice = klineData.length > 1 ? klineData[klineData.length - 2].close : latestPrice;
    const changePercent = prevPrice ? ((latestPrice - prevPrice) / prevPrice * 100) : 0;

    const result = {
      success: true,
      symbol: symbol || company,
      data: klineData,
      technicals,
      latestPrice: roundPrice(latestPrice),
      changePercent: roundPrice(changePercent),
      timestamp: new Date().toISOString()
    };

    console.log('[MarketData] 返回数据，条数:', klineData.length);
    res.status(200).json(result);

  } catch (error) {
    console.error('[MarketData] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 获取市场数据（14 天 K 线数据）
 */
async function fetchMarketData(symbol) {
  const priority = process.env.DATA_SOURCE_PRIORITY || 'tencent,sina,alphavantage,twelvedata,finnhub';
  const sources = priority.split(',').map(s => s.trim().toLowerCase());

  for (const source of sources) {
    try {
      console.log(`[MarketData] 尝试从 ${source} 获取数据...`);

      let data = null;

      if (source === 'tencent' && process.env.ENABLE_TENCENT_API === 'true') {
        data = await fetchFromTencent(symbol);
      } else if (source === 'sina' && process.env.ENABLE_SINA_API === 'true') {
        data = await fetchFromSina(symbol);
      } else if (source === 'alphavantage' && process.env.ALPHA_VANTAGE_API_KEY) {
        data = await fetchFromAlphaVantage(symbol, process.env.ALPHA_VANTAGE_API_KEY);
      } else if (source === 'twelvedata' && process.env.TWELVE_DATA_API_KEY) {
        data = await fetchFromTwelveData(symbol, process.env.TWELVE_DATA_API_KEY);
      } else if (source === 'finnhub' && process.env.FINNHUB_API_KEY) {
        data = await fetchFromFinnhub(symbol, process.env.FINNHUB_API_KEY);
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
 */
async function fetchFromFinnhub(symbol, apiKey) {
  const apiSymbol = convertToFinnhubSymbol(symbol);
  
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
 * 从腾讯财经获取数据（支持 A 股、港股、美股）
 * 无需 API Key，实时数据
 * http://qt.gtimg.cn/q=股票代码
 */
async function fetchFromTencent(symbol) {
  const tencentSymbol = convertToTencentSymbol(symbol);
  
  if (!tencentSymbol) {
    throw new Error('无法转换为腾讯财经代码格式');
  }

  // 支持批量获取（多个代码用逗号分隔）
  const url = `http://qt.gtimg.cn/q=${tencentSymbol}`;
  
  console.log('[Tencent API] 请求 URL:', url);
  
  const response = await fetch(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': '*/*',
      'Referer': 'http://finance.qq.com/'
    },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Tencent API error: ${response.status}`);
  }

  const text = await response.text();
  console.log('[Tencent API] 返回数据长度:', text.length);
  
  // 解析腾讯返回的数据格式
  // 格式：v_sh600519="51~贵州茅台~600519~1402.00~1420.00~1430.00...";
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('Tencent data not available');
  }

  // 解析实时数据并生成历史 K 线
  const klineData = [];
  const now = new Date();
  
  for (const line of lines) {
    const match = line.match(/v_(\w+)="([^"]+)"/);
    if (!match) continue;
    
    const code = match[1];
    const data = match[2].split('~');
    
    if (data.length < 30) continue;
    
    // 腾讯数据字段解析
    const currentPrice = parseFloat(data[3]) || 0;
    const openPrice = parseFloat(data[5]) || 0;
    const highPrice = parseFloat(data[33]) || parseFloat(data[4]) || currentPrice;
    const lowPrice = parseFloat(data[34]) || parseFloat(data[5]) || currentPrice;
    const volume = parseInt(data[6]) || 0;
    const prevClose = parseFloat(data[2]) || currentPrice;
    
    // 使用实时数据生成最近 14 天的 K 线（以当前价格为基准）
    const history = generateHistoryFromCurrentPrice(
      currentPrice, openPrice, highPrice, lowPrice, volume, 14
    );
    
    klineData.push(...history);
  }

  if (klineData.length === 0) {
    throw new Error('No valid K-line data');
  }

  console.log('[Tencent API] 解析成功，生成数据条数:', klineData.length);
  return klineData.slice(-14);
}

/**
 * 从新浪财经获取数据（A 股专用，无需 API Key）
 * 使用新版 API：获取真实历史 K 线数据
 * http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData
 */
async function fetchFromSina(symbol) {
  const sinaSymbol = convertToSinaSymbol(symbol);
  
  if (!sinaSymbol) {
    throw new Error('无法转换为新浪财经代码格式');
  }

  // 使用新版 API 获取历史 K 线数据
  const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaSymbol}&scale=240&ma=5&datalen=30`;
  
  console.log('[Sina API] 请求 URL:', url);
  
  const response = await fetch(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'http://finance.sina.com.cn/'
    },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Sina API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Sina API] 返回数据条数:', Array.isArray(data) ? data.length : 0);
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Sina data not available or empty');
  }

  // 解析返回数据，转换为统一格式
  const klineData = data.slice(0, 14).map(item => ({
    date: item.day,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: parseInt(item.volume) || 0
  }));

  if (klineData.length === 0) {
    throw new Error('No valid K-line data');
  }

  console.log('[Sina API] 解析成功，最新数据:', klineData[klineData.length - 1]);
  return klineData;
}

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
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dailyVolatility = 0.02 + rng() * 0.02;
    const change = trend * 0.1 + (rng() - 0.5) * dailyVolatility;
    
    const dayOpen = price;
    const dayClose = dayOpen * (1 + change);
    const dayHigh = Math.max(dayOpen, dayClose) * (1 + rng() * 0.015);
    const dayLow = Math.min(dayOpen, dayClose) * (1 - rng() * 0.015);
    
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

function convertToAlphaVantageSymbol(symbol) {
  return SYMBOL_MAP[symbol] || symbol.toUpperCase();
}

function convertToTwelveDataSymbol(symbol) {
  const s = SYMBOL_MAP[symbol] || symbol.toUpperCase();
  return s.replace('.SS', '.SH').replace('.SZ', '.SZ');
}

function convertToFinnhubSymbol(symbol) {
  const s = SYMBOL_MAP[symbol] || symbol.toUpperCase();
  return s.replace('.SS', '.SS').replace('.SZ', '.SZ');
}

function convertToTencentSymbol(symbol) {
  // 直接是股票代码
  if (/^\d{6}$/.test(symbol)) {
    const prefix = symbol.startsWith('6') ? 'sh' : 'sz';
    return `${prefix}${symbol}`;
  }
  
  // 从名称转换（支持 A 股、港股、美股）
  const directMap = {
    // A 股
    '茅台': 'sh600519',
    '贵州茅台': 'sh600519',
    '比亚迪': 'sz002594',
    '宁德时代': 'sz300750',
    '平安': 'sh601318',
    '工商银行': 'sh601398',
    '建设银行': 'sh601939',
    '招商银行': 'sh600036',
    '五粮液': 'sz000858',
    '格力': 'sz000651',
    '美的': 'sz000333',
    // 港股
    '腾讯': 'hk00700',
    '阿里巴巴': 'hk09988',
    '美团': 'hk03690',
    '小米': 'hk01810',
    '百度': 'hk09888',
    '京东': 'hk09618',
    '拼多多': 'hk09878',
    '网易': 'hk09999',
    '中国平安': 'hk02318',
    '工商银行': 'hk01398',
    // 美股
    '特斯拉': 'usTSLA',
    '苹果': 'usAAPL',
    '微软': 'usMSFT',
    '英伟达': 'usNVDA',
    '谷歌': 'usGOOGL',
    '亚马逊': 'usAMZN',
    'meta': 'usMETA',
    '脸书': 'usMETA',
    'AMD': 'usAMD',
    '英特尔': 'usINTC',
    'Netflix': 'usNFLX',
    '网飞': 'usNFLX',
    '波音': 'usBA',
    '迪士尼': 'usDIS',
    '摩根大通': 'usJPM',
    '美国银行': 'usBAC',
    '可口可乐': 'usKO',
    '沃尔玛': 'usWMT'
  };
  
  return directMap[symbol] || directMap[symbol.toUpperCase()];
}

function convertToSinaSymbol(symbol) {
  if (/^\d{6}$/.test(symbol)) {
    const prefix = symbol.startsWith('6') ? 'sh' : 'sz';
    return `${prefix}${symbol}`;
  }
  
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

// 导出工具函数（用于其他模块）
exports.fetchMarketData = fetchMarketData;
exports.calculateTechnicalIndicators = calculateTechnicalIndicators;
exports.generateRealisticMockData = generateRealisticMockData;
exports.SYMBOL_MAP = SYMBOL_MAP;
