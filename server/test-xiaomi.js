/**
 * 测试腾讯 API 获取小米数据
 */
require('dotenv').config({ path: '.env.local' });

async function testXiaomi() {
  console.log('🔍 测试小米集团 (hk01810) 数据\n');
  
  const code = 'hk01810';
  const url = `http://qt.gtimg.cn/q=${code}`;
  
  console.log('请求 URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*',
        'Referer': 'http://finance.qq.com/'
      },
      timeout: 10000
    });
    
    const text = await response.text();
    console.log('\n原始返回:', text);
    
    const match = text.match(/v_(\w+)="([^"]+)"/);
    if (match) {
      const data = match[2].split('~');
      const currentPrice = parseFloat(data[3]);
      const open = parseFloat(data[5]);
      const high = parseFloat(data[33]) || parseFloat(data[4]);
      const low = parseFloat(data[34]) || parseFloat(data[5]);
      const volume = parseInt(data[6]);
      
      console.log('\n✅ 解析结果:');
      console.log(`  当前价：HK$ ${currentPrice.toFixed(2)}`);
      console.log(`  开盘：HK$ ${open.toFixed(2)}`);
      console.log(`  最高：HK$ ${high.toFixed(2)}`);
      console.log(`  最低：HK$ ${low.toFixed(2)}`);
      console.log(`  成交量：${volume.toLocaleString()}`);
      console.log(`  货币：HKD`);
      console.log('\n💡 小米真实价格约 33 港元（约 30 多人民币）');
    }
    
  } catch (error) {
    console.log('❌ 错误:', error.message);
  }
}

testXiaomi();
