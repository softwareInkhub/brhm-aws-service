type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  component?: string;
  requestId?: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const component = options?.component ? `[${options.component}]` : '';
    const requestId = options?.requestId ? `[${options.requestId}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${component}${requestId} ${message}`;
  }

  private log(level: LogLevel, message: string, options?: LogOptions) {
    if (!this.isDevelopment) return;

    const formattedMessage = this.formatMessage(level, message, options);
    const data = options?.data ? JSON.stringify(options.data, null, 2) : '';

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data);
        break;
      case 'info':
        console.info(formattedMessage, data);
        break;
      case 'warn':
        console.warn(formattedMessage, data);
        break;
      case 'error':
        console.error(formattedMessage, data);
        if (options?.data?.error instanceof Error) {
          console.error('Stack trace:', options.data.error.stack);
        }
        break;
    }
  }

  debug(message: string, options?: LogOptions) {
    this.log('debug', message, options);
  }

  info(message: string, options?: LogOptions) {
    this.log('info', message, options);
  }

  warn(message: string, options?: LogOptions) {
    this.log('warn', message, options);
  }

  error(message: string, options?: LogOptions) {
    this.log('error', message, options);
  }

  logApiRequest(method: string, url: string, options?: { body?: any } & LogOptions) {
    this.info(`API Request: ${method} ${url}`, {
      ...options,
      data: { method, url, body: options?.body }
    });
  }

  logApiResponse(method: string, url: string, response: any, options?: LogOptions) {
    this.info(`API Response: ${method} ${url}`, {
      ...options,
      data: { method, url, response }
    });
  }

  logApiError(method: string, url: string, error: any, options?: LogOptions) {
    this.error(`API Error: ${method} ${url}`, {
      ...options,
      data: { method, url, error }
    });
  }
}

export const logger = Logger.getInstance(); 