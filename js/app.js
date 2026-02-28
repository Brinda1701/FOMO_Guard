import * as Logic from './logic.js';
import * as UI from './ui.js';
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

    // 搜索与分析
    document.getElementById('analyzeBtn').addEventListener('click', analyzeCompany);
    document.getElementById('companyInput').addEventListener('keypress', e => { 
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
        if (!btn.classList.contains('diary-type-btn')) { // 排除日记弹窗里的按钮
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
            // 将类型暂存到 DOM 元素上以便保存时获取，或使用闭包变量
            document.getElementById('diaryModal').dataset.selectedType = selectedDiaryType;
        });
    });
    
    // 日记滑块
    document.getElementById('diaryScore').addEventListener('input', function() {
        document.getElementById('diaryScoreDisplay').textContent = this.value;
    });
}

// 核心分析流程
async function analyzeCompany() {
    const input = document.getElementById('companyInput');
    const company = input.value.trim();
    if (!company) { alert('请输入公司名称'); return; }
    
    Logic.state.currentCompany = company;
    document.getElementById('analyzeBtn').disabled = true;
    
    // 检查是否启用Multi-Agent模式
    if (Logic.state.useAIBackend && Logic.state.useMultiAgent) {
        await analyzeWithMultiAgent(company);
    } else {
        await analyzeWithSingleMode(company);
    }

    document.getElementById('analyzeBtn').disabled = false;
}

// Multi-Agent分析模式
async function analyzeWithMultiAgent(company) {
    // 显示Multi-Agent进度面板
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
                addThinkingItem(data.agent, `分析完成，得分: ${data.score}分`);
            },
            onAgentError: (data) => {
                updateAgentProgress(data.agent, 'failed', 0);
                addThinkingItem(data.agent, `分析失败: ${data.error || '未知错误'}`);
            },
            onSummary: (summary) => {
                handleMultiAgentSummary(summary, company);
            },
            onError: (error) => {
                console.error('[Multi-Agent] Error:', error);
                // 降级到单Agent模式
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
            // Multi-Agent失败，降级
            hideAgentProgressPanel();
            await analyzeWithSingleMode(company);
        }
        
    } catch (error) {
        console.error('[Multi-Agent] Failed:', error);
        hideAgentProgressPanel();
        await analyzeWithSingleMode(company);
    }
}

// 单Agent/Mock模式分析
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
    
    // 更新所有 UI 组件
    UI.updateGauge(score, company);
    UI.updateHistory();
    UI.updateSources();
    UI.renderAIInsights(score, company, profile, aiData);
    UI.updateValidationChart(score, company);
    UI.createEmotionParticles(score);
    
    const trends = Logic.generateTrendData(company, profile);
    UI.updateHotTrends(trends);
}

// 处理Multi-Agent汇总结果
function handleMultiAgentSummary(summary, company) {
    const score = summary.finalScore || summary.final_score || 50;
    Logic.state.currentScore = score;
    
    const profile = Logic.getProfile(company);
    
    // 更新主要UI
    UI.updateGauge(score, company);
    UI.updateHistory();
    UI.updateSources();
    UI.createEmotionParticles(score);
    
    // 渲染Multi-Agent增强的AI洞察
    renderMultiAgentInsights(summary, company, profile);
    
    UI.updateValidationChart(score, company);
    
    const trends = Logic.generateTrendData(company, profile);
    UI.updateHotTrends(trends);
    
    // 显示Agent一致性结果
    showAgentConsensus(summary);
}

// 渲染Multi-Agent洞察
function renderMultiAgentInsights(summary, company, profile) {
    const summaryContent = document.getElementById('summaryContent');
    
    let insightsHtml = `
        <div class="agent-result-summary">
            <div class="agent-consensus">
                <span>Agent共识: </span>
                <span class="consensus-badge ${summary.consensus || 'aligned'}">
                    ${summary.consensus === 'divergent' ? '⚠️ 存在分歧' : '✓ 一致认同'}
                </span>
            </div>
            <div class="agent-scores-breakdown">
    `;
    
    // 显示各Agent分数
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
                <strong>💡 AI建议:</strong>
                <p style="margin-top: 8px; color: var(--text-secondary);">${summary.recommendation.message || ''}</p>
            </div>
        `;
    }
    
    summaryContent.innerHTML = insightsHtml;
}

// 显示Agent进度面板
function showAgentProgressPanel() {
    const panel = document.getElementById('agentProgressPanel');
    if (panel) {
        panel.style.display = 'block';
        // 重置所有进度
        resetAgentProgressUI();
    }
}

// 隐藏Agent进度面板
function hideAgentProgressPanel() {
    const panel = document.getElementById('agentProgressPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

// 重置Agent进度UI
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

// 更新Agent进度
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

// 显示Agent一致性结果
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
            ${consensus === 'divergent' ? '⚠️ Agent存在分歧，建议谨慎决策' : '✓ 3个Agent达成共识'}
        </div>
    `;
}

// 决策检查流程
function handleImpulseCheck(action) {
    if (!Logic.state.currentCompany) { alert('请先分析一家标的'); return; }
    
    const result = Logic.evaluateImpulse(action, Logic.state.currentCompany, Logic.state.currentScore);
    
    UI.showDecisionResult(
        result.diagnosis, 
        action, 
        Logic.state.currentCompany, 
        Logic.state.currentScore, 
        result.shouldCooldown
    );
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

// 启动应用
init();