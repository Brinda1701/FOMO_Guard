/**
 * 市场数据获取模块 (CommonJS 版本)
 * 提供真实的金融数据接口或高保真 Mock 数据
 */

/**
 * 获取市场数据（14 天 K 线数据）
 */
async function fetchMarketData(symbol) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (apiKey) {
    try {
      return await fetchFromAlphaVantage(symbol, apiKey);
    } catch (error) {
      console.warn('[MarketData] Alpha Vantage 失败，使用 Mock 数据:', error.message);
    }
  }
  
  return generateRealisticMockData(symbol);
}

/**
 * 从 Alpha Vantage 获取真实数据
 */
async function fetchFromAlphaVantage(symbol, apiKey) {
  const symbolMap = {
    '特斯拉': 'TSLA', '苹果': 'AAPL', '微软': 'MSFT',
    '英伟达': 'NVDA', '谷歌': 'GOOGL', '亚马逊': 'AMZN',
    '茅台': '600519.SS', '比亚迪': '002594.SZ', '宁德时代': '300750.SZ'
  };
  
  const apiSymbol = symbolMap[symbol] || symbol.toUpperCase();
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${apiSymbol}&outputsize=compact&apikey=${apiKey}`;
  
  const response = await fetch(url, { headers: { 'User-Agent': 'FOMOGuard/1.0' } });
  if (!response.ok) throw new Error(`Alpha Vantage API error: ${response.status}`);
  
  const data = await response.json();
  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) throw new Error('No time series data');
  
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
  
  return klineData.reverse();
}

/**
 * 生成高保真 Mock 数据
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
  generateRealisticMockData
};
