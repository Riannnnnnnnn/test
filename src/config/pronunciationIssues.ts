/**
 * 正音“跳过”时教师勾选的发音问题库。
 * 内容来自《少儿口才 新版 评测结果话术》：每个评测词 2–3 种常见实际读法，
 * 以及大阶段两个句子的整体评价。词句均为指定话术，请勿随意改写。
 */
export interface PronunciationIssueOption {
  id: string;
  /** 孩子实际读成的样子，如“抛子”。 */
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
  /** “本项准确”的表述（老师认为孩子其实读对时勾选）。 */
  accurate: string;
}

export const ISSUE_ACCURATE_ID = "accurate";
export const ISSUE_ADVICE = "建议针对这一组音进行听辨、示范模仿及词句巩固练习。";

export const pronunciationIssues: Record<string, PronunciationIssueSet> = {
  "A1-b": {
    word: "包子",
    options: [
      { id: "b-1", reading: "抛子", pattern: "b→p", hint: "不送气与送气的控制不稳定" },
      { id: "b-2", reading: "毛子", pattern: "b→m", hint: "口腔塞音被鼻音替代" },
    ],
    accurate: "“包子”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-p": {
    word: "苹果",
    options: [
      { id: "p-1", reading: "饼果", pattern: "p→b", hint: "p音送气不足，容易与b混淆" },
      { id: "p-2", reading: "苹（开头音弱或省略）", pattern: "p弱化/省略", hint: "双唇闭塞或释放动作不稳定" },
    ],
    accurate: "“苹果”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-m": {
    word: "帽子",
    options: [
      { id: "m-1", reading: "抱子", pattern: "m→b", hint: "双唇鼻音被塞音替代" },
      { id: "m-2", reading: "闹子", pattern: "m→n", hint: "双唇鼻音被舌尖鼻音替代" },
    ],
    accurate: "“帽子”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-f": {
    word: "飞机",
    options: [
      { id: "f-1", reading: "灰机", pattern: "f→h", hint: "唇齿擦音被舌根擦音替代" },
      { id: "f-2", reading: "胚机", pattern: "f→p", hint: "持续摩擦音被双唇塞音替代" },
    ],
    accurate: "“飞机”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-d": {
    word: "灯笼",
    options: [
      { id: "d-1", reading: "腾笼", pattern: "d→t", hint: "不送气塞音被送气塞音替代" },
      { id: "d-2", reading: "更笼", pattern: "d→g", hint: "发音位置由舌尖后移至舌根" },
    ],
    accurate: "“灯笼”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-t": {
    word: "兔子",
    options: [
      { id: "t-1", reading: "肚子", pattern: "t→d", hint: "t音送气不足，与d混淆" },
      { id: "t-2", reading: "兔子（开头送气很弱）", pattern: "t送气不足", hint: "发音虽接近t，但爆发气流弱" },
    ],
    accurate: "“兔子”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-n": {
    word: "奶牛",
    options: [
      { id: "n-1", reading: "赖牛", pattern: "“奶”n→l", hint: "第一个音节的n被l替代" },
      { id: "n-2", reading: "奶流", pattern: "“牛”n→l", hint: "第二个音节niú的n被l替代；不能误判为“奶”的错误" },
      { id: "n-3", reading: "莱流", pattern: "两个n均→l", hint: "两个音节的鼻音均被边音替代" },
    ],
    accurate: "“奶牛”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-l": {
    word: "老虎",
    options: [
      { id: "l-1", reading: "脑虎", pattern: "l→n", hint: "边音被鼻音替代，l、n辨别或动作控制不稳定" },
      { id: "l-2", reading: "倒虎", pattern: "l→d", hint: "边音变成短促塞音" },
    ],
    accurate: "“老虎”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-g": {
    word: "公鸡",
    options: [
      { id: "g-1", reading: "东鸡", pattern: "g→d", hint: "舌根音被舌尖音替代" },
      { id: "g-2", reading: "空鸡", pattern: "g→k", hint: "不送气音出现明显送气" },
    ],
    accurate: "“公鸡”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-k": {
    word: "恐龙",
    options: [
      { id: "k-1", reading: "拱龙", pattern: "k→g", hint: "送气不足，k与g混淆" },
      { id: "k-2", reading: "恐龙（开头无明显气流）", pattern: "k送气弱", hint: "舌根塞音送气释放不足" },
    ],
    accurate: "“恐龙”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-h": {
    word: "花朵",
    options: [
      { id: "h-1", reading: "发朵", pattern: "h→f", hint: "舌根擦音被唇齿擦音替代" },
      { id: "h-2", reading: "夸朵", pattern: "h→k", hint: "摩擦音被舌根送气塞音替代" },
    ],
    accurate: "“花朵”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-j": {
    word: "鸡蛋",
    options: [
      { id: "j-1", reading: "七蛋", pattern: "j→q", hint: "不送气塞擦音出现明显送气" },
      { id: "j-2", reading: "资蛋（近似）", pattern: "j→z", hint: "舌面音被舌尖前音替代" },
    ],
    accurate: "“鸡蛋”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-q": {
    word: "气球",
    options: [
      { id: "q-1", reading: "记球", pattern: "q→j", hint: "送气不足，q与j混淆" },
      { id: "q-2", reading: "细球", pattern: "q→x", hint: "塞擦音简化为持续擦音" },
    ],
    accurate: "“气球”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-x": {
    word: "西瓜",
    options: [
      { id: "x-1", reading: "丝瓜", pattern: "x→s", hint: "舌面擦音被舌尖前擦音替代" },
      { id: "x-2", reading: "七瓜", pattern: "x→q", hint: "擦音被送气塞擦音替代" },
    ],
    accurate: "“西瓜”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-zh": {
    word: "蜘蛛",
    options: [
      { id: "zh-1", reading: "资蛛（近似）", pattern: "首音zh→z", hint: "翘舌塞擦音被平舌音替代" },
      { id: "zh-2", reading: "吃蛛", pattern: "首音zh→ch", hint: "翘舌音送气过强" },
      { id: "zh-3", reading: "知资（近似）", pattern: "第二音节zh→z", hint: "第二个“蛛”的zh被平舌音替代" },
    ],
    accurate: "“蜘蛛”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-ch": {
    word: "车子",
    options: [
      { id: "ch-1", reading: "册子（近似）", pattern: "ch→c", hint: "翘舌音被平舌音替代" },
      { id: "ch-2", reading: "遮子", pattern: "ch→zh", hint: "送气不足，ch与zh混淆" },
    ],
    accurate: "“车子”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-sh": {
    word: "狮子",
    options: [
      { id: "sh-1", reading: "丝子", pattern: "sh→s", hint: "翘舌擦音被平舌擦音替代" },
      { id: "sh-2", reading: "吃子", pattern: "sh→ch", hint: "擦音被塞擦音替代" },
    ],
    accurate: "“狮子”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-r": {
    word: "热气球",
    options: [
      { id: "r-1", reading: "乐气球", pattern: "r→l", hint: "r音被边音替代" },
      { id: "r-2", reading: "社气球", pattern: "r→sh（近似）", hint: "浊音特征或发音方式不稳定" },
    ],
    accurate: "“热气球”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-z": {
    word: "足球",
    options: [
      { id: "z-1", reading: "竹球（近似）", pattern: "z→zh", hint: "平舌塞擦音翘舌化" },
      { id: "z-2", reading: "粗球", pattern: "z→c", hint: "不送气塞擦音送气过强" },
    ],
    accurate: "“足球”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-c": {
    word: "草莓",
    options: [
      { id: "c-1", reading: "炒莓", pattern: "c→ch", hint: "平舌音翘舌化" },
      { id: "c-2", reading: "枣莓", pattern: "c→z", hint: "送气不足，c与z混淆" },
    ],
    accurate: "“草莓”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-s": {
    word: "扫帚",
    options: [
      { id: "s-1", reading: "少帚", pattern: "s→sh", hint: "平舌擦音被翘舌擦音替代" },
      { id: "s-2", reading: "草帚", pattern: "s→c", hint: "持续擦音被塞擦音替代" },
    ],
    accurate: "“扫帚”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-y": {
    word: "月亮",
    options: [
      { id: "y-1", reading: "夜亮", pattern: "“月”误读近似yè", hint: "主要可能涉及韵母üe/ie的区分，不宜判为辅音声母错误" },
      { id: "y-2", reading: "月亮（首音节开头不稳定）", pattern: "y类拼写音节起始不稳", hint: "需进一步区分韵母动作与音节转换问题" },
    ],
    accurate: "“月亮”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
  "A1-w": {
    word: "乌龟",
    options: [
      { id: "w-1", reading: "乌龟（乌的圆唇不明显）", pattern: "“乌”圆唇不足", hint: "可能涉及u韵母圆唇动作不足，不宜判为辅音声母错误" },
      { id: "w-2", reading: "欧龟", pattern: "“乌”→“欧”", hint: "首音节u与ou韵母混淆或读音替代" },
    ],
    accurate: "“乌龟”目标音发音基本准确，可继续观察在短句和自然表达中的稳定性。",
  },
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
  return `孩子将“${set.word}”读成“${option.reading}”，表现为${option.pattern}。评测提示：${option.hint}。${ISSUE_ADVICE}`;
}
