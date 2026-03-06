// Vercel Serverless Function: AI 分析接口
// 使用共享 utils 模块

import { parseJSONFromContent, setSecureCorsHeaders } from './utils.js';

export default async function handler(req, res) {
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
  const MODEL_NAME = process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-R1';

  if (!MODELSCOPE_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'API key not configured'
    });
  }

  try {
    const { company, action, text } = req.body;

    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    const prompt = `请分析${company}的市场情绪。当前操作意向：${action || '分析'}。根据行为金融学，给出情绪分（0-100，越高越贪婪）、认知偏差诊断和简要建议。`;

    const response = await fetch(`${MODELSCOPE_API_URL}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODELSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的投资心理分析师，擅长行为金融学。请返回 JSON 格式，包含：sentiment_score (0-100), bias (认知偏差类型), advice (建议), risk_level (High/Low)。'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelScope API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
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
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
