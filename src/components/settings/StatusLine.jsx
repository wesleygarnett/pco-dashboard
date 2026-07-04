export default function StatusLine({ status }) {
  if (!status?.message) return null;
  const color = status.type === 'ok' ? 'var(--live)' : status.type === 'error' ? 'var(--danger)' : 'var(--muted)';
  return (
    <div className="text-[13px] font-semibold" style={{ color }}>
      {status.message}
    </div>
  );
}
