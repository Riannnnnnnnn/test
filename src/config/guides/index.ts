export type GuideVisual = "mascot" | "listen" | "happy" | "tiger" | "mic" | "stars" | "image" | "sequence";

export interface GuideStep {
  title: string;
  body: string;
  visual: GuideVisual;
  /** 仅 listen 类型使用：孩子要说的话，显示在气泡里 */
  bubble?: string;
}

export interface ModuleGuide {
  steps: GuideStep[];
}

const prepare: GuideStep = { title: "老师先准备", body: "请孩子坐好，面对话筒。确认麦克风正常、教室安静。", visual: "mascot" };
const rate: GuideStep = { title: "结束后评星", body: "老师根据孩子的表现点“评分”选择星级。需要时可以重新录制。", visual: "stars" };

/** 每个评测项目对应一份说明，按 moduleId 取用。内容为初稿，请按实际流程修改。 */
export const moduleGuides: Record<string, ModuleGuide> = {
  A1: { steps: [
    prepare,
    { title: "请孩子看图", body: "屏幕上会出现一张图片，请孩子看清楚。", visual: "image" },
    { title: "点麦克风开口", body: "老师点麦克风，孩子直接说出图片的名称。", visual: "mic" },
    { ...rate, body: "老师听发音是否清楚，点“评分”选择星级。" },
  ] },
  A2: { steps: [
    prepare,
    { title: "请孩子听任务", body: "告诉孩子：深吸一口气，然后一直发出“呜——”的声音。", visual: "listen", bubble: "呜——" },
    { title: "点麦克风开始", body: "小火车会跟着声音前进。声音越稳，火车跑得越稳。", visual: "mic" },
    { ...rate, body: "老师看持续了多久、有没有中断，再选择星级。" },
  ] },
  A3: { steps: [
    prepare,
    { title: "排好三张图", body: "请孩子拖动图片，或点两侧的箭头，把三张图排成故事的顺序。", visual: "sequence" },
    { title: "用“先、然后、最后”讲", body: "排好后，请孩子用“先、然后、最后”把故事完整地讲出来。", visual: "listen", bubble: "先……然后……最后……" },
    { ...rate, body: "老师看顺序是否正确、表达是否完整，再选择星级。" },
  ] },
  A4: { steps: [
    prepare,
    { title: "请孩子看场景", body: "屏幕上有一位新朋友，请孩子看一看。", visual: "image" },
    { title: "老师读出问题", body: "老师问：今天班里来了一位新朋友，你想认识他，你会怎么说？", visual: "listen", bubble: "你好，我叫……" },
    { ...rate, body: "老师看孩子的回应是否得体、自然，再选择星级。" },
  ] },
  A5: { steps: [
    prepare,
    { title: "认识四种表情", body: "看看开心、难过、害羞和生气时，眉毛、眼睛和嘴巴有什么变化。", visual: "image" },
    { title: "跟着图片做表情", body: "点击“开始跟做”，倒计时 3 秒后会响起快门声，人物定格；跟着图片保持表情 3 秒。完成后继续下一种表情。", visual: "happy" },
    { ...rate, body: "老师依次观察孩子模仿开心、难过、害羞、生气时的表情变化与动作表现，再为四种表情的整体表现选择星级。本项不需要录音。" },
  ] },
};
