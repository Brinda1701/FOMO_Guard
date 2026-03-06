require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const utils = require('./utils');
const { fetchMarketData, calculateTechnicalIndicators } = require('./market-data');

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

// 真实的 User-Agent 列表（轮询使用）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// 反爬特征词
const ANTI_BOT_PATTERNS = [
  '验证码', '验证您的访问', '请稍候', '正在检查', 'access check',
  'captcha', 'verify', 'cloudflare', '请完成验证', '安全验证',
  '人类验证', '访问受限', '需要登录', '请先登录'
];

// 支持的网站配置
const SITE_CONFIGS = {
  'xueqiu.com': {
    name: '雪球',
    selectors: {
      title: 'h1.article__title, .article__title',
      content: '.article__content, .detail__stock-info',
      publishTime: '.article__time, .publish-time'
    }
  },
  'eastmoney.com': {
    name: '东方财富',
    selectors: {
      title: '.btitle, #title',
      content: '.btext, .article-content, #Content_body',
      publishTime: '.time, .date'
    }
  },
  'guba.eastmoney.com': {
    name: '东方财富股吧',
    selectors: {
      title: '.article-title, #title',
      content: '#post_content_1, .article-content',
      publishTime: '.article-time'
    }
  },
  'sina.com.cn': {
    name: '新浪财经',
    selectors: {
      title: 'h1.main-title, .main-title',
      content: '.article, #artibody, .content',
      publishTime: '.date, .time-source'
    }
  },
  'wallstreetcn.com': {
    name: '华尔街见闻',
    selectors: {
      title: '.article__title, h1',
      content: '.article__content, .article-content',
      publishTime: '.article__time'
    }
  }
};

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

    // 获取市场数据（仅用于技术分析 Agent）
    let marketData = null;
    try {
      const klineData = await fetchMarketData(company);
      const indicators = calculateTechnicalIndicators(klineData);
      marketData = { klineData, indicators };
      console.log('[Orchestrator] 已获取市场数据:', company, klineData.length, '天');
    } catch (error) {
      console.warn('[Orchestrator] 获取市场数据失败:', error.message);
    }

    if (stream) {
      utils.setSSEHeaders(res);
      const sendEvent = (event, data) => utils.sendSSEEvent(res, event, data);

      for (const agent of agents) {
        sendEvent('agent_start', { agent, status: 'processing' });
        sendEvent('agent_progress', { agent, progress: 30, message: '正在分析...' });
        try {
          // 技术分析 Agent 传入市场数据
          const prompt = utils.buildAgentPrompt(agent, company, action, agent === 'technical' ? marketData : null);
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
          // 技术分析 Agent 传入市场数据
          const prompt = utils.buildAgentPrompt(agent, company, action, agent === 'technical' ? marketData : null);
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

// ==================== URL 爬取接口（使用 Cheerio） ====================
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

    // 查找匹配的站点配置
    const domain = parsedUrl.hostname.replace('www.', '');
    const siteConfig = findSiteConfig(domain);

    if (!siteConfig) {
      const supportedList = Object.values(SITE_CONFIGS).map(s => s.name).join('、');
      return res.status(400).json({
        success: false,
        error: `暂不支持该网站，目前支持：${supportedList}`
      });
    }

    // 爬取网页内容
    const html = await fetchUrlContent(url);

    // 使用 Cheerio 解析
    const $ = cheerio.load(html);

    // 提取内容
    const extracted = extractContentWithCheerio($, siteConfig, html);

    // 反爬检测
    const antiBotResult = detectAntiBot(extracted.content);
    if (antiBotResult.detected) {
      return res.status(400).json({
        success: false,
        error: '该网页可能需要登录或存在反爬防护，无法自动抓取。请复制新闻文本使用「文本分析」模式',
        reason: antiBotResult.reason,
        suggestion: '请复制新闻文本使用「文本分析」模式'
      });
    }

    // 内容长度检测（SPA 或动态加载检测）
    if (extracted.content.length < 100) {
      return res.status(400).json({
        success: false,
        error: '该网页可能需要登录或存在反爬防护，无法自动抓取。请复制新闻文本使用「文本分析」模式',
        reason: `提取到的内容过少（仅${extracted.content.length}字），可能是 SPA 页面或需要 JavaScript 渲染`,
        suggestion: '请复制新闻文本使用「文本分析」模式',
        extractedTitle: extracted.title
      });
    }

    res.status(200).json({
      success: true,
      url,
      source: siteConfig.name,
      title: extracted.title,
      content: extracted.content,
      publishTime: extracted.publishTime,
      textLength: extracted.content.length
    });

  } catch (error) {
    console.error('[Scrape URL] Error:', error);
    
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return res.status(503).json({
        success: false,
        error: '无法访问该网页，可能是网络问题或网站已屏蔽访问。请复制新闻文本使用「文本分析」模式'
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// 查找匹配的站点配置
function findSiteConfig(domain) {
  for (const [key, config] of Object.entries(SITE_CONFIGS)) {
    if (domain.includes(key)) {
      return config;
    }
  }
  return null;
}

// 爬取网页内容（带重试和 UA 轮询）
async function fetchUrlContent(url, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const userAgent = USER_AGENTS[attempt % USER_AGENTS.length];
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow',
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      if (html.includes('404') && html.includes('Not Found')) {
        throw new Error('页面不存在 (404)');
      }
      
      return html;
      
    } catch (error) {
      lastError = error;
      console.warn(`[Fetch attempt ${attempt + 1}] failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}

// 使用 Cheerio 提取内容
function extractContentWithCheerio($, siteConfig, html) {
  let title = '';
  let content = '';
  let publishTime = '';

  const selectors = siteConfig.selectors;

  // 提取标题
  if (selectors.title) {
    const titleEl = $(selectors.title).first();
    if (titleEl.length > 0) {
      title = titleEl.text().trim();
    }
  }
  
  if (!title) {
    title = $('title').first().text().trim();
  }
  
  title = cleanTitle(title);

  // 提取发布时间
  if (selectors.publishTime) {
    const timeEl = $(selectors.publishTime).first();
    if (timeEl.length > 0) {
      publishTime = timeEl.text().trim();
    }
  }

  // 提取正文内容
  if (selectors.content) {
    const contentEls = $(selectors.content);
    if (contentEls.length > 0) {
      content = contentEls.map((_, el) => {
        const el$ = cheerio.load($(el).html() || '', null, false);
        return el$('p, div, span').map((i, p) => $(p).text().trim()).get().join('\n\n');
      }).get().join('\n\n');
    }
  }

  // 如果特定选择器失败，尝试通用方法
  if (!content || content.length < 50) {
    content = extractGenericContent($);
  }

  content = cleanContent(content);

  return { title, content, publishTime };
}

// 通用内容提取
function extractGenericContent($) {
  const mainContent = $('main').text();
  if (mainContent.trim().length > 100) {
    return mainContent;
  }

  const articleContent = $('article').text();
  if (articleContent.trim().length > 100) {
    return articleContent;
  }

  const paragraphs = [];
  $('p').each((_, p) => {
    const text = $(p).text().trim();
    if (text.length > 20) {
      paragraphs.push(text);
    }
    if (paragraphs.length >= 20) {
      return false;
    }
  });

  return paragraphs.join('\n\n');
}

// 清理标题
function cleanTitle(title) {
  if (!title) return '';
  
  const patterns = [
    /_-.*$/,
    /-.*(?:财经 | 股票 | 资讯 | 新闻 | 网 | 吧 | 雪球 | 东方财富 | 新浪 | 华尔街 | 同花顺 | 财新 | 第一财经).*$/i,
    /\|.*$/,
    /::.*$/
  ];
  
  let cleaned = title;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

// 清理内容
function cleanContent(content) {
  if (!content) return '';
  
  const paragraphs = content.split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 10);
  
  const uniqueParagraphs = [...new Set(paragraphs)];
  
  return uniqueParagraphs.join('\n\n');
}

// 反爬检测
function detectAntiBot(content) {
  const lowerContent = content.toLowerCase();
  
  for (const pattern of ANTI_BOT_PATTERNS) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      return {
        detected: true,
        reason: `检测到反爬特征词："${pattern}"`
      };
    }
  }
  
  return { detected: false };
}

app.listen(PORT, () => {
  console.log(`FOMOGuard 后端运行在 http://localhost:${PORT}`);
  console.log(`Multi-Agent 编排器：${!!MODELSCOPE_API_KEY ? '已启用 (AI 模式)' : '模拟模式'}`);
  console.log(`CORS 配置：${allowedOrigin || '默认 (localhost only)'}`);
  console.log(`网页抓取：已启用 Cheerio 解析器`);
});
