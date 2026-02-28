/**
 * Orchestrator - Multi-Agent编排器
 * 职责：统筹协调，任务分发，结果聚合，实时推送
 */

import { 
  createTaskRequest, 
  AgentType, 
  AgentConfig,
  validateTaskRequest 
} from './lib/agent-protocol.js';
import { fullFusion, DEFAULT_WEIGHTS } from './lib/fusion.js';
import { createSSEManager } from './lib/stream.js';
import { execute as executeSentiment } from './agents/sentiment.js';
import { execute as executeTechnical } from './agents/technical.js';
import { execute as executePsychology } from './agents/psychology.js';

// 公司画像配置（简化版，完整版在前端config.js）
const PROFILES = {
  '茅台': { base: 72, vol: 8, sector: '消费' },
  '比亚迪': { base: 68, vol: 12, sector: '新能源' },
  '特斯拉': { base: 70, vol: 15, sector: '新能源' },
  '腾讯': { base: 58, vol: 10, sector: '科技' },
  '阿里': { base: 45, vol: 12, sector: '科技' },
  '宁德时代': { base: 65, vol: 14, sector: '新能源' },
  '中芯国际': { base: 55, vol: 18, sector: '科技' },
  '招商银行': { base: 42, vol: 6, sector: '金融' },
  '平安': { base: 40, vol: 8, sector: '金融' },
  '万科': { base: 30, vol: 10, sector: '房地产' },
  '恒瑞医药': { base: 50, vol: 10, sector: '医药' }
};

// 行业默认配置
const SECTOR_DEFAULTS = {
  '科技': { base: 60, vol: 12 },
  '消费': { base: 55, vol: 8 },
  '金融': { base: 42, vol: 7 },
  '新能源': { base: 62, vol: 13 },
  '医药': { base: 50, vol: 10 },
  '房地产': { base: 32, vol: 8 },
  '默认': { base: 50, vol: 10 }
};

/**
 * 获取公司画像
 * @param {string} company - 公司名称
 */
function getProfile(company) {
  if (PROFILES[company]) {
    return PROFILES[company];
  }
  
  // 尝试行业关键词匹配
  for (const [keyword, config] of Object.entries(SECTOR_DEFAULTS)) {
    if (company.includes(keyword)) {
      return { ...config, sector: keyword };
    }
  }
  
  // 基于公司名生成伪随机配置
  const hash = [...company].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    base: 30 + (hash % 40),
    vol: 8 + (hash % 8),
    sector: '默认'
  };
}

/**
 * 执行单个Agent并处理超时
 * @param {function} executeFn - Agent执行函数
 * @param {object} taskRequest - 任务请求
 * @param {number} timeout - 超时时间(ms)
 */
async function executeWithTimeout(executeFn, taskRequest, timeout = AgentConfig.TIMEOUT_MS) {
  return Promise.race([
    executeFn(taskRequest),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Agent timeout')), timeout)
    )
  ]);
}

/**
 * 并行执行所有Agent
 * @param {object} taskRequest - 任务请求
 * @param {object} sseManager - SSE管理器 (可选)
 */
async function executeAllAgents(taskRequest, sseManager = null) {
  const agents = [
    { name: AgentType.SENTIMENT, execute: executeSentiment },
    { name: AgentType.TECHNICAL, execute: executeTechnical },
    { name: AgentType.PSYCHOLOGY, execute: executePsychology }
  ];
  
  // 通知Agent启动
  if (sseManager) {
    for (const agent of agents) {
      sseManager.agentStart(agent.name);
    }
  }
  
  // 并行执行所有Agent
  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      try {
        // 发送进度
        if (sseManager) {
          sseManager.agentProgress(agent.name, 30, `${agent.name}正在分析...`);
        }
        
        const result = await executeWithTimeout(agent.execute, taskRequest);
        
        // 发送完成
        if (sseManager) {
          sseManager.agentComplete(result);
        }
        
        return result;
      } catch (error) {
        // 发送错误
        if (sseManager) {
          sseManager.agentError(agent.name, error.message);
        }
        
        return {
          agent: agent.name,
          status: 'failed',
          score: 50,
          confidence: 0,
          insights: [],
          warnings: [],
          error: error.message
        };
      }
    })
  );
  
  // 提取结果
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      agent: agents[index].name,
      status: 'failed',
      score: 50,
      confidence: 0,
      insights: [],
      warnings: [],
      error: result.reason?.message || 'Unknown error'
    };
  });
}

/**
 * 非流式处理
 * @param {object} req - HTTP请求对象
 * @param {object} res - HTTP响应对象
 */
async function handleNonStreaming(req, res) {
  const { company, action = 'analyze', weights } = req.body;
  
  // 获取公司画像
  const profile = getProfile(company);
  
  // 创建任务请求
  const taskRequest = createTaskRequest(company, action, {
    market_profile: profile
  });
  
  // 执行所有Agent
  const agentResults = await executeAllAgents(taskRequest);
  
  // 融合结果
  const customWeights = weights || DEFAULT_WEIGHTS;
  const fusionResult = fullFusion(agentResults, action, customWeights);
  
  // 返回结果
  res.status(200).json({
    success: true,
    task_id: taskRequest.task_id,
    company,
    action,
    profile,
    ...fusionResult,
    agents_results: agentResults.reduce((acc, result) => {
      acc[result.agent.toLowerCase().replace('agent', '')] = result;
      return acc;
    }, {})
  });
}

/**
 * 流式处理 (SSE)
 * @param {object} req - HTTP请求对象
 * @param {object} res - HTTP响应对象
 */
async function handleStreaming(req, res) {
  const { company, action = 'analyze', weights } = req.body;
  
  // 创建SSE管理器
  const sseManager = createSSEManager(res);
  
  try {
    // 获取公司画像
    const profile = getProfile(company);
    
    // 创建任务请求
    const taskRequest = createTaskRequest(company, action, {
      market_profile: profile
    });
    
    // 执行所有Agent (带SSE推送)
    const agentResults = await executeAllAgents(taskRequest, sseManager);
    
    // 融合结果
    const customWeights = weights || DEFAULT_WEIGHTS;
    const fusionResult = fullFusion(agentResults, action, customWeights);
    
    // 发送总结
    sseManager.summary({
      task_id: taskRequest.task_id,
      company,
      action,
      profile,
      ...fusionResult
    });
    
    // 结束流
    sseManager.end();
    
  } catch (error) {
    sseManager.summary({
      success: false,
      error: error.message
    });
    sseManager.end();
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
    const { company, stream = false } = req.body;
    
    // 验证请求
    if (!company) {
      return res.status(400).json({ 
        success: false, 
        error: 'company is required' 
      });
    }
    
    // 根据stream参数选择处理方式
    if (stream) {
      await handleStreaming(req, res);
    } else {
      await handleNonStreaming(req, res);
    }
    
  } catch (error) {
    console.error('Orchestrator Error:', error);
    
    // 如果还没有发送响应头
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
