import { logger } from './logger';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      code?: string;
      context?: Record<string, any>;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = options.code;
    this.context = options.context;
    this.timestamp = new Date();
    this.retryable = options.retryable ?? false;
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];
  private maxQueueSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle different types of errors
  handleError(error: Error | AppError, context?: Record<string, any>): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      appError = this.classifyError(error, context);
    }

    // Add to queue
    this.addToQueue(appError);

    // Log error
    this.logError(appError);

    // Report error based on severity
    this.reportError(appError);

    return appError;
  }

  // Classify errors based on their properties
  private classifyError(error: Error, context?: Record<string, any>): AppError {
    const message = error.message;
    const name = error.name;

    // Network errors
    if (name === 'NetworkError' || message.includes('fetch') || message.includes('network')) {
      return new AppError(
        message,
        ErrorType.NETWORK,
        ErrorSeverity.MEDIUM,
        { context, retryable: true }
      );
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('login') || message.includes('token')) {
      return new AppError(
        message,
        ErrorType.AUTHENTICATION,
        ErrorSeverity.HIGH,
        { context, retryable: false }
      );
    }

    // Authorization errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return new AppError(
        message,
        ErrorType.AUTHORIZATION,
        ErrorSeverity.HIGH,
        { context, retryable: false }
      );
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return new AppError(
        message,
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        { context, retryable: false }
      );
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return new AppError(
        message,
        ErrorType.NOT_FOUND,
        ErrorSeverity.MEDIUM,
        { context, retryable: false }
      );
    }

    // Server errors
    if (message.includes('500') || message.includes('server error') || message.includes('internal')) {
      return new AppError(
        message,
        ErrorType.SERVER,
        ErrorSeverity.HIGH,
        { context, retryable: true }
      );
    }

    // Default to client error
    return new AppError(
      message,
      ErrorType.CLIENT,
      ErrorSeverity.MEDIUM,
      { context, retryable: false }
    );
  }

  // Add error to queue
  private addToQueue(error: AppError): void {
    this.errorQueue.push(error);
    
    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  // Log error
  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      code: error.code,
      context: error.context,
      timestamp: error.timestamp,
      retryable: error.retryable,
      stack: error.stack
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical error:', error.message, logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error:', error.message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error:', error.message, logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity error:', error.message, logData);
        break;
    }
  }

  // Report error based on severity
  private reportError(error: AppError): void {
    // Only report high and critical errors
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      this.sendToErrorReportingService(error);
    }
  }

  // Send to error reporting service (Sentry, etc.)
  private sendToErrorReportingService(error: AppError): void {
    // In production, integrate with error reporting service
    // Example: Sentry.captureException(error, { extra: error.context });
    
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Error:', error.message);
      console.log('Type:', error.type);
      console.log('Severity:', error.severity);
      console.log('Context:', error.context);
      console.log('Retryable:', error.retryable);
      console.groupEnd();
    }
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: AppError[];
  } {
    const byType = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = this.errorQueue.filter(e => e.type === type).length;
      return acc;
    }, {} as Record<ErrorType, number>);

    const bySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.errorQueue.filter(e => e.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      total: this.errorQueue.length,
      byType,
      bySeverity,
      recent: this.errorQueue.slice(-10)
    };
  }

  // Clear error queue
  clearQueue(): void {
    this.errorQueue = [];
  }

  // Get errors by type
  getErrorsByType(type: ErrorType): AppError[] {
    return this.errorQueue.filter(e => e.type === type);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorQueue.filter(e => e.severity === severity);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions
export const createError = (
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  options?: {
    code?: string;
    context?: Record<string, any>;
    retryable?: boolean;
  }
): AppError => {
  return new AppError(message, type, severity, options);
};

export const handleError = (error: Error | AppError, context?: Record<string, any>): AppError => {
  return errorHandler.handleError(error, context);
};

// Error boundary helper
export const getErrorDisplayMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Authentication error. Please log in again.';
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorType.VALIDATION:
      return 'Please check your input and try again.';
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorType.SERVER:
      return 'Server error. Please try again later.';
    case ErrorType.CLIENT:
      return 'An error occurred. Please try again.';
    default:
      return 'An unexpected error occurred.';
  }
};

// Retry logic
export const shouldRetry = (error: AppError, attemptCount: number): boolean => {
  if (!error.retryable) return false;
  if (attemptCount >= 3) return false;
  
  // Exponential backoff
  const delay = Math.min(1000 * Math.pow(2, attemptCount), 10000);
  return new Promise(resolve => setTimeout(resolve, delay)).then(() => true);
};
