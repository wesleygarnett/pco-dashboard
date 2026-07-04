## Dark theme only — paint the backdrop yourself

This library ships **no page/body background** — that's owned by the host app, not `src/ui`. Every component (`Button` secondary, `Badge` neutral, `Field`, `StatusLine` default) uses translucent "glass" surfaces (`border-white/10`, `bg-white/[0.05]`, `text-[var(--muted)]`) designed to sit on a dark backdrop. Rendered on a light/white background they are nearly invisible. **Always wrap your layout root in a dark surface using the `--bg` token**, e.g.:

```jsx
<div style={{ background: 'var(--bg)', minHeight: '100vh' }}>{/* your screen */}</div>
```

There is no `ThemeProvider` — theming is CSS custom properties on `:root` (from `theme.css`), always active once `styles.css` is imported. No provider wrapping is needed for context/hooks.

## Styling idiom: Tailwind utilities + CSS variable tokens

Components are styled with Tailwind utility classes, with the terracotta theme's colors/surfaces threaded in via `var(--token)` inside utility brackets (e.g. `bg-[var(--purple)]`, `border-[var(--danger-border)]`) rather than named Tailwind color classes. Real tokens available (see `theme.css`):

- **Surface/text**: `--bg`, `--s1`, `--s2`, `--border`, `--text`, `--muted`, `--dim`
- **Accent** (single warm terracotta family — `--cyan`/`--purple`/`--amber` are historical aliases, all the same hue): `--purple`, `--purple-bg`, `--purple-border`, `--purple-border-strong`
- **Semantic**: `--danger`, `--danger-bg`, `--danger-border`, `--live` (success green)
- **Avatar gradients**: `--avatar-grad-1`, `--avatar-grad-2`, `--avatar-grad-3`, `--avatar-grad-director`, `--avatar-ring`

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
