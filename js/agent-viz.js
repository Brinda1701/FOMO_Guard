// ==================== Multi-Agent 可视化图表 ====================

let agentRadarChartInstance = null;

/**
 * 初始化并渲染 Multi-Agent 雷达图
 * @param {Object} scores - 各 Agent 分数 {sentiment, technical, psychology}
 */
export function initAgentRadarChart(scores = { sentiment: 50, technical: 50, psychology: 50 }) {
    const ctx = document.getElementById('agentRadarChart');
    if (!ctx) return;

    // 销毁现有图表
    if (agentRadarChartInstance) {
        agentRadarChartInstance.destroy();
    }

    // 创建图表
    agentRadarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['情绪分析', '技术分析', '心理诊断'],
            datasets: [{
                label: 'Agent 评分',
                data: [
                    scores.sentiment || 50,
                    scores.technical || 50,
                    scores.psychology || 50
                ],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                borderWidth: 3,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(148, 163, 184, 0.2)'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.2)'
                    },
                    pointLabels: {
                        color: '#94a3b8',
                        font: {
                            size: 12,
                            family: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
                        }
                    },
                    ticks: {
                        display: false,
                        max: 100,
                        min: 0
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f0f4f8',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const score = context.parsed.r;
                            let status = '中性';
                            if (score > 60) status = '乐观';
                            if (score < 40) status = '谨慎';
                            return `分数：${score} (${status})`;
                        }
                    }
                }
            }
        }
    });

    return agentRadarChartInstance;
}

/**
 * 初始化骨架屏状态的雷达图（全 0 数据，带加载动画）
 */
export function initAgentRadarChartSkeleton() {
    const ctx = document.getElementById('agentRadarChart');
    if (!ctx) return;

    // 销毁现有图表
    if (agentRadarChartInstance) {
        agentRadarChartInstance.destroy();
    }

    // 创建骨架屏图表
    agentRadarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['情绪分析', '技术分析', '心理诊断'],
            datasets: [{
                label: 'Agent 评分',
                data: [0, 0, 0], // 全 0 数据，等待更新
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                borderColor: 'rgba(148, 163, 184, 0.3)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(148, 163, 184, 0.5)',
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(148, 163, 184, 0.15)'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.15)'
                    },
                    pointLabels: {
                        color: '#94a3b8',
                        font: {
                            size: 12,
                            family: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
                        }
                    },
                    ticks: {
                        display: false,
                        max: 100,
                        min: 0
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });

    return agentRadarChartInstance;
}

/**
 * 更新雷达图数据（渐进式）
 * @param {Object} scores - 各 Agent 分数
 */
export function updateAgentRadarChart(scores) {
    if (!agentRadarChartInstance) {
        initAgentRadarChart(scores);
        return;
    }

    agentRadarChartInstance.data.datasets[0].data = [
        scores.sentiment || 50,
        scores.technical || 50,
        scores.psychology || 50
    ];

    // 根据分数更新颜色
    const avgScore = (scores.sentiment + scores.technical + scores.psychology) / 3;
    let color = '#3b82f6';
    let bgColor = 'rgba(59, 130, 246, 0.2)';
    
    if (avgScore > 60) {
        color = '#10b981';
        bgColor = 'rgba(16, 185, 129, 0.2)';
    } else if (avgScore < 40) {
        color = '#ef4444';
        bgColor = 'rgba(239, 68, 68, 0.2)';
    }

    agentRadarChartInstance.data.datasets[0].borderColor = color;
    agentRadarChartInstance.data.datasets[0].backgroundColor = bgColor;
    agentRadarChartInstance.data.datasets[0].pointBackgroundColor = color;

    agentRadarChartInstance.update('none');
}

/**
 * 更新 Agent 分数卡片
 * @param {Object} scores - 各 Agent 分数和详情
 */
export function updateAgentScoreCards(scores) {
    const agents = [
        { key: 'sentiment', id: 'sentiment', name: '情绪' },
        { key: 'technical', id: 'technical', name: '技术' },
        { key: 'psychology', id: 'psychology', name: '心理' }
    ];

    agents.forEach(agent => {
        const score = scores[agent.key] || 50;
        const valueEl = document.getElementById(`${agent.id}ScoreValue`);
        const fillEl = document.getElementById(`${agent.id}ScoreFill`);
        const cardEl = document.querySelector(`[data-agent="${agent.key}"]`);

        if (valueEl) {
            // 数字滚动动画
            animateValue(valueEl, parseInt(valueEl.textContent) || 0, score, 1000);
            
            // 更新颜色类
            valueEl.className = `agent-score-value ${getScoreClass(score)}`;
        }

        if (fillEl) {
            setTimeout(() => {
                fillEl.style.width = `${score}%`;
                fillEl.className = `agent-score-fill ${getScoreClass(score)}`;
            }, 100);
        }

        if (cardEl) {
            cardEl.classList.add('animated');
            setTimeout(() => cardEl.classList.remove('animated'), 500);
        }
    });
}

/**
 * 获取分数对应的 CSS 类
 */
function getScoreClass(score) {
    if (score > 60) return 'greed';
    if (score < 40) return 'fear';
    return 'neutral';
}

/**
 * 数字滚动动画
 */
function animateValue(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 缓动函数
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const current = Math.floor(start + (end - start) * easeOutQuart);
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * 更新最终决策建议
 * @param {Object} decision - 决策信息
 */
export function updateFinalDecision(decision) {
    const iconEl = document.getElementById('finalDecisionIcon');
    const contentEl = document.getElementById('finalDecisionContent');

    if (!contentEl) return;

    const { icon, title, content, consensus } = decision;

    if (iconEl) {
        iconEl.textContent = icon || '🎯';
    }

    let consensusBadge = '';
    if (consensus === 'aligned') {
        consensusBadge = '<span style="display:inline-block;padding:4px 12px;background:rgba(16,185,129,0.2);color:#10b981;border-radius:12px;font-size:0.8rem;margin-left:10px;">✓ 一致认同</span>';
    } else if (consensus === 'divergent') {
        consensusBadge = '<span style="display:inline-block;padding:4px 12px;background:rgba(245,158,11,0.2);color:#f59e0b;border-radius:12px;font-size:0.8rem;margin-left:10px;">⚠️ 存在分歧</span>';
    }

    contentEl.innerHTML = `
        <h4 style="margin:0 0 12px 0;font-size:1rem;color:var(--text-primary);">
            ${title || '综合决策建议'}${consensusBadge}
        </h4>
        <p style="color:var(--text-secondary);line-height:1.7;">${content || '分析完成'}</p>
    `;
}

/**
 * 显示 Multi-Agent 可视化面板
 */
export function showAgentVisualization() {
    const card = document.getElementById('agentVisualizationCard');
    if (card) {
        card.style.display = 'block';
    }
}

/**
 * 隐藏 Multi-Agent 可视化面板
 */
export function hideAgentVisualization() {
    const card = document.getElementById('agentVisualizationCard');
    if (card) {
        card.style.display = 'none';
    }
}

/**
 * 初始化骨架屏状态的可视化面板（渐进式渲染）
 */
export function initAgentVisualizationSkeleton() {
    // 显示面板
    showAgentVisualization();
    
    // 初始化骨架屏雷达图
    initAgentRadarChartSkeleton();
    
    // 重置所有卡片为骨架屏状态
    const agents = ['sentiment', 'technical', 'psychology'];
    agents.forEach(agent => {
        const valueEl = document.getElementById(`${agent}ScoreValue`);
        const fillEl = document.getElementById(`${agent}ScoreFill`);
        const cardEl = document.querySelector(`[data-agent="${agent}"]`);
        
        if (valueEl) {
            valueEl.textContent = '--';
            valueEl.className = 'agent-score-value';
        }
        if (fillEl) {
            fillEl.style.width = '0%';
            fillEl.className = 'agent-score-fill';
        }
        if (cardEl) {
            cardEl.classList.add('skeleton');
            cardEl.classList.remove('animated', 'completed');
        }
    });
    
    // 清空决策建议
    const contentEl = document.getElementById('finalDecisionContent');
    if (contentEl) {
        contentEl.innerHTML = '<p style="color:var(--text-secondary);">等待 Agent 分析完成...</p>';
    }
}

/**
 * 渐进式更新单个 Agent 卡片（点亮动画）
 * @param {string} agentKey - Agent 类型：sentiment, technical, psychology
 * @param {number} score - 分数
 * @param {object} data - 完整数据
 */
export function updateSingleAgentCard(agentKey, score, data = null) {
    const valueEl = document.getElementById(`${agentKey}ScoreValue`);
    const fillEl = document.getElementById(`${agentKey}ScoreFill`);
    const cardEl = document.querySelector(`[data-agent="${agentKey}"]`);
    
    if (!valueEl || !fillEl || !cardEl) return;
    
    // 移除骨架屏状态
    cardEl.classList.remove('skeleton');
    
    // 数字滚动动画
    animateValue(valueEl, 0, score, 800);
    
    // 更新颜色类
    const scoreClass = getScoreClass(score);
    valueEl.className = `agent-score-value ${scoreClass}`;
    
    // 进度条动画
    setTimeout(() => {
        fillEl.style.width = `${score}%`;
        fillEl.className = `agent-score-fill ${scoreClass}`;
    }, 100);
    
    // 添加点亮/翻转动画
    cardEl.classList.add('lighting-up');
    setTimeout(() => {
        cardEl.classList.remove('lighting-up');
        cardEl.classList.add('completed');
    }, 600);
}

/**
 * 更新雷达图单个顶点数据
 * @param {string} agentKey - Agent 类型
 * @param {number} score - 分数
 */
export function updateRadarChartSinglePoint(agentKey, score) {
    if (!agentRadarChartInstance) return;
    
    const index = {
        sentiment: 0,
        technical: 1,
        psychology: 2
    }[agentKey];
    
    if (index === undefined) return;
    
    // 更新对应顶点数据
    agentRadarChartInstance.data.datasets[0].data[index] = score;
    
    // 根据完成的 Agent 数量更新颜色
    const data = agentRadarChartInstance.data.datasets[0].data;
    const completedCount = data.filter(s => s > 0).length;
    
    // 渐变颜色
    if (completedCount >= 3) {
        // 全部完成，使用最终颜色
        const avgScore = (data[0] + data[1] + data[2]) / 3;
        let color = '#3b82f6';
        let bgColor = 'rgba(59, 130, 246, 0.2)';
        
        if (avgScore > 60) {
            color = '#10b981';
            bgColor = 'rgba(16, 185, 129, 0.2)';
        } else if (avgScore < 40) {
            color = '#ef4444';
            bgColor = 'rgba(239, 68, 68, 0.2)';
        }
        
        agentRadarChartInstance.data.datasets[0].borderColor = color;
        agentRadarChartInstance.data.datasets[0].backgroundColor = bgColor;
        agentRadarChartInstance.data.datasets[0].pointBackgroundColor = color;
    }
    
    // 触发动画更新
    agentRadarChartInstance.update('default');
}

/**
 * 销毁图表
 */
export function destroyAgentCharts() {
    if (agentRadarChartInstance) {
        agentRadarChartInstance.destroy();
        agentRadarChartInstance = null;
    }
}

/**
 * 渲染全局判定证据（胶囊标签形式）
 * @param {Array} evidenceArray - 证据数组
 */
export function renderGlobalEvidence(evidenceArray) {
    const section = document.getElementById('globalEvidenceSection');
    const list = document.getElementById('globalEvidenceList');
    
    console.log('[renderGlobalEvidence] 开始渲染，证据数量:', evidenceArray?.length || 0);
    console.log('[renderGlobalEvidence] section 元素:', section);
    console.log('[renderGlobalEvidence] list 元素:', list);
    
    if (!section || !list) {
        console.error('[renderGlobalEvidence] 全局证据容器不存在！');
        console.log('[renderGlobalEvidence] 请检查 HTML 中是否有 id="globalEvidenceSection" 和 id="globalEvidenceList"');
        return;
    }

    // 空状态处理
    if (!evidenceArray || evidenceArray.length === 0) {
        console.log('[renderGlobalEvidence] 证据数组为空，显示空状态');
        list.innerHTML = `
            <div class="global-evidence-empty">
                <span class="global-evidence-empty-icon">📝</span>
                <p>暂无具体证据，AI 基于整体情绪判断</p>
            </div>
        `;
        section.style.display = 'block';
        return;
    }

    console.log('[renderGlobalEvidence] 渲染', evidenceArray.length, '个证据胶囊');

    // 渲染证据胶囊标签
    const evidenceHTML = evidenceArray.map((evidence, index) => {
        // 兼容多种字段名
        const text = evidence.text || evidence.content || evidence.message || '';
        const sentiment = evidence.sentiment || evidence.type || 'neutral';
        const impact = evidence.impact || 'medium';
        const source = evidence.source || '未知';

        // 获取情感样式类
        const sentimentClass = getSentimentClass(sentiment);
        const sentimentIcon = getSentimentIcon(sentiment);
        const impactStars = getImpactStars(impact);

        console.log('[renderGlobalEvidence] 证据', index, ':', { text, sentiment, sentimentClass, source });

        return `
            <div class="evidence-pill ${sentimentClass}" style="animation-delay: ${index * 0.05}s">
                <span class="evidence-pill-sentiment">${sentimentIcon}</span>
                <span class="evidence-pill-text">${escapeHtml(text)}</span>
                <span class="evidence-pill-impact">${impactStars}</span>
                <span class="evidence-pill-source">${escapeHtml(source)}</span>
            </div>
        `;
    }).join('');

    list.innerHTML = `
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

    // 显示证据区域
    section.style.display = 'block';
    
    console.log('[renderGlobalEvidence] 渲染完成');
}

// 辅助函数：获取情感样式类
function getSentimentClass(sentiment) {
    const sentimentLower = (sentiment || '').toLowerCase();
    if (sentimentLower.includes('positive') || sentimentLower.includes('pos')) return 'pill-positive';
    if (sentimentLower.includes('negative') || sentimentLower.includes('neg')) return 'pill-negative';
    if (sentimentLower.includes('emotional')) return 'pill-emotional';
    return 'pill-neutral';
}

// 辅助函数：获取情感图标
function getSentimentIcon(sentiment) {
    const sentimentLower = (sentiment || '').toLowerCase();
    if (sentimentLower.includes('positive') || sentimentLower.includes('pos')) return '📈';
    if (sentimentLower.includes('negative') || sentimentLower.includes('neg')) return '📉';
    if (sentimentLower.includes('emotional')) return '🔥';
    return '➖';
}

// 辅助函数：获取影响程度星星
function getImpactStars(impact) {
    const impactLower = (impact || '').toLowerCase();
    if (impactLower.includes('high')) return '⭐⭐⭐';
    if (impactLower.includes('medium')) return '⭐⭐';
    return '⭐';
}

// 辅助函数：HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
