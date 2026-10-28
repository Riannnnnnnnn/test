import { useEffect, useRef, useState } from "react";

type WebkitDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void | Promise<void> };
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };

export function useFullscreen() {
  const doc = document as WebkitDocument;
  const active = () => Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
  const [native, setNative] = useState(active);
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const sync = () => setNative(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFocusMode(false); };
    doc.addEventListener("fullscreenchange", sync);
    doc.addEventListener("webkitfullscreenchange", sync);
    doc.addEventListener("keydown", escape);
    return () => {
      mounted.current = false;
      doc.removeEventListener("fullscreenchange", sync);
      doc.removeEventListener("webkitfullscreenchange", sync);
      doc.removeEventListener("keydown", escape);
    };
  }, [doc]);

  async function toggleFullscreen() {
    if (pending.current) return;
    setError("");
    if (focusMode) { setFocusMode(false); return; }
    pending.current = true;
    const exiting = active();
    try {
      if (exiting) {
        if (doc.fullscreenElement) await doc.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } else {
        const root = doc.documentElement as WebkitElement;
        if (root.requestFullscreen) await root.requestFullscreen();
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
        else if (mounted.current) setFocusMode(true);
      }
      if (mounted.current) setNative(active());
    } catch {
      if (mounted.current) {
        if (exiting) setError("请使用浏览器的退出全屏按钮，或按 Esc 退出。");
        else setFocusMode(true);
      }
    } finally { pending.current = false; }
  }
  return {
    toggleFullscreen, focusMode,
    fullscreenLabel: native ? "退出全屏" : focusMode ? "退出专注" : "全屏",
    fullscreenMessage: error || (focusMode ? "已进入专注模式；当前浏览器不支持网页全屏，地址栏仍会保留。" : ""),
  };
}
