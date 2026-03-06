# FOMOGuard Vercel 环境变量配置指南

## 问题原因

前端显示的 "未配置 AI 模型 Key" 是因为 **Vercel Serverless 函数无法读取本地 `.env.local` 文件**。

`.env.local` 只在本地 `npm start` 时有效，部署到 Vercel 后需要使用 Vercel 的环境变量功能。

## 解决方案

### 方案 1：在 Vercel 控制台配置（推荐）

1. 访问 https://vercel.com/dashboard
2. 选择你的 FOMO_Guard 项目
3. 点击 "Settings" → "Environment Variables"
4. 点击 "Add New" 添加以下变量：

| Variable Name | Value |
|--------------|-------|
| `MODELSCOPE_API_KEY` | `ms-45f8d0d6-4c86-4c9c-a145-69f2a4679ecb` |
| `MODELSCOPE_API_URL` | `https://api-inference.modelscope.cn/v1/` |
| `MODEL_NAME` | `qwen-max` |

5. 点击 "Save" 保存
6. **重新部署项目**（点击 "Deploy" 或推送新的 Git 提交）

### 方案 2：使用 Vercel CLI 配置

```bash
# 安装 Vercel CLI（如果未安装）
npm i -g vercel

# 登录 Vercel
vercel login

# 进入项目目录
cd D:\zjy\Hackson\2.18

# 添加环境变量
vercel env add MODELSCOPE_API_KEY ms-45f8d0d6-4c86-4c9c-a145-69f2a4679ecb
vercel env add MODELSCOPE_API_URL https://api-inference.modelscope.cn/v1/
vercel env add MODEL_NAME qwen-max

# 重新部署
vercel --prod
```

### 方案 3：本地测试（使用 server 目录）

如果你想在本地测试真实 AI 功能：

```bash
# 进入 server 目录
cd D:\zjy\Hackson\2.18\server

# 安装依赖
npm install

# 启动服务器
npm start

# 访问 http://localhost:3000
```

## 验证配置是否生效

1. 部署完成后，访问你的 Vercel 网站
2. 打开浏览器开发者工具（F12）
3. 查看控制台，应该显示 "AI 模式：已启用"
4. 警告提示应该自动消失

## 注意事项

⚠️ **重要**：
- `.env.local` 文件已被 `.gitignore` 忽略，不会提交到 Git
- 所有协作者都需要在 Vercel 控制台配置相同的环境变量
- 生产环境和预览环境需要分别配置

## 模型选择

如果 `qwen-max` 不可用，可以尝试以下模型：
- `qwen-turbo`（速度快，成本低）
- `qwen-plus`（平衡性能和成本）
- 运行 `node server/test-api.js` 测试可用模型
