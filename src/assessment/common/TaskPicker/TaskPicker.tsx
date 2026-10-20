import type { CourseTask } from "@/config/courseTasks";
import type { AssessmentResult } from "@/types";
import type { XfyunIseResult } from "@/services/speech/xfyunIse";
import { strictPronunciationStars } from "@/services/scoring/pronunciation";

export function TaskPicker({ tasks, selectedId, items, onSelect, initials = false }: {
  tasks: CourseTask[]; selectedId: string; items?: Record<string, AssessmentResult>;
  onSelect?: (id: string) => void | Promise<void>; initials?: boolean;
}) {
  // 只有 0 颗星（没听清或读错）算错误；1–5 颗星都显示 ✓。
  const status = (id: string): "done" | "wrong" | "pending" => {
    const item = items?.[id];
    const evidence = item?.rawResult?.evidence as XfyunIseResult | undefined;
    if (!evidence && !Object.keys(item?.autoScores ?? {}).length) return Object.keys(item?.teacherScores ?? {}).length ? "done" : "pending";
    return strictPronunciationStars(item?.autoScores?.pronunciationClarity) > 0 ? "done" : "wrong";
  };
  const counts = tasks.reduce((current, task) => {
    current[status(task.id)] += 1;
    return current;
  }, { done: 0, wrong: 0, pending: 0 });
  const done = tasks.length - counts.pending;
  return <div className={`course-task-picker ${initials ? "course-task-picker--initials" : ""}`}>
    <p><span className="course-task-picker__title">{initials ? "声母" : "题目"}</span>
      <span className="course-task-picker__meter" aria-hidden="true"><i style={{ width: `${tasks.length ? done / tasks.length * 100 : 0}%` }} /></span>
      <small>已评测 <b>{done}</b> / {tasks.length}</small></p>
    <div className="course-task-picker__buttons">{tasks.map((task) => {
      const itemStatus = status(task.id);
      return <button type="button" key={task.id}
        aria-pressed={selectedId === task.id} aria-label={initials ? `${task.title}：${task.text}，${itemStatus === "wrong" ? "0 颗星，点击查看" : itemStatus === "done" ? "已评测" : "未评测"}` : task.title}
        className={`${selectedId === task.id ? "is-selected" : ""} ${itemStatus !== "pending" ? "is-complete" : ""} is-${itemStatus}`}
        onClick={() => onSelect?.(task.id)}>{initials ? task.title.replace("声母 ", "") : task.title}{itemStatus !== "pending" && <i aria-hidden="true">{itemStatus === "wrong" ? "×" : "✓"}</i>}</button>;
    })}</div>
    {initials && <div className="course-task-picker__summary" aria-label="声母评测统计">
      <span className="is-done" aria-label={`通过 ${counts.done} 个`}>通过 <b>{counts.done}</b></span>
      <span className="is-wrong" aria-label={`错误 ${counts.wrong} 个`}>错误 <b>{counts.wrong}</b></span>
    </div>}
  </div>;
}
