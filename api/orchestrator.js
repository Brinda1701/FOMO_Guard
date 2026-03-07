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
  // 使用响应速度更快的模型（避免 60 秒超时）
  // 推荐：Qwen/Qwen2.5-32B-Instruct (速度快，性能好)
  const MODEL_NAME = process.env.MODEL_NAME || 'Qwen/Qwen2.5-32B-Instruct';
  
  console.log('[Orchestrator] 使用模型:', MODEL_NAME);

  // 检查 API Key 配置
  if (!MODELSCOPE_API_KEY) {
    console.error('[Orchestrator] MODELSCOPE_API_KEY 未配置！');
    return res.status(500).json({ 
      success: false, 
      error: 'AI API Key 未配置，请在 Vercel 环境变量中设置 MODELSCOPE_API_KEY' 
    });
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

  // 串行执行三个 Agent，避免触发 API 限流
  for (const agent of agents) {
    try {
      console.log(`[Orchestrator] 开始执行 ${agent} Agent...`);
      
      const prompt = buildAgentPrompt(agent, company, action, agent === 'technical' ? marketData : null);
      const agentResult = await callAIModel(prompt, apiKey, apiUrl, modelName);
      results[agent] = parseAgentResult(agent, agentResult);
      
      console.log(`[Orchestrator] ${agent} Agent 完成`);
      
      // 每个 Agent 之间延迟 500ms，避免请求过于频繁
      if (agent !== 'psychology') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error);
      results[agent] = { score: 50, error: error.message };
    }
  }

  res.status(200).json(fuseAgentResults(company, action, results));
}

async function streamMultiAgentAnalysis(req, res, company, action, apiKey, apiUrl, modelName) {
  setSSEHeaders(res);
  const agents = ['sentiment', 'technical', 'psychology'];
  const results = {};

  // 启动 SSE 响应
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // 心跳定时器（Keep-Alive Interval）- 每 3 秒发送一次心跳防止连接超时
  const keepAliveInterval = setInterval(() => {
    // SSE 注释格式，前端会自动忽略但能保持 TCP 连接不断开
    res.write(':\n\n');
  }, 3000);

  // 确保在连接关闭时清除定时器
  req.on('close', () => {
    console.log('[Orchestrator] 客户端断开连接，清除心跳定时器');
    clearInterval(keepAliveInterval);
  });

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

  // 串行执行三个 Agent 任务，避免触发 API 限流
  for (const agent of agents) {
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

      // 调用 AI 模型
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

      console.log(`[Orchestrator] ${agent} Agent 完成`);
      
      // 每个 Agent 之间延迟 500ms，避免请求过于频繁
      if (agent !== 'psychology') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error);
      sendSSEEvent(res, 'agent_error', {
        agent,
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      });
      results[agent] = { score: 50, error: error.message };
    }
  }

  try {
    // 汇总结果并推送最终 summary
    const finalResult = fuseAgentResults(company, action, results);
    sendSSEEvent(res, 'summary', finalResult);
  } catch (error) {
    console.error('[Orchestrator] 汇总结果时出错:', error);
    sendSSEEvent(res, 'error', {
      error: error.message,
      timestamp: Date.now()
    });
  } finally {
    // 清除心跳定时器
    clearInterval(keepAliveInterval);
    console.log('[Orchestrator] 分析完成，已清除心跳定时器');

    // 结束响应
    res.end();
  }
}
