import type { CourseTask } from "@/config/courseTasks";
import type { AssessmentResult } from "@/types";

export function TaskPicker({ tasks, selectedId, items, onSelect, initials = false }: {
  tasks: CourseTask[]; selectedId: string; items?: Record<string, AssessmentResult>;
  onSelect?: (id: string) => void; initials?: boolean;
}) {
  const completed = (id: string) => Object.keys(items?.[id]?.autoScores ?? {}).length > 0 || Object.keys(items?.[id]?.teacherScores ?? {}).length > 0;
  const done = tasks.filter((task) => completed(task.id)).length;
  return <div className={`course-task-picker ${initials ? "course-task-picker--initials" : ""}`}>
    <p><span className="course-task-picker__title">{initials ? "声母" : "题目"}</span>
      <span className="course-task-picker__meter" aria-hidden="true"><i style={{ width: `${tasks.length ? done / tasks.length * 100 : 0}%` }} /></span>
      <small>已评测 <b>{done}</b> / {tasks.length}</small></p>
    <div className="course-task-picker__buttons">{tasks.map((task) => <button type="button" key={task.id}
      aria-pressed={selectedId === task.id} aria-label={initials ? `${task.title}：${task.text}` : task.title}
      className={`${selectedId === task.id ? "is-selected" : ""} ${completed(task.id) ? "is-complete" : ""}`}
      onClick={() => onSelect?.(task.id)}>{initials ? task.title.replace("声母 ", "") : task.title}{completed(task.id) && <i aria-label="已评测" />}</button>)}</div>
  </div>;
}
