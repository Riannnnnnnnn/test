import type { PropsWithChildren, ReactNode } from "react";

interface DialogProps { open: boolean; title: string; onClose: () => void; footer?: ReactNode; }

export function Dialog({ open, title, onClose, footer, children }: PropsWithChildren<DialogProps>) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog__head">
          <h2 id="dialog-title">{title}</h2>
          <button className="dialog__close" type="button" aria-label="关闭" onClick={onClose}>×</button>
        </div>
        {children}
        {footer}
      </section>
    </div>
  );
}
