// ==================== UI 模块 ====================

export function updateGauge(score, company) {
    const rotation = (score / 100) * 180 - 90;
    let valueColor = (score < 30 || score > 70) ? '#ef4444' : '#10b981';
    
    let statusText, statusClass;
    if (score < 30) {
        statusText = '危险 - 极度恐惧';
        statusClass = 'status-danger';
    } else if (score > 70) {
        statusText = '危险 - 极度贪婪';
        statusClass = 'status-danger';
    } else {
        statusText = '安全 - 理性区间';
        statusClass = 'status-safe';
    }
    
    document.getElementById('gaugeContainer').innerHTML = `
        <div class="gauge-wrapper">
            <div class="gauge-bg ${score < 30 || score > 70 ? 'gauge-bg-danger' : 'gauge-bg-safe'}"></div>
            <div class="gauge-needle" style="transform: rotate(${rotation}deg);"></div>
            <div class="gauge-value" style="color: ${valueColor};">${score}</div>
            <div class="gauge-label">${company} 情绪指数</div>
            <div class="gauge-status ${statusClass}">${statusText}</div>
        </div>
        <div class="gauge-legend">
            <div class="legend-item">
                <span class="legend-color legend-danger"></span>
                <span class="legend-text">危险区间 (0-30, 70-100)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-safe"></span>
                <span class="legend-text">安全区间 (30-70)</span>
            </div>
            <div class="legend-desc">
                <span>🔴 危险：</span>
                <span>市场情绪极端，可能存在非理性行为</span>
            </div>
            <div class="legend-desc">
                <span>🟢 安全：</span>
                <span>市场情绪理性，适合冷静分析</span>
            </div>
        </div>
    `;
}

export function updateHistory() {
    const historyChart = document.getElementById('historyChart');
    const historyData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 80) + 10);
    historyChart.innerHTML = historyData.map((v) => {
        const barClass = v < 30 || v > 70 ? 'danger' : 'neutral';
        return `<div class="history-bar ${barClass}" style="height: ${v}%"></div>`;
    }).join('');
}

export function updateSources() {
    document.getElementById('weiboCount').textContent = (Math.floor(Math.random() * 15) + 5) + 'k';
    document.getElementById('xueqiuCount').textContent = (Math.floor(Math.random() * 8) + 3) + 'k';
    document.getElementById('eastmoneyCount').textContent = (Math.floor(Math.random() * 20) + 10) + 'k';
}

export function createEmotionParticles(score) {
    const container = document.getElementById('emotionParticles');
    container.innerHTML = '';
    let colors;
    if (score === 'init') {
        colors = ['#3b82f6', '#8b5cf6', '#60a5fa', '#a78bfa'];
    } else {
        colors = (score < 30 || score > 70) ? ['#ef4444', '#f87171', '#fca5a5'] : ['#10b981', '#34d399', '#6ee7b7'];
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
    const modeText = mode === 'Multi-Agent' ? '🤖 Multi-Agent 协作分析中...' : (isAI ? '🤖 AI 正在分析全网舆情...' : '正在分析全网舆情...');
    document.getElementById('gaugeContainer').innerHTML = `<div class="loading-spinner"></div><div class="loading-text">${modeText}</div>`;
}

export function showSimulatedModeWarning() {
    const warning = document.createElement('div');
    warning.id = 'simulatedModeWarning';
    warning.className = 'simulated-warning';
    warning.innerHTML = '⚠️ 当前为模拟数据模式，实际分析需要配置 API Key';
    document.body.appendChild(warning);
}

export function hideSimulatedModeWarning() {
    const warning = document.getElementById('simulatedModeWarning');
    if (warning) warning.remove();
}
