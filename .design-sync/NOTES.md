# design-sync notes for pco-service-dashboard

## Repo-specific gotchas

- `package.json` had `types` only under `exports["."].types`, not the top-level `types`/`typings` field the converter reads. Added a top-level `"types": "./dist-ui/lib.d.ts"` field (mirrors the `exports` entry) — without it, component discovery finds `0` PascalCase exports (`[ZERO_MATCH]`).
- `cfg.cssEntry` must point at `./dist-ui/ui.css` (the library build's compiled stylesheet, tokens + Tailwind utilities). Without it, the converter can't find a static stylesheet and ships a self-styling placeholder (`[CSS_RUNTIME]`), and every component renders unstyled.
- This design system is **dark-theme-only** — it ships no page/body background (the app paints `--bg` via `src/index.css`, which isn't part of `src/ui`). Every authored preview wraps its composition in a `{ background: 'var(--bg)' }` container; skipping this makes translucent "glass" surfaces (Button secondary, Badge neutral, Field, StatusLine default) render nearly invisible against the previews' default white page. Any future authored preview needs the same wrapper.
- `Overlay` renders `position: fixed; inset: 0`. The card harness's single-mode wrapper (`.ds-single{transform:translateZ(0)}`) becomes the containing block for that fixed element, but the wrapper itself has no in-flow content (fixed children don't establish parent height), so its auto-height is cyclic and collapses to `0` — `items-center` then centers the panel on that zero line, clipping the top half regardless of the capture viewport size (confirmed identical crop at 520px and 700px viewport heights — not a viewport-size problem). Fix applied in `Overlay.tsx`'s own preview composition: wrap `<Overlay>` in a sized `div` with `transform: translateZ(0)` (matching the configured viewport height, currently 700px) so *that* div — not the harness wrapper — becomes the real containing block. Any other component that itself renders `position: fixed` will need the same wrapper trick in its preview.
- `cfg.overrides`: `Button` and `Field` use `cardMode: "column"` (their preview stories render wider than a grid cell); `Overlay` uses `cardMode: "single"` + `viewport: "800x700"` (see above).

## Known render warns

None outstanding — render check is clean (0 bad, 0 thin, 0 variantsIdentical) as of this sync.

- 2026-07-11 re-sync: theme pivoted from terracotta to night-mode violet/green. Canonical tokens are now `--accent*`; `--purple*`/`--cyan*`/`--amber*` remain as deprecated aliases in `theme.css` for compat — if the alias block is ever removed, update `conventions.md`'s token list in the same change.

## Re-sync risks — what to watch next time

- If `src/ui` grows past this initial 6 components, re-check whether any new component itself uses `position: fixed`/`position: sticky` internally (like `Overlay`) — it will need the same sized-transform-wrapper trick in its preview, not just a `cardMode` override.
- The top-level `package.json` `"types"` field is now a duplicate of `exports["."].types` — if the library build entry point (`vite.lib.config.js` → `dist-ui/lib.d.ts`) ever moves, update both.
- All 6 components were authored solo (no subagent fan-out) since the library is small — no wave-learnings files to fold.
- Playwright + chromium were freshly installed into `.ds-sync/` this run (not previously cached on this machine) — a fresh clone/CI box will need the same install before re-running validate's render check.
