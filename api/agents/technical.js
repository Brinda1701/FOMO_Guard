/**
 * TechnicalAgent - 技术分析Agent
 * 职责：技术面分析，历史波动建模，支撑压力位评估
 */

import { createAgentResponse, AgentType } from '../lib/agent-protocol.js';

// 技术指标配置
const TECHNICAL_INDICATORS = {
  RSI: { overbought: 70, oversold: 30, weight: 0.3 },
  MACD: { weight: 0.25 },
  MA: { periods: [5, 10, 20, 60], weight: 0.25 },
  VOLUME: { weight: 0.2 }
};

// 行业技术特征
const SECTOR_TECHNICAL_PROFILE = {
  '科技': { avgVolatility: 0.035, trendStrength: 0.7, momentumBias: 0.6 },
  '消费': { avgVolatility: 0.02, trendStrength: 0.5, momentumBias: 0.45 },
  '金融': { avgVolatility: 0.018, trendStrength: 0.4, momentumBias: 0.4 },
  '新能源': { avgVolatility: 0.04, trendStrength: 0.65, momentumBias: 0.55 },
  '医药': { avgVolatility: 0.028, trendStrength: 0.55, momentumBias: 0.5 },
  '房地产': { avgVolatility: 0.025, trendStrength: 0.35, momentumBias: 0.35 },
  '默认': { avgVolatility: 0.025, trendStrength: 0.5, momentumBias: 0.5 }
};

/**
 * 模拟RSI指标
 * @param {number} baseScore - 基础情绪分
 * @param {number} volatility - 波动率
 */
function calculateRSI(baseScore, volatility) {
  // 基于情绪分模拟RSI
  const rsi = baseScore + (Math.random() - 0.5) * volatility * 0.5;
  return Math.max(10, Math.min(90, Math.round(rsi)));
}

/**
 * 计算支撑压力位
 * @param {number} currentScore - 当前分数
 * @param {number} volatility - 波动率
 */
function calculateSupportResistance(currentScore, volatility) {
  const range = volatility * 1.5;
  
  return {
    resistance: Math.min(95, Math.round(currentScore + range)),
    support: Math.max(5, Math.round(currentScore - range)),
    strongResistance: Math.min(100, Math.round(currentScore + range * 1.5)),
    strongSupport: Math.max(0, Math.round(currentScore - range * 1.5))
  };
}

/**
 * 生成历史回测概率
 * @param {number} score - 技术评分
 * @param {string} action - 操作意向
 */
function generateBacktestProbability(score, action) {
  // 基于历史模拟数据生成回测结果
  const periods = [7, 14, 30];
  const results = [];
  
  for (const days of periods) {
    let profitProb, avgReturn;
    
    if (action === 'buy') {
      // 高分买入 = 低盈利概率
      profitProb = Math.max(20, 80 - score * 0.6 + (Math.random() - 0.5) * 10);
      avgReturn = score > 60 ? -(score - 50) * 0.15 : (60 - score) * 0.2;
    } else if (action === 'sell') {
      // 低分卖出 = 后悔概率高
      profitProb = Math.max(20, score * 0.7 + (Math.random() - 0.5) * 10);
      avgReturn = score < 40 ? (40 - score) * 0.2 : -(score - 40) * 0.1;
    } else {
      profitProb = 50 + (Math.random() - 0.5) * 20;
      avgReturn = (Math.random() - 0.5) * 5;
    }
    
    results.push({
      period: days,
      profitProbability: Math.round(Math.max(15, Math.min(85, profitProb))),
      avgReturn: Math.round(avgReturn * 10) / 10
    });
  }
  
  return results;
}

/**
 * 分析波动率风险
 * @param {object} profile - 公司画像
 * @param {object} sectorProfile - 行业技术特征
 */
function analyzeVolatilityRisk(profile, sectorProfile) {
  const volatility = profile.vol || 10;
  const avgVolatility = sectorProfile.avgVolatility * 100 * 10; // 转换为同一量级
  
  let riskLevel, description;
  
  if (volatility > avgVolatility * 1.3) {
    riskLevel = 'high';
    description = '波动率显著高于行业平均，价格波动剧烈';
  } else if (volatility > avgVolatility * 0.8) {
    riskLevel = 'medium';
    description = '波动率处于正常区间';
  } else {
    riskLevel = 'low';
    description = '波动率较低，价格相对稳定';
  }
  
  return {
    current: volatility,
    sectorAvg: Math.round(avgVolatility),
    riskLevel,
    description
  };
}

/**
 * 生成技术面综合评分
 * @param {object} profile - 公司画像
 * @param {object} sectorProfile - 行业特征
 */
function calculateTechnicalScore(profile, sectorProfile) {
  const baseScore = profile.base || 50;
  const volatility = profile.vol || 10;
  
  // RSI贡献
  const rsi = calculateRSI(baseScore, volatility);
  let rsiScore;
  if (rsi > TECHNICAL_INDICATORS.RSI.overbought) {
    rsiScore = 100 - rsi; // 超买区间，技术面偏空
  } else if (rsi < TECHNICAL_INDICATORS.RSI.oversold) {
    rsiScore = 100 - rsi; // 超卖区间，技术面偏多
  } else {
    rsiScore = 50 + (50 - rsi) * 0.5; // 中性区间
  }
  
  // 趋势强度贡献
  const trendScore = sectorProfile.trendStrength * 100;
  
  // 动量偏差贡献
  const momentumScore = sectorProfile.momentumBias * 100;
  
  // 综合计算
  const technicalScore = Math.round(
    rsiScore * 0.4 +
    trendScore * 0.3 +
    momentumScore * 0.3
  );
  
  return {
    score: Math.max(10, Math.min(90, technicalScore)),
    rsi,
    trendStrength: Math.round(sectorProfile.trendStrength * 100),
    momentum: Math.round(sectorProfile.momentumBias * 100)
  };
}

/**
 * Agent主执行函数
 * @param {object} taskRequest - 任务请求
 */
export async function execute(taskRequest) {
  const startTime = Date.now();
  const { task_id, company, action, context } = taskRequest;
  const profile = context?.market_profile || {};
  
  try {
    // 模拟计算延迟
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));
    
    // 获取行业配置
    const sector = profile.sector || '默认';
    const sectorProfile = SECTOR_TECHNICAL_PROFILE[sector] || SECTOR_TECHNICAL_PROFILE['默认'];
    
    // 计算技术面评分
    const technicalResult = calculateTechnicalScore(profile, sectorProfile);
    
    // 计算支撑压力位
    const levels = calculateSupportResistance(technicalResult.score, profile.vol || 10);
    
    // 波动率风险分析
    const volatilityRisk = analyzeVolatilityRisk(profile, sectorProfile);
    
    // 历史回测概率
    const backtestResults = generateBacktestProbability(technicalResult.score, action);
    
    // 计算置信度
    const confidence = 0.65 + Math.random() * 0.2;
    
    // 构建insights
    const insights = [
      {
        type: 'technical_score',
        content: `技术面综合评分: ${technicalResult.score}分`,
        data: {
          score: technicalResult.score,
          rsi: technicalResult.rsi,
          trendStrength: technicalResult.trendStrength,
          momentum: technicalResult.momentum
        }
      },
      {
        type: 'support_resistance',
        content: `支撑位: ${levels.support} | 压力位: ${levels.resistance}`,
        data: levels
      },
      {
        type: 'volatility_risk',
        content: volatilityRisk.description,
        data: volatilityRisk
      },
      {
        type: 'backtest',
        content: `历史回测: ${backtestResults[0].period}日盈利概率 ${backtestResults[0].profitProbability}%`,
        data: { results: backtestResults }
      }
    ];
    
    // 生成警告
    const warnings = [];
    if (technicalResult.rsi > 70) {
      warnings.push(`RSI指标${technicalResult.rsi}已进入超买区间`);
    } else if (technicalResult.rsi < 30) {
      warnings.push(`RSI指标${technicalResult.rsi}已进入超卖区间`);
    }
    if (volatilityRisk.riskLevel === 'high') {
      warnings.push('当前波动率处于高位，注意风险控制');
    }
    
    const executionTime = Date.now() - startTime;
    
    return createAgentResponse(task_id, AgentType.TECHNICAL, {
      score: technicalResult.score,
      confidence: Math.round(confidence * 100) / 100,
      insights,
      warnings,
      execution_time_ms: executionTime
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createAgentResponse(task_id, AgentType.TECHNICAL, {
      score: 50,
      confidence: 0,
      insights: [],
      warnings: [],
      execution_time_ms: executionTime,
      error: error.message
    });
  }
}

/**
 * Vercel Serverless Handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const taskRequest = req.body;
    
    if (!taskRequest.company) {
      return res.status(400).json({ success: false, error: 'company is required' });
    }
    
    // 添加默认值
    taskRequest.task_id = taskRequest.task_id || `technical_${Date.now()}`;
    taskRequest.action = taskRequest.action || 'analyze';
    taskRequest.context = taskRequest.context || {};
    
    const result = await execute(taskRequest);
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('TechnicalAgent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
