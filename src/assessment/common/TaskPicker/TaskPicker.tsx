import type { CourseTask } from "@/config/courseTasks";
import type { AssessmentResult } from "@/types";

export function TaskPicker({ tasks, selectedId, items, onSelect, initials = false }: {
  tasks: CourseTask[]; selectedId: string; items?: Record<string, AssessmentResult>;
  onSelect?: (id: string) => void; initials?: boolean;
}) {
  const completed = (id: string) => Object.keys(items?.[id]?.autoScores ?? {}).length > 0 || Object.keys(items?.[id]?.teacherScores ?? {}).length > 0;
  return <div className={`course-task-picker ${initials ? "course-task-picker--initials" : ""}`}>
    <p>{initials ? "声母" : "题目"}<small>已评测 {tasks.filter((task) => completed(task.id)).length} / {tasks.length}</small></p>
    <div className="course-task-picker__buttons">{tasks.map((task) => <button type="button" key={task.id}
      aria-pressed={selectedId === task.id} aria-label={initials ? `${task.title}：${task.text}` : task.title}
      className={`${selectedId === task.id ? "is-selected" : ""} ${completed(task.id) ? "is-complete" : ""}`}
      onClick={() => onSelect?.(task.id)}>{initials ? task.title.replace("声母 ", "") : task.title}{completed(task.id) && <i aria-label="已评测">✓</i>}</button>)}</div>
  </div>;
}
