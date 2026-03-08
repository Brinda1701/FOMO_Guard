/**
 * 测试新浪财经 API - 获取真实 A 股 K 线数据
 * API 文档：http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData
 */

async function testSinaAPI() {
  console.log('🔍 测试新浪财经 API 连接...\n');
  
  const testSymbols = [
    { code: 'sh000001', name: '上证指数' },
    { code: 'sz000001', name: '平安银行' },
    { code: 'sh600519', name: '贵州茅台' },
    { code: 'sz002594', name: '比亚迪' }
  ];

  for (const { code, name } of testSymbols) {
    console.log(`\n📊 测试：${name} (${code})`);
    console.log('─'.repeat(60));
    
    try {
      const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${code}&scale=240&ma=5&datalen=5`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'http://finance.sina.com.cn/'
        },
        timeout: 10000
      });

      if (!response.ok) {
        console.log(`  ❌ HTTP 错误：${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log('  ❌ 数据为空');
        continue;
      }

      console.log(`  ✅ 成功获取 ${data.length} 条数据\n`);
      
      for (const item of data) {
        const open = parseFloat(item.open);
        const high = parseFloat(item.high);
        const low = parseFloat(item.low);
        const close = parseFloat(item.close);
        const volume = parseInt(item.volume) || 0;
        
        const change = close - open;
        const changePercent = ((close - open) / open * 100).toFixed(2);
        const arrow = change >= 0 ? '📈' : '📉';
        
        console.log(`  ${item.day} ${arrow}`);
        console.log(`    开：${open.toFixed(2)}  高：${high.toFixed(2)}  低：${low.toFixed(2)}  收：${close.toFixed(2)}`);
        console.log(`    涨跌：${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent}%)  量：${volume.toLocaleString()}`);
      }

    } catch (error) {
      console.log(`  ❌ 错误：${error.message}`);
    }
    
    console.log('');
  }

  console.log('\n🎉 测试完成！\n');
  console.log('💡 提示：');
  console.log('  - 新浪财经 API 无需 API Key，可直接使用');
  console.log('  - 仅限 A 股和上证指数');
  console.log('  - 参数说明：scale=240(日线), datalen=数据条数 (最多 3000)');
  console.log('');
}

testSinaAPI();
