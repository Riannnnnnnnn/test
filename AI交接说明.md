# 口才评测｜AI 交接说明

更新日期：2026-10-13

## 项目用途

这是面向儿童的口才评测前端项目，技术栈为 React 19、TypeScript、Vite、React Router、Zustand、IndexedDB 与 Recharts。项目支持学生信息、阶段介绍、逐题评测、录音/智能语音评星、教师评分、报告与内容管理。

## 当前状态

- A 段“表达启蒙”已有 5 个模块：看图发音、气息训练、图片排序讲述、情景回应、动物模仿。
- B 段“语言组织”和 C 段“综合表达”已有阶段配置，但题库模块仍是结构占位。
- 页面路由：`/`、`/profile`、`/stage/:stage/intro`、`/assessment/:sessionId/:moduleId`、`/report/:sessionId`、`/admin/content`。
- 评测数据保存在浏览器 IndexedDB；换浏览器、换电脑或清理站点数据后，原有本地学生/评测记录不会自动出现。
- 讯飞语音评测需要本地 `.env` 中的 `XFYUN_APP_ID`、`XFYUN_API_KEY`、`XFYUN_API_SECRET`。这些敏感值没有写入项目；字段模板见 `.env.example`。

## 关键入口

- 应用入口：`src/main.tsx`
- 路由：`src/app/router/AppRouter.tsx`
- 阶段配置：`src/config/stages/index.ts`
- 模块配置：`src/config/modules/index.ts`
- A 段题库：`src/data/questionBank/stageA/`
- 评测页面：`src/pages/Assessment/AssessmentPage.tsx`
- 报告页面：`src/pages/Report/ReportPage.tsx`
- 内容管理：`src/pages/Admin/ContentAdminPage.tsx`
- 语音评测：`src/services/speech/xfyunIse.ts` 与 `src/assessment/common/SmartSpeechEvaluator/`
- 本地数据：`src/services/storage/database.ts`
- 主样式：`src/styles/features.css`、`global.css`、`tokens.css`
- 运行时图片：`public/assets/v2/`
- MasterGo 设计参考：`.mastergo/design/`

## 启动与检查

```powershell
npm ci
npm run dev
```

默认开发服务由 Vite 启动。需要启用讯飞语音评测时，先由项目维护者在本机创建 `.env`，不要向 AI 聊天粘贴真实密钥。

改动后的基础检查：

```powershell
npm run typecheck
npm run lint
npm run build
```

端到端流程测试要求本地开发服务已在 `http://127.0.0.1:5173` 运行。先在一个终端执行：

```powershell
npm run dev -- --host 127.0.0.1
```

再在另一个终端执行：

```powershell
npm run test:e2e
```

2026-10-13 交接检查结果：类型检查、代码规范检查、正式构建和端到端流程测试全部通过。

`dist/` 是构建结果，可重新生成；`node_modules/` 是依赖缓存，可通过 `npm ci` 重建。

## AI 接手时建议的第一条指令

> 请先阅读根目录 AGENTS.md 和 AI交接说明.md，再检查 package.json 与相关源码。先告诉我当前完成范围、这次任务会改哪些文件、如何验证；不要把密钥写进代码，也不要把 B/C 段占位误报为已完成。

## 账号/电脑迁移注意事项

- 同一台电脑换 Codex 账号：重新把 `E:\口才测评` 添加为项目即可，源码仍在本机。
- 换电脑：复制源码和素材，但可以不复制 `node_modules/`、`dist/`、`tmp/`；到新电脑后执行 `npm ci` 和 `npm run build`。
- `.env`、浏览器 IndexedDB 数据、旧账号聊天记录和账号级连接需要单独处理，不属于源码自动迁移范围。
