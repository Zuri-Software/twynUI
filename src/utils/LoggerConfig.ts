/**
 * Logger Configuration for EAS Preview Builds
 * Update this file with your computer's local IP address when using EAS builds
 */

import { Logger } from './Logger';

// Configuration for different environments
const LOG_CONFIG = {
  // For EAS preview builds, update this with your computer's IP address
  // You can find it by running: ifconfig (macOS/Linux) or ipconfig (Windows)
  // Example: '192.168.1.100'
  LOCAL_IP: '172.16.141.191', // 👈 UPDATE THIS FOR EAS BUILDS
  
  // Log server port (should match log-server.js)
  PORT: 3001,
};

// Auto-configure logger based on environment
export function initializeLogger() {
  // In development, use localhost
  if (__DEV__) {
    Logger.setLogServerUrl(`http://localhost:${LOG_CONFIG.PORT}/logs`);
    Logger.info('🔧 Logger configured for development (localhost)', 'LoggerConfig');
  } else {
    // For EAS builds, use the local IP if configured
    if (LOG_CONFIG.LOCAL_IP && LOG_CONFIG.LOCAL_IP !== '192.168.1.xxx') {
      Logger.setLogServerUrl(`http://${LOG_CONFIG.LOCAL_IP}:${LOG_CONFIG.PORT}/logs`);
      Logger.info('🔧 Logger configured for EAS build', 'LoggerConfig', {
        serverUrl: `http://${LOG_CONFIG.LOCAL_IP}:${LOG_CONFIG.PORT}/logs`
      });
    } else {
      Logger.warn('⚠️ Logger not configured for EAS build', 'LoggerConfig', {
        message: 'Update LOCAL_IP in LoggerConfig.ts with your computer\'s IP address'
      });
    }
  }
}

export default LOG_CONFIG;