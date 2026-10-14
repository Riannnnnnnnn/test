import { ModuleShell } from "@/assessment/common/ModuleShell/ModuleShell";
import { useSiteContent } from "@/content/useSiteContent";

export function ScenarioResponse() {
  const { content } = useSiteContent();
  const module = content.modules.A4;
  return <ModuleShell className="module-card--character module-card--scenario" visualClassName="module-card__visual--character" eyebrow={module.eyebrow} title={module.title} prompt={module.prompt} visual={<div className="scenario-scene">{module.imageUrl ? <div className="scenario-uploaded-image"><img src={module.imageUrl} alt={module.imageAlt} /></div> : <div className="child-avatar">{module.visualText}</div>}<div className="scenario-bubble">{module.secondaryText}</div></div>}>{module.teacherNote && <p className="task-note">{module.teacherNote}</p>}</ModuleShell>;
}
