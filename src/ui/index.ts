// Public API of the pco-dashboard UI library — the presentational, prop-driven
// components shared by the app and synced to Claude Design. No CSS side effects
// here so the app can import these without pulling Tailwind twice (the app owns
// its own Tailwind entry). The library build uses ./lib.ts, which adds the CSS.

export { default as Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { default as Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';

export { default as Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

export { default as Field, controlClass } from './Field';
export type { FieldProps } from './Field';

export { default as StatusLine } from './StatusLine';
export type { StatusLineProps, Status, StatusType } from './StatusLine';

export { default as Overlay } from './Overlay';
export type { OverlayProps } from './Overlay';
