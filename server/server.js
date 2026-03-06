require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const utils = require('./utils');

const app = express();

// 使用安全的 CORS 配置
const allowedOrigin = process.env.ALLOWED_ORIGIN;
let corsOptions;

if (allowedOrigin) {
  const origins = allowedOrigin.split(',').map(o => o.trim());
  corsOptions = {
    origin: origins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
} else {
  // 默认只允许 localhost
  corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
}

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODELSCOPE_API_KEY = process.env.MODELSCOPE_API_KEY;
const MODELSCOPE_API_URL = process.env.MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1/';
const MODEL_NAME = process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-R1';

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', modelscope_available: !!MODELSCOPE_API_KEY });
});

// 分析接口
app.post('/api/analyze', async (req, res) => {
  try {
    const { company, action, text } = req.body;
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
          { role: 'system', content: '你是一个专业的投资心理分析师，擅长行为金融学。请返回 JSON 格式，包含：sentiment_score (0-100), bias (认知偏差类型), advice (建议), risk_level (High/Low)。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`魔搭 API 错误：${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let result;
    try {
      result = utils.parseJSONFromContent(content);
      if (!result) {
        throw new Error('JSON 解析失败');
      }
    } catch (e) {
      result = { sentiment_score: 50, bias: '无法解析', advice: content, risk_level: 'Unknown' };
    }

    res.json({ success: true, score: result.sentiment_score || result.score || 50, data: result });
  } catch (error) {
    console.error('代理错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Multi-Agent 编排器接口 ====================

app.post('/api/orchestrator', async (req, res) => {
  try {
    const { company, action, stream } = req.body;
    if (!company) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }

    if (!MODELSCOPE_API_KEY) {
      if (stream) {
        return streamSimulation(res, company, action);
      } else {
        return res.status(200).json(simulateMultiAgentAnalysis(company, action));
      }
    }

    const agents = ['sentiment', 'technical', 'psychology'];
    const results = {};

    if (stream) {
      utils.setSSEHeaders(res);
      const sendEvent = (event, data) => utils.sendSSEEvent(res, event, data);

      for (const agent of agents) {
        sendEvent('agent_start', { agent, status: 'processing' });
        sendEvent('agent_progress', { agent, progress: 30, message: '正在分析...' });
        try {
          const prompt = utils.buildAgentPrompt(agent, company, action);
          await new Promise(resolve => setTimeout(resolve, 500));
          sendEvent('agent_progress', { agent, progress: 70, message: '生成结果...' });
          const agentResult = await utils.callAIModel(prompt, MODELSCOPE_API_KEY, MODELSCOPE_API_URL, MODEL_NAME);
          results[agent] = utils.parseAgentResult(agent, agentResult);
          sendEvent('agent_progress', { agent, progress: 90, message: '完成...' });
          sendEvent('agent_complete', { agent, status: 'completed', score: results[agent].score, data: results[agent] });
        } catch (error) {
          console.error(`[Agent ${agent}] Error:`, error);
          sendEvent('agent_error', { agent, status: 'failed', error: error.message });
          results[agent] = { score: 50, error: error.message };
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      const finalResult = utils.fuseAgentResults(company, action, results);
      sendEvent('summary', finalResult);
      res.end();
    } else {
      await Promise.all(agents.map(async (agent) => {
        try {
          const prompt = utils.buildAgentPrompt(agent, company, action);
          const agentResult = await utils.callAIModel(prompt, MODELSCOPE_API_KEY, MODELSCOPE_API_URL, MODEL_NAME);
          results[agent] = utils.parseAgentResult(agent, agentResult);
        } catch (error) {
          console.error(`[Agent ${agent}] Error:`, error);
          results[agent] = { score: 50, error: error.message };
        }
      }));
      res.status(200).json(utils.fuseAgentResults(company, action, results));
    }
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 模拟 Multi-Agent 分析
function simulateMultiAgentAnalysis(company, action) {
  const baseScore = 50 + Math.floor(Math.random() * 30) - 15;
  const sentimentScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const technicalScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const psychologyScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const finalScore = Math.round((sentimentScore + technicalScore + psychologyScore) / 3);

  return {
    success: true, company, action: action || 'analyze', finalScore,
    consensus: Math.abs(sentimentScore - technicalScore) < 15 && Math.abs(technicalScore - psychologyScore) < 15 ? 'aligned' : 'divergent',
    breakdown: {
      sentiment: { score: sentimentScore, confidence: 0.75, summary: utils.generateSentimentSummary(company, sentimentScore), signals: utils.generateSignals('sentiment') },
      technical: { score: technicalScore, confidence: 0.7, summary: utils.generateTechnicalSummary(company, technicalScore), signals: utils.generateSignals('technical') },
      psychology: { score: psychologyScore, confidence: 0.8, summary: utils.generatePsychologySummary(company, psychologyScore), biasDetected: utils.detectBias(psychologyScore) }
    },
    insights: utils.generateInsights(finalScore, company),
    warnings: utils.generateWarnings(finalScore),
    recommendation: utils.generateRecommendation(finalScore, company)
  };
}

// SSE 流式模拟
function streamSimulation(res, result, company, action) {
  utils.setSSEHeaders(res);
  const sendEvent = (event, data) => utils.sendSSEEvent(res, event, data);

  const fullResult = simulateMultiAgentAnalysis(company, action);
  let delay = 500;

  setTimeout(() => sendEvent('agent_start', { agent: 'sentiment', status: 'processing' }), delay);
  setTimeout(() => sendEvent('agent_complete', { agent: 'sentiment', status: 'completed', score: fullResult.breakdown.sentiment.score }), delay + 1500);
  setTimeout(() => sendEvent('agent_start', { agent: 'technical', status: 'processing' }), delay + 2000);
  setTimeout(() => sendEvent('agent_complete', { agent: 'technical', status: 'completed', score: fullResult.breakdown.technical.score }), delay + 3500);
  setTimeout(() => sendEvent('agent_start', { agent: 'psychology', status: 'processing' }), delay + 4000);
  setTimeout(() => sendEvent('agent_complete', { agent: 'psychology', status: 'completed', score: fullResult.breakdown.psychology.score }), delay + 5500);
  setTimeout(() => sendEvent('summary', fullResult), delay + 6000);
  setTimeout(() => res.end(), delay + 6500);
}

// ==================== 批量分析接口 ====================
app.post('/api/batch-analyze', async (req, res) => {
  try {
    const { companies } = req.body;
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({ success: false, error: 'Company list is required' });
    }
    if (companies.length > 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 companies allowed' });
    }

    const results = [];
    for (const company of companies) {
      try {
        if (!MODELSCOPE_API_KEY) {
          const score = 50 + Math.floor(Math.random() * 30) - 15;
          results.push({
            success: true, company, score,
            sentiment: score > 60 ? '贪婪' : (score < 40 ? '恐惧' : '中性'),
            profile: { sector: '综合', kw: ['业绩', '估值'] }
          });
        } else {
          const prompt = `请分析${company}的市场情绪，返回 JSON: {"score": 数字 (0-100), "sentiment": "正面/负面/中性", "summary": "简短总结"}`;
          const response = await fetch(`${MODELSCOPE_API_URL}chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${MODELSCOPE_API_KEY}`
            },
            body: JSON.stringify({
              model: MODEL_NAME,
              messages: [
                { role: 'system', content: '你是一个专业的投资心理分析师。请返回简洁的 JSON 格式结果。' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 300
            })
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          const content = data.choices[0].message.content;
          let result = utils.parseJSONFromContent(content);
          if (!result) {
            result = { score: 50, sentiment: '中性', summary: '解析失败' };
          }
          results.push({ success: true, company, score: result.score || 50, sentiment: result.sentiment || '中性', summary: result.summary || '' });
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        results.push({ success: false, company, error: error.message });
      }
    }
    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('[Batch Analyze] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== URL 爬取接口 ====================
app.post('/api/scrape-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // 验证 URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, error: '无效的 URL 格式' });
    }

    // 检查支持的网站
    const supportedDomains = ['xueqiu.com', 'eastmoney.com', 'guba.eastmoney.com', 'sina.com.cn', 'finance.sina.com.cn', 'wallstreetcn.com'];
    const domain = parsedUrl.hostname.replace('www.', '');
    const isSupported = supportedDomains.some(d => domain.includes(d));

    if (!isSupported) {
      return res.status(400).json({
        success: false,
        error: `暂不支持该网站，目前支持：${supportedDomains.join('、')}`
      });
    }

    // 识别来源
    let source = '未知';
    if (domain.includes('xueqiu')) source = '雪球';
    else if (domain.includes('eastmoney') || domain.includes('guba')) source = '东方财富';
    else if (domain.includes('sina') || domain.includes('finance')) source = '新浪财经';
    else if (domain.includes('wallstreetcn')) source = '华尔街见闻';

    // 爬取网页
    if (!MODELSCOPE_API_KEY) {
      // 模拟模式
      return res.status(200).json({
        success: true,
        url,
        source,
        title: `${source}新闻 - ${parsedUrl.pathname}`,
        content: '模拟内容：该新闻分析了市场动态和行业发展趋势，整体情绪偏向正面。',
        publishTime: new Date().toISOString()
      });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();

    // 提取标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/_-.*$/, '').replace(/-.*$/, '') : '';

    // 提取内容
    const content = utils.stripHtml(html).substring(0, 5000);

    res.status(200).json({
      success: true,
      url,
      source,
      title,
      content,
      publishTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Scrape URL] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`FOMOGuard 后端运行在 http://localhost:${PORT}`);
  console.log(`Multi-Agent 编排器：${!!MODELSCOPE_API_KEY ? '已启用 (AI 模式)' : '模拟模式'}`);
  console.log(`CORS 配置：${allowedOrigin || '默认 (localhost only)'}`);
});
