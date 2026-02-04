/**
 * Logger utility for consistent logging across the application
 * Logs only in development mode by default
 */

type LogLevel = 'error' | 'warn' | 'info' | 'log';

interface Logger {
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  log: (...args: any[]) => void;
}

const isDevelopment = import.meta.env.DEV;

const createLogger = (): Logger => {
  const log = (level: LogLevel, ...args: any[]) => {
    if (!isDevelopment) {
      // In production, you might want to send errors to a monitoring service
      // For now, we only log in development
      return;
    }

    // Use console methods based on log level
    switch (level) {
      case 'error':
        console.error(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'info':
        console.info(...args);
        break;
      case 'log':
      default:
        console.log(...args);
        break;
    }
  };

  return {
    error: (...args: any[]) => log('error', ...args),
    warn: (...args: any[]) => log('warn', ...args),
    info: (...args: any[]) => log('info', ...args),
    log: (...args: any[]) => log('log', ...args),
  };
};

const logger = createLogger();

export default logger;




