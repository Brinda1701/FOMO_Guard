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
 * 更新雷达图数据
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
 * 销毁图表
 */
export function destroyAgentCharts() {
    if (agentRadarChartInstance) {
        agentRadarChartInstance.destroy();
        agentRadarChartInstance = null;
    }
}
