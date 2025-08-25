/**
 * Enhanced Logger for EAS Preview Builds
 * Sends logs to local development server for terminal viewing
 */

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class EnhancedLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private logServerUrl: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    
    // For EAS preview builds, you'll need to set your computer's IP manually
    // Example: Logger.setLogServerUrl('http://192.168.1.100:3001/logs');
    // For now, we'll try localhost for development
    if (__DEV__) {
      this.logServerUrl = 'http://localhost:3001/logs';
    }
  }

  // Method to set the log server URL (useful for EAS builds)
  public setLogServerUrl(url: string) {
    this.logServerUrl = url;
    this.info('Log server URL updated', 'Logger', { url });
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: string,
    data?: any
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    };
  }

  private addLog(entry: LogEntry) {
    // Add to local storage
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console for development
    const logMessage = `[${entry.level.toUpperCase()}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}`;
    
    switch (entry.level) {
      case 'debug':
        console.log(logMessage, entry.data || '');
        break;
      case 'info':
        console.info(logMessage, entry.data || '');
        break;
      case 'warn':
        console.warn(logMessage, entry.data || '');
        break;
      case 'error':
        console.error(logMessage, entry.data || '');
        break;
    }

    // Send to local log server
    this.sendToLogServer(entry);
  }

  private async sendToLogServer(entry: LogEntry) {
    try {
      await fetch(this.logServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          ...entry,
        }),
        // Short timeout to avoid blocking the app
      }).catch(() => {
        // Silently fail if log server isn't running
      });
    } catch (error) {
      // Silently fail - don't want logging to break the app
    }
  }

  // Public logging methods
  public debug(message: string, context?: string, data?: any) {
    this.addLog(this.createLogEntry('debug', message, context, data));
  }

  public info(message: string, context?: string, data?: any) {
    this.addLog(this.createLogEntry('info', message, context, data));
  }

  public warn(message: string, context?: string, data?: any) {
    this.addLog(this.createLogEntry('warn', message, context, data));
  }

  public error(message: string, context?: string, data?: any) {
    this.addLog(this.createLogEntry('error', message, context, data));
  }

  // Notification-specific logging helpers
  public notificationLog = {
    debug: (message: string, data?: any) => this.debug(message, 'NotificationService', data),
    info: (message: string, data?: any) => this.info(message, 'NotificationService', data),
    warn: (message: string, data?: any) => this.warn(message, 'NotificationService', data),
    error: (message: string, data?: any) => this.error(message, 'NotificationService', data),
  };

  // API-specific logging helpers
  public apiLog = {
    debug: (message: string, data?: any) => this.debug(message, 'APIService', data),
    info: (message: string, data?: any) => this.info(message, 'APIService', data),
    warn: (message: string, data?: any) => this.warn(message, 'APIService', data),
    error: (message: string, data?: any) => this.error(message, 'APIService', data),
  };
}

// Export singleton instance
export const Logger = new EnhancedLogger();
export default Logger;