// Allow side-effect CSS imports (e.g. lib.ts's `import './ui.css'`) under the
// library's declaration build, which only scans src/ui.
declare module '*.css';
