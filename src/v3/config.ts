export type V3Stage = "small" | "large";
export type V3Section = "pronunciation" | "breathing" | "expression";

export interface InitialQuestion {
  initial: string;
  word: string;
  picture: string;
}

// 常见普通话声母教学口径：21 个辅音声母，加 y、w，共 23 个。
export const initialQuestions: InitialQuestion[] = [
  { initial: "b", word: "爸爸", picture: "/assets/v3/words/b.webp" },
  { initial: "p", word: "婆婆", picture: "/assets/v3/words/p.webp" },
  { initial: "m", word: "猫咪", picture: "/assets/v3/words/m.webp" },
  { initial: "f", word: "飞机", picture: "/assets/v3/words/f.webp" },
  { initial: "d", word: "弟弟", picture: "/assets/v3/words/d.webp" },
  { initial: "t", word: "糖果", picture: "/assets/v3/words/t.webp" },
  { initial: "n", word: "奶牛", picture: "/assets/v3/words/n.webp" },
  { initial: "l", word: "老虎", picture: "/assets/v2/questions/a5-tiger-v3.webp" },
  { initial: "g", word: "哥哥", picture: "/assets/v3/words/g.webp" },
  { initial: "k", word: "蝌蚪", picture: "/assets/v3/words/k.webp" },
  { initial: "h", word: "花朵", picture: "/assets/v3/words/h.webp" },
  { initial: "j", word: "鸡蛋", picture: "/assets/v3/words/j.webp" },
  { initial: "q", word: "气球", picture: "/assets/v3/words/q.webp" },
  { initial: "x", word: "西瓜", picture: "/assets/v3/words/x.webp" },
  { initial: "zh", word: "蜘蛛", picture: "/assets/v3/words/zh.webp" },
  { initial: "ch", word: "吃饭", picture: "/assets/v3/words/ch.webp" },
  { initial: "sh", word: "老师", picture: "/assets/v3/words/sh.webp" },
  { initial: "r", word: "热气球", picture: "/assets/v3/words/r.webp" },
  { initial: "z", word: "足球", picture: "/assets/v3/words/z.webp" },
  { initial: "c", word: "草莓", picture: "/assets/v3/words/c.webp" },
  { initial: "s", word: "色彩", picture: "/assets/v3/words/s.webp" },
  { initial: "y", word: "月亮", picture: "/assets/v3/words/y.webp" },
  { initial: "w", word: "乌龟", picture: "/assets/v3/words/w.webp" },
];

export const sentenceQuestions = [
  { id: "flat-curled", title: "平翘舌", text: "小松鼠坐在树下，伸手摘山楂。", hint: "留意“松、坐”和“树、伸、摘”的发音。" },
  { id: "dtnl", title: "d · t · n · l", text: "弟弟提着灯笼，奶奶牵着小鹿。", hint: "留意“弟、提、奶、鹿”的发音。" },
] as const;

export const animalQuestions = [
  { id: "tiger", title: "小老虎", sound: "嗷呜", cue: "像小老虎一样神气地吼一声，再向前迈一步。", image: "/assets/v2/questions/a5-tiger-v3.webp" },
  { id: "dog", title: "小狗", sound: "汪汪", cue: "像小狗一样开心地叫两声，摇摇尾巴。", image: "/assets/v3/animals/dog.webp" },
  { id: "duck", title: "小鸭", sound: "嘎嘎", cue: "像小鸭一样清脆地叫两声，拍拍翅膀。", image: "/assets/v3/animals/duck.webp" },
] as const;

export const largeExpressionPrompt = {
  title: "森林广播员",
  prompt: "森林里下雨啦！请先用着急的语气提醒小动物们躲雨，再用开心的语气告诉大家雨停了，可以出来玩。",
  tips: ["说清楚发生了什么", "表现两种不同的语气", "配合表情和动作"],
};
