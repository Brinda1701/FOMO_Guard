// Vercel Serverless Function: 健康检查
module.exports = async function handler(req, res) {
  // 使用安全的 CORS 配置
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasApiKey = !!process.env.MODELSCOPE_API_KEY;

  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    features: {
      ai_analysis: hasApiKey,      // AI 分析需要 API Key
      market_data: true,           // K 线数据始终可用（Mock）
      backtest: true               // 回测分析始终可用
    },
    modelscope_available: hasApiKey
  });
}
