// Library build entry: same public API as ./index, plus the stylesheet so the
// library build emits dist/ui.css. Consumers import the CSS once:
//   import '@pco-dashboard/ui/styles.css';
import './ui.css';

export * from './index';
