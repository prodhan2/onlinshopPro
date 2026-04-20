import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: '#f5f7fb',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '1.5rem',
              padding: '2rem',
              boxShadow: '0 18px 44px rgba(15, 23, 42, 0.08)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={{ color: '#162033', marginBottom: '0.5rem' }}>
              Oops! Something went wrong
            </h2>
            <p style={{ color: '#667085', marginBottom: '1.5rem' }}>
              The app encountered an error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#1565c0',
                color: '#fff',
                border: 'none',
                borderRadius: '0.9rem',
                padding: '0.75rem 1.5rem',
                fontWeight: '700',
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
            >
              Refresh Page
            </button>
            <br />
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: 'transparent',
                color: '#667085',
                border: '1px solid #dbe3ee',
                borderRadius: '0.9rem',
                padding: '0.75rem 1.5rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Go to Homepage
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginTop: '1.5rem',
                  textAlign: 'left',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  overflow: 'auto',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: '700', marginBottom: '0.5rem' }}>
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: '0.85rem',
                    color: '#ef4444',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo &&
                    `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
