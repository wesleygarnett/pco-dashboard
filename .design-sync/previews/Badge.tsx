import type { CSSProperties, ReactNode } from 'react';
import { Badge } from 'pco-service-dashboard';

// Dark-theme-only DS — see Avatar.tsx for why previews supply their own backdrop.
const backdrop: CSSProperties = { background: 'var(--bg)', padding: 24, borderRadius: 12 };
const Backdrop = ({ children }: { children: ReactNode }) => <div style={backdrop}>{children}</div>;

/** Both variants — `accent` for a primary tag (e.g. a song's lead vocalist), `neutral` for secondary info. */
export function Variants() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', gap: 8 }}>
        <Badge variant="accent">Jamie Silva</Badge>
        <Badge variant="neutral">Key of G</Badge>
      </div>
    </Backdrop>
  );
}

/** The SongCard composition: one accent badge for the lead, several neutral badges for chart/key info. */
export function SongTags() {
  return (
    <Backdrop>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge variant="accent">Jamie Silva</Badge>
        <Badge variant="neutral">Key of G</Badge>
        <Badge variant="neutral">CCLI #7027887</Badge>
        <Badge variant="neutral">4/4 · 72 BPM</Badge>
      </div>
    </Backdrop>
  );
}
