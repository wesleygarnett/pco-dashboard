import { Component } from 'react';
import { Button } from '../ui';

/**
 * Catches render-time errors so a bad plan payload or a component bug shows a
 * readable message instead of a white screen on a wall-mounted display.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[render]', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <div className="text-[40px]" aria-hidden="true">
          ⚠️
        </div>
        <div className="text-[18px] font-bold text-[var(--text)]">Something went wrong</div>
        <div className="max-w-[560px] text-[14px] text-[var(--muted)]">{this.state.error.message}</div>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
}
