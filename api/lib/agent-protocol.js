/**
 * Agent通信协议
 * 定义Multi-Agent系统中的标准请求/响应格式
 */

/**
 * 生成唯一任务ID
 */
export function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建Agent任务请求
 * @param {string} company - 公司名称
 * @param {string} action - 操作意向 (buy/sell/hold/analyze)
 * @param {object} context - 上下文数据
 */
export function createTaskRequest(company, action = 'analyze', context = {}) {
  return {
    task_id: generateTaskId(),
    company,
    action,
    context,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建Agent响应
 * @param {string} taskId - 任务ID
 * @param {string} agentName - Agent名称
 * @param {object} result - 分析结果
 */
export function createAgentResponse(taskId, agentName, result) {
  return {
    task_id: taskId,
    agent: agentName,
    status: result.error ? 'failed' : 'completed',
    score: result.score || 50,
    confidence: result.confidence || 0.5,
    insights: result.insights || [],
    warnings: result.warnings || [],
    execution_time_ms: result.execution_time_ms || 0,
    error: result.error || null
  };
}

/**
 * Agent状态枚举
 */
export const AgentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Agent类型枚举
 */
export const AgentType = {
  SENTIMENT: 'SentimentAgent',
  TECHNICAL: 'TechnicalAgent',
  PSYCHOLOGY: 'PsychologyAgent',
  ORCHESTRATOR: 'Orchestrator'
};

/**
 * 创建SSE事件数据
 * @param {string} eventType - 事件类型
 * @param {object} data - 事件数据
 */
export function createSSEEvent(eventType, data) {
  return {
    event: eventType,
    data: JSON.stringify(data)
  };
}

/**
 * SSE事件类型
 */
export const SSEEventType = {
  AGENT_START: 'agent_start',
  AGENT_PROGRESS: 'agent_progress',
  AGENT_COMPLETE: 'agent_complete',
  AGENT_ERROR: 'agent_error',
  ORCHESTRATOR_SUMMARY: 'orchestrator_summary'
};

/**
 * 验证任务请求格式
 * @param {object} request - 请求对象
 */
export function validateTaskRequest(request) {
  const errors = [];
  
  if (!request.company || typeof request.company !== 'string') {
    errors.push('company is required and must be a string');
  }
  
  if (request.action && !['buy', 'sell', 'hold', 'analyze'].includes(request.action)) {
    errors.push('action must be one of: buy, sell, hold, analyze');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 默认Agent配置
 */
export const AgentConfig = {
  TIMEOUT_MS: 5000,        // 单个Agent超时时间
  TOTAL_TIMEOUT_MS: 8000,  // 总流程超时时间
  MIN_CONFIDENCE: 0.3,     // 最低置信度阈值
  RETRY_COUNT: 1           // 重试次数
};

export default {
  generateTaskId,
  createTaskRequest,
  createAgentResponse,
  createSSEEvent,
  validateTaskRequest,
  AgentStatus,
  AgentType,
  SSEEventType,
  AgentConfig
};
