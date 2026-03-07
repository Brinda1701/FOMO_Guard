import { PSYCHOLOGY_QUIZZES } from './config.js';
import * as Logic from './logic.js';

// --- 全局 UI 状态 ---
let cooldownTimer = null;
let breatheInterval = null;
let currentQuiz = null;
let quizAnswered = false;
let cooldownTotalSeconds = 300;
let cooldownRemainingSeconds = 300;
let cooldownUnlockCallback = null;
let quizAttemptCount = 0;
let quizCorrectCount = 0;
let feedbackTimer = null;

// --- 模拟模式警告 ---
export function showSimulatedModeWarning() {
    // 检查是否已存在警告
    let warningEl = document.getElementById('simulatedModeWarning');
    if (warningEl) {
        warningEl.style.display = 'block';
        return;
    }

    // 创建警告元素
    warningEl = document.createElement('div');
    warningEl.id = 'simulatedModeWarning';
    warningEl.style.cssText = `
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1));
        border: 2px solid var(--accent-yellow);
        border-radius: 12px;
        padding: 15px 20px;
        margin: 15px 0;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: pulseWarning 2s infinite;
    `;
    warningEl.innerHTML = `
        <span style="font-size: 1.5rem;">⚠️</span>
        <div>
            <strong style="color: var(--accent-yellow); font-size: 1rem;">当前未配置 AI 模型 Key，处于本地模拟演示模式</strong>
            <p style="margin: 5px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                分析结果均为随机生成，仅供参考，不构成投资建议。请在 .env 文件中配置 MODELSCOPE_API_KEY 以启用真实 AI 分析。
            </p>
        </div>
    `;

    // 添加到标题下方
    const header = document.querySelector('header') || document.querySelector('.main-title');
    if (header) {
        header.parentNode.insertBefore(warningEl, header.nextSibling);
    }

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulseWarning {
            0%, 100% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.3); }
            50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.5); }
        }
    `;
    document.head.appendChild(style);
}

export function hideSimulatedModeWarning() {
    const warningEl = document.getElementById('simulatedModeWarning');
    if (warningEl) {
        warningEl.style.display = 'none';
    }
}

// --- 基础 UI 更新 ---
export function updateGauge(score, company) {
    const rotation = (score / 100) * 180 - 90;
    let valueColor = score > 70 ? '#10b981' : (score < 30 ? '#ef4444' : '#f59e0b');

    document.getElementById('gaugeContainer').innerHTML = `
        <div class="gauge-wrapper">
            <div class="gauge-bg"></div> <div class="gauge-inner"></div>
            <div class="gauge-needle" style="transform: translateX(-50%) rotate(${rotation}deg);"></div>
            <div class="gauge-center"></div>
        </div>
        <div class="gauge-value" style="color: ${valueColor}">${score}</div>
        <div class="gauge-label">${company} 情绪指数</div>
    `;
}

export function updateHistory() {
    const historyChart = document.getElementById('historyChart');
    const historyData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 80) + 10);
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    historyChart.innerHTML = historyData.map((v, i) => {
        const barClass = v < 40 ? 'fear' : (v > 60 ? 'greed' : 'neutral');
        return `<div class="history-bar ${barClass}" style="height: ${v}px" data-value="${days[i]}: ${v}"></div>`;
    }).join('');
}

export function updateSources() {
    document.getElementById('weiboCount').textContent = (Math.floor(Math.random() * 15) + 5) + 'k';
    document.getElementById('xueqiuCount').textContent = (Math.floor(Math.random() * 8) + 3) + 'k';
    document.getElementById('eastmoneyCount').textContent = (Math.floor(Math.random() * 20) + 10) + 'k';
}

export function updateHotTrends(trends) {
    const hotTrendsSection = document.getElementById('hotTrendsSection');
    const hotTrends = document.getElementById('hotTrends');
    
    hotTrends.innerHTML = trends.map((trend, index) => `
        <a href="${trend.link}" target="_blank" class="trend-tag ${trend.isHot ? 'hot' : (trend.isRising ? 'rising' : '')}">
            <span class="trend-rank">${index + 1}</span>
            <span>${trend.keyword}</span>
            <span class="trend-source">${trend.source}</span>
        </a>
    `).join('');
    
    hotTrendsSection.style.display = 'block';
}

export function renderAIInsights(score, company, profile, aiData = null) {
    const summaryArea = document.getElementById('summaryContent');
    const q = encodeURIComponent(company);
    const links = {
        '微博': `https://s.weibo.com/weibo?q=${q}+%E8%82%A1%E5%B8%82`,
        '微信': `https://weixin.sogou.com/weixin?query=${q}+%E7%A0%94%E6%8A%A5`
    };

    let msg = score > 65 ? `检测到热度过载，${company}的相关讨论已偏离基本面。` : 
            score < 35 ? `市场情绪冰封，关于${profile.kw[0]}的利空可能被过度放大。` : 
            `当前舆论主线清晰，情绪锚点相对稳定。`;
    
    let aiSection = '';
    if (aiData && aiData.sentiment_details) {
        const sentiments = aiData.sentiment_details.slice(0, 3);
        aiSection = `
            <div class="insight-item" style="border-left-color: var(--accent-purple);">
                <span class="insight-tag" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6;">🤖 AI情感分析</span>
                <div style="margin-top: 10px;">
                    ${sentiments.map(s => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border-color);">
                            <span style="font-size: 0.85rem;">${s.text}</span>
                            <span style="font-size: 0.8rem; color: ${s.sentiment === 'positive' ? 'var(--accent-green)' : (s.sentiment === 'negative' ? 'var(--accent-red)' : 'var(--accent-yellow)')}">
                                ${s.sentiment === 'positive' ? '😊 正面' : (s.sentiment === 'negative' ? '😟 负面' : '😐 中性')} 
                                ${(s.confidence * 100).toFixed(0)}%
                            </span>
                        </div>
                    `).join('')}
                </div>
                <p class="insight-source" style="margin-top: 10px;">模型：${aiData.model_used || 'ModelScope'}</p>
            </div>
        `;
    }

    summaryArea.innerHTML = `
        ${aiSection}
        <div class="insight-item">
            <p class="insight-text">${msg}</p>
            <p class="insight-source">来源：<a href="${links['微博']}" target="_blank" style="color:var(--accent-blue); text-decoration:underline;">查看微博真实舆情</a></p>
        </div>
        <div class="insight-item">
            <p class="insight-text">机构对${company}的${profile.kw[1]}仍存在较大分歧。</p>
            <p class="insight-source">来源：<a href="${links['微信']}" target="_blank" style="color:var(--accent-blue); text-decoration:underline;">查看微信研报库</a></p>
        </div>
    `;
}

export async function updateValidationChart(score, company) {
    const validationSection = document.getElementById('validationSection');
    const validationChart = document.getElementById('validationChart');
    const validationSummary = document.getElementById('validationSummary');
    
    const isHighSentiment = score > 60;
    const isLowSentiment = score < 40;
    
    let profitRate, lossRate, avgReturn;
    
    if (isHighSentiment) {
        profitRate = Math.floor(Math.random() * 15) + 25;
        lossRate = 100 - profitRate;
        avgReturn = -(Math.random() * 8 + 5).toFixed(1);
    } else if (isLowSentiment) {
        profitRate = Math.floor(Math.random() * 20) + 55;
        lossRate = 100 - profitRate;
        avgReturn = (Math.random() * 12 + 3).toFixed(1);
    } else {
        profitRate = Math.floor(Math.random() * 10) + 45;
        lossRate = 100 - profitRate;
        avgReturn = (Math.random() * 6 - 3).toFixed(1);
    }
    
    const periods = ['7天后', '14天后', '30天后'];
    const chartData = periods.map((period, i) => {
        const profitH = isHighSentiment ? 20 + i * 5 : (isLowSentiment ? 50 + i * 15 : 35 + i * 10);
        const lossH = isHighSentiment ? 60 - i * 5 : (isLowSentiment ? 30 - i * 8 : 40 - i * 5);
        return { period, profitH, lossH };
    });
    
    validationChart.innerHTML = chartData.map(d => `
        <div class="validation-bar-group">
            <div class="validation-bars">
                <div class="validation-bar profit" style="height: ${d.profitH}px;" title="盈利概率"></div>
                <div class="validation-bar loss" style="height: ${d.lossH}px;" title="亏损概率"></div>
            </div>
            <div class="validation-label">${d.period}</div>
        </div>
    `).join('');
    
    validationSummary.innerHTML = `
        <div class="validation-stat">
            <div class="validation-stat-value ${profitRate > 50 ? 'positive' : 'negative'}">${profitRate}%</div>
            <div class="validation-stat-label">历史盈利概率</div>
        </div>
        <div class="validation-stat">
            <div class="validation-stat-value ${parseFloat(avgReturn) >= 0 ? 'positive' : 'negative'}">${parseFloat(avgReturn) >= 0 ? '+' : ''}${avgReturn}%</div>
            <div class="validation-stat-label">平均收益率</div>
        </div>
        <div class="validation-stat">
            <div class="validation-stat-value" style="color: var(--text-primary);">${isHighSentiment ? '偏高' : (isLowSentiment ? '偏低' : '中性')}</div>
            <div class="validation-stat-label">当前情绪等级</div>
        </div>
    `;

    validationSection.style.display = 'block';
    setTimeout(() => { validationSection.classList.add('visible'); }, 10);
}

// --- 沉浸式界面 ---
export function showDecisionResult(diagnosis, action, currentCompany, currentScore, shouldCooldown, lossAversionWarning = null) {
    const overlay = document.getElementById('decisionOverlay');
    const icon = document.getElementById('decisionIcon');
    const title = document.getElementById('decisionTitle');
    const subtitle = document.getElementById('decisionSubtitle');
    const cards = document.getElementById('decisionCards');

    icon.textContent = diagnosis.icon;
    title.textContent = diagnosis.title;
    title.className = `decision-title ${diagnosis.type}`;

    const actionText = action === 'buy' ? '买入' : (action === 'sell' ? '卖出' : '观望');
    subtitle.textContent = `${currentCompany} | ${actionText}决策 | 情绪指数 ${currentScore}`;

    // 生成损失厌恶警告 HTML（如果有）
    let lossAversionHTML = '';
    if (lossAversionWarning && lossAversionWarning.show) {
        const warningClass = lossAversionWarning.type === 'danger' ? 'loss-aversion-danger' : 
                            (lossAversionWarning.type === 'warning' ? 'loss-aversion-warning' : 'loss-aversion-info');
        const statsHTML = lossAversionWarning.stats ? `
            <div class="loss-aversion-stats">
                <div class="loss-stat">
                    <span class="loss-stat-value">${lossAversionWarning.stats.highFomoCount}次</span>
                    <span class="loss-stat-label">历史决策</span>
                </div>
                <div class="loss-stat">
                    <span class="loss-stat-value loss-stat-red">${lossAversionWarning.stats.winRate}%</span>
                    <span class="loss-stat-label">胜率</span>
                </div>
                ${lossAversionWarning.stats.avgLoss ? `
                <div class="loss-stat">
                    <span class="loss-stat-value loss-stat-red">-${lossAversionWarning.stats.avgLoss}%</span>
                    <span class="loss-stat-label">平均亏损</span>
                </div>
                ` : ''}
            </div>
        ` : '';
        
        lossAversionHTML = `
            <div class="loss-aversion-banner ${warningClass}">
                <div class="loss-aversion-header">
                    <span class="loss-aversion-icon">${lossAversionWarning.title.split(' ')[0]}</span>
                    <span class="loss-aversion-title">${lossAversionWarning.title.replace(/^[^\s]+\s*/, '')}</span>
                </div>
                <p class="loss-aversion-message">${lossAversionWarning.message}</p>
                ${statsHTML}
            </div>
        `;
    }

    cards.innerHTML = `
        ${lossAversionHTML}
        
        <div class="decision-card decision-${diagnosis.type}">
            <h3 class="decision-card-title">🎯 诊断结论</h3>
            <div class="decision-card-content">
                <p style="font-size: 1.1rem; margin-bottom: 10px;">${diagnosis.message}</p>
                <p>${diagnosis.detail}</p>
            </div>
        </div>

        <div class="decision-card">
            <h3 class="decision-card-title">📊 历史数据参考</h3>
            <div class="decision-stats">
                <div class="decision-stat">
                    <div class="decision-stat-value ${diagnosis.stats.profitProb.includes('-') ? '' : (parseInt(diagnosis.stats.profitProb) > 50 ? 'positive' : 'negative')}">${diagnosis.stats.profitProb}</div>
                    <div class="decision-stat-label">历史盈利概率</div>
                </div>
                <div class="decision-stat">
                    <div class="decision-stat-value ${diagnosis.stats.avgReturn.includes('+') ? 'positive' : (diagnosis.stats.avgReturn.includes('-') ? 'negative' : '')}">${diagnosis.stats.avgReturn}</div>
                    <div class="decision-stat-label">平均收益率</div>
                </div>
                <div class="decision-stat">
                    <div class="decision-stat-value" style="color: ${diagnosis.type === 'warning' ? 'var(--accent-red)' : (diagnosis.type === 'safe' ? 'var(--accent-green)' : 'var(--accent-yellow)')}">${diagnosis.stats.riskLevel}</div>
                    <div class="decision-stat-label">风险等级</div>
                </div>
            </div>
        </div>

        <div class="decision-card">
            <h3 class="decision-card-title">💡 投资智慧</h3>
            <div class="decision-card-content">
                <div class="decision-quote">${diagnosis.quote}</div>
            </div>
        </div>

        <div class="decision-card decision-action-guide">
            <h3 class="decision-card-title">📝 记录本次决策</h3>
            <div class="decision-card-content">
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 15px;">
                    点击下方按钮，立即保存本次决策到交易日记
                </p>
                <button class="decision-quick-save-btn" id="decisionQuickSaveBtn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    ✓ 保存决策到日记
                </button>
            </div>
        </div>
    `;

    overlay.classList.add('active');

    // 绑定快速保存按钮事件
    setTimeout(() => {
        const quickSaveBtn = document.getElementById('decisionQuickSaveBtn');
        if (quickSaveBtn) {
            quickSaveBtn.addEventListener('click', () => {
                if (typeof window.quickSaveDiaryFromDecision === 'function') {
                    window.quickSaveDiaryFromDecision();
                }
            });
        }
    }, 100);

    // 冷静期触发时机由上层流程控制（先冷却再展示结果）
    if (shouldCooldown) {
        console.debug('[Decision] shouldCooldown=true, cooldown is controlled by app flow');
    }
}

export function closeDecisionOverlay() {
    document.getElementById('decisionOverlay').classList.remove('active');
}

// --- 冷却弹窗与呼吸 ---
function startBreathingGuide() {
    const breatheText = document.getElementById('breatheText');
    let isInhale = true;
    
    if (breatheInterval) clearInterval(breatheInterval);
    
    breatheInterval = setInterval(() => {
        breatheText.textContent = isInhale ? '吸气...' : '呼气...';
        isInhale = !isInhale;
    }, 2000);
}

function stopBreathingGuide() {
    if (breatheInterval) {
        clearInterval(breatheInterval);
        breatheInterval = null;
    }
}

/**
 * 更新环形倒计时进度
 * @param {number} remaining - 剩余秒数
 * @param {number} total - 总秒数
 */
function updateCountdownRing(remaining, total) {
    const ring = document.getElementById('countdownRingProgress');
    if (!ring) return;

    const circumference = 2 * Math.PI * 54;
    const progress = remaining / total;
    const offset = circumference * (1 - progress);

    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${offset}`;

    // 根据剩余时间改变颜色
    if (remaining <= 30) {
        ring.style.stroke = '#10b981';
        ring.style.color = '#10b981';
    } else if (remaining <= 60) {
        ring.style.stroke = '#f59e0b';
        ring.style.color = '#f59e0b';
    } else {
        ring.style.stroke = 'url(#gradient)';
        ring.style.color = '#ef4444';
    }
}

/**
 * 更新冷却阶段提示
 * @param {number} remaining - 剩余秒数
 * @param {number} total - 总秒数
 */
function updateCooldownPhase(remaining, total) {
    const phaseIcon = document.getElementById('phaseIcon');
    const phaseText = document.getElementById('phaseText');
    if (!phaseIcon || !phaseText) return;
    
    const elapsed = total - remaining;
    
    if (elapsed < 30) {
        phaseIcon.textContent = '🫁';
        phaseText.textContent = '深呼吸放松阶段';
    } else if (elapsed < 90) {
        phaseIcon.textContent = '🧠';
        phaseText.textContent = '认知反思阶段 - 回顾你的决策动机';
    } else if (elapsed < 180) {
        phaseIcon.textContent = '📊';
        phaseText.textContent = '理性评估阶段 - 重新审视数据';
    } else {
        phaseIcon.textContent = '✅';
        phaseText.textContent = '即将解锁 - 准备做出冷静决策';
    }
}

// --- 冷静舱（认知隔离舱）增强版 - 强制抄写防线 ---

// 防冲动宣言库
const DECLARATIONS = {
    danger: [
        "我承认我现在正处于极度的贪婪状态，我现在的买入决策可能是不理性的。",
        "我意识到 FOMO 情绪正在控制我的决策，我需要停下来深呼吸。",
        "我承认追高风险极大，我现在买入可能成为接盘侠。",
        "我意识到市场情绪过热，我应该观望而不是盲目跟风。",
        "我承认我现在想买入是因为害怕错过，这是认知偏误。"
    ],
    fear: [
        "我承认我现在正处于极度的恐惧状态，我现在的卖出决策可能是不理性的。",
        "我意识到恐慌情绪正在控制我的决策，我需要停下来深呼吸。",
        "我承认现在卖出可能割在地板上，我应该冷静评估基本面。",
        "我意识到市场情绪过冷，我应该理性分析而不是盲目抛售。",
        "我承认我现在想卖出是因为损失厌恶，这是认知偏误。"
    ]
};

export function showCooldown(msg, isDanger, onUnlock = null) {
    const modal = document.getElementById('cooldownModal');
    const content = modal.querySelector('.modal-content');

    if (isDanger) content.classList.add('modal-danger');
    else content.classList.remove('modal-danger');

    document.getElementById('modalText').textContent = msg;
    modal.style.display = 'flex';
    cooldownUnlockCallback = typeof onUnlock === 'function' ? onUnlock : null;

    // 初始化抄写防线（传入 modal 参数）
    initCopywall(isDanger, modal);

    // 阻止点击背景关闭
    modal.onclick = (e) => {
        // 只有点击解锁按钮才能关闭，点击背景无效
        e.stopPropagation();
    };
}

// 初始化抄写防线
function initCopywall(isDanger, modal) {
    const declarationText = isDanger ? 'danger' : 'fear';
    const declarations = DECLARATIONS[declarationText];
    const declaration = declarations[Math.floor(Math.random() * declarations.length)];

    const declarationEl = document.getElementById('copywallDeclaration');
    const inputEl = document.getElementById('copywallInput');
    const progressFill = document.getElementById('copywallProgressFill');
    const progressText = document.getElementById('copywallProgressText');
    const unlockBtn = document.getElementById('unlockBtn');

    // 设置宣言内容
    declarationEl.innerHTML = `<div class="copywall-declaration-text ${isDanger ? 'highlight' : ''}">${declaration}</div>`;

    // 清空输入框
    inputEl.value = '';
    inputEl.disabled = false;
    inputEl.classList.remove('error');

    // 重置进度条
    progressFill.style.width = '0%';
    progressText.textContent = '0%';

    // 禁用解锁按钮
    unlockBtn.disabled = true;
    unlockBtn.classList.add('modal-btn-disabled');
    unlockBtn.textContent = '🔒 请完成抄写';

    // 阻止复制粘贴
    inputEl.onpaste = (e) => {
        e.preventDefault();
        showFeedbackPopup({
            type: 'warning',
            title: '禁止复制粘贴',
            message: '请一字一句地手写，这是为了帮助您冷静思考。',
            durationMs: 2000
        });
        inputEl.classList.add('error');
        setTimeout(() => inputEl.classList.remove('error'), 400);
    };

    // 监听输入，实时比对
    inputEl.oninput = () => {
        const userInput = inputEl.value.trim();
        const matchPercent = calculateMatchPercent(userInput, declaration);

        // 更新进度条
        progressFill.style.width = `${matchPercent}%`;
        progressText.textContent = `${Math.round(matchPercent)}%`;

        // 检查是否完全匹配
        if (matchPercent >= 100 && userInput === declaration) {
            // 激活解锁按钮
            unlockBtn.disabled = false;
            unlockBtn.classList.remove('modal-btn-disabled');
            unlockBtn.textContent = '🔓 解除隔离';
            inputEl.disabled = true;

            showFeedbackPopup({
                type: 'success',
                title: '抄写完成',
                message: '您已完成防冲动宣言，现在可以理性决策了。',
                durationMs: 1500
            });
        }
    };

    // 解锁按钮点击事件
    unlockBtn.onclick = () => {
        if (!unlockBtn.disabled) {
            modal.style.display = 'none';
            if (cooldownUnlockCallback) {
                const callback = cooldownUnlockCallback;
                cooldownUnlockCallback = null;
                callback();
            }
        }
    };
}

// 计算匹配百分比（用于进度条）
function calculateMatchPercent(input, target) {
    if (!input) return 0;
    if (input === target) return 100;
    
    let matchCount = 0;
    const len = Math.min(input.length, target.length);
    
    for (let i = 0; i < len; i++) {
        if (input[i] === target[i]) {
            matchCount++;
        }
    }
    
    return (matchCount / target.length) * 100;
}

// --- 心理测试 ---
export function showQuiz() {
    const quizSection = document.getElementById('quizSection');
    const quizQuestion = document.getElementById('quizQuestion');
    const quizOptions = document.getElementById('quizOptions');
    const quizResult = document.getElementById('quizResult');
    const quizBadge = document.getElementById('quizBadge');
    
    currentQuiz = PSYCHOLOGY_QUIZZES[Math.floor(Math.random() * PSYCHOLOGY_QUIZZES.length)];
    quizAnswered = false;
    quizAttemptCount++;
    
    if (quizBadge) quizBadge.textContent = `第 ${quizAttemptCount} 题`;
    
    quizQuestion.textContent = currentQuiz.question;
    quizOptions.innerHTML = currentQuiz.options.map((opt, i) => `
        <div class="quiz-option" data-index="${i}">${opt}</div>
    `).join('');
    
    quizResult.style.display = 'none';
    quizSection.classList.add('active');
    document.getElementById('showQuizBtn').style.display = 'none';
    
    // 重新绑定选项点击事件
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.onclick = handleQuizAnswer;
    });
}

function handleQuizAnswer(e) {
    if (quizAnswered) return;
    quizAnswered = true;
    
    const selectedIndex = parseInt(e.target.dataset.index);
    const isCorrect = selectedIndex === currentQuiz.correct;
    const quizResult = document.getElementById('quizResult');
    
    document.querySelectorAll('.quiz-option').forEach((opt, i) => {
        if (i === currentQuiz.correct) opt.classList.add('correct');
        else if (i === selectedIndex && !isCorrect) opt.classList.add('wrong');
    });
    
    if (isCorrect) {
        quizCorrectCount++;
        const quizScoreBadge = document.getElementById('quizScoreBadge');
        if (quizScoreBadge) {
            quizScoreBadge.textContent = `正确: ${quizCorrectCount}`;
            quizScoreBadge.style.display = 'inline-block';
        }
        
        quizResult.className = 'quiz-result success';
        quizResult.innerHTML = `✅ 回答正确！${currentQuiz.explanation}<br><br>冷静期已解除，请谨慎决策。`;
        quizResult.style.display = 'block';
        
        // 正确回答 -> 弹窗反馈 + 解锁
        showFeedbackPopup({
            icon: '🎉',
            title: '答题正确 - 冷静期解除',
            message: `您正确识别了"${currentQuiz.options[currentQuiz.correct]}"，展现了扎实的投资心理学素养。`,
            duration: 3000,
            type: 'success'
        });
        
        setTimeout(() => {
            if (cooldownTimer) clearInterval(cooldownTimer);
            document.getElementById('cooldownModal').style.display = 'none';
            stopBreathingGuide();
            if (cooldownUnlockCallback) {
                const callback = cooldownUnlockCallback;
                cooldownUnlockCallback = null;
                callback();
            }
        }, 3000);
    } else {
        quizResult.className = 'quiz-result fail';
        
        // 计算因错误增加的冷却时间
        const penaltySeconds = 30;
        cooldownRemainingSeconds = Math.min(cooldownRemainingSeconds + penaltySeconds, cooldownTotalSeconds);
        document.getElementById('modalTimer').textContent = cooldownRemainingSeconds;
        updateCountdownRing(cooldownRemainingSeconds, cooldownTotalSeconds);
        
        quizResult.innerHTML = `
            ❌ 回答错误。正确答案是：<strong>${currentQuiz.options[currentQuiz.correct]}</strong>
            <br><br>${currentQuiz.explanation}
            <br><br><span style="color: var(--accent-red);">⏱️ 冷却时间 +${penaltySeconds}秒</span>
            <br>请继续等待冷静期结束，或重新作答。
        `;
        quizResult.style.display = 'block';
        
        // 错误回答 -> 弹窗反馈
        showFeedbackPopup({
            icon: '❌',
            title: '答题错误 - 继续冷静',
            message: `冷却时间增加${penaltySeconds}秒。正确答案是"${currentQuiz.options[currentQuiz.correct]}"。`,
            duration: 3000,
            type: 'error'
        });
        
        setTimeout(() => {
            document.getElementById('showQuizBtn').style.display = 'block';
            document.getElementById('showQuizBtn').textContent = '🔄 重新作答';
        }, 2000);
    }
}

// --- 通用反馈弹窗 ---
/**
 * 显示操作反馈弹窗（内置倒计时自动关闭）
 * @param {object} options - 弹窗配置
 * @param {string} options.icon - 图标
 * @param {string} options.title - 标题
 * @param {string} options.message - 消息内容
 * @param {number} options.duration - 显示时长(ms)
 * @param {string} options.type - 类型 (success/error/warning/info)
 * @param {function} options.onClose - 关闭回调
 */
export function showFeedbackPopup(options = {}) {
    const {
        icon = '✓',
        title = '操作完成',
        message = '',
        duration = 3000,
        type = 'info',
        onClose = null
    } = options;
    
    const popup = document.getElementById('feedbackPopup');
    const iconEl = document.getElementById('feedbackIcon');
    const titleEl = document.getElementById('feedbackTitle');
    const messageEl = document.getElementById('feedbackMessage');
    const countdownBar = document.getElementById('feedbackCountdownBar');
    const timerText = document.getElementById('feedbackTimerText');
    
    if (!popup) return;
    
    // 清除之前的计时器
    if (feedbackTimer) {
        clearInterval(feedbackTimer);
        feedbackTimer = null;
    }
    
    // 设置内容
    iconEl.textContent = icon;
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // 设置类型样式
    popup.querySelector('.feedback-popup-content').className = `feedback-popup-content feedback-${type}`;
    
    // 显示弹窗
    popup.style.display = 'flex';
    popup.classList.add('active');
    
    // 倒计时进度条
    const totalMs = duration;
    let remainingMs = totalMs;
    const intervalMs = 50;
    
    countdownBar.style.width = '100%';
    timerText.textContent = `${Math.ceil(remainingMs / 1000)}秒后自动关闭`;
    
    feedbackTimer = setInterval(() => {
        remainingMs -= intervalMs;
        const percent = (remainingMs / totalMs) * 100;
        countdownBar.style.width = `${Math.max(0, percent)}%`;
        timerText.textContent = `${Math.ceil(Math.max(0, remainingMs) / 1000)}秒后自动关闭`;
        
        if (remainingMs <= 0) {
            clearInterval(feedbackTimer);
            feedbackTimer = null;
            closeFeedbackPopup();
            if (onClose) onClose();
        }
    }, intervalMs);
    
    // 点击关闭
    popup.onclick = (e) => {
        if (e.target === popup) {
            clearInterval(feedbackTimer);
            feedbackTimer = null;
            closeFeedbackPopup();
            if (onClose) onClose();
        }
    };
}

function closeFeedbackPopup() {
    const popup = document.getElementById('feedbackPopup');
    if (!popup) return;
    
    popup.classList.remove('active');
    setTimeout(() => {
        popup.style.display = 'none';
    }, 300);
}

// --- 交易日记 ---
export function renderDiaryList(entries) {
    const diaryList = document.getElementById('diaryList');
    const diaryCount = document.getElementById('diaryCount');

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
    
    diaryList.innerHTML = entries.slice().reverse().map(entry => `
        <div class="diary-entry ${entry.type}">
            <div class="diary-meta">
                <span>${escapeHtml(entry.date)} | ${escapeHtml(entry.company)}</span>
                <span class="diary-action ${entry.type}">${entry.type === 'buy' ? '买入' : (entry.type === 'sell' ? '卖出' : '观望')}</span>
            </div>
            <div class="diary-content">${escapeHtml(entry.note)}</div>
            <div class="diary-entry-footer">
                <div class="diary-score">
                    情绪评分: <strong style="color: ${entry.score > 60 ? 'var(--accent-green)' : (entry.score < 40 ? 'var(--accent-red)' : 'var(--accent-yellow)')}">${entry.score}</strong>
                </div>
                <button class="diary-delete-btn" data-entry-id="${entry.id}" title="删除这条记录">🗑️ 删除</button>
            </div>
        </div>
    `).join('');
}

export function openDiaryModal(currentCompany, currentScore) {
    const modal = document.getElementById('diaryModal');
    
    // 设置决策类型（与最近的操作一致）
    const lastAction = window.Logic?.state?.lastAction || 'hold';
    modal.dataset.selectedType = lastAction;
    document.querySelectorAll('.diary-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === lastAction);
    });
    
    // 设置备注
    const actionText = lastAction === 'buy' ? '买入' : (lastAction === 'sell' ? '卖出' : '观望');
    modal.dataset.note = '决策类型：' + actionText + '，情绪分数：' + currentScore;
    
    modal.style.display = 'flex';
    if (currentCompany) {
        document.getElementById('diaryCompany').value = currentCompany;
    }
    document.getElementById('diaryScore').value = currentScore;
    document.getElementById('diaryScoreDisplay').textContent = currentScore;
}

export function closeDiaryModal() {
    document.getElementById('diaryModal').style.display = 'none';
    document.getElementById('diaryCompany').value = '';
    document.getElementById('diaryNote').value = '';
    document.getElementById('diaryScore').value = 50;
    document.getElementById('diaryScoreDisplay').textContent = 50;
    document.querySelectorAll('.diary-type-btn').forEach(b => b.classList.remove('active'));
}

// --- 粒子效果 ---
export function createEmotionParticles(score) {
    const container = document.getElementById('emotionParticles');
    container.innerHTML = '';
    
    // 修复：新增 'init' 状态，初始显示品牌科技蓝，而不是代表中性/警告的黄色
    let colors;
    if (score === 'init') {
        colors = ['#3b82f6', '#8b5cf6', '#60a5fa', '#a78bfa']; // 品牌蓝紫渐变
    } else {
        colors = score > 60 
            ? ['#10b981', '#34d399', '#6ee7b7'] // 贪婪-绿
            : score < 40 
                ? ['#ef4444', '#f87171', '#fca5a5'] // 恐慌-红
                : ['#f59e0b', '#fbbf24', '#fcd34d']; // 中性-黄
    }
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 8 + 4) + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDelay = (Math.random() * 15) + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

export function showLoading(isAI, mode = 'single') {
    const modeText = mode === 'Multi-Agent' 
        ? '🤖 Multi-Agent 协作分析中...' 
        : (isAI ? '🤖 AI 正在分析全网舆情...' : '正在分析全网舆情...');
    
    document.getElementById('gaugeContainer').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>${modeText}</span>
        </div>
    `;
}

export function showAIModeIndicator(hasModelScope) {
    const header = document.querySelector('.header');
    if (!document.getElementById('aiIndicator')) {
        const indicator = document.createElement('div');
        indicator.id = 'aiIndicator';
        indicator.style.cssText = `
            position: absolute; top: 10px; left: 20px;
            padding: 6px 14px; border-radius: 20px;
            font-size: 0.75rem; font-weight: 600;
            background: ${hasModelScope ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'};
            color: ${hasModelScope ? 'var(--accent-green)' : 'var(--accent-yellow)'};
            border: 1px solid ${hasModelScope ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'};
        `;
        indicator.innerHTML = hasModelScope ? '🤖 ModelScope AI' : '🤖 AI Simulation';
        header.appendChild(indicator);
    }
}
""  
"// ==================== Chart.js ��������ͼ��� ===================="  
"let sentimentChartInstance = null;" 
