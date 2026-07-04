import type { CSSProperties, ReactNode } from 'react';
import { Field, controlClass } from 'pco-service-dashboard';

// Dark-theme-only DS — see Avatar.tsx for why previews supply their own backdrop.
const backdrop: CSSProperties = { background: 'var(--bg)', padding: 24, borderRadius: 12 };
const Backdrop = ({ children }: { children: ReactNode }) => <div style={backdrop}>{children}</div>;

/** A labeled text input — the standard control composition, styled with the exported `controlClass`. */
export function TextInput() {
  return (
    <Backdrop>
      <div style={{ width: 260 }}>
        <Field label="PCO App ID">
          <input className={controlClass} defaultValue="a1b2c3d4e5f6" style={{ width: '100%' }} />
        </Field>
      </div>
    </Backdrop>
  );
}

/** With hint text below the control — used for fields that need a short explanation. */
export function WithHint() {
  return (
    <Backdrop>
      <div style={{ width: 320 }}>
        <Field label="Poll Interval" hint="How often the dashboard checks Planning Center for updates.">
          <select className={controlClass} style={{ width: '100%' }} defaultValue="60000">
            <option value="0">Off</option>
            <option value="60000">Every minute</option>
          </select>
        </Field>
      </div>
    </Backdrop>
  );
}

/** A two-column settings grid: regular fields share a row, a `fullSpan` field takes the whole row — the SettingsFields composition. */
export function TwoColumnGrid() {
  return (
    <Backdrop>
      <div className="grid grid-cols-2 gap-4" style={{ width: 480 }}>
        <Field label="Organization Name">
          <input className={controlClass} defaultValue="Grace Fellowship" style={{ width: '100%' }} />
        </Field>
        <Field label="Timezone">
          <input className={controlClass} defaultValue="America/Chicago" style={{ width: '100%' }} />
        </Field>
        <Field label="Service Type" fullSpan hint="This becomes the default service the dashboard loads when the app opens.">
          <select className={controlClass} style={{ width: '100%' }} defaultValue="1">
            <option value="1">Sunday Service</option>
          </select>
        </Field>
      </div>
    </Backdrop>
  );
}
