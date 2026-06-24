import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0a0a0a',
            color: '#FF4C4C',
            fontFamily: "'Share Tech Mono', monospace",
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', letterSpacing: '4px', fontFamily: "'Bebas Neue', sans-serif" }}>
            SYSTEM ERROR
          </div>
          <div style={{ fontSize: '12px', color: '#888', maxWidth: '480px', lineHeight: 1.6 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid #FF4C4C',
              color: '#FF4C4C',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '14px',
              letterSpacing: '2px',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
