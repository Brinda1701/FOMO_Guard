/**
 * 情绪分析证据链可视化组件
 * 展示 AI 判定情绪分数的具体依据
 */

/**
 * 渲染情绪证据链
 * @param {Array} keyEvidence - 证据数组
 * @param {string} containerId - 容器 ID
 */
export function renderSentimentEvidence(keyEvidence, containerId = 'sentimentEvidenceContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('[renderSentimentEvidence] 容器不存在:', containerId);
        return;
    }

    if (!keyEvidence || keyEvidence.length === 0) {
        container.innerHTML = `
            <div class="evidence-empty">
                <span class="evidence-empty-icon">📝</span>
                <p>暂无具体证据，AI 基于整体情绪判断</p>
            </div>
        `;
        return;
    }

    const evidenceHTML = keyEvidence.map((evidence, index) => {
        const sentimentClass = getSentimentClass(evidence.sentiment);
        const impactClass = getImpactClass(evidence.impact);
        const sourceIcon = getSourceIcon(evidence.source);

        return `
            <div class="evidence-card ${sentimentClass}" style="animation-delay: ${index * 0.1}s">
                <div class="evidence-header">
                    <span class="evidence-sentiment ${sentimentClass}">${getSentimentLabel(evidence.sentiment)}</span>
                    <span class="evidence-impact ${impactClass}">${getImpactLabel(evidence.impact)}</span>
                </div>
                <div class="evidence-content">
                    <span class="evidence-quote">"${escapeHtml(evidence.text)}"</span>
                </div>
                <div class="evidence-footer">
                    <span class="evidence-source">${sourceIcon} ${escapeHtml(evidence.source)}</span>
                    <span class="evidence-confidence">${getConfidenceStars(evidence.impact)}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="evidence-section">
            <h4 class="evidence-title">
                <span class="evidence-title-icon">🔍</span>
                判定证据
                <span class="evidence-count">${keyEvidence.length}条</span>
            </h4>
            <div class="evidence-list">
                ${evidenceHTML}
            </div>
            <div class="evidence-legend">
                <div class="legend-item">
                    <span class="legend-dot legend-positive"></span>
                    <span>正面信号</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot legend-negative"></span>
                    <span>负面信号</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot legend-emotional"></span>
                    <span>情绪化表述</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 获取情绪分类
 */
function getSentimentClass(sentiment) {
    switch (sentiment) {
        case 'positive': return 'evidence-positive';
        case 'negative': return 'evidence-negative';
        case 'emotional': return 'evidence-emotional';
        default: return 'evidence-neutral';
    }
}

/**
 * 获取影响程度分类
 */
function getImpactClass(impact) {
    switch (impact) {
        case 'high': return 'impact-high';
        case 'medium': return 'impact-medium';
        default: return 'impact-low';
    }
}

/**
 * 获取情绪标签
 */
function getSentimentLabel(sentiment) {
    switch (sentiment) {
        case 'positive': return '📈 正面';
        case 'negative': return '📉 负面';
        case 'emotional': return '🔥 情绪化';
        default: return '➖ 中性';
    }
}

/**
 * 获取影响程度标签
 */
function getImpactLabel(impact) {
    switch (impact) {
        case 'high': return '高影响';
        case 'medium': return '中影响';
        default: return '低影响';
    }
}

/**
 * 获取来源图标
 */
function getSourceIcon(source) {
    const sourceLower = (source || '').toLowerCase();
    if (sourceLower.includes('社交') || sourceLower.includes('微博') || sourceLower.includes('推特')) return '📱';
    if (sourceLower.includes('新闻') || sourceLower.includes('媒体')) return '📰';
    if (sourceLower.includes('论坛') || sourceLower.includes('股吧')) return '💬';
    if (sourceLower.includes('研报') || sourceLower.includes('机构')) return '📊';
    return '🔗';
}

/**
 * 获取置信度星星
 */
function getConfidenceStars(impact) {
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
    const container = document.getElementById('sentimentEvidenceContainer');
    if (!container) return;

    // 根据分数决定整体色调
    const scoreClass = score > 60 ? 'score-high' : (score < 40 ? 'score-low' : 'score-neutral');
    container.classList.add(`score-${scoreClass}`);

    // 渲染证据
    renderSentimentEvidence(evidence, 'sentimentEvidenceContainer');

    // 添加进入动画
    setTimeout(() => {
        container.classList.add('visible');
    }, 100);
}
