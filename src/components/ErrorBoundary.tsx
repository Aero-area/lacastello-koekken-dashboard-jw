import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
          <div className="text-center max-w-md">
            <div className="text-2xl font-semibold text-red-600 mb-4">
              Noget gik galt
            </div>
            <div className="text-gray-600 mb-6">
              Appen stødte på en uventet fejl. Prøv at genindlæse siden.
            </div>
            <Button 
              onClick={this.handleReload}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Genindlæs
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}