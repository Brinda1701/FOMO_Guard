// Vercel Serverless Function: Multi-Agent 编排器
// 使用共享 utils 模块，支持 SSE 流式输出和普通 JSON 响应

import {
  buildAgentPrompt,
  callAIModel,
  parseAgentResult,
  fuseAgentResults,
  generateInsights,
  generateWarnings,
  generateRecommendation,
  generateSentimentSummary,
  generateTechnicalSummary,
  generatePsychologySummary,
  generateSignals,
  detectBias,
  setSecureCorsHeaders,
  setSSEHeaders,
  sendSSEEvent,
  getAgentTaskName
} from './utils.js';

import {
  fetchMarketData,
  calculateTechnicalIndicators,
  formatKlineDataForPrompt
} from './market-data.js';

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
    // 如果没有 API Key，返回模拟数据
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

    const useStream = stream === true;

    if (useStream) {
      return await streamMultiAgentAnalysis(req, res, company, action, MODELSCOPE_API_KEY, MODELSCOPE_API_URL, MODEL_NAME);
    } else {
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

  const baseScore = 50 + Math.floor(Math.random() * 30) - 15;
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
    return streamSimulation(res, result);
  } else {
    return res.status(200).json(result);
  }
}

/**
 * SSE 流式模拟输出
 */
function streamSimulation(res, result) {
  setSSEHeaders(res);

  const agents = ['sentiment', 'technical', 'psychology'];
  let delay = 500;

  setTimeout(() => sendSSEEvent(res, 'agent_start', { agent: 'sentiment', status: 'processing' }), delay);
  setTimeout(() => sendSSEEvent(res, 'agent_complete', { agent: 'sentiment', status: 'completed', score: result.breakdown.sentiment.score, data: result.breakdown.sentiment }), delay + 1500);
  setTimeout(() => sendSSEEvent(res, 'agent_start', { agent: 'technical', status: 'processing' }), delay + 2000);
  setTimeout(() => sendSSEEvent(res, 'agent_complete', { agent: 'technical', status: 'completed', score: result.breakdown.technical.score, data: result.breakdown.technical }), delay + 3500);
  setTimeout(() => sendSSEEvent(res, 'agent_start', { agent: 'psychology', status: 'processing' }), delay + 4000);
  setTimeout(() => sendSSEEvent(res, 'agent_complete', { agent: 'psychology', status: 'completed', score: result.breakdown.psychology.score, data: result.breakdown.psychology }), delay + 5500);
  setTimeout(() => sendSSEEvent(res, 'summary', result), delay + 6000);
  setTimeout(() => res.end(), delay + 6500);
}

/**
 * 真正的 Multi-Agent 分析（调用 AI）
 */
async function runMultiAgentAnalysis(req, res, company, action, apiKey, apiUrl, modelName) {
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

  const agentPromises = agents.map(async (agent) => {
    try {
      // 技术分析 Agent 传入市场数据
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
  const finalResult = fuseAgentResults(company, action, results);

  res.status(200).json(finalResult);
}

/**
 * SSE 流式 Multi-Agent 分析
 */
async function streamMultiAgentAnalysis(req, res, company, action, apiKey, apiUrl, modelName) {
  setSSEHeaders(res);

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

  for (const agent of agents) {
    sendSSEEvent(res, 'agent_start', { agent, status: 'processing' });

    try {
      sendSSEEvent(res, 'agent_progress', {
        agent,
        progress: 30,
        message: `正在分析${getAgentTaskName(agent)}...`
      });

      // 技术分析 Agent 传入市场数据
      const prompt = buildAgentPrompt(agent, company, action, agent === 'technical' ? marketData : null);
      await new Promise(resolve => setTimeout(resolve, 500));

      sendSSEEvent(res, 'agent_progress', {
        agent,
        progress: 70,
        message: '正在生成分析结果...'
      });

      const agentResult = await callAIModel(prompt, apiKey, apiUrl, modelName);
      results[agent] = parseAgentResult(agent, agentResult);

      sendSSEEvent(res, 'agent_progress', {
        agent,
        progress: 90,
        message: '分析完成，正在汇总...'
      });

      sendSSEEvent(res, 'agent_complete', {
        agent,
        status: 'completed',
        score: results[agent].score,
        data: results[agent]
      });

    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error);
      sendSSEEvent(res, 'agent_error', {
        agent,
        status: 'failed',
        error: error.message
      });
      results[agent] = { score: 50, error: error.message };
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const finalResult = fuseAgentResults(company, action, results);
  sendSSEEvent(res, 'summary', finalResult);

  res.end();
}
