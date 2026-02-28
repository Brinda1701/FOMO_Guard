/**
 * Multi-Agent结果融合算法
 * 将多个Agent的分析结果聚合为最终决策
 */

/**
 * 默认权重配置
 * sentiment: 情绪分析权重最高(产品核心定位)
 * technical: 技术面参考
 * psychology: 心理诊断辅助
 */
export const DEFAULT_WEIGHTS = {
  sentiment: 0.5,
  technical: 0.3,
  psychology: 0.2
};

/**
 * 计算标准差
 * @param {number[]} values - 数值数组
 */
export function calculateStdDev(values) {
  const n = values.length;
  if (n === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / n;
  
  return Math.sqrt(variance);
}

/**
 * 融合多个Agent的分数
 * @param {object} scores - Agent分数对象 {sentiment, technical, psychology}
 * @param {object} weights - 权重配置 (可选)
 */
export function fusionScores(scores, weights = DEFAULT_WEIGHTS) {
  const { sentiment = 50, technical = 50, psychology = 50 } = scores;
  
  // 加权平均计算最终分数
  const finalScore = Math.round(
    sentiment * weights.sentiment +
    technical * weights.technical +
    psychology * weights.psychology
  );
  
  // 计算一致性(标准差分析)
  const scoreArray = [sentiment, technical, psychology];
  const stdDev = calculateStdDev(scoreArray);
  
  // 标准差>20视为分歧较大
  const consensus = stdDev > 20 ? 'divergent' : 'aligned';
  
  return {
    finalScore: Math.max(0, Math.min(100, finalScore)),
    consensus,
    stdDev: Math.round(stdDev * 10) / 10,
    weights,
    breakdown: {
      sentiment: { score: sentiment, weight: weights.sentiment, contribution: Math.round(sentiment * weights.sentiment) },
      technical: { score: technical, weight: weights.technical, contribution: Math.round(technical * weights.technical) },
      psychology: { score: psychology, weight: weights.psychology, contribution: Math.round(psychology * weights.psychology) }
    }
  };
}

/**
 * 根据融合结果生成风险等级
 * @param {number} finalScore - 最终分数
 * @param {string} consensus - 一致性状态
 */
export function determineRiskLevel(finalScore, consensus) {
  // 分歧较大时自动提升风险等级
  if (consensus === 'divergent') {
    return finalScore > 50 ? 'high' : 'medium';
  }
  
  if (finalScore >= 70) return 'high';
  if (finalScore >= 40) return 'medium';
  return 'low';
}

/**
 * 生成综合建议
 * @param {number} finalScore - 最终分数
 * @param {string} action - 用户意向动作
 * @param {string} consensus - Agent一致性
 */
export function generateRecommendation(finalScore, action, consensus) {
  const riskLevel = determineRiskLevel(finalScore, consensus);
  
  // 分歧较大时的特殊处理
  if (consensus === 'divergent') {
    return {
      action: 'caution',
      riskLevel,
      message: `多维度分析存在分歧，建议谨慎决策。当前情绪指数 ${finalScore}，请综合考虑各Agent的具体建议。`,
      shouldCooldown: action === 'buy' && finalScore > 50
    };
  }
  
  // 买入场景
  if (action === 'buy') {
    if (finalScore >= 70) {
      return {
        action: 'cooldown',
        riskLevel: 'high',
        message: `市场情绪高涨(${finalScore}分)，3个Agent一致认为存在FOMO风险。建议启动冷静期。`,
        shouldCooldown: true
      };
    }
    if (finalScore <= 30) {
      return {
        action: 'opportunity',
        riskLevel: 'medium',
        message: `市场情绪低迷(${finalScore}分)，可能存在逆向投资机会，但需确认基本面。`,
        shouldCooldown: false
      };
    }
  }
  
  // 卖出场景
  if (action === 'sell') {
    if (finalScore <= 30) {
      return {
        action: 'cooldown',
        riskLevel: 'high',
        message: `市场情绪恐慌(${finalScore}分)，存在恐慌性抛售风险。建议冷静评估。`,
        shouldCooldown: true
      };
    }
    if (finalScore >= 70) {
      return {
        action: 'consider',
        riskLevel: 'low',
        message: `市场情绪高涨(${finalScore}分)，止盈离场可能是理性选择。`,
        shouldCooldown: false
      };
    }
  }
  
  // 默认/观望场景
  return {
    action: 'neutral',
    riskLevel,
    message: `当前情绪指数 ${finalScore}，市场处于相对平稳状态。`,
    shouldCooldown: false
  };
}

/**
 * 聚合多个Agent的insights
 * @param {object[]} agentResults - Agent结果数组
 */
export function aggregateInsights(agentResults) {
  const allInsights = [];
  const allWarnings = [];
  
  for (const result of agentResults) {
    if (result.status === 'completed') {
      if (result.insights && result.insights.length > 0) {
        allInsights.push(...result.insights.map(insight => ({
          ...insight,
          source: result.agent
        })));
      }
      if (result.warnings && result.warnings.length > 0) {
        allWarnings.push(...result.warnings.map(warning => ({
          text: warning,
          source: result.agent
        })));
      }
    }
  }
  
  return { insights: allInsights, warnings: allWarnings };
}

/**
 * 完整的融合流程
 * @param {object[]} agentResults - Agent结果数组
 * @param {string} action - 用户意向动作
 * @param {object} weights - 自定义权重 (可选)
 */
export function fullFusion(agentResults, action = 'analyze', weights = DEFAULT_WEIGHTS) {
  // 提取各Agent分数
  const scores = {};
  const successfulAgents = [];
  
  for (const result of agentResults) {
    if (result.status === 'completed') {
      const agentKey = result.agent.toLowerCase().replace('agent', '');
      scores[agentKey] = result.score;
      successfulAgents.push(result.agent);
    }
  }
  
  // 如果没有成功的Agent，返回默认结果
  if (successfulAgents.length === 0) {
    return {
      success: false,
      error: 'All agents failed',
      finalScore: 50,
      riskLevel: 'unknown',
      recommendation: {
        action: 'error',
        message: '所有分析Agent均未返回结果，请稍后重试。',
        shouldCooldown: false
      }
    };
  }
  
  // 融合分数
  const fusionResult = fusionScores(scores, weights);
  
  // 生成建议
  const recommendation = generateRecommendation(fusionResult.finalScore, action, fusionResult.consensus);
  
  // 聚合insights
  const { insights, warnings } = aggregateInsights(agentResults);
  
  return {
    success: true,
    finalScore: fusionResult.finalScore,
    consensus: fusionResult.consensus,
    stdDev: fusionResult.stdDev,
    breakdown: fusionResult.breakdown,
    riskLevel: recommendation.riskLevel,
    recommendation,
    insights,
    warnings,
    agents: {
      total: agentResults.length,
      successful: successfulAgents.length,
      list: successfulAgents
    }
  };
}

export default {
  DEFAULT_WEIGHTS,
  calculateStdDev,
  fusionScores,
  determineRiskLevel,
  generateRecommendation,
  aggregateInsights,
  fullFusion
};
