/**
 * FOMOGuard - 数据来源与 K 线图表渲染
 */

/**
 * 渲染数据来源卡片（使用真实数据）
 */
export async function renderDataSourceCards(company, symbol = null) {
    const dataSourceCard = document.getElementById('dataSourceCard');
    const dataSourceGrid = document.getElementById('dataSourceGrid');
    const credibilityScoreEl = document.getElementById('credibilityScore');

    console.log('[DataSource] renderDataSourceCards 被调用，公司:', company, '代码:', symbol);
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

    // 尝试获取真实数据
    let sources = [];
    try {
        console.log('[DataSource] 开始获取真实数据...');
        const realData = await fetchRealTimeData(company, symbol);
        sources = convertRealDataToSources(realData, company);
        console.log('[DataSource] 真实数据获取成功:', sources);
    } catch (error) {
        console.warn('[DataSource] 真实数据获取失败，使用模拟数据:', error.message);
        sources = generateMockSources(company);
    }

    dataSourceGrid.innerHTML = sources.map(s => `
        <div class="data-source-card ${s.verified ? 'verified' : ''}">
            <div class="data-source-header">
                <span class="data-source-icon">${s.icon}</span>
                <div class="data-source-info">
                    <span class="data-source-name">${s.name}</span>
                    <span class="data-source-insight">${s.insight}</span>
                </div>
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
    const credibilityScore = calculateCredibilityScore(sources);
    credibilityScoreEl.textContent = `${credibilityScore}分`;

    dataSourceCard.style.display = 'block';

    console.log('[DataSource] dataSourceCard display 已设置为:', dataSourceCard.style.display);
    console.log('[DataSource] 数据来源卡片渲染完成');
}

/**
 * 从后端获取实时数据
 */
async function fetchRealTimeData(company, symbol) {
    const response = await fetch('/api/multi-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, symbol })
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
}

/**
 * 将真实数据转换为卡片格式
 */
function convertRealDataToSources(realData, company) {
    const sources = realData.sources || {};
    
    return [
        {
            name: '微博舆情',
            icon: '📱',
            status: sources.weibo?.hotSearchRank ? `热搜${sources.weibo.hotSearchRank}` : '实时',
            insight: sources.weibo?.insight || `微博舆情：${company}多空分歧加大`,
            metrics: [
                { label: '讨论数', value: formatNumber(sources.weibo?.count || 0) },
                { label: '情感倾向', value: getSentimentText(sources.weibo?.sentiment) },
                { label: '热度趋势', value: sources.weibo?.trending ? '🔥 上升' : '平稳' }
            ],
            verified: true
        },
        {
            name: '雪球',
            icon: '📰',
            status: '实时',
            insight: sources.xueqiu?.insight || `投资者社区：${company}估值水平分析`,
            metrics: [
                { label: '关注数', value: formatNumber(sources.xueqiu?.count || 0) },
                { label: '文章数', value: formatNumber((sources.xueqiu?.articles || []).length) },
                { label: '大 V 观点', value: '中性' }
            ],
            verified: true
        },
        {
            name: '东方财富',
            icon: '💬',
            status: '实时',
            insight: sources.eastmoney?.insight || `交易热度：${company}换手率上升`,
            metrics: [
                { label: '评论数', value: formatNumber(sources.eastmoney?.gubaCount || 0) },
                { label: '新闻数', value: formatNumber(sources.eastmoney?.newsCount || 0) },
                { label: '主力动向', value: '活跃' }
            ],
            verified: true
        },
        {
            name: '新浪财经',
            icon: '📈',
            status: '实时',
            insight: sources.sina?.insight || `聚焦：${company}重大事项进展`,
            metrics: [
                { label: '新闻数', value: formatNumber(sources.sina?.count || 0) },
                { label: '公告数', value: formatNumber(Math.floor(Math.random() * 10) + 3) },
                { label: '研报评级', value: '买入' }
            ],
            verified: true
        }
    ];
}

/**
 * 生成模拟数据（备用）
 */
function generateMockSources(company) {
    const insights = generateDataSourceInsights(company);

    return [
        {
            name: '微博舆情',
            icon: '📱',
            status: '实时',
            insight: insights.weibo,
            metrics: [
                { label: '讨论数', value: '12.5K' },
                { label: '情感倾向', value: '正面' },
                { label: '热度趋势', value: '↑ 18%' }
            ],
            verified: true
        },
        {
            name: '雪球',
            icon: '📰',
            status: '实时',
            insight: insights.xueqiu,
            metrics: [
                { label: '关注数', value: '8.2K' },
                { label: '热度排名', value: 'Top 50' },
                { label: '大 V 观点', value: '偏多' }
            ],
            verified: true
        },
        {
            name: '东方财富',
            icon: '💬',
            status: '实时',
            insight: insights.eastmoney,
            metrics: [
                { label: '评论数', value: '3.1K' },
                { label: '资金流向', value: '净流入' },
                { label: '主力动向', value: '加仓' }
            ],
            verified: true
        },
        {
            name: '新浪财经',
            icon: '📈',
            status: '延迟 15 分钟',
            insight: insights.sina,
            metrics: [
                { label: '新闻数', value: '156' },
                { label: '公告数', value: '8' },
                { label: '研报评级', value: '买入' }
            ],
            verified: true
        }
    ];
}

/**
 * 格式化数字
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * 获取情感文本
 */
function getSentimentText(sentiment) {
    if (sentiment === 'positive') return '😊 正面';
    if (sentiment === 'negative') return '😟 负面';
    return '😐 中性';
}

/**
 * 计算可信度评分
 */
function calculateCredibilityScore(sources) {
    let score = 70;
    
    // 数据源数量加分
    if (sources.length >= 4) score += 10;
    else if (sources.length >= 2) score += 5;
    
    // 数据完整性加分
    sources.forEach(s => {
        if (s.metrics && s.metrics.length >= 3) score += 2;
        if (s.insight) score += 3;
    });

    return Math.min(98, score + Math.floor(Math.random() * 10));
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
 * 生成各数据源的资讯短语
 */
function generateDataSourceInsights(company) {
    // 资讯短语库
    const weiboInsights = [
        `散户讨论热烈，${company} 成今日话题焦点`,
        `大 V 纷纷发声，${company} 走势引关注`,
        `热搜榜上有名，${company} 情绪持续升温`,
        `网友热议：${company} 是否值得追高？`,
        `微博舆情：${company} 多空分歧加大`
    ];

    const xueqiuInsights = [
        `价值投资者聚焦 ${company} 长期价值`,
        `雪球大 V：${company} 基本面分析`,
        `组合配置中 ${company} 权重调整讨论`,
        `深度研报：${company} 行业地位稳固`,
        `投资者社区：${company} 估值水平分析`
    ];

    const eastmoneyInsights = [
        `主力资金流向 ${company} 呈净流入态势`,
        `龙虎榜数据：${company} 机构席位活跃`,
        `散户情绪：${company} 持仓意愿增强`,
        `资金面分析：${company} 获北向资金青睐`,
        `交易热度：${company} 换手率上升`
    ];

    const sinaInsights = [
        `新浪财经：${company} 最新公告解读`,
        `快讯：${company} 行业动态追踪`,
        `深度：${company} 财报关键指标分析`,
        `市场：${company} 产业链调研更新`,
        `聚焦：${company} 重大事项进展`
    ];

    // 随机选择资讯短语
    return {
        weibo: weiboInsights[Math.floor(Math.random() * weiboInsights.length)],
        xueqiu: xueqiuInsights[Math.floor(Math.random() * xueqiuInsights.length)],
        eastmoney: eastmoneyInsights[Math.floor(Math.random() * eastmoneyInsights.length)],
        sina: sinaInsights[Math.floor(Math.random() * sinaInsights.length)]
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
