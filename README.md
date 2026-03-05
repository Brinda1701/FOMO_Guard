# 🧠 FOMOGuard 追涨护盾

> **守护你的理性，抵御 FOMO 与恐慌的侵蚀**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![ModelScope](https://img.shields.io/badge/AI-ModelScope-orange)](https://modelscope.cn)

---

## 📖 项目简介

**FOMOGuard（追涨护盾）** 是一款融合 **行为金融学理论** 与 **AI 多智能体技术** 的投资心理辅助工具，帮助投资者在市场情绪波动中保持理性，避免追涨杀跌的情绪化交易。

### 🎯 核心价值
- **不是** "帮你赚钱" → **而是** "帮你少亏钱"
- **不是** "预测市场" → **而是** "对抗人性弱点"
- **不是** "又一个股票软件" → **而是** "投资心理教练"

### 🔗 快速访问
- **🌐 在线体验**：[https://218-rust.vercel.app](https://218-rust.vercel.app)
- **📄 技术文档**：[TECHNICAL_ARTICLE.md](TECHNICAL_ARTICLE.md)

---

## ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 🧠 **冷静期机制** | 高风险决策时强制 100 秒冷静期 + 呼吸引导 + 心理学问答 |
| 🤖 **Multi-Agent 分析** | 情绪/技术/心理三个 Agent 协作分析，支持 SSE 流式输出 |
| 📰 **URL 情绪分析** | 爬取雪球/东方财富等财经新闻，AI 分析情绪倾向 |
| 📊 **批量分析** | 一次分析 10 个公司，支持 CSV 导出 |
| 📔 **交易日记** | 记录决策心理，定期复盘情绪模式 |
| 🎨 **情绪可视化** | 粒子背景、环形倒计时、雷达图等多种视觉呈现 |

---

## 🚀 快速开始

### 在线体验（推荐）
直接访问：[https://218-rust.vercel.app](https://218-rust.vercel.app)

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/Brinda1701/FOMO_Guard.git
cd FOMO_Guard

# 2. 安装后端依赖
cd server
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 MODELSCOPE_API_KEY

# 4. 启动后端
npm start

# 5. 打开前端
# 直接使用浏览器打开 index.html 或使用 Live Server
```

### 环境变量配置

```env
# .env.local
MODELSCOPE_API_KEY=your_api_key_here
MODELSCOPE_API_URL=https://api-inference.modelscope.cn/v1/
MODEL_NAME=deepseek-ai/DeepSeek-R1
```

> 💡 **提示**：没有 API Key 也可以运行，系统会自动切换到 Mock 模式。

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│         前端 (Vanilla JS + CSS3)         │
│  • 零框架依赖    • 响应式设计            │
│  • 情绪粒子      • Chart.js 可视化       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       Vercel Serverless (Node.js)        │
│  /api/health    /api/analyze             │
│  /api/orchestrator  /api/scrape-url     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         AI Model (ModelScope)            │
│  DeepSeek-R1 / 其他兼容模型              │
└─────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vanilla JS (ES Modules) + CSS3 |
| 可视化 | Chart.js |
| 后端 | Vercel Serverless (Node.js) |
| AI | ModelScope 魔搭 |
| 存储 | localStorage |

---

## 📸 功能截图

### 冷静期机制
```
┌─────────────────────────────────┐
│         🧊 认知隔离舱已启动      │
│                                 │
│         ⭕ 环形倒计时            │
│         深呼吸放松阶段           │
│                                 │
│    🫁 吸气... 呼气...           │
│                                 │
│  🧠 回答问题提前解锁            │
└─────────────────────────────────┘
```

### Multi-Agent 分析
```
┌─────────────────────────────────┐
│ 🎯 Multi-Agent 智能分析对比      │
│                                 │
│  情绪 Agent: 76 分  😊          │
│  技术 Agent: 68 分  📊          │
│  心理 Agent: 72 分  🧠          │
│                                 │
│  ✓ 3 个 Agent 达成共识           │
└─────────────────────────────────┘
```

---

## 📚 行为金融学理论基础

FOMOGuard 的设计灵感来源于经典行为金融学理论：

| 理论 | 提出者 | 应用 |
|------|--------|------|
| 损失厌恶 | Kahneman & Tversky (1979) | 解释为何散户"割肉"痛苦 |
| 锚定效应 | Tversky & Kahneman (1974) | 解释为何散户"抄底"执念 |
| 羊群效应 | Shiller (1984) | 解释为何散户"追涨杀跌" |
| 处置效应 | Shefrin & Statman (1985) | 解释为何"过早止盈，过久持亏" |

---

## 📊 项目成果

### 功能完成度
- ✅ 公司情绪分析
- ✅ 新闻 URL 分析
- ✅ 文本情绪分析
- ✅ 批量分析 + CSV 导出
- ✅ Multi-Agent 协作
- ✅ 冷静期机制
- ✅ 交易日记
- ✅ 心理测试问答
- ✅ 深色/浅色主题切换

### 技术指标
- **代码行数**：~3000 行
- **API 接口**：5 个
- **支持网站**：5+ 主流财经媒体
- **响应时间**：<2 秒（Mock）/ <8 秒（AI）

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

```bash
# Fork 项目
git fork https://github.com/Brinda1701/FOMO_Guard

# 创建分支
git checkout -b feature/your-feature

# 提交更改
git commit -m "feat: add your feature"

# 推送分支
git push origin feature/your-feature

# 创建 Pull Request
```

---

## 📄 许可证

MIT License © 2026 FOMOGuard Team

---

## 🙏 致谢

感谢本次黑客松主办方提供的平台与支持！

**团队成员**：Brinda 等  
**开发时间**：2026 年 2 月

---

> ⚠️ **免责声明**：本工具仅供参考，不构成投资建议。投资有风险，决策需谨慎。

---

<div align="center">

**🌟 如果这个项目对你有帮助，请给一个 Star！**

[⭐ Star this repo](https://github.com/Brinda1701/FOMO_Guard) | [🌐 在线体验](https://218-rust.vercel.app) | [📄 技术文档](TECHNICAL_ARTICLE.md)

</div>
