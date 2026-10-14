import { useEffect } from "react";
import { playUiClick } from "@/services/audio/uiSound";

const interactiveSelector = "button:not(:disabled), a[href], [role='button']:not([aria-disabled='true'])";

export function InteractionEffects() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(interactiveSelector);
      if (!target) return;
      playUiClick(target.classList.contains("button--primary") || target.classList.contains("teacher-action--score"));
      target.querySelectorAll(":scope > .interaction-ripple").forEach((staleRipple) => staleRipple.remove());
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 1.8;
      ripple.className = "interaction-ripple";
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      ripple.setAttribute("aria-hidden", "true");
      target.classList.add("has-interaction-ripple");
      target.append(ripple);
      const cleanupRipple = () => {
        ripple.remove();
        if (!target.querySelector(".interaction-ripple")) target.classList.remove("has-interaction-ripple");
      };
      ripple.addEventListener("animationend", cleanupRipple, { once: true });
      window.setTimeout(cleanupRipple, 700);
      target.classList.remove("is-pressed");
      requestAnimationFrame(() => target.classList.add("is-pressed"));
      window.setTimeout(() => target.classList.remove("is-pressed"), 220);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);
  return null;
}
