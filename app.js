import * as Logic from './logic.js';
import * as UI from './ui.js';
import { AI_CONFIG } from './config.js';

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
    UI.showLoading(Logic.state.useAIBackend);

    let scoreData;
    let aiData = null;

    // 尝试获取 AI 数据
    if (Logic.state.useAIBackend) {
        aiData = await Logic.fetchAIAnalysis(company);
    }

    if (aiData) {
        Logic.state.currentScore = aiData.score;
        scoreData = { score: aiData.score, profile: Logic.getProfile(company) }; // 混合配置
    } else {
        // Fallback 到本地 Mock
        // 模拟一点延迟，让加载动画显现，提升体验
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

    document.getElementById('analyzeBtn').disabled = false;
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