// Vercel Serverless Function: 健康检查
module.exports = async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const hasApiKey = !!process.env.MODELSCOPE_API_KEY;
    const modelName = process.env.MODEL_NAME || 'not configured';

    res.status(200).json({
      status: 'ok',
      version: '1.0.0',
      features: {
        ai_analysis: hasApiKey,
        market_data: true,
        backtest: true
      },
      modelscope_available: hasApiKey,
      model_name: modelName,
      has_api_key: hasApiKey
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};
