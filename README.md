# 实时监测 + AI 代理 后端（示例）

此后端示例提供：

- 一个简单的 Express HTTP API：`/api/health`, `/api/analyze`, `/api/updateProfile`。
- 一个 WebSocket 服务（路径 `/ws`）用于向前端推送实时评分更新和配置变更。
- 可选地将请求代理到 OpenAI 兼容的模型，需在环境变量中配置 `OPENAI_API_KEY` 与 `OPENAI_API_URL`。

快速开始：

1. 安装依赖：
```bash
npm install
```
2. 复制 `.env.example` 为 `.env` 并填写 API 相关配置（如果需要调用模型）：
```
OPENAI_API_KEY=你的_key
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
```
3. 启动服务：
```bash
npm start
```

前端修改：
编辑 `js/config.js` 中 `AI_CONFIG.URL`（默认 `http://localhost:5000`）指向后端地址，前端会自动连接 `/ws` 获取实时更新。
