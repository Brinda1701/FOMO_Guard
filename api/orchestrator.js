// Vercel Serverless Function: Multi-Agent 编排器
// 使用共享 utils 模块，支持 SSE 流式输出和普通 JSON 响应

const {
  buildAgentPrompt, callAIModel, parseAgentResult, fuseAgentResults,
  generateSentimentSummary, generateTechnicalSummary, generatePsychologySummary,
  generateSignals, detectBias, setSecureCorsHeaders, setSSEHeaders, sendSSEEvent,
  getAgentTaskName
} = require('./utils');

module.exports = async function handler(req, res) {
  setSecureCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const MODELSCOPE_API_KEY = process.env.MODELSCOPE_API_KEY;
  const MODELSCOPE_API_URL = process.env.MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1/';
  const MODEL_NAME = process.env.MODEL_NAME || 'Qwen/Qwen3.5-35B-A3B';

  if (!MODELSCOPE_API_KEY) {
    return simulateMultiAgentAnalysis(req, res);
  }

  try {
    const { company, action, stream } = req.body;

    if (!company) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }

    if (stream === true) {
      return await streamMultiAgentAnalysis(req, res, company, action, MODELSCOPE_API_KEY, MODELSCOPE_API_URL, MODEL_NAME);
    } else {
      return await runMultiAgentAnalysis(req, res, company, action, MODELSCOPE_API_KEY, MODELSCOPE_API_URL, MODEL_NAME);
    }
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

function simulateMultiAgentAnalysis(req, res) {
  const { company, action, stream } = req.body;
  const baseScore = 50 + Math.floor(Math.random() * 30) - 15;
  const sentimentScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const technicalScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const psychologyScore = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  const finalScore = Math.round((sentimentScore + technicalScore + psychologyScore) / 3);

  const result = {
    success: true, company, action: action || 'analyze', finalScore,
    consensus: Math.abs(sentimentScore - technicalScore) < 15 && Math.abs(technicalScore - psychologyScore) < 15 ? 'aligned' : 'divergent',
    breakdown: {
      sentiment: { score: sentimentScore, confidence: 0.75, summary: generateSentimentSummary(company, sentimentScore), signals: generateSignals('sentiment') },
      technical: { score: technicalScore, confidence: 0.7, summary: generateTechnicalSummary(company, technicalScore), signals: generateSignals('technical') },
      psychology: { score: psychologyScore, confidence: 0.8, summary: generatePsychologySummary(company, psychologyScore), biasDetected: detectBias(psychologyScore) }
    },
    insights: require('./utils').generateInsights(finalScore, company),
    warnings: require('./utils').generateWarnings(finalScore),
    recommendation: require('./utils').generateRecommendation(finalScore, company)
  };

  if (stream === true) {
    return streamSimulation(res, result);
  } else {
    return res.status(200).json(result);
  }
}

function streamSimulation(res, result) {
  setSSEHeaders(res);
  const sendEvent = (event, data) => sendSSEEvent(res, event, data);
  let delay = 500;
  setTimeout(() => sendEvent('agent_start', { agent: 'sentiment', status: 'processing' }), delay);
  setTimeout(() => sendEvent('agent_complete', { agent: 'sentiment', status: 'completed', score: result.breakdown.sentiment.score }), delay + 1500);
  setTimeout(() => sendEvent('agent_start', { agent: 'technical', status: 'processing' }), delay + 2000);
  setTimeout(() => sendEvent('agent_complete', { agent: 'technical', status: 'completed', score: result.breakdown.technical.score }), delay + 3500);
  setTimeout(() => sendEvent('agent_start', { agent: 'psychology', status: 'processing' }), delay + 4000);
  setTimeout(() => sendEvent('agent_complete', { agent: 'psychology', status: 'completed', score: result.breakdown.psychology.score }), delay + 5500);
  setTimeout(() => sendEvent('summary', result), delay + 6000);
  setTimeout(() => res.end(), delay + 6500);
}

async function runMultiAgentAnalysis(req, res, company, action, apiKey, apiUrl, modelName) {
  const agents = ['sentiment', 'technical', 'psychology'];
  const results = {};

  let marketData = null;
  try {
    const { fetchMarketData, calculateTechnicalIndicators } = require('./market-data');
    const klineData = await fetchMarketData(company);
    const indicators = calculateTechnicalIndicators(klineData);
    marketData = { klineData, indicators };
    console.log('[Orchestrator] 已获取市场数据:', company, klineData.length, '天');
  } catch (error) {
    console.warn('[Orchestrator] 获取市场数据失败:', error.message);
  }

  const agentPromises = agents.map(async (agent) => {
    try {
      const prompt = buildAgentPrompt(agent, company, action, agent === 'technical' ? marketData : null);
      const agentResult = await callAIModel(prompt, apiKey, apiUrl, modelName);
      results[agent] = parseAgentResult(agent, agentResult);
      return { agent, success: true, data: results[agent] };
    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error);
      return { agent, success: false, error: error.message };
    }
  });

  await Promise.all(agentPromises);
  res.status(200).json(fuseAgentResults(company, action, results));
}

async function streamMultiAgentAnalysis(req, res, company, action, apiKey, apiUrl, modelName) {
  setSSEHeaders(res);
  const agents = ['sentiment', 'technical', 'psychology'];
  const results = {};

  // 获取市场数据（仅技术分析需要）
  let marketData = null;
  try {
    const { fetchMarketData, calculateTechnicalIndicators } = require('./market-data');
    const klineData = await fetchMarketData(company);
    const indicators = calculateTechnicalIndicators(klineData);
    marketData = { klineData, indicators };
    console.log('[Orchestrator] 已获取市场数据:', company, klineData.length, '天');
  } catch (error) {
    console.warn('[Orchestrator] 获取市场数据失败:', error.message);
  }

  // 并发执行三个 Agent 任务，每个任务独立推送 SSE 事件
  const agentPromises = agents.map(async (agent) => {
    try {
      // 推送开始事件
      sendSSEEvent(res, 'agent_start', { 
        agent, 
        status: 'processing',
        timestamp: Date.now()
      });

      // 构建提示词
      const prompt = buildAgentPrompt(
        agent, 
        company, 
        action, 
        agent === 'technical' ? marketData : null
      );

      // 推送进度事件
      sendSSEEvent(res, 'agent_progress', { 
        agent, 
        progress: 30, 
        message: `正在分析${getAgentTaskName(agent)}...`,
        timestamp: Date.now()
      });

      // 异步调用 AI 模型（不阻塞其他 Agent）
      const agentResult = await callAIModel(prompt, apiKey, apiUrl, modelName);
      
      // 推送进度事件
      sendSSEEvent(res, 'agent_progress', { 
        agent, 
        progress: 70, 
        message: '正在生成分析结果...',
        timestamp: Date.now()
      });

      // 解析结果
      const parsedResult = parseAgentResult(agent, agentResult);
      results[agent] = parsedResult;

      // 推送进度事件
      sendSSEEvent(res, 'agent_progress', { 
        agent, 
        progress: 90, 
        message: '分析完成，正在汇总...',
        timestamp: Date.now()
      });

      // 推送完成事件
      sendSSEEvent(res, 'agent_complete', { 
        agent, 
        status: 'completed', 
        score: parsedResult.score, 
        data: parsedResult,
        timestamp: Date.now()
      });

      return { agent, success: true, data: parsedResult };
    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error);
      sendSSEEvent(res, 'agent_error', { 
        agent, 
        status: 'failed', 
        error: error.message,
        timestamp: Date.now()
      });
      results[agent] = { score: 50, error: error.message };
      return { agent, success: false, error: error.message };
    }
  });

  // 等待所有 Agent 完成
  await Promise.all(agentPromises);

  // 汇总结果并推送最终 summary
  const finalResult = fuseAgentResults(company, action, results);
  sendSSEEvent(res, 'summary', finalResult);

  // 结束响应
  res.end();
}
