# FOMOGuard Vercel 环境变量配置

## 新的 API Key 信息

**项目名称**: 111
**API Key**: `ms-fff93c78-d98a-4d4b-8e53-58a0671410dc`

## 在 Vercel 控制台配置

### 步骤 1：访问项目设置

1. 打开 https://vercel.com/dashboard
2. 找到你的 **111** 项目（或 FOMO_Guard 项目）
3. 点击 **Settings**

### 步骤 2：添加环境变量

点击 **Environment Variables** → **Add New**，添加以下 3 个变量：

| Name | Value | Environments |
|------|-------|--------------|
| `MODELSCOPE_API_KEY` | `ms-fff93c78-d98a-4d4b-8e53-58a0671410dc` | ✅ Production ✅ Preview ✅ Development |
| `MODELSCOPE_API_URL` | `https://api-inference.modelscope.cn/v1/` | ✅ Production ✅ Preview ✅ Development |
| `MODEL_NAME` | `qwen-max` | ✅ Production ✅ Preview ✅ Development |

**重要**：每个变量都要勾选所有三个环境

### 步骤 3：重新部署

1. 回到项目首页
2. 点击 **Redeploy**
3. 等待部署完成（约 1-2 分钟）

### 步骤 4：验证

部署完成后访问你的网站：
- 黄色警告应该消失
- 控制台显示 "AI 模式：已启用"
- 分析时间从瞬间变为 2-5 秒（真实 AI 调用）

## 本地测试

```bash
# 进入 server 目录
cd server

# 安装依赖（如果还未安装）
npm install

# 启动服务器
npm start

# 访问 http://localhost:3000
```

## 测试 API Key 是否有效

```bash
cd server
node test-api.js
```

该脚本会测试多个模型，并显示可用的模型列表。

## 可用模型推荐

如果 `qwen-max` 不可用，可以尝试：
- `qwen-turbo`（速度快，成本低）
- `qwen-plus`（平衡性能和成本）

## 注意事项

⚠️ **重要**：
- `.env.local` 和 `server/.env` 已被 `.gitignore` 忽略
- 不要将 API Key 提交到 Git
- 只在 Vercel 控制台配置敏感信息
- 定期检查 API Key 的使用情况
