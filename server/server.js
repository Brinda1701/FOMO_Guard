require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
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
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      result = JSON.parse(jsonStr);
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

function buildAgentPrompt(agent, company, action) {
  const prompts = {
    sentiment: `你是一名情绪分析专家。请分析"${company}"的市场情绪。
任务：1.分析社交媒体舆论情绪 2.评估市场热度 3.给出情绪分数 (0-100)
返回 JSON: {"score": 数字， "confidence": 数字， "summary": "总结", "signals": ["信号 1"]}`,
    technical: `你是一名技术分析专家。请分析"${company}"的技术面信号。
任务：1.评估技术指标 2.判断超买超卖 3.给出技术分数 (0-100)
返回 JSON: {"score": 数字， "confidence": 数字， "summary": "总结", "signals": ["信号 1"]}`,
    psychology: `你是一名行为金融学专家。请分析"${company}"的认知偏误风险。
任务：1.诊断认知偏误 2.评估市场心理 3.给出心理分数 (0-100)
返回 JSON: {"score": 数字， "confidence": 数字， "summary": "总结", "biasDetected": ["偏误 1"]}`
  };
  return prompts[agent] + `\n\n当前操作意向：${action || '分析'}`;
}

async function callAIModel(prompt) {
  const response = await fetch(`${MODELSCOPE_API_URL}chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MODELSCOPE_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: '你是一个专业的金融分析 AI。请严格按照 JSON 格式返回结果。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });
  if (!response.ok) throw new Error(`AI API error: ${response.status}`);
  const data = await response.json();
  const content = data.choices[0].message.content;
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

function parseAgentResult(agent, aiResult) {
  if (!aiResult) return { score: 50, confidence: 0.5, summary: '分析失败', error: '解析失败' };
  return {
    score: Math.max(0, Math.min(100, aiResult.score || 50)),
    confidence: aiResult.confidence || 0.5,
    summary: aiResult.summary || '',
    signals: aiResult.signals || [],
    biasDetected: aiResult.biasDetected || []
  };
}

function fuseAgentResults(company, action, results) {
  const sentiment = results.sentiment || { score: 50 };
  const technical = results.technical || { score: 50 };
  const psychology = results.psychology || { score: 50 };
  const finalScore = Math.round(sentiment.score * 0.4 + technical.score * 0.3 + psychology.score * 0.3);
  const scoreDiff = Math.max(
    Math.abs(sentiment.score - technical.score),
    Math.abs(technical.score - psychology.score),
    Math.abs(psychology.score - sentiment.score)
  );
  const consensus = scoreDiff > 25 ? 'divergent' : 'aligned';

  return {
    success: true, company, action: action || 'analyze', finalScore, consensus,
    breakdown: { sentiment, technical, psychology },
    insights: generateInsights(finalScore, company),
    warnings: generateWarnings(finalScore),
    recommendation: generateRecommendation(finalScore, company)
  };
}

function generateInsights(score, company) {
  if (score > 70) return [{ source: '综合分析', content: `当前${company}市场热度较高，建议警惕追高风险。` }];
  if (score < 30) return [{ source: '综合分析', content: `当前${company}市场情绪极度悲观，可能存在超跌反弹机会。` }];
  return [{ source: '综合分析', content: `${company}当前处于合理区间，建议结合基本面判断。` }];
}

function generateWarnings(score) {
  const warnings = [];
  if (score > 80) warnings.push('⚠️ 极端贪婪警告：短期回调概率超过 70%');
  else if (score > 70) warnings.push('⚠️ 贪婪警告：建议控制仓位，避免追高');
  if (score < 20) warnings.push('⚠️ 极端恐惧警告：可能是逆向投资机会');
  else if (score < 30) warnings.push('⚠️ 恐惧警告：避免恐慌性抛售');
  return warnings;
}

function generateRecommendation(score, company) {
  let message = '';
  if (score > 75) message = `当前${company}情绪过热，建议观望或减仓，等待情绪回落。`;
  else if (score > 60) message = `${company}情绪偏热，已持仓可持有并设止盈，未持仓者等待回调。`;
  else if (score > 40) message = `${company}情绪中性，不宜单纯基于情绪决策。`;
  else if (score > 25) message = `${company}情绪偏冷，如看好长期价值可分批建仓。`;
  else message = `${company}情绪极度悲观，可能是逆向投资机会，需确认基本面。`;
  return { message, action: score > 75 ? 'sell' : (score < 40 ? 'buy' : 'hold') };
}

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
      sentiment: { score: sentimentScore, confidence: 0.75, summary: '模拟情绪分析', signals: ['模拟信号 1'] },
      technical: { score: technicalScore, confidence: 0.7, summary: '模拟技术分析', signals: ['模拟信号 2'] },
      psychology: { score: psychologyScore, confidence: 0.8, summary: '模拟心理诊断', biasDetected: ['模拟偏误'] }
    },
    insights: generateInsights(finalScore, company),
    warnings: generateWarnings(finalScore),
    recommendation: generateRecommendation(finalScore, company)
  };
}

app.post('/api/orchestrator', async (req, res) => {
  try {
    const { company, action, stream } = req.body;
    if (!company) return res.status(400).json({ success: false, error: 'Company name is required' });

    if (!MODELSCOPE_API_KEY) {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const sendEvent = (event, data) => {
          res.write(`event: ${event}\n`);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        const result = simulateMultiAgentAnalysis(company, action);
        const agents = ['sentiment', 'technical', 'psychology'];
        let delay = 500;
        setTimeout(() => sendEvent('agent_start', { agent: 'sentiment', status: 'processing' }), delay);
        setTimeout(() => sendEvent('agent_complete', { agent: 'sentiment', status: 'completed', score: result.breakdown.sentiment.score }), delay + 1500);
        setTimeout(() => sendEvent('agent_start', { agent: 'technical', status: 'processing' }), delay + 2000);
        setTimeout(() => sendEvent('agent_complete', { agent: 'technical', status: 'completed', score: result.breakdown.technical.score }), delay + 3500);
        setTimeout(() => sendEvent('agent_start', { agent: 'psychology', status: 'processing' }), delay + 4000);
        setTimeout(() => sendEvent('agent_complete', { agent: 'psychology', status: 'completed', score: result.breakdown.psychology.score }), delay + 5500);
        setTimeout(() => sendEvent('summary', result), delay + 6000);
        setTimeout(() => res.end(), delay + 6500);
        return;
      } else {
        return res.status(200).json(simulateMultiAgentAnalysis(company, action));
      }
    }

    const agents = ['sentiment', 'technical', 'psychology'];
    const results = {};

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      for (const agent of agents) {
        sendEvent('agent_start', { agent, status: 'processing' });
        sendEvent('agent_progress', { agent, progress: 30, message: '正在分析...' });
        try {
          const prompt = buildAgentPrompt(agent, company, action);
          await new Promise(resolve => setTimeout(resolve, 500));
          sendEvent('agent_progress', { agent, progress: 70, message: '生成结果...' });
          const agentResult = await callAIModel(prompt);
          results[agent] = parseAgentResult(agent, agentResult);
          sendEvent('agent_progress', { agent, progress: 90, message: '完成...' });
          sendEvent('agent_complete', { agent, status: 'completed', score: results[agent].score, data: results[agent] });
        } catch (error) {
          console.error(`[Agent ${agent}] Error:`, error);
          sendEvent('agent_error', { agent, status: 'failed', error: error.message });
          results[agent] = { score: 50, error: error.message };
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      const finalResult = fuseAgentResults(company, action, results);
      sendEvent('summary', finalResult);
      res.end();
    } else {
      await Promise.all(agents.map(async (agent) => {
        try {
          const prompt = buildAgentPrompt(agent, company, action);
          const agentResult = await callAIModel(prompt);
          results[agent] = parseAgentResult(agent, agentResult);
        } catch (error) {
          console.error(`[Agent ${agent}] Error:`, error);
          results[agent] = { score: 50, error: error.message };
        }
      }));
      res.status(200).json(fuseAgentResults(company, action, results));
    }
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
          let result;
          try {
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1].trim();
            result = JSON.parse(jsonStr);
          } catch (e) {
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

app.listen(PORT, () => {
  console.log(`FOMOGuard 后端运行在 http://localhost:${PORT}`);
  console.log(`Multi-Agent 编排器：${!!MODELSCOPE_API_KEY ? '已启用 (AI 模式)' : '模拟模式'}`);
});
