/**
 * SSE流式输出工具
 * 支持实时推送Agent分析进度
 */

import { SSEEventType } from './agent-protocol.js';

/**
 * 初始化SSE响应头
 * @param {object} res - HTTP响应对象
 */
export function initSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.flushHeaders && res.flushHeaders();
}

/**
 * 发送SSE事件
 * @param {object} res - HTTP响应对象
 * @param {string} eventType - 事件类型
 * @param {object} data - 事件数据
 */
export function sendSSEEvent(res, eventType, data) {
  const eventString = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  res.write(eventString);
}

/**
 * 发送Agent启动事件
 * @param {object} res - HTTP响应对象
 * @param {string} agentName - Agent名称
 */
export function sendAgentStart(res, agentName) {
  sendSSEEvent(res, SSEEventType.AGENT_START, {
    agent: agentName,
    status: 'processing',
    timestamp: new Date().toISOString()
  });
}

/**
 * 发送Agent进度事件
 * @param {object} res - HTTP响应对象
 * @param {string} agentName - Agent名称
 * @param {number} progress - 进度百分比 (0-100)
 * @param {string} message - 进度描述
 */
export function sendAgentProgress(res, agentName, progress, message) {
  sendSSEEvent(res, SSEEventType.AGENT_PROGRESS, {
    agent: agentName,
    progress,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * 发送Agent完成事件
 * @param {object} res - HTTP响应对象
 * @param {object} result - Agent结果
 */
export function sendAgentComplete(res, result) {
  sendSSEEvent(res, SSEEventType.AGENT_COMPLETE, {
    agent: result.agent,
    status: 'completed',
    score: result.score,
    confidence: result.confidence,
    insights: result.insights || [],
    warnings: result.warnings || [],
    execution_time_ms: result.execution_time_ms,
    timestamp: new Date().toISOString()
  });
}

/**
 * 发送Agent错误事件
 * @param {object} res - HTTP响应对象
 * @param {string} agentName - Agent名称
 * @param {string} error - 错误信息
 */
export function sendAgentError(res, agentName, error) {
  sendSSEEvent(res, SSEEventType.AGENT_ERROR, {
    agent: agentName,
    status: 'failed',
    error,
    timestamp: new Date().toISOString()
  });
}

/**
 * 发送编排器总结事件
 * @param {object} res - HTTP响应对象
 * @param {object} summary - 融合结果摘要
 */
export function sendOrchestratorSummary(res, summary) {
  sendSSEEvent(res, SSEEventType.ORCHESTRATOR_SUMMARY, {
    ...summary,
    timestamp: new Date().toISOString()
  });
}

/**
 * 结束SSE流
 * @param {object} res - HTTP响应对象
 */
export function endSSEStream(res) {
  res.write('event: done\ndata: {}\n\n');
  res.end();
}

/**
 * 创建SSE流式响应管理器
 * @param {object} res - HTTP响应对象
 */
export function createSSEManager(res) {
  initSSEHeaders(res);
  
  return {
    agentStart: (agentName) => sendAgentStart(res, agentName),
    agentProgress: (agentName, progress, message) => sendAgentProgress(res, agentName, progress, message),
    agentComplete: (result) => sendAgentComplete(res, result),
    agentError: (agentName, error) => sendAgentError(res, agentName, error),
    summary: (summary) => sendOrchestratorSummary(res, summary),
    end: () => endSSEStream(res)
  };
}

export default {
  initSSEHeaders,
  sendSSEEvent,
  sendAgentStart,
  sendAgentProgress,
  sendAgentComplete,
  sendAgentError,
  sendOrchestratorSummary,
  endSSEStream,
  createSSEManager
};
