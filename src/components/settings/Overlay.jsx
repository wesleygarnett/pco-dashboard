export default function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="glass-card flex max-h-[85vh] w-full max-w-[720px] flex-col gap-5 overflow-y-auto p-8"
        style={{ background: '#141210' }}
      >
        {children}
      </div>
    </div>
  );
}
