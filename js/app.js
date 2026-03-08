import * as Logic from './logic.js';
import * as UI from './ui.js';
import * as Chart from './chart.js';
import * as AgentViz from './agent-viz.js';
import { AI_CONFIG, AGENT_CONFIG } from './config.js';
import { LoginUI, Guide } from './login-guide.js';
import { renderDataSourceCards, renderKlineChart } from './data-source.js';
import * as AnalysisInteraction from './analysis-interaction.js';

// 渲染日记列表（独立区域 - 已移除）
function renderDiaryList(entries) {
    // 独立日记区域已移除，此函数保留以兼容
}

// 渲染内联日记列表
function renderInlineDiaryList() {
    const entries = Logic.getDiaryEntries();
    const diaryList = document.getElementById('inlineDiaryList');
    const diaryCount = document.getElementById('inlineDiaryCount');

    const escapeHtml = (text) => String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    diaryCount.textContent = entries.length;

    if (entries.length === 0) {
        diaryList.innerHTML = '<div class="diary-empty">暂无记录，点击上方按钮开始记录您的交易决策</div>';
        return;
    }

    diaryList.innerHTML = entries.slice().reverse().map(entry => {
        // 盈亏状态选择器
        const profitLossSelect = `
            <select class="diary-profit-loss" data-entry-id="${entry.id}" data-score="${entry.score}">
                <option value="">${entry.profitLoss ? (entry.profitLoss === 'win' ? '✅ 盈利' : entry.profitLoss === 'loss' ? '❌ 亏损' : '➖ 平') : '📊 标记盈亏'}</option>
                <option value="win">✅ 盈利</option>
                <option value="loss">❌ 亏损</option>
                <option value="flat">➖ 平</option>
            </select>
        `;
        
        // 高 FOMO 标记
        const fomoBadge = entry.score > 60 ? '<span class="diary-fomo-badge">🔥 高 FOMO</span>' : '';

        return `
        <div class="diary-entry ${entry.type} ${entry.score > 60 ? 'diary-high-fomo' : ''}">
            <div class="diary-header-row">
                <div class="diary-meta">
                    <span>${escapeHtml(entry.date)} | ${escapeHtml(entry.company)}</span>
                    <span class="diary-action ${entry.type}">${entry.type === 'buy' ? '买入' : (entry.type === 'sell' ? '卖出' : '观望')}</span>
                </div>
                ${fomoBadge}
            </div>
            <div class="diary-content">${escapeHtml(entry.note)}</div>
            <div class="diary-entry-footer">
                <div class="diary-score">
                    情绪评分：<strong style="color: ${entry.score > 60 ? 'var(--accent-green)' : (entry.score < 40 ? 'var(--accent-red)' : 'var(--accent-yellow)')}">${entry.score}</strong>
                </div>
                ${profitLossSelect}
                <button class="diary-delete-btn" data-entry-id="${entry.id}" title="删除这条记录">🗑️ 删除</button>
            </div>
        </div>
    `;
    }).join('');
    
    // 绑定盈亏选择器事件
    document.querySelectorAll('.diary-profit-loss').forEach(select => {
        select.addEventListener('change', (e) => {
            const entryId = parseInt(e.target.dataset.entryId);
            const profitLoss = e.target.value;
            const score = parseInt(e.target.dataset.score);
            
            // 估算盈亏百分比（简化版）
            let profitPercent = 0;
            if (profitLoss === 'win') {
                profitPercent = Math.random() * 15 + 5; // 5-20% 盈利
            } else if (profitLoss === 'loss') {
                profitPercent = -(Math.random() * 20 + 5); // -5% 到 -25% 亏损
            }
            
            // 更新日记条目
            const entries = Logic.getDiaryEntries();
            const entry = entries.find(e => e.id === entryId);
            if (entry) {
                entry.profitLoss = profitLoss;
                entry.profitPercent = profitPercent;
                Logic.updateDiaryEntry(entry);
                
                // 显示反馈
                UI.showFeedbackPopup({
                    type: profitLoss === 'win' ? 'success' : profitLoss === 'loss' ? 'error' : 'info',
                    title: profitLoss === 'win' ? '✅ 已标记盈利' : profitLoss === 'loss' ? '❌ 已标记亏损' : '➖ 已标记持平',
                    message: '交易日记已更新',
                    durationMs: 1500
                });
            }
        });
    });
}

// 初始化
async function init() {
    // 初始化登录模块
    LoginUI.init();
    
    initTheme();
    UI.createEmotionParticles('init');
    renderInlineDiaryList();

    const backendStatus = await Logic.checkAIBackend();

    // 只在没有 AI 时才显示警告（K 线数据不受影响）
    if (!backendStatus.hasAI) {
        UI.showAIModeIndicator(false);
        UI.showSimulatedModeWarning();
    } else {
        UI.showAIModeIndicator(true);
        UI.hideSimulatedModeWarning();
    }

    setupEventListeners();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const themeToggle = document.getElementById('themeToggle');

    // 主题已在 HTML 中初始化，这里只更新按钮图标
    themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';
}

function setupEventListeners() {
    // 主题切换
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        const themeToggle = document.getElementById('themeToggle');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'light') {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.textContent = '☀️';
            localStorage.setItem('theme', 'light');
        }
    });

    // 公司分析
    document.getElementById('analyzeBtn')?.addEventListener('click', analyzeCompany);
    document.getElementById('companyInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') analyzeCompany();
    });
    document.querySelectorAll('.quick-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.getElementById('companyInput').value = tag.dataset.company;
            analyzeCompany();
        });
    });

    // 交易决策按钮
    document.querySelectorAll('.trade-btn').forEach(btn => {
        if (!btn.classList.contains('diary-type-btn')) {
            btn.addEventListener('click', () => handleImpulseCheck(btn.dataset.action));
        }
    });

    // 决策结果界面交互
    document.getElementById('backToMain')?.addEventListener('click', UI.closeDecisionOverlay);
    document.getElementById('continueAnalyzeBtn')?.addEventListener('click', UI.closeDecisionOverlay);
    document.getElementById('recordDecisionBtn')?.addEventListener('click', () => {
        UI.closeDecisionOverlay();
        UI.openDiaryModal(Logic.state.currentCompany, Logic.state.currentScore);
    });

    // 心理测试
    document.getElementById('showQuizBtn')?.addEventListener('click', UI.showQuiz);

    // 日记相关（模态框）
    document.getElementById('cancelDiaryBtn')?.addEventListener('click', UI.closeDiaryModal);
    document.getElementById('saveDiaryBtn')?.addEventListener('click', handleSaveDiary);

    // 日记类型选择
    let selectedDiaryType = 'hold';
    document.querySelectorAll('.diary-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.diary-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedDiaryType = this.dataset.type;
            const diaryModal = document.getElementById('diaryModal');
            if (diaryModal) diaryModal.dataset.selectedType = selectedDiaryType;
        });
    });

    // 日记滑块
    document.getElementById('diaryScore')?.addEventListener('input', function() {
        const scoreDisplayEl = document.getElementById('diaryScoreDisplay');
        if (scoreDisplayEl) scoreDisplayEl.textContent = this.value;
    });

    // 内联日记添加按钮 - 直接保存决策记录
    const inlineAddDiaryBtn = document.getElementById('inlineAddDiaryBtn');
    if (inlineAddDiaryBtn) {
        inlineAddDiaryBtn.addEventListener('click', () => {
            quickSaveDiary();
        });
    }

    // 日记删除（支持内联列表）
    const diaryList = document.getElementById('inlineDiaryList');
    if (diaryList) {
        diaryList.addEventListener('click', (event) => {
            const deleteBtn = event.target.closest('.diary-delete-btn');
            if (!deleteBtn) return;

            const entryId = Number(deleteBtn.dataset.entryId);
            if (!entryId) return;

            const shouldDelete = confirm('确定删除这条决策记录吗？删除后无法恢复。');
            if (!shouldDelete) return;

            const hasRemoved = Logic.removeDiaryEntry(entryId);
            if (hasRemoved) {
                renderInlineDiaryList();
                UI.showFeedbackPopup({
                    type: 'success',
                    title: '删除成功',
                    message: '该条决策记录已删除。',
                    durationMs: 1800
                });
            }
        });
    }

    // 预测反馈弹窗交互
    document.getElementById('predictionCancelBtn')?.addEventListener('click', hidePredictionModal);
    document.getElementById('predictionConfirmBtn')?.addEventListener('click', confirmPredictionAction);

    // 点击预测弹窗背景关闭
    document.getElementById('predictionModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('predictionModal')) {
            hidePredictionModal();
        }
    });

    // 批量分析模态框交互
    document.getElementById('closeBatchModal')?.addEventListener('click', () => {
        document.getElementById('batchModalOverlay')?.classList.remove('active');
    });
    document.getElementById('closeBatchModalBtn')?.addEventListener('click', () => {
        document.getElementById('batchModalOverlay')?.classList.remove('active');
    });
    document.getElementById('exportBatchResults')?.addEventListener('click', exportBatchResults);

    // 点击模态框背景关闭
    document.getElementById('batchModalOverlay')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('batchModalOverlay')) {
            document.getElementById('batchModalOverlay')?.classList.remove('active');
        }
    });
}

// 核心分析流程
async function analyzeCompany() {
    const input = document.getElementById('companyInput');
    const company = input.value.trim();
    if (!company) { alert('请输入公司名称'); return; }

    Logic.state.currentCompany = company;
    document.getElementById('analyzeBtn').disabled = true;

    // 检查是否启用 Multi-Agent 模式
    if (Logic.state.useAIBackend && Logic.state.useMultiAgent) {
        await analyzeWithMultiAgent(company);
    } else {
        await analyzeWithSingleMode(company);
    }

    document.getElementById('analyzeBtn').disabled = false;
}

// Multi-Agent 分析模式
async function analyzeWithMultiAgent(company) {
    // 显示 Multi-Agent 进度面板
    showAgentProgressPanel();
    UI.showLoading(true, 'Multi-Agent');

    // 显示骨架屏
    showAllSkeletons();

    // 启动分析互动模块（显示投资心理小贴士）
    AnalysisInteraction.startTipsRotation();

    // 10 秒后有 30% 概率弹出互动问答
    setTimeout(() => {
        AnalysisInteraction.maybeShowQuiz();
    }, 10000);

    // 先获取市场数据并显示 K 线和数据来源（不等待 AI 分析）
    try {
        console.log('[Multi-Agent] 预先获取市场数据...');
        const symbol = Logic.getStockSymbol(company);
        
        // 渲染数据来源和 K 线图表
        renderDataSourceCards(company, symbol);
        renderKlineChart(company, 50); // 使用默认分数先显示
        
        console.log('[Multi-Agent] K 线和数据来源已显示');
        
        // 隐藏相关骨架屏
        const klineContainer = document.getElementById('klineChartContainer');
        if (klineContainer) klineContainer.style.display = 'block';
        
        const hotTrendsSection = document.getElementById('hotTrendsSection');
        if (hotTrendsSection) hotTrendsSection.style.display = 'block';
        
    } catch (error) {
        console.warn('[Multi-Agent] 预加载市场数据失败:', error);
    }

    try {
        const result = await Logic.fetchMultiAgentAnalysis(company, 'analyze', {
            onAgentStart: (data) => {
                updateAgentProgress(data.agent, 'processing', 10);
                // 使用终端日志输出
                const agentKey = data.agent.toLowerCase().replace('agent', '');
                addTerminalLine(`${AGENT_CONFIG.names[agentKey] || data.agent} 开始分析...`, agentKey, true);
                
                // 渐进式渲染：立即显示可视化面板（骨架屏状态）
                if (data.index === 0 || !window.agentVizInitialized) {
                    AgentViz.initAgentVisualizationSkeleton();
                    window.agentVizInitialized = true;
                }
            },
            onAgentProgress: (data) => {
                updateAgentProgress(data.agent, 'processing', data.progress);
                if (data.message) {
                    const agentKey = data.agent.toLowerCase().replace('agent', '');
                    addTerminalLine(data.message, agentKey, true);
                }
            },
            onAgentComplete: (data) => {
                updateAgentProgress(data.agent, 'completed', 100, data.score);
                const agentKey = data.agent.toLowerCase().replace('agent', '');
                addTerminalLine(`${AGENT_CONFIG.names[agentKey] || data.agent} 分析完成，得分：${data.score}分`, 'success', false);
                
                // 渐进式渲染：立即更新对应卡片和雷达图
                AgentViz.updateSingleAgentCard(agentKey, data.score, data);
                AgentViz.updateRadarChartSinglePoint(agentKey, data.score);
            },
            onAgentError: (data) => {
                updateAgentProgress(data.agent, 'failed', 0);
                const agentKey = data.agent.toLowerCase().replace('agent', '');
                addTerminalLine(`${AGENT_CONFIG.names[agentKey]} 分析失败：${data.error || '未知错误'}`, 'error', false);
                const cardEl = document.querySelector(`[data-agent="${agentKey}"]`);
                if (cardEl) {
                    cardEl.classList.remove('skeleton');
                    cardEl.classList.add('failed');
                }
            },
            onSummary: (summary) => {
                handleMultiAgentSummary(summary, company);
            },
            onError: (error) => {
                console.error('[Multi-Agent] Error:', error);
                // 不降级，直接显示错误
                hideAgentProgressPanel();
                hideAllSkeletons();
                window.agentVizInitialized = false;
                UI.showLoading(false);
                alert('AI 分析失败：' + error.message + '\n请检查 API 配置或稍后重试');
            },
            onDone: () => {
                // 分析完成后延迟隐藏进度面板
                setTimeout(() => {
                    hideAgentProgressPanel();
                    hideAllSkeletons();
                    window.agentVizInitialized = false;
                    // 停止互动模块
                    AnalysisInteraction.stopTipsRotation();
                }, 2000);
            }
        });

        if (!result) {
            // Multi-Agent 失败，显示错误
            hideAgentProgressPanel();
            hideAllSkeletons();
            window.agentVizInitialized = false;
            AnalysisInteraction.stopTipsRotation();
            alert('Multi-Agent 分析失败，请检查 API 配置或稍后重试');
            return;
        }

    } catch (error) {
        console.error('[Multi-Agent] Failed:', error);
        hideAgentProgressPanel();
        hideAllSkeletons();
        window.agentVizInitialized = false;
        AnalysisInteraction.stopTipsRotation();
        alert('Multi-Agent 分析异常：' + error.message + '\n请检查 API 配置或稍后重试');
        return;
    }
}

// 单 Agent 模式分析（强制调用 AI）
async function analyzeWithSingleMode(company) {
    console.log('[App] analyzeWithSingleMode 被调用，公司:', company);

    UI.showLoading(true);

    // 显示骨架屏
    showAllSkeletons();

    // 启动分析互动模块
    AnalysisInteraction.startTipsRotation();

    // 强制调用 AI 获取数据
    const aiData = await Logic.fetchAIAnalysis(company);

    if (!aiData) {
        // AI 调用失败，显示错误
        hideAllSkeletons();
        AnalysisInteraction.stopTipsRotation();
        alert('AI 分析失败，请检查 API 配置或稍后重试');
        return;
    }

    Logic.state.currentScore = aiData.score;
    const score = aiData.score;
    const profile = Logic.getProfile(company);

    console.log('[App] AI 分析结果:', score);

    // 停止互动模块
    AnalysisInteraction.stopTipsRotation();

    // 记录情绪分数到历史数据
    const historyData = Logic.recordSentimentScore(company, score);

    // 更新所有 UI 组件
    UI.updateGauge(score, company);
    UI.updateHistory();
    UI.updateSources();
    UI.createEmotionParticles(score);

    // 渲染数据来源和 K 线图表（异步调用）
    const symbol = Logic.getStockSymbol(company);
    renderDataSourceCards(company, symbol);
    renderKlineChart(company, score);

    // 更新情绪趋势图
    Chart.updateSentimentTrendChart(historyData);

    // 显示可视化面板
    showSingleAgentVisualization(score, company);

    const trends = Logic.generateTrendData(company, profile);
    UI.updateHotTrends(trends);

    // 隐藏骨架屏
    hideAllSkeletons();

    console.log('[App] analyzeWithSingleMode 完成');
}

// 显示单 Agent 模式可视化（基于 AI 分数生成三个 Agent 分数）
function showSingleAgentVisualization(score, company) {
    console.log('[AgentViz] 开始显示可视化面板，分数:', score);

    const card = document.getElementById('agentVisualizationCard');
    if (!card) {
        console.error('[AgentViz] 找不到可视化面板元素');
        return;
    }

    // 确保显示面板
    card.style.display = 'block';
    console.log('[AgentViz] 面板 display 设置为:', card.style.display);

    // 基于主分数生成三个 Agent 的分数（有一定波动，保留一位小数）
    const sentimentScore = Math.max(0, Math.min(100, +(score + (Math.random() * 20 - 10)).toFixed(1)));
    const technicalScore = Math.max(0, Math.min(100, +(score + (Math.random() * 20 - 10)).toFixed(1)));
    const psychologyScore = Math.max(0, Math.min(100, +(score + (Math.random() * 20 - 10)).toFixed(1)));

    const scores = {
        sentiment: sentimentScore,
        technical: technicalScore,
        psychology: psychologyScore
    };

    console.log('[AgentViz] 分数:', scores);

    // 初始化雷达图
    setTimeout(() => {
        AgentViz.initAgentRadarChart(scores);
        console.log('[AgentViz] 雷达图已初始化');
    }, 100);

    // 更新分数卡片
    AgentViz.updateAgentScoreCards(scores);
    console.log('[AgentViz] 分数卡片已更新');

    // 更新最终决策建议
    const consensus = 'aligned';
    const decisionText = score > 60 ? '当前市场情绪偏热，建议保持理性，避免追高。' :
                         score < 40 ? '市场情绪偏冷，可能是机会，但需确认基本面。' :
                         '市场情绪中性，建议继续观察，等待更明确信号。';

    AgentViz.updateFinalDecision({
        icon: '✓',
        title: '综合分析建议',
        content: decisionText,
        consensus: consensus
    });
    console.log('[AgentViz] 决策建议已更新');

    // 渲染判定证据
    const mockEvidence = [
        { text: `${company} 近期市场关注度上升`, sentiment: 'positive', impact: 'medium', source: '市场数据' },
        { text: `社交媒体讨论热度较高`, sentiment: 'emotional', impact: 'medium', source: '社交媒体' },
        { text: `估值水平处于历史${score > 50 ? '高位' : '低位'}`, sentiment: score > 50 ? 'negative' : 'positive', impact: 'high', source: '财务分析' }
    ];
    AgentViz.renderGlobalEvidence(mockEvidence);
    console.log('[AgentViz] 判定证据已渲染');
}

// 处理 Multi-Agent 汇总结果
function handleMultiAgentSummary(summary, company) {
    const score = summary.finalScore || summary.final_score || 50;
    Logic.state.currentScore = score;

    const profile = Logic.getProfile(company);

    // 记录情绪分数到历史数据
    const historyData = Logic.recordSentimentScore(company, score);

    // 更新主要 UI
    UI.updateGauge(score, company);
    UI.updateHistory();
    UI.updateSources();
    UI.createEmotionParticles(score);

    // 渲染数据来源和 K 线图表（异步调用）
    console.log('[Multi-Agent] 准备渲染数据来源和 K 线图表...');
    const symbol = Logic.getStockSymbol(company);
    renderDataSourceCards(company, symbol);
    renderKlineChart(company, score);
    console.log('[Multi-Agent] 数据来源和 K 线图表渲染完成');

    // 更新情绪趋势图
    Chart.updateSentimentTrendChart(historyData);

    // === 显示 Agent 可视化面板（三个 Agent 分数） ===
    const agentVizCard = document.getElementById('agentVisualizationCard');
    if (agentVizCard) {
        agentVizCard.style.display = 'block';
        console.log('[Multi-Agent] Agent 可视化面板已显示');
    }

    // 更新 Agent 分数卡片（从 summary 获取真实数据）
    const breakdown = summary.breakdown || {};
    
    // 注意：score 可能是 0，不能用 || 50
    const sentimentScore = breakdown.sentiment && 'score' in breakdown.sentiment 
        ? breakdown.sentiment.score 
        : 50;
    const technicalScore = breakdown.technical && 'score' in breakdown.technical 
        ? breakdown.technical.score 
        : 50;
    const psychologyScore = breakdown.psychology && 'score' in breakdown.psychology 
        ? breakdown.psychology.score 
        : 50;

    console.log('[Multi-Agent] summary 数据结构:', JSON.stringify(summary, null, 2).substring(0, 500));
    console.log('[Multi-Agent] 更新 Agent 分数:', {
        sentiment: sentimentScore,
        technical: technicalScore,
        psychology: psychologyScore,
        final: score,
        expected: `(${sentimentScore}×0.4 + ${technicalScore}×0.3 + ${psychologyScore}×0.3 = ${Math.round(sentimentScore * 0.4 + technicalScore * 0.3 + psychologyScore * 0.3)})`
    });

    // 验证分数一致性
    const calculatedFinal = Math.round(sentimentScore * 0.4 + technicalScore * 0.3 + psychologyScore * 0.3);
    if (Math.abs(calculatedFinal - score) > 1) {
        console.warn('[Multi-Agent] ⚠️ 分数不一致！Agent 分数计算的最终值:', calculatedFinal, '但实际最终分数是:', score);
        console.warn('[Multi-Agent] breakdown 数据:', breakdown);
    } else {
        console.log('[Multi-Agent] ✓ 分数一致性验证通过');
    }

    // 延迟更新，确保 DOM 已渲染
    setTimeout(() => {
        AgentViz.updateAgentScoreCards({
            sentiment: sentimentScore,
            technical: technicalScore,
            psychology: psychologyScore
        });
        console.log('[Multi-Agent] Agent 分数卡片已更新');
    }, 100);

    // 更新最终决策建议
    updateFinalDecisionFromSummary(summary, company);

    // 渲染情绪证据链（从多个来源提取证据）
    const sentimentData = breakdown.sentiment || {};
    let sentimentEvidence = [];
    
    // 优先使用 keyEvidence
    if (Array.isArray(sentimentData.keyEvidence) && sentimentData.keyEvidence.length > 0) {
        sentimentEvidence = sentimentData.keyEvidence;
        console.log('[Evidence] 使用 keyEvidence 作为证据链');
    }
    // 其次使用 signals
    else if (Array.isArray(sentimentData.signals) && sentimentData.signals.length > 0) {
        sentimentEvidence = sentimentData.signals.map(signal => ({
            text: signal,
            sentiment: 'neutral',
            impact: 'medium',
            source: 'AI 分析'
        }));
        console.log('[Evidence] 使用 signals 作为证据链');
    }
    // 最后从 summary 中提取关键信息
    else if (sentimentData.summary && sentimentData.summary.length > 20) {
        const summaryText = sentimentData.summary;
        // 从总结中提取 2-3 个关键短语作为证据
        const keyPhrases = summaryText
            .split(/[,.!?]/)
            .filter(s => s.trim().length > 10 && s.trim().length < 50)
            .slice(0, 3)
            .map(s => s.trim());
        
        sentimentEvidence = keyPhrases.map(text => ({
            text,
            sentiment: 'neutral',
            impact: 'medium',
            source: '情绪分析'
        }));
        console.log('[Evidence] 从 summary 提取证据链');
    }
    // 兜底：使用 insigths 作为证据
    else if (Array.isArray(summary.insights) && summary.insights.length > 0) {
        sentimentEvidence = summary.insights.map(insight => ({
            text: insight.content || insight,
            sentiment: 'neutral',
            impact: 'medium',
            source: insight.source || '综合分析'
        }));
        console.log('[Evidence] 使用 insights 作为证据链');
    }
    // 最后的兜底：生成通用证据
    else {
        sentimentEvidence = [
            { text: `${company} 近期市场关注度较高`, sentiment: 'neutral', impact: 'medium', source: '市场数据' },
            { text: `投资者情绪整体平稳`, sentiment: 'neutral', impact: 'low', source: '舆情分析' },
            { text: `建议结合基本面和技术面综合判断`, sentiment: 'neutral', impact: 'medium', source: 'AI 建议' }
        ];
        console.log('[Evidence] 使用通用证据链（兜底）');
    }

    console.log('[Evidence] 渲染证据链:', sentimentEvidence);
    console.log('[Evidence] 证据数量:', sentimentEvidence.length);

    // 使用新的全局证据渲染函数
    AgentViz.renderGlobalEvidence(sentimentEvidence);

    const trends = Logic.generateTrendData(company, profile);
    UI.updateHotTrends(trends);

    // 显示 Agent 一致性结果
    showAgentConsensus(summary);

    // 隐藏骨架屏
    hideAllSkeletons();
}

// 更新最终决策建议（从 summary 数据）
function updateFinalDecisionFromSummary(summary, company) {
    const consensus = summary.consensus || 'aligned';
    const recommendation = summary.recommendation || {};

    AgentViz.updateFinalDecision({
        icon: consensus === 'divergent' ? '⚠️' : '✓',
        title: consensus === 'divergent' ? 'Agent 存在分歧' : 'Agent 达成共识',
        content: recommendation.message || summary.insights?.[0]?.content || '分析完成',
        consensus: consensus
    });
}

// 更新 Multi-Agent 可视化面板（保留用于兼容）
function updateAgentVisualization(summary, company) {
    updateFinalDecisionFromSummary(summary, company);
}

// 隐藏 Agent 进度面板
function hideAgentProgressPanel() {
    const panel = document.getElementById('agentProgressPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

// 重置 Agent 进度 UI
function resetAgentProgressUI() {
    for (const agent of ['sentiment', 'technical', 'psychology']) {
        const progressFill = document.getElementById(`${agent}Progress`);
        const status = document.getElementById(`${agent}Status`);
        if (progressFill) progressFill.style.width = '0%';
        if (status) {
            status.textContent = '等待中';
            status.className = 'agent-status';
        }
    }
    // 清空思维链
    const thinkingChain = document.getElementById('agentThinkingChain');
    if (thinkingChain) {
        thinkingChain.innerHTML = '';
        thinkingChain.classList.remove('active');
    }
}

// 添加思维链条目
function addThinkingItem(agentType, content) {
    const thinkingChain = document.getElementById('agentThinkingChain');
    if (!thinkingChain) return;

    thinkingChain.classList.add('active');

    const agentKey = agentType.toLowerCase().replace('agent', '');
    const agentName = AGENT_CONFIG.names[agentKey] || agentType;

    const item = document.createElement('div');
    item.className = 'thinking-item';
    item.innerHTML = `
        <span class="thinking-agent ${agentKey}">${agentName}</span>
        <span class="thinking-content">${content}</span>
    `;

    thinkingChain.appendChild(item);
    thinkingChain.scrollTop = thinkingChain.scrollHeight;
}

// 显示 Agent 一致性结果
function showAgentConsensus(summary) {
    // 在进度面板中显示最终共识
    const panel = document.getElementById('agentProgressPanel');
    if (!panel) return;

    // 检查是否已有共识元素
    let consensusEl = panel.querySelector('.agent-final-consensus');
    if (!consensusEl) {
        consensusEl = document.createElement('div');
        consensusEl.className = 'agent-final-consensus';
        consensusEl.style.cssText = 'margin-top: 15px; padding: 12px; background: var(--bg-card); border-radius: 10px; text-align: center;';
        panel.appendChild(consensusEl);
    }

    const score = summary.finalScore || summary.final_score || 50;
    const consensus = summary.consensus || 'aligned';

    consensusEl.innerHTML = `
        <div style="font-size: 1.5rem; font-weight: 700; color: ${score > 60 ? 'var(--accent-green)' : score < 40 ? 'var(--accent-red)' : 'var(--accent-yellow)'}">${score}分</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
            ${consensus === 'divergent' ? '⚠️ Agent 存在分歧，建议谨慎决策' : '✓ 3 个 Agent 达成共识'}
        </div>
    `;
}

// 决策检查流程
function handleImpulseCheck(action) {
    if (!Logic.state.currentCompany) { alert('请先分析一家标的'); return; }

    // 保存当前操作类型
    Logic.state.lastAction = action;

    const score = Logic.state.currentScore;
    console.log('[handleImpulseCheck] 操作:', action, '分数:', score, '公司:', Logic.state.currentCompany);

    // 添加按钮选中状态
    document.querySelectorAll('.trade-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.trade-btn[data-action="${action}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    const result = Logic.evaluateImpulse(action, Logic.state.currentCompany, score);
    console.log('[handleImpulseCheck] 判断结果:', result);

    // 显示预测反馈弹窗
    showPredictionModal(result, action, Logic.state.currentCompany, score);
}

// 显示预测反馈弹窗
function showPredictionModal(result, action, company, score) {
    const modal = document.getElementById('predictionModal');
    if (!modal) return;

    // 设置操作标签
    const actionTag = document.getElementById('predictionActionTag');
    const actionLabels = { buy: '买入', sell: '卖出', hold: '观望' };
    const actionColors = { buy: 'var(--accent-green)', sell: 'var(--accent-red)', hold: 'var(--accent-blue)' };
    if (actionTag) {
        actionTag.textContent = actionLabels[action] || '未知';
        actionTag.style.background = actionColors[action] || 'var(--text-secondary)';
    }

    // 设置公司和分数
    const companyEl = document.getElementById('predictionCompany');
    const scoreEl = document.getElementById('predictionScore');
    if (companyEl) companyEl.textContent = company;
    if (scoreEl) {
        scoreEl.textContent = score;
        scoreEl.style.color = score > 60 ? 'var(--accent-green)' : (score < 40 ? 'var(--accent-red)' : 'var(--accent-yellow)');
    }

    // 设置诊断信息
    const diagnosis = result.diagnosis;
    const iconEl = document.getElementById('diagnosisIcon');
    const titleEl = document.getElementById('diagnosisTitle');
    const messageEl = document.getElementById('diagnosisMessage');
    if (iconEl) iconEl.textContent = diagnosis.icon;
    if (titleEl) titleEl.textContent = diagnosis.title;
    if (messageEl) messageEl.textContent = diagnosis.message;

    // 设置统计数据
    const stats = diagnosis.stats || {};
    const profitProbEl = document.getElementById('statProfitProb');
    const avgReturnEl = document.getElementById('statAvgReturn');
    const riskLevelEl = document.getElementById('statRiskLevel');
    if (profitProbEl) profitProbEl.textContent = stats.profitProb || '--';
    if (avgReturnEl) {
        avgReturnEl.textContent = stats.avgReturn || '--';
        avgReturnEl.style.color = (stats.avgReturn && !stats.avgReturn.includes('-')) ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    if (riskLevelEl) {
        riskLevelEl.textContent = stats.riskLevel || '--';
        const riskColors = { '极低': 'var(--accent-green)', '低': 'var(--accent-green)', '中等': 'var(--accent-yellow)', '高': '#f97316', '极高': 'var(--accent-red)' };
        riskLevelEl.style.color = riskColors[stats.riskLevel] || 'var(--text-primary)';
    }

    // 设置名言
    const quoteEl = document.getElementById('predictionQuote');
    const quoteTextEl = quoteEl?.querySelector('.quote-text');
    if (quoteTextEl) quoteTextEl.textContent = result.quote || '保持理性，谨慎决策';

    // 显示弹窗
    modal.style.display = 'flex';

    // 保存当前操作类型供确认按钮使用
    modal.dataset.pendingAction = action;
}

// 隐藏预测反馈弹窗
function hidePredictionModal() {
    const modal = document.getElementById('predictionModal');
    if (modal) {
        modal.style.display = 'none';
        delete modal.dataset.pendingAction;
    }
}

// 确认记录决策
function confirmPredictionAction() {
    const modal = document.getElementById('predictionModal');
    if (!modal) return;

    const action = modal.dataset.pendingAction;
    if (!action) return;

    // 隐藏预测弹窗
    hidePredictionModal();

    // 获取损失厌恶警告（基于个人历史数据）
    const lossAversionWarning = Logic.getLossAversionWarning(Logic.state.currentScore);

    const result = Logic.evaluateImpulse(action, Logic.state.currentCompany, Logic.state.currentScore);

    // 检查是否需要冷静期
    if (result.shouldCooldown) {
        document.querySelector('.container').classList.add('impact-active');
        setTimeout(() => document.querySelector('.container').classList.remove('impact-active'), 500);

        UI.showCooldown(
            `${result.diagnosis.message}\n\n请先完成冷静期，再查看本次决策复盘。`,
            true,
            () => {
                UI.showDecisionResult(
                    result.diagnosis,
                    action,
                    Logic.state.currentCompany,
                    Logic.state.currentScore,
                    false,
                    lossAversionWarning
                );
            }
        );
        return;
    }

    // 直接显示决策结果
    UI.showDecisionResult(
        result.diagnosis,
        action,
        Logic.state.currentCompany,
        Logic.state.currentScore,
        false,
        lossAversionWarning
    );
}

// 快速保存决策记录（无需填写表单）
function quickSaveDiary() {
    const company = Logic.state.currentCompany;
    const score = Logic.state.currentScore;
    const type = Logic.state.lastAction || 'hold';
    
    if (!company) {
        UI.showFeedbackPopup({
            type: 'warning',
            title: '请先分析标的',
            message: '请先分析一家公司后再记录决策',
            durationMs: 2000
        });
        return;
    }
    
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('zh-CN'),
        company: company,
        type: type,
        note: '决策类型：' + (type === 'buy' ? '买入' : (type === 'sell' ? '卖出' : '观望')) + '，情绪分数：' + score,
        score: score
    };
    
    Logic.addDiaryEntry(entry);
    renderInlineDiaryList();
    
    UI.showFeedbackPopup({
        type: 'success',
        title: '记录成功',
        message: '决策已保存到日记',
        durationMs: 1500
    });
}

// 导出全局函数供决策结果界面调用
window.quickSaveDiaryFromDecision = quickSaveDiary;
window.showPredictionModal = showPredictionModal;
window.hidePredictionModal = hidePredictionModal;
window.confirmPredictionAction = confirmPredictionAction;

// 保存日记流程（简化版，直接保存）
function handleSaveDiary() {
    const modal = document.getElementById('diaryModal');
    const company = Logic.state.currentCompany || '未知标的';
    const score = Logic.state.currentScore || 50;
    const type = modal.dataset.selectedType || 'hold';
    const note = modal.dataset.note || '';

    const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('zh-CN'),
        company: company,
        type: type,
        note: note,
        score: parseInt(score)
    };

    Logic.addDiaryEntry(entry);
    renderInlineDiaryList();
    UI.closeDiaryModal();

    UI.showFeedbackPopup({
        type: 'success',
        title: '保存成功',
        message: '决策记录已保存。',
        durationMs: 1500
    });
}

// ==================== 新增分析功能 ====================

// 分析新闻 URL
async function analyzeNewsUrl() {
    const input = document.getElementById('newsUrlInput');
    const url = input.value.trim();
    
    if (!url) { 
        UI.showFeedbackPopup({ type: 'warning', title: '请输入链接', message: '请先粘贴新闻链接', durationMs: 2000 });
        return; 
    }

    document.getElementById('analyzeUrlBtn').disabled = true;
    
    try {
        // 显示加载状态
        UI.showLoading(true, 'URL');
        
        // 调用分析函数
        const result = await Logic.analyzeUrlContent(url);
        
        // 更新 UI
        Logic.state.currentCompany = `URL 分析 (${result.source})`;
        Logic.state.currentScore = result.score;
        
        UI.updateGauge(result.score, '新闻情绪');
        UI.createEmotionParticles(result.score);
        
        // 显示结果
        const summaryContent = document.getElementById('summaryContent');
        summaryContent.innerHTML = `
            <div class="insight-item">
                <span class="insight-tag ${result.sentiment === '正面' ? 'positive' : (result.sentiment === '负面' ? 'negative' : 'neutral')}">
                    ${result.sentiment}
                </span>
                <p class="insight-text">${result.summary}</p>
                <p class="insight-source">来源：<a href="${url}" target="_blank" style="color:var(--accent-blue);">查看原文</a></p>
            </div>
        `;

        // 记录历史并更新趋势图
        Logic.recordSentimentScore(`URL:${result.source}`, result.score);
        const historyData = Logic.getSentimentHistory(`URL:${result.source}`);
        Chart.updateSentimentTrendChart(historyData);

        UI.showFeedbackPopup({
            type: 'success',
            title: '分析完成',
            message: `已分析来自${result.source}的新闻`,
            durationMs: 2500
        });
        
    } catch (error) {
        UI.showFeedbackPopup({ 
            type: 'error', 
            title: '分析失败', 
            message: error.message, 
            durationMs: 3000 
        });
    } finally {
        document.getElementById('analyzeUrlBtn').disabled = false;
        // 隐藏加载状态
        const gaugeContainer = document.getElementById('gaugeContainer');
        if (gaugeContainer && !gaugeContainer.querySelector('.gauge-wrapper')) {
            gaugeContainer.innerHTML = '<div class="placeholder"><div class="placeholder-icon">📊</div><p>分析完成后将显示情绪仪表盘</p></div>';
        }
    }
}

// 分析文本
async function analyzeText() {
    const input = document.getElementById('textInput');
    const text = input.value.trim();
    
    if (!text) { 
        UI.showFeedbackPopup({ type: 'warning', title: '请输入文本', message: '请先粘贴要分析的文本内容', durationMs: 2000 });
        return; 
    }

    document.getElementById('analyzeTextBtn').disabled = true;
    
    try {
        UI.showLoading(true, '文本');
        
        const result = await Logic.analyzeTextContent(text);
        
        Logic.state.currentCompany = '文本分析';
        Logic.state.currentScore = result.score;
        
        UI.updateGauge(result.score, '文本情绪');
        UI.createEmotionParticles(result.score);
        
        // 显示结果
        const summaryContent = document.getElementById('summaryContent');
        summaryContent.innerHTML = `
            <div class="insight-item">
                <span class="insight-tag ${result.sentiment === '正面' ? 'positive' : (result.sentiment === '负面' ? 'negative' : 'neutral')}">
                    ${result.sentiment}
                </span>
                <p class="insight-text">${result.summary}</p>
                ${result.keywords.length > 0 ? `
                    <div style="margin-top: 10px;">
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">关键词：</span>
                        ${result.keywords.map(k => `<span style="display:inline-block;padding:3px 8px;background:var(--bg-secondary);border-radius:6px;margin:2px;font-size:0.8rem;">${k}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // 记录历史并更新趋势图
        Logic.recordSentimentScore('文本分析', result.score);
        const historyData = Logic.getSentimentHistory('文本分析');
        Chart.updateSentimentTrendChart(historyData);

        UI.showFeedbackPopup({
            type: 'success',
            title: '分析完成',
            message: `已分析${text.length}个字符`,
            durationMs: 2500
        });
        
    } catch (error) {
        UI.showFeedbackPopup({ 
            type: 'error', 
            title: '分析失败', 
            message: error.message, 
            durationMs: 3000 
        });
    } finally {
        document.getElementById('analyzeTextBtn').disabled = false;
        // 隐藏加载状态
        const gaugeContainer = document.getElementById('gaugeContainer');
        if (gaugeContainer && !gaugeContainer.querySelector('.gauge-wrapper')) {
            gaugeContainer.innerHTML = '<div class="placeholder"><div class="placeholder-icon">📊</div><p>分析完成后将显示情绪仪表盘</p></div>';
        }
    }
}

// 批量分析（带并发控制和进度显示）
async function analyzeBatch() {
    const input = document.getElementById('batchInput');
    const lines = input.value.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
        UI.showFeedbackPopup({ type: 'warning', title: '请输入公司', message: '请至少输入一个公司名称', durationMs: 2000 });
        return;
    }

    // 限制最多 10 个
    const companies = lines.slice(0, 10);

    document.getElementById('analyzeBatchBtn').disabled = true;

    try {
        // 显示加载状态
        UI.showLoading(false, '批量');

        // 调用批量分析（并发 3 个）
        const results = await Logic.analyzeBatchCompanies(companies, (progress) => {
            // 更新进度显示
            const gaugeContainer = document.getElementById('gaugeContainer');
            const percent = Math.round((progress.current / progress.total) * 100);
            
            gaugeContainer.innerHTML = `
                <div class="batch-progress">
                    <div class="progress-header">
                        <span class="progress-company">🏢 ${progress.company}</span>
                        <span class="progress-count">${progress.current}/${progress.total}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="progress-status">
                        <span class="status-text">正在分析...</span>
                        <span class="status-percent">${percent}%</span>
                    </div>
                </div>
            `;
        }, 3); // 并发 3 个

        // 存储结果到全局变量
        window.lastBatchResults = results;

        // 显示批量分析模态框
        showBatchResultsModal(results);

        const successCount = results.filter(r => r.success).length;
        UI.showFeedbackPopup({
            type: 'success',
            title: '批量分析完成',
            message: `已分析${successCount}/${results.length}个公司`,
            durationMs: 3000
        });

    } catch (error) {
        UI.showFeedbackPopup({
            type: 'error',
            title: '批量分析失败',
            message: error.message,
            durationMs: 3000
        });
    } finally {
        document.getElementById('analyzeBatchBtn').disabled = false;
        // 恢复仪表盘
        const gaugeContainer = document.getElementById('gaugeContainer');
        if (gaugeContainer && !gaugeContainer.querySelector('.gauge-wrapper')) {
            gaugeContainer.innerHTML = '<div class="placeholder"><div class="placeholder-icon">📊</div><p>请输入公司名称开始分析市场情绪</p></div>';
        }
    }
}

// 显示批量分析结果模态框
function showBatchResultsModal(results) {
    console.log('[Batch] 开始显示结果模态框，结果数量:', results.length);
    
    const modal = document.getElementById('batchModalOverlay');
    const tbody = document.getElementById('batchResultsTableBody');
    
    console.log('[Batch] modal 元素:', modal);
    console.log('[Batch] tbody 元素:', tbody);
    console.log('[Batch] modal 当前类名:', modal?.className);

    try {
        // 计算统计数据
        const successResults = results.filter(r => r.success);
        const totalCount = results.length;
        const avgScore = successResults.length > 0
            ? Math.round(successResults.reduce((sum, r) => sum + r.score, 0) / successResults.length)
            : 0;
        const positiveCount = successResults.filter(r => r.score > 60).length;
        const negativeCount = successResults.filter(r => r.score < 40).length;

        console.log('[Batch] 统计数据:', { totalCount, avgScore, positiveCount, negativeCount });

        // 更新统计卡片
        document.getElementById('batchTotalCount').textContent = totalCount;
        document.getElementById('batchAvgScore').textContent = avgScore;
        document.getElementById('batchPositiveCount').textContent = positiveCount;
        document.getElementById('batchNegativeCount').textContent = negativeCount;

        console.log('[Batch] 统计卡片已更新');

        // 按分数排序
        const sortedResults = [...successResults].sort((a, b) => b.score - a.score);

        // 填充表格
        tbody.innerHTML = sortedResults.map((r, index) => {
            const scoreClass = r.score > 60 ? 'greed' : (r.score < 40 ? 'fear' : 'neutral');
            const sentimentText = r.score > 60 ? '贪婪' : (r.score < 40 ? '恐惧' : '中性');
            return `
                <tr>
                    <td><span class="batch-rank">${index + 1}</span></td>
                    <td><span class="batch-company-name">${r.company}</span></td>
                    <td><span class="batch-score-badge ${scoreClass}">${r.score}</span></td>
                    <td><span class="batch-sentiment-tag">${sentimentText}</span></td>
                    <td><span class="batch-sector-tag">${r.profile?.sector || '综合'}</span></td>
                    <td>
                        <button class="batch-action-btn" onclick="window.selectBatchCompany('${r.company}')">分析</button>
                    </td>
                </tr>
            `;
        }).join('');

        console.log('[Batch] 表格已填充');

        // 如果没有结果，显示空状态
        if (successResults.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">暂无分析结果</td></tr>';
        }

        // 更新图表
        updateBatchComparisonChart(sortedResults);

        console.log('[Batch] 图表已更新');

        // 显示模态框 - 使用 active 类
        setTimeout(() => {
            if (modal) {
                modal.classList.add('active');
                console.log('[Batch] 模态框 active 类已添加，当前类名:', modal.className);
            } else {
                console.error('[Batch] modal 元素不存在');
            }
        }, 100);
        
    } catch (error) {
        console.error('[Batch] 显示模态框出错:', error);
    }
}

// 更新批量分析对比图表（已禁用）
let batchChartInstance = null;

function updateBatchComparisonChart(results) {
    // 图表功能已禁用
    console.log('[Batch] 图表功能已禁用');
}

// 选择批量分析中的公司进行详细分析
window.selectBatchCompany = function(company) {
    // 关闭模态框
    document.getElementById('batchModalOverlay').style.display = 'none';
    
    // 切换到公司分析模式
    document.getElementById('companyInput').value = company;
    
    // 触发分析
    analyzeCompany();
};

// 导出批量分析结果为 CSV
function exportBatchResults() {
    const results = window.lastBatchResults;
    if (!results || results.length === 0) {
        UI.showFeedbackPopup({
            type: 'warning',
            title: '无数据',
            message: '没有可导出的分析结果',
            durationMs: 2000
        });
        return;
    }

    // 生成 CSV 内容
    const headers = ['排名', '公司', '情绪分数', '情绪状态', '行业', '分析时间'];
    const sortedResults = [...results.filter(r => r.success)].sort((a, b) => b.score - a.score);
    
    const csvRows = [
        headers.join(','),
        ...sortedResults.map((r, index) => [
            index + 1,
            `"${r.company}"`,
            r.score,
            r.score > 60 ? '贪婪' : (r.score < 40 ? '恐惧' : '中性'),
            r.profile?.sector || '综合',
            new Date().toLocaleString('zh-CN')
        ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `FOMOGuard_批量分析_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    UI.showFeedbackPopup({
        type: 'success',
        title: '导出成功',
        message: '分析结果已导出为 CSV 文件',
        durationMs: 2500
    });
}

// ==================== 终端日志输出（打字机特效） ====================

// 终端日志队列，用于控制输出节奏
let terminalQueue = [];
let isProcessingTerminal = false;

/**
 * 添加终端日志行（支持打字机特效）
 * @param {string} text - 日志内容
 * @param {string} type - 日志类型：system, sentiment, technical, psychology, success, error
 * @param {boolean} useTypewriter - 是否使用打字机特效
 */
function addTerminalLine(text, type = 'system', useTypewriter = true) {
    const terminalBody = document.getElementById('terminalBody');
    if (!terminalBody) return;

    // 创建日志行元素
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    
    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = getTerminalPrompt(type);
    
    const content = document.createElement('span');
    content.className = 'terminal-text';
    line.appendChild(prompt);
    line.appendChild(content);
    
    terminalBody.appendChild(line);
    
    // 自动滚动到底部
    terminalBody.scrollTop = terminalBody.scrollHeight;
    
    // 使用打字机特效逐字显示
    if (useTypewriter && text) {
        return typeWriterEffect(content, text);
    } else {
        content.textContent = text;
        return Promise.resolve();
    }
}

/**
 * 获取终端提示符
 */
function getTerminalPrompt(type) {
    const prompts = {
        system: '$',
        sentiment: '😊',
        technical: '📊',
        psychology: '🧠',
        success: '✓',
        error: '✗'
    };
    return prompts[type] || '$';
}

/**
 * 打字机特效 - 逐字显示文本
 * @param {HTMLElement} element - 要显示文本的元素
 * @param {string} text - 要显示的文本
 * @param {number} speed - 打字速度（毫秒/字）
 */
function typeWriterEffect(element, text, speed = 30) {
    return new Promise((resolve) => {
        let i = 0;
        // 添加光标
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        element.appendChild(cursor);
        
        function type() {
            if (i < text.length) {
                // 在光标前插入字符
                cursor.before(text.charAt(i));
                i++;
                
                // 滚动到底部
                const terminalBody = document.getElementById('terminalBody');
                if (terminalBody) {
                    terminalBody.scrollTop = terminalBody.scrollHeight;
                }
                
                // 随机速度，模拟真实打字
                const randomSpeed = speed * (0.5 + Math.random());
                setTimeout(type, randomSpeed);
            } else {
                // 移除光标
                if (cursor.parentNode) {
                    cursor.parentNode.removeChild(cursor);
                }
                resolve();
            }
        }
        
        type();
    });
}

/**
 * 清空终端日志
 */
function clearTerminal() {
    const terminalBody = document.getElementById('terminalBody');
    if (terminalBody) {
        terminalBody.innerHTML = '';
    }
}

/**
 * 初始化终端日志
 */
function initTerminal() {
    clearTerminal();
    addTerminalLine('初始化 Multi-Agent 系统...', 'system', false);
}

// ==================== 骨架屏控制 ====================

/**
 * 显示骨架屏
 * @param {string} skeletonId - 骨架屏元素 ID
 */
function showSkeleton(skeletonId) {
    const skeleton = document.getElementById(skeletonId);
    if (skeleton) {
        skeleton.style.display = 'block';
    }
}

/**
 * 隐藏骨架屏
 * @param {string} skeletonId - 骨架屏元素 ID
 */
function hideSkeleton(skeletonId) {
    const skeleton = document.getElementById(skeletonId);
    if (skeleton) {
        skeleton.style.display = 'none';
    }
}

/**
 * 显示所有加载骨架屏
 */
function showAllSkeletons() {
    showSkeleton('decisionSkeleton');
    showSkeleton('agentVizSkeleton');
    showSkeleton('summarySkeleton');
    showSkeleton('sourceSkeleton');
}

/**
 * 隐藏所有骨架屏
 */
function hideAllSkeletons() {
    hideSkeleton('decisionSkeleton');
    hideSkeleton('agentVizSkeleton');
    hideSkeleton('summarySkeleton');
    hideSkeleton('sourceSkeleton');
}

// ==================== 增强的 Agent 进度显示 ====================

/**
 * 显示 Agent 进度面板（带终端初始化）
 */
function showAgentProgressPanel() {
    const panel = document.getElementById('agentProgressPanel');
    if (panel) {
        panel.style.display = 'block';
        // 初始化终端
        initTerminal();
        // 重置所有进度
        resetAgentProgressUI();
        // 隐藏进度条，只显示终端（可选）
        const progressBars = document.getElementById('agentProgressBars');
        if (progressBars) {
            progressBars.style.display = 'none';
        }
    }
}

/**
 * 更新 Agent 进度（同时更新终端日志）
 */
function updateAgentProgress(agentType, status, progress, score = null) {
    const agentKey = agentType.toLowerCase().replace('agent', '');
    const progressFill = document.getElementById(`${agentKey}Progress`);
    const statusEl = document.getElementById(`${agentKey}Status`);

    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    if (statusEl) {
        statusEl.className = `agent-status ${status}`;
        if (status === 'completed' && score !== null) {
            statusEl.textContent = `${score}分`;
        } else if (status === 'processing') {
            statusEl.textContent = '分析中...';
        } else if (status === 'failed') {
            statusEl.textContent = '失败';
        } else {
            statusEl.textContent = '等待中';
        }
    }
}

// 导出全局函数供其他模块使用
window.addTerminalLine = addTerminalLine;
window.clearTerminal = clearTerminal;
window.showSkeleton = showSkeleton;
window.hideSkeleton = hideSkeleton;
window.showAllSkeletons = showAllSkeletons;
window.hideAllSkeletons = hideAllSkeletons;
window.showAgentVisualization = AgentViz.showAgentVisualization;

// 启动应用
init();
