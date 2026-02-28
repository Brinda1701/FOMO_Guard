/**
 * SentimentAgent - 情绪分析Agent
 * 职责：社交媒体情绪挖掘，舆情热度评估
 */

import { createAgentResponse, AgentType } from '../lib/agent-protocol.js';

// 情绪关键词库
const SENTIMENT_KEYWORDS = {
  positive: ['利好', '突破', '新高', '暴涨', '牛市', '买入', '增持', '推荐', '看涨', '机会'],
  negative: ['利空', '暴跌', '崩盘', '熊市', '减持', '卖出', '风险', '警告', '下跌', '亏损'],
  fomo: ['抢购', '排队', '疯狂', '火爆', '爆满', '抢不到', '错过', '后悔', '最后机会', '即将']
};

// 行业情绪基准
const SECTOR_SENTIMENT_BASE = {
  '科技': { base: 65, volatility: 15, keywords: ['AI', '芯片', '创新', '研发'] },
  '消费': { base: 55, volatility: 10, keywords: ['业绩', '销量', '品牌', '增长'] },
  '金融': { base: 45, volatility: 8, keywords: ['利率', '监管', '风控', '坏账'] },
  '新能源': { base: 60, volatility: 12, keywords: ['补贴', '产能', '出海', '电池'] },
  '医药': { base: 50, volatility: 10, keywords: ['研发', '审批', '集采', '创新药'] },
  '房地产': { base: 35, volatility: 8, keywords: ['政策', '销售', '债务', '融资'] },
  '默认': { base: 50, volatility: 10, keywords: ['业绩', '估值', '行业', '前景'] }
};

/**
 * 分析情绪得分
 * @param {string} company - 公司名称
 * @param {object} profile - 公司画像
 */
function analyzeSentiment(company, profile = {}) {
  const sector = profile.sector || '默认';
  const sectorConfig = SECTOR_SENTIMENT_BASE[sector] || SECTOR_SENTIMENT_BASE['默认'];
  
  // 基于公司画像的基础分
  const baseScore = profile.base || sectorConfig.base;
  const volatility = profile.vol || sectorConfig.volatility;
  
  // 模拟情绪波动（基于当前时间的伪随机）
  const timeHash = Date.now() % 1000;
  const randomOffset = ((timeHash / 1000) - 0.5) * volatility * 2;
  
  // 计算最终情绪分
  let sentimentScore = Math.round(baseScore + randomOffset);
  sentimentScore = Math.max(10, Math.min(90, sentimentScore));
  
  return sentimentScore;
}

/**
 * 检测FOMO信号
 * @param {number} score - 情绪分数
 * @param {object} profile - 公司画像
 */
function detectFOMOSignals(score, profile = {}) {
  const signals = [];
  
  if (score >= 75) {
    signals.push('市场情绪过热，存在追高风险');
    signals.push('社交媒体讨论量激增');
  } else if (score >= 65) {
    signals.push('情绪偏向乐观，需警惕羊群效应');
  } else if (score <= 25) {
    signals.push('市场恐慌情绪蔓延');
    signals.push('可能存在过度悲观');
  } else if (score <= 35) {
    signals.push('投资者情绪低迷');
  }
  
  return signals;
}

/**
 * 生成情绪趋势
 * @param {number} currentScore - 当前分数
 */
function generateTrend(currentScore) {
  // 生成7天趋势数据
  const trend = [];
  let baseScore = currentScore - Math.floor(Math.random() * 10);
  
  for (let i = 6; i >= 0; i--) {
    const dayOffset = (Math.random() - 0.5) * 8;
    const dayScore = Math.round(Math.max(10, Math.min(90, baseScore + dayOffset)));
    trend.push(dayScore);
    baseScore += (currentScore - baseScore) * 0.3;
  }
  
  // 确保最后一天是当前分数
  trend[6] = currentScore;
  
  // 判断趋势方向
  const avgFirst3 = (trend[0] + trend[1] + trend[2]) / 3;
  const avgLast3 = (trend[4] + trend[5] + trend[6]) / 3;
  const direction = avgLast3 > avgFirst3 + 3 ? 'rising' : 
                    avgLast3 < avgFirst3 - 3 ? 'falling' : 'stable';
  
  return { data: trend, direction };
}

/**
 * 识别认知偏差
 * @param {number} score - 情绪分数
 * @param {string} action - 用户意向动作
 */
function identifyBiases(score, action) {
  const biases = [];
  
  if (action === 'buy' && score >= 70) {
    biases.push({
      type: '羊群效应',
      description: '当大多数人都在买入时，个人容易跟随群体行为',
      severity: 'high'
    });
    biases.push({
      type: 'FOMO(错失恐惧)',
      description: '担心错过上涨行情而冲动买入',
      severity: 'high'
    });
  }
  
  if (action === 'sell' && score <= 30) {
    biases.push({
      type: '恐慌性抛售',
      description: '在市场低迷时急于割肉离场',
      severity: 'high'
    });
    biases.push({
      type: '损失厌恶',
      description: '对损失的敏感度是收益的2倍',
      severity: 'medium'
    });
  }
  
  if (action === 'buy' && score <= 30) {
    biases.push({
      type: '逆向投资验证',
      description: '在恐慌中买入需要更强的基本面支撑',
      severity: 'medium'
    });
  }
  
  return biases;
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
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    // 分析情绪分数
    const sentimentScore = analyzeSentiment(company, profile);
    
    // 检测FOMO信号
    const fomoSignals = detectFOMOSignals(sentimentScore, profile);
    
    // 生成趋势数据
    const trend = generateTrend(sentimentScore);
    
    // 识别认知偏差
    const biases = identifyBiases(sentimentScore, action);
    
    // 计算置信度
    const confidence = 0.7 + Math.random() * 0.2;
    
    // 构建insights
    const insights = [
      {
        type: 'sentiment_score',
        content: `${company}当前市场情绪指数: ${sentimentScore}分`,
        data: { score: sentimentScore }
      },
      {
        type: 'sentiment_trend',
        content: `近7日情绪走势${trend.direction === 'rising' ? '上升' : trend.direction === 'falling' ? '下降' : '平稳'}`,
        data: { trend: trend.data, direction: trend.direction }
      }
    ];
    
    // 添加偏差洞察
    if (biases.length > 0) {
      insights.push({
        type: 'cognitive_bias',
        content: `检测到${biases.length}个潜在认知偏差`,
        data: { biases }
      });
    }
    
    const executionTime = Date.now() - startTime;
    
    return createAgentResponse(task_id, AgentType.SENTIMENT, {
      score: sentimentScore,
      confidence: Math.round(confidence * 100) / 100,
      insights,
      warnings: fomoSignals,
      execution_time_ms: executionTime
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createAgentResponse(task_id, AgentType.SENTIMENT, {
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
    taskRequest.task_id = taskRequest.task_id || `sentiment_${Date.now()}`;
    taskRequest.action = taskRequest.action || 'analyze';
    taskRequest.context = taskRequest.context || {};
    
    const result = await execute(taskRequest);
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('SentimentAgent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
