import type { CSSProperties, ReactNode } from 'react';
import { Button } from 'pco-service-dashboard';

// Dark-theme-only DS — see Avatar.tsx for why previews supply their own backdrop.
const backdrop: CSSProperties = { background: 'var(--bg)', padding: 24, borderRadius: 12 };
const Backdrop = ({ children }: { children: ReactNode }) => <div style={backdrop}>{children}</div>;

/** The three variants, side by side — filled violet, subtle glass, and destructive. */
export function Variants() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="primary">Save Settings</Button>
        <Button variant="secondary">Test Connection</Button>
        <Button variant="danger">Reset All Settings</Button>
      </div>
    </Backdrop>
  );
}

/** A wizard footer pairing a secondary "Back" with a primary forward action — the SetupWizard composition. */
export function WizardFooter() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 320 }}>
        <Button variant="secondary">Back</Button>
        <Button variant="primary">Continue</Button>
      </div>
    </Backdrop>
  );
}
