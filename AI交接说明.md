# 口才评测｜AI 交接说明

更新日期：2026-10-17

## 本次整合（以此节为准）

- 新建评测沿用旧版首页、资料填写、评测页、麦克风评星栏、小火车、教师评分和报告，不再使用独立 V3 面板；`/v3` 重定向首页。
- 当前可选小阶段 A、大阶段 B，均只有正音 A1、气息 A2、表现力 A5。A3/A4 不进入新流程，C 仅保留历史兼容配置。
- 题目入口 `src/config/courseTasks.ts`：小阶段 23 声母词图（无拼音）、三个动物；大阶段两句正音、森林广播员。分阶段内容可在内容管理页编辑。
- 弹层直接复用用户提供 ZIP 的 `GuideDialog.tsx` 与 `guide.css`，保留左右图文动画布局，说明内容按阶段调整；使用原生模态框隔离背景操作。操作说明不再常驻题目区域。
- 每题独立保存教师/智能成绩；右侧仅智能成绩，报告取题内智能/教师均值后汇总三个项目。重测清空当前题，不清空其他题。
- 未完成的旧记录自动适配三项目，并将原始结果保留在 `legacyResults`；已完成历史报告不迁移。
- 气息使用本机音量检测，停声约 1.8 秒或累计发声 12 秒到终点自动结束；并非“呜”音素识别。正音依赖讯飞真实服务，无凭据不产生智能评分。
- 2026-10-17 ISE修正：新版标记 ise-evidence-v2。统一百分制，禁止按分值大小猜5分/10分制；只解析题目级节点。句篇自动依据 accuracy_score；字词依据 min(phone_score,tone_score)，不称为内容正确率。任何错漏/增读/回读/替换、声韵调错误、拒评/异常或听写不一致均进入教师复核，保存原始分项和标记但不计自动成绩。移除旧的音节猜分、94封顶、+4补偿。星级阈值仍为产品规则，未经过儿童样本校准。
- ISE参数：小学group=pupil；middle-school-plus使用youth；grade仅对小学句篇按1–2/3–4/5–6映射junior/middle/senior；学前和未知年级不虚构grade，沿用pupil近似群体，需实测。check_type=common；rst=entirety、ise_unite=1、extra_ability=multi_dimension;syll_phone_err_msg；16kHz单声道16bit PCM，分块重采样保留小数相位。鉴权未改。
- 报告独立展示新逐题证据与复核提示；摘要画像仍为训练参考，可能含教师评价，不能当成朗读正确率。二维码分享仍是原有能力摘要，不包含逐字证据；图片导出包含报告中的证据。历史结果不重算。
- 新增 npm run test:ise（需先启动Vite）；E2E_BASE_URL可指定测试地址。合成XML与浏览器测试不代表真实儿童录音准确率。
- 评测静态图片已统一转为 WebP（原 50 张 PNG 共 53.7 MB，WebP 共 6.1 MB），原图备份在 `E:\codex留存文件\评测图片原图-20261017`。源码默认路径和旧版本地内容迁移均改为 WebP；内容管理上传的新图片也转为 WebP。评测介绍页提前加载首题与后续题图，切题前等待图片解码，避免出现空白题图。
- 语音页面提前获取短时有效的讯飞鉴权地址，点击开始时并行申请麦克风和鉴权，减少启动等待；网络与麦克风权限错误分别提示。线上 Render 凭据是否有效需另行检查，不能用本地 `.env` 成功代替线上验证。
- `npm run test:e2e` 运行 `scripts/e2e-course.mjs`，使用隔离浏览器与合成音频验证 UI/气息流程，不代表真实儿童发音准确率验证。
- 留存备份、截图目录：`E:\codex留存文件\评测整合-20261017`；不打包 `.env`。

以下为旧版背景资料，A/B/C 原始范围不代表当前新建评测流程。

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
