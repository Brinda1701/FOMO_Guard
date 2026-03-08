/**
 * 测试腾讯 API 数据格式 - 检查原始返回数据
 */

async function testTencentDataFormat() {
  console.log('🔍 测试腾讯 API 原始数据格式\n');
  
  const testSymbols = [
    { code: 'hk00700', name: '腾讯控股' },
    { code: 'hk01810', name: '小米集团' },
    { code: 'hk09988', name: '阿里巴巴' },
    { code: 'usTSLA', name: '特斯拉' },
    { code: 'usAAPL', name: '苹果' }
  ];

  for (const { code, name } of testSymbols) {
    console.log(`\n📊 ${name} (${code})`);
    console.log('='.repeat(80));
    
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

      const text = await response.text();
      console.log('原始返回:', text.substring(0, 500));
      
      const match = text.match(/v_(\w+)="([^"]+)"/);
      if (match) {
        const data = match[2].split('~');
        console.log('\n字段解析:');
        console.log(`  [0] 未知：${data[0]}`);
        console.log(`  [1] 名称：${data[1]}`);
        console.log(`  [2] 代码：${data[2]}`);
        console.log(`  [3] 当前价：${data[3]}`);
        console.log(`  [4] 昨收：${data[4]}`);
        console.log(`  [5] 今开：${data[5]}`);
        console.log(`  [6] 成交量：${data[6]}`);
        console.log(`  [33] 最高：${data[33] || 'N/A'}`);
        console.log(`  [34] 最低：${data[34] || 'N/A'}`);
        console.log(`  数据总长度：${data.length}`);
      }

    } catch (error) {
      console.log(`❌ 错误：${error.message}`);
    }
  }
}

testTencentDataFormat();
