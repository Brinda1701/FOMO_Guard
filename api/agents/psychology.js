/**
 * PsychologyAgent - 心理诊断Agent
 * 职责：行为金融学诊断，认知偏误识别，冷却建议
 */

import { createAgentResponse, AgentType } from '../lib/agent-protocol.js';

// 心理学诊断库
const PSYCHOLOGY_DIAGNOSES = {
  buy: {
    high: {
      icon: '🚨',
      title: '极端贪婪警告',
      type: 'warning',
      biases: ['FOMO(错失恐惧)', '羊群效应', '过度自信'],
      message: '市场情绪高涨时买入，历史上80%的投资者会在随后回调中亏损',
      quote: '华尔街名言：当擦鞋童都在谈论股票时，就是该离场的时候了',
      riskLevel: 'high',
      cooldownRequired: true
    },
    medium: {
      icon: '⚠️',
      title: '情绪偏热提示',
      type: 'caution',
      biases: ['确认偏误', '锚定效应'],
      message: '当前情绪偏向乐观，建议审视买入理由是否基于基本面',
      quote: '投资大师彼得·林奇：知道自己为什么买入，比买入本身更重要',
      riskLevel: 'medium',
      cooldownRequired: false
    },
    low: {
      icon: '💎',
      title: '逆向投资验证',
      type: 'opportunity',
      biases: ['恐惧心理'],
      message: '市场恐慌时买入需要勇气，但更需要扎实的基本面研究',
      quote: '巴菲特：在别人恐惧时贪婪，在别人贪婪时恐惧',
      riskLevel: 'medium',
      cooldownRequired: false
    }
  },
  sell: {
    high: {
      icon: '📈',
      title: '止盈时机评估',
      type: 'neutral',
      biases: ['处置效应', '过度自信'],
      message: '市场高涨时卖出获利是理性选择，但警惕过早离场',
      quote: '没有人因为获利卖出而破产，但无数人因为贪婪持有而归零',
      riskLevel: 'low',
      cooldownRequired: false
    },
    medium: {
      icon: '🤔',
      title: '卖出动机分析',
      type: 'neutral',
      biases: ['损失厌恶'],
      message: '检视卖出动机：是基于理性判断还是情绪波动',
      quote: '投资决策应该基于事实，而非情绪',
      riskLevel: 'low',
      cooldownRequired: false
    },
    low: {
      icon: '⏰',
      title: '恐慌抛售警告',
      type: 'warning',
      biases: ['恐慌性抛售', '损失厌恶', '从众心理'],
      message: '低迷时卖出很可能是在"割肉"，损失厌恶让痛苦放大2倍',
      quote: '股市名言：散户永远买在最高点，卖在最低点',
      riskLevel: 'high',
      cooldownRequired: true
    }
  },
  hold: {
    high: {
      icon: '🧘',
      title: '成功抵御FOMO',
      type: 'positive',
      biases: [],
      message: '在情绪高涨时选择观望，成功抵御了错失恐惧症',
      quote: '查理·芒格：大钱不是买卖得来的，而是等待得来的',
      riskLevel: 'low',
      cooldownRequired: false
    },
    medium: {
      icon: '⏳',
      title: '理性观察模式',
      type: 'neutral',
      biases: [],
      message: '市场中性时保持观望是稳健策略',
      quote: '空仓也是一种仓位，有时不做决策就是最好的决策',
      riskLevel: 'low',
      cooldownRequired: false
    },
    low: {
      icon: '🔍',
      title: '恐慌中的冷静',
      type: 'positive',
      biases: [],
      message: '面对市场恐慌选择观望而非冲动抄底，体现成熟投资者素养',
      quote: '等待更明确的信号，耐心是投资者最大的美德',
      riskLevel: 'low',
      cooldownRequired: false
    }
  }
};

// 认知偏差详细解释
const BIAS_EXPLANATIONS = {
  'FOMO(错失恐惧)': {
    description: '害怕错过上涨行情而产生的焦虑和冲动买入行为',
    trigger: '看到他人获利或市场快速上涨',
    mitigation: '制定投资计划，设定买入条件，避免情绪化决策'
  },
  '羊群效应': {
    description: '跟随大多数人的投资决策，忽视自己的独立判断',
    trigger: '社交媒体热议、朋友推荐、新闻大肆报道',
    mitigation: '做好独立研究，逆向思考市场共识'
  },
  '过度自信': {
    description: '高估自己的投资能力和信息优势',
    trigger: '连续盈利、认为自己比市场聪明',
    mitigation: '保持谦逊，记录投资决策复盘错误'
  },
  '确认偏误': {
    description: '只关注支持自己观点的信息，忽视相反证据',
    trigger: '已经持有某只股票或做出决策',
    mitigation: '主动寻找反面观点，客观评估信息'
  },
  '锚定效应': {
    description: '过度依赖第一个获得的信息作为决策参考',
    trigger: '以买入价或历史高点作为卖出参考',
    mitigation: '关注当前价值和未来前景，忽略沉没成本'
  },
  '损失厌恶': {
    description: '对损失的敏感度约是收益的2倍',
    trigger: '账面亏损时产生强烈的情绪反应',
    mitigation: '设定止损点，理性面对亏损'
  },
  '恐慌性抛售': {
    description: '在市场下跌时因恐惧而急于卖出',
    trigger: '市场暴跌、负面新闻、他人抛售',
    mitigation: '回顾投资逻辑，基本面未变则持有'
  },
  '处置效应': {
    description: '倾向于过早卖出盈利股票，过久持有亏损股票',
    trigger: '账面盈利或亏损',
    mitigation: '制定止盈止损规则并严格执行'
  },
  '从众心理': {
    description: '跟随群体行为，放弃独立思考',
    trigger: '市场剧烈波动时',
    mitigation: '保持独立判断，逆向思维'
  },
  '恐惧心理': {
    description: '对未知和风险的本能回避',
    trigger: '市场不确定性增加',
    mitigation: '理性评估风险收益比'
  }
};

/**
 * 计算心理风险评分
 * @param {number} sentimentScore - 情绪分数
 * @param {string} action - 操作意向
 */
function calculatePsychologyScore(sentimentScore, action) {
  let score;
  
  // 基于情绪和操作计算心理风险
  if (action === 'buy') {
    // 买入：情绪越高，心理风险越高
    score = sentimentScore;
  } else if (action === 'sell') {
    // 卖出：情绪越低，心理风险越高
    score = 100 - sentimentScore;
  } else {
    // 观望：心理风险较低
    score = Math.abs(50 - sentimentScore) + 25;
  }
  
  // 添加随机波动
  score += (Math.random() - 0.5) * 10;
  
  return Math.max(10, Math.min(90, Math.round(score)));
}

/**
 * 获取心理诊断结果
 * @param {string} action - 操作意向
 * @param {number} sentimentScore - 情绪分数
 */
function getDiagnosis(action, sentimentScore) {
  const actionDiagnoses = PSYCHOLOGY_DIAGNOSES[action] || PSYCHOLOGY_DIAGNOSES['hold'];
  
  let level;
  if (sentimentScore >= 65) {
    level = 'high';
  } else if (sentimentScore >= 35) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  return actionDiagnoses[level];
}

/**
 * 获取偏差详细解释
 * @param {string[]} biases - 偏差类型列表
 */
function getBiasDetails(biases) {
  return biases.map(bias => ({
    name: bias,
    ...BIAS_EXPLANATIONS[bias] || {
      description: '未知偏差类型',
      trigger: '-',
      mitigation: '-'
    }
  }));
}

/**
 * 生成心理引导建议
 * @param {object} diagnosis - 诊断结果
 * @param {string} action - 操作意向
 */
function generateGuidance(diagnosis, action) {
  const guidanceList = [];
  
  if (diagnosis.cooldownRequired) {
    guidanceList.push({
      type: 'cooldown',
      content: '建议启动5分钟冷静期，进行深呼吸放松',
      priority: 'high'
    });
  }
  
  if (diagnosis.biases.length > 0) {
    guidanceList.push({
      type: 'awareness',
      content: `当前可能存在${diagnosis.biases.join('、')}等认知偏差`,
      priority: 'medium'
    });
  }
  
  guidanceList.push({
    type: 'question',
    content: action === 'buy' 
      ? '问问自己：如果这只股票明天下跌20%，我还会买入吗？'
      : action === 'sell'
      ? '问问自己：卖出的理由是基于理性分析还是情绪波动？'
      : '保持观望是当前的理性选择',
    priority: 'low'
  });
  
  return guidanceList;
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
    // 模拟分析延迟
    await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 450));
    
    // 获取情绪基准分
    const sentimentBase = profile.base || 50;
    
    // 计算心理风险评分
    const psychologyScore = calculatePsychologyScore(sentimentBase, action);
    
    // 获取诊断结果
    const diagnosis = getDiagnosis(action, sentimentBase);
    
    // 获取偏差详情
    const biasDetails = getBiasDetails(diagnosis.biases);
    
    // 生成引导建议
    const guidance = generateGuidance(diagnosis, action);
    
    // 计算置信度
    const confidence = 0.75 + Math.random() * 0.15;
    
    // 构建insights
    const insights = [
      {
        type: 'psychology_diagnosis',
        content: `${diagnosis.icon} ${diagnosis.title}`,
        data: {
          type: diagnosis.type,
          message: diagnosis.message,
          quote: diagnosis.quote
        }
      },
      {
        type: 'cognitive_biases',
        content: diagnosis.biases.length > 0 
          ? `检测到${diagnosis.biases.length}个潜在认知偏差`
          : '未检测到明显认知偏差',
        data: { biases: biasDetails }
      },
      {
        type: 'guidance',
        content: guidance[0].content,
        data: { guidance }
      }
    ];
    
    // 生成警告
    const warnings = [];
    if (diagnosis.cooldownRequired) {
      warnings.push(`${diagnosis.title}：建议启动冷静期后再做决策`);
    }
    if (diagnosis.riskLevel === 'high') {
      warnings.push(diagnosis.message);
    }
    
    const executionTime = Date.now() - startTime;
    
    return createAgentResponse(task_id, AgentType.PSYCHOLOGY, {
      score: psychologyScore,
      confidence: Math.round(confidence * 100) / 100,
      insights,
      warnings,
      execution_time_ms: executionTime,
      // 额外字段
      diagnosis: {
        title: diagnosis.title,
        type: diagnosis.type,
        riskLevel: diagnosis.riskLevel,
        cooldownRequired: diagnosis.cooldownRequired
      }
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createAgentResponse(task_id, AgentType.PSYCHOLOGY, {
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
    taskRequest.task_id = taskRequest.task_id || `psychology_${Date.now()}`;
    taskRequest.action = taskRequest.action || 'analyze';
    taskRequest.context = taskRequest.context || {};
    
    const result = await execute(taskRequest);
    
    res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('PsychologyAgent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
