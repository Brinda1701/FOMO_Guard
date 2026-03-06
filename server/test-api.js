// 测试 ModelScope API 连接
require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.MODELSCOPE_API_KEY;
const API_URL = process.env.MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1/';

// 尝试多个模型（ModelScope 正确格式）
const MODELS_TO_TRY = [
  'qwen-max',
  'qwen-turbo',
  'qwen-plus',
  'deepseek-v2.5',
  'chatglm3-6b',
  'qwen-72b-chat',
  'qwen-14b-chat',
  'llama-2-7b-chat',
  'baichuan2-7b-chat',
  'yi-34b-chat'
];

async function testAPI() {
  console.log('🔍 测试 ModelScope API 连接...\n');
  console.log('API URL:', API_URL);
  console.log('API Key:', API_KEY ? API_KEY.substring(0, 15) + '...' : '❌ 未配置');
  console.log('\n');

  if (!API_KEY) {
    console.error('❌ 错误：MODELSCOPE_API_KEY 未配置');
    process.exit(1);
  }

  for (const MODEL_NAME of MODELS_TO_TRY) {
    console.log(`🔄 尝试模型：${MODEL_NAME}...`);
    
    try {
      const response = await fetch(`${API_URL}chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: '你是一个专业的金融分析 AI。请返回 JSON 格式结果。' },
            { role: 'user', content: '请分析特斯拉的市场情绪，返回 JSON 格式：{"score": 数字，"sentiment": "正面/负面/中性"}' }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('no provider supported') || errorText.includes('not found')) {
          console.log(`   ❌ 该模型不可用，尝试下一个...\n`);
          continue;
        }
        throw new Error(`API 错误：${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      console.log(`   ✅ 模型可用！\n`);
      console.log('📄 AI 响应:\n');
      console.log(content);
      console.log('\n');
      
      // 更新 .env 文件
      console.log(`🎉 配置完成！推荐模型：${MODEL_NAME}`);
      console.log('\n请在 .env.local 和 server/.env 中设置:');
      console.log(`MODEL_NAME=${MODEL_NAME}`);
      console.log('\nFOMOGuard 现在可以使用真实 AI 分析功能。\n');
      
      return;

    } catch (error) {
      console.log(`   ❌ 错误：${error.message}\n`);
    }
  }

  console.error('❌ 所有模型都不可用，请检查 API Key 或联系 ModelScope 支持');
  process.exit(1);
}

testAPI();
