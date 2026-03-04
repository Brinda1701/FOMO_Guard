import * as Logic from './logic.js';
import * as UI from './ui.js';
import * as Chart from './chart.js';
import * as AgentViz from './agent-viz.js';
import { AI_CONFIG, AGENT_CONFIG } from './config.js';

// 初始化
async function init() {
    initTheme();
    // 修复：传入 'init' 标记，让初始粒子显示为品牌蓝色，避免黄色的误导
    UI.createEmotionParticles('init');
    UI.renderDiaryList(Logic.getDiaryEntries());

    const hasAI = await Logic.checkAIBackend();
    UI.showAIModeIndicator(hasAI);

    setupEventListeners();
    setupRealtimeWS();
}

// WebSocket realtime connection to backend
let ws;
function setupRealtimeWS() {
    try {
        const base = AI_CONFIG.URL || window.location.origin;
        const wsUrl = base.replace(/^http/, 'ws') + '/ws';
        ws = new WebSocket(wsUrl);

        ws.addEventListener('open', () => console.log('[WS] connected'));
        ws.addEventListener('close', () => {
            console.log('[WS] closed, retry in 3s');
            setTimeout(setupRealtimeWS, 3000);
        });
        ws.addEventListener('message', (evt) => {
            try {
                const msg = JSON.parse(evt.data);
                if (msg.type === 'realtime_update') {
                    // If currently viewing this company, update UI
                    if (Logic.state.currentCompany && Logic.state.currentCompany === msg.company) {
                        Logic.state.currentScore = msg.score;
                        UI.updateGauge(msg.score, msg.company);
                        UI.createEmotionParticles(msg.score);
                    }
                    // update history / source displays
                    UI.updateHistory();
                    UI.updateSources();
                }
                if (msg.type === 'profile_update') {
                    // notify user and optionally refresh UI
                    console.log('[WS] profile updated', msg.key);
                    // could trigger a re-analysis if needed
                }
            } catch (e) { console.error('[WS] parse error', e); }
        });
    } catch (e) { console.error('[WS] setup error', e); }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const themeToggle = document.getElementById('themeToggle');

    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    }
}

function setupEventListeners() {
    // 主题切换
    document.getElementById('themeToggle').addEventListener('click', () => {
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

    // 输入模式切换
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => switchInputMode(tab.dataset.mode));
    });

    // 公司分析
    document.getElementById('analyzeBtn').addEventListener('click', analyzeCompany);
    document.getElementById('companyInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') analyzeCompany();
    });
    document.querySelectorAll('.quick-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.getElementById('companyInput').value = tag.dataset.company;
            switchInputMode('company');
            analyzeCompany();
        });
    });

    // URL 分析
    document.getElementById('analyzeUrlBtn').addEventListener('click', analyzeNewsUrl);
    document.getElementById('newsUrlInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') analyzeNewsUrl();
    });

    // 文本分析
    document.getElementById('analyzeTextBtn').addEventListener('click', analyzeText);
    document.getElementById('textInput').addEventListener('input', () => {
        const count = document.getElementById('textInput').value.length;
        document.getElementById('charCount').textContent = count;
    });
    document.getElementById('textInput').addEventListener('keypress', e => {
        if (e.key === 'Enter' && e.ctrlKey) analyzeText(); // Ctrl+Enter 快捷分析
    });

    // 批量分析
    document.getElementById('analyzeBatchBtn').addEventListener('click', analyzeBatch);
    document.getElementById('batchInput').addEventListener('input', () => {
        const lines = document.getElementById('batchInput').value.split('\n').filter(l => l.trim());
        document.getElementById('batchCount').textContent = Math.min(lines.length, 10);
    });

    // 交易决策按钮
    document.querySelectorAll('.trade-btn').forEach(btn => {
        if (!btn.classList.contains('diary-type-btn')) {
            btn.addEventListener('click', () => handleImpulseCheck(btn.dataset.action));
        }
    });

    // 决策结果界面交互
    document.getElementById('backToMain').addEventListener('click', UI.closeDecisionOverlay);
    document.getElementById('continueAnalyzeBtn').addEventListener('click', UI.closeDecisionOverlay);
    document.getElementById('recordDecisionBtn').addEventListener('click', () => {
        UI.closeDecisionOverlay();
        UI.openDiaryModal(Logic.state.currentCompany, Logic.state.currentScore);
    });

    // 心理测试
    document.getElementById('showQuizBtn').addEventListener('click', UI.showQuiz);

    // 日记相关
    document.getElementById('addDiaryBtn').addEventListener('click', () => {
        UI.openDiaryModal(Logic.state.currentCompany, Logic.state.currentScore);
    });
    document.getElementById('cancelDiaryBtn').addEventListener('click', UI.closeDiaryModal);
    document.getElementById('saveDiaryBtn').addEventListener('click', handleSaveDiary);

    // 日记类型选择
    let selectedDiaryType = 'hold';
    document.querySelectorAll('.diary-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.diary-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedDiaryType = this.dataset.type;
            document.getElementById('diaryModal').dataset.selectedType = selectedDiaryType;
        });
    });

    // 日记滑块
    document.getElementById('diaryScore').addEventListener('input', function() {
        document.getElementById('diaryScoreDisplay').textContent = this.value;
    });

    // 日记删除
    document.getElementById('diaryList').addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.diary-delete-btn');
        if (!deleteBtn) return;

        const entryId = Number(deleteBtn.dataset.entryId);
        if (!entryId) return;

        const shouldDelete = confirm('确定删除这条决策记录吗？删除后无法恢复。');
        if (!shouldDelete) return;

        const hasRemoved = Logic.removeDiaryEntry(entryId);
        if (hasRemoved) {
            UI.renderDiaryList(Logic.getDiaryEntries());
            UI.showFeedbackPopup({
                type: 'success',
                title: '删除成功',
                message: '该条决策记录已删除。',
                durationMs: 1800
            });
        }
    });
}

// 切换输入模式
function switchInputMode(mode) {
    // 更新标签页状态
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    // 更新面板显示
    document.querySelectorAll('.input-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === mode + 'Panel');
    });
    
    // 聚焦到对应输入框
    setTimeout(() => {
        if (mode === 'company') document.getElementById('companyInput')?.focus();
        else if (mode === 'url') document.getElementById('newsUrlInput')?.focus();
        else if (mode === 'text') document.getElementById('textInput')?.focus();
        else if (mode === 'batch') document.getElementById('batchInput')?.focus();
    }, 100);
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

    try {
        const result = await Logic.fetchMultiAgentAnalysis(company, 'analyze', {
            onAgentStart: (data) => {
                updateAgentProgress(data.agent, 'processing', 10);
                addThinkingItem(data.agent, '开始分析...');
            },
            onAgentProgress: (data) => {
                updateAgentProgress(data.agent, 'processing', data.progress);
                if (data.message) {
                    addThinkingItem(data.agent, data.message);
                }
            },
            onAgentComplete: (data) => {
                updateAgentProgress(data.agent, 'completed', 100, data.score);
                addThinkingItem(data.agent, `分析完成，得分：${data.score}分`);
            },
            onAgentError: (data) => {
                updateAgentProgress(data.agent, 'failed', 0);
                addThinkingItem(data.agent, `分析失败：${data.error || '未知错误'}`);
            },
            onSummary: (summary) => {
                handleMultiAgentSummary(summary, company);
            },
            onError: (error) => {
                console.error('[Multi-Agent] Error:', error);
                // 降级到单 Agent 模式
                hideAgentProgressPanel();
                analyzeWithSingleMode(company);
            },
            onDone: () => {
                // 分析完成后延迟隐藏进度面板
                setTimeout(() => {
                    hideAgentProgressPanel();
                }, 2000);
            }
        });

        if (!result) {
            // Multi-Agent 失败，降级
            hideAgentProgressPanel();
            await analyzeWithSingleMode(company);
        }

    } catch (error) {
        console.error('[Multi-Agent] Failed:', error);
        hideAgentProgressPanel();
        await analyzeWithSingleMode(company);
    }
}

// 单 Agent/Mock 模式分析
async function analyzeWithSingleMode(company) {
    UI.showLoading(Logic.state.useAIBackend);

    let scoreData;
    let aiData = null;

    // 尝试获取 AI 数据
    if (Logic.state.useAIBackend) {
        aiData = await Logic.fetchAIAnalysis(company);
    }

    if (aiData) {
        Logic.state.currentScore = aiData.score;
        scoreData = { score: aiData.score, profile: Logic.getProfile(company) };
    } else {
        await new Promise(r => setTimeout(r, 800));
        scoreData = Logic.genScore(company);
        Logic.state.currentScore = scoreData.score;
    }

    const { score, profile } = scoreData;

    // 记录情绪分数到历史数据
    const historyData = Logic.recordSentimentScore(company, score);

    // 更新所有 UI 组件
    UI.updateGauge(score, company);
    UI.updateHistory();
    UI.updateSources();
    UI.renderAIInsights(score, company, profile, aiData);
    UI.updateValidationChart(score, company);
    UI.createEmotionParticles(score);

    // 更新情绪趋势图
    Chart.updateSentimentTrendChart(historyData);

    const trends = Logic.generateTrendData(company, profile);
    UI.updateHotTrends(trends);
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

    // 渲染 Multi-Agent 增强的 AI 洞察
    renderMultiAgentInsights(summary, company, profile);

    UI.updateValidationChart(score, company);

    // 更新情绪趋势图
    Chart.updateSentimentTrendChart(historyData);

    // === 新增：更新 Multi-Agent 可视化面板 ===
    updateAgentVisualization(summary, company);

    const trends = Logic.generateTrendData(company, profile);
    UI.updateHotTrends(trends);

    // 显示 Agent 一致性结果
    showAgentConsensus(summary);
}

// 更新 Multi-Agent 可视化面板
function updateAgentVisualization(summary, company) {
    // 显示可视化面板
    AgentViz.showAgentVisualization();

    // 获取各 Agent 分数
    const breakdown = summary.breakdown || {};
    const scores = {
        sentiment: breakdown.sentiment?.score || 50,
        technical: breakdown.technical?.score || 50,
        psychology: breakdown.psychology?.score || 50
    };

    // 初始化/更新雷达图
    setTimeout(() => {
        AgentViz.initAgentRadarChart(scores);
    }, 100);

    // 更新分数卡片
    AgentViz.updateAgentScoreCards(scores);

    // 更新最终决策建议
    const consensus = summary.consensus || 'aligned';
    const recommendation = summary.recommendation || {};

    AgentViz.updateFinalDecision({
        icon: consensus === 'divergent' ? '⚠️' : '✓',
        title: consensus === 'divergent' ? 'Agent 存在分歧，建议谨慎' : 'Agent 达成共识',
        content: recommendation.message || summary.insights?.[0]?.content || '分析完成',
        consensus: consensus
    });
}

// 渲染 Multi-Agent 洞察
function renderMultiAgentInsights(summary, company, profile) {
    const summaryContent = document.getElementById('summaryContent');

    let insightsHtml = `
        <div class="agent-result-summary">
            <div class="agent-consensus">
                <span>Agent 共识：</span>
                <span class="consensus-badge ${summary.consensus || 'aligned'}">
                    ${summary.consensus === 'divergent' ? '⚠️ 存在分歧' : '✓ 一致认同'}
                </span>
            </div>
            <div class="agent-scores-breakdown">
    `;

    // 显示各 Agent 分数
    if (summary.breakdown) {
        for (const [agent, data] of Object.entries(summary.breakdown)) {
            const icon = AGENT_CONFIG.icons[agent] || '🤖';
            const name = AGENT_CONFIG.names[agent] || agent;
            insightsHtml += `
                <div class="agent-score-item">
                    <span>${icon}</span>
                    <span>${name}</span>
                    <span class="agent-score-value">${data.score}分</span>
                </div>
            `;
        }
    }

    insightsHtml += '</div></div>';

    // 添加洞察列表
    if (summary.insights && summary.insights.length > 0) {
        insightsHtml += '<div class="insights-list" style="margin-top: 15px;">';
        for (const insight of summary.insights.slice(0, 5)) {
            const source = insight.source ? `<span class="insight-source">[${insight.source}]</span>` : '';
            insightsHtml += `
                <div class="insight-item">
                    ${source}
                    <span class="insight-content">${insight.content}</span>
                </div>
            `;
        }
        insightsHtml += '</div>';
    }

    // 添加警告
    if (summary.warnings && summary.warnings.length > 0) {
        insightsHtml += '<div class="warnings-list" style="margin-top: 15px;">';
        for (const warning of summary.warnings) {
            const text = typeof warning === 'string' ? warning : warning.text;
            insightsHtml += `
                <div class="warning-item" style="color: var(--accent-yellow); padding: 8px; background: rgba(245,158,11,0.1); border-radius: 8px; margin-bottom: 8px;">
                    ⚠️ ${text}
                </div>
            `;
        }
        insightsHtml += '</div>';
    }

    // 添加建议
    if (summary.recommendation) {
        insightsHtml += `
            <div class="recommendation" style="margin-top: 15px; padding: 15px; background: var(--bg-card); border-radius: 12px; border-left: 3px solid var(--accent-purple);">
                <strong>💡 AI 建议:</strong>
                <p style="margin-top: 8px; color: var(--text-secondary);">${summary.recommendation.message || ''}</p>
            </div>
        `;
    }

    summaryContent.innerHTML = insightsHtml;
}

// 显示 Agent 进度面板
function showAgentProgressPanel() {
    const panel = document.getElementById('agentProgressPanel');
    if (panel) {
        panel.style.display = 'block';
        // 重置所有进度
        resetAgentProgressUI();
    }
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

// 更新 Agent 进度
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

    const result = Logic.evaluateImpulse(action, Logic.state.currentCompany, Logic.state.currentScore);

    const showDecisionOverlay = () => UI.showDecisionResult(
        result.diagnosis,
        action,
        Logic.state.currentCompany,
        Logic.state.currentScore,
        false
    );

    if (result.shouldCooldown) {
        document.querySelector('.container').classList.add('impact-active');
        setTimeout(() => document.querySelector('.container').classList.remove('impact-active'), 500);

        UI.showCooldown(
            `${result.diagnosis.message}\n\n请先完成冷静期，再查看本次决策复盘。`,
            true,
            showDecisionOverlay
        );
        return;
    }

    showDecisionOverlay();
}

// 保存日记流程
function handleSaveDiary() {
    const company = document.getElementById('diaryCompany').value.trim();
    const note = document.getElementById('diaryNote').value.trim();
    const score = document.getElementById('diaryScore').value;
    const type = document.getElementById('diaryModal').dataset.selectedType || 'hold';

    if (!company) { alert('请输入标的名称'); return; }
    if (!note) { alert('请输入决策心理记录'); return; }

    const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('zh-CN'),
        company: company,
        type: type,
        note: note,
        score: parseInt(score)
    };

    Logic.addDiaryEntry(entry);
    UI.renderDiaryList(Logic.getDiaryEntries());
    UI.closeDiaryModal();

    alert('决策记录已保存！定期回顾可以帮助您识别情绪化交易模式。');
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
        
        // 记录历史
        Logic.recordSentimentScore(`URL:${result.source}`, result.score);
        
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
        
        // 记录历史
        Logic.recordSentimentScore('文本分析', result.score);
        
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

// 批量分析
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
        // 显示批量分析结果区域
        let resultsContainer = document.getElementById('batchResults');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'batchResults';
            resultsContainer.className = 'batch-results';
            
            // 插入到批量分析面板下方
            document.getElementById('batchPanel').parentNode.insertBefore(
                resultsContainer,
                document.getElementById('batchPanel').nextSibling
            );
        }
        
        resultsContainer.innerHTML = '<div class="batch-loading">正在分析中，请稍候...</div>';
        
        // 调用批量分析
        const results = await Logic.analyzeBatchCompanies(companies, (progress) => {
            resultsContainer.innerHTML = `
                <div class="batch-loading">
                    <div class="spinner"></div>
                    <span>正在分析 ${progress.company} (${progress.current}/${progress.total})...</span>
                </div>
            `;
        });
        
        // 显示结果
        resultsContainer.innerHTML = results.map(r => {
            if (r.success) {
                const scoreClass = r.score > 60 ? 'greed' : (r.score < 40 ? 'fear' : 'neutral');
                return `
                    <div class="batch-result-card">
                        <div class="batch-result-header">
                            <span class="batch-result-company">${r.company}</span>
                            <span class="batch-result-score ${scoreClass}">${r.score}</span>
                        </div>
                        <div class="batch-result-detail">
                            情绪：${r.sentiment}<br>
                            行业：${r.profile?.sector || '未知'}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="batch-result-card">
                        <div class="batch-result-header">
                            <span class="batch-result-company">${r.company}</span>
                            <span style="color: #ef4444;">❌</span>
                        </div>
                        <div class="batch-result-detail" style="color: #ef4444;">
                            ${r.error}
                        </div>
                    </div>
                `;
            }
        }).join('');
        
        UI.showFeedbackPopup({ 
            type: 'success', 
            title: '批量分析完成', 
            message: `已分析${results.filter(r => r.success).length}/${results.length}个公司`, 
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
    }
}

// 启动应用
init();
