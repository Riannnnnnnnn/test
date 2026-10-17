import { GuideDialog } from "@/assessment/common/GuideDialog/GuideDialog";
import type { GuideStep } from "@/config/guides";

function stepsFor(moduleId: string, large: boolean) {
  if (moduleId === "A1") return [
    { title: large ? "选择一句话" : "选择要评测的声母", body: large ? "两句话分别练习平翘舌和 d、t、n、l。点击题目按钮切换，已完成的题目会显示勾号。" : "点击声母按钮选择词语，共有 23 个声母。带黄色边框和勾号的声母已经评测，可以再次选择重测。" },
    { title: large ? "按下麦克风，完整朗读" : "看图读词", body: large ? "按下黄色麦克风，按自然语速完整读出屏幕上的句子。尽量保持周围安静。" : "图片在左边，词语在右边。按下黄色麦克风，让孩子清楚地读出整个词语。" },
    { title: "说完后自动出成绩", body: "读完稍停，系统会自动结束收音并显示三个维度的智能评星。读错词语或识别失败时，点击重测再试一次。" },
    { title: "教师评价与下一项", body: "老师可点击底部“教师星级评价”记录现场表现。右侧星星只显示智能成绩，最终报告再与教师评分取平均。完成所需题目后，点击“下一项”进入气息评测。智能服务未就绪时可使用教师评价。" },
  ];
  if (moduleId === "A2") return [
    { title: "准备出发", body: "让孩子自然吸气，按下黄色麦克风，然后持续发出“呜——”。声音保持舒适即可，不要勉强憋气。" },
    { title: "让小火车平稳前进", body: "发声时小火车向终点前进，观察声音是否持续、连贯、稳定。请保持周围安静，避免其他人的声音干扰。" },
    { title: "自动结束并总结", body: "停止发声约 2 秒，或火车到达终点，都会自动出成绩。没有收到声音时会提示重试，不需要手动点完成。" },
    { title: "评价并继续", body: "老师可补充星级评价；点击“重测”可重新开始。完成后点击“下一项”进入表现力评测。" },
  ];
  if (moduleId === "A5") return large ? [
    { title: "先理解表演情境", body: "本题是“森林广播员”。让孩子先看清屏幕上的情境，再思考角色会用什么语气说话。" },
    { title: "表现不同的情绪", body: "先用着急的语气提醒动物躲雨，再用开心的语气宣布雨停。鼓励孩子配合表情和动作，完整演出来。" },
    { title: "老师观察并评星", body: "本项由老师观察语言、声音、表情和动作后评分，不需要录音。点击“教师星级评价”，保存后点击“完成评测”查看报告。" },
  ] : [
    { title: "选择动物朋友", body: "依次选择小老虎、小狗和小鸭。三种动物的声音和动作不同，鼓励孩子大胆模仿。" },
    { title: "声音、动作、表情一起表现", body: "让孩子看着动物图片模仿叫声，并配合身体动作和表情。需要提醒时，可以参考图片旁的叫声。" },
    { title: "每只动物单独评价", body: "点击“教师星级评价”，记录当前动物的表现。切换动物后会显示它自己的评价，完成的动物带勾号。本项不需要录音，完成后点击“完成评测”查看报告。" },
  ];
  return [{ title: "完成当前任务", body: "观察题目内容，让孩子完成任务后，使用底部教师星级评价记录表现，再点击下一项。" }];
}

export function AssessmentGuide({ moduleId, large, onDismiss }: { moduleId: string; large: boolean; onDismiss: () => void }) {
  const steps: GuideStep[] = stepsFor(moduleId, large).map((step, index, all) => ({ ...step, visual: index === all.length - 1 ? "stars" : index === 0 ? "mascot" : moduleId === "A5" ? !large && index === 1 ? "tiger" : "listen" : "mic", ...(moduleId === "A2" && index === 1 ? { visual: "listen", bubble: "呜——" } : {}) }));
  const title = moduleId === "A1" ? "正音评测" : moduleId === "A2" ? "气息评测" : "表现力评测";
  return <GuideDialog moduleId={moduleId} moduleLabel={`${large ? "大阶段" : "小阶段"} · ${title}`} steps={steps} onClose={onDismiss} />;
}
