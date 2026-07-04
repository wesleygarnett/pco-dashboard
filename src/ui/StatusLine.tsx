export type StatusType = '' | 'ok' | 'error';

export interface Status {
  message: string;
  type?: StatusType;
}

export interface StatusLineProps {
  /** The status to display. Renders nothing when `message` is empty. */
  status?: Status;
}

/** A one-line status message, colored by `type`: green (`ok`), red (`error`), or muted (default). */
export default function StatusLine({ status }: StatusLineProps) {
  if (!status?.message) return null;
  const color = status.type === 'ok' ? 'var(--live)' : status.type === 'error' ? 'var(--danger)' : 'var(--muted)';
  return (
    <div className="text-[13px] font-semibold" style={{ color }}>
      {status.message}
    </div>
  );
}
