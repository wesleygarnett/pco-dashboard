## Dark theme only — paint the backdrop yourself

This library ships **no page/body background** — that's owned by the host app, not `src/ui`. Every component (`Button` secondary, `Badge` neutral, `Field`, `StatusLine` default) uses translucent "glass" surfaces (`border-white/10`, `bg-white/[0.05]`, `text-[var(--muted)]`) designed to sit on a dark backdrop. Rendered on a light/white background they are nearly invisible. **Always wrap your layout root in a dark surface using the `--bg` token**, e.g.:

```jsx
<div style={{ background: 'var(--bg)', minHeight: '100vh' }}>{/* your screen */}</div>
```

There is no `ThemeProvider` — theming is CSS custom properties on `:root` (from `theme.css`), always active once `styles.css` is imported. No provider wrapping is needed for context/hooks.

## Styling idiom: Tailwind utilities + CSS variable tokens

Components are styled with Tailwind utility classes, with the night theme's colors/surfaces threaded in via `var(--token)` inside utility brackets (e.g. `bg-[var(--accent)]`, `border-[var(--danger-border)]`) rather than named Tailwind color classes. Real tokens available (see `theme.css`):

- **Surface/text**: `--bg`, `--s1`, `--s2`, `--border`, `--text`, `--muted`, `--dim`
- **Accent** (violet primary — `--cyan`/`--purple`/`--amber` are deprecated aliases of the same violet; prefer `--accent*`): `--accent`, `--accent-bg`, `--accent-border`, `--accent-border-strong`, `--accent-border-soft`
- **Secondary accent (green)**: `--green`, `--green-bg`, `--green-border`, `--live` (live/success); note styling: `--note-text`, `--note-accent`, `--note-bg`
- **Semantic**: `--danger`, `--danger-bright` (small red text), `--danger-bg`, `--danger-border`
- **Avatar gradients**: `--avatar-grad-1` (violet), `--avatar-grad-2` (green), `--avatar-grad-3` (indigo), `--avatar-grad-director`, `--avatar-ring`, `--avatar-ring-director`

Every component accepts `className` for one-off layout tweaks (margins, flex/grid placement) — compose with utility classes, don't fight the component's own visual styling. `Field` exports `controlClass`, a shared string of utility classes for building consistent `<input>`/`<select>` controls to pass as children.

## Where the truth lives

Read `styles.css` (imports `theme.css` for tokens + the compiled Tailwind utilities) before styling anything new. Each component's `.prompt.md` documents its real props; `.d.ts` is the authoritative API contract.

## Example: a labeled settings field on the dark backdrop

```jsx
import { Field, controlClass, Button } from '<pkg>';

<div style={{ background: 'var(--bg)', padding: 24 }}>
  <Field label="Organization Name" hint="Shown in the header.">
    <input className={controlClass} style={{ width: '100%' }} />
  </Field>
  <Button variant="primary">Save Settings</Button>
</div>
```
