import { useState, type DragEvent } from "react";
import { ModuleShell } from "@/assessment/common/ModuleShell/ModuleShell";
import type { AssessmentModuleProps } from "@/assessment/types";
import { useSiteContent } from "@/content/useSiteContent";
import type { SequenceItemContent } from "@/content/types";

type SequenceKey = "seed" | "water" | "flower";
const sequenceConnectors = ["先", "然后", "最后"] as const;

export function PictureSequence({ result, onResultChange }: AssessmentModuleProps) {
  const { content } = useSiteContent();
  const module = content.modules.A3;
  const sequenceItems = Object.fromEntries((module.sequenceItems ?? []).map((item) => [item.key, item])) as Record<SequenceKey, SequenceItemContent>;
  const saved = result.rawResult?.sequence;
  const [order, setOrder] = useState<SequenceKey[]>(Array.isArray(saved) ? saved as SequenceKey[] : ["flower", "seed", "water"]);
  const [dragged, setDragged] = useState<number | null>(null);

  function commit(next: SequenceKey[]) { setOrder(next); void onResultChange({ rawResult: { ...result.rawResult, sequence: next, sequenceCorrect: next.join(",") === "seed,water,flower" } }); }
  function dropAt(event: DragEvent, target: number) { event.preventDefault(); if (dragged === null || dragged === target) return; const next = [...order]; const [item] = next.splice(dragged, 1); next.splice(target, 0, item); commit(next); setDragged(null); }
  function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= order.length) return; const next = [...order]; [next[index], next[target]] = [next[target], next[index]]; commit(next); }

  return <ModuleShell eyebrow={module.eyebrow} title={module.title} prompt={module.prompt} visual={<div className="sequence-board">{order.map((key, index) => { const item = sequenceItems[key]; return <article key={key} className="sequence-card" draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropAt(event, index)}><span className={`sequence-art sequence-art--${key}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : item.symbol}</span><strong>{item.title}</strong><div className="sequence-card__controls"><button type="button" aria-label={`${item.title}向前移动`} disabled={index === 0} onClick={() => move(index, -1)}>←</button><em>{index + 1}</em><button type="button" aria-label={`${item.title}向后移动`} disabled={index === order.length - 1} onClick={() => move(index, 1)}>→</button></div></article>; })}</div>}><div className="module-action-stack"><div className="sequence-language">{order.map((key, index) => <span key={sequenceConnectors[index]}><b>{sequenceConnectors[index]}</b>{sequenceItems[key].title}</span>)}</div>{module.teacherNote && <p className="task-note">{module.teacherNote}</p>}</div></ModuleShell>;
}
