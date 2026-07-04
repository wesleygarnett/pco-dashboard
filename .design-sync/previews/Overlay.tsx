import { Overlay, Button, StatusLine } from 'pco-service-dashboard';

/** The SettingsModal composition: a centered glass panel over a dark backdrop, with a status line and footer actions. */
export function SettingsPanel() {
  return (
    // Overlay renders `position: fixed; inset: 0`. The card harness makes a
    // transformed wrapper the containing block for fixed descendants so the
    // overlay paints inside the card — but that wrapper has no content of its
    // own height (fixed children are out-of-flow), so its auto height is
    // cyclic and resolves to 0, centering the panel on a zero-height line and
    // clipping its top half. Giving Overlay its own sized, transformed
    // ancestor here fixes that: it becomes the real containing block instead.
    <div style={{ position: 'relative', height: 700, transform: 'translateZ(0)' }}>
      <Overlay onClose={() => {}}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Update your Planning Center connection and display preferences.</p>
        </div>
        <StatusLine status={{ message: 'Connected — found 3 service types.', type: 'ok' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="secondary">Close</Button>
          <Button variant="primary">Save Settings</Button>
        </div>
      </Overlay>
    </div>
  );
}
