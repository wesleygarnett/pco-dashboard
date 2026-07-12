import type { ReactNode } from 'react';

export interface OverlayProps {
  children?: ReactNode;
  /** Called when the backdrop (outside the panel) is clicked. */
  onClose?: () => void;
}

/** A modal backdrop with a centered, scrollable glass panel. Clicking the backdrop calls `onClose`. */
export default function Overlay({ children, onClose }: OverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="glass-card flex max-h-[85vh] w-full max-w-[720px] flex-col gap-5 overflow-y-auto p-8"
        style={{ background: 'var(--overlay-bg, #14121d)' }}
      >
        {children}
      </div>
    </div>
  );
}
