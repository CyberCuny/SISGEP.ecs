import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          <h2>Algo sali&oacute; mal</h2>
          <p>{this.state.error?.message || 'Error inesperado'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Recargar p&aacute;gina</button>
        </div>
      );
    }
    return this.props.children;
  }
}