# FOMOGuard Vercel 部署完整检查清单

## ✅ 本地测试已通过

```
✅ Access Token: ms-78f016ca-a44f-4065-bbce-b3b6e2729b09
✅ 模型：Qwen/Qwen3.5-35B-A3B
✅ AI 响应正常
✅ GitHub 已推送
```

## ⚠️ Vercel 部署检查（必须完成）

### 1. 检查 Vercel 环境变量

访问：https://vercel.com/dashboard

找到你的项目 → Settings → Environment Variables

**必须添加以下 3 个变量：**

| Name | Value | Environments |
|------|-------|--------------|
| `MODELSCOPE_API_KEY` | `ms-78f016ca-a44f-4065-bbce-b3b6e2729b09` | ✅ Production ✅ Preview ✅ Development |
| `MODELSCOPE_API_URL` | `https://api-inference.modelscope.cn/v1/` | ✅ Production ✅ Preview ✅ Development |
| `MODEL_NAME` | `Qwen/Qwen3.5-35B-A3B` | ✅ Production ✅ Preview ✅ Development |

**重要：** 每个变量必须勾选所有三个环境！

### 2. 重新部署

添加完环境变量后：

1. 回到项目首页
2. 点击 **Redeploy**（或推送新的 Git 提交）
3. 等待部署完成（约 2-3 分钟）

### 3. 验证部署

部署完成后，访问你的 Vercel 网站：

**检查项：**
- [ ] 黄色警告是否消失？
- [ ] 按 F12 打开控制台，是否显示 "AI 模式：已启用"？
- [ ] 分析一家公司，是否显示真实的 AI 分析结果（需要 2-5 秒）？

## 🔧 故障排除

### 问题 1：仍然显示"未配置 AI 模型 Key"警告

**可能原因：** Vercel 环境变量未正确配置

**解决步骤：**

1. 访问 Vercel 控制台
2. 确认 3 个环境变量都已添加
3. 确认每个变量都勾选了 Production、Preview、Development
4. 点击 **Redeploy** 重新部署

### 问题 2：部署后分析仍然是瞬间完成（模拟数据）

**可能原因：** API 调用失败，自动降级为模拟模式

**检查步骤：**

1. 按 F12 打开浏览器控制台
2. 查看是否有错误信息
3. 访问 `https://你的域名.vercel.app/api/health`
4. 应该返回：
   ```json
   {
     "status": "ok",
     "version": "1.0.0",
     "features": {
       "ai_analysis": true,
       "market_data": true,
       "backtest": true
     },
     "modelscope_available": true
   }
   ```

如果 `modelscope_available` 是 `false`，说明环境变量未生效。

### 问题 3：GitHub 显示很久没更新

**解决：** 确保代码已推送到正确的仓库

1. 访问：https://github.com/Brinda1701/FOMO_Guard
2. 查看最新提交是否是最近的
3. 如果不是，在本地运行：
   ```bash
   cd D:\zjy\Hackson\2.18
   git push origin main
   ```

### 问题 4：Vercel 部署的不是最新代码

**解决：** 手动触发重新部署

1. 访问 Vercel 项目页面
2. 点击 **Deployments** 标签
3. 找到最新的部署
4. 点击右侧的 **⋮** → **Redeploy**

## 📝 完整部署流程

### 首次部署

```bash
# 1. 本地测试
cd server
node test-api.js

# 2. 提交代码
cd ..
git add -A
git commit -m "更新配置"
git push origin main

# 3. Vercel 会自动部署
# 等待 2-3 分钟

# 4. 访问 Vercel 网站验证
```

### 更新部署

```bash
# 1. 修改代码或配置

# 2. 提交并推送
git add -A
git commit -m "修复问题"
git push origin main

# 3. Vercel 会自动重新部署
```

## 🎯 成功标志

部署成功后，你应该看到：

1. ✅ 黄色警告消失
2. ✅ 控制台显示 "AI 模式：已启用"
3. ✅ 分析时间 2-5 秒（真实 AI）
4. ✅ `/api/health` 返回 `modelscope_available: true`
5. ✅ GitHub 显示最新提交
6. ✅ Vercel 显示最新部署

## 📞 需要帮助？

如果以上步骤都完成了，仍然有问题：

1. 截图 Vercel 环境变量页面
2. 截图浏览器控制台错误
3. 截图 `/api/health` 的返回结果
4. 联系技术支持
