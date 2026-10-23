import { GuideDialog } from "@/assessment/common/GuideDialog/GuideDialog";
import type { GuideStep } from "@/config/guides";

function stepsFor(moduleId: string, large: boolean) {
  if (moduleId === "A1") return [
    { title: large ? "选择一句话" : "选择要评测的声母", body: large ? "两句话分别练习平翘舌和 d、t、n、l。点击题目按钮切换，已完成的题目会显示勾号。" : "点击声母按钮选择词语，共有 23 个声母。带黄色边框和勾号的声母已经评测，可以再次选择重测。" },
    { title: large ? "按下麦克风，完整朗读" : "看图读词", body: large ? "按下黄色麦克风，按自然语速完整读出屏幕上的句子。尽量保持周围安静。" : "图片在左边，词语在右边。按下黄色麦克风，让孩子清楚地读出整个词语。" },
    { title: "说完后自动评星", body: large ? "读完稍停，或再点一次麦克风，系统会自动评星。没听清或读错显示 0 颗星；拿到 5 颗星会稍等片刻，自动跳到下一句。" : "读完稍停，系统会自动评星。没听清或读错显示 0 颗星；拿到 5 颗星会稍等片刻，自动跳到下一个字。" },
    { title: "没有满星怎么办", body: `获得 0–4 颗星时，会出现两个选项：“再试一次”让孩子重新读，或“评语”。点击“评语”后，老师从 4 个选项里勾选观察到的表现（可多选），点“确认”进入下一${large ? "句" : "个字"}。` },
    { title: "教师评价与下一项", body: "老师完成本项所有词语后，只需点击一次“教师星级评价”，评价正音的整体表现，不必逐词评分。右侧星星只显示当前词语的智能成绩；报告将本项智能结果与整体教师评价结合。智能服务未就绪时也可使用教师评价。" },
  ];
  if (moduleId === "A2") return [
    { title: "准备出发", body: "让孩子自然吸气，按下黄色麦克风，然后持续发出“呜——”。声音保持舒适即可，不要勉强憋气。" },
    { title: "让小火车平稳前进", body: "发声时小火车向终点前进，观察声音是否持续、连贯、稳定。请保持周围安静，避免其他人的声音干扰。" },
    { title: "自动结束并总结", body: "停止发声约 2 秒，或火车到达终点，都会自动出成绩。没有收到声音时会提示重试，不需要手动点完成。" },
    { title: "评价并继续", body: "老师可补充星级评价；点击“重测”可重新开始。完成后点击“下一项”进入表现力评测。" },
  ];
  if (moduleId === "A5") return large ? [
    { title: "先理解表演情境", body: "本题是“森林广播员”。让孩子先看清屏幕上的情境，再思考角色会用什么语气说话。" },
    { title: "读四句森林广播", body: "按照屏幕上的四句例句，前两句着急地提醒小动物躲雨，后两句开心地告诉大家雨停了。每读完一句，请老师从四个观察项中选择孩子的表现并保存，然后才能进入下一句。" },
    { title: "逐句评价后完成", body: "本项不录音，也不自动判断朗读质量。四句都由老师评价后，点击“完成评测”查看报告；报告会分别列出四句的教师评价。" },
  ] : [
    { title: "认识四种表情", body: "依次选择开心、难过、害羞和生气。让孩子看看人物的眉毛、眼睛和嘴巴有什么变化。" },
    { title: "跟着图片做表情", body: "点击“开始跟做”，倒计时 3 秒后会响起快门声，人物定格；跟着图片保持表情 3 秒。完成提示音响完后，点击“完成”请老师评价。" },
    { title: "逐个表情，请老师评价", body: "每个表情都有四个观察选项，可多选。老师至少勾选一项并保存后，才能进入下一个表情；四种表情都评价完成后，再完成评测。观察记录会保存在报告中，本项不录音，也不自动判断表情好坏。" },
  ];
  return [{ title: "完成当前任务", body: "观察题目内容，让孩子完成任务后，使用底部教师星级评价记录表现，再点击下一项。" }];
}

export function AssessmentGuide({ moduleId, large, onDismiss }: { moduleId: string; large: boolean; onDismiss: () => void }) {
  const steps: GuideStep[] = stepsFor(moduleId, large).map((step, index, all) => ({ ...step, visual: index === all.length - 1 ? "stars" : index === 0 ? "mascot" : moduleId === "A5" ? large ? "listen" : "happy" : "mic", ...(moduleId === "A2" && index === 1 ? { visual: "listen", bubble: "呜——" } : {}) }));
  const title = moduleId === "A1" ? "正音评测" : moduleId === "A2" ? "气息评测" : "表现力评测";
  return <GuideDialog moduleId={moduleId} moduleLabel={`${large ? "大阶段" : "小阶段"} · ${title}`} steps={steps} onClose={onDismiss} />;
}
