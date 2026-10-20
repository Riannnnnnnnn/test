import type { XfyunIseResult } from "./xfyunIse";

export interface SpeechReviewFeedback {
  kind: "reading" | "pronunciation" | "uncertain";
  title: string;
  message: string;
}

export function getSpeechReviewFeedback(result: XfyunIseResult, referenceText: string): SpeechReviewFeedback | undefined {
  if (result.contentStatus === "mismatch") return {
    kind: "reading",
    title: "读的词可能不对",
    message: `请看看图片，再说一次“${referenceText}”。如果孩子已经读对，请老师听录音确认。`,
  };
  if (result.contentStatus === "uncertain") return {
    kind: "uncertain",
    title: "这次没听清",
    message: "系统不能确认孩子读错了。请靠近麦克风再读一次，或请老师确认。",
  };
  if (result.contentStatus === "matched" && result.issues?.some((issue) => issue.kind.includes("声韵") || issue.kind.includes("声调"))) return {
    kind: "pronunciation",
    title: "有个别字音可以再练习",
    message: "已保留本次的部分星级；请听一听，再练习标出的字音。",
  };
  if (result.contentStatus === "matched") return undefined;
  if (!result.reviewReasons?.length) return undefined;
  const readingIssue = result.issues?.some((issue) => ["漏读", "增读", "回读", "替换"].includes(issue.kind))
    || result.reviewReasons.some((reason) => reason.includes("引擎检测到内容不匹配"));
  if (readingIssue) return {
    kind: "reading",
    title: "读音可能不对",
    message: `好像不是“${referenceText}”，请看题目再清楚地说一次。如果已经读对，请老师复核。`,
  };
  if (result.reviewReasons.some((reason) => reason.includes("与题目不同") || reason.includes("听写没有识别到"))) return {
    kind: "uncertain",
    title: "识别结果待核对",
    message: "听写结果与题目不一致，也可能是系统识别有误。请再读一次，或请老师听一听。",
  };
  if (result.issues?.some((issue) => issue.kind.includes("错误"))) return {
    kind: "pronunciation",
    title: "发音有提升空间",
    message: "有个别字音可以再练习。星级供参考，请老师结合实际发音评价。",
  };
  return {
    kind: "uncertain",
    title: "暂时无法确认",
    message: "这次没有获得可靠的评测结果，请再试一次，或请老师评价。",
  };
}
