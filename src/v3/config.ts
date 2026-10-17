export type V3Stage = "small" | "large";
export type V3Section = "pronunciation" | "breathing" | "expression";

export interface InitialQuestion {
  initial: string;
  word: string;
  picture: string;
}

// 常见普通话声母教学口径：21 个辅音声母，加 y、w，共 23 个。
export const initialQuestions: InitialQuestion[] = [
  { initial: "b", word: "包子", picture: "/assets/v3/words/b.png" },
  { initial: "p", word: "苹果", picture: "/assets/v2/questions/a1-apple-v3.png" },
  { initial: "m", word: "帽子", picture: "/assets/v3/words/m.png" },
  { initial: "f", word: "飞机", picture: "/assets/v3/words/f.png" },
  { initial: "d", word: "灯笼", picture: "/assets/v3/words/d.png" },
  { initial: "t", word: "兔子", picture: "/assets/v3/words/t.png" },
  { initial: "n", word: "奶牛", picture: "/assets/v3/words/n.png" },
  { initial: "l", word: "老虎", picture: "/assets/v2/questions/a5-tiger-v3.png" },
  { initial: "g", word: "公鸡", picture: "/assets/v3/words/g.png" },
  { initial: "k", word: "恐龙", picture: "/assets/v3/words/k.png" },
  { initial: "h", word: "花朵", picture: "/assets/v3/words/h.png" },
  { initial: "j", word: "鸡蛋", picture: "/assets/v3/words/j.png" },
  { initial: "q", word: "气球", picture: "/assets/v3/words/q.png" },
  { initial: "x", word: "西瓜", picture: "/assets/v3/words/x.png" },
  { initial: "zh", word: "蜘蛛", picture: "/assets/v3/words/zh.png" },
  { initial: "ch", word: "车子", picture: "/assets/v3/words/ch.png" },
  { initial: "sh", word: "狮子", picture: "/assets/v3/words/sh.png" },
  { initial: "r", word: "热气球", picture: "/assets/v3/words/r.png" },
  { initial: "z", word: "足球", picture: "/assets/v3/words/z.png" },
  { initial: "c", word: "草莓", picture: "/assets/v3/words/c.png" },
  { initial: "s", word: "扫帚", picture: "/assets/v3/words/s.png" },
  { initial: "y", word: "月亮", picture: "/assets/v3/words/y.png" },
  { initial: "w", word: "乌龟", picture: "/assets/v3/words/w.png" },
];

export const sentenceQuestions = [
  { id: "flat-curled", title: "平翘舌", text: "小松鼠坐在树下，伸手摘山楂。", hint: "留意“松、坐”和“树、伸、摘”的发音。" },
  { id: "dtnl", title: "d · t · n · l", text: "弟弟提着灯笼，奶奶牵着小鹿。", hint: "留意“弟、提、奶、鹿”的发音。" },
] as const;

export const animalQuestions = [
  { id: "tiger", title: "小老虎", sound: "嗷呜", cue: "像小老虎一样神气地吼一声，再向前迈一步。", image: "/assets/v2/questions/a5-tiger-v3.png" },
  { id: "dog", title: "小狗", sound: "汪汪", cue: "像小狗一样开心地叫两声，摇摇尾巴。", image: "/assets/v3/animals/dog.png" },
  { id: "duck", title: "小鸭", sound: "嘎嘎", cue: "像小鸭一样清脆地叫两声，拍拍翅膀。", image: "/assets/v3/animals/duck.png" },
] as const;

export const largeExpressionPrompt = {
  title: "森林广播员",
  prompt: "森林里下雨啦！请先用着急的语气提醒小动物们躲雨，再用开心的语气告诉大家雨停了，可以出来玩。",
  tips: ["说清楚发生了什么", "表现两种不同的语气", "配合表情和动作"],
};
