// 测试 ModelScope API 连接
// 参考文档：https://modelscope.cn/docs/API-Inference/llm-api
require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.MODELSCOPE_API_KEY;
const API_URL = process.env.MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1/';

// 根据官方文档，使用当前支持的模型
// 注意：模型会随时间变化，请以 https://modelscope.cn 为准
const MODELS_TO_TRY = [
  // 文档示例模型
  'Qwen/Qwen3.5-35B-A3B',
  'Qwen/Qwen2.5-Coder-32B-Instruct',
  
  // Qwen 系列
  'Qwen/Qwen2.5-72B-Instruct',
  'Qwen/Qwen2.5-32B-Instruct',
  'Qwen/Qwen2.5-14B-Instruct',
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2-72B-Instruct',
  'Qwen/Qwen2-7B-Instruct',
  
  // DeepSeek 系列
  'deepseek-ai/DeepSeek-V2.5',
  'deepseek-ai/DeepSeek-V2-Chat',
  'deepseek-ai/DeepSeek-V2',
  
  // ChatGLM 系列
  'THUDM/chatglm3-6b',
  'THUDM/chatglm2-6b',
  
  // Yi 系列
  '01-ai/Yi-34B-Chat',
  '01-ai/Yi-6B-Chat'
];

async function testAPI() {
  console.log('🔍 测试 ModelScope API 连接...\n');
  console.log('📋 参考文档：https://modelscope.cn/docs/API-Inference/llm-api');
  console.log('API URL:', API_URL);
  console.log('Access Token:', API_KEY ? API_KEY.substring(0, 15) + '...' : '❌ 未配置');
  console.log('\n');

  if (!API_KEY) {
    console.error('❌ 错误：MODELSCOPE_API_KEY 未配置');
    console.error('💡 请访问 https://modelscope.cn/my/myaccesstoken 获取 Access Token\n');
    process.exit(1);
  }

  let foundModel = false;

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
        try {
          const error = JSON.parse(errorText);
          const errorMsg = error.errors?.message || error.message || errorText;
          
          // 认证错误
          if (errorMsg.includes('Authentication') || 
              errorMsg.includes('Unauthorized') ||
              errorMsg.includes('access') ||
              response.status === 401) {
            console.log(`   ❌ 认证失败：${errorMsg}`);
            console.log('\n💡 Access Token 可能无效或已过期\n');
            console.log('📞 请访问 https://modelscope.cn/my/myaccesstoken 重新获取\n');
            process.exit(1);
          }
          
          // 模型不可用
          console.log(`   ❌ 模型不可用：${errorMsg.substring(0, 50)}...\n`);
        } catch (e) {
          console.log(`   ❌ 请求失败：${response.status}\n`);
        }
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      console.log(`   ✅ 模型可用！\n`);
      console.log('📄 AI 响应:\n');
      console.log(content);
      console.log('\n');
      
      console.log(`🎉 配置完成！推荐模型：${MODEL_NAME}`);
      console.log('\n请在 .env.local 和 server/.env 中设置:');
      console.log(`MODEL_NAME=${MODEL_NAME}`);
      console.log('\nFOMOGuard 现在可以使用真实 AI 分析功能。\n');
      
      foundModel = true;
      return;

    } catch (error) {
      console.log(`   ❌ 错误：${error.message}\n`);
    }
  }

  if (!foundModel) {
    console.error('❌ 所有模型都不可用\n');
    console.error('💡 可能原因:');
    console.error('   1. Access Token 权限受限');
    console.error('   2. 模型列表已更新（新模型上线，旧模型下线）');
    console.error('   3. 该 Token 未开通 API-Inference 服务\n');
    console.error('📞 建议:');
    console.error('   1. 访问 https://modelscope.cn/my/myaccesstoken 确认 Token 状态');
    console.error('   2. 查看 https://modelscope.cn/docs/API-Inference/llm-api');
    console.error('   3. 确认账号已完成实名认证');
    console.error('   4. 联系 ModelScope 支持\n');
    process.exit(1);
  }
}

testAPI();
