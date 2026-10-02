import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('DecodeWithTech UI recovered from runtime error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-neutral-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-8 rounded-3xl border border-orange-200 bg-orange-50/40 shadow-sm">
            <h1 className="text-2xl font-extrabold text-neutral-950 font-display">
              DecodeWithTech
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Refreshing the view to keep everything running smoothly.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold cursor-pointer"
            >
              Reload Website
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
