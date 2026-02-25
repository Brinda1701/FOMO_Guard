require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors()); // 允许前端跨域请求
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODELSCOPE_API_KEY = process.env.MODELSCOPE_API_KEY;
const MODELSCOPE_API_URL = process.env.MODELSCOPE_API_URL;
const MODEL_NAME = process.env.MODEL_NAME;

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 分析接口（供前端调用）
app.post('/api/analyze', async (req, res) => {
  try {
    const { company, action, text } = req.body; // 前端传公司名、操作、可选的文本

    // 构造提示词（根据你的需求）
    const prompt = `请分析${company}的市场情绪。当前操作意向：${action}。根据行为金融学，给出情绪分（0-100，越高越贪婪）、认知偏差诊断和简要建议。`;

    // 调用魔搭 API
    const response = await fetch(`${MODELSCOPE_API_URL}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODELSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: '你是一个专业的投资心理分析师，擅长行为金融学。请返回JSON格式，包含：sentiment_score (0-100), bias (认知偏差类型), advice (建议), risk_level (High/Low)。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`魔搭 API 错误: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 尝试解析 JSON（如果模型返回的是纯JSON）
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // 如果不是标准JSON，就包装一下
      result = {
        sentiment_score: 50,
        bias: '无法解析',
        advice: content,
        risk_level: 'Unknown'
      };
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('代理错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`FOMOGuard 后端运行在 http://localhost:${PORT}`);
});