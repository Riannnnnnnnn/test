import { useSiteContent } from "@/content/useSiteContent";
import type { StageId } from "@/types";

export function StageBadge({ stage }: { stage: StageId }) {
  const { content } = useSiteContent();
  return <span className="stage-badge"><span className="stage-badge__dot" />{stage}段｜{content.stages[stage].name}</span>;
}
