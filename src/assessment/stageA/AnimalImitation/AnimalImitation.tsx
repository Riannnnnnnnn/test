import { ModuleShell } from "@/assessment/common/ModuleShell/ModuleShell";
import { useSiteContent } from "@/content/useSiteContent";

export function AnimalImitation() {
  const { content } = useSiteContent();
  const module = content.modules.A5;
  const visual = module.imageUrl ? <div className="module-uploaded-image"><img src={module.imageUrl} alt={module.imageAlt} /></div> : <div className="picture-placeholder picture-placeholder--tiger"><span className="tiger-ear tiger-ear--left" /><span className="tiger-ear tiger-ear--right" />{module.visualText}</div>;
  return <ModuleShell className="module-card--character module-card--animal" visualClassName="module-card__visual--character" eyebrow={module.eyebrow} title={module.title} prompt={module.prompt} visual={visual}>{module.teacherNote && <p className="task-note">{module.teacherNote}</p>}</ModuleShell>;
}
