/**
 * 情绪分析证据链可视化组件
 * 展示 AI 判定情绪分数的具体依据
 * 
 * 重构版：证据平铺在三个 Agent 卡片下方，采用胶囊标签形式
 */

/**
 * 渲染情绪证据链（胶囊标签形式）
 * @param {Array} keyEvidence - 证据数组
 * @param {string} containerId - 容器 ID，默认为 globalEvidenceList
 */
export function renderSentimentEvidence(keyEvidence, containerId = 'globalEvidenceList') {
    const container = document.getElementById(containerId);
    const section = document.getElementById('globalEvidenceSection');
    
    if (!container) {
        console.warn('[renderSentimentEvidence] 容器不存在:', containerId);
        return;
    }

    // 显示证据区域
    if (section) {
        section.style.display = 'block';
    }

    if (!keyEvidence || keyEvidence.length === 0) {
        container.innerHTML = `
            <div class="global-evidence-empty">
                <span class="global-evidence-empty-icon">📝</span>
                <p>暂无具体证据，AI 基于整体情绪判断</p>
            </div>
        `;
        return;
    }

    // 渲染胶囊标签形式的证据
    const evidenceHTML = keyEvidence.map((evidence, index) => {
        const sentimentClass = getSentimentClass(evidence.sentiment);
        const sentimentLabel = getSentimentLabel(evidence.sentiment);
        const impactStars = getImpactStars(evidence.impact);

        return `
            <div class="evidence-pill ${sentimentClass}" style="animation-delay: ${index * 0.05}s">
                <span class="evidence-pill-sentiment">${sentimentLabel}</span>
                <span class="evidence-pill-text">${escapeHtml(evidence.text)}</span>
                <span class="evidence-pill-impact">${impactStars}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="evidence-pills-wrapper">
            ${evidenceHTML}
        </div>
        <div class="evidence-pills-legend">
            <div class="pill-legend-item">
                <span class="pill-legend-dot pill-legend-positive"></span>
                <span>正面信号</span>
            </div>
            <div class="pill-legend-item">
                <span class="pill-legend-dot pill-legend-negative"></span>
                <span>负面信号</span>
            </div>
            <div class="pill-legend-item">
                <span class="pill-legend-dot pill-legend-emotional"></span>
                <span>情绪化表述</span>
            </div>
        </div>
    `;
}

/**
 * 获取情绪分类
 */
function getSentimentClass(sentiment) {
    switch (sentiment) {
        case 'positive': return 'pill-positive';
        case 'negative': return 'pill-negative';
        case 'emotional': return 'pill-emotional';
        default: return 'pill-neutral';
    }
}

/**
 * 获取情绪标签
 */
function getSentimentLabel(sentiment) {
    switch (sentiment) {
        case 'positive': return '📈';
        case 'negative': return '📉';
        case 'emotional': return '🔥';
        default: return '➖';
    }
}

/**
 * 获取影响程度星星
 */
function getImpactStars(impact) {
    switch (impact) {
        case 'high': return '⭐⭐⭐';
        case 'medium': return '⭐⭐';
        default: return '⭐';
    }
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 更新情绪证据面板（带动画）
 */
export function updateSentimentEvidence(evidence, score) {
    const container = document.getElementById('globalEvidenceList');
    const section = document.getElementById('globalEvidenceSection');
    
    if (!container) return;

    // 根据分数决定整体色调
    const scoreClass = score > 60 ? 'score-high' : (score < 40 ? 'score-low' : 'score-neutral');
    
    // 移除旧的色调类
    section.classList.remove('score-high', 'score-low', 'score-neutral');
    // 添加新的色调类
    section.classList.add(`score-${scoreClass}`);

    // 渲染证据
    renderSentimentEvidence(evidence, 'globalEvidenceList');

    // 添加进入动画
    setTimeout(() => {
        section.classList.add('visible');
    }, 100);
}

/**
 * 隐藏证据区域
 */
export function hideEvidenceSection() {
    const section = document.getElementById('globalEvidenceSection');
    const container = document.getElementById('globalEvidenceList');
    
    if (section) {
        section.style.display = 'none';
    }
    if (container) {
        container.innerHTML = '<div class="global-evidence-empty">等待分析完成...</div>';
    }
}
