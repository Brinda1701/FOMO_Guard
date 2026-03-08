/**
 * 测试 Alpha Vantage API 连接
 */
require('dotenv').config({ path: '.env.local' });

async function testAlphaVantage() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  console.log('🔍 测试 Alpha Vantage API 连接...\n');
  console.log('📋 API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : '❌ 未配置');
  console.log('📊 测试股票：TSLA (特斯拉)\n');

  if (!apiKey) {
    console.log('❌ 错误：ALPHA_VANTAGE_API_KEY 未配置');
    console.log('💡 请检查 .env.local 文件');
    process.exit(1);
  }

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=TSLA&outputsize=compact&apikey=${apiKey}`;
    
    console.log('🌐 请求 URL:', url.substring(0, 100) + '...\n');
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FOMOGuard/1.0' }
    });

    console.log('📡 HTTP 状态:', response.status);

    const data = await response.json();

    // 检查 API 限制
    if (data['Note']) {
      console.log('⚠️  警告：API 调用频率超限');
      console.log(data['Note']);
      return;
    }

    // 检查数据
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      console.log('❌ 错误：未获取到数据');
      console.log('返回内容:', JSON.stringify(data, null, 2).substring(0, 500));
      return;
    }

    // 解析数据
    const dates = Object.keys(timeSeries).slice(0, 5);
    console.log('\n✅ 成功获取数据！\n');
    console.log('📈 最近 5 天 K 线数据：');
    console.log('─'.repeat(80));

    for (const date of dates) {
      const day = timeSeries[date];
      const open = parseFloat(day['1. open']);
      const high = parseFloat(day['2. high']);
      const low = parseFloat(day['3. low']);
      const close = parseFloat(day['4. close']);
      const volume = parseInt(day['5. volume']);
      
      const change = close - open;
      const changePercent = ((close - open) / open * 100).toFixed(2);
      const arrow = change >= 0 ? '📈' : '📉';
      
      console.log(`${date} ${arrow}`);
      console.log(`  开盘：$${open.toFixed(2)}  |  收盘：$${close.toFixed(2)}  |  涨跌：${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent}%)`);
      console.log(`  最高：$${high.toFixed(2)}  |  最低：$${low.toFixed(2)}  |  成交量：${volume.toLocaleString()}`);
      console.log('─'.repeat(80));
    }

    console.log('\n🎉 Alpha Vantage API 配置成功！可以正常使用真实 K 线数据了！\n');

  } catch (error) {
    console.log('❌ 错误:', error.message);
    process.exit(1);
  }
}

testAlphaVantage();
