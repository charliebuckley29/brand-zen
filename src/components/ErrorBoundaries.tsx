import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, Database } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'page' | 'component' | 'data';
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

// Base error boundary class
class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`ErrorBoundary (${this.props.level || 'component'}):`, error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
    
    // In production, you'd send this to an error logging service
    // this.logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        retryCount: retryCount + 1
      });
      this.props.onReset?.();
    } else {
      // Max retries reached, reload the page
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI() {
    const { level = 'component', showDetails = false } = this.props;
    const { error, errorInfo, retryCount } = this.state;
    const canRetry = retryCount < this.maxRetries;

    return (
      <div className="flex items-center justify-center min-h-[200px] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            {this.getErrorIcon(level)}
            <CardTitle className="text-xl text-destructive">
              {this.getErrorTitle(level)}
            </CardTitle>
            <CardDescription>
              {this.getErrorDescription(level)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 justify-center">
              {canRetry && (
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again ({this.maxRetries - retryCount} left)
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>

            {showDetails && error && (
              <details className="text-sm text-muted-foreground text-left p-2 bg-muted rounded-md">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>Error:</strong>
                    <pre className="mt-1 whitespace-pre-wrap break-all text-xs">
                      {error?.toString() || 'Unknown error'}
                    </pre>
                  </div>
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap break-all text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  private getErrorIcon(level: string) {
    const iconClass = "h-12 w-12 text-destructive mx-auto mb-4";
    
    switch (level) {
      case 'app':
        return <AlertTriangle className={iconClass} />;
      case 'page':
        return <Bug className={iconClass} />;
      case 'data':
        return <Database className={iconClass} />;
      default:
        return <AlertTriangle className={iconClass} />;
    }
  }

  private getErrorTitle(level: string) {
    switch (level) {
      case 'app':
        return 'Application Error';
      case 'page':
        return 'Page Error';
      case 'data':
        return 'Data Loading Error';
      default:
        return 'Something went wrong!';
    }
  }

  private getErrorDescription(level: string) {
    switch (level) {
      case 'app':
        return 'A critical error occurred. Please refresh the page or contact support if the problem persists.';
      case 'page':
        return 'This page encountered an error. You can try refreshing or navigating to a different page.';
      case 'data':
        return 'Failed to load data. Check your connection and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Specialized error boundaries
export const AppErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <BaseErrorBoundary {...props} level="app" showDetails={true} />
);

export const PageErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <BaseErrorBoundary {...props} level="page" showDetails={false} />
);

export const DataErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <BaseErrorBoundary {...props} level="data" showDetails={false} />
);

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <BaseErrorBoundary {...props} level="component" showDetails={false} />
);

// Error boundary for async operations
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({ 
  children, 
  fallback,
  onError 
}) => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = new Error(event.message);
      setError(error);
      onError?.(error);
      logger.error('Async error caught:', error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new Error(event.reason?.message || 'Unhandled promise rejection');
      setError(error);
      onError?.(error);
      logger.error('Unhandled promise rejection:', error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[100px] p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="p-4">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              An error occurred while loading data.
            </p>
            <Button 
              size="sm" 
              onClick={() => setError(null)}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

// Error boundary for network issues
export const NetworkErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[100px] p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="p-4">
            <Wifi className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              You're offline. Please check your connection and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

// Error reporting utility
export const reportError = (error: Error, context?: Record<string, any>) => {
  logger.error('Error reported:', error, context);
  
  // In production, send to error reporting service
  // Example: Sentry.captureException(error, { extra: context });
  
  // For now, just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Report');
    console.error('Error:', error);
    console.log('Context:', context);
    console.groupEnd();
  }
};

// Error recovery hook
export const useErrorRecovery = () => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const recover = React.useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const retry = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
  }, []);

  const report = React.useCallback((error: Error, context?: Record<string, any>) => {
    setError(error);
    reportError(error, { ...context, retryCount });
  }, [retryCount]);

  return {
    error,
    retryCount,
    recover,
    retry,
    report,
    hasError: !!error,
  };
};
