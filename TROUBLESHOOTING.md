# FOMOGuard AI 配置问题诊断

## 问题症状

你提到"所有都试过了，还是不行"，请按照以下步骤诊断：

## 第一步：确认问题

**请回答以下问题：**

1. **访问你的 Vercel 网站**，是否仍然看到黄色警告？
   - 警告内容："⚠️ 当前未配置 AI 模型 Key，处于本地模拟演示模式"

2. **按 F12 打开控制台**，是否看到以下信息？
   - `[AI] 后端不可用，使用前端模式`
   - 或 `AI 模式：已启用`

3. **访问 `https://你的域名.vercel.app/api/health`**，返回什么？
   - 应该返回 JSON，包含 `modelscope_available: true`

## 第二步：检查 Vercel 环境变量

**这是最可能的原因！**

### 检查步骤

1. 访问：https://vercel.com/dashboard
2. 找到你的项目（111 或 FOMO_Guard）
3. 点击 **Settings**
4. 点击 **Environment Variables**

**应该看到以下 3 个变量：**

```
✅ MODELSCOPE_API_KEY = ms-78f016ca-a44f-4065-bbce-b3b6e2729b09
✅ MODELSCOPE_API_URL = https://api-inference.modelscope.cn/v1/
✅ MODEL_NAME = Qwen/Qwen3.5-35B-A3B
```

**如果看不到，说明环境变量没有配置！**

### 添加环境变量

1. 点击 **Add New**
2. 添加第一个变量：
   - Name: `MODELSCOPE_API_KEY`
   - Value: `ms-78f016ca-a44f-4065-bbce-b3b6e2729b09`
   - 勾选：✅ Production ✅ Preview ✅ Development
3. 添加第二个变量：
   - Name: `MODELSCOPE_API_URL`
   - Value: `https://api-inference.modelscope.cn/v1/`
   - 勾选：✅ Production ✅ Preview ✅ Development
4. 添加第三个变量：
   - Name: `MODEL_NAME`
   - Value: `Qwen/Qwen3.5-35B-A3B`
   - 勾选：✅ Production ✅ Preview ✅ Development

### 重新部署

**重要：** 添加环境变量后必须重新部署！

1. 回到项目首页
2. 点击 **Deployments**
3. 找到最新部署
4. 点击右侧 **⋮** → **Redeploy**
5. 等待 2-3 分钟

## 第三步：验证

部署完成后：

1. 访问你的 Vercel 网站
2. 黄色警告应该消失
3. 按 F12 查看控制台，应该显示 "AI 模式：已启用"
4. 分析一家公司，应该需要 2-5 秒（真实 AI 调用）

## 第四步：检查 GitHub

访问：https://github.com/Brinda1701/FOMO_Guard

**检查最新提交：**

- 应该是最近的（几分钟内）
- 提交信息包含 "更新 AI 配置"

如果不是，在本地运行：

```bash
cd D:\zjy\Hackson\2.18
git push origin main
```

## 常见问题

### Q1: 环境变量配置了，但仍然显示警告

**可能原因：** 部署的不是最新代码

**解决：**
1. 在 Vercel 手动触发重新部署
2. 或推送一个新的 Git 提交

### Q2: GitHub 很久没更新

**可能原因：** 代码没有推送到 GitHub

**解决：**
```bash
cd D:\zjy\Hackson\2.18
git status
git add -A
git commit -m "更新配置"
git push origin main
```

### Q3: 本地测试成功，但 Vercel 不行

**可能原因：** Vercel 环境变量未配置

**解决：** 按照第二步配置 Vercel 环境变量

## 快速诊断命令

在本地运行：

```bash
cd D:\zjy\Hackson\2.18\server
node test-api.js
```

如果显示 "✅ 模型可用"，说明本地配置正确。

问题就在 Vercel 环境变量上。

## 需要帮助？

请提供以下截图：

1. Vercel 环境变量页面
2. 浏览器控制台（F12）
3. `/api/health` 的返回结果
4. GitHub 提交历史
