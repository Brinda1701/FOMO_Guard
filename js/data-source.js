/**
 * FOMOGuard - 数据来源与 K 线图表渲染
 */

/**
 * 渲染数据来源卡片
 */
export function renderDataSourceCards(company) {
    const dataSourceCard = document.getElementById('dataSourceCard');
    const dataSourceGrid = document.getElementById('dataSourceGrid');
    const credibilityScoreEl = document.getElementById('credibilityScore');

    console.log('[DataSource] renderDataSourceCards 被调用，公司:', company);
    console.log('[DataSource] dataSourceCard:', dataSourceCard);
    console.log('[DataSource] dataSourceGrid:', dataSourceGrid);
    console.log('[DataSource] credibilityScoreEl:', credibilityScoreEl);

    if (!dataSourceCard) {
        console.error('[DataSource] 错误：找不到 dataSourceCard 元素');
        return;
    }
    if (!dataSourceGrid) {
        console.error('[DataSource] 错误：找不到 dataSourceGrid 元素');
        return;
    }
    if (!credibilityScoreEl) {
        console.error('[DataSource] 错误：找不到 credibilityScoreEl 元素');
        return;
    }
    
    const sources = [
        {
            name: '微博舆情',
            icon: '📱',
            status: '实时',
            metrics: [
                { label: '讨论数', value: '12.5K' },
                { label: '情感倾向', value: '正面' }
            ],
            verified: true
        },
        {
            name: '雪球',
            icon: '📰',
            status: '实时',
            metrics: [
                { label: '关注数', value: '8.2K' },
                { label: '热度排名', value: 'Top 50' }
            ],
            verified: true
        },
        {
            name: '东方财富',
            icon: '💬',
            status: '实时',
            metrics: [
                { label: '评论数', value: '3.1K' },
                { label: '资金流向', value: '净流入' }
            ],
            verified: true
        },
        {
            name: '新浪财经',
            icon: '📈',
            status: '延迟 15 分钟',
            metrics: [
                { label: '新闻数', value: '156' },
                { label: '公告数', value: '8' }
            ],
            verified: true
        }
    ];
    
    dataSourceGrid.innerHTML = sources.map(s => `
        <div class="data-source-card ${s.verified ? 'verified' : ''}">
            <div class="data-source-header">
                <span class="data-source-icon">${s.icon}</span>
                <span class="data-source-name">${s.name}</span>
                <span class="data-source-status">${s.status}</span>
            </div>
            <div class="data-source-metrics">
                ${s.metrics.map(m => `
                    <div class="data-source-metric">
                        <div class="data-source-metric-value">${m.value}</div>
                        <div class="data-source-metric-label">${m.label}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    // 计算可信度评分
    const credibilityScore = 85 + Math.floor(Math.random() * 10);
    credibilityScoreEl.textContent = `${credibilityScore}分`;

    dataSourceCard.style.display = 'block';
    
    console.log('[DataSource] dataSourceCard display 已设置为:', dataSourceCard.style.display);
    console.log('[DataSource] 数据来源卡片渲染完成');
}

/**
 * 渲染 K 线图表（模拟数据）
 */
export function renderKlineChart(company, score) {
    const klineContainer = document.getElementById('klineChartContainer');
    const klineStats = document.getElementById('klineStats');
    const klineChartCanvas = document.getElementById('klineChart');

    console.log('[DataSource] renderKlineChart 被调用，公司:', company, '分数:', score);
    console.log('[DataSource] klineContainer:', klineContainer);
    console.log('[DataSource] klineStats:', klineStats);
    console.log('[DataSource] klineChartCanvas:', klineChartCanvas);

    if (!klineContainer) {
        console.error('[DataSource] 错误：找不到 klineChartContainer 元素');
        return;
    }
    if (!klineStats) {
        console.error('[DataSource] 错误：找不到 klineStats 元素');
        return;
    }
    if (!klineChartCanvas) {
        console.error('[DataSource] 错误：找不到 klineChart 元素');
        return;
    }
    
    // 生成模拟 K 线数据
    const klineData = generateKlineData(score);
    
    // 更新统计数据
    klineStats.innerHTML = `
        <div class="kline-stat">
            <div class="kline-stat-label">当前价</div>
            <div class="kline-stat-value ${klineData.change >= 0 ? 'up' : 'down'}">${klineData.currentPrice.toFixed(2)}</div>
        </div>
        <div class="kline-stat">
            <div class="kline-stat-label">涨跌幅</div>
            <div class="kline-stat-value ${klineData.change >= 0 ? 'up' : 'down'}">${klineData.change >= 0 ? '+' : ''}${klineData.change.toFixed(2)}%</div>
        </div>
        <div class="kline-stat">
            <div class="kline-stat-label">成交量</div>
            <div class="kline-stat-value">${klineData.volume}</div>
        </div>
        <div class="kline-stat">
            <div class="kline-stat-label">成交额</div>
            <div class="kline-stat-value">${klineData.amount}</div>
        </div>
    `;

    // 使用 Chart.js 绘制 K 线图
    const ctx = document.getElementById('klineChart').getContext('2d');
    
    console.log('[DataSource] klineChart canvas context:', ctx);
    console.log('[DataSource] Chart 对象是否存在:', typeof Chart !== 'undefined');

    // 销毁旧图表
    if (window.klineChartInstance) {
        window.klineChartInstance.destroy();
    }
    
    // 检查 Chart.js 是否加载
    if (typeof Chart === 'undefined') {
        console.error('[DataSource] 错误：Chart.js 未加载，无法创建图表');
        klineContainer.style.display = 'block';
        return;
    }

    window.klineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: klineData.labels,
                datasets: [{
                    label: '收盘价',
                    data: klineData.close,
                    borderColor: klineData.colors[0],
                    backgroundColor: klineData.colors[1],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `收盘价：${context.parsed.y.toFixed(2)}`;
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
                            maxRotation: 0
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                return value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });

    klineContainer.style.display = 'block';
    
    console.log('[DataSource] klineContainer display 已设置为:', klineContainer.style.display);
    console.log('[DataSource] K 线图表渲染完成');
}

/**
 * 生成模拟 K 线数据
 */
function generateKlineData(score) {
    const basePrice = 50 + Math.random() * 100;
    const trend = score > 50 ? 1 : -1;
    const volatility = score > 70 || score < 30 ? 0.03 : 0.015;
    
    const labels = [];
    const close = [];
    const colors = [];
    
    let price = basePrice;
    for (let i = 0; i < 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (19 - i));
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        
        const change = (Math.random() - 0.5) * volatility * price * trend;
        price += change;
        close.push(price);
    }
    
    const isUp = close[close.length - 1] > close[0];
    const mainColor = isUp ? '#10b981' : '#ef4444';
    const bgColor = isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    
    return {
        labels,
        close,
        colors: [mainColor, bgColor],
        currentPrice: close[close.length - 1],
        change: ((close[close.length - 1] - close[0]) / close[0]) * 100,
        volume: `${(Math.random() * 10 + 5).toFixed(1)}亿`,
        amount: `${(Math.random() * 50 + 20).toFixed(1)}亿`
    };
}

/**
 * 销毁 K 线图表
 */
export function destroyKlineChart() {
    if (window.klineChartInstance) {
        window.klineChartInstance.destroy();
        window.klineChartInstance = null;
    }
}
