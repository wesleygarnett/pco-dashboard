import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from 'pco-service-dashboard';

// This design system is dark-theme-only — its "glass" surfaces are transparent
// overlays meant for the app's dark backdrop (normally painted by the app's own
// CSS, not shipped with the component library). Previews render on a plain page,
// so each story supplies that backdrop itself to match real usage.
const backdrop: CSSProperties = { background: 'var(--bg)', padding: 24, borderRadius: 12 };
const Backdrop = ({ children }: { children: ReactNode }) => <div style={backdrop}>{children}</div>;

const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#6d28d9"/><circle cx="40" cy="30" r="16" fill="#f4f2fa"/><rect x="14" y="52" width="52" height="28" rx="14" fill="#f4f2fa"/></svg>',
  );

/** Team row: a stack of teammates, initials by default — the CameraSlot composition. */
export function TeamRow() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', marginLeft: 12 }}>
        <div style={{ marginLeft: -12 }}>
          <Avatar name="Jamie Silva" gradient="var(--avatar-grad-1)" size={52} />
        </div>
        <div style={{ marginLeft: -12 }}>
          <Avatar name="Alex Moon" gradient="var(--avatar-grad-2)" size={52} />
        </div>
        <div style={{ marginLeft: -12 }}>
          <Avatar name="Rae Kim" gradient="var(--avatar-grad-3)" size={52} ringColor="var(--avatar-ring-director)" />
        </div>
      </div>
    </Backdrop>
  );
}

/** With a real photo — falls back to initials automatically if the image fails to load. */
export function WithPhoto() {
  return (
    <Backdrop>
      <Avatar name="Dana Lee" src={PHOTO} gradient="var(--avatar-grad-2)" size={64} />
    </Backdrop>
  );
}

/** Size range, from the compact camera dock (46px) up to a profile-sized avatar. */
export function Sizes() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar name="Sam Ortiz" gradient="var(--avatar-grad-1)" size={32} />
        <Avatar name="Sam Ortiz" gradient="var(--avatar-grad-1)" size={46} />
        <Avatar name="Sam Ortiz" gradient="var(--avatar-grad-1)" size={64} />
        <Avatar name="Sam Ortiz" gradient="var(--avatar-grad-1)" size={88} />
      </div>
    </Backdrop>
  );
}
