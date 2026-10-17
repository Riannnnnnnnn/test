import type { SiteContent } from "./types";

export const defaultSiteContent: SiteContent = {
  brand: { mark: "言", name: "儿童口才能力评测", logoImageUrl: "/assets/v2/starvoice-logo.png", logoImageAlt: "STARVOICE 品牌标志" },
  home: {
    eyebrow: "儿童表达成长，从认真倾听开始",
    title: "看见孩子",
    accentTitle: "表达的力量",
    description: "面向少儿口才机构的线下专业评测。老师操作、孩子参与，分阶段记录真实表达表现。",
    coverImageUrl: "/assets/v2/star-mascot-hero-board.png",
    coverImageAlt: "双手拿着星级评测板的 STARVOICE 星光 IP 角色",
  },
  stages: {
    A: { name: "小阶段", tagline: "正音 · 气息 · 表现力", iconImageUrl: "", iconImageAlt: "小阶段" },
    B: { name: "大阶段", tagline: "句子正音 · 气息控制 · 情境表现", iconImageUrl: "", iconImageAlt: "大阶段" },
    C: { name: "综合表达", tagline: "信息组织 · 临场回应 · 内容生成 · 精准表达", iconImageUrl: "", iconImageAlt: "C 段综合表达" },
  },
  modules: {
    A1: { menuTitle: "发音清晰度", summary: "看图说出名称", eyebrow: "A1 · 发音清晰度", title: "看图说词", prompt: "请看图片，直接说出它的名称。", teacherNote: "", imageUrl: "/assets/v2/questions/a1-apple-v3.png", imageAlt: "卡通苹果", visualText: "苹果", secondaryText: "" },
    A2: { menuTitle: "基础气息", summary: "持续发声让小火车前进", eyebrow: "A2 · 基础气息", title: "小火车出发", prompt: "深吸一口气，持续发出“呜——”，让小火车尽可能平稳地前进。", teacherNote: "保持自然发声，观察持续时间和中断次数。", imageUrl: "/assets/v2/questions/a2-train-v3.png", imageAlt: "右向侧视卡通小火车", visualText: "呜——", secondaryText: "终点" },
    A3: { menuTitle: "三图顺序表达", summary: "排序后完整讲述", eyebrow: "A3 · 三图顺序表达", title: "种下一颗种子", prompt: "拖动或点击按钮把三张图片排好顺序，再用“先、然后、最后”把故事讲出来。", teacherNote: "", imageUrl: "", imageAlt: "三图排序", visualText: "", secondaryText: "", sequenceItems: [
      { key: "seed", connector: "先", title: "种下种子", symbol: "种", imageUrl: "/assets/v2/questions/a3-seed-v3.png" },
      { key: "water", connector: "然后", title: "给种子浇水", symbol: "水", imageUrl: "/assets/v2/questions/a3-water-v3.png" },
      { key: "flower", connector: "最后", title: "开出小花", symbol: "花", imageUrl: "/assets/v2/questions/a3-flower-v3.png" },
    ] },
    A4: { menuTitle: "情境反应", summary: "理解场景并自然回答", eyebrow: "A4 · 情境反应", title: "认识新朋友", prompt: "今天班里来了一位新朋友，你想认识他，你会怎么说？", teacherNote: "", imageUrl: "/assets/v2/questions/a4-new-friend-v3.png", imageAlt: "挥手问好的中国小朋友", visualText: "新", secondaryText: "“你好，我叫……”" },
    A5: { menuTitle: "小动物模仿表现", summary: "用声音、动作和表情表现", eyebrow: "A5 · 小动物模仿表现", title: "神气的小老虎", prompt: "请用声音、动作和表情，模仿一只神气的小老虎。", teacherNote: "", imageUrl: "/assets/v2/questions/a5-tiger-v3.png", imageAlt: "披着斗篷的神气卡通小老虎", visualText: "小老虎", secondaryText: "" },
  },
};
