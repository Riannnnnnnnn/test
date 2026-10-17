import type { PropsWithChildren, ReactNode } from "react";
import { Card } from "@/components/ui";

interface ModuleShellProps { eyebrow: string; title: string; prompt: string; visual?: ReactNode; hideCopy?: boolean; copyExtra?: ReactNode; className?: string; visualClassName?: string; }

export function ModuleShell({ eyebrow, title, prompt, visual, hideCopy = false, copyExtra, className = "", visualClassName = "", children }: PropsWithChildren<ModuleShellProps>) {
  return (
    <Card className={`module-card ${className}`.trim()}>
      {!hideCopy && <div className="module-card__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{prompt}</p>
        {copyExtra}
      </div>}
      {visual && <div className={`module-card__visual ${visualClassName}`.trim()}>{visual}</div>}
      <div className="module-card__action">{children}</div>
    </Card>
  );
}
