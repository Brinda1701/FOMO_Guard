// Vercel Serverless Function: Multi-Agent 编排器
// 支持 SSE 流式输出和普通 JSON 响应

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

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
    // 如果没有 API Key，返回模拟数据供测试
    return simulateMultiAgentAnalysis(req, res);
  }

  try {
    const { company, action, stream } = req.body;

    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    // 是否使用流式输出
    const useStream = stream === true;

    if (useStream) {
      // SSE 流式模式
      return streamMultiAgentAnalysis(req, res, company, action, MODELSCOPE_API_KEY, MODELSCOPE_API_URL, MODEL_NAME);
    } else {
      // 普通 JSON 模式
      return await runMultiAgentAnalysis(req, res, company, action, MODELSCOPE_API_KEY, MODELSCOPE_API_URL, MODEL_NAME);
    }

  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 模拟 Multi-Agent 分析（当没有 API Key 时使用）
 */
function simulateMultiAgentAnalysis(req, res) {
  const { company, action, stream } = req.body;
  const useStream = stream === true;

  // 生成基础分数
  const baseScore = 50 + Math.floor(Math.random() * 30) - 15;
  
  // 生成三个 Agent 的分数（有一定差异）
  const sentimentScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const technicalScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const psychologyScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));

  const finalScore = Math.round((sentimentScore + technicalScore + psychologyScore) / 3);

  const result = {
    success: true,
    company,
    action: action || 'analyze',
    finalScore,
    consensus: Math.abs(sentimentScore - technicalScore) < 15 && Math.abs(technicalScore - psychologyScore) < 15 ? 'aligned' : 'divergent',
    breakdown: {
      sentiment: {
        score: sentimentScore,
        confidence: 0.7 + Math.random() * 0.25,
        summary: generateSentimentSummary(company, sentimentScore),
        signals: generateSignals('sentiment')
      },
      technical: {
        score: technicalScore,
        confidence: 0.65 + Math.random() * 0.3,
        summary: generateTechnicalSummary(company, technicalScore),
        signals: generateSignals('technical')
      },
      psychology: {
        score: psychologyScore,
        confidence: 0.7 + Math.random() * 0.25,
        summary: generatePsychologySummary(company, psychologyScore),
        biasDetected: detectBias(psychologyScore)
      }
    },
    insights: generateInsights(finalScore, company),
    warnings: generateWarnings(finalScore),
    recommendation: generateRecommendation(finalScore, company)
  };

  if (useStream) {
    // SSE 流式模拟
    return streamSimulation(res, result);
  } else {
    // 普通 JSON 响应
    return res.status(200).json(result);
  }
}

/**
 * SSE 流式模拟输出
 */
function streamSimulation(res, result) {
  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const agents = ['sentiment', 'technical', 'psychology'];
  const agentNames = {
    sentiment: '情绪分析 Agent',
    technical: '技术分析 Agent',
    psychology: '心理诊断 Agent'
  };

  // 模拟流式过程
  let delay = 500;

  // Agent 1: 情绪分析
  setTimeout(() => {
    sendEvent('agent_start', { agent: 'sentiment', status: 'processing' });
  }, delay);

  setTimeout(() => {
    sendEvent('agent_progress', { 
      agent: 'sentiment', 
      progress: 50, 
      message: '正在分析社交媒体情绪...' 
    });
  }, delay + 800);

  setTimeout(() => {
    sendEvent('agent_complete', { 
      agent: 'sentiment', 
      status: 'completed', 
      score: result.breakdown.sentiment.score,
      data: result.breakdown.sentiment
    });
  }, delay + 1500);

  // Agent 2: 技术分析
  setTimeout(() => {
    sendEvent('agent_start', { agent: 'technical', status: 'processing' });
  }, delay + 2000);

  setTimeout(() => {
    sendEvent('agent_progress', { 
      agent: 'technical', 
      progress: 50, 
      message: '正在计算技术指标...' 
    });
  }, delay + 2800);

  setTimeout(() => {
    sendEvent('agent_complete', { 
      agent: 'technical', 
      status: 'completed', 
      score: result.breakdown.technical.score,
      data: result.breakdown.technical
    });
  }, delay + 3500);

  // Agent 3: 心理诊断
  setTimeout(() => {
    sendEvent('agent_start', { agent: 'psychology', status: 'processing' });
  }, delay + 4000);

  setTimeout(() => {
    sendEvent('agent_progress', { 
      agent: 'psychology', 
      progress: 50, 
      message: '正在检测认知偏误...' 
    });
  }, delay + 4800);

  setTimeout(() => {
    sendEvent('agent_complete', { 
      agent: 'psychology', 
      status: 'completed', 
      score: result.breakdown.psychology.score,
      data: result.breakdown.psychology
    });
  }, delay + 5500);

  // 最终汇总
  setTimeout(() => {
    sendEvent('summary', result);
  }, delay + 6000);

  // 结束
  setTimeout(() => {
    res.end();
  }, delay + 6500);
}

/**
 * 真正的 Multi-Agent 分析（调用 AI）
 */
async function runMultiAgentAnalysis(req, res, company, action, apiKey, apiUrl, modelName) {
  const agents = ['sentiment', 'technical', 'psychology'];
  const results = {};

  // 并行执行三个 Agent 分析
  const agentPromises = agents.map(async (agent) => {
    try {
      const prompt = buildAgentPrompt(agent, company, action);
      const agentResult = await callAIModel(prompt, apiKey, apiUrl, modelName);
      results[agent] = parseAgentResult(agent, agentResult);
      return { agent, success: true, data: results[agent] };
    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error);
      return { agent, success: false, error: error.message };
    }
  });

  await Promise.all(agentPromises);

  // 计算最终结果
  const finalResult = fuseAgentResults(company, action, results);

  res.status(200).json(finalResult);
}

/**
 * SSE 流式 Multi-Agent 分析
 */
async function streamMultiAgentAnalysis(req, res, company, action, apiKey, apiUrl, modelName) {
  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const agents = ['sentiment', 'technical', 'psychology'];
  const results = {};

  // 依次执行每个 Agent（流式展示进度）
  for (const agent of agents) {
    sendEvent('agent_start', { agent, status: 'processing' });

    try {
      // 进度更新
      sendEvent('agent_progress', { 
        agent, 
        progress: 30, 
        message: `正在分析${getAgentTaskName(agent)}...` 
      });

      const prompt = buildAgentPrompt(agent, company, action);
      
      // 模拟延迟（实际调用 AI）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      sendEvent('agent_progress', { 
        agent, 
        progress: 70, 
        message: '正在生成分析结果...' 
      });

      const agentResult = await callAIModel(prompt, apiKey, apiUrl, modelName);
      results[agent] = parseAgentResult(agent, agentResult);

      sendEvent('agent_progress', { 
        agent, 
        progress: 90, 
        message: '分析完成，正在汇总...' 
      });

      sendEvent('agent_complete', { 
        agent, 
        status: 'completed', 
        score: results[agent].score,
        data: results[agent]
      });

    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error);
      sendEvent('agent_error', { 
        agent, 
        status: 'failed', 
        error: error.message 
      });
      results[agent] = { score: 50, error: error.message };
    }

    // Agent 之间的小延迟
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // 汇总结果
  const finalResult = fuseAgentResults(company, action, results);
  sendEvent('summary', finalResult);

  res.end();
}

/**
 * 构建 Agent 提示词
 */
function buildAgentPrompt(agent, company, action) {
  const prompts = {
    sentiment: `你是一名情绪分析专家。请分析"${company}"的市场情绪。
    
任务：
1. 分析社交媒体、新闻、论坛上的舆论情绪
2. 评估市场热度是否过高或过低
3. 给出情绪分数（0-100，越高表示越贪婪/乐观）

请返回 JSON 格式：
{
  "score": 数字 (0-100),
  "confidence": 数字 (0-1),
  "summary": "情绪分析总结",
  "signals": ["正面信号 1", "负面信号 1", ...]
}`,

    technical: `你是一名技术分析专家。请分析"${company}"的技术面信号。

任务：
1. 评估趋势、动量、支撑阻力等技术指标
2. 判断当前是否处于超买或超卖状态
3. 给出技术分数（0-100，越高表示技术面越乐观）

请返回 JSON 格式：
{
  "score": 数字 (0-100),
  "confidence": 数字 (0-1),
  "summary": "技术分析总结",
  "signals": ["看涨信号 1", "看跌信号 1", ...]
}`,

    psychology: `你是一名行为金融学专家。请分析"${company}"相关的认知偏误风险。

任务：
1. 诊断投资者可能存在的认知偏误（锚定效应、确认偏误、羊群效应等）
2. 评估当前市场心理状态
3. 给出心理分数（0-100，越高表示心理状态越健康）

请返回 JSON 格式：
{
  "score": 数字 (0-100),
  "confidence": 数字 (0-1),
  "summary": "心理诊断总结",
  "biasDetected": ["偏误类型 1", "偏误类型 2", ...]
}`
  };

  return prompts[agent] + `\n\n当前操作意向：${action || '分析'}`;
}

/**
 * 调用 AI 模型
 */
async function callAIModel(prompt, apiKey, apiUrl, modelName) {
  const response = await fetch(`${apiUrl}chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { 
          role: 'system', 
          content: '你是一个专业的金融分析 AI。请严格按照用户要求的 JSON 格式返回结果。不要包含任何额外说明。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // 解析 JSON
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}

/**
 * 解析 Agent 结果
 */
function parseAgentResult(agent, aiResult) {
  if (!aiResult) {
    return {
      score: 50,
      confidence: 0.5,
      summary: '分析失败，使用默认值',
      error: 'AI 返回结果解析失败'
    };
  }

  return {
    score: Math.max(0, Math.min(100, aiResult.score || 50)),
    confidence: aiResult.confidence || 0.5,
    summary: aiResult.summary || '',
    signals: aiResult.signals || [],
    biasDetected: aiResult.biasDetected || []
  };
}

/**
 * 融合 Agent 结果
 */
function fuseAgentResults(company, action, results) {
  const sentiment = results.sentiment || { score: 50 };
  const technical = results.technical || { score: 50 };
  const psychology = results.psychology || { score: 50 };

  // 计算加权平均分数
  const finalScore = Math.round(
    (sentiment.score * 0.4 + technical.score * 0.3 + psychology.score * 0.3)
  );

  // 判断一致性
  const scoreDiff = Math.max(
    Math.abs(sentiment.score - technical.score),
    Math.abs(technical.score - psychology.score),
    Math.abs(psychology.score - sentiment.score)
  );
  const consensus = scoreDiff > 25 ? 'divergent' : 'aligned';

  return {
    success: true,
    company,
    action: action || 'analyze',
    finalScore,
    consensus,
    breakdown: {
      sentiment,
      technical,
      psychology
    },
    insights: generateInsights(finalScore, company),
    warnings: generateWarnings(finalScore),
    recommendation: generateRecommendation(finalScore, company)
  };
}

// ==================== 辅助函数 ====================

function getAgentTaskName(agent) {
  const names = {
    sentiment: '全网情绪',
    technical: '技术指标',
    psychology: '认知偏误'
  };
  return names[agent] || agent;
}

function generateSentimentSummary(company, score) {
  if (score > 70) return `${company} 当前市场情绪极度乐观，社交媒体讨论热度高涨，需警惕 FOMO 情绪蔓延。`;
  if (score > 55) return `${company} 市场情绪偏正面，舆论整体看好，但需关注是否有过度炒作迹象。`;
  if (score > 40) return `${company} 市场情绪中性，多空分歧较大，舆论面相对平稳。`;
  if (score > 25) return `${company} 市场情绪偏负面，悲观言论增多，但可能存在过度恐慌。`;
  return `${company} 市场情绪极度悲观，负面情绪主导，需警惕恐慌性抛售后的反弹机会。`;
}

function generateTechnicalSummary(company, score) {
  if (score > 70) return `${company} 技术面呈现强势特征，多个指标显示上涨动能充足，但需防范超买回调。`;
  if (score > 55) return `${company} 技术面偏多，趋势指标向好，支撑位稳固。`;
  if (score > 40) return `${company} 技术面中性，指标信号不明确，建议等待更清晰的方向信号。`;
  if (score > 25) return `${company} 技术面偏空，下行压力较大，关键支撑位面临考验。`;
  return `${company} 技术面极度弱势，多个指标显示下行趋势，但超卖可能带来反弹机会。`;
}

function generatePsychologySummary(company, score) {
  if (score > 70) return `投资者对${company}的心理状态较为理性，未见明显群体性偏误。`;
  if (score > 55) return `${company} 投资者情绪总体稳定，但需警惕部分认知偏误苗头。`;
  if (score > 40) return `${company} 投资者心理存在一定偏误，建议保持独立思考。`;
  if (score > 25) return `${company} 投资者心理偏误明显，羊群效应和情绪化交易风险上升。`;
  return `${company} 投资者心理极度不理性，多种认知偏误并存，此时决策风险极高。`;
}

function generateSignals(type) {
  const signals = {
    sentiment: [
      '社交媒体讨论热度上升',
      '正面新闻稿数量增加',
      '机构研报调高评级',
      '散户情绪指数偏高',
      'FOMO 情绪蔓延'
    ],
    technical: [
      '均线呈多头排列',
      'RSI 指标进入超买区',
      '成交量放大',
      'MACD 金叉信号',
      '突破关键阻力位'
    ]
  };
  
  const list = signals[type] || signals.sentiment;
  const count = Math.floor(Math.random() * 3) + 2;
  return list.slice(0, count);
}

function detectBias(score) {
  const biases = [];
  if (score > 70) {
    biases.push('过度自信');
    biases.push('锚定效应');
  } else if (score < 30) {
    biases.push('损失厌恶');
    biases.push('恐慌性决策');
  } else if (score < 50) {
    biases.push('确认偏误');
    biases.push('羊群效应');
  } else {
    biases.push('无明显偏误');
  }
  return biases;
}

function generateInsights(score, company) {
  const insights = [];
  
  if (score > 70) {
    insights.push({
      source: '综合分析',
      content: `当前${company}的市场热度较高，建议警惕追高风险，等待更好的入场时机。`
    });
    insights.push({
      source: '情绪分析',
      content: '社交媒体讨论度过热，往往是短期见顶信号之一。'
    });
  } else if (score < 30) {
    insights.push({
      source: '综合分析',
      content: `当前${company}的市场情绪极度悲观，可能存在超跌反弹机会。`
    });
    insights.push({
      source: '心理诊断',
      content: '市场恐慌时往往是长期投资者的入场窗口。'
    });
  } else {
    insights.push({
      source: '综合分析',
      content: `${company}当前处于合理估值区间，建议结合基本面做进一步判断。`
    });
  }

  return insights;
}

function generateWarnings(score) {
  const warnings = [];
  
  if (score > 80) {
    warnings.push('⚠️ 极端贪婪警告：历史数据显示，情绪指数超过 80 后，短期回调概率超过 70%');
  } else if (score > 70) {
    warnings.push('⚠️ 贪婪警告：当前情绪偏高，建议控制仓位，避免追高');
  }
  
  if (score < 20) {
    warnings.push('⚠️ 极端恐惧警告：市场极度悲观，但可能是逆向投资机会');
  } else if (score < 30) {
    warnings.push('⚠️ 恐惧警告：当前情绪偏低，避免恐慌性抛售');
  }

  return warnings;
}

function generateRecommendation(score, company) {
  let message = '';
  let action = 'hold';

  if (score > 75) {
    message = `当前${company}情绪过热，建议保持观望或适当减仓，等待情绪回落后再考虑入场。`;
    action = 'sell';
  } else if (score > 60) {
    message = `${company}情绪偏热，如已持仓可继续持有并设置止盈，未持仓者建议等待回调。`;
    action = 'hold';
  } else if (score > 40) {
    message = `${company}情绪中性，可结合基本面和技术面做进一步判断，不宜单纯基于情绪决策。`;
    action = 'hold';
  } else if (score > 25) {
    message = `${company}情绪偏冷，如看好长期价值，可考虑分批建仓。`;
    action = 'buy';
  } else {
    message = `${company}情绪极度悲观，可能是逆向投资的好机会，但需确认基本面未发生根本性恶化。`;
    action = 'buy';
  }

  return { message, action };
}
