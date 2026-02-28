// Vercel Serverless Function: 健康检查
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const hasApiKey = !!process.env.MODELSCOPE_API_KEY;
  
  res.status(200).json({ 
    status: 'ok',
    modelscope_available: hasApiKey
  });
}
