# STARVOICE 少儿口才一次性能力评测系统

面向教室电脑、课堂大屏和平板的横屏优先 React 应用。12 项能力可自由进入、独立完成、重复测试；结果统一保存到 `localStorage`。

## 运行

```bash
npm install
npm run dev
```

生产构建：`npm run build`。

## 调试

开发环境按 `Ctrl + Shift + D` 打开隐藏面板，可重置数据、模拟 3/5 星和无麦克风测试。

## 数据与接口

- 能力配置：`src/data/abilityConfig.ts`
- 统一状态/完成入口：`src/store/useAssessmentStore.ts`
- 语音、语言、视频与音频分析接口：`src/services/`
- 存储键：`starvoice-assessment-v1`
