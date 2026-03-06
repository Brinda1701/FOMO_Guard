import { PROFILES, SECTOR_KW, AI_CONFIG, AGENT_CONFIG } from './config.js';
import { hash, seededRandom } from './utils.js';

// 应用状态
export const state = {
    currentCompany: '',
    currentScore: 50,
    useAIBackend: false,
    useMultiAgent: AI_CONFIG.USE_MULTI_AGENT,
    diaryEntries: JSON.parse(localStorage.getItem('tradeDiary') || '[]'),
    // Multi-Agent状态
    multiAgentState: {
        isActive: false,
        taskId: null,
        agentProgress: {
            sentiment: { status: 'pending', progress: 0, result: null },
            technical: { status: 'pending', progress: 0, result: null },
            psychology: { status: 'pending', progress: 0, result: null }
        },
        fusionResult: null,
        eventSource: null
    }
};

// 获取公司画像配置
export function getProfile(company) {
    if (PROFILES[company]) return PROFILES[company];
    
    for (const [kw, cfg] of Object.entries(SECTOR_KW)) {
        if (company.includes(kw)) return cfg;
    }
    
    const h = hash(company);
    return { 
        base: 20 + (h % 60), 
        vol: 8 + (h % 12), 
        sector: '综合', 
        kw: ['业绩', '估值', '行业', '前景'] 
    };
}

// 生成分数（Mock模式）
export function genScore(company, dayOffset = 0) {
    const profile = getProfile(company); 
    const today = new Date();
    const dateNum = (today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()) - dayOffset;
    const seed = hash(company) + dateNum;
    
    const offset = (seededRandom(seed) - 0.5) * profile.vol * 2;
    const finalScore = Math.max(8, Math.min(92, Math.round(profile.base + offset)));
    
    return { score: finalScore, profile: profile };
}

// 检查是否可以使用 AI 后端
export async function checkAIBackend() {
    try {
        const response = await fetch(`${AI_CONFIG.URL}/api/health`, { 
            method: 'GET',
            timeout: AI_CONFIG.TIMEOUT
        });
        if (response.ok) {
            const data = await response.json();
            state.useAIBackend = true;
            return data.modelscope_available;
        }
    } catch (e) {
        console.log('[AI] 后端不可用，使用前端模式');
    }
    state.useAIBackend = false;
    return false;
}

// 请求AI分析（如果可用）
export async function fetchAIAnalysis(company) {
    if (!state.useAIBackend) return null;
    
    try {
        const response = await fetch(`${AI_CONFIG.URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company })
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error('[AI] 调用失败', e);
    }
    return null;
}

// 获取历史回测数据（真实股价 + 估算情绪）
export async function fetchBacktestData(symbol) {
    try {
        const response = await fetch(`${AI_CONFIG.URL}/api/backtest?symbol=${encodeURIComponent(symbol)}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                return result;
            }
        }
    } catch (e) {
        console.error('[Backtest] 调用失败', e);
    }
    return null;
}

// 交易冲动评估逻辑
export function evaluateImpulse(action, company, score) {
    const diagnosisLib = {
        'buy': {
            high: {
                icon: '🚨', title: '极端贪婪警告', type: 'warning',
                message: `当前 ${company} 的全网情绪高达 ${score} 分，处于极其危险的过热期。此时买入无异于火中取栗！`,
                detail: '历史数据表明，在情绪极度亢奋时入场，80% 的投资者会在随后的回调中承受亏损。',
                quote: '华尔街有句名言："当擦鞋童都在谈论股票时，就是该离场的时候了。"',
                stats: { profitProb: '25%', avgReturn: '-8.5%', riskLevel: '极高' }
            },
            low: {
                icon: '💎', title: '逆向投资验证', type: 'safe',
                message: `${company} 当前情绪指数仅为 ${score} 分，市场普遍恐慌。`,
                detail: '如果您的买入基于扎实的基本面研究而非"抄底"冲动，这可能是一个机会。',
                quote: '巴菲特说："在别人恐惧时贪婪。"但请确保您贪婪的是价值，而非情绪。',
                stats: { profitProb: '68%', avgReturn: '+12.3%', riskLevel: '中等' }
            }
        },
        'sell': {
            high: {
                icon: '📈', title: '止盈时机评估', type: 'safe',
                message: `${company} 情绪高涨 (${score}分)，如果您已获利，现在落袋为安是理性的选择。`,
                detail: '记住：盈利是拿出来的，不是看出来的。处置效应会让人过早卖出盈利股。',
                quote: '没有人因为获利卖出而破产，但无数人因为贪婪持有而归零。',
                stats: { profitProb: '72%', avgReturn: '+5.2%', riskLevel: '低' }
            },
            low: {
                icon: '⏰', title: '恐慌抛售警告', type: 'warning',
                message: `${company} 当前情绪极低 (${score}分)，此时卖出很可能是在"割肉"。`,
                detail: '损失厌恶会让亏损的痛苦放大2倍，请冷静评估：基本面真的恶化了吗？',
                quote: '股市名言："散户永远买在最高点，卖在最低点。"您确定要成为这个统计数据的一部分吗？',
                stats: { profitProb: '35%', avgReturn: '-15.2%', riskLevel: '极高' }
            }
        },
        'hold': {
            high: {
                icon: '🧘', title: '成功抵御 FOMO', type: 'neutral',
                message: `在 ${company} 情绪高涨时选择观望，您成功抵御了"错过恐惧症"。`,
                detail: '市场永远有机会，保持耐心比追涨更重要。',
                quote: '投资大师查理·芒格："大钱不是买卖得来的，而是等待得来的。"',
                stats: { profitProb: '-', avgReturn: '0%', riskLevel: '安全' }
            },
            low: {
                icon: '🔍', title: '理性观察模式', type: 'neutral',
                message: `面对 ${company} 的低迷情绪，您选择观望而非冲动抄底。`,
                detail: '这体现了成熟投资者的素养。静待更明确的信号。',
                quote: '空仓也是一种仓位。有时候，不做决策就是最好的决策。',
                stats: { profitProb: '-', avgReturn: '0%', riskLevel: '安全' }
            }
        }
    };
    
    const level = score > 60 ? 'high' : 'low';
    const diagnosis = diagnosisLib[action][level];
    // 统一规则：只要本次结论属于 warning（错误/高风险决策），立即进入冷静期
    const shouldCooldown = diagnosis.type === 'warning';
    
    return { diagnosis, shouldCooldown, quote: diagnosis.quote };
}

// 生成热搜词数据
export function generateTrendData(company, profile) {
    const q = encodeURIComponent(company);
    const keywords = profile.kw || ['业绩', '估值', '行业', '前景'];
    
    return [
        { keyword: `${company} 最新消息`, source: '微博', isHot: true, link: `https://s.weibo.com/weibo?q=${q}` },
        { keyword: `${company} ${keywords[0]}`, source: '雪球', isRising: true, link: `https://xueqiu.com/k?q=${q}` },
        { keyword: `${company} 股吧`, source: '东财', isHot: false, link: `https://guba.eastmoney.com/search?code=${q}` },
        { keyword: `${company} ${keywords[1]}分析`, source: '微博', isRising: true, link: `https://s.weibo.com/weibo?q=${q}+${encodeURIComponent(keywords[1])}` },
        { keyword: `${company} 机构观点`, source: '雪球', isHot: false, link: `https://xueqiu.com/k?q=${q}+机构` },
        { keyword: `${profile.sector}板块`, source: '东财', isRising: false, link: `https://quote.eastmoney.com/center/boardlist.html` },
    ];
}

// 交易日记操作
export function addDiaryEntry(entry) {
    state.diaryEntries.push(entry);
    localStorage.setItem('tradeDiary', JSON.stringify(state.diaryEntries));
}

export function getDiaryEntries() {
    return state.diaryEntries;
}

export function removeDiaryEntry(entryId) {
    const originalLength = state.diaryEntries.length;
    state.diaryEntries = state.diaryEntries.filter(entry => entry.id !== entryId);
    const hasRemoved = state.diaryEntries.length !== originalLength;

    if (hasRemoved) {
        localStorage.setItem('tradeDiary', JSON.stringify(state.diaryEntries));
    }

    return hasRemoved;
}

export function updateDiaryEntry(updatedEntry) {
    const index = state.diaryEntries.findIndex(entry => entry.id === updatedEntry.id);
    if (index !== -1) {
        state.diaryEntries[index] = updatedEntry;
        localStorage.setItem('tradeDiary', JSON.stringify(state.diaryEntries));
        return true;
    }
    return false;
}

// ==================== Multi-Agent 相关函数 ====================

/**
 * 重置Multi-Agent状态
 */
export function resetMultiAgentState() {
    // 关闭现有的EventSource连接
    if (state.multiAgentState.eventSource) {
        state.multiAgentState.eventSource.close();
    }
    
    state.multiAgentState = {
        isActive: false,
        taskId: null,
        agentProgress: {
            sentiment: { status: 'pending', progress: 0, result: null },
            technical: { status: 'pending', progress: 0, result: null },
            psychology: { status: 'pending', progress: 0, result: null }
        },
        fusionResult: null,
        eventSource: null
    };
}

/**
 * 获取Agent显示名称
 * @param {string} agentType - Agent类型标识
 */
export function getAgentDisplayName(agentType) {
    const key = agentType.toLowerCase().replace('agent', '');
    return AGENT_CONFIG.names[key] || agentType;
}

/**
 * 获取Agent图标
 * @param {string} agentType - Agent类型标识
 */
export function getAgentIcon(agentType) {
    const key = agentType.toLowerCase().replace('agent', '');
    return AGENT_CONFIG.icons[key] || '🤖';
}

/**
 * 获取Agent颜色
 * @param {string} agentType - Agent类型标识
 */
export function getAgentColor(agentType) {
    const key = agentType.toLowerCase().replace('agent', '');
    return AGENT_CONFIG.colors[key] || '#6b7280';
}

/**
 * Multi-Agent分析（流式模式）
 * @param {string} company - 公司名称
 * @param {string} action - 操作意向
 * @param {object} callbacks - 回调函数集合
 */
export async function fetchMultiAgentAnalysis(company, action = 'analyze', callbacks = {}) {
    const {
        onAgentStart = () => {},
        onAgentProgress = () => {},
        onAgentComplete = () => {},
        onAgentError = () => {},
        onSummary = () => {},
        onError = () => {},
        onDone = () => {}
    } = callbacks;
    
    // 重置状态
    resetMultiAgentState();
    state.multiAgentState.isActive = true;
    
    // 检查是否使用流式模式
    const useStream = AI_CONFIG.MULTI_AGENT_STREAM;
    
    if (useStream) {
        // SSE流式模式
        return new Promise((resolve, reject) => {
            try {
                const url = `${AI_CONFIG.URL}/api/orchestrator`;
                
                // 使用fetch + ReadableStream处理SSE（因为EventSource不支持POST）
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ company, action, stream: true })
                }).then(async response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                    }
                    
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        
                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                const eventType = line.slice(7);
                                continue;
                            }
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    handleSSEEvent(data, {
                                        onAgentStart, onAgentProgress, onAgentComplete,
                                        onAgentError, onSummary
                                    });
                                } catch (e) {
                                    console.warn('SSE parse error:', e);
                                }
                            }
                        }
                    }
                    
                    state.multiAgentState.isActive = false;
                    onDone();
                    resolve(state.multiAgentState.fusionResult);
                    
                }).catch(error => {
                    console.error('[Multi-Agent] Stream error:', error);
                    state.multiAgentState.isActive = false;
                    onError(error);
                    reject(error);
                });
                
            } catch (error) {
                state.multiAgentState.isActive = false;
                onError(error);
                reject(error);
            }
        });
    } else {
        // 非流式模式
        try {
            const response = await fetch(`${AI_CONFIG.URL}/api/orchestrator`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company, action, stream: false })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const result = await response.json();
            state.multiAgentState.fusionResult = result;
            state.multiAgentState.isActive = false;
            onSummary(result);
            onDone();
            return result;
            
        } catch (error) {
            state.multiAgentState.isActive = false;
            onError(error);
            throw error;
        }
    }
}

/**
 * 处理SSE事件
 * @param {object} data - 事件数据
 * @param {object} callbacks - 回调函数
 */
function handleSSEEvent(data, callbacks) {
    const { onAgentStart, onAgentProgress, onAgentComplete, onAgentError, onSummary } = callbacks;
    
    if (data.agent) {
        const agentKey = data.agent.toLowerCase().replace('agent', '');
        
        if (data.status === 'processing' && !state.multiAgentState.agentProgress[agentKey]?.status) {
            // Agent开始
            state.multiAgentState.agentProgress[agentKey] = {
                status: 'processing',
                progress: 10,
                result: null
            };
            onAgentStart(data);
        } else if (data.progress !== undefined && data.progress < 100) {
            // Agent进度更新
            state.multiAgentState.agentProgress[agentKey].progress = data.progress;
            onAgentProgress(data);
        } else if (data.status === 'completed') {
            // Agent完成
            state.multiAgentState.agentProgress[agentKey] = {
                status: 'completed',
                progress: 100,
                result: data
            };
            onAgentComplete(data);
        } else if (data.status === 'failed') {
            // Agent失败
            state.multiAgentState.agentProgress[agentKey] = {
                status: 'failed',
                progress: 0,
                result: null,
                error: data.error
            };
            onAgentError(data);
        }
    } else if (data.finalScore !== undefined || data.final_score !== undefined) {
        // 编排器总结
        state.multiAgentState.fusionResult = data;
        state.currentScore = data.finalScore || data.final_score;
        onSummary(data);
    }
}

/**
 * Multi-Agent分析（非流式，简化版）
 * @param {string} company - 公司名称
 * @param {string} action - 操作意向
 */
export async function fetchMultiAgentAnalysisSimple(company, action = 'analyze') {
    if (!state.useAIBackend || !state.useMultiAgent) return null;
    
    try {
        const response = await fetch(`${AI_CONFIG.URL}/api/orchestrator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company, action, stream: false })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                state.currentScore = result.finalScore;
                return result;
            }
        }
    } catch (e) {
        console.error('[Multi-Agent] 调用失败', e);
    }
    return null;
}

/**
 * 切换Multi-Agent模式
 * @param {boolean} enabled - 是否启用
 */
export function toggleMultiAgentMode(enabled) {
    state.useMultiAgent = enabled;
    console.log(`[Multi-Agent] 模式${enabled ? '已启用' : '已禁用'}`);
}

/**
 * 检查Multi-Agent是否可用
 */
export async function checkMultiAgentAvailable() {
    if (!state.useAIBackend) return false;
    
    try {
        const response = await fetch(`${AI_CONFIG.URL}/api/orchestrator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company: 'test', action: 'analyze', stream: false })
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}

// ==================== 情绪历史数据相关函数 ====================

// 从 localStorage 加载情绪历史数据
function loadSentimentHistory() {
    const stored = localStorage.getItem('sentimentHistory');
    return stored ? JSON.parse(stored) : {};
}

// 保存情绪历史数据到 localStorage
function saveSentimentHistory(history) {
    localStorage.setItem('sentimentHistory', JSON.stringify(history));
}

/**
 * 记录情绪分数到历史数据
 * @param {string} company - 公司名称
 * @param {number} score - 情绪分数
 */
export function recordSentimentScore(company, score) {
    const history = loadSentimentHistory();
    const now = new Date();
    const timestamp = now.getTime();
    const timeLabel = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (!history[company]) {
        history[company] = [];
    }

    // 添加新记录
    history[company].push({
        timestamp,
        time: timeLabel,
        score,
        date: now.toLocaleDateString('zh-CN')
    });

    // 只保留最近 50 条记录（避免 localStorage 超限）
    if (history[company].length > 50) {
        history[company] = history[company].slice(-50);
    }

    saveSentimentHistory(history);
    return history[company];
}

/**
 * 获取某公司的历史情绪数据
 * @param {string} company - 公司名称
 * @returns {Array} 历史情绪数据数组
 */
export function getSentimentHistory(company) {
    const history = loadSentimentHistory();
    return history[company] || [];
}

/**
 * 清除某公司的历史情绪数据
 * @param {string} company - 公司名称
 */
export function clearSentimentHistory(company) {
    const history = loadSentimentHistory();
    if (history[company]) {
        delete history[company];
        saveSentimentHistory(history);
    }
}

/**
 * 清除所有历史情绪数据
 */
export function clearAllSentimentHistory() {
    localStorage.removeItem('sentimentHistory');
}

// ==================== URL 和文本分析相关函数 ====================

/**
 * 从 URL 中提取域名和关键信息
 * @param {string} url - 新闻 URL
 * @returns {Object} 解析结果
 */
export function parseNewsUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        let source = '未知';
        if (hostname.includes('xueqiu')) source = '雪球';
        else if (hostname.includes('eastmoney') || hostname.includes('guba')) source = '东方财富';
        else if (hostname.includes('sina') || hostname.includes('finance')) source = '新浪财经';
        else if (hostname.includes('10jqka')) source = '同花顺';
        else if (hostname.includes('wallstreetcn')) source = '华尔街见闻';
        else if (hostname.includes('caixin')) source = '财新';
        else if (hostname.includes('yicai')) source = '第一财经';
        
        return {
            valid: true,
            url,
            source,
            hostname
        };
    } catch (e) {
        return { valid: false, error: '无效的 URL 格式' };
    }
}

/**
 * 分析 URL 内容（通过后端爬取）
 * @param {string} url - 新闻 URL
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeUrlContent(url) {
    const urlInfo = parseNewsUrl(url);

    if (!urlInfo.valid) {
        throw new Error(urlInfo.error);
    }

    // 调用后端爬取网页内容
    try {
        const scrapeResponse = await fetch(`${AI_CONFIG.URL}/api/scrape-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!scrapeResponse.ok) {
            const errorData = await scrapeResponse.json();
            throw new Error(errorData.error || '爬取失败');
        }

        const scrapedData = await scrapeResponse.json();

        // 如果有 AI 后端，调用 AI 分析爬取的内容
        if (state.useAIBackend) {
            try {
                const analyzeResponse = await fetch(`${AI_CONFIG.URL}/api/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company: scrapedData.title || '新闻分析',
                        text: scrapedData.content
                    })
                });

                if (analyzeResponse.ok) {
                    const aiData = await analyzeResponse.json();
                    return {
                        success: true,
                        url,
                        source: scrapedData.source,
                        title: scrapedData.title,
                        content: scrapedData.content,
                        score: aiData.score || 50,
                        sentiment: aiData.data?.sentiment || '中性',
                        summary: aiData.data?.advice || scrapedData.title,
                        publishTime: scrapedData.publishTime
                    };
                }
            } catch (e) {
                console.error('[URL 分析] AI 分析失败，使用基础分析', e);
            }
        }

        // 备用：简单情感分析
        const score = simpleSentimentAnalysis(scrapedData.content);
        const sentiment = score > 60 ? '正面' : (score < 40 ? '负面' : '中性');

        return {
            success: true,
            url,
            source: scrapedData.source,
            title: scrapedData.title,
            content: scrapedData.content,
            score,
            sentiment,
            summary: `来自${scraped.source}的新闻：${scrapedData.title}`,
            publishTime: scrapedData.publishTime
        };

    } catch (error) {
        console.error('[URL 分析] 错误:', error);
        throw new Error(`无法获取新闻内容：${error.message}`);
    }
}

/**
 * 简单情感分析（备用）
 */
function simpleSentimentAnalysis(text) {
    const positiveWords = ['增长', '上涨', '利好', '突破', '创新高', '优秀', '强劲', '超预期', '盈利', '复苏', '回暖', '突破'];
    const negativeWords = ['下跌', '下滑', '亏损', '风险', '警告', '低迷', '疲软', '不及预期', '暴跌', '崩盘', '危机', '衰退'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
    });

    const score = Math.round(50 + (positiveCount - negativeCount) * 5);
    return Math.max(0, Math.min(100, score));
}

/**
 * 分析文本内容
 * @param {string} text - 要分析的文本
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeTextContent(text) {
    if (!text || text.trim().length < 10) {
        throw new Error('文本内容太短，请输入至少 10 个字符');
    }
    
    if (text.length > 5000) {
        throw new Error('文本内容过长，请输入不超过 5000 个字符');
    }
    
    // 调用 AI 后端分析文本
    if (state.useAIBackend) {
        try {
            const response = await fetch(`${AI_CONFIG.URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    company: '文本分析',
                    text: text
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    score: data.score || 50,
                    sentiment: data.data?.sentiment || '中性',
                    summary: data.data?.advice || '分析完成',
                    keywords: extractKeywords(text)
                };
            }
        } catch (e) {
            console.error('[文本分析] AI 后端调用失败', e);
        }
    }
    
    // 模拟分析（备用）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 简单的情感分析（基于关键词）
    const positiveWords = ['增长', '上涨', '利好', '突破', '创新高', '优秀', '强劲', '超预期'];
    const negativeWords = ['下跌', '下滑', '亏损', '风险', '警告', '低迷', '疲软', '不及预期'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
    });
    
    const score = Math.round(50 + (positiveCount - negativeCount) * 5);
    const finalScore = Math.max(0, Math.min(100, score));
    const sentiment = finalScore > 60 ? '正面' : (finalScore < 40 ? '负面' : '中性');
    
    return {
        success: true,
        score: finalScore,
        sentiment,
        summary: `文本中包含${positiveCount}个正面关键词和${negativeCount}个负面关键词，整体情绪${sentiment}。`,
        keywords: extractKeywords(text)
    };
}

/**
 * 从文本中提取关键词
 * @param {string} text - 输入文本
 * @returns {string[]} 关键词数组
 */
export function extractKeywords(text) {
    // 简单实现：提取出现频率较高的词
    const words = text.split(/[\s,，.。!?！？;；]+/).filter(w => w.length >= 2);
    const wordCount = {};
    
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}

/**
 * 批量分析公司列表（带并发控制）
 * @param {string[]} companies - 公司列表
 * @param {Function} onProgress - 进度回调函数
 * @param {number} concurrency - 最大并发数，默认 3
 * @returns {Promise<Array>} 分析结果数组
 */
export async function analyzeBatchCompanies(companies, onProgress, concurrency = 3) {
    const results = [];
    const total = companies.length;
    let completed = 0;

    // 过滤空字符串
    const validCompanies = companies.filter(c => c.trim()).map(c => c.trim());

    // 并发控制函数
    async function runWithConcurrency(items, processor, maxConcurrent) {
        const executing = [];
        const results = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // 通知进度
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: items.length,
                    company: item,
                    status: 'analyzing',
                    completed,
                    totalCompleted: completed
                });
            }

            // 创建 Promise
            const promise = processor(item, i).then(result => {
                results[i] = result;
                completed++;
                executing.splice(executing.indexOf(promise), 1);
                return result;
            });

            executing.push(promise);

            // 等待有空闲位置
            if (executing.length >= maxConcurrent) {
                await Promise.race(executing);
            }
        }

        // 等待所有完成
        await Promise.all(executing);
        return results;
    }

    // 处理单个公司分析
    async function analyzeCompany(company, index) {
        try {
            const scoreData = genScore(company);
            const score = scoreData.score;

            // 记录到历史数据
            recordSentimentScore(company, score);

            return {
                success: true,
                company,
                score,
                sentiment: score > 60 ? '贪婪' : (score < 40 ? '恐惧' : '中性'),
                profile: scoreData.profile,
                index
            };
        } catch (error) {
            return {
                success: false,
                company,
                error: error.message,
                index
            };
        }
    }

    // 执行并发分析
    const analyzedResults = await runWithConcurrency(validCompanies, analyzeCompany, concurrency);

    // 按原始顺序排序并返回
    return analyzedResults.sort((a, b) => a.index - b.index);
}
