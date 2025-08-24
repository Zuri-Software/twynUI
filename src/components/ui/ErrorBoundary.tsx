import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COMPONENT_RADIUS } from '../../styles/borderRadius';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
}

/**
 * ErrorBoundary - Comprehensive error handling for React components
 * 
 * Features:
 * - Catches JavaScript errors in component tree
 * - Displays user-friendly error messages
 * - Provides retry functionality
 * - Optional error reporting
 * - Development mode error details
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[🔥 ErrorBoundary] Caught an error:', error);
    console.error('[🔥 ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Report error to crash analytics service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: any) => {
    // In production, you would report to a service like Sentry, Bugsnag, etc.
    console.log('[🔥 ErrorBoundary] Reporting error:', {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  private handleRetry = () => {
    console.log('[🔥 ErrorBoundary] User requested retry');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    console.log('[🔥 ErrorBoundary] User requested app reload');
    // In React Native, you might restart the app or navigate to root
    // For now, we'll just reset the error boundary
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Error Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.errorIcon}>💥</Text>
            </View>

            {/* Error Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>
                We're sorry for the inconvenience. The app encountered an unexpected error.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleRetry}>
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={this.handleReload}>
                <Text style={styles.secondaryButtonText}>Reload App</Text>
              </TouchableOpacity>
            </View>

            {/* Error Details (Development Mode) */}
            {(__DEV__ || this.props.showDetails) && this.state.error && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Error Details (Dev Mode)</Text>
                
                <View style={styles.errorDetails}>
                  <Text style={styles.errorText}>
                    <Text style={styles.errorLabel}>Error ID: </Text>
                    {this.state.errorId}
                  </Text>
                  
                  <Text style={styles.errorText}>
                    <Text style={styles.errorLabel}>Message: </Text>
                    {this.state.error.message}
                  </Text>
                  
                  {this.state.error.stack && (
                    <View style={styles.stackContainer}>
                      <Text style={styles.errorLabel}>Stack Trace:</Text>
                      <Text style={styles.stackText}>{this.state.error.stack}</Text>
                    </View>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <View style={styles.stackContainer}>
                      <Text style={styles.errorLabel}>Component Stack:</Text>
                      <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 64,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: COMPONENT_RADIUS.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: COMPONENT_RADIUS.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: COMPONENT_RADIUS.card,
    padding: 16,
    marginTop: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  errorDetails: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.small,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  errorLabel: {
    fontWeight: '600',
    color: '#666666',
  },
  stackContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  stackText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#555555',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: BORDER_RADIUS.small / 2,
    marginTop: 4,
  },
});