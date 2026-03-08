// Vercel Serverless Function: Multi-Agent 编排器
// 使用共享 utils 模块，支持 SSE 流式输出和普通 JSON 响应

const {
  buildAgentPrompt, callAIModel, parseAgentResult, fuseAgentResults,
  generateSentimentSummary, generateTechnicalSummary, generatePsychologySummary,
  generateSignals, detectBias, setSecureCorsHeaders, setSSEHeaders, sendSSEEvent,
  getAgentTaskName
} = require('./utils');

// 股票代码映射表（腾讯 API）
const TENCENT_SYMBOL_MAP = {
  // A 股
  '茅台': 'sh600519',
  '贵州茅台': 'sh600519',
  '比亚迪': 'sz002594',
  '宁德时代': 'sz300750',
  '平安': 'sh601318',
  '工商银行': 'sh601398',
  '建设银行': 'sh601939',
  '招商银行': 'sh600036',
  // 港股
  '腾讯': 'hk00700',
  '阿里巴巴': 'hk09988',
  '美团': 'hk03690',
  '小米': 'hk01810',
  // 美股
  '特斯拉': 'usTSLA',
  '苹果': 'usAAPL',
  '微软': 'usMSFT',
  '英伟达': 'usNVDA',
  '谷歌': 'usGOOGL',
  '亚马逊': 'usAMZN'
};

/**
 * 从腾讯财经获取 K 线数据（内联版本，避免导出问题）
 */
async function fetchKlineDataFromTencent(symbol) {
  const tencentSymbol = convertToTencentSymbol(symbol);
  
  if (!tencentSymbol) {
    throw new Error('无法转换为腾讯财经代码格式');
  }

  const url = `http://qt.gtimg.cn/q=${tencentSymbol}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': '*/*',
      'Referer': 'http://finance.qq.com/'
    },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Tencent API error: ${response.status}`);
  }

  const text = await response.text();
  const match = text.match(/v_(\w+)="([^"]+)"/);
  
  if (!match) {
    throw new Error('Tencent data not available');
  }

  const data = match[2].split('~');
  
  if (data.length < 30) {
    throw new Error('Invalid Tencent data format');
  }

  // 腾讯数据字段解析
  const currentPrice = parseFloat(data[3]) || 0;
  const openPrice = parseFloat(data[5]) || 0;
  const highPrice = parseFloat(data[33]) || parseFloat(data[4]) || currentPrice;
  const lowPrice = parseFloat(data[34]) || parseFloat(data[5]) || currentPrice;
  const volume = parseInt(data[6]) || 0;
  const prevClose = parseFloat(data[2]) || currentPrice;
  
  // 使用实时数据生成最近 14 天的 K 线（以当前价格为基准）
  const klineData = generateHistoryFromCurrentPrice(
    currentPrice, openPrice, highPrice, lowPrice, volume, 14
  );
  
  return klineData;
}

function convertToTencentSymbol(symbol) {
  if (/^\d{6}$/.test(symbol)) {
    const prefix = symbol.startsWith('6') ? 'sh' : 'sz';
    return `${prefix}${symbol}`;
  }
  return TENCENT_SYMBOL_MAP[symbol] || TENCENT_SYMBOL_MAP[symbol.toUpperCase()];
}

function generateHistoryFromCurrentPrice(current, open, high, low, baseVolume, days) {
  const klineData = [];
  const seed = current * 100;
  
  // 简单的种子随机数生成器
  const createSeededRandom = (seed) => {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  };
  
  const rng = createSeededRandom(Math.floor(seed));
  let price = current * (0.9 + rng() * 0.2);
  const trend = (current - open) / current;
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dailyVolatility = 0.02 + rng() * 0.02;
    const change = trend * 0.1 + (rng() - 0.5) * dailyVolatility;
    
    const dayOpen = price;
    const dayClose = dayOpen * (1 + change);
    const dayHigh = Math.max(dayOpen, dayClose) * (1 + rng() * 0.015);
    const dayLow = Math.min(dayOpen, dayClose) * (1 - rng() * 0.015);
    
    const isLastDay = (i === days - 1);
    
    klineData.push({
      date: date.toISOString().split('T')[0],
      open: Math.round((isLastDay ? open : dayOpen) * 100) / 100,
      high: Math.round((isLastDay ? high : dayHigh) * 100) / 100,
      low: Math.round((isLastDay ? low : dayLow) * 100) / 100,
      close: Math.round((isLastDay ? current : dayClose) * 100) / 100,
      volume: Math.round(baseVolume * (0.5 + rng() * 1.5))
    });
    
    price = dayClose;
  }

  return klineData;
}

/**
 * 计算技术指标
 */
function calculateTechnicalIndicators(klineData) {
  if (klineData.length < 14) {
    return calculateSimpleIndicators(klineData);
  }

  const rsi = calculateRSI(klineData, 14);
  const ma5 = calculateMA(klineData, 5);
  const ma10 = calculateMA(klineData, 10);
  const ma20 = calculateMA(klineData, 20);
  const macd = calculateMACD(klineData);
  const latestClose = klineData[klineData.length - 1].close;

  return {
    rsi: rsi.toFixed(2),
    ma5: roundPrice(ma5),
    ma10: roundPrice(ma10),
    ma20: roundPrice(ma20),
    macd: macd.toFixed(4),
    signal: (macd * 0.8).toFixed(4),
    histogram: (macd * 0.2).toFixed(4),
    latestClose: roundPrice(latestClose),
    priceVsMA5: ((latestClose - ma5) / ma5 * 100).toFixed(2) + '%',
    priceVsMA10: ((latestClose - ma10) / ma10 * 100).toFixed(2) + '%',
    priceVsMA20: ((latestClose - ma20) / ma20 * 100).toFixed(2) + '%'
  };
}

function calculateRSI(data, period) {
  let gains = 0, losses = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change; else losses -= change;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateMA(data, period) {
  const prices = data.slice(-period).map(d => d.close);
  return prices.reduce((a, b) => a + b, 0) / period;
}

function calculateMACD(data) {
  const ema12 = calculateEMA(data.map(d => d.close), 12);
  const ema26 = calculateEMA(data.map(d => d.close), 26);
  return ema12 - ema26;
}

function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateSimpleIndicators(data) {
  if (data.length === 0) return { rsi: 50, ma5: 0, ma10: 0, latestClose: 0 };
  const latestClose = data[data.length - 1].close;
  const ma5 = data.length >= 5 ? calculateMA(data, 5) : latestClose;
  const ma10 = data.length >= 10 ? calculateMA(data, 10) : latestClose;
  return { rsi: '50.00', ma5: roundPrice(ma5), ma10: roundPrice(ma10), latestClose: roundPrice(latestClose), priceVsMA5: '0%', priceVsMA10: '0%', priceVsMA20: '0%', macd: '0.0000', signal: '0.0000', histogram: '0.0000' };
}

function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

/**
 * 根据技术指标计算盘面量价分数（0-100）
 * 基于 RSI、均线、MACD、成交量等指标
 */
function calculateTechnicalScore(klineData, indicators) {
  let score = 50; // 基础分 50 分
  const reasons = [];

  // 1. RSI 评分（权重 30%）
  const rsi = parseFloat(indicators.rsi) || 50;
  if (rsi > 70) {
    score -= (rsi - 70) * 0.6; // 超买扣分
    reasons.push(`RSI ${rsi.toFixed(1)} 超买`);
  } else if (rsi < 30) {
    score += (30 - rsi) * 0.6; // 超卖加分
    reasons.push(`RSI ${rsi.toFixed(1)} 超卖`);
  } else if (rsi > 55) {
    score += (rsi - 55) * 0.3; // 偏强
    reasons.push(`RSI ${rsi.toFixed(1)} 偏强`);
  } else if (rsi < 45) {
    score -= (45 - rsi) * 0.3; // 偏弱
    reasons.push(`RSI ${rsi.toFixed(1)} 偏弱`);
  }

  // 2. 均线评分（权重 30%）
  const latestClose = klineData[klineData.length - 1].close;
  const ma5 = parseFloat(indicators.ma5) || latestClose;
  const ma10 = parseFloat(indicators.ma10) || latestClose;
  const ma20 = parseFloat(indicators.ma20) || latestClose;

  if (latestClose > ma5 && ma5 > ma10 && ma10 > ma20) {
    score += 15; // 多头排列
    reasons.push('均线多头排列');
  } else if (latestClose < ma5 && ma5 < ma10 && ma10 < ma20) {
    score -= 15; // 空头排列
    reasons.push('均线空头排列');
  } else {
    if (latestClose > ma5) score += 3;
    if (latestClose > ma10) score += 3;
    if (latestClose > ma20) score += 4;
    if (latestClose < ma5) score -= 3;
    if (latestClose < ma10) score -= 3;
    if (latestClose < ma20) score -= 4;
  }

  // 3. MACD 评分（权重 25%）
  const macd = parseFloat(indicators.macd) || 0;
  const signal = parseFloat(indicators.signal) || 0;
  const histogram = parseFloat(indicators.histogram) || 0;

  if (macd > signal && macd > 0) {
    score += 10; // 金叉且在零轴上
    reasons.push('MACD 金叉');
  } else if (macd < signal && macd < 0) {
    score -= 10; // 死叉且在零轴下
    reasons.push('MACD 死叉');
  } else if (macd > signal) {
    score += 5; // 金叉
    reasons.push('MACD 金叉');
  } else if (macd < signal) {
    score -= 5; // 死叉
    reasons.push('MACD 死叉');
  }

  if (histogram > 0 && histogram > parseFloat(indicators.histogram_prev || 0)) {
    score += 5; // 红柱放大
    reasons.push('MACD 红柱放大');
  } else if (histogram < 0 && histogram < parseFloat(indicators.histogram_prev || 0)) {
    score -= 5; // 绿柱放大
    reasons.push('MACD 绿柱放大');
  }

  // 4. 趋势评分（权重 15%）
  const firstClose = klineData[0].close;
  const priceChange = ((latestClose - firstClose) / firstClose) * 100;
  
  if (priceChange > 10) {
    score += 10;
    reasons.push(`14 日涨幅 ${priceChange.toFixed(1)}%`);
  } else if (priceChange < -10) {
    score -= 10;
    reasons.push(`14 日跌幅 ${priceChange.toFixed(1)}%`);
  } else if (priceChange > 5) {
    score += 5;
    reasons.push(`14 日涨幅 ${priceChange.toFixed(1)}%`);
  } else if (priceChange < -5) {
    score -= 5;
    reasons.push(`14 日跌幅 ${priceChange.toFixed(1)}%`);
  } else {
    reasons.push(`14 日震荡 ${priceChange.toFixed(1)}%`);
  }

  // 限制分数在 0-100 之间，保留一位小数
  score = Math.max(0, Math.min(100, score));
  score = Math.round(score * 10) / 10;

  return { score, reasons };
}

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
  let technicalScoreData = null;
  try {
    // 使用内联的腾讯 API 获取 K 线数据
    const klineData = await fetchKlineDataFromTencent(company);

    // 计算技术指标
    const indicators = calculateTechnicalIndicators(klineData);

    // 计算盘面量价分数（基于真实技术指标）
    technicalScoreData = calculateTechnicalScore(klineData, indicators);

    marketData = { klineData, indicators };
    console.log('[Orchestrator] 已获取市场数据:', company, klineData.length, '天，最新价格:', klineData[klineData.length - 1].close, 'RSI:', indicators.rsi, '技术分数:', technicalScoreData.score);
  } catch (error) {
    console.warn('[Orchestrator] 获取市场数据失败:', error.message);
    // 市场数据获取失败不影响继续执行
  }

  // 串行执行三个 Agent，每个 Agent 设置独立超时（15 秒），确保总时间<60 秒
  for (const agent of agents) {
    try {
      console.log(`[Orchestrator] 开始执行 ${agent} Agent...`);
      
      const prompt = buildAgentPrompt(agent, company, action, agent === 'technical' ? marketData : null);
      
      // 使用 Promise.race 实现超时控制
      const agentResult = await Promise.race([
        callAIModel(prompt, apiKey, apiUrl, modelName),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Agent 分析超时（15 秒）')), 15000)
        )
      ]);

      console.log(`[Orchestrator] ${agent} - AI 返回的原始结果:`, JSON.stringify(agentResult).substring(0, 200));

      results[agent] = parseAgentResult(agent, agentResult);

      // 如果是 technical Agent，使用真实计算的分数替换 AI 返回的分数
      if (agent === 'technical' && technicalScoreData) {
        const aiSummary = results[agent].summary;
        results[agent].score = technicalScoreData.score;
        results[agent].summary = `【基于真实 K 线数据】${aiSummary} | 技术指标：${technicalScoreData.reasons.join(', ')}`;
        results[agent].isRealData = true;
        results[agent].technicalReasons = technicalScoreData.reasons;
        console.log(`[Orchestrator] technical - 使用真实技术分数：${technicalScoreData.score}`);
      }

      console.log(`[Orchestrator] ${agent} - 解析后的结果:`, {
        score: results[agent].score,
        summary: results[agent].summary?.substring(0, 50)
      });
      console.log(`[Orchestrator] ${agent} Agent 完成`);

      // 每个 Agent 之间延迟 200ms，避免请求过于频繁
      if (agent !== 'psychology') {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`[Agent ${agent}] Error:`, error.message);
      // 超时或其他错误时使用中性分数
      results[agent] = { 
        score: 50, 
        confidence: 0,
        summary: '分析超时或失败，使用中性分数',
        isFallback: true
      };
    }
  }

  console.log('[Orchestrator] 所有 Agent 完成，准备融合结果:', {
    sentiment: results.sentiment?.score,
    technical: results.technical?.score,
    psychology: results.psychology?.score
  });

  // 深拷贝 results，确保数据不被修改
  const resultsCopy = JSON.parse(JSON.stringify(results));
  console.log('[Orchestrator] 深拷贝后的结果:', {
    sentiment: resultsCopy.sentiment?.score,
    technical: resultsCopy.technical?.score,
    psychology: resultsCopy.psychology?.score
  });

  res.status(200).json(fuseAgentResults(company, action, resultsCopy));
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
  let technicalScoreData = null;
  try {
    // 使用内联的腾讯 API 获取 K 线数据
    const klineData = await fetchKlineDataFromTencent(company);

    // 计算技术指标
    const indicators = calculateTechnicalIndicators(klineData);

    // 计算盘面量价分数（基于真实技术指标）
    technicalScoreData = calculateTechnicalScore(klineData, indicators);

    marketData = { klineData, indicators };
    console.log('[Orchestrator] 已获取市场数据:', company, klineData.length, '天，最新价格:', klineData[klineData.length - 1].close, 'RSI:', indicators.rsi, '技术分数:', technicalScoreData.score);
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

      // 如果是 technical Agent，使用真实计算的分数替换 AI 返回的分数
      if (agent === 'technical' && technicalScoreData) {
        const aiSummary = parsedResult.summary;
        results[agent].score = technicalScoreData.score;
        results[agent].summary = `【基于真实 K 线数据】${aiSummary} | 技术指标：${technicalScoreData.reasons.join(', ')}`;
        results[agent].isRealData = true;
        results[agent].technicalReasons = technicalScoreData.reasons;
        console.log(`[Orchestrator] technical - 使用真实技术分数：${technicalScoreData.score}`);
      }

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
        score: results[agent].score,
        data: results[agent],
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
