export interface ModuleDefinition {
  id: string;
  title: string;
  summary: string;
  rendererKey: string;
}

export const moduleDefinitions: Record<string, ModuleDefinition> = {
  A1: { id: "A1", title: "发音清晰度", summary: "看图说出名称", rendererKey: "pronunciation" },
  A2: { id: "A2", title: "基础气息", summary: "持续发声让小火车前进", rendererKey: "breathing" },
  A3: { id: "A3", title: "三图顺序表达", summary: "排序后完整讲述", rendererKey: "picture-sequence" },
  A4: { id: "A4", title: "情境反应", summary: "理解场景并自然回答", rendererKey: "scenario-response" },
  A5: { id: "A5", title: "表情模仿表现", summary: "模仿开心、难过、害羞和生气", rendererKey: "animal-imitation" },
  B1: { id: "B1", title: "语音准确度", summary: "词语、短语与短句", rendererKey: "planned" },
  B2: { id: "B2", title: "复杂单图看图说话", summary: "观察并组织信息", rendererKey: "planned" },
  B3: { id: "B3", title: "故事复述", summary: "听后重新讲述", rendererKey: "planned" },
  B4: { id: "B4", title: "情境应答", summary: "校园生活场景表达", rendererKey: "planned" },
  B5: { id: "B5", title: "主动表达", summary: "围绕主题连续表达", rendererKey: "planned" },
  B6: { id: "B6", title: "情绪语气模仿", summary: "感知并模仿语气", rendererKey: "planned" },
  B7: { id: "B7", title: "气息与声音控制", summary: "真实句子声音控制", rendererKey: "planned" },
  C1: { id: "C1", title: "篇章语音朗读", summary: "完整朗读短文", rendererKey: "planned" },
  C2: { id: "C2", title: "复杂看图表达", summary: "筛选并组织信息", rendererKey: "planned" },
  C3: { id: "C3", title: "信息复述", summary: "理解并重组信息", rendererKey: "planned" },
  C4: { id: "C4", title: "情境应答＋追问", summary: "持续回应变化情境", rendererKey: "planned" },
  C5: { id: "C5", title: "即兴评述", summary: "准备后完整表达", rendererKey: "planned" },
  C6: { id: "C6", title: "角色表达力", summary: "理解人物后表现", rendererKey: "planned" },
  C7: { id: "C7", title: "故事续说力", summary: "续写并完成故事", rendererKey: "planned" },
  C8: { id: "C8", title: "精准描述力", summary: "准确描述所见内容", rendererKey: "planned" },
};
