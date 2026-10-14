import { useEffect, useState } from "react";
import { Button, Dialog, StarIcon, StarRating } from "@/components/ui";
import { abilityDimensions } from "@/config/scoring";

interface TeacherScoringDialogProps {
  open: boolean;
  moduleTitle: string;
  dimensions: string[];
  initialScores?: Record<string, number>;
  onClose: () => void;
  onSave: (scores: Record<string, number>) => void | Promise<void>;
}

export function TeacherScoringDialog({ open, moduleTitle, dimensions, initialScores, onClose, onSave }: TeacherScoringDialogProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => { if (open) setScores(Object.fromEntries(dimensions.map((dimension) => [dimension, Math.max(1, Math.round((initialScores?.[dimension] ?? 60) / 20))]))); }, [dimensions, initialScores, open]);

  async function save() {
    await onSave(Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, value * 20])));
    onClose();
  }

  return <Dialog open={open} title={`老师星级评价 · ${moduleTitle}`} onClose={onClose} footer={<div className="dialog-actions"><Button variant="secondary" onClick={onClose}>稍后填写</Button><Button onClick={save}>保存评价</Button></div>}><p className="score-help">请根据孩子本次现场表现点亮星星，满星表示这一能力表现突出。</p><div className="score-list">{dimensions.map((dimension) => { const rating = scores[dimension] ?? 3; return <div className="score-row" key={dimension}><div><strong>{abilityDimensions[dimension as keyof typeof abilityDimensions] ?? dimension}</strong><span className="score-stars" aria-label={`已点亮${rating}颗星`}><StarRating value={rating} /></span></div><div className="score-scale" role="radiogroup" aria-label={abilityDimensions[dimension as keyof typeof abilityDimensions] ?? dimension}>{[1,2,3,4,5].map((star) => <button type="button" role="radio" aria-checked={rating === star} key={star} className={star <= rating ? "is-selected" : ""} aria-label={`第${star}颗星`} onClick={() => setScores((current) => ({ ...current, [dimension]: star }))}><StarIcon filled={star <= rating} /></button>)}</div></div>; })}</div></Dialog>;
}
