/**
 * 测试腾讯财经 API - 支持 A 股、港股、美股
 * API 文档：http://qt.gtimg.cn/q=股票代码
 */

async function testTencentAPI() {
  console.log('🔍 测试腾讯财经 API 连接...\n');
  
  const testSymbols = [
    { code: 'sh000001', name: '上证指数' },
    { code: 'sz000001', name: '平安银行' },
    { code: 'sh600519', name: '贵州茅台' },
    { code: 'sz002594', name: '比亚迪' },
    { code: 'hk00700', name: '腾讯控股' },
    { code: 'usTSLA', name: '特斯拉' },
    { code: 'usAAPL', name: '苹果' }
  ];

  for (const { code, name } of testSymbols) {
    console.log(`\n📊 测试：${name} (${code})`);
    console.log('─'.repeat(70));
    
    try {
      const url = `http://qt.gtimg.cn/q=${code}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*',
          'Referer': 'http://finance.qq.com/'
        },
        timeout: 10000
      });

      if (!response.ok) {
        console.log(`  ❌ HTTP 错误：${response.status}`);
        continue;
      }

      const text = await response.text();
      const match = text.match(/v_(\w+)="([^"]+)"/);
      
      if (!match) {
        console.log('  ❌ 数据格式错误');
        continue;
      }

      const data = match[2].split('~');
      
      if (data.length < 30) {
        console.log('  ❌ 数据字段不足');
        continue;
      }

      const stockName = data[1];
      const stockCode = data[2];
      const currentPrice = parseFloat(data[3]) || 0;
      const prevClose = parseFloat(data[2]) || currentPrice;
      const openPrice = parseFloat(data[5]) || 0;
      const highPrice = parseFloat(data[33]) || parseFloat(data[4]) || currentPrice;
      const lowPrice = parseFloat(data[34]) || parseFloat(data[5]) || currentPrice;
      const volume = parseInt(data[6]) || 0;
      
      const change = currentPrice - prevClose;
      const changePercent = ((currentPrice - prevClose) / prevClose * 100).toFixed(2);
      const arrow = change >= 0 ? '📈' : '📉';

      console.log(`  ✅ 获取成功`);
      console.log(`  名称：${stockName}  代码：${stockCode}`);
      console.log(`  当前价：¥${currentPrice.toFixed(2)} ${arrow} ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent}%)`);
      console.log(`  开盘：¥${openPrice.toFixed(2)}  最高：¥${highPrice.toFixed(2)}  最低：¥${lowPrice.toFixed(2)}`);
      console.log(`  成交量：${volume.toLocaleString()}`);

    } catch (error) {
      console.log(`  ❌ 错误：${error.message}`);
    }
    
    console.log('');
  }

  console.log('\n🎉 测试完成！\n');
  console.log('💡 提示：');
  console.log('  - 腾讯财经 API 无需 API Key，可直接使用');
  console.log('  - 支持 A 股 (sh/sz)、港股 (hk)、美股 (us)');
  console.log('  - 批量获取：http://qt.gtimg.cn/q=sh600519,sz002594,hk00700');
  console.log('');
}

testTencentAPI();
