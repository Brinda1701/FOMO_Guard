// ==================== Chart.js 情绪趋势图相关 ====================
let sentimentChartInstance = null;

/**
 * 初始化并渲染情绪趋势图
 * @param {Array} historyData - 历史情绪数据数组 [{time, score}, ...]
 */
export function initSentimentTrendChart(historyData = []) {
    const ctx = document.getElementById('sentimentTrendChart');
    if (!ctx) return;

    // 销毁现有图表
    if (sentimentChartInstance) {
        sentimentChartInstance.destroy();
    }

    // 准备数据
    const labels = historyData.map(d => d.time);
    const scores = historyData.map(d => d.score);

    // 创建图表
    sentimentChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '情绪分数',
                data: scores,
                borderColor: '#3b82f6',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx: chartCtx, chartArea} = chart;
                    if (!chartArea) return null;
                    const gradient = chartCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                    gradient.addColorStop(0.4, 'rgba(245, 158, 11, 0.1)');
                    gradient.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
                    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
                    return gradient;
                },
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.4,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
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
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const score = context.parsed.y;
                            let status = '中性';
                            if (score > 70) status = '贪婪';
                            if (score < 30) status = '恐惧';
                            return `情绪分数：${score} (${status})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        autoSkip: true
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return value; // 修改：直接返回分数值，不添加百分号
                        }
                    }
                }
            }
        }
    });
    return sentimentChartInstance;
}

/**
 * 更新情绪趋势图数据
 * @param {Array} historyData - 历史情绪数据数组
 */
export function updateSentimentTrendChart(historyData) {
    if (!sentimentChartInstance) {
        initSentimentTrendChart(historyData);
        return;
    }
    sentimentChartInstance.data.labels = historyData.map(d => d.time);
    sentimentChartInstance.data.datasets[0].data = historyData.map(d => d.score);
    const latestScore = historyData.length > 0 ? historyData[historyData.length - 1].score : 50;
    let lineColor = '#3b82f6';
    if (latestScore > 70) lineColor = '#10b981';
    if (latestScore < 30) lineColor = '#ef4444';
    sentimentChartInstance.data.datasets[0].borderColor = lineColor;
    sentimentChartInstance.data.datasets[0].pointBackgroundColor = lineColor;
    sentimentChartInstance.update('none');
}

/**
 * 销毁情绪趋势图
 */
export function destroySentimentTrendChart() {
    if (sentimentChartInstance) {
        sentimentChartInstance.destroy();
        sentimentChartInstance = null;
    }
}
