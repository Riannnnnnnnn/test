/**
 * 正音“跳过”时教师勾选的发音问题库。
 * 小阶段每词三个教师可观察的问题，加一项“有待提升”；四项独立多选。
 * 大阶段保留整句问题和“本项准确”的教师确认。
 */
export interface PronunciationIssueOption {
  id: string;
  /** 小阶段为问题名称；大阶段为整句表现描述。 */
  reading: string;
  /** 声音替代关系，如“b→p”；句子题为主题名称。 */
  pattern: string;
  /** 弹窗中向老师展示的“评测提示”；句子题为空。 */
  hint: string;
  /** 句子题的“可用评价”（整句替代词句话术）。 */
  sentence?: string;
}

export interface PronunciationIssueSet {
  word: string;
  options: PronunciationIssueOption[];
  /** 大阶段“本项准确”的表述。 */
  accurate: string;
}

export const ISSUE_ACCURATE_ID = "accurate";
export const ISSUE_ADVICE = "建议针对这一组音进行听辨、示范模仿及词句巩固练习。";

export const pronunciationIssues: Record<string, PronunciationIssueSet> = {
  "A1-b": { word: "包子", options: [{ id: "b-1", reading: "双唇无力", pattern: "", hint: "" }, { id: "b-2", reading: "口型偏散", pattern: "", hint: "" }, { id: "b-3", reading: "双唇闭合不充分", pattern: "", hint: "" }, { id: "b-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-p": { word: "苹果", options: [{ id: "p-1", reading: "双唇闭合无力", pattern: "", hint: "" }, { id: "p-2", reading: "送气不足", pattern: "", hint: "" }, { id: "p-3", reading: "气息过猛", pattern: "", hint: "" }, { id: "p-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-m": { word: "帽子", options: [{ id: "m-1", reading: "双唇闭合不充分", pattern: "", hint: "" }, { id: "m-2", reading: "鼻音不明显", pattern: "", hint: "" }, { id: "m-3", reading: "发音含糊", pattern: "", hint: "" }, { id: "m-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-f": { word: "飞机", options: [{ id: "f-1", reading: "唇齿位置不准确", pattern: "", hint: "" }, { id: "f-2", reading: "唇齿闭合过紧", pattern: "", hint: "" }, { id: "f-3", reading: "摩擦气流不足", pattern: "", hint: "" }, { id: "f-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-d": { word: "灯笼", options: [{ id: "d-1", reading: "舌尖抬起不足", pattern: "", hint: "" }, { id: "d-2", reading: "舌尖接触位置不准", pattern: "", hint: "" }, { id: "d-3", reading: "发音无力", pattern: "", hint: "" }, { id: "d-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-t": { word: "兔子", options: [{ id: "t-1", reading: "舌尖抬起不足", pattern: "", hint: "" }, { id: "t-2", reading: "送气不足", pattern: "", hint: "" }, { id: "t-3", reading: "气息过猛", pattern: "", hint: "" }, { id: "t-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-n": { word: "奶牛", options: [{ id: "n-1", reading: "舌尖接触不稳", pattern: "", hint: "" }, { id: "n-2", reading: "鼻音不明显", pattern: "", hint: "" }, { id: "n-3", reading: "发音含糊", pattern: "", hint: "" }, { id: "n-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-l": { word: "老虎", options: [{ id: "l-1", reading: "舌尖不主动抬起", pattern: "", hint: "" }, { id: "l-2", reading: "舌位过于靠后", pattern: "", hint: "" }, { id: "l-3", reading: "发音含糊", pattern: "", hint: "" }, { id: "l-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-g": { word: "公鸡", options: [{ id: "g-1", reading: "舌根抬起不足", pattern: "", hint: "" }, { id: "g-2", reading: "口腔后部闭合不充分", pattern: "", hint: "" }, { id: "g-3", reading: "发音不清晰", pattern: "", hint: "" }, { id: "g-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-k": { word: "恐龙", options: [{ id: "k-1", reading: "舌根用力不足", pattern: "", hint: "" }, { id: "k-2", reading: "送气不足", pattern: "", hint: "" }, { id: "k-3", reading: "气息过散", pattern: "", hint: "" }, { id: "k-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-h": { word: "花朵", options: [{ id: "h-1", reading: "舌根位置不准确", pattern: "", hint: "" }, { id: "h-2", reading: "口腔后部打开不足", pattern: "", hint: "" }, { id: "h-3", reading: "摩擦气流不足", pattern: "", hint: "" }, { id: "h-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-j": { word: "鸡蛋", options: [{ id: "j-1", reading: "舌面抬起不足", pattern: "", hint: "" }, { id: "j-2", reading: "发音位置偏移", pattern: "", hint: "" }, { id: "j-3", reading: "发音含糊", pattern: "", hint: "" }, { id: "j-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-q": { word: "气球", options: [{ id: "q-1", reading: "舌面抬起不足", pattern: "", hint: "" }, { id: "q-2", reading: "送气不足", pattern: "", hint: "" }, { id: "q-3", reading: "气息过散", pattern: "", hint: "" }, { id: "q-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-x": { word: "西瓜", options: [{ id: "x-1", reading: "舌面抬起不足", pattern: "", hint: "" }, { id: "x-2", reading: "摩擦气流较弱", pattern: "", hint: "" }, { id: "x-3", reading: "发音不清晰", pattern: "", hint: "" }, { id: "x-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-zh": { word: "蜘蛛", options: [{ id: "zh-1", reading: "翘舌不足", pattern: "", hint: "" }, { id: "zh-2", reading: "舌尖过度卷翘", pattern: "", hint: "" }, { id: "zh-3", reading: "舌尖发力不足", pattern: "", hint: "" }, { id: "zh-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-ch": { word: "车子", options: [{ id: "ch-1", reading: "翘舌不足", pattern: "", hint: "" }, { id: "ch-2", reading: "送气不足", pattern: "", hint: "" }, { id: "ch-3", reading: "气息过猛", pattern: "", hint: "" }, { id: "ch-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-sh": { word: "狮子", options: [{ id: "sh-1", reading: "舌尖抬起不足", pattern: "", hint: "" }, { id: "sh-2", reading: "舌尖过度卷翘", pattern: "", hint: "" }, { id: "sh-3", reading: "摩擦气流不足", pattern: "", hint: "" }, { id: "sh-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-r": { word: "热气球", options: [{ id: "r-1", reading: "舌尖抬起不足", pattern: "", hint: "" }, { id: "r-2", reading: "舌位过于靠后", pattern: "", hint: "" }, { id: "r-3", reading: "发音含糊", pattern: "", hint: "" }, { id: "r-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-z": { word: "足球", options: [{ id: "z-1", reading: "舌尖接触位置不准", pattern: "", hint: "" }, { id: "z-2", reading: "发音阻碍不足", pattern: "", hint: "" }, { id: "z-3", reading: "摩擦不充分", pattern: "", hint: "" }, { id: "z-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-c": { word: "草莓", options: [{ id: "c-1", reading: "舌尖位置不准确", pattern: "", hint: "" }, { id: "c-2", reading: "送气不足", pattern: "", hint: "" }, { id: "c-3", reading: "气息不集中", pattern: "", hint: "" }, { id: "c-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-s": { word: "扫帚", options: [{ id: "s-1", reading: "舌尖位置偏后", pattern: "", hint: "" }, { id: "s-2", reading: "气流不集中", pattern: "", hint: "" }, { id: "s-3", reading: "摩擦音不清晰", pattern: "", hint: "" }, { id: "s-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-y": { word: "月亮", options: [{ id: "y-1", reading: "撮口不充分", pattern: "", hint: "" }, { id: "y-2", reading: "口型变化不到位", pattern: "", hint: "" }, { id: "y-3", reading: "起音不清晰", pattern: "", hint: "" }, { id: "y-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "A1-w": { word: "乌龟", options: [{ id: "w-1", reading: "双唇圆拢不足", pattern: "", hint: "" }, { id: "w-2", reading: "口型偏散", pattern: "", hint: "" }, { id: "w-3", reading: "起音含糊", pattern: "", hint: "" }, { id: "w-4", reading: "有待提升", pattern: "", hint: "" }], accurate: "" },
  "B1-flat-curled": {
    word: "小松鼠坐在树下，伸手摘山楂。",
    options: [
      { id: "B1-flat-curled-1", reading: "将“松/坐”读成翘舌音，或将“鼠/树/伸/手/摘/山/楂”读成平舌音；也可能单词准确，句中混淆。", pattern: "平翘舌", hint: "", sentence: "在综合句子朗读中，平翘舌发音部位区分不稳定，连续表达中的舌尖位置转换需要加强。" },
    ],
    accurate: "在本句目标音的朗读中表现基本准确，可继续观察自然表达稳定性。",
  },
  "B1-dtnl": {
    word: "弟弟提着灯笼，奶奶牵着小鹿。",
    options: [
      { id: "B1-dtnl-1", reading: "如“弟→替”（d→t）、“提→低”（t→d）、“奶→赖”（n→l）、“鹿→怒”（l→n）；应结合句中实际发音记录。", pattern: "d、t、n、l", hint: "", sentence: "在综合句子朗读中，舌尖中音的送气对立或n/l鼻音与边音区分不稳定，连续句中需要针对性训练。" },
    ],
    accurate: "在本句目标音的朗读中表现基本准确，可继续观察自然表达稳定性。",
  },
};

export function getPronunciationIssues(taskId?: string): PronunciationIssueSet | undefined {
  return taskId ? pronunciationIssues[taskId] : undefined;
}

/** 报告中的单条结果表述，例如：孩子将“包子”读成“抛子”，表现为b→p。评测提示：…。建议…。 */
export function describeIssue(set: PronunciationIssueSet, option: PronunciationIssueOption): string {
  if (option.sentence) return `【${option.pattern}】${set.word}${option.sentence}`;
  if (option.id === "accurate") return set.accurate;
  if (option.pattern === "" && option.hint === "") {
    return option.reading === "有待提升"
      ? `“${set.word}”的读音还有提升空间。可以先慢慢读清楚，再逐步练习完整词语。`
      : `“${set.word}”需要留意：${option.reading}。可以听一听标准发音，再慢慢模仿练习。`;
  }
  return `孩子将“${set.word}”读成“${option.reading}”，表现为${option.pattern}。评测提示：${option.hint}。${ISSUE_ADVICE}`;
}
