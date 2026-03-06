// Vercel Serverless Function: 历史回测数据接口
// 使用高保真 Mock 数据

const { setSecureCorsHeaders } = require('./utils');

module.exports = async function handler(req, res) {
  setSecureCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ success: false, error: '股票代码是必需的' });
  }

  try {
    const priceData = generateSimulatedPriceData(symbol);
    const backtestStats = generateSimulatedBacktestStats();

    res.status(200).json({
      success: true,
      symbol: symbol,
      originalSymbol: symbol,
      dataPoints: priceData.length,
      isSimulated: true,
      priceData: priceData.slice(-90),
      backtestStats
    });

  } catch (error) {
    console.error('Backtest API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

function generateSimulatedPriceData(symbol) {
  const data = [];
  const now = new Date();
  let price = 100 + Math.random() * 100;
  const trend = Math.random() > 0.5 ? 0.0002 : -0.0002;
  const volatility = 0.02 + Math.random() * 0.02;

  for (let i = 90; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.5) * volatility + trend;
    price = price * (1 + change);

    data.push({
      date: date.toISOString().split('T')[0],
      open: price * (1 + (Math.random() - 0.5) * 0.01),
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      close: price,
      volume: Math.floor(Math.random() * 1000000) + 500000
    });
  }

  return data;
}

function generateSimulatedBacktestStats() {
  return {
    highSentiment: {
      profitRate: Math.floor(Math.random() * 15) + 25,
      avgReturn: -(Math.random() * 8 + 5).toFixed(1),
      samples: Math.floor(Math.random() * 50) + 20
    },
    lowSentiment: {
      profitRate: Math.floor(Math.random() * 20) + 55,
      avgReturn: (Math.random() * 12 + 3).toFixed(1),
      samples: Math.floor(Math.random() * 50) + 20
    },
    neutralSentiment: {
      profitRate: Math.floor(Math.random() * 10) + 45,
      avgReturn: (Math.random() * 6 - 3).toFixed(1),
      samples: Math.floor(Math.random() * 100) + 50
    }
  };
}
