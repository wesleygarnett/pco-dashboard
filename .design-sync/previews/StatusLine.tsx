import type { CSSProperties, ReactNode } from 'react';
import { StatusLine } from 'pco-service-dashboard';

// Dark-theme-only DS — see Avatar.tsx for why previews supply their own backdrop.
const backdrop: CSSProperties = { background: 'var(--bg)', padding: 24, borderRadius: 12 };
const Backdrop = ({ children }: { children: ReactNode }) => <div style={backdrop}>{children}</div>;

/** The three message types stacked — success (green), error (red), and the default muted tone. */
export function Types() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <StatusLine status={{ message: 'Connected — found 3 service types.', type: 'ok' }} />
        <StatusLine status={{ message: 'Could not reach Planning Center. Check your credentials.', type: 'error' }} />
        <StatusLine status={{ message: 'Testing connection…' }} />
      </div>
    </Backdrop>
  );
}

/** Below a "Test Connection" button — the SetupWizard/SettingsModal composition. Renders nothing until `status.message` is set. */
export function BelowAction() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 280 }}>
        <button
          className="rounded-lg px-5 py-2.5 text-[14px] font-semibold"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
        >
          Test Connection
        </button>
        <StatusLine status={{ message: 'Connected — found 3 service types.', type: 'ok' }} />
      </div>
    </Backdrop>
  );
}
