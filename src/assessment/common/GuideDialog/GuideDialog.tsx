import { useEffect, useRef, useState } from "react";
import { moduleGuides, type GuideStep } from "@/config/guides";
import { useSiteContent } from "@/content/useSiteContent";
import "@/styles/guide.css";

interface GuideDialogProps { moduleId: string; moduleLabel: string; onClose: () => void; steps?: GuideStep[]; }

function GuideVisualPane({ step, moduleId }: { step: GuideStep; moduleId: string }) {
  const { content } = useSiteContent();
  const module = moduleId in content.modules ? content.modules[moduleId as keyof typeof content.modules] : undefined;
  switch (step.visual) {
    case "listen":
      return <div className={`guide-visual guide-visual--listen ${moduleId === "A2" ? "guide-visual--blowing" : ""}`}>
        <img className="guide-float" src={moduleId === "A2" ? "/assets/v2/star-mascot-guide-blowing-mic-natural.webp" : "/assets/v2/star-mascot-hero-assessment.webp"} alt="" />
        {step.bubble && <div className="guide-bubble">{step.bubble}</div>}
      </div>;
    case "tiger":
      return <div className="guide-visual guide-visual--tiger">
        <img className="guide-float" src="/assets/v2/star-mascot-guide-tiger.webp" alt="" />
      </div>;
    case "mic":
      return <div className="guide-visual guide-visual--mic">
        <span className="guide-mic"><i /><i /><i />
          <svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
        </span>
      </div>;
    case "stars":
      return <div className="guide-visual guide-visual--stars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => <svg key={i} viewBox="0 0 60 52" width="64" height="56" style={{ animationDelay: `${i * 0.25}s` }}><path d="M30 3l7.3 15.3 16.7 2.1-12.3 11.5 3.2 16.6L30 40.1 15.1 48.5l3.2-16.6L6 20.4l16.7-2.1z" fill={i < 4 ? "#ffd44c" : "rgba(255,255,255,.35)"} stroke={i < 4 ? "#ffd44c" : "rgba(255,255,255,.35)"} strokeWidth="5" strokeLinejoin="round" /></svg>)}
      </div>;
    case "image":
      return <div className="guide-visual">{module?.imageUrl ? <img className="guide-float guide-visual__picture" src={module.imageUrl} alt="" /> : <img className="guide-float" src="/assets/v2/star-mascot-hero-board.webp" alt="" />}</div>;
    case "sequence":
      return <div className="guide-visual guide-visual--sequence">{(module?.sequenceItems ?? []).map((item, i) => <span key={item.key} style={{ animationDelay: `${i * 0.18}s` }}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.symbol}</span>)}</div>;
    default:
      return <div className="guide-visual"><img className="guide-float" src="/assets/v2/star-mascot-hero-board.webp" alt="" /></div>;
  }
}

export function GuideDialog({ moduleId, moduleLabel, onClose, steps: suppliedSteps }: GuideDialogProps) {
  const steps = suppliedSteps ?? moduleGuides[moduleId]?.steps ?? [];
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  const [index, setIndex] = useState(0);
  const last = index === steps.length - 1;
  const step = steps[index];
  const next = () => (last ? onClose() : setIndex((value) => value + 1));
  const prev = () => setIndex((value) => Math.max(0, value - 1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((value) => (value >= steps.length - 1 ? value : value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, steps.length]);

  if (!step) return null;
  return (
    <dialog ref={dialogRef} className="guide-backdrop" aria-label={`${moduleLabel}评测说明`} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <section className="guide" role="dialog" aria-modal="true" aria-label={`${moduleLabel}评测说明`}>
        <div className="guide__art"><div key={index} className="guide__art-inner"><GuideVisualPane step={step} moduleId={moduleId} /></div></div>
        <div className="guide__body">
          <button type="button" className="guide__skip" onClick={onClose}>跳过说明 »</button>
          <p className="guide__eyebrow">{moduleLabel} · 第 {index + 1} 步 / {steps.length}</p>
          <div key={index} className="guide__text" aria-live="polite">
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </div>
          <div className="guide__foot">
            <div className="guide__dots" aria-hidden="true">{steps.map((_, i) => <span key={i} className={i === index ? "is-current" : ""} />)}</div>
            <div className="guide__actions">
              {index > 0 && <button type="button" className="guide__btn guide__btn--ghost" onClick={prev}>上一步</button>}
              <button type="button" className="guide__btn guide__btn--primary" onClick={next} autoFocus>{last ? "开始评测" : "下一步 →"}</button>
            </div>
          </div>
        </div>
      </section>
    </dialog>
  );
}
