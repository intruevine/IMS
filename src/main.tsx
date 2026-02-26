import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './shared/styles/globals.css';

type BoundaryState = {
  hasError: boolean;
  message: string;
  stack?: string;
};

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unknown render error',
      stack: error.stack,
    };
  }

  componentDidCatch(error: Error) {
    console.error('Root render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>UI Render Error</h2>
        <div style={{ marginBottom: 8 }}>{this.state.message}</div>
        {this.state.stack && <div>{this.state.stack}</div>}
      </div>
    );
  }
}

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Force an update check so long-lived clients pick up the latest build faster.
    setTimeout(async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      } catch (error) {
        console.error('Service worker update check failed:', error);
      }
    }, 1000);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
