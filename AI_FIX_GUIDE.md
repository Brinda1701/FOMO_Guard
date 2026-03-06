# FOMOGuard AI 配置快速修复指南

## 问题症状

页面顶部显示黄色警告：
```
⚠️ 当前未配置 AI 模型 Key，处于本地模拟演示模式
分析结果均为随机生成，仅供参考...
```

## 原因

**Vercel Serverless 函数无法读取本地 `.env.local` 文件**，需要在 Vercel 平台配置环境变量。

## 快速解决（3 分钟）

### 步骤 1：登录 Vercel

访问：https://vercel.com/dashboard

### 步骤 2：选择项目

找到并点击 `FOMO_Guard` 项目

### 步骤 3：配置环境变量

1. 点击左侧菜单 **Settings**
2. 点击 **Environment Variables**
3. 点击 **Add New**
4. 添加以下 3 个变量：

| Name | Value |
|------|-------|
| `MODELSCOPE_API_KEY` | `ms-45f8d0d6-4c86-4c9c-a145-69f2a4679ecb` |
| `MODELSCOPE_API_URL` | `https://api-inference.modelscope.cn/v1/` |
| `MODEL_NAME` | `qwen-max` |

5. 每个变量添加后点击 **Save**

### 步骤 4：重新部署

1. 回到项目首页
2. 点击 **Redeploy**（或推送新的 Git 提交）
3. 等待部署完成（约 1-2 分钟）

### 步骤 5：验证

1. 访问你的 Vercel 网站
2. 打开浏览器控制台（F12）
3. 应该看到 "AI 模式：已启用"
4. 黄色警告消失

## 本地测试（可选）

如果想在本地测试真实 AI：

```bash
# 1. 进入 server 目录
cd server

# 2. 安装依赖
npm install

# 3. 启动服务器
npm start

# 4. 访问 http://localhost:3000
```

## 常见问题

### Q: 配置后仍然显示警告？

A: 检查以下几点：
1. 环境变量是否在 Vercel 控制台正确保存
2. 是否重新部署了项目
3. 清除浏览器缓存后刷新

### Q: 模型 `qwen-max` 不可用？

A: 尝试运行测试脚本：
```bash
cd server
node test-api.js
```
会列出所有可用模型

### Q: 如何确认 AI 真的在工作？

A: 观察分析速度：
- 模拟模式：瞬间完成（<1 秒）
- 真实 AI：需要 2-5 秒（调用 API 时间）

## 安全提醒

⚠️ **重要**：
- `.env.local` 已被 `.gitignore` 忽略
- 不要手动编辑 `vercel.json` 中的 `@modelscope-api-key`
- API Key 只在 Vercel 平台配置，不要提交到 Git
