// src/components/ErrorBoundary.jsx
// Catches any React render errors and shows a friendly recovery screen.
// Critical for a children's app — blank screens are unacceptable.
//
// Usage: Wrap your entire app AND each major screen section separately.
// <ErrorBoundary screen="Learn"><LearnScreen /></ErrorBoundary>

import { Component } from 'react';

const COSMO_SAD = '🌟'; // Replace with actual Cosmo SVG once mascot is built

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0F0A1E',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: '"Nunito", sans-serif',
    textAlign: 'center',
  },
  cosmo: {
    fontSize: '72px',
    marginBottom: '1rem',
    animation: 'wobble 2s ease-in-out infinite',
  },
  title: {
    fontFamily: '"Fredoka One", cursive',
    fontSize: '2rem',
    color: '#4ECDC4',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '1.1rem',
    marginBottom: '2rem',
    maxWidth: '320px',
    lineHeight: 1.5,
  },
  button: {
    background: '#4ECDC4',
    color: '#0F0A1E',
    border: 'none',
    borderRadius: '50px',
    padding: '0.875rem 2.5rem',
    fontSize: '1.1rem',
    fontFamily: '"Fredoka One", cursive',
    cursor: 'pointer',
    letterSpacing: '0.5px',
  },
  devError: {
    marginTop: '2rem',
    padding: '1rem',
    background: 'rgba(255,107,107,0.15)',
    border: '1px solid rgba(255,107,107,0.3)',
    borderRadius: '8px',
    color: '#FF6B6B',
    fontSize: '12px',
    fontFamily: 'monospace',
    textAlign: 'left',
    maxWidth: '500px',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};

// Messages that rotate so repeated errors feel fresh
const FRIENDLY_MESSAGES = [
  { title: "Oops! Cosmo got confused!", body: "Let's try that again — Cosmo believes in you!" },
  { title: "Something got mixed up!", body: "Even stars have bad days. Let's keep going!" },
  { title: "Cosmo needs a moment!", body: "The galaxy is resetting. Ready to try again?" },
];

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:   false,
      error:      null,
      errorInfo:  null,
      messageIdx: Math.floor(Math.random() * FRIENDLY_MESSAGES.length),
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // TODO: Send to your analytics/error tracking (Sentry, LogRocket, etc.)
    console.error('[ErrorBoundary]', {
      screen:    this.props.screen ?? 'unknown',
      error:     error.message,
      stack:     errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError:  false,
      error:     null,
      errorInfo: null,
    });
    // If a reset callback was provided (e.g. navigate home), call it
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = FRIENDLY_MESSAGES[this.state.messageIdx];
    const isDev = import.meta.env.DEV;

    return (
      <div style={styles.container}>
        <style>{`
          @keyframes wobble {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
          }
        `}</style>

        <div style={styles.cosmo}>{COSMO_SAD}</div>
        <h2 style={styles.title}>{msg.title}</h2>
        <p style={styles.subtitle}>{msg.body}</p>

        <button
          style={styles.button}
          onClick={this.handleReset}
          onMouseEnter={e => e.target.style.background = '#3DBDB5'}
          onMouseLeave={e => e.target.style.background = '#4ECDC4'}
        >
          Try Again ✨
        </button>

        {/* Dev-only: show the actual error */}
        {isDev && this.state.error && (
          <div style={styles.devError}>
            <strong>{this.state.error.toString()}</strong>
            {this.state.errorInfo?.componentStack}
          </div>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
