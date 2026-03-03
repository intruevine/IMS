import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './shared/styles/globals.css';

async function unregisterLegacyServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.error('서비스워커 정리 실패:', error);
  }
}

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
      message: error.message || '알 수 없는 렌더링 오류',
      stack: error.stack,
    };
  }

  componentDidCatch(error: Error) {
    console.error('루트 렌더링 오류:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>UI 렌더링 오류</h2>
        <div style={{ marginBottom: 8 }}>{this.state.message}</div>
        {this.state.stack && <div>{this.state.stack}</div>}
      </div>
    );
  }
}

declare global {
  interface Window {
    __imsGlobalErrorHandlersRegistered__?: boolean;
  }
}

if (!window.__imsGlobalErrorHandlersRegistered__) {
  window.addEventListener('error', (event) => {
    console.error('전역 오류:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('처리되지 않은 Promise 거부:', event.reason);
  });

  window.__imsGlobalErrorHandlersRegistered__ = true;
}

void unregisterLegacyServiceWorkers();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);

