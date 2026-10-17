export interface CourseTask {
  id: string;
  projectId: "A1" | "A2" | "A5";
  title: string;
  text: string;
  image?: string;
  sound?: string;
  prompt?: string;
  hint?: string;
}

export const smallPronunciationTasks: CourseTask[] = [
  ["b", "包子", "/assets/v3/words/b.webp"], ["p", "苹果", "/assets/v2/questions/a1-apple-v3.webp"],
  ["m", "帽子", "/assets/v3/words/m.webp"], ["f", "飞机", "/assets/v3/words/f.webp"],
  ["d", "灯笼", "/assets/v3/words/d.webp"], ["t", "兔子", "/assets/v3/words/t.webp"],
  ["n", "奶牛", "/assets/v3/words/n.webp"], ["l", "老虎", "/assets/v2/questions/a5-tiger-v3.webp"],
  ["g", "公鸡", "/assets/v3/words/g.webp"], ["k", "恐龙", "/assets/v3/words/k.webp"],
  ["h", "花朵", "/assets/v3/words/h.webp"], ["j", "鸡蛋", "/assets/v3/words/j.webp"],
  ["q", "气球", "/assets/v3/words/q.webp"], ["x", "西瓜", "/assets/v3/words/x.webp"],
  ["zh", "蜘蛛", "/assets/v3/words/zh.webp"], ["ch", "车子", "/assets/v3/words/ch.webp"],
  ["sh", "狮子", "/assets/v3/words/sh.webp"], ["r", "热气球", "/assets/v3/words/r.webp"],
  ["z", "足球", "/assets/v3/words/z.webp"], ["c", "草莓", "/assets/v3/words/c.webp"],
  ["s", "扫帚", "/assets/v3/words/s.webp"], ["y", "月亮", "/assets/v3/words/y.webp"],
  ["w", "乌龟", "/assets/v3/words/w.webp"],
].map(([id, text, image]) => ({ id: `A1-${id}`, projectId: "A1", title: `声母 ${id}`, text: text!, image: image! }));

export const largePronunciationTasks: CourseTask[] = [
  { id: "B1-flat-curled", projectId: "A1", title: "平翘舌练习", text: "小松鼠坐在树下，伸手摘山楂。", prompt: "请完整读一遍这句话。", hint: "留意“松、坐”和“树、伸、摘”的发音。" },
  { id: "B1-dtnl", projectId: "A1", title: "d · t · n · l 练习", text: "弟弟提着灯笼，奶奶牵着小鹿。", prompt: "请完整读一遍这句话。", hint: "留意“弟、提、奶、鹿”的发音。" },
];

export const smallExpressionTasks: CourseTask[] = [
  { id: "A5-tiger", projectId: "A5", title: "小老虎", text: "嗷呜", image: "/assets/v2/questions/a5-tiger-v3.webp", prompt: "像小老虎一样神气地吼一声，再向前迈一步。" },
  { id: "A5-dog", projectId: "A5", title: "小狗", text: "汪汪", image: "/assets/v3/animals/dog.webp", prompt: "像小狗一样开心地叫两声，摇摇尾巴。" },
  { id: "A5-duck", projectId: "A5", title: "小鸭", text: "嘎嘎", image: "/assets/v3/animals/duck.webp", prompt: "像小鸭一样清脆地叫两声，拍拍翅膀。" },
];

export const largeExpressionTask: CourseTask = {
  id: "B3-forest-announcer", projectId: "A5", title: "森林广播员", text: "森林里下雨啦！请先用着急的语气提醒小动物们躲雨，再用开心的语气告诉大家雨停了，可以出来玩。", prompt: "请把这段情境完整演出来。", hint: "说清楚发生了什么，表现两种不同语气，并配合表情和动作。",
};

export function getCourseTask(id: string): CourseTask | undefined {
  return [...smallPronunciationTasks, ...largePronunciationTasks, ...smallExpressionTasks, largeExpressionTask].find((task) => task.id === id);
}

export function getProjectId(id: string): "A1" | "A2" | "A5" {
  if (id === "A2" || id === "B2") return "A2";
  return id.startsWith("A5") || id.startsWith("B3") ? "A5" : "A1";
}

export function getCourseTasks(stage: string, moduleId: string): CourseTask[] {
  if (moduleId === "A1") return stage === "A" ? smallPronunciationTasks : largePronunciationTasks;
  if (moduleId === "A5") return stage === "A" ? smallExpressionTasks : [largeExpressionTask];
  return [];
}
