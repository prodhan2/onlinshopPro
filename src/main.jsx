import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './tailwind.css';
import App from './App';
import './styles.css';
import { setupAnalytics } from './firebase';
import { BrowserRouter } from 'react-router-dom';

// Initialize analytics safely to prevent white screen
try {
  setupAnalytics().catch(() => {
    console.log('Analytics not available, skipping');
  });
} catch (error) {
  console.log('Analytics setup failed:', error);
}

// Global ripple wave effect on all buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const rect = btn.getBoundingClientRect();

  circle.classList.add('ripple');
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - diameter / 2}px`;
  circle.style.top  = `${e.clientY - rect.top  - diameter / 2}px`;

  btn.querySelector('.ripple')?.remove();
  btn.appendChild(circle);

  circle.addEventListener('animationend', () => circle.remove());
});

// Error Boundary to catch and display errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '600px',
          margin: '2rem auto',
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #ddd'
        }}>
          <h2 style={{ color: '#d32f2f', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#666' }}>The app encountered an error:</p>
          <pre style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '0.85rem',
            color: '#333'
          }}>
            {this.state.error?.toString()}
          </pre>
          <p style={{ color: '#666', marginTop: '1rem' }}>
            Check the browser console (F12) for more details.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
