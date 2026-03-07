// Vercel Serverless Function: AI 分析接口
// 使用共享 utils 模块

const { parseJSONFromContent, setSecureCorsHeaders } = require('./utils');

module.exports = async function handler(req, res) {
  // 使用安全的 CORS 配置
  setSecureCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const MODELSCOPE_API_KEY = process.env.MODELSCOPE_API_KEY;
  const MODELSCOPE_API_URL = process.env.MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1/';
  // 使用响应速度更快的模型（避免 60 秒超时）
  // 推荐：Qwen/Qwen2.5-32B-Instruct (速度快，性能好)
  const MODEL_NAME = process.env.MODEL_NAME || 'Qwen/Qwen2.5-32B-Instruct';
  
  console.log('[Analyze] 使用模型:', MODEL_NAME);

  console.log('[Analyze] 请求方法:', req.method);
  console.log('[Analyze] 请求体:', JSON.stringify(req.body));
  console.log('[Analyze] API Key 配置:', MODELSCOPE_API_KEY ? '已配置' : '未配置');
  console.log('[Analyze] API URL:', MODELSCOPE_API_URL);
  console.log('[Analyze] 模型名称:', MODEL_NAME);

  if (!MODELSCOPE_API_KEY) {
    console.error('[Analyze] API Key 未配置！');
    return res.status(500).json({
      success: false,
      error: 'API key not configured'
    });
  }

  try {
    const { company, action, text } = req.body;

    if (!company) {
      console.warn('[Analyze] 缺少公司名称参数');
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    const prompt = `请分析${company}的市场情绪。当前操作意向：${action || '分析'}。根据行为金融学，给出情绪分（0-100，越高越贪婪）、认知偏差诊断和简要建议。`;

    console.log('[Analyze] 调用 ModelScope API...');
    console.log('[Analyze] Prompt:', prompt.substring(0, 100) + '...');

    const fetch = await import('node-fetch');
    
    const requestBody = {
      model: MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的投资心理分析师，擅长行为金融学。请返回 JSON 格式，包含：sentiment_score (0-100), bias (认知偏差类型), advice (建议), risk_level (High/Low)。'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: false
    };
    
    console.log('[Analyze] 请求体:', JSON.stringify(requestBody).substring(0, 200) + '...');

    const response = await fetch.default(`${MODELSCOPE_API_URL}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODELSCOPE_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[Analyze] 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Analyze] API 错误响应:', response.status, errorText);
      throw new Error(`ModelScope API error: ${response.status} ${errorText.substring(0, 300)}`);
    }

    const data = await response.json();
    console.log('[Analyze] API 响应数据:', JSON.stringify(data).substring(0, 300) + '...');
    
    const content = data.choices[0].message.content;

    let result = parseJSONFromContent(content);
    if (!result) {
      const scoreMatch = content.match(/(\d{1,3})/);
      result = {
        sentiment_score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
        bias: '无法解析',
        advice: content,
        risk_level: 'Unknown'
      };
    }

    res.status(200).json({
      success: true,
      score: result.sentiment_score || result.score || 50,
      data: result
    });

  } catch (error) {
    console.error('[Analyze] API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
