# FOMOGuard AI 配置说明

## 已配置的 API Key

✅ **MODELSCOPE_API_KEY 已配置**: `ms-45f8d0d6-4c86-4c9c-a145-69f2a4679ecb`

## 问题诊断

根据测试，当前 API Key 可能无法访问以下模型：
- ❌ qwen-max
- ❌ qwen-turbo
- ❌ qwen-plus
- ❌ deepseek-v2.5
- ❌ chatglm3-6b

## 解决方案

### 方案 1：检查 ModelScope 控制台

1. 访问 [ModelScope 控制台](https://modelscope.cn/my/accessToken)
2. 确认 API Key 状态是否正常
3. 查看该 Key 可以访问哪些模型

### 方案 2：运行测试脚本

```bash
cd server
node test-api.js
```

该脚本会自动测试多个模型，并显示可用的模型列表。

### 方案 3：使用备用 API

如果 ModelScope API 不可用，可以考虑：
- 使用阿里云百炼平台（https://bailian.console.aliyun.com/）
- 使用 DeepSeek API（https://platform.deepseek.com/）
- 使用其他兼容 OpenAI 格式的 API

## 配置文件位置

- **前端配置**: `.env.local`
- **后端配置**: `server/.env`

两个文件都已配置相同的 API Key。

## 验证配置是否生效

1. 启动后端服务器：
   ```bash
   cd server
   npm start
   ```

2. 访问健康检查接口：
   ```
   http://localhost:3000/api/health
   ```

3. 如果显示 `modelscope_available: true`，则配置成功。

## 注意事项

⚠️ **安全提醒**：
- 不要将 `.env.local` 和 `server/.env` 提交到 Git
- 这些文件已添加到 `.gitignore`
- 生产环境请使用环境变量管理工具
