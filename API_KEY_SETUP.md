# FOMOGuard AI 配置说明

## 重要提示

**你提供的文档是模型下载说明，但我们需要的是 API 推理服务！**

### 区别

| 方式 | 用途 | 是否需要 API Key | 我们的项目 |
|------|------|-----------------|-----------|
| **模型下载** | 下载模型文件到本地硬盘 | ❌ 不需要 | ❌ 不使用 |
| **API 推理** | 在线调用模型服务 | ✅ 需要 | ✅ 使用这个 |

## 已配置的 API Key

```
MODELSCOPE_API_KEY=ms-fff93c78-d98a-4d4b-8e53-58a0671410dc
```

## 本地配置（已完成）

已在以下文件中配置：
- ✅ `.env.local`
- ✅ `server/.env`

## Vercel 部署配置（需要手动操作）

### 步骤 1：访问 Vercel 控制台

打开：https://vercel.com/dashboard

### 步骤 2：选择项目

找到你的项目（111 或 FOMO_Guard）

### 步骤 3：添加环境变量

1. 点击 **Settings**
2. 点击 **Environment Variables**
3. 点击 **Add New**
4. 添加以下 3 个变量：

| Name | Value |
|------|-------|
| `MODELSCOPE_API_KEY` | `ms-fff93c78-d98a-4d4b-8e53-58a0671410dc` |
| `MODELSCOPE_API_URL` | `https://api-inference.modelscope.cn/v1/` |
| `MODEL_NAME` | `deepseek-ai/DeepSeek-V2.5` |

5. **重要**：每个变量都要勾选 **Production**、**Preview**、**Development**
6. 点击 **Save**

### 步骤 4：重新部署

1. 回到项目首页
2. 点击 **Redeploy**
3. 等待 1-2 分钟

### 步骤 5：验证

访问你的网站：
- 黄色警告消失 = ✅ AI 配置成功
- 仍然显示警告 = ❌ 需要检查配置

## 测试 API Key

```bash
cd server
node test-api.js
```

## 如果模型不可用

访问 https://modelscope.cn/studios 查看可用的推理模型

常用 API 推理模型 ID：
- `deepseek-ai/DeepSeek-V2.5`
- `deepseek-ai/DeepSeek-V2`
- `Qwen/Qwen2.5-72B-Instruct`
- `THUDM/chatglm3-6b`

## 常见问题

### Q: 为什么提示"Invalid model id"？

A: ModelScope 的 API 推理服务支持的模型有限，需要确认：
1. 该模型是否支持 API 推理（不是所有模型都支持）
2. 模型 ID 格式是否正确
3. 你的 API Key 是否有权限访问该模型

### Q: 如何确认 API Key 是否有效？

A: 如果返回错误是 `Invalid model id` 而不是认证错误，说明 API Key 有效，只是模型不对。

### Q: 如何获取支持 API 推理的模型列表？

A: 
1. 访问 https://modelscope.cn/studios
2. 查找带有"API"或"推理"标识的模型
3. 或联系 ModelScope 支持

## 本地测试

```bash
# 进入 server 目录
cd server

# 启动服务器
npm start

# 访问 http://localhost:3000
```
