import { PSYCHOLOGY_QUIZZES } from './config.js';

// --- 全局 UI 状态 ---
let cooldownTimer = null;
let breatheInterval = null;
let currentQuiz = null;
let quizAnswered = false;

// --- 基础 UI 更新 ---
export function updateGauge(score, company) {
    const rotation = (score / 100) * 180 - 90;
    let valueColor = score > 60 ? '#10b981' : (score < 40 ? '#ef4444' : '#f59e0b');

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

export function updateValidationChart(score, company) {
    const validationCard = document.getElementById('validationCard');
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
    
    validationCard.style.display = 'block';
}

// --- 沉浸式界面 ---
export function showDecisionResult(diagnosis, action, currentCompany, currentScore, shouldCooldown) {
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
    
    cards.innerHTML = `
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
    `;
    
    overlay.classList.add('active');
    
    if (shouldCooldown) {
        setTimeout(() => {
            document.querySelector('.container').classList.add('impact-active');
            setTimeout(() => document.querySelector('.container').classList.remove('impact-active'), 500);
            showCooldown(diagnosis.quote, true);
        }, 800);
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

export function showCooldown(msg, isDanger) {
    const modal = document.getElementById('cooldownModal');
    const content = modal.querySelector('.modal-content');
    const timerDisplay = document.getElementById('modalTimer');
    
    if (isDanger) content.classList.add('modal-danger');
    else content.classList.remove('modal-danger');

    document.getElementById('modalText').textContent = msg;
    modal.style.display = 'flex';
    
    startBreathingGuide();
    
    let sec = 300;
    timerDisplay.textContent = sec;

    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
        sec--;
        timerDisplay.textContent = sec;
        if (sec <= 0) {
            clearInterval(cooldownTimer);
            modal.style.display = 'none';
            stopBreathingGuide();
        }
    }, 1000);
}

// --- 心理测试 ---
export function showQuiz() {
    const quizSection = document.getElementById('quizSection');
    const quizQuestion = document.getElementById('quizQuestion');
    const quizOptions = document.getElementById('quizOptions');
    const quizResult = document.getElementById('quizResult');
    
    currentQuiz = PSYCHOLOGY_QUIZZES[Math.floor(Math.random() * PSYCHOLOGY_QUIZZES.length)];
    quizAnswered = false;
    
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
        quizResult.className = 'quiz-result success';
        quizResult.innerHTML = `✅ 回答正确！${currentQuiz.explanation}<br><br>冷静期已解除，请谨慎决策。`;
        quizResult.style.display = 'block';
        setTimeout(() => {
            if (cooldownTimer) clearInterval(cooldownTimer);
            document.getElementById('cooldownModal').style.display = 'none';
            stopBreathingGuide();
        }, 3000);
    } else {
        quizResult.className = 'quiz-result fail';
        quizResult.innerHTML = `❌ 回答错误。正确答案是：${currentQuiz.options[currentQuiz.correct]}<br><br>${currentQuiz.explanation}<br><br>请继续等待冷静期结束，或重新作答。`;
        quizResult.style.display = 'block';
        setTimeout(() => {
            document.getElementById('showQuizBtn').style.display = 'block';
            document.getElementById('showQuizBtn').textContent = '🔄 重新作答';
        }, 2000);
    }
}

// --- 交易日记 ---
export function renderDiaryList(entries) {
    const diaryList = document.getElementById('diaryList');
    const diaryCount = document.getElementById('diaryCount');
    
    diaryCount.textContent = entries.length;
    
    if (entries.length === 0) {
        diaryList.innerHTML = '<div class="diary-empty">暂无记录，点击上方按钮开始记录您的交易决策</div>';
        return;
    }
    
    diaryList.innerHTML = entries.slice().reverse().map(entry => `
        <div class="diary-entry ${entry.type}">
            <div class="diary-meta">
                <span>${entry.date} | ${entry.company}</span>
                <span class="diary-action ${entry.type}">${entry.type === 'buy' ? '买入' : (entry.type === 'sell' ? '卖出' : '观望')}</span>
            </div>
            <div class="diary-content">${entry.note}</div>
            <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary);">
                情绪评分: <strong style="color: ${entry.score > 60 ? 'var(--accent-green)' : (entry.score < 40 ? 'var(--accent-red)' : 'var(--accent-yellow)')}">${entry.score}</strong>
            </div>
        </div>
    `).join('');
}

export function openDiaryModal(currentCompany, currentScore) {
    const modal = document.getElementById('diaryModal');
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

export function showLoading(isAI) {
    document.getElementById('gaugeContainer').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>${isAI ? '🤖 AI 正在分析全网舆情...' : '正在分析全网舆情...'}</span>
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