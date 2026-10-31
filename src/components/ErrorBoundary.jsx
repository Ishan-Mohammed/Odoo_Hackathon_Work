import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an uncaught render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 select-none">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 max-w-md w-full shadow-soft-lg text-center animate-fade-in">
            {/* Warning Icon Badge */}
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Error Message */}
            <h1 className="font-display font-bold text-xl text-slate-900 mb-2 tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              An unexpected error occurred while rendering the page.
            </p>

            {/* Reload Action Button */}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.99] shadow-soft-sm hover:shadow-soft-md transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/25 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Reload page</span>
            </button>

            {/* Collapsed Technical Error Details */}
            {this.state.error && (
              <details className="mt-4 text-left border border-slate-200 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 group">
                <summary className="font-medium text-slate-700 cursor-pointer select-none focus:outline-none flex items-center justify-between">
                  <span>Error details</span>
                  <span className="text-[11px] text-slate-400 group-open:hidden">Show</span>
                </summary>
                <pre className="mt-2.5 whitespace-pre-wrap font-mono text-[11px] text-rose-600 overflow-x-auto max-h-44 p-2 bg-white rounded-lg border border-slate-200/80">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && `\n${this.state.errorInfo.componentStack}`}
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
