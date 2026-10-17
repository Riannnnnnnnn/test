import { ModuleShell } from "@/assessment/common/ModuleShell/ModuleShell";
import { useSiteContent } from "@/content/useSiteContent";
import { Card } from "@/components/ui";
import type { AssessmentModuleProps } from "@/assessment/types";
import { getCourseTasks } from "@/config/courseTasks";
import { TaskPicker } from "@/assessment/common/TaskPicker/TaskPicker";

export function AnimalImitation({ stage, result, items, onSelectItem }: AssessmentModuleProps) {
  const { content } = useSiteContent();
  const module = content.modules.A5;
  const tasks = stage ? getCourseTasks(stage, "A5") : [];
  const task = tasks.find((item) => item.id === result.questionId);
  if (task) {
    const selected = { ...task, ...content.taskOverrides?.[task.id] };
    return <Card className="module-card course-expression">
      {tasks.length > 1 && <TaskPicker tasks={tasks} selectedId={selected.id} items={items} onSelect={onSelectItem} />}
      <div className={`course-expression__stimulus ${stage === "B" ? "course-expression__stimulus--scenario" : ""}`}>
        {selected.image && <img src={selected.image} alt={selected.title} />}
        <div><h2>{selected.title}</h2><p>{selected.text}</p></div>
      </div>
    </Card>;
  }
  const visual = module.imageUrl ? <div className="module-uploaded-image"><img src={module.imageUrl} alt={module.imageAlt} /></div> : <div className="picture-placeholder picture-placeholder--tiger"><span className="tiger-ear tiger-ear--left" /><span className="tiger-ear tiger-ear--right" />{module.visualText}</div>;
  return <ModuleShell className="module-card--character module-card--animal" visualClassName="module-card__visual--character" eyebrow={module.eyebrow} title={module.title} prompt={module.prompt} visual={visual}>{module.teacherNote && <p className="task-note">{module.teacherNote}</p>}</ModuleShell>;
}
